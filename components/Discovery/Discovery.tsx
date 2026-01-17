
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { cloudService } from '../../services/cloudService';
import { storageService } from '../../services/storageService';
import { generateVirtualPeers } from '../../services/geminiService';

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

  const fetchUsers = async () => {
    setIsRefreshing(true);
    try {
      let globalUsers = await cloudService.fetchGlobalDiscovery();
      // Filter self
      globalUsers = globalUsers.filter(u => u.id !== currentUser.id);
      
      if (globalUsers.length < 3) {
        const aiUsers = await generateVirtualPeers(5);
        const combined = [...globalUsers, ...aiUsers];
        setUsers(combined.sort(() => Math.random() - 0.5));
      } else {
        setUsers(globalUsers.sort(() => Math.random() - 0.5));
      }
      
      // Cache profiles
      globalUsers.forEach(u => storageService.cacheCloudUser(u));
      setCurrentIndex(0);
    } catch (e) {
      console.error("Discovery error:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Refresh registry every 30s to catch new users
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (users[currentIndex] && direction === 'right') {
      onMatch(users[currentIndex]);
    }
    setCurrentIndex(prev => prev + 1);
  };

  const handleSearchById = async () => {
    setSearchError('');
    if (!searchId.trim()) return;
    
    setIsRefreshing(true);
    try {
      const globalUsers = await cloudService.fetchGlobalDiscovery();
      const found = globalUsers.find(u => u.id.toLowerCase().trim() === searchId.toLowerCase().trim());
      
      if (found) {
        storageService.cacheCloudUser(found);
        // Explicitly trigger match logic to open chat and P2P connection
        onMatch(found);
        onViewProfile(found);
        setShowSearchModal(false);
        setSearchId('');
      } else {
        setSearchError('User ID not found. Ensure they are currently active!');
      }
    } catch (e) {
      setSearchError('Cloud Sync Failed. Check your network.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isRefreshing && users.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 bg-slate-950">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-pink-500/10 rounded-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
          </div>
          <div className="absolute inset-0 bg-pink-500 blur-3xl opacity-10 animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse">Syncing Cloud</p>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Handshaking with global peers...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0 || currentIndex >= users.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-8 bg-slate-950">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-transparent" />
           <svg className="w-10 h-10 text-slate-700 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" clipRule="evenodd" /></svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Offline Vibe.</h2>
          <p className="text-slate-500 text-xs italic">No swipable users nearby. Use a Cloud ID to find someone specific instantly!</p>
        </div>
        <div className="flex flex-col space-y-3 w-full max-w-[240px]">
          <button onClick={fetchUsers} className="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl font-black text-white uppercase tracking-widest text-[10px] active:scale-95 transition-all">Deep Cloud Scan</button>
          <button onClick={() => setShowSearchModal(true)} className="w-full py-4 bg-pink-500 rounded-2xl font-black text-white shadow-xl shadow-pink-500/20 uppercase tracking-widest text-[10px] active:scale-95 transition-all">Direct ID Search</button>
        </div>
      </div>
    );
  }

  const profile = users[currentIndex];
  const isAI = profile.id.startsWith('ai-');

  return (
    <div className="h-full flex flex-col p-4 relative bg-slate-950">
      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-white/10 shadow-3xl space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black text-white tracking-tighter">Direct Connect</h3>
                 <button onClick={() => setShowSearchModal(false)} className="text-slate-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">Instantly bridge the gap by entering their private Cloud ID.</p>
              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Paste uid-xxxxxx" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-pink-400 font-mono text-sm outline-none focus:ring-2 focus:ring-pink-500 transition-all uppercase"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchById()}
                />
                {searchError && <p className="text-[10px] text-rose-500 font-bold uppercase">{searchError}</p>}
              </div>
              <button 
                onClick={handleSearchById}
                disabled={isRefreshing}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-pink-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isRefreshing ? 'Pinging Node...' : 'Establish Link'}
              </button>
           </div>
        </div>
      )}

      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-slate-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
          <img src={profile.media[0]} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/10 to-transparent" />
          
          <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
             <div className={`px-4 py-2 ${isAI ? 'bg-indigo-600' : 'bg-emerald-500'} backdrop-blur-md text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg border border-white/20`}>
                {isAI ? 'AI Match' : 'Cloud Peer'}
             </div>
             <button onClick={() => setShowSearchModal(true)} className="p-3 bg-black/40 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-black/60 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </button>
          </div>

          <div className="absolute bottom-0 left-0 p-10 w-full text-white cursor-pointer" onClick={() => onViewProfile(profile)}>
             <div className="flex items-baseline space-x-3">
               <h2 className="text-5xl font-black tracking-tighter leading-none">{profile.name}</h2>
               <span className="text-3xl font-light text-white/50">{profile.age}</span>
             </div>
             <div className="flex items-center space-x-2 mt-3">
                <span className="bg-pink-500/20 text-pink-500 border border-pink-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{profile.preference || 'Short Term'}</span>
                {profile.location && <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Near {profile.location}</span>}
             </div>
             <p className="mt-6 text-slate-300 text-sm font-medium leading-relaxed line-clamp-2 max-w-[90%] italic">"{profile.bio}"</p>
          </div>
        </div>
      </div>

      <div className="h-32 flex items-center justify-center space-x-12 shrink-0">
        <button onClick={() => handleSwipe('left')} className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-500 shadow-xl active:scale-90 transition-all hover:bg-slate-800 hover:border-rose-500/30">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <button onClick={() => handleSwipe('right')} className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-xl active:scale-90 transition-all hover:bg-slate-800 hover:border-emerald-500/30">
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.727 4 2.015C12.454 3.727 13.943 3 15.5 3c2.786 0 5.25 2.322 5.25 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
        </button>
      </div>
    </div>
  );
};

export default Discovery;
