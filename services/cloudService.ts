
import { User, Message, Chat, Post } from '../types';

declare const Peer: any;

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
    
    // Stable Peer ID for direct discovery
    const stablePeerId = `linkup-p2p-${userId}`;
    this.peer = new Peer(stablePeerId, {
      debug: 1,
      config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
    });

    this.peer.on('open', (id: string) => {
      console.log('PeerJS Active with ID:', id);
    });

    this.peer.on('connection', (conn: any) => {
      this.setupConnection(conn);
    });

    this.peer.on('error', (err: any) => {
      if (err.type === 'unavailable-id') {
        // If ID is taken, likely another tab is open. Append random suffix.
        this.peer = new Peer(`${stablePeerId}-${Math.random().toString(36).substr(2, 4)}`);
      }
    });

    // Aggressive pulsing to keep global registry fresh (every 10s)
    setInterval(() => {
      const savedUser = localStorage.getItem('linkup_session_userid');
      if (savedUser) {
        const users = JSON.parse(localStorage.getItem('linkup_db_users') || '[]');
        const user = users.find((u: any) => u.user.id === savedUser)?.user;
        if (user) this.publishProfile(user);
      }
    }, 10000);
  }

  private setupConnection(conn: any) {
    const parts = conn.peer.split('-');
    const otherUserId = parts[parts.length - 1] || conn.peer;
    
    conn.on('open', () => {
      this.connections.set(otherUserId, conn);
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
  }

  async connectToPeer(userId: string) {
    if (this.connections.has(userId) || !this.peer || userId.startsWith('ai-')) return;
    try {
      const conn = this.peer.connect(`linkup-p2p-${userId}`);
      this.setupConnection(conn);
    } catch (e) {
      console.warn("Peer connection pending...");
    }
  }

  sendMessage(targetUserId: string, chatId: string, message: Message) {
    if (targetUserId.startsWith('ai-')) return;
    const conn = this.connections.get(targetUserId);
    if (conn && conn.open) {
      conn.send({ type: 'MESSAGE', chatId, message });
    }
  }

  sendTypingStatus(targetUserId: string, chatId: string, userId: string, isTyping: boolean) {
    if (targetUserId.startsWith('ai-')) return;
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

  async publishProfile(user: User) {
    try {
      const response = await fetch(REGISTRY_BLOB_URL);
      let registry: User[] = response.ok ? await response.json() : [];
      if (!Array.isArray(registry)) registry = [];
      
      const updatedUser = { ...user, lastSeen: Date.now() };
      const index = registry.findIndex(u => u.id === user.id);
      
      if (index !== -1) registry[index] = updatedUser;
      else registry.push(updatedUser);

      // Clean registry: keep only active users from last 15 minutes
      registry = registry.filter(u => Date.now() - (u.lastSeen || 0) < 900000);

      await fetch(REGISTRY_BLOB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registry)
      });
      
      this.onlineCount = registry.length;
    } catch (e) {
      console.error("Cloud publish error:", e);
    }
  }

  async fetchGlobalDiscovery(): Promise<User[]> {
    try {
      const response = await fetch(`${REGISTRY_BLOB_URL}?nocache=${Date.now()}`);
      const registry = await response.json();
      if (!Array.isArray(registry)) return [];
      this.onlineCount = registry.length;
      return registry;
    } catch (e) {
      return [];
    }
  }

  async publishPost(post: Post) {
    try {
      const response = await fetch(FEED_BLOB_URL);
      let feed: Post[] = response.ok ? await response.json() : [];
      if (!Array.isArray(feed)) feed = [];
      feed.unshift(post);
      if (feed.length > 50) feed.pop();

      await fetch(FEED_BLOB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feed)
      });
      this.broadcastPost(post);
    } catch (e) {}
  }

  async fetchGlobalPosts(): Promise<Post[]> {
    try {
      const response = await fetch(`${FEED_BLOB_URL}?nocache=${Date.now()}`);
      const feed = await response.json();
      return Array.isArray(feed) ? feed : [];
    } catch (e) {
      return [];
    }
  }
}

export const cloudService = new CloudService();
