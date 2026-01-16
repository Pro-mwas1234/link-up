
import React, { useState, useRef, useEffect } from 'react';
import { User, Post, Comment } from '../../types';
import { enhanceBio } from '../../services/geminiService';
import { storageService } from '../../services/storageService';

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
  onLogout: () => void;
  isReadOnly?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onLogout, isReadOnly = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>(user);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostType, setNewPostType] = useState<'standalone' | 'carousel'>('standalone');
  const [tempPostMedia, setTempPostMedia] = useState<{url: string, isVideo: boolean}[]>([]);
  
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

  const handleProfileMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const isVideo = file.type.startsWith('video');
        const newMedia = [...editedUser.media, reader.result as string];
        const newIsVideo = [...(editedUser.isVideo || editedUser.media.map(() => false)), isVideo];
        const updated = { ...editedUser, media: newMedia, isVideo: newIsVideo };
        setEditedUser(updated);
        if (onUpdate) onUpdate(updated);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePicDirectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const isVideo = file.type.startsWith('video');
        const newMedia = [reader.result as string, ...editedUser.media];
        const newIsVideo = [isVideo, ...(editedUser.isVideo || editedUser.media.map(() => false))];
        const updated = { ...editedUser, media: newMedia, isVideo: newIsVideo };
        setEditedUser(updated);
        if (onUpdate) onUpdate(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const isVideo = file.type.startsWith('video');
        setTempPostMedia(prev => [...prev, { url: reader.result as string, isVideo }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const createPost = () => {
    if (tempPostMedia.length === 0) return;
    
    const newPost: Post = {
      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: user.id,
      type: newPostType,
      media: tempPostMedia.map(m => m.url),
      isVideo: tempPostMedia.map(m => m.isVideo),
      likes: [],
      comments: [],
      timestamp: Date.now()
    };

    storageService.createPost(newPost);
    setTempPostMedia([]);
    setShowCreatePost(false);
    setPosts(storageService.getPostsByUser(user.id));
  };

  const handleDeletePost = (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      storageService.deletePost(postId);
      setPosts(storageService.getPostsByUser(user.id));
    }
  };

  const handleSetProfilePic = (index: number) => {
    const newMedia = [...editedUser.media];
    const newIsVideo = [...(editedUser.isVideo || editedUser.media.map(() => false))];

    // Move the selected media to the front
    const [targetMedia] = newMedia.splice(index, 1);
    const [targetIsVideo] = newIsVideo.splice(index, 1);

    newMedia.unshift(targetMedia);
    newIsVideo.unshift(targetIsVideo);

    const updated = { ...editedUser, media: newMedia, isVideo: newIsVideo };
    setEditedUser(updated);
    if (onUpdate) onUpdate(updated);
  };

  const saveProfile = () => {
    if (onUpdate) onUpdate(editedUser);
    setIsEditing(false);
  };

  const removeProfileMedia = (index: number) => {
    if (window.confirm('Delete this from your gallery?')) {
      const newMedia = editedUser.media.filter((_, idx) => idx !== index);
      const newIsVideo = (editedUser.isVideo || []).filter((_, idx) => idx !== index);
      const updated = { ...editedUser, media: newMedia, isVideo: newIsVideo };
      setEditedUser(updated);
      if (onUpdate) onUpdate(updated);
    }
  };

  return (
    <div className="h-full bg-slate-900 overflow-y-auto no-scrollbar pb-24">
      {/* Header Info */}
      <div className="relative h-80">
        {editedUser.media && editedUser.media.length > 0 ? (
          editedUser.isVideo?.[0] ? (
            <video src={editedUser.media[0]} className="w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : (
            <img src={editedUser.media[0]} className="w-full h-full object-cover" alt="Profile" />
          )
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <span className="text-slate-600 font-bold uppercase tracking-widest">No Profile Photo</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        
        {!isReadOnly && (
          <div className="absolute bottom-6 right-6 flex space-x-2 z-20">
            <button 
              onClick={() => profilePicInputRef.current?.click()}
              className="p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white active:scale-95 transition-all shadow-xl"
              title="Change Profile Photo"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input type="file" ref={profilePicInputRef} onChange={handleProfilePicDirectUpload} className="hidden" accept="image/*,video/*" />
            
            <button 
              onClick={() => isEditing ? saveProfile() : setIsEditing(true)}
              className={`p-4 rounded-full shadow-2xl text-white active:scale-95 transition-all ${isEditing ? 'bg-emerald-500 ring-4 ring-emerald-500/30' : 'bg-pink-500 ring-4 ring-pink-500/30'}`}
              title={isEditing ? "Save Profile" : "Edit Bio/Name"}
            >
              {isEditing ? (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="px-6 -mt-12 relative z-10">
        <div className="bg-slate-800/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-700 shadow-2xl">
          {isEditing ? (
            <div className="space-y-4">
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none text-white font-medium"
                value={editedUser.name}
                onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
              />
              <textarea 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none text-white min-h-[100px] text-sm"
                value={editedUser.bio}
                onChange={(e) => setEditedUser({...editedUser, bio: e.target.value})}
              />
              <button onClick={handleEnhanceBio} disabled={isEnhancing} className="text-xs text-pink-400 font-bold flex items-center">
                {isEnhancing ? 'Gemini AI is crafting...' : '✨ Enhance Bio with AI'}
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-extrabold flex items-center text-white">
                {user.name}, {user.age}
                <svg className="w-5 h-5 ml-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
              </h2>
              <p className="mt-2 text-slate-300 text-sm leading-relaxed">{user.bio}</p>
            </>
          )}
        </div>
      </div>

      {/* Gallery Section */}
      <div className="px-6 mt-8">
        <h3 className="text-lg font-bold mb-4 flex justify-between items-center text-slate-100">
          {isReadOnly ? `${user.name}'s Gallery` : 'My Gallery'}
          {!isReadOnly && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-xs bg-slate-800 px-4 py-2 rounded-full text-pink-500 border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center font-bold"
            >
              {isUploading ? (
                <span className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mr-2"></span>
              ) : null}
              Add Media +
            </button>
          )}
        </h3>
        {!isReadOnly && <input type="file" ref={fileInputRef} onChange={handleProfileMediaUpload} className="hidden" accept="image/*,video/*" />}
        
        <div className="grid grid-cols-3 gap-3">
          {editedUser.media && editedUser.media.map((url, i) => (
            <div key={i} className={`aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 relative group border ${i === 0 ? 'border-pink-500 ring-2 ring-pink-500/20 shadow-pink-500/10 shadow-lg' : 'border-slate-700/50'} shadow-inner`}>
              {editedUser.isVideo?.[i] ? (
                <video src={url} className="w-full h-full object-cover" />
              ) : (
                <img src={url} alt={`Media ${i}`} className="w-full h-full object-cover" />
              )}
              
              {!isReadOnly && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center space-y-2 p-1">
                   {i !== 0 && (
                     <button 
                        onClick={() => handleSetProfilePic(i)}
                        className="w-full py-1.5 bg-pink-500 text-white rounded-lg text-[8px] font-extrabold uppercase tracking-widest active:scale-95 shadow-lg"
                      >
                        Set Primary
                      </button>
                   )}
                   <button 
                    onClick={() => removeProfileMedia(i)}
                    className="w-full py-1.5 bg-rose-600/80 text-white rounded-lg text-[8px] font-extrabold uppercase tracking-widest active:scale-95 shadow-lg"
                  >
                    Delete
                  </button>
                </div>
              )}

              {i === 0 && (
                <div className="absolute top-1 left-1 bg-pink-500 text-white p-1 rounded-full shadow-lg">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Posts Section */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">My Posts</h3>
          {!isReadOnly && (
            <button 
              onClick={() => setShowCreatePost(true)}
              className="bg-pink-500 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg shadow-pink-500/20 active:scale-95"
            >
              New Post +
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {posts.map(post => (
            <div key={post.id} className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-800 bg-slate-800 shadow-xl">
              {post.isVideo[0] ? (
                <video src={post.media[0]} className="w-full h-full object-cover" />
              ) : (
                <img src={post.media[0]} className="w-full h-full object-cover" alt="Post" />
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                <div className="flex items-center text-white">
                   <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
                   <span className="font-bold">{post.likes.length}</span>
                </div>
                {!isReadOnly && (
                  <button 
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 bg-rose-600 text-white rounded-full hover:bg-rose-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>

              {post.type === 'carousel' && (
                <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md p-1.5 rounded-lg">
                   <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </div>
              )}
            </div>
          ))}
          
          {posts.length === 0 && (
            <div className="col-span-2 py-12 flex flex-col items-center justify-center bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-700 text-slate-500">
               <p className="text-sm font-medium">No posts yet</p>
            </div>
          )}
        </div>

        {!isReadOnly && (
          <div className="mt-12">
            <button 
              onClick={onLogout}
              className="w-full bg-slate-800/40 hover:bg-rose-500/10 py-4 rounded-2xl font-bold text-rose-500 border border-rose-500/10 transition-all text-sm uppercase tracking-widest"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">New Post</h3>
              <button onClick={() => setShowCreatePost(false)} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex space-x-2 mb-6">
              <button 
                onClick={() => { setNewPostType('standalone'); setTempPostMedia(prev => prev.slice(0, 1)); }}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${newPostType === 'standalone' ? 'bg-pink-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}
              >
                Standalone
              </button>
              <button 
                onClick={() => setNewPostType('carousel')}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${newPostType === 'carousel' ? 'bg-pink-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}
              >
                Slide Pic
              </button>
            </div>

            <div 
              onClick={() => postFileInputRef.current?.click()}
              className="aspect-video rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50 transition-all overflow-hidden"
            >
              {tempPostMedia.length > 0 ? (
                <div className="grid grid-cols-2 w-full h-full gap-1">
                   {tempPostMedia.slice(0, 4).map((m, i) => (
                     <div key={i} className="relative">
                        {m.isVideo ? <video src={m.url} className="w-full h-full object-cover" /> : <img src={m.url} className="w-full h-full object-cover" />}
                     </div>
                   ))}
                   {tempPostMedia.length > 4 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold">+{tempPostMedia.length - 4}</div>}
                </div>
              ) : (
                <>
                  <svg className="w-12 h-12 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Media</p>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={postFileInputRef} 
              multiple={newPostType === 'carousel'} 
              onChange={handlePostMediaUpload} 
              className="hidden" 
              accept="image/*,video/*" 
            />

            <button 
              onClick={createPost}
              disabled={tempPostMedia.length === 0}
              className="w-full mt-6 bg-gradient-to-r from-pink-500 to-rose-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-pink-500/20 disabled:opacity-50 active:scale-95 transition-all"
            >
              Post it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
