
export type HookupPreference = 'Right Now' | 'Tonight' | 'FWB' | 'Discrete' | 'Short Term';

export interface User {
  id: string;
  name: string;
  age: number;
  bio: string;
  media: string[];
  isVideo?: boolean[];
  distance?: string;
  location?: string;
  preference?: HookupPreference;
  isVerified?: boolean;
  // Added lastSeen to track user activity in the global cloud registry
  lastSeen?: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface Post {
  id: string;
  userId: string;
  type: 'standalone' | 'carousel';
  media: string[];
  isVideo: boolean[];
  likes: string[];
  comments: Comment[];
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  media?: string;
  mediaType?: 'image' | 'video';
  timestamp: number;
}

export interface Chat {
  id: string;
  name?: string;
  participants: string[];
  messages: Message[];
  isGroup: boolean;
}

export type AppTab = 'discovery' | 'feed' | 'chats' | 'profile';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
