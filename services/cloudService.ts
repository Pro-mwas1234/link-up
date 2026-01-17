
import { User, Message, Chat, Post } from '../types';

declare const Peer: any;

// Public JSON relay endpoints. These act as a shared directory for all app instances globally.
const REGISTRY_BLOB_URL = 'https://jsonblob.com/api/jsonBlob/1344275185908785152';
const FEED_BLOB_URL = 'https://jsonblob.com/api/jsonBlob/1344275338162012160';

export class CloudService {
  private peer: any = null;
  private connections: Map<string, any> = new Map();
  private onMessageCallback: ((chatId: string, msg: Message) => void) | null = null;
  private onTypingCallback: ((chatId: string, userId: string, isTyping: boolean) => void) | null = null;
  private onNewPostCallback: ((post: Post) => void) | null = null;
  public onlineCount: number = 0;

  async init(userId: string) {
    if (this.peer) return;
    
    // Initialize PeerJS for real-time device-to-device communication
    // We add a random suffix to avoid collisions if multiple tabs are open on one machine
    const uniquePeerId = `linkup-p2p-${userId}-${Math.random().toString(36).substr(2, 4)}`;
    this.peer = new Peer(uniquePeerId, {
      debug: 1,
      config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
    });

    this.peer.on('connection', (conn: any) => {
      this.setupConnection(conn);
    });

    // Pulse more frequently (every 15s) to stay visible to others
    setInterval(() => {
      const savedUser = localStorage.getItem('linkup_session_userid');
      if (savedUser) {
        const users = JSON.parse(localStorage.getItem('linkup_db_users') || '[]');
        const user = users.find((u: any) => u.user.id === savedUser)?.user;
        if (user) this.publishProfile(user);
      }
    }, 15000);
  }

  private setupConnection(conn: any) {
    // Extract user ID from peer string
    const parts = conn.peer.split('-');
    const otherUserId = parts[2] || conn.peer;
    
    conn.on('open', () => {
      this.connections.set(otherUserId, conn);
      console.log(`P2P Handshake: ${otherUserId}`);
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

    conn.on('close', () => this.connections.delete(otherUserId));
    conn.on('error', () => this.connections.delete(otherUserId));
  }

  async connectToPeer(userId: string) {
    if (this.connections.has(userId) || !this.peer) return;
    try {
      // In a real P2P app, we'd query the signaling server for the current active PeerID
      // For this demo, we assume the PeerID follows our naming convention
      // (Note: This is simplified; PeerJS IDs must be exact)
      const conn = this.peer.connect(`linkup-p2p-${userId}`);
      this.setupConnection(conn);
    } catch (e) {
      console.warn("Peer connection pending or failed", e);
    }
  }

  sendMessage(targetUserId: string, chatId: string, message: Message) {
    const conn = this.connections.get(targetUserId);
    if (conn && conn.open) {
      conn.send({ type: 'MESSAGE', chatId, message });
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

  // --- SHARED GLOBAL REGISTRY ---
  
  async publishProfile(user: User) {
    try {
      const response = await fetch(REGISTRY_BLOB_URL);
      if (!response.ok) throw new Error("Registry unreachable");
      
      let registry: User[] = await response.json();
      if (!Array.isArray(registry)) registry = [];
      
      const updatedUser = { ...user, lastSeen: Date.now() };
      const index = registry.findIndex(u => u.id === user.id);
      
      if (index !== -1) {
        registry[index] = updatedUser;
      } else {
        registry.push(updatedUser);
      }

      // Keep registry tidy (last 100 active users)
      if (registry.length > 100) {
        registry.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
        registry = registry.slice(0, 100);
      }

      await fetch(REGISTRY_BLOB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registry)
      });
      
      this.onlineCount = registry.filter(u => Date.now() - (u.lastSeen || 0) < 60000).length;
    } catch (e) {
      console.error("Cloud publish error:", e);
    }
  }

  async fetchGlobalDiscovery(): Promise<User[]> {
    try {
      const response = await fetch(REGISTRY_BLOB_URL);
      const registry = await response.json();
      if (!Array.isArray(registry)) return [];
      
      // Return users seen in the last hour
      const active = registry.filter(u => Date.now() - (u.lastSeen || 0) < 3600000);
      this.onlineCount = active.length;
      return active;
    } catch (e) {
      console.error("Cloud fetch error:", e);
      return [];
    }
  }

  async publishPost(post: Post) {
    try {
      const response = await fetch(FEED_BLOB_URL);
      let feed: Post[] = await response.json();
      if (!Array.isArray(feed)) feed = [];
      
      feed.unshift(post);
      if (feed.length > 50) feed.pop();

      await fetch(FEED_BLOB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feed)
      });

      this.broadcastPost(post);
    } catch (e) {
      console.error("Cloud post error:", e);
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
