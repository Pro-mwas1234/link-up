
import React, { useState, useEffect } from 'react';
import { AuthState, User, AppTab, Chat } from './types';
import Login from './components/Auth/Login';
import Discovery from './components/Discovery/Discovery';
import Feed from './components/Social/Feed';
import ChatList from './components/Chat/ChatList';
import Profile from './components/Profile/Profile';
import Navigation from './components/Common/Navigation';
import { socketService } from './services/socketService';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [activeTab, setActiveTab] = useState<AppTab>('discovery');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [typingStatuses, setTypingStatuses] = useState<Record<string, Record<string, boolean>>>({});
  const [chats, setChats] = useState<Chat[]>([]);

  const refreshChats = () => {
    if (authState.user) {
      setChats(storageService.getChatsForUser(authState.user.id));
    }
  };

  useEffect(() => {
    if (authState.isAuthenticated) {
      refreshChats();
    }
  }, [authState.isAuthenticated, authState.user]);

  useEffect(() => {
    const savedUserId = localStorage.getItem('linkup_session_userid');
    if (savedUserId) {
      const user = storageService.getUserById(savedUserId);
      if (user) {
        setAuthState({ user, isAuthenticated: true });
      }
    }
  }, []);

  useEffect(() => {
    const unsubMsg = socketService.onMessage(({ chatId, message }) => {
      refreshChats();
    });

    const unsubTyping = socketService.onTypingStatus(({ chatId, userId, isTyping }) => {
      if (authState.user && userId === authState.user.id) return;
      setTypingStatuses(prev => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] || {}),
          [userId]: isTyping
        }
      }));
    });

    return () => {
      unsubMsg();
      unsubTyping();
    };
  }, [authState.user]);

  const handleLogin = (user: User) => {
    localStorage.setItem('linkup_session_userid', user.id);
    setAuthState({ user, isAuthenticated: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('linkup_session_userid');
    setAuthState({ user: null, isAuthenticated: false });
    setChats([]);
    setViewingUser(null);
    setActiveTab('discovery');
    setActiveChatId(null);
  };

  const handleMatch = (matchedUser: User) => {
    if (!authState.user) return;
    const chatId = `chat_${[authState.user.id, matchedUser.id].sort().join('_')}`;
    const newChat: Chat = {
      id: chatId,
      participants: [authState.user.id, matchedUser.id],
      messages: [],
      isGroup: false
    };
    storageService.createChat(newChat);
    refreshChats();
  };

  const handleStartChat = (targetUser: User) => {
    if (!authState.user) return;
    const chatId = `chat_${[authState.user.id, targetUser.id].sort().join('_')}`;
    
    // Create chat if it doesn't exist
    const newChat: Chat = {
      id: chatId,
      participants: [authState.user.id, targetUser.id],
      messages: [],
      isGroup: false
    };
    storageService.createChat(newChat);
    refreshChats();

    // Navigate to the chat
    setViewingUser(null);
    setActiveChatId(chatId);
    setActiveTab('chats');
  };

  const handleProfileUpdate = (updatedUser: User) => {
    setAuthState(prev => ({ ...prev, user: updatedUser }));
    storageService.updateUserProfile(updatedUser.id, updatedUser);
  };

  if (!authState.isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-4">
      <div className="flex flex-col h-screen md:h-[90vh] w-full md:max-w-md lg:max-w-lg bg-slate-900 md:rounded-[2.5rem] overflow-hidden shadow-2xl relative md:border md:border-slate-800">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md z-10 shrink-0">
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent italic tracking-tighter">
            LinkUp
          </h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-500 shadow-lg shadow-pink-500/20 active:scale-90 transition-transform"
            >
              <img 
                src={authState.user?.media[0] || 'https://picsum.photos/200'} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'discovery' && (
            <Discovery 
              currentUser={authState.user!} 
              onMatch={handleMatch} 
              onViewProfile={setViewingUser}
            />
          )}
          {activeTab === 'feed' && (
            <Feed currentUser={authState.user!} />
          )}
          {activeTab === 'chats' && (
            <ChatList 
              currentUser={authState.user!} 
              initialChats={chats} 
              typingStatuses={typingStatuses} 
              activeChatId={activeChatId}
              setActiveChatId={setActiveChatId}
            />
          )}
          {activeTab === 'profile' && (
            <Profile 
              user={authState.user!} 
              onUpdate={handleProfileUpdate} 
              onLogout={handleLogout} 
            />
          )}
        </main>

        <Navigation activeTab={activeTab} onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'chats') setActiveChatId(null);
        }} />

        {viewingUser && (
          <div className="absolute inset-0 z-50 flex flex-col bg-slate-900 animate-in slide-in-from-bottom duration-300">
             <div className="absolute top-4 left-4 z-20">
                <button onClick={() => setViewingUser(null)} className="p-3 bg-black/40 backdrop-blur-md text-white rounded-full shadow-lg border border-white/10 active:scale-90 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <Profile 
                user={viewingUser} 
                onUpdate={() => {}} 
                onLogout={() => {}} 
                isReadOnly={true} 
                onStartChat={handleStartChat}
              />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
