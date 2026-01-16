
import React from 'react';
import { AppTab } from '../../types';

interface NavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 sticky bottom-0 z-40">
      <button 
        onClick={() => onTabChange('discovery')}
        className={`flex flex-col items-center justify-center space-y-1 transition-all ${activeTab === 'discovery' ? 'text-pink-500 scale-110' : 'text-slate-500'}`}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        <span className="text-[8px] font-bold uppercase tracking-wider">Swipe</span>
      </button>

      <button 
        onClick={() => onTabChange('feed')}
        className={`flex flex-col items-center justify-center space-y-1 transition-all ${activeTab === 'feed' ? 'text-pink-500 scale-110' : 'text-slate-500'}`}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h10v2H7z"/></svg>
        <span className="text-[8px] font-bold uppercase tracking-wider">Feed</span>
      </button>

      <button 
        onClick={() => onTabChange('chats')}
        className={`flex flex-col items-center justify-center space-y-1 transition-all ${activeTab === 'chats' ? 'text-pink-500 scale-110' : 'text-slate-500'}`}
      >
        <div className="relative">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-wider">Chat</span>
      </button>

      <button 
        onClick={() => onTabChange('profile')}
        className={`flex flex-col items-center justify-center space-y-1 transition-all ${activeTab === 'profile' ? 'text-pink-500 scale-110' : 'text-slate-500'}`}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        <span className="text-[8px] font-bold uppercase tracking-wider">Profile</span>
      </button>
    </div>
  );
};

export default Navigation;
