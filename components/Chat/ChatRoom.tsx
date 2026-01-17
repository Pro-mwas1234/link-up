
import React, { useState, useRef, useEffect } from 'react';
import { User, Chat, Message } from '../../types';
import { suggestIcebreaker, getAIChatResponse } from '../../services/geminiService';
import { storageService } from '../../services/storageService';
import { cloudService } from '../../services/cloudService';

interface ChatRoomProps {
  chat: Chat;
  currentUser: User;
  onBack: () => void;
  typingStatus: Record<string, boolean>;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ chat, currentUser, onBack, typingStatus }) => {
  const [inputText, setInputText] = useState('');
  const [isAIResponding, setIsAIResponding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherUserId = chat.participants.find(id => id !== currentUser.id) || '';
  const otherUser = storageService.getUserById(otherUserId);
  const isAI = otherUserId.startsWith('ai-');
  const messages = chat.messages;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingStatus, isAIResponding]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!isAI) {
      cloudService.sendTypingStatus(otherUserId, chat.id, currentUser.id, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        cloudService.sendTypingStatus(otherUserId, chat.id, currentUser.id, false);
      }, 2000);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      text: inputText,
      timestamp: Date.now()
    };

    storageService.saveMessage(chat.id, newMessage);
    setInputText('');

    if (isAI) {
      setIsAIResponding(true);
      const aiReplyText = await getAIChatResponse(otherUser?.bio || "", messages, inputText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        senderId: otherUserId,
        text: aiReplyText,
        timestamp: Date.now()
      };
      setTimeout(() => {
        storageService.saveMessage(chat.id, aiMessage);
        setIsAIResponding(false);
      }, 1500);
    } else {
      cloudService.sendMessage(otherUserId, chat.id, newMessage);
    }
  };

  const handleIcebreaker = async () => {
    const suggestion = await suggestIcebreaker(otherUser?.name || "there");
    setInputText(suggestion);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 absolute inset-0 z-20 animate-in slide-in-from-right duration-300">
      <div className="h-16 flex items-center px-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <button onClick={onBack} className="p-2 text-slate-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="ml-2 flex items-center">
          <div className="relative">
            <img src={otherUser?.media[0]} className="w-10 h-10 rounded-full object-cover border border-slate-700" alt="" />
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${isAI ? 'bg-indigo-500' : 'bg-emerald-500'} border-2 border-slate-900 rounded-full animate-live`} />
          </div>
          <div className="ml-3">
            <h3 className="font-bold text-slate-100 leading-none">{otherUser?.name}</h3>
            <span className={`text-[10px] ${isAI ? 'text-indigo-400' : 'text-emerald-500'} font-medium uppercase tracking-widest`}>
              {isAI ? 'AI Simulation Active' : 'Real-time Connected'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${isMe ? 'bg-pink-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none'}`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <span className="text-[9px] opacity-60 mt-1 block text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        {(Object.values(typingStatus).some(v => v) || isAIResponding) && (
          <div className="flex justify-start">
             <div className="bg-slate-800 rounded-2xl px-4 py-2 flex space-x-1 items-center">
                <span className={`w-1 h-1 ${isAI ? 'bg-indigo-500' : 'bg-pink-500'} rounded-full animate-bounce`}></span>
                <span className={`w-1 h-1 ${isAI ? 'bg-indigo-500' : 'bg-pink-500'} rounded-full animate-bounce [animation-delay:0.2s]`}></span>
                <span className={`w-1 h-1 ${isAI ? 'bg-indigo-500' : 'bg-pink-500'} rounded-full animate-bounce [animation-delay:0.4s]`}></span>
             </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3 pb-safe">
        <button onClick={handleIcebreaker} className="text-[10px] bg-slate-800 px-4 py-2 rounded-full text-pink-400 font-bold border border-pink-500/20">✨ AI Wingman</button>
        <div className="flex items-center space-x-2">
          <input 
            type="text" 
            placeholder={isAI ? "Chat with Simulation..." : "Send a live message..."} 
            className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button onClick={handleSendMessage} className="p-3 bg-pink-500 rounded-full text-white shadow-lg">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
