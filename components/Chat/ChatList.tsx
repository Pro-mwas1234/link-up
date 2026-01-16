
import React, { useState } from 'react';
import { User, Chat } from '../../types';
import { storageService } from '../../services/storageService';
import ChatRoom from './ChatRoom';

interface ChatListProps {
  currentUser: User;
  initialChats: Chat[];
  typingStatuses: Record<string, Record<string, boolean>>;
}

const ChatList: React.FC<ChatListProps> = ({ currentUser, initialChats, typingStatuses }) => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  
  const activeChat = initialChats.find(c => c.id === activeChatId);

  // Helper to find the other user in a private chat
  const getOtherParticipant = (chat: Chat): User | null => {
    if (chat.isGroup) return null;
    const otherId = chat.participants.find(id => id !== currentUser.id);
    return otherId ? storageService.getUserById(otherId) : null;
  };

  if (activeChat) {
    return (
      <ChatRoom 
        chat={activeChat} 
        currentUser={currentUser} 
        onBack={() => setActiveChatId(null)} 
        typingStatus={typingStatuses[activeChat.id] || {}}
      />
    );
  }

  const registeredUsers = storageService.getDiscoveryUsers(currentUser.id);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <h2 className="text-xl font-bold">Messages</h2>
        <button 
          onClick={() => setShowCreateGroup(true)}
          className="p-2 bg-slate-800 rounded-full text-pink-500 hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {initialChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
            <div className="w-16 h-16 mb-4 opacity-20">
               <svg fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <p>No matches yet. Swipe on some people to start talking!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {initialChats.map(chat => {
              const lastMessage = chat.messages[chat.messages.length - 1];
              const otherUser = getOtherParticipant(chat);
              
              const displayName = chat.isGroup ? (chat.name || "Unnamed Group") : (otherUser?.name || "Deleted User"); 
              const avatar = chat.isGroup 
                ? `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || 'G')}&background=ec4899&color=fff` 
                : (otherUser?.media[0] || `https://ui-avatars.com/api/?name=?&background=334155`);
              
              const chatTyping = typingStatuses[chat.id];
              const isSomeoneTyping = chatTyping && Object.values(chatTyping).some(v => v);

              return (
                <button 
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className="w-full flex items-center p-4 hover:bg-slate-800/50 transition-all text-left group"
                >
                  <div className="relative">
                    <img src={avatar} className="w-14 h-14 rounded-full object-cover border border-slate-700 group-hover:border-pink-500 transition-colors" alt="" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                  </div>
                  <div className="ml-4 flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold text-slate-100 truncate">{displayName}</h3>
                      <span className="text-[10px] text-slate-500">
                        {lastMessage ? new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    {isSomeoneTyping ? (
                      <p className="text-sm text-pink-500 italic truncate mt-1 flex items-center">
                        <span className="flex space-x-1 mr-2 items-center">
                          <span className="w-1 h-1 bg-pink-500 rounded-full animate-bounce"></span>
                          <span className="w-1 h-1 bg-pink-500 rounded-full animate-bounce delay-75"></span>
                          <span className="w-1 h-1 bg-pink-500 rounded-full animate-bounce delay-150"></span>
                        </span>
                        Typing...
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 truncate mt-1">
                        {lastMessage?.senderId === currentUser.id ? 'You: ' : ''}{lastMessage?.text || (lastMessage?.media ? 'Sent a media file' : 'Start chatting...')}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-slate-800 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4">Create Group Chat</h3>
            <input 
              type="text" 
              placeholder="Group Name" 
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-pink-500 outline-none"
            />
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto no-scrollbar">
               <p className="text-xs font-bold text-slate-500 uppercase">Select Participants</p>
               {registeredUsers.length === 0 ? (
                 <p className="text-sm text-slate-500 italic">No other users registered yet.</p>
               ) : (
                 registeredUsers.map(user => (
                   <label key={user.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                     <span className="text-sm">{user.name}</span>
                     <input type="checkbox" className="form-checkbox h-5 w-5 text-pink-500 rounded border-slate-700 bg-slate-800 focus:ring-0" />
                   </label>
                 ))
               )}
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 font-semibold text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 py-3 rounded-xl bg-pink-500 font-semibold shadow-lg shadow-pink-500/20 text-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatList;
