
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
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [rooms, setRooms] = useState<ChatRoom[]>(() => {
    const saved = localStorage.getItem('trello_chat_rooms');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Correction de la hauteur pour Trello Power-Up
  useEffect(() => {
    const t = (window as any).TrelloPowerUp ? (window as any).TrelloPowerUp.iframe() : null;
    
    const resizeFrame = () => {
      if (t && t.sizeTo) {
        // On cible spécifiquement le container root
        t.sizeTo('#root').catch(() => {
          // Fallback si sizeTo échoue : on force une hauteur via le parent de l'iframe si possible
          // Mais normalement sizeTo est la méthode officielle
        });
      }
    };

    // Exécuter immédiatement et à chaque changement d'état important
    resizeFrame();
    
    // On observe les changements de taille du DOM pour notifier Trello
    const observer = new ResizeObserver(() => {
      resizeFrame();
    });
    
    const rootEl = document.getElementById('root');
    if (rootEl) observer.observe(rootEl);

    return () => observer.disconnect();
  }, [rooms, activeRoomId, isCreatingChat, isTyping]);

  useEffect(() => {
    localStorage.setItem('trello_chat_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeRoomId, rooms, isTyping]);

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  const createRoom = () => {
    if (selectedMembers.length === 0) return;
    
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
        ? `Groupe (${selectedMembers.length + 1})`
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

    if (activeRoom?.memberIds.includes('user_4')) {
      setIsTyping(true);
      try {
        const history = activeRoom.messages.slice(-6).map(m => ({
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
        console.error(err);
      } finally {
        setIsTyping(false);
      }
    }
  };

  return (
    <div id="root" className="flex h-screen w-full bg-[#f4f5f7] text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 md:w-72 flex flex-col border-r border-[#dfe1e6] bg-white shrink-0">
        <div className="p-4 bg-[#0079bf] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 font-bold">
            <MessageSquare size={18} />
            <span>Trello Chat</span>
          </div>
          <button 
            onClick={() => setIsCreatingChat(true)} 
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="p-10 text-center opacity-40">
              <MessageSquare size={40} className="mx-auto mb-2" />
              <p className="text-xs font-bold uppercase">Aucun chat</p>
            </div>
          ) : (
            rooms.sort((a,b) => b.lastActivity - a.lastActivity).map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`w-full p-4 flex items-center gap-3 border-b border-[#ebecf0] hover:bg-slate-50 transition-colors text-left ${activeRoomId === room.id ? 'bg-[#e4f0f6] border-l-4 border-l-[#0079bf]' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ${room.isGroup ? 'bg-indigo-500' : 'bg-[#0079bf]'}`}>
                  {room.isGroup ? <Users size={16}/> : (MOCK_BOARD_MEMBERS.find(m => room.memberIds.includes(m.id))?.initials || 'C')}
                </div>
                <div className="flex-1 truncate">
                  <p className="font-bold text-sm truncate text-slate-800">{room.name}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        {activeRoom ? (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-white shrink-0">
              <div className="font-bold text-slate-800">{activeRoom.name}</div>
              <button onClick={() => setActiveRoomId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20}/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {activeRoom.messages.map((msg) => {
                const isMe = msg.senderId === CURRENT_USER.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-2xl text-sm shadow-sm max-w-[85%] ${isMe ? 'bg-[#0079bf] text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              {isTyping && <div className="text-xs text-slate-400 animate-pulse italic">L'IA écrit...</div>}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-2 shrink-0">
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Message..."
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-[#0079bf] outline-none text-black"
              />
              <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="bg-[#0079bf] text-white p-2 rounded-xl disabled:bg-slate-200"
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <MessageSquare size={48} className="text-slate-200 mb-4" />
            <h3 className="font-bold text-slate-800 mb-2">Bienvenue sur Trello Chat</h3>
            <button 
              onClick={() => setIsCreatingChat(true)} 
              className="px-6 py-2 bg-[#0079bf] text-white font-bold rounded-lg"
            >
              Nouvelle discussion
            </button>
          </div>
        )}

        {/* Modal Création */}
        {isCreatingChat && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-xl">Nouveau chat</h2>
              <button onClick={() => setIsCreatingChat(false)} className="p-2"><X/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {MOCK_BOARD_MEMBERS.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMembers([m.id]);
                    createRoom();
                  }}
                  className="w-full p-4 border rounded-xl flex items-center gap-4 hover:bg-slate-50"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${m.color}`}>
                    {m.initials}
                  </div>
                  <div className="text-left font-bold">{m.fullName}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
