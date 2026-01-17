
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { cloudService } from '../../services/cloudService';
import { storageService } from '../../services/storageService';

interface DiscoveryProps {
  currentUser: User;
  onMatch: (user: User) => void;
  onViewProfile: (user: User) => void;
}

const Discovery: React.FC<DiscoveryProps> = ({ currentUser, onMatch, onViewProfile }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [searchError, setSearchError] = useState('');
  
  // Animation states
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const fetchUsers = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch only real users from Global Registry
      let globalUsers = await cloudService.fetchGlobalDiscovery();
      
      // 2. Filter out self and any invalid entries
      globalUsers = globalUsers.filter(u => u.id !== currentUser.id);
      
      // 3. Cache them for storage/messaging lookups
      globalUsers.forEach(u => storageService.cacheCloudUser(u));

      // 4. Set the stack - strictly real users
      setUsers(globalUsers.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0)));
      setCurrentIndex(0);
    } catch (e) {
      console.error("Discovery error:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Auto-refresh registry stack every 45 seconds to keep it fresh
    const interval = setInterval(fetchUsers, 45000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (isAnimating || currentIndex >= users.length) return;
    
    setIsAnimating(true);
    setExitDirection(direction);

    // After animation, move to next
    setTimeout(() => {
      if (direction === 'right') {
        onMatch(users[currentIndex]);
      }
      setCurrentIndex(prev => prev + 1);
      setExitDirection(null);
      setIsAnimating(false);
    }, 400);
  };

  const handleSearchById = async () => {
    setSearchError('');
    const idToSearch = searchId.trim();
    if (!idToSearch) return;
    
    setIsRefreshing(true);
    try {
      const globalUsers = await cloudService.fetchGlobalDiscovery();
      const found = globalUsers.find(u => 
        u.id.toLowerCase() === idToSearch.toLowerCase() || 
        (u as any).peerId?.toLowerCase() === idToSearch.toLowerCase()
      );
      
      if (found) {
        storageService.cacheCloudUser(found);
        cloudService.connectToPeer(found.id);
        onMatch(found);
        onViewProfile(found);
        setShowSearchModal(false);
        setSearchId('');
      } else {
        setSearchError('User ID not found. They might be offline.');
      }
    } catch (e) {
      setSearchError('Cloud Sync Failed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isRefreshing && users.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 bg-slate-950">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-pink-500/10 rounded-full flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
          </div>
          <div className="absolute inset-0 bg-pink-500 blur-3xl opacity-10 animate-pulse" />
        </div>
        <div className="text-center px-8">
          <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse italic">Scanning Global Network</p>
          <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.2em]">Locating real nodes across the pulse...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0 || currentIndex >= users.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-8 bg-slate-950">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 relative group">
           <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-transparent group-hover:opacity-100 transition-opacity" />
           <svg className="w-10 h-10 text-slate-700 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" clipRule="evenodd" /></svg>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic text-center">Ghost Town.</h2>
          <p className="text-slate-500 text-xs leading-relaxed max-w-[200px] mx-auto italic">No other live users detected. This network is 100% real-time P2P. Invite a friend or refresh the pulse!</p>
        </div>
        <div className="flex flex-col space-y-3 w-full max-w-[240px]">
          <button onClick={fetchUsers} disabled={isRefreshing} className="w-full py-5 bg-slate-900 border border-slate-800 rounded-3xl font-black text-white uppercase tracking-widest text-[10px] active:scale-95 transition-all hover:bg-slate-800 flex items-center justify-center space-x-2">
            {isRefreshing && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            <span>Sync Discovery Blob</span>
          </button>
          <button onClick={() => setShowSearchModal(true)} className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-600 rounded-3xl font-black text-white shadow-xl shadow-pink-500/20 uppercase tracking-widest text-[10px] active:scale-95 transition-all">Direct ID Search</button>
        </div>
      </div>
    );
  }

  const profile = users[currentIndex];
  const nextProfile = users[currentIndex + 1];
  
  const lastActiveSecs = Math.floor((Date.now() - (profile.lastSeen || 0)) / 1000);
  const isActiveNow = lastActiveSecs < 60;

  const getCardTransform = () => {
    if (exitDirection === 'right') return 'translate-x-[150%] rotate-[30deg] opacity-0';
    if (exitDirection === 'left') return 'translate-x-[-150%] rotate-[-30deg] opacity-0';
    return 'translate-x-0 rotate-0 opacity-100';
  };

  return (
    <div className="h-full flex flex-col p-4 relative bg-slate-950 overflow-hidden">
      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-slate-900 w-full max-w-sm rounded-[3rem] p-10 border border-white/10 shadow-3xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-3xl rounded-full" />
              <div className="flex justify-between items-center relative z-10">
                 <h3 className="text-2xl font-black text-white tracking-tighter italic">Connect Node</h3>
                 <button onClick={() => setShowSearchModal(false)} className="text-slate-500 hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium relative z-10">Bridge the link by entering a private Cloud ID from another device.</p>
              <div className="space-y-3 relative z-10">
                <input 
                  type="text" 
                  placeholder="uid-xxxxxx" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-pink-400 font-mono text-sm outline-none focus:ring-2 focus:ring-pink-500 transition-all uppercase placeholder:opacity-30 shadow-inner"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchById()}
                  autoFocus
                />
                {searchError && <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest pl-2">{searchError}</p>}
              </div>
              <button 
                onClick={handleSearchById}
                disabled={isRefreshing}
                className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-pink-500/30 active:scale-95 transition-all disabled:opacity-50 relative z-10"
              >
                {isRefreshing ? 'Pinging Node...' : 'Establish Handshake'}
              </button>
           </div>
        </div>
      )}

      <div className="flex-1 relative perspective-1000">
        {/* Next Card */}
        {nextProfile && (
           <div className="absolute inset-0 bg-slate-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl scale-95 opacity-50 transition-transform duration-300 translate-z-[-50px]">
              <img src={nextProfile.media[0]} className="w-full h-full object-cover blur-sm opacity-60" alt="" />
           </div>
        )}

        {/* Current Card */}
        <div 
          className={`absolute inset-0 bg-slate-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl transition-all duration-300 ease-out transform ${getCardTransform()}`}
          style={{ willChange: 'transform, opacity' }}
        >
          <img src={profile.media[0]} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
          
          {/* Swipe Stamps */}
          {exitDirection === 'right' && (
            <div className="absolute top-24 left-10 z-50 border-8 border-emerald-500 px-6 py-2 rounded-2xl rotate-[-20deg] animate-in zoom-in duration-200 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <span className="text-5xl font-black text-emerald-500 uppercase tracking-widest italic">LIKE</span>
            </div>
          )}
          {exitDirection === 'left' && (
            <div className="absolute top-24 right-10 z-50 border-8 border-rose-500 px-6 py-2 rounded-2xl rotate-[20deg] animate-in zoom-in duration-200 shadow-[0_0_20px_rgba(244,63,94,0.5)]">
              <span className="text-5xl font-black text-rose-500 uppercase tracking-widest italic">NOPE</span>
            </div>
          )}

          <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
             <div className="px-4 py-2 bg-emerald-500 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg border border-white/20 flex items-center space-x-2">
                <span className={`w-1.5 h-1.5 rounded-full bg-white ${isActiveNow ? 'animate-pulse' : 'opacity-40'}`} />
                <span>{isActiveNow ? 'Live Peer' : `Active ${Math.ceil(lastActiveSecs / 60)}m ago`}</span>
             </div>
             <button onClick={() => setShowSearchModal(true)} className="p-4 bg-black/60 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-black/80 transition-all hover:scale-110 active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </button>
          </div>

          <div className="absolute bottom-0 left-0 p-10 w-full text-white cursor-pointer" onClick={() => onViewProfile(profile)}>
             <div className="flex items-baseline space-x-3">
               <h2 className="text-5xl font-black tracking-tighter leading-none italic">{profile.name}</h2>
               <span className="text-3xl font-light text-white/50">{profile.age}</span>
             </div>
             <div className="flex items-center space-x-2 mt-4">
                <span className="bg-pink-500/20 text-pink-500 border border-pink-500/30 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">{profile.preference || 'Short Term'}</span>
                {profile.location && <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest flex items-center"><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>Near {profile.location}</span>}
             </div>
             <p className="mt-6 text-slate-200 text-sm font-medium leading-relaxed line-clamp-2 max-w-[90%] italic opacity-90">"{profile.bio}"</p>
          </div>
        </div>
      </div>

      <div className="h-32 flex items-center justify-center space-x-12 shrink-0">
        <button 
          onClick={() => handleSwipe('left')} 
          disabled={isAnimating}
          className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-500 shadow-2xl active:scale-90 transition-all hover:bg-slate-800 hover:border-rose-500/30 disabled:opacity-50"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <button 
          onClick={() => handleSwipe('right')} 
          disabled={isAnimating}
          className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-2xl active:scale-90 transition-all hover:bg-slate-800 hover:border-emerald-500/30 disabled:opacity-50"
        >
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.727 4 2.015C12.454 3.727 13.943 3 15.5 3c2.786 0 5.25 2.322 5.25 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
        </button>
      </div>
    </div>
  );
};

export default Discovery;
