
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { cloudService } from '../../services/cloudService';

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
    // Filter out current user and randomize
    const filtered = globalUsers.filter(u => u.id !== currentUser.id).sort(() => Math.random() - 0.5);
    setUsers(filtered);
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
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Polling Cloud Registry...</p>
      </div>
    );
  }

  if (users.length === 0 || currentIndex >= users.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6">
        <h2 className="text-2xl font-black text-white">Empty Sky.</h2>
        <p className="text-slate-500 text-sm">No other live devices found nearby. Be the first to go live!</p>
        <button onClick={fetchGlobal} className="px-8 py-3 bg-slate-800 rounded-full font-bold text-pink-500 border border-pink-500/20">Refresh Global Feed</button>
      </div>
    );
  }

  const profile = users[currentIndex];

  return (
    <div className="h-full flex flex-col p-4 relative bg-slate-950">
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-slate-900 rounded-[2.5rem] overflow-hidden border border-white/5">
          <img src={profile.media[0]} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
          
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
             <div className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full animate-pulse">Live Now</div>
             <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{profile.location || 'Cloud Device'}</div>
          </div>

          <div className="absolute bottom-0 left-0 p-8 w-full text-white cursor-pointer" onClick={() => onViewProfile(profile)}>
             <h2 className="text-4xl font-black tracking-tighter">{profile.name}, {profile.age}</h2>
             <p className="mt-2 text-pink-400 text-[10px] font-black uppercase tracking-widest">{profile.preference || 'Short Term'}</p>
             <p className="mt-4 text-slate-300 text-sm font-medium line-clamp-2">{profile.bio}</p>
          </div>
        </div>
      </div>

      <div className="h-32 flex items-center justify-center space-x-10">
        <button onClick={() => handleSwipe('left')} className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-500 active:scale-90 transition-all">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <button onClick={() => handleSwipe('right')} className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 active:scale-90 transition-all">
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.727 4 2.015C12.454 3.727 13.943 3 15.5 3c2.786 0 5.25 2.322 5.25 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
        </button>
      </div>
    </div>
  );
};

export default Discovery;
