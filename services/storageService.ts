
import { User, Chat, Message, Post, Comment } from '../types';
import { cloudService } from './cloudService';

const USERS_KEY = 'linkup_db_users';
const CHATS_KEY = 'linkup_db_chats_global';
const POSTS_KEY = 'linkup_db_posts_global';

export interface RegisteredUserRecord {
  email: string;
  password?: string;
  user: User;
}

export const storageService = {
  // --- INITIALIZATION ---
  init(): void {
    const existing = localStorage.getItem(USERS_KEY);
    if (!existing) {
      localStorage.setItem(USERS_KEY, JSON.stringify([]));
    }
  },

  // --- USER OPERATIONS ---
  registerUser(email: string, password: string, user: User): void {
    const users = this.getAllUsers();
    // Only register if not already present
    if (!users.some(u => u.email === email)) {
      users.push({ email, password, user });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  // New: Cache a user found in the cloud so the app knows who they are in chats/feeds
  cacheCloudUser(user: User): void {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.user.id === user.id);
    if (index === -1) {
      users.push({ email: `cloud_${user.id}@linkup.io`, user });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else {
      users[index].user = user;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  getAllUsers(): RegisteredUserRecord[] {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Fix: Added missing getDiscoveryUsers method to resolve error in ChatList.tsx
  getDiscoveryUsers(excludeUserId: string): User[] {
    return this.getAllUsers()
      .map(record => record.user)
      .filter(user => user.id !== excludeUserId);
  },

  getUserById(userId: string): User | null {
    const users = this.getAllUsers();
    const record = users.find(u => u.user.id === userId);
    return record ? record.user : null;
  },

  authenticate(email: string, password: string): User | null {
    const users = this.getAllUsers();
    const record = users.find(u => u.email === email && u.password === password);
    return record ? record.user : null;
  },

  updateUserProfile(userId: string, updatedUser: User): void {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.user.id === userId);
    if (index !== -1) {
      users[index].user = updatedUser;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  // Fix: Added missing exportDatabase method to resolve error in Profile.tsx
  exportDatabase(): string {
    const data = {
      users: localStorage.getItem(USERS_KEY) || '[]',
      chats: localStorage.getItem(CHATS_KEY) || '[]',
      posts: localStorage.getItem(POSTS_KEY) || '[]'
    };
    return btoa(JSON.stringify(data));
  },

  // Fix: Added missing importDatabase method to resolve error in Profile.tsx
  importDatabase(code: string): boolean {
    try {
      const data = JSON.parse(atob(code));
      if (data.users) localStorage.setItem(USERS_KEY, data.users);
      if (data.chats) localStorage.setItem(CHATS_KEY, data.chats);
      if (data.posts) localStorage.setItem(POSTS_KEY, data.posts);
      return true;
    } catch (e) {
      console.error("Database import failed", e);
      return false;
    }
  },

  // --- CHAT OPERATIONS ---
  getAllChats(): Chat[] {
    const data = localStorage.getItem(CHATS_KEY);
    return data ? JSON.parse(data) : [];
  },

  getChatsForUser(userId: string): Chat[] {
    return this.getAllChats().filter(chat => chat.participants.includes(userId));
  },

  saveMessage(chatId: string, message: Message): void {
    const chats = this.getAllChats();
    const chatIndex = chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      if (!chats[chatIndex].messages.some(m => m.id === message.id)) {
        chats[chatIndex].messages.push(message);
        localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
      }
    }
  },

  createChat(chat: Chat): void {
    const chats = this.getAllChats();
    if (!chat.isGroup) {
      const existing = chats.find(c => 
        !c.isGroup && 
        c.participants.length === chat.participants.length &&
        c.participants.every(p => chat.participants.includes(p))
      );
      if (existing) return;
    }
    chats.push(chat);
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  },

  // --- POST OPERATIONS ---
  getAllPosts(): Post[] {
    const data = localStorage.getItem(POSTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async createPost(post: Post): Promise<void> {
    const posts = this.getAllPosts();
    posts.unshift(post);
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    // Crucial: Publish to global cloud relay
    await cloudService.publishPost(post);
  },

  likePost(postId: string, userId: string): void {
    const posts = this.getAllPosts();
    const index = posts.findIndex(p => p.id === postId);
    if (index !== -1) {
      if (!posts[index].likes.includes(userId)) {
        posts[index].likes.push(userId);
      } else {
        posts[index].likes = posts[index].likes.filter(id => id !== userId);
      }
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    }
  },

  commentOnPost(postId: string, comment: Comment): void {
    const posts = this.getAllPosts();
    const index = posts.findIndex(p => p.id === postId);
    if (index !== -1) {
      posts[index].comments.push(comment);
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    }
  }
};
