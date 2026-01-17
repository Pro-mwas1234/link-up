
import React, { useState, useEffect, useRef } from 'react';
import { AuthState, User, AppTab, Chat } from './types';
import Login from './components/Auth/Login';
import Discovery from './components/Discovery/Discovery';
import Feed from './components/Social/Feed';
import ChatList from './components/Chat/ChatList';
import Profile from './components/Profile/Profile';
import Navigation from './components/Common/Navigation';
import { storageService } from './services/storageService';
import { cloudService } from './services/cloudService';

const InitialLoader: React.FC = () => (
  <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center">
    <div className="relative">
      <div className="absolute inset-0 bg-pink-500 blur-3xl opacity-20 animate-pulse"></div>
      <h1 className="text-6xl font-black bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 bg-clip-text text-transparent italic tracking-tighter animate-pulse-logo relative z-10">
        LinkUp
      </h1>
    </div>
    <div className="mt-8 flex space-x-2">
      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [activeTab, setActiveTab] = useState<AppTab>('discovery');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [typingStatuses, setTypingStatuses] = useState<Record<string, Record<string, boolean>>>({});
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chats, setChats] = useState<Chat[]>([]);
  
  const [toast, setToast] = useState<{ name: string; message: string; avatar: string; chatId: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshChats = () => {
    if (authState.user) {
      setChats(storageService.getChatsForUser(authState.user.id));
    }
  };

  useEffect(() => {
    storageService.init();
    const timer = setTimeout(() => setIsAppLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      refreshChats();
      
      // Initialize Real-time P2P link and Wait for ID
      cloudService.init(authState.user.id).then(() => {
        setIsCloudConnected(true);
        // Instant broadcast now that we are definitely ready
        cloudService.publishProfile(authState.user!);
        setOnlineCount(cloudService.onlineCount);
        
        // Connect to existing chat partners
        const userChats = storageService.getChatsForUser(authState.user!.id);
        userChats.forEach(c => {
          const otherId = c.participants.find(p => p !== authState.user!.id);
          if (otherId) cloudService.connectToPeer(otherId);
        });
      });

      // Update online counter periodically
      const countInterval = setInterval(() => {
        setOnlineCount(cloudService.onlineCount);
      }, 10000);

      cloudService.onMessage((chatId, message) => {
        storageService.saveMessage(chatId, message);
        refreshChats();
        if (activeTab !== 'chats' || activeChatId !== chatId) {
          const sender = storageService.getUserById(message.senderId);
          if (sender) {
            setToast({
              name: sender.name,
              message: message.text || 'Shared a media file',
              avatar: sender.media[0],
              chatId
            });
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            toastTimerRef.current = setTimeout(() => setToast(null), 4000);
          }
        }
      });

      cloudService.onTyping((chatId, userId, isTyping) => {
        setTypingStatuses(prev => ({
          ...prev,
          [chatId]: { ...(prev[chatId] || {}), [userId]: isTyping }
        }));
      });

      return () => {
        clearInterval(countInterval);
      };
    }
  }, [authState.isAuthenticated, authState.user]);

  useEffect(() => {
    const savedUserId = localStorage.getItem('linkup_session_userid');
    if (savedUserId) {
      const user = storageService.getUserById(savedUserId);
      if (user) setAuthState({ user, isAuthenticated: true });
    }
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('linkup_session_userid', user.id);
    setAuthState({ user, isAuthenticated: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('linkup_session_userid');
    setAuthState({ user: null, isAuthenticated: false });
    setIsCloudConnected(false);
    setOnlineCount(0);
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
    cloudService.connectToPeer(matchedUser.id);
    refreshChats();
  };

  if (isAppLoading) return <InitialLoader />;
  if (!authState.isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div className="h-[100dvh] w-full bg-slate-950 flex items-center justify-center md:p-4 overflow-hidden">
      {toast && (
        <div 
          onClick={() => { setActiveChatId(toast.chatId); setActiveTab('chats'); setToast(null); }}
          className="fixed top-4 left-4 right-4 md:left-auto md:right-8 md:top-8 md:w-80 z-[200] bg-slate-800/95 backdrop-blur-xl border border-pink-500/30 rounded-2xl p-4 shadow-2xl flex items-center space-x-3 cursor-pointer animate-in slide-in-from-top-full duration-300"
        >
          <img src={toast.avatar} className="w-12 h-12 rounded-full object-cover border border-pink-500" alt="" />
          <div className="flex-1 overflow-hidden">
            <h4 className="font-bold text-sm text-slate-100">{toast.name}</h4>
            <p className="text-xs text-slate-400 truncate">{toast.message}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full w-full md:max-w-md lg:max-w-lg bg-slate-900 md:h-[90dvh] md:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative md:border md:border-slate-800">
        
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl z-[40] shrink-0 pt-safe">
          <div className="flex items-center space-x-2">
             <div className="relative">
                <svg className="w-6 h-6 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                {isCloudConnected && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
             </div>
             <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent italic tracking-tighter">
              LinkUp
            </h1>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[9px] font-black uppercase tracking-widest ${isCloudConnected ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isCloudConnected ? 'Cloud Active' : 'Connecting...'}
            </span>
            {onlineCount > 0 && (
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tight">Peers Nearby: {onlineCount}</span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative bg-slate-900">
          {activeTab === 'discovery' && <Discovery currentUser={authState.user!} onMatch={handleMatch} onViewProfile={setViewingUser} />}
          {activeTab === 'feed' && <Feed currentUser={authState.user!} />}
          {activeTab === 'chats' && <ChatList currentUser={authState.user!} initialChats={chats} typingStatuses={typingStatuses} activeChatId={activeChatId} setActiveChatId={setActiveChatId} />}
          {activeTab === 'profile' && <Profile user={authState.user!} onUpdate={(u) => { storageService.updateUserProfile(u.id, u); cloudService.publishProfile(u); setAuthState(prev => ({...prev, user: u})); }} onLogout={handleLogout} />}
        </main>

        <Navigation activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); if (tab !== 'chats') setActiveChatId(null); }} />

        {viewingUser && (
          <div className="absolute inset-0 z-50 flex flex-col bg-slate-900 animate-in slide-in-from-bottom duration-300">
             <div className="absolute top-4 left-4 z-[60]">
                <button onClick={() => setViewingUser(null)} className="p-3 bg-black/40 backdrop-blur-md text-white rounded-full border border-white/10">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <Profile user={viewingUser} onUpdate={() => {}} onLogout={() => {}} isReadOnly={true} onStartChat={(u) => { handleMatch(u); setViewingUser(null); setActiveTab('chats'); setActiveChatId(`chat_${[authState.user!.id, u.id].sort().join('_')}`); }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
