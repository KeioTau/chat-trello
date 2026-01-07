
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, ChatRoom } from './types';
import { CURRENT_USER, MOCK_BOARD_MEMBERS } from './constants';
import { getGeminiResponse } from './services/geminiService';
import { 
  Plus, 
  Send, 
  Search, 
  MessageSquare, 
  Users, 
  X, 
  Settings,
  MoreVertical,
  CheckCircle2,
  Paperclip,
  RefreshCw,
  Info
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

  useEffect(() => {
    if (typeof TrelloPowerUp !== 'undefined') {
      const t = TrelloPowerUp.iframe();
      t.sizeTo('#root').done();
    }
  }, []);

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
        ? `Groupe: ${selectedMembers.map(id => MOCK_BOARD_MEMBERS.find(m => m.id === id)?.fullName.split(' ')[0]).join(', ')}`
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

    const updatedText = inputText;
    setInputText('');

    setRooms(prev => prev.map(r => {
      if (r.id === activeRoomId) {
        return {
          ...r,
          messages: [...r.messages, newMessage],
          lastActivity: Date.now()
        };
      }
      return r;
    }));

    const currentRoom = rooms.find(r => r.id === activeRoomId);
    if (currentRoom?.memberIds.includes('user_4')) {
      setIsTyping(true);
      const history = currentRoom.messages.slice(-10).map(m => ({
        role: m.senderId === CURRENT_USER.id ? 'user' as const : 'model' as const,
        text: m.text
      }));
      const response = await getGeminiResponse(updatedText, history);
      const aiMessage: Message = {
        id: `msg_ai_${Date.now()}`,
        senderId: 'user_4',
        text: response,
        timestamp: Date.now()
      };
      setIsTyping(false);
      setRooms(prev => prev.map(r => {
        if (r.id === activeRoomId) {
          return {
            ...r,
            messages: [...r.messages, aiMessage],
            lastActivity: Date.now()
          };
        }
        return r;
      }));
    }
  };

  const simulateRefresh = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1000);
  };

  return (
    <div className="flex h-screen w-full bg-[#f4f5f7] text-gray-900">
      {/* Sidebar */}
      <div className="w-80 flex flex-col border-r border-[#dfe1e6] bg-white">
        <div className="p-4 border-b border-[#dfe1e6] flex justify-between items-center bg-[#0079bf] text-white">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} />
            <h1 className="font-bold text-lg">Board Chat</h1>
          </div>
          <button onClick={() => setIsCreatingChat(true)} className="p-1 hover:bg-white/20 rounded transition-colors">
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="p-8 text-center text-gray-500 mt-10">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">Aucune discussion.</p>
              <button onClick={() => setIsCreatingChat(true)} className="mt-4 text-[#0079bf] font-medium hover:underline text-sm">
                Nouveau chat
              </button>
            </div>
          ) : (
            rooms.sort((a, b) => b.lastActivity - a.lastActivity).map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`w-full p-4 flex items-center gap-3 border-b border-[#ebecf0] hover:bg-[#f4f5f7] transition-colors text-left ${activeRoomId === room.id ? 'bg-[#e4f0f6] border-l-4 border-l-[#0079bf]' : ''}`}
              >
                <div className="relative">
                  {room.isGroup ? (
                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500"><Users size={20} /></div>
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${MOCK_BOARD_MEMBERS.find(m => room.memberIds.includes(m.id))?.color || 'bg-gray-400'}`}>
                      {MOCK_BOARD_MEMBERS.find(m => room.memberIds.includes(m.id))?.initials}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate text-sm">{room.name}</p>
                  <p className="text-xs text-gray-500 truncate">{room.messages.length > 0 ? room.messages[room.messages.length - 1].text : 'Pas de message'}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 bg-[#f4f5f7] border-t border-[#dfe1e6] flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-400 animate-pulse' : 'bg-green-500'}`}></span>
            <span>Version 1.0.3 - Live</span>
          </div>
          <button onClick={simulateRefresh} className="hover:text-[#0079bf] transition-colors">
            <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative bg-white">
        {activeRoom ? (
          <>
            <div className="p-4 border-b border-[#dfe1e6] flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#ebecf0] flex items-center justify-center text-[#42526e]">
                  {activeRoom.isGroup ? <Users size={16} /> : <MessageSquare size={16} />}
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 leading-tight">{activeRoom.name}</h2>
                  <p className="text-[10px] text-gray-400">{activeRoom.memberIds.length} membres</p>
                </div>
              </div>
              <Info size={18} className="text-gray-300 cursor-help hover:text-gray-500" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f4f5f7]/30">
              {activeRoom.messages.map((msg, i) => {
                const isMe = msg.senderId === CURRENT_USER.id;
                const sender = MOCK_BOARD_MEMBERS.find(m => m.id === msg.senderId) || CURRENT_USER;
                const prevMsg = activeRoom.messages[i - 1];
                const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${!showHeader ? '-mt-3' : ''}`}>
                    {showHeader && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        {!isMe && <span className="text-[10px] font-bold text-gray-600">{sender.fullName}</span>}
                        <span className="text-[9px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && <span className="text-[10px] font-bold text-gray-600">Moi</span>}
                      </div>
                    )}
                    <div className="flex gap-2 max-w-[75%]">
                      {!isMe && showHeader && (
                        <div className={`w-6 h-6 rounded-full ${sender.color} flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 mt-1`}>
                          {sender.initials}
                        </div>
                      )}
                      {!isMe && !showHeader && <div className="w-6 flex-shrink-0" />}
                      <div className={`p-3 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-[#0079bf] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-[#dfe1e6]'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isTyping && <div className="text-xs text-gray-400 animate-pulse ml-8 italic">L'IA écrit...</div>}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-[#dfe1e6]">
              <form onSubmit={handleSendMessage} className="relative flex items-end gap-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="Écrivez un message..."
                  className="flex-1 p-3 bg-white border border-[#bfc4ce] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0079bf] focus:border-transparent text-gray-900 text-sm shadow-inner resize-none min-h-[44px]"
                  rows={1}
                />
                <button type="submit" disabled={!inputText.trim()} className="p-3 bg-[#0079bf] text-white rounded-xl hover:bg-[#026aa7] disabled:bg-gray-300 transition-colors shadow-md">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-500">
            <MessageSquare size={64} className="text-[#0079bf] mb-6 opacity-20" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Tchat de Tableau</h2>
            <p className="max-w-xs mb-8">Collaborez instantanément avec votre équipe.</p>
            <button onClick={() => setIsCreatingChat(true)} className="px-6 py-3 bg-[#0079bf] text-white font-bold rounded-lg shadow-md hover:bg-[#026aa7] transition-all flex items-center gap-2">
              <Plus size={20} /> Nouvelle Discussion
            </button>
          </div>
        )}

        {/* Modal Nouveau Chat */}
        {isCreatingChat && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-4 border-b border-[#dfe1e6] flex justify-between items-center bg-[#fafbfc]">
                <h3 className="font-bold text-gray-800 text-base">Démarrer une discussion</h3>
                <button onClick={() => setIsCreatingChat(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {MOCK_BOARD_MEMBERS.map(member => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMembers(prev => prev.includes(member.id) ? prev.filter(id => id !== member.id) : [...prev, member.id])}
                    className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${selectedMembers.includes(member.id) ? 'bg-[#e4f0f6] ring-1 ring-[#0079bf]' : 'hover:bg-[#f4f5f7]'}`}
                  >
                    <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-bold`}>{member.initials}</div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-900">{member.fullName}</p>
                      <p className="text-[10px] text-gray-500">@{member.username}</p>
                    </div>
                    {selectedMembers.includes(member.id) && <CheckCircle2 size={18} className="text-[#0079bf]" />}
                  </button>
                ))}
              </div>
              <div className="p-4 border-t flex justify-end gap-2 bg-[#fafbfc]">
                <button onClick={() => { setIsCreatingChat(false); setSelectedMembers([]); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Annuler</button>
                <button onClick={createRoom} disabled={selectedMembers.length === 0} className="px-6 py-2 bg-[#0079bf] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#026aa7] disabled:bg-gray-300">
                  Créer le tchat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
