
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

  const fetchGlobal = async () => {
    setIsRefreshing(true);
    const globalUsers = await cloudService.fetchGlobalDiscovery();
    // Only show other users and shuffle them
    const filtered = globalUsers
      .filter(u => u.id !== currentUser.id)
      .sort(() => Math.random() - 0.5);
    
    // Cache them so other parts of the app can resolve their IDs
    filtered.forEach(u => storageService.cacheCloudUser(u));
    
    setUsers(filtered);
    setCurrentIndex(0);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchGlobal();
  }, [currentUser.id]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (users[currentIndex] && direction === 'right') {
      onMatch(users[currentIndex]);
    }
    setCurrentIndex(prev => prev + 1);
  };

  if (isRefreshing) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 bg-slate-950">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-pink-500/10 rounded-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
          </div>
          <div className="absolute inset-0 bg-pink-500 blur-3xl opacity-10 animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse">Scanning Cloud</p>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Searching for active devices...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0 || currentIndex >= users.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-8 bg-slate-950">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-transparent" />
           <svg className="w-10 h-10 text-slate-700" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" clipRule="evenodd" /></svg>
        </div>
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Quiet Night.</h2>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">No other devices are currently active in the cloud registry. Try refreshing or come back when the party starts!</p>
        </div>
        <button 
          onClick={fetchGlobal} 
          className="px-10 py-4 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl font-black text-white shadow-2xl shadow-pink-500/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
        >
          Ping Cloud Registry
        </button>
      </div>
    );
  }

  const profile = users[currentIndex];

  return (
    <div className="h-full flex flex-col p-4 relative bg-slate-950">
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-slate-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
          <img src={profile.media[0]} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/10 to-transparent" />
          
          <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
             <div className="px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg border border-white/20 animate-pulse">Live Peer</div>
             <div className="flex items-center space-x-2 text-[10px] text-white/60 font-black uppercase tracking-widest">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                <span>Online</span>
             </div>
          </div>

          <div className="absolute bottom-0 left-0 p-10 w-full text-white cursor-pointer" onClick={() => onViewProfile(profile)}>
             <div className="flex items-baseline space-x-3">
               <h2 className="text-5xl font-black tracking-tighter">{profile.name}</h2>
               <span className="text-3xl font-light text-white/50">{profile.age}</span>
             </div>
             <p className="mt-3 text-pink-400 text-xs font-black uppercase tracking-[0.2em]">{profile.preference || 'Short Term'}</p>
             <p className="mt-6 text-slate-300 text-sm font-medium leading-relaxed line-clamp-2 max-w-[80%]">{profile.bio}</p>
          </div>
        </div>
      </div>

      <div className="h-32 flex items-center justify-center space-x-12 shrink-0">
        <button onClick={() => handleSwipe('left')} className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-500 shadow-xl active:scale-90 transition-all hover:bg-slate-800">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <button onClick={() => handleSwipe('right')} className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-xl active:scale-90 transition-all hover:bg-slate-800">
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.727 4 2.015C12.454 3.727 13.943 3 15.5 3c2.786 0 5.25 2.322 5.25 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
        </button>
      </div>
    </div>
  );
};

export default Discovery;
