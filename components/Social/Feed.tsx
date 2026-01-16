
import React, { useState, useEffect } from 'react';
import { Post, User, Comment } from '../../types';
import { storageService } from '../../services/storageService';

interface FeedProps {
  currentUser: User;
}

const Feed: React.FC<FeedProps> = ({ currentUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const refreshPosts = () => {
    setPosts(storageService.getAllPosts().sort((a, b) => b.timestamp - a.timestamp));
  };

  useEffect(() => {
    refreshPosts();
  }, []);

  const handleLike = (postId: string) => {
    storageService.likePost(postId, currentUser.id);
    refreshPosts();
  };

  const handleComment = (postId: string) => {
    if (!commentText.trim()) return;
    const comment: Comment = {
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      text: commentText,
      timestamp: Date.now()
    };
    storageService.commentOnPost(postId, comment);
    setCommentText('');
    setCommentingOn(null);
    refreshPosts();
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-900 no-scrollbar pb-24">
      {posts.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-500">
          <svg className="w-20 h-20 mb-4 opacity-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.535 5.357a1 1 0 011.414-.142 3.99 3.99 0 004.242 0 1 1 0 011.272 1.543 5.986 5.986 0 01-7.07 0 1 1 0 01-.142-1.414z" clipRule="evenodd" /></svg>
          <p className="text-lg font-bold text-slate-400">The feed is empty</p>
          <p className="text-sm mt-1">Be the first to post something spicy!</p>
        </div>
      ) : (
        <div className="space-y-4 pt-4">
          {posts.map(post => {
            const user = storageService.getUserById(post.userId);
            const isLiked = post.likes.includes(currentUser.id);
            
            return (
              <div key={post.id} className="bg-slate-800/50 border-y border-slate-800 animate-in fade-in duration-500">
                {/* Header */}
                <div className="p-4 flex items-center space-x-3">
                  <img src={user?.media[0]} className="w-10 h-10 rounded-full object-cover border border-slate-700" alt="" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">{user?.name}</h4>
                    <p className="text-[10px] text-slate-500">{new Date(post.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                {/* Media Content */}
                <div className="relative bg-black aspect-square">
                  {post.type === 'carousel' ? (
                     <div className="flex overflow-x-auto snap-x snap-mandatory h-full no-scrollbar">
                        {post.media.map((m, i) => (
                          <div key={i} className="flex-shrink-0 w-full h-full snap-center relative">
                             {post.isVideo[i] ? (
                               <video src={m} className="w-full h-full object-cover" autoPlay loop playsInline />
                             ) : (
                               <img src={m} className="w-full h-full object-cover" alt="" />
                             )}
                             <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white">
                                {i + 1} / {post.media.length}
                             </div>
                          </div>
                        ))}
                     </div>
                  ) : (
                    post.isVideo[0] ? (
                      <video src={post.media[0]} className="w-full h-full object-cover" autoPlay loop playsInline />
                    ) : (
                      <img src={post.media[0]} className="w-full h-full object-cover" alt="" />
                    )
                  )}
                </div>

                {/* Actions */}
                <div className="p-4">
                   <div className="flex items-center space-x-6 mb-4">
                      <button 
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center space-x-2 transition-colors ${isLiked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-400'}`}
                      >
                         <svg className={`w-7 h-7 ${isLiked ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                         <span className="font-bold text-sm">{post.likes.length}</span>
                      </button>
                      <button 
                        onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                        className="flex items-center space-x-2 text-slate-400 hover:text-blue-400 transition-colors"
                      >
                         <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                         <span className="font-bold text-sm">{post.comments.length}</span>
                      </button>
                   </div>

                   {/* Comments View */}
                   {post.comments.length > 0 && (
                     <div className="space-y-3 mb-4">
                        {post.comments.slice(-3).map(c => (
                          <div key={c.id} className="text-xs">
                             <span className="font-bold text-pink-400 mr-2">{c.userName}</span>
                             <span className="text-slate-300">{c.text}</span>
                          </div>
                        ))}
                        {post.comments.length > 3 && <button className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">View all {post.comments.length} comments</button>}
                     </div>
                   )}

                   {/* Add Comment Input */}
                   {commentingOn === post.id && (
                     <div className="flex items-center space-x-2 animate-in slide-in-from-top-2 duration-200">
                        <input 
                          type="text" 
                          placeholder="Add a comment..." 
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-pink-500 text-white"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                        />
                        <button 
                          onClick={() => handleComment(post.id)}
                          className="text-pink-500 font-bold text-sm px-2"
                        >
                          Post
                        </button>
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
