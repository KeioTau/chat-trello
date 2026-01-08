
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, ChatRoom } from './types';
import { getGeminiResponse } from './geminiService';
import { 
  Plus, 
  Send, 
  MessageSquare, 
  Users, 
  X, 
  CheckCircle2,
  ChevronLeft,
  Loader2,
  RefreshCw
} from 'lucide-react';

// Initialisation de l'objet Trello
const t = (window as any).TrelloPowerUp.iframe();

export default function App() {
  const [boardMembers, setBoardMembers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [rooms, setRooms] = useState<ChatRoom[]>(() => {
    const saved = localStorage.getItem('trello_chat_rooms_v3');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initTrello = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Récupérer les membres du tableau avec un timeout ou une gestion d'erreur
      const membersData = await t.board('members');
      
      if (!membersData || !membersData.members) {
        throw new Error("Impossible de récupérer les membres.");
      }

      const formattedMembers = membersData.members.map((m: any) => ({
        id: m.id,
        fullName: m.fullName || m.username,
        username: m.username,
        avatarUrl: m.avatarUrl,
        initials: m.initials || m.fullName?.substring(0, 2).toUpperCase() || '??',
        color: 'bg-blue-600'
      }));
      
      const aiBot = {
        id: 'user_ai_assistant',
        fullName: 'Assistant IA',
        username: 'ai_bot',
        avatarUrl: '',
        initials: 'IA',
        color: 'bg-indigo-700'
      };

      setBoardMembers([...formattedMembers, aiBot]);

      // Récupérer l'utilisateur actuel
      const me = await t.member('id', 'fullName', 'username', 'initials', 'avatarUrl');
      setCurrentUser({
        id: me.id,
        fullName: me.fullName,
        username: me.username,
        avatarUrl: me.avatarUrl,
        initials: me.initials,
        color: 'bg-gray-800'
      });

    } catch (err: any) {
      console.error("Erreur d'initialisation Trello:", err);
      setError("Erreur d'accès aux données Trello. Vérifiez les autorisations du Power-Up.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initTrello();
  }, []);

  useEffect(() => {
    localStorage.setItem('trello_chat_rooms_v3', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeRoomId, rooms, isTyping]);

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  const createRoom = () => {
    if (selectedMembers.length === 0 || !currentUser) return;
    
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
        : boardMembers.find(m => m.id === selectedMembers[0])?.fullName || 'Chat',
      memberIds: [...selectedMembers, currentUser.id],
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
    if (!inputText.trim() || !activeRoomId || !currentUser) return;

    const userText = inputText.trim();
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      text: userText,
      timestamp: Date.now()
    };

    setInputText('');
    
    setRooms(prev => prev.map(r => r.id === activeRoomId ? {
      ...r,
      messages: [...r.messages, newMessage],
      lastActivity: Date.now()
    } : r));

    if (activeRoom?.memberIds.includes('user_ai_assistant')) {
      setIsTyping(true);
      try {
        const history = activeRoom.messages.slice(-10).map(m => ({
          role: m.senderId === 'user_ai_assistant' ? 'model' as const : 'user' as const,
          text: m.text
        }));
        
        const response = await getGeminiResponse(userText, history);
        
        const aiMessage: Message = {
          id: `msg_ai_${Date.now()}`,
          senderId: 'user_ai_assistant',
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

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="animate-spin text-[#0079bf]" size={40} />
        <p className="text-slate-500 font-medium animate-pulse">Synchronisation Trello...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-white p-8 text-center">
        <div className="text-red-500 mb-4">
          <X size={48} className="mx-auto" />
        </div>
        <h2 className="font-bold text-xl mb-2">Oups !</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button onClick={initTrello} className="flex items-center gap-2 bg-[#0079bf] text-white px-6 py-2 rounded-lg font-bold">
          <RefreshCw size={18} /> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div id="root" className="flex h-[600px] w-full bg-[#f4f5f7] text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div className={`w-72 flex flex-col border-r border-[#dfe1e6] bg-white shrink-0 transition-all ${activeRoomId ? 'hidden md:flex' : 'flex w-full'}`}>
        <div className="p-4 bg-[#0079bf] text-white flex justify-between items-center shrink-0 shadow-md">
          <h1 className="flex items-center gap-2 font-bold text-lg">
            <MessageSquare size={20} />
            <span>Chat Board</span>
          </h1>
          <button onClick={() => setIsCreatingChat(true)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <Plus size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-10" />
              <p className="text-sm font-medium">Aucun tchat ouvert</p>
              <button onClick={() => setIsCreatingChat(true)} className="mt-4 text-xs font-bold text-[#0079bf] hover:underline uppercase tracking-wider">Démarrer une discussion</button>
            </div>
          ) : (
            rooms.sort((a,b) => b.lastActivity - a.lastActivity).map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`w-full p-4 flex items-center gap-3 border-b border-[#f4f5f7] hover:bg-slate-50 transition-all text-left ${activeRoomId === room.id ? 'bg-[#e4f0f6] border-l-4 border-l-[#0079bf]' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0 ${room.isGroup ? 'bg-indigo-500' : 'bg-[#0079bf]'}`}>
                  {room.isGroup ? <Users size={16}/> : (boardMembers.find(m => room.memberIds.includes(m.id) && m.id !== currentUser?.id)?.initials || '?')}
                </div>
                <div className="flex-1 truncate">
                  <p className="font-bold text-sm truncate text-slate-800">{room.name}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {room.messages.length > 0 ? room.messages[room.messages.length - 1].text : 'Envoyer un premier message...'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Zone de Chat */}
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
                  {activeRoom.isGroup && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">Groupe</span>}
                </div>
              </div>
              <button onClick={() => setActiveRoomId(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={20}/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa]">
              {activeRoom.messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                const sender = boardMembers.find(m => m.id === msg.senderId) || { fullName: 'Inconnu', initials: '?' };
                
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">
                      {isMe ? 'Moi' : sender.fullName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className={`p-3 rounded-2xl text-sm shadow-sm max-w-[85%] ${isMe ? 'bg-[#0079bf] text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex gap-2 items-center text-slate-400 italic text-xs ml-2 animate-pulse">
                  Assistant écrit...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-2 shrink-0">
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Écrivez ici..."
                className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0079bf] outline-none transition-all"
              />
              <button type="submit" disabled={!inputText.trim()} className="bg-[#0079bf] text-white p-3 rounded-xl hover:bg-[#026aa7] disabled:bg-slate-200 shadow-md">
                <Send size={20} fill="currentColor" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#f4f5f7]">
             <div className="w-20 h-20 bg-[#0079bf] rounded-full flex items-center justify-center mb-6 shadow-xl animate-bounce">
               <MessageSquare size={36} className="text-white" />
             </div>
             <h3 className="font-bold text-xl text-slate-800 uppercase tracking-tight">Messagerie Interne</h3>
             <p className="text-slate-500 text-sm max-w-xs mt-2 mb-8 font-medium">Collaborez instantanément avec les {boardMembers.length - 1} membres de ce tableau.</p>
             <button onClick={() => setIsCreatingChat(true)} className="px-10 py-3 bg-[#0079bf] text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
               NOUVEAU MESSAGE
             </button>
          </div>
        )}

        {/* Modal Nouveau Chat */}
        {isCreatingChat && (
          <div className="absolute inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg">Nouveau tchat</h2>
              <button onClick={() => {setIsCreatingChat(false); setSelectedMembers([]);}} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20}/>
              </button>
            </div>
            <div className="p-4 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Choisissez vos collaborateurs</div>
            <div className="flex-1 overflow-y-auto p-2">
              {boardMembers.filter(m => m.id !== currentUser?.id).map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                  className={`w-full p-3 rounded-xl flex items-center gap-4 mb-1 transition-all ${selectedMembers.includes(m.id) ? 'bg-blue-50 border border-[#0079bf]/30 shadow-inner' : 'hover:bg-slate-50'}`}
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
            <div className="p-6 border-t shadow-2xl bg-white">
              <button 
                onClick={createRoom} 
                disabled={selectedMembers.length === 0}
                className="w-full bg-[#0079bf] text-white py-4 rounded-xl font-bold shadow-lg disabled:bg-slate-200 transition-all hover:bg-[#026aa7]"
              >
                {selectedMembers.length > 1 ? `Lancer le groupe (${selectedMembers.length + 1} pers.)` : "Démarrer le chat"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
