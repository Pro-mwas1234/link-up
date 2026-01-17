
import React, { useState, useEffect } from 'react';
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

  const fetchPosts = async () => {
    setIsLoading(true);
    const cloudPosts = await cloudService.fetchGlobalPosts();
    setPosts(cloudPosts);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    // Listen for real-time broadcasts
    cloudService.onNewPost((newPost) => {
      setPosts(prev => [newPost, ...prev.filter(p => p.id !== newPost.id)]);
    });
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

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 bg-slate-950">
        <div className="w-10 h-10 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Syncing Global Feed...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 no-scrollbar pb-24">
      {posts.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-500">
          <svg className="w-20 h-20 mb-4 opacity-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.535 5.357a1 1 0 011.414-.142 3.99 3.99 0 004.242 0 1 1 0 011.272 1.543 5.986 5.986 0 01-7.07 0 1 1 0 01-.142-1.414z" clipRule="evenodd" /></svg>
          <p className="text-lg font-black text-slate-400">Empty Vibes.</p>
          <p className="text-xs mt-1">Post from your profile to see yourself here!</p>
          <button onClick={fetchPosts} className="mt-6 px-6 py-2 bg-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest border border-pink-500/20">Refresh</button>
        </div>
      ) : (
        <div className="space-y-6 pt-4">
          {posts.map(post => {
            const user = storageService.getUserById(post.userId);
            const isLiked = post.likes.includes(currentUser.id);
            
            return (
              <div key={post.id} className="bg-slate-900 border-y border-white/5">
                <div className="p-4 flex items-center space-x-3">
                  <div className="relative">
                    <img src={user?.media[0] || 'https://ui-avatars.com/api/?name=User'} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">{user?.name || 'Anonymous'}</h4>
                    <p className="text-[9px] text-slate-500 uppercase font-black">{new Date(post.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="relative bg-black aspect-square">
                  {post.isVideo[0] ? (
                    <video src={post.media[0]} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                  ) : (
                    <img src={post.media[0]} className="w-full h-full object-cover" alt="" />
                  )}
                </div>

                <div className="p-4">
                   <div className="flex items-center space-x-6 mb-3">
                      <button onClick={() => handleLike(post.id)} className={`flex items-center space-x-2 ${isLiked ? 'text-pink-500' : 'text-slate-400'}`}>
                         <svg className={`w-7 h-7 ${isLiked ? 'fill-current' : ''}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                         <span className="font-black text-sm">{post.likes.length}</span>
                      </button>
                      <button onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)} className="flex items-center space-x-2 text-slate-400">
                         <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                         <span className="font-black text-sm">{post.comments.length}</span>
                      </button>
                   </div>

                   {post.comments.length > 0 && (
                     <div className="space-y-1 mb-3">
                        {post.comments.slice(-2).map(c => (
                          <div key={c.id} className="text-xs">
                             <span className="font-black text-pink-500 mr-2">{c.userName}</span>
                             <span className="text-slate-400">{c.text}</span>
                          </div>
                        ))}
                     </div>
                   )}

                   {commentingOn === post.id && (
                     <div className="flex items-center space-x-2">
                        <input type="text" placeholder="Add comment..." className="flex-1 bg-slate-800 border-none rounded-full px-4 py-2 text-sm outline-none text-white" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)} />
                        <button onClick={() => handleComment(post.id)} className="text-pink-500 font-black text-xs uppercase">Send</button>
                     </div>
                   )}
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
