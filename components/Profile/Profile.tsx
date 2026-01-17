
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
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostType, setNewPostType] = useState<'standalone' | 'carousel'>('standalone');
  const [tempPostMedia, setTempPostMedia] = useState<{url: string, isVideo: boolean}[]>([]);
  
  // Device Sync State
  const [showSync, setShowSync] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [importCode, setImportCode] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPosts(storageService.getPostsByUser(user.id));
  }, [user.id, showCreatePost]);

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

  const handleProfileMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const isVideo = file.type.startsWith('video');
        const newMedia = [...(editedUser.media || []), reader.result as string];
        const newIsVideo = [...(editedUser.isVideo || editedUser.media?.map(() => false) || []), isVideo];
        const updated = { ...editedUser, media: newMedia, isVideo: newIsVideo };
        setEditedUser(updated);
        if (onUpdate) onUpdate(updated);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = () => {
    if (onUpdate) onUpdate(editedUser);
    setIsEditing(false);
  };

  const handleSetProfilePic = (index: number) => {
    const newMedia = [...editedUser.media];
    const newIsVideo = [...(editedUser.isVideo || editedUser.media.map(() => false))];
    const [targetMedia] = newMedia.splice(index, 1);
    const [targetIsVideo] = newIsVideo.splice(index, 1);
    newMedia.unshift(targetMedia);
    newIsVideo.unshift(targetIsVideo);
    const updated = { ...editedUser, media: newMedia, isVideo: newIsVideo };
    setEditedUser(updated);
    if (onUpdate) onUpdate(updated);
  };

  return (
    <div className="h-full bg-slate-950 overflow-y-auto no-scrollbar pb-24">
      {/* Header Info */}
      <div className="relative h-[24rem]">
        {editedUser.media && editedUser.media.length > 0 ? (
          editedUser.isVideo?.[0] ? (
            <video src={editedUser.media[0]} className="w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : (
            <img src={editedUser.media[0]} className="w-full h-full object-cover" alt="Profile" />
          )
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center">
            <span className="text-slate-700 font-black uppercase tracking-[0.2em] text-xs">No Visuals</span>
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
              <span>Connect Now</span>
            </button>
          </div>
        ) : (
          <div className="absolute bottom-10 right-8 flex space-x-3 z-20">
             <button 
              onClick={() => setShowSync(true)}
              className="p-5 bg-slate-800/80 backdrop-blur-xl rounded-full border border-white/10 text-white active:scale-95 shadow-2xl"
              title="Sync to other device"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </button>
            <button 
              onClick={() => profilePicInputRef.current?.click()}
              className="p-5 bg-slate-800/80 backdrop-blur-xl rounded-full border border-white/10 text-white active:scale-95 shadow-2xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
            </button>
            <input type="file" ref={profilePicInputRef} onChange={(e) => {/* same as media upload but unshift */}} className="hidden" accept="image/*,video/*" />
            <button 
              onClick={() => isEditing ? saveProfile() : setIsEditing(true)}
              className={`p-5 rounded-full shadow-2xl text-white active:scale-95 transition-all ${isEditing ? 'bg-emerald-500' : 'bg-pink-500'}`}
            >
              {isEditing ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
            </button>
          </div>
        )}
      </div>

      <div className="px-6 -mt-20 relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          {isEditing ? (
            <div className="space-y-4">
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-pink-500 outline-none text-white font-black text-xl"
                value={editedUser.name}
                onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
              />
              <textarea 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-pink-500 outline-none text-white min-h-[120px] text-sm leading-relaxed"
                value={editedUser.bio}
                onChange={(e) => setEditedUser({...editedUser, bio: e.target.value})}
              />
              <button onClick={handleEnhanceBio} disabled={isEnhancing} className="text-xs text-pink-500 font-black uppercase tracking-widest flex items-center">
                {isEnhancing ? 'Gemini Crafting...' : '✨ AI Enhance Bio'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black flex items-center text-white tracking-tighter">
                  {user.name}, {user.age}
                  {user.isVerified && <svg className="w-6 h-6 ml-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>}
                </h2>
                {user.preference && (
                  <span className="bg-pink-500/10 text-pink-500 border border-pink-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{user.preference}</span>
                )}
              </div>
              <p className="mt-4 text-slate-400 text-sm leading-relaxed font-medium">{user.bio}</p>
            </>
          )}
        </div>
      </div>

      {/* Device Sync Modal */}
      {showSync && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
           <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 border border-white/5 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">Device Sync</h3>
                <button onClick={() => setShowSync(false)} className="text-slate-500 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Sync Code</p>
                <div className="relative">
                  <textarea 
                    readOnly 
                    value={syncCode} 
                    placeholder="Click Generate to get your code"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[10px] font-mono text-pink-400 break-all h-24 focus:ring-0 outline-none"
                  />
                  <button 
                    onClick={handleExport}
                    className="absolute bottom-2 right-2 bg-pink-500 text-white p-2 rounded-xl text-[10px] font-bold"
                  >
                    Generate Code
                  </button>
                </div>
                <p className="text-[10px] text-slate-600">Copy this code to your other device to transfer all chats and profile data.</p>
              </div>

              <div className="border-t border-white/5 pt-6 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Import Sync Code</p>
                <textarea 
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  placeholder="Paste sync code here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[10px] font-mono text-emerald-400 break-all h-24 outline-none"
                />
                <button 
                  onClick={handleImport}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Confirm Sync
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Gallery Section */}
      <div className="px-6 mt-10">
        <h3 className="text-lg font-black mb-4 flex justify-between items-center text-slate-100 uppercase tracking-widest">
          Gallery
          {!isReadOnly && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-[10px] bg-slate-900 px-4 py-2 rounded-full text-pink-500 border border-white/5 hover:bg-slate-800 transition-colors font-black uppercase tracking-widest"
            >
              Add Media +
            </button>
          )}
        </h3>
        <input type="file" ref={fileInputRef} onChange={handleProfileMediaUpload} className="hidden" accept="image/*,video/*" />
        
        <div className="grid grid-cols-3 gap-3">
          {editedUser.media?.map((url, i) => (
            <div key={i} className={`aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 relative group border ${i === 0 ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-white/5'}`}>
              {editedUser.isVideo?.[i] ? (
                <video src={url} className="w-full h-full object-cover" />
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
              )}
              {!isReadOnly && i !== 0 && (
                <button 
                  onClick={() => handleSetProfilePic(i)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-[8px] text-white font-black uppercase tracking-widest"
                >
                  Set Primary
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {!isReadOnly && (
        <div className="px-6 mt-12">
          <button 
            onClick={onLogout}
            className="w-full bg-slate-900 py-5 rounded-2xl font-black text-rose-500 border border-rose-500/10 transition-all text-xs uppercase tracking-[0.2em]"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
