
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, ChatRoom } from './types';
import { CURRENT_USER, MOCK_BOARD_MEMBERS } from './constants';
import { getGeminiResponse } from './geminiService';
import { 
  Plus, 
  Send, 
  MessageSquare, 
  Users, 
  X, 
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';

export default function App() {
  const [rooms, setRooms] = useState<ChatRoom[]>(() => {
    const saved = localStorage.getItem('trello_chat_rooms_v2');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Synchronisation de la hauteur avec l'iframe Trello
  useEffect(() => {
    const t = (window as any).TrelloPowerUp ? (window as any).TrelloPowerUp.iframe() : null;
    
    const resize = () => {
      if (t && t.sizeTo) {
        t.sizeTo('#root').catch(() => {});
      }
    };

    const observer = new ResizeObserver(resize);
    const rootEl = document.getElementById('root');
    if (rootEl) observer.observe(rootEl);

    resize();
    return () => observer.disconnect();
  }, [rooms, activeRoomId, isCreatingChat, isTyping]);

  useEffect(() => {
    localStorage.setItem('trello_chat_rooms_v2', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeRoomId, rooms, isTyping]);

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  const createRoom = () => {
    if (selectedMembers.length === 0) return;
    
    // Check for existing 1-on-1 chat
    if (selectedMembers.length === 1) {
      const existing = rooms.find(r => !r.isGroup && r.memberIds.includes(selectedMembers[0]));
      if (existing) {
        setActiveRoomId(existing.id);
        setIsCreatingChat(false);
        setSelectedMembers([]);
        return;
      }
    }

    const newRoom: ChatRoom = {
      id: `room_${Date.now()}`,
      name: selectedMembers.length > 1 
        ? `Groupe (${selectedMembers.length + 1} pers.)`
        : MOCK_BOARD_MEMBERS.find(m => m.id === selectedMembers[0])?.fullName || 'Chat',
      memberIds: [...selectedMembers, CURRENT_USER.id],
      messages: [],
      isGroup: selectedMembers.length > 1,
      lastActivity: Date.now()
    };

    setRooms(prev => [newRoom, ...prev]);
    setActiveRoomId(newRoom.id);
    setIsCreatingChat(false);
    setSelectedMembers([]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeRoomId) return;

    const userText = inputText.trim();
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: CURRENT_USER.id,
      text: userText,
      timestamp: Date.now()
    };

    setInputText('');
    
    setRooms(prev => prev.map(r => r.id === activeRoomId ? {
      ...r,
      messages: [...r.messages, newMessage],
      lastActivity: Date.now()
    } : r));

    // AI Logic if AI Assistant is in the room
    if (activeRoom?.memberIds.includes('user_4')) {
      setIsTyping(true);
      try {
        const history = activeRoom.messages.slice(-10).map(m => ({
          role: m.senderId === 'user_4' ? 'model' as const : 'user' as const,
          text: m.text
        }));
        
        const response = await getGeminiResponse(userText, history);
        
        const aiMessage: Message = {
          id: `msg_ai_${Date.now()}`,
          senderId: 'user_4',
          text: response,
          timestamp: Date.now()
        };
        
        setRooms(prev => prev.map(r => r.id === activeRoomId ? {
          ...r,
          messages: [...r.messages, aiMessage],
          lastActivity: Date.now()
        } : r));
      } catch (err) {
        console.error("Erreur AI:", err);
      } finally {
        setIsTyping(false);
      }
    }
  };

  return (
    <div id="root" className="flex h-[600px] w-full bg-[#f4f5f7] text-slate-900 overflow-hidden border-t border-slate-200">
      {/* Sidebar - Liste des discussions */}
      <div className={`w-72 flex flex-col border-r border-[#dfe1e6] bg-white shrink-0 transition-all ${activeRoomId ? 'hidden md:flex' : 'flex w-full'}`}>
        <div className="p-4 bg-[#0079bf] text-white flex justify-between items-center shrink-0">
          <h1 className="flex items-center gap-2 font-bold text-lg">
            <MessageSquare size={20} />
            <span>Discussions</span>
          </h1>
          <button 
            onClick={() => setIsCreatingChat(true)} 
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Nouveau message"
          >
            <Plus size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">Aucune discussion en cours</p>
              <button 
                onClick={() => setIsCreatingChat(true)}
                className="mt-4 text-xs font-bold text-[#0079bf] hover:underline"
              >
                Démarrer un chat
              </button>
            </div>
          ) : (
            rooms.sort((a,b) => b.lastActivity - a.lastActivity).map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`w-full p-4 flex items-center gap-3 border-b border-[#f4f5f7] hover:bg-slate-50 transition-all text-left group ${activeRoomId === room.id ? 'bg-[#e4f0f6] border-l-4 border-l-[#0079bf]' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0 ${room.isGroup ? 'bg-indigo-500' : 'bg-[#0079bf]'}`}>
                  {room.isGroup ? <Users size={16}/> : (MOCK_BOARD_MEMBERS.find(m => room.memberIds.includes(m.id))?.initials || 'C')}
                </div>
                <div className="flex-1 truncate">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-sm truncate text-slate-800">{room.name}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {room.messages.length > 0 ? room.messages[room.messages.length - 1].text : 'Commencer à discuter...'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-white overflow-hidden relative ${!activeRoomId ? 'hidden md:flex' : 'flex'}`}>
        {activeRoom ? (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveRoomId(null)} className="md:hidden p-1 hover:bg-slate-100 rounded-full">
                  <ChevronLeft />
                </button>
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  {activeRoom.name}
                  {activeRoom.isGroup && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wider">Groupe</span>}
                </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setActiveRoomId(null)} className="hidden md:block text-slate-400 hover:text-slate-600">
                  <X size={20}/>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa]">
              {activeRoom.messages.length === 0 && (
                <div className="text-center py-10 text-slate-400 italic text-sm">
                  C'est le début d'une nouvelle conversation...
                </div>
              )}
              {activeRoom.messages.map((msg) => {
                const isMe = msg.senderId === CURRENT_USER.id;
                const sender = MOCK_BOARD_MEMBERS.find(m => m.id === msg.senderId) || CURRENT_USER;
                
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {isMe ? 'Moi' : sender.fullName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`p-3 rounded-2xl text-sm shadow-sm max-w-[85%] leading-relaxed ${isMe ? 'bg-[#0079bf] text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex gap-2 items-center text-slate-400 italic text-xs ml-2 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-400">AI</div>
                  Assistant écrit...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-2 shrink-0 items-center">
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Votre message..."
                className="flex-1 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-[#0079bf] outline-none transition-all bg-slate-50 text-black font-medium"
              />
              <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="bg-[#0079bf] text-white p-3 rounded-xl hover:bg-[#026aa7] disabled:bg-slate-200 disabled:text-slate-400 transition-all active:scale-95 shadow-md"
              >
                <Send size={20} fill="currentColor" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#f4f5f7]">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white">
              <MessageSquare size={40} className="text-[#0079bf]" />
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Power-Up Chat pour Trello</h3>
            <p className="text-slate-500 text-sm max-w-xs mb-8">Sélectionnez une discussion ou commencez-en une nouvelle avec les membres du tableau.</p>
            <button 
              onClick={() => setIsCreatingChat(true)} 
              className="px-8 py-3 bg-[#0079bf] text-white font-bold rounded-xl shadow-lg hover:bg-[#026aa7] transition-all active:scale-95"
            >
              Nouveau chat
            </button>
          </div>
        )}

        {/* Modal de sélection des membres */}
        {isCreatingChat && (
          <div className="absolute inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b flex justify-between items-center bg-white shrink-0">
              <h2 className="font-bold text-lg">Démarrer un chat</h2>
              <button onClick={() => {setIsCreatingChat(false); setSelectedMembers([]);}} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <div className="p-4 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Membres disponibles ({MOCK_BOARD_MEMBERS.length})
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {MOCK_BOARD_MEMBERS.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]);
                  }}
                  className={`w-full p-3 rounded-xl flex items-center gap-4 transition-all ${selectedMembers.includes(m.id) ? 'bg-blue-50 border border-[#0079bf]/30' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${m.color}`}>
                    {m.initials}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm text-slate-800">{m.fullName}</p>
                    <p className="text-xs text-slate-400">@{m.username}</p>
                  </div>
                  {selectedMembers.includes(m.id) && <CheckCircle2 size={20} className="text-[#0079bf]" />}
                </button>
              ))}
            </div>

            <div className="p-6 border-t bg-white shadow-2xl">
              <button 
                onClick={createRoom} 
                disabled={selectedMembers.length === 0}
                className="w-full bg-[#0079bf] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#026aa7] disabled:bg-slate-200 disabled:text-slate-400 transition-all active:scale-95"
              >
                {selectedMembers.length > 1 ? `Créer le groupe (${selectedMembers.length})` : "Lancer la discussion"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
