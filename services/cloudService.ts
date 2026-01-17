
import { User, Message, Chat, Post } from '../types';

declare const Peer: any;

// Public JSON relay endpoints (No API key required for these demo-friendly endpoints)
// We use these to simulate a shared database across all users globally.
const REGISTRY_BLOB_URL = 'https://jsonblob.com/api/jsonBlob/1344238541998596096';
const FEED_BLOB_URL = 'https://jsonblob.com/api/jsonBlob/1344238714132832256';

export class CloudService {
  private peer: any = null;
  private connections: Map<string, any> = new Map();
  private onMessageCallback: ((chatId: string, msg: Message) => void) | null = null;
  private onTypingCallback: ((chatId: string, userId: string, isTyping: boolean) => void) | null = null;
  private onNewPostCallback: ((post: Post) => void) | null = null;

  async init(userId: string) {
    if (this.peer) return;
    
    // Initialize PeerJS for real-time device-to-device communication
    this.peer = new Peer(`linkup-p2p-${userId}`, {
      debug: 1,
      config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
    });

    this.peer.on('connection', (conn: any) => {
      this.setupConnection(conn);
    });

    // Periodically update the registry to show we are "Live"
    setInterval(() => {
      const savedUser = localStorage.getItem('linkup_session_userid');
      if (savedUser) {
        const user = JSON.parse(localStorage.getItem('linkup_db_users') || '[]')
          .find((u: any) => u.user.id === savedUser)?.user;
        if (user) this.publishProfile(user);
      }
    }, 30000); // Pulse every 30s
  }

  private setupConnection(conn: any) {
    const otherUserId = conn.peer.replace('linkup-p2p-', '');
    
    conn.on('open', () => {
      this.connections.set(otherUserId, conn);
      console.log(`Connected to peer: ${otherUserId}`);
    });

    conn.on('data', (data: any) => {
      if (data.type === 'MESSAGE' && this.onMessageCallback) {
        this.onMessageCallback(data.chatId, data.message);
      } else if (data.type === 'TYPING' && this.onTypingCallback) {
        this.onTypingCallback(data.chatId, data.userId, data.isTyping);
      } else if (data.type === 'NEW_POST' && this.onNewPostCallback) {
        this.onNewPostCallback(data.post);
      }
    });

    conn.on('close', () => {
      this.connections.delete(otherUserId);
    });

    conn.on('error', () => {
      this.connections.delete(otherUserId);
    });
  }

  async connectToPeer(userId: string) {
    if (this.connections.has(userId)) return;
    try {
      const conn = this.peer.connect(`linkup-p2p-${userId}`);
      this.setupConnection(conn);
    } catch (e) {
      console.error("Peer connection failed", e);
    }
  }

  sendMessage(targetUserId: string, chatId: string, message: Message) {
    const conn = this.connections.get(targetUserId);
    if (conn && conn.open) {
      conn.send({ type: 'MESSAGE', chatId, message });
    } else {
      // If peer not directly connected, they'll see it on next sync from local storage sync
      // (In a real app, this would use a persistent message queue)
      this.connectToPeer(targetUserId).then(() => {
        const retryConn = this.connections.get(targetUserId);
        if (retryConn && retryConn.open) retryConn.send({ type: 'MESSAGE', chatId, message });
      });
    }
  }

  sendTypingStatus(targetUserId: string, chatId: string, userId: string, isTyping: boolean) {
    const conn = this.connections.get(targetUserId);
    if (conn && conn.open) {
      conn.send({ type: 'TYPING', chatId, userId, isTyping });
    }
  }

  broadcastPost(post: Post) {
    this.connections.forEach(conn => {
      if (conn.open) conn.send({ type: 'NEW_POST', post });
    });
  }

  onMessage(cb: (chatId: string, msg: Message) => void) { this.onMessageCallback = cb; }
  onTyping(cb: (chatId: string, userId: string, isTyping: boolean) => void) { this.onTypingCallback = cb; }
  onNewPost(cb: (post: Post) => void) { this.onNewPostCallback = cb; }

  // --- SHARED GLOBAL REGISTRY (Via JSONBlob) ---
  
  async publishProfile(user: User) {
    try {
      const response = await fetch(REGISTRY_BLOB_URL);
      let registry: User[] = await response.json();
      if (!Array.isArray(registry)) registry = [];
      
      const index = registry.findIndex(u => u.id === user.id);
      const updatedUser = { ...user, lastSeen: Date.now() };
      
      if (index !== -1) {
        registry[index] = updatedUser;
      } else {
        registry.push(updatedUser);
      }

      // Limit registry size for demo purposes
      if (registry.length > 50) registry.shift();

      await fetch(REGISTRY_BLOB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registry)
      });
    } catch (e) {
      console.error("Cloud publish error", e);
    }
  }

  async fetchGlobalDiscovery(): Promise<User[]> {
    try {
      const response = await fetch(REGISTRY_BLOB_URL);
      const registry = await response.json();
      // Only return users active in the last 24 hours
      return Array.isArray(registry) ? registry.filter(u => Date.now() - (u.lastSeen || 0) < 86400000) : [];
    } catch (e) {
      return [];
    }
  }

  // --- SHARED GLOBAL FEED (Via JSONBlob) ---

  async publishPost(post: Post) {
    try {
      const response = await fetch(FEED_BLOB_URL);
      let feed: Post[] = await response.json();
      if (!Array.isArray(feed)) feed = [];
      
      feed.unshift(post);
      if (feed.length > 30) feed.pop(); // Keep feed clean

      await fetch(FEED_BLOB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feed)
      });

      this.broadcastPost(post);
    } catch (e) {
      console.error("Cloud post error", e);
    }
  }

  async fetchGlobalPosts(): Promise<Post[]> {
    try {
      const response = await fetch(FEED_BLOB_URL);
      const feed = await response.json();
      return Array.isArray(feed) ? feed : [];
    } catch (e) {
      return [];
    }
  }
}

export const cloudService = new CloudService();
