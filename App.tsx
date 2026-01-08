
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
  RefreshCw,
  Info,
  CheckCircle2
} from 'lucide-react';

declare var TrelloPowerUp: any;

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
  const [isSyncing, setIsSyncing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Correction cruciale pour la hauteur Trello
  useEffect(() => {
    const t = (window as any).TrelloPowerUp ? (window as any).TrelloPowerUp.iframe() : null;
    
    const handleResize = () => {
      if (t) {
        t.sizeTo('#root').done();
      }
    };

    // Redimensionner au chargement et lors de chaque mise à jour de rendu
    handleResize();
    window.addEventListener('resize', handleResize);
    const interval = setInterval(handleResize, 1000); // Sécurité supplémentaire

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [rooms, activeRoomId, isCreatingChat]);

  useEffect(() => {
    localStorage.setItem('trello_chat_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeRoomId, rooms]);

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
        ? `Groupe (${selectedMembers.length})`
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

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: CURRENT_USER.id,
      text: inputText,
      timestamp: Date.now()
    };

    const currentText = inputText;
    setInputText('');

    setRooms(prev => prev.map(r => r.id === activeRoomId ? {
      ...r,
      messages: [...r.messages, newMessage],
      lastActivity: Date.now()
    } : r));

    if (activeRoom?.memberIds.includes('user_4')) {
      setIsTyping(true);
      const history = activeRoom.messages.slice(-5).map(m => ({
        role: m.senderId === CURRENT_USER.id ? 'user' as const : 'model' as const,
        text: m.text
      }));
      const response = await getGeminiResponse(currentText, history);
      const aiMessage: Message = {
        id: `msg_ai_${Date.now()}`,
        senderId: 'user_4',
        text: response,
        timestamp: Date.now()
      };
      setIsTyping(false);
      setRooms(prev => prev.map(r => r.id === activeRoomId ? {
        ...r,
        messages: [...r.messages, aiMessage],
        lastActivity: Date.now()
      } : r));
    }
  };

  return (
    <div id="root" className="flex h-screen w-full bg-[#f4f5f7] text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r border-[#dfe1e6] bg-white shrink-0">
        <div className="p-4 bg-[#0079bf] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 font-bold">
            <MessageSquare size={18} />
            <span>Chat</span>
          </div>
          <button onClick={() => setIsCreatingChat(true)} className="p-1 hover:bg-white/20 rounded">
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setActiveRoomId(room.id)}
              className={`w-full p-3 flex items-center gap-3 border-b border-[#ebecf0] hover:bg-slate-50 text-left ${activeRoomId === room.id ? 'bg-blue-50' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${room.isGroup ? 'bg-slate-400' : 'bg-blue-600'}`}>
                {room.isGroup ? 'G' : 'C'}
              </div>
              <div className="flex-1 truncate">
                <p className="font-bold text-sm truncate">{room.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        {activeRoom ? (
          <>
            <div className="p-3 border-b flex justify-between items-center shrink-0">
              <span className="font-bold text-sm">{activeRoom.name}</span>
              <button onClick={() => setActiveRoomId(null)} className="md:hidden"><X size={18}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {activeRoom.messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.senderId === CURRENT_USER.id ? 'items-end' : 'items-start'}`}>
                  <div className={`p-2 rounded-lg text-sm max-w-[85%] ${msg.senderId === CURRENT_USER.id ? 'bg-[#0079bf] text-white' : 'bg-white border text-slate-800'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && <div className="text-xs text-slate-400 animate-pulse">L'IA écrit...</div>}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2 shrink-0">
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Votre message..."
                className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-black"
              />
              <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageSquare size={48} className="text-slate-200 mb-4" />
            <h3 className="font-bold text-slate-800">Sélectionnez une discussion</h3>
            <button onClick={() => setIsCreatingChat(true)} className="mt-4 text-blue-600 font-bold">Nouvelle discussion</button>
          </div>
        )}

        {/* Modal simple */}
        {isCreatingChat && (
          <div className="absolute inset-0 bg-white z-50 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold">Nouveau chat</h2>
              <button onClick={() => setIsCreatingChat(false)}><X/></button>
            </div>
            <div className="space-y-2">
              {MOCK_BOARD_MEMBERS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMembers([m.id]); createRoom(); }}
                  className="w-full p-4 border rounded-xl hover:bg-slate-50 text-left font-bold"
                >
                  {m.fullName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
