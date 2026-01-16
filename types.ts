
export interface User {
  id: string;
  name: string;
  age: number;
  bio: string;
  media: string[]; // Still used for profile photos
  isVideo?: boolean[];
  distance?: string;
  location?: string;
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
  likes: string[]; // Array of userIds who liked
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
