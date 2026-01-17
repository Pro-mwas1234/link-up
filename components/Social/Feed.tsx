
import React, { useState, useEffect, useRef } from 'react';
import { Post, User, Comment } from '../../types';
import { storageService } from '../../services/storageService';
import { cloudService } from '../../services/cloudService';

interface FeedProps {
  currentUser: User;
}

const Feed: React.FC<FeedProps> = ({ currentUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const postInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    setIsLoading(true);
    const cloudPosts = await cloudService.fetchGlobalPosts();
    setPosts(cloudPosts);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    const handleNewPost = (newPost: Post) => {
      setPosts(prev => [newPost, ...prev.filter(p => p.id !== newPost.id)]);
    };
    cloudService.onNewPost(handleNewPost);
  }, []);

  const handleLike = (postId: string) => {
    storageService.likePost(postId, currentUser.id);
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const liked = p.likes.includes(currentUser.id);
        return { ...p, likes: liked ? p.likes.filter(id => id !== currentUser.id) : [...p.likes, currentUser.id] };
      }
      return p;
    }));
  };

  const handleComment = (postId: string) => {
    if (!commentText.trim()) return;
    const comment: Comment = {
      id: `c_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      text: commentText,
      timestamp: Date.now()
    };
    storageService.commentOnPost(postId, comment);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p));
    setCommentText('');
    setCommentingOn(null);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const url = reader.result as string;
        const isVideo = file.type.startsWith('video');

        const newPost: Post = {
          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          userId: currentUser.id,
          type: 'standalone',
          media: [url],
          isVideo: [isVideo],
          likes: [],
          comments: [],
          timestamp: Date.now()
        };
        
        await storageService.createPost(newPost);
        setShowCreateModal(false);
        setIsUploading(false);
        fetchPosts(); // Refresh feed
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading && posts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 bg-slate-950">
        <div className="w-10 h-10 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Scanning Global Pulse...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 no-scrollbar pb-24 relative">
      <div className="sticky top-0 z-20 p-4 bg-slate-950/80 backdrop-blur-xl flex justify-between items-center border-b border-white/5">
        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">World Pulse</h2>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="p-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl shadow-lg shadow-pink-500/20 text-white active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-white/10 shadow-3xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-white tracking-tighter">New Media Post</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <p className="text-xs text-slate-400">Share what's happening right now with the global LinkUp network.</p>
            
            <button 
              onClick={() => postInputRef.current?.click()}
              disabled={isUploading}
              className="w-full aspect-video border-2 border-dashed border-slate-700 rounded-3xl flex flex-col items-center justify-center space-y-3 hover:border-pink-500/50 hover:bg-slate-800/50 transition-all text-slate-500"
            >
              {isUploading ? (
                <div className="w-8 h-8 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest">Select Image or Video</span>
                </>
              )}
            </button>
            <input type="file" ref={postInputRef} onChange={handleMediaUpload} className="hidden" accept="image/*,video/*" />
            
            <p className="text-[10px] text-center text-slate-600 uppercase font-bold">Posts are visible to all online users instantly</p>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center p-12 text-center text-slate-500">
          <svg className="w-20 h-20 mb-4 opacity-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.535 5.357a1 1 0 011.414-.142 3.99 3.99 0 004.242 0 1 1 0 011.272 1.543 5.986 5.986 0 01-7.07 0 1 1 0 01-.142-1.414z" clipRule="evenodd" /></svg>
          <p className="text-lg font-black text-slate-400">Silence is boring.</p>
          <p className="text-xs mt-1">Be the first to heat up the global pulse!</p>
          <button onClick={() => setShowCreateModal(true)} className="mt-6 px-10 py-4 bg-pink-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-pink-500/20">Post Media Now</button>
        </div>
      ) : (
        <div className="space-y-6 pt-4">
          {posts.map(post => {
            const user = storageService.getUserById(post.userId);
            const isLiked = post.likes.includes(currentUser.id);
            
            return (
              <div key={post.id} className="bg-slate-900 border-y border-white/5 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img src={user?.media[0] || 'https://ui-avatars.com/api/?name=User'} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{user?.name || 'Anonymous'}</h4>
                      <p className="text-[9px] text-slate-500 uppercase font-black">{new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  {user && user.id !== currentUser.id && (
                    <button className="text-[9px] text-pink-500 font-black uppercase tracking-widest px-3 py-1 border border-pink-500/20 rounded-full">View Profile</button>
                  )}
                </div>

                <div className="relative bg-black aspect-square md:aspect-video lg:aspect-square">
                  {post.isVideo[0] ? (
                    <video src={post.media[0]} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                  ) : (
                    <img src={post.media[0]} className="w-full h-full object-cover" alt="" />
                  )}
                </div>

                <div className="p-4">
                   <div className="flex items-center space-x-6 mb-3">
                      <button onClick={() => handleLike(post.id)} className={`flex items-center space-x-2 ${isLiked ? 'text-pink-500' : 'text-slate-400'} transition-colors`}>
                         <svg className={`w-7 h-7 ${isLiked ? 'fill-current' : ''}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                         <span className="font-black text-sm">{post.likes.length}</span>
                      </button>
                      <button onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)} className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors">
                         <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                         <span className="font-black text-sm">{post.comments.length}</span>
                      </button>
                   </div>

                   {post.comments.length > 0 && (
                     <div className="space-y-1 mb-3">
                        {post.comments.slice(-3).map(c => (
                          <div key={c.id} className="text-xs">
                             <span className="font-black text-pink-500 mr-2">{c.userName}</span>
                             <span className="text-slate-400">{c.text}</span>
                          </div>
                        ))}
                        {post.comments.length > 3 && (
                          <button className="text-[10px] text-slate-600 font-black uppercase mt-1">View all {post.comments.length} comments</button>
                        )}
                     </div>
                   )}

                   <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="Add comment..." 
                        className="flex-1 bg-slate-800 border-none rounded-full px-4 py-2 text-xs outline-none text-white focus:ring-1 focus:ring-pink-500/50" 
                        value={commentingOn === post.id ? commentText : ''} 
                        onFocus={() => setCommentingOn(post.id)}
                        onChange={(e) => setCommentText(e.target.value)} 
                        onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)} 
                      />
                      {commentingOn === post.id && (
                        <button onClick={() => handleComment(post.id)} className="text-pink-500 font-black text-[10px] uppercase tracking-widest px-2">Send</button>
                      )}
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Feed;
