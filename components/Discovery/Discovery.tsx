
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { storageService } from '../../services/storageService';

interface DiscoveryProps {
  currentUser: User;
  onMatch: (user: User) => void;
  onViewProfile: (user: User) => void;
}

const Discovery: React.FC<DiscoveryProps> = ({ currentUser, onMatch, onViewProfile }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  useEffect(() => {
    const discoveryUsers = storageService.getDiscoveryUsers(currentUser.id);
    setUsers(discoveryUsers);
    setCurrentMediaIndex(0);
  }, [currentUser.id]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (users[currentIndex] && direction === 'right') {
      onMatch(users[currentIndex]);
    }
    setCurrentIndex(prev => prev + 1);
    setCurrentMediaIndex(0);
  };

  const nextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    const user = users[currentIndex];
    if (currentMediaIndex < user.media.length - 1) {
      setCurrentMediaIndex(prev => prev + 1);
    }
  };

  const prevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => prev - 1);
    }
  };

  if (users.length === 0 || currentIndex >= users.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center animate-pulse border-2 border-slate-700 shadow-xl">
          <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">That's everyone!</h2>
          <p className="text-slate-400 text-sm max-w-[200px] mx-auto leading-relaxed">Check back later or refresh to see if new people joined the party.</p>
        </div>
        <button 
          onClick={() => { setCurrentIndex(0); setCurrentMediaIndex(0); }}
          className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full font-bold shadow-lg shadow-pink-500/30 active:scale-95 text-white transition-all"
        >
          Refresh Feed
        </button>
      </div>
    );
  }

  const profile = users[currentIndex];
  const isVideo = profile.isVideo?.[currentMediaIndex];

  return (
    <div className="h-full flex flex-col p-4 md:p-6 relative overflow-hidden">
      <div className="flex-1 relative">
        <div key={profile.id} className="absolute inset-0 bg-slate-800 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5">
          <div className="w-full h-full relative">
            {isVideo ? (
              <video 
                key={profile.media[currentMediaIndex]}
                src={profile.media[currentMediaIndex]} 
                autoPlay 
                muted 
                loop 
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img 
                key={profile.media[currentMediaIndex]}
                src={profile.media[currentMediaIndex]} 
                alt={profile.name} 
                className="w-full h-full object-cover"
              />
            )}

            {/* Tap controls */}
            <div className="absolute inset-0 flex">
              <div className="w-1/3 h-full cursor-pointer z-10" onClick={prevMedia} />
              <div className="w-2/3 h-full cursor-pointer z-10" onClick={nextMedia} />
            </div>

            {/* Pagination dots */}
            <div className="absolute top-4 left-4 right-4 flex space-x-1.5 z-20">
              {profile.media.map((_, idx) => (
                <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-white transition-all duration-300 ${idx === currentMediaIndex ? 'w-full' : idx < currentMediaIndex ? 'w-full opacity-60' : 'w-0'}`} 
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
          
          <div className="absolute bottom-0 left-0 p-6 w-full text-white">
            <div className="flex items-end justify-between pointer-events-auto cursor-pointer group" onClick={() => onViewProfile(profile)}>
              <div className="flex items-baseline space-x-2">
                <h2 className="text-3xl font-black tracking-tight">{profile.name}</h2>
                <span className="text-2xl font-light text-white/80">{profile.age}</span>
              </div>
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/10 group-hover:bg-pink-500 group-hover:scale-110 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-pink-400 flex items-center text-xs font-bold uppercase tracking-wider pointer-events-none">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {profile.location || 'Nearby'}
            </div>
            <p className="mt-3 text-slate-200 line-clamp-2 leading-relaxed text-sm font-medium pointer-events-none">{profile.bio}</p>
          </div>
        </div>
      </div>

      <div className="h-28 flex items-center justify-center space-x-8 shrink-0">
        <button 
          onClick={() => handleSwipe('left')}
          className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-500 shadow-xl active:scale-90 transition-all hover:bg-slate-700 hover:rotate-[-10deg] hover:scale-110"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button 
          onClick={() => handleSwipe('right')}
          className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-xl active:scale-90 transition-all hover:bg-slate-700 hover:rotate-[10deg] hover:scale-110"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.727 4 2.015C12.454 3.727 13.943 3 15.5 3c2.786 0 5.25 2.322 5.25 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Discovery;
