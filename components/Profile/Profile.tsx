
import React, { useState, useRef, useEffect } from 'react';
import { User, Post, Comment } from '../../types';
import { enhanceBio } from '../../services/geminiService';
import { storageService } from '../../services/storageService';

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
  onLogout: () => void;
  isReadOnly?: boolean;
  onStartChat?: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onLogout, isReadOnly = false, onStartChat }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>(user);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [importCode, setImportCode] = useState('');

  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const postInputRef = useRef<HTMLInputElement>(null);

  const handleEnhanceBio = async () => {
    setIsEnhancing(true);
    const enhanced = await enhanceBio(editedUser.bio);
    const updated = { ...editedUser, bio: enhanced };
    setEditedUser(updated);
    setIsEnhancing(false);
  };

  const handleExport = () => {
    const code = storageService.exportDatabase();
    setSyncCode(code);
  };

  const handleImport = () => {
    if (storageService.importDatabase(importCode)) {
      alert("Database synced successfully! App will reload.");
      window.location.reload();
    } else {
      alert("Invalid sync code.");
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'post') => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const url = reader.result as string;
        const isVideo = file.type.startsWith('video');

        if (type === 'profile') {
          const newMedia = [...(editedUser.media || []), url];
          const newIsVideo = [...(editedUser.isVideo || editedUser.media?.map(() => false) || []), isVideo];
          const updated = { ...editedUser, media: newMedia, isVideo: newIsVideo };
          setEditedUser(updated);
          onUpdate(updated);
        } else if (type === 'post') {
          const newPost: Post = {
            id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            userId: user.id,
            type: 'standalone',
            media: [url],
            isVideo: [isVideo],
            likes: [],
            comments: [],
            timestamp: Date.now()
          };
          await storageService.createPost(newPost);
          alert("Share Successful! View it in the Global Feed.");
        }
        setIsUploading(false);
        // Clear input
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full bg-slate-950 overflow-y-auto no-scrollbar pb-24">
      <div className="relative h-[24rem]">
        {editedUser.media && editedUser.media.length > 0 ? (
          editedUser.isVideo?.[0] ? (
            <video src={editedUser.media[0]} className="w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : (
            <img src={editedUser.media[0]} className="w-full h-full object-cover" alt="Profile" />
          )
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center">
             <div className="text-center p-8">
                <svg className="w-12 h-12 text-slate-800 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                <span className="text-slate-700 font-black uppercase tracking-widest text-[10px]">No Primary Visual</span>
             </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        
        {isReadOnly ? (
          <div className="absolute bottom-10 right-8 z-20">
            <button 
              onClick={() => onStartChat && onStartChat(user)}
              className="px-8 py-5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all flex items-center space-x-3 border border-white/20 uppercase tracking-widest text-sm"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /></svg>
              <span>Instant Chat</span>
            </button>
          </div>
        ) : (
          <div className="absolute bottom-10 right-8 flex space-x-3 z-20">
             <button onClick={() => setShowSync(true)} className="p-5 bg-slate-800/80 backdrop-blur-xl rounded-full border border-white/10 text-white shadow-2xl active:scale-90 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></button>
             <button 
                onClick={() => postInputRef.current?.click()} 
                disabled={isUploading}
                className="p-5 bg-pink-500 rounded-full text-white shadow-2xl border border-white/10 active:scale-90 transition-all disabled:opacity-50" 
                title="Post to Global Feed"
              >
                {isUploading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
              </button>
             <input type="file" ref={postInputRef} onChange={(e) => handleMediaUpload(e, 'post')} className="hidden" accept="image/*,video/*" />
             <button onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)} className={`p-5 rounded-full shadow-2xl text-white transition-all active:scale-90 ${isEditing ? 'bg-emerald-500' : 'bg-slate-800'}`}>{isEditing ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}</button>
          </div>
        )}
      </div>

      <div className="px-6 -mt-20 relative z-10">
        <div className="bg-slate-900/95 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/5 shadow-2xl">
          {isEditing ? (
            <div className="space-y-4">
              <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-black" value={editedUser.name} onChange={(e) => setEditedUser({...editedUser, name: e.target.value})} />
              <textarea className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white min-h-[100px]" value={editedUser.bio} onChange={(e) => setEditedUser({...editedUser, bio: e.target.value})} />
              <div className="flex items-center justify-between">
                <button onClick={handleEnhanceBio} disabled={isEnhancing} className="text-[10px] text-pink-500 font-black uppercase tracking-widest">{isEnhancing ? 'Gemini Crafting...' : '✨ AI Enhance Bio'}</button>
                <button onClick={() => { onUpdate(editedUser); setIsEditing(false); }} className="px-6 py-3 bg-pink-500 rounded-xl font-bold uppercase tracking-widest text-[10px]">Save Changes</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-white tracking-tighter">{user.name}, {user.age}</h2>
                {user.preference && <span className="bg-pink-500/10 text-pink-500 border border-pink-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{user.preference}</span>}
              </div>
              <p className="mt-4 text-slate-400 text-sm leading-relaxed font-medium">{user.bio}</p>
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Cloud Connectivity</p>
                <div className="bg-slate-950 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                   <code className="text-[10px] text-emerald-400 font-mono">{user.id}</code>
                   <button 
                    onClick={() => { navigator.clipboard.writeText(user.id); alert("Cloud ID copied!"); }}
                    className="text-[10px] text-slate-500 hover:text-white uppercase font-black"
                   >
                    Copy ID
                   </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showSync && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-slate-900 w-full max-w-md rounded-[3rem] p-10 border border-white/5 space-y-8 shadow-3xl">
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-white tracking-tighter">Device Sync</h3>
                <button onClick={() => setShowSync(false)} className="text-slate-500 hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Your Identity String</p>
                <textarea readOnly value={syncCode} className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-5 text-[10px] font-mono text-pink-400 h-32 outline-none no-scrollbar" />
                <button onClick={handleExport} className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">Generate Transfer Code</button>
              </div>
              <div className="border-t border-white/5 pt-8 space-y-4">
                <textarea value={importCode} onChange={(e) => setImportCode(e.target.value)} placeholder="Paste identity string from another device..." className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-5 text-[10px] font-mono text-emerald-400 h-32 outline-none no-scrollbar" />
                <button onClick={handleImport} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">Complete Transfer</button>
              </div>
           </div>
        </div>
      )}

      <div className="px-6 mt-12 mb-8">
        <h3 className="text-xs font-black mb-6 text-slate-500 uppercase tracking-[0.3em]">Profile Gallery</h3>
        <div className="grid grid-cols-3 gap-3">
          {editedUser.media?.map((url, i) => (
            <div key={i} className={`aspect-[3/4] rounded-3xl overflow-hidden bg-slate-900 border ${i === 0 ? 'border-pink-500 ring-2 ring-pink-500/20 shadow-lg' : 'border-white/5'}`}>
              {editedUser.isVideo?.[i] ? <video src={url} className="w-full h-full object-cover" /> : <img src={url} className="w-full h-full object-cover" alt="" />}
            </div>
          ))}
          {!isReadOnly && (
            <button 
              onClick={() => profilePicInputRef.current?.click()}
              className="aspect-[3/4] rounded-3xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-700 hover:text-slate-500 hover:border-slate-600 transition-all"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          )}
          <input type="file" ref={profilePicInputRef} onChange={(e) => handleMediaUpload(e, 'profile')} className="hidden" accept="image/*,video/*" />
        </div>
      </div>

      {!isReadOnly && (
        <div className="px-6 mt-16">
          <button onClick={onLogout} className="w-full bg-slate-900 py-6 rounded-3xl font-black text-rose-500 border border-rose-500/10 text-[10px] uppercase tracking-[0.3em] active:scale-95 transition-all">Sign Out Permanently</button>
        </div>
      )}
    </div>
  );
};

export default Profile;
