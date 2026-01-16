
import React, { useState, useRef, useEffect } from 'react';
import { User, Chat, Message } from '../../types';
import { suggestIcebreaker } from '../../services/geminiService';
import { socketService } from '../../services/socketService';
import { storageService } from '../../services/storageService';

interface ChatRoomProps {
  chat: Chat;
  currentUser: User;
  onBack: () => void;
  typingStatus: Record<string, boolean>;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ chat, currentUser, onBack, typingStatus }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = chat.messages;
  const isSomeoneTyping = Object.values(typingStatus).some(v => v);

  const otherUser = !chat.isGroup 
    ? storageService.getUserById(chat.participants.find(id => id !== currentUser.id) || '')
    : null;

  const typingUsers = Object.entries(typingStatus)
    .filter(([_, isTyping]) => isTyping)
    .map(([userId]) => {
      const user = storageService.getUserById(userId);
      return user ? user.name : 'Someone';
    });

  const typingText = typingUsers.length > 2 
    ? 'Several people are typing...' 
    : typingUsers.length > 1 
    ? `${typingUsers.join(' and ')} are typing...`
    : `${typingUsers[0] || 'Someone'} is typing...`;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSomeoneTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    if (!typingTimeoutRef.current) {
      socketService.sendTypingStatus(chat.id, currentUser.id, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socketService.sendTypingStatus(chat.id, currentUser.id, false);
      typingTimeoutRef.current = null;
    }, 2000);

    if (value === '') {
      socketService.sendTypingStatus(chat.id, currentUser.id, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socketService.sendTypingStatus(chat.id, currentUser.id, false);

    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      text: inputText,
      timestamp: Date.now()
    };

    // 1. Save to global persistent storage
    storageService.saveMessage(chat.id, newMessage);
    
    // 2. Broadcast via socketService (for other active tabs)
    socketService.sendMessage(chat.id, newMessage);
    
    setInputText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newMessage: Message = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          senderId: currentUser.id,
          text: '',
          media: reader.result as string,
          mediaType: file.type.startsWith('video') ? 'video' : 'image',
          timestamp: Date.now()
        };
        storageService.saveMessage(chat.id, newMessage);
        socketService.sendMessage(chat.id, newMessage);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIcebreaker = async () => {
    const recipientName = chat.isGroup ? "everyone" : (otherUser?.name || "there");
    const suggestion = await suggestIcebreaker(recipientName);
    setInputText(suggestion);
  };

  const headerName = chat.isGroup ? (chat.name || "Group") : (otherUser?.name || "Chat");
  const headerAvatar = chat.isGroup 
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || 'G')}&background=ec4899&color=fff`
    : (otherUser?.media[0] || `https://ui-avatars.com/api/?name=?&background=334155`);

  return (
    <div className="h-full flex flex-col bg-slate-900 absolute inset-0 z-20 animate-in slide-in-from-right duration-300">
      <div className="h-16 flex items-center px-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="ml-2 flex items-center flex-1">
          <div className="relative">
            <img 
                src={headerAvatar} 
                className="w-10 h-10 rounded-full border border-slate-700 object-cover" 
                alt="" 
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>
          <div className="ml-3 overflow-hidden">
            <h3 className="font-bold text-slate-100 leading-none truncate">{headerName}</h3>
            {isSomeoneTyping ? (
              <span className="text-[10px] text-pink-500 font-bold animate-pulse">{typingText}</span>
            ) : (
              <span className="text-[10px] text-emerald-500 font-medium">Online</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg, i) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-lg ${isMe ? 'bg-pink-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none'}`}>
                {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                {msg.media && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-white/5 bg-black/20">
                    {msg.mediaType === 'video' ? (
                      <video src={msg.media} controls className="max-w-full" />
                    ) : (
                      <img src={msg.media} alt="Shared media" className="max-w-full h-auto object-cover max-h-60" />
                    )}
                  </div>
                )}
                <div className={`flex items-center mt-1 space-x-1 justify-end opacity-60`}>
                   <span className="text-[9px]">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isSomeoneTyping && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 flex space-x-1 items-center">
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce delay-150"></span>
             </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 space-y-3 pb-6">
        <div className="flex items-center">
            <button 
                onClick={handleIcebreaker}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 py-2 px-4 rounded-full text-pink-400 font-bold border border-pink-500/20 transition-all flex items-center shadow-lg active:scale-95"
            >
                <span className="mr-1.5">✨</span>
                AI Wingman Idea
            </button>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-slate-800 rounded-full text-slate-400 hover:text-pink-500 transition-colors active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*,video/*"
          />
          <div className="flex-1 bg-slate-800 rounded-full flex items-center px-4 py-1 border border-slate-700 focus-within:border-pink-500/50 transition-colors">
            <input 
              type="text" 
              placeholder="Type your spicy message..." 
              className="w-full bg-transparent border-none focus:outline-none text-sm py-2 text-slate-100 placeholder:text-slate-500"
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
          </div>
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full text-white shadow-xl shadow-pink-500/20 disabled:opacity-50 transition-all active:scale-90"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
