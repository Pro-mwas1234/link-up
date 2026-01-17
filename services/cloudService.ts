
import { User, Message, Chat, Post } from '../types';

declare const Peer: any;

// Global Registry for discovery
const REGISTRY_BLOB_URL = 'https://jsonblob.com/api/jsonBlob/1344275185908785152';
const FEED_BLOB_URL = 'https://jsonblob.com/api/jsonBlob/1344275338162012160';

export class CloudService {
  private peer: any = null;
  private connections: Map<string, any> = new Map();
  private onMessageCallback: ((chatId: string, msg: Message) => void) | null = null;
  private onTypingCallback: ((chatId: string, userId: string, isTyping: boolean) => void) | null = null;
  private onNewPostCallback: ((post: Post) => void) | null = null;
  public onlineCount: number = 0;
  private currentUserId: string | null = null;

  async init(userId: string) {
    if (this.peer && this.currentUserId === userId) return;
    this.currentUserId = userId;
    
    // Stable Peer ID for direct discovery
    const stablePeerId = `linkup-p2p-${userId}`;
    
    if (this.peer) {
      this.peer.destroy();
    }

    this.peer = new Peer(stablePeerId, {
      debug: 1,
      config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }, { 'urls': 'stun:stun1.l.google.com:19302' }] }
    });

    this.peer.on('open', (id: string) => {
      console.log('LinkUp Cloud Node Active:', id);
    });

    this.peer.on('connection', (conn: any) => {
      this.setupConnection(conn);
    });

    this.peer.on('error', (err: any) => {
      console.error("PeerJS Error:", err.type, err);
      if (err.type === 'unavailable-id') {
        // Fallback if ID is taken (another tab)
        const fallbackId = `${stablePeerId}-alt-${Math.random().toString(36).substr(2, 4)}`;
        this.peer = new Peer(fallbackId);
      }
    });

    // Pulse the registry immediately and then every 15 seconds
    const performPulse = () => {
      const users = JSON.parse(localStorage.getItem('linkup_db_users') || '[]');
      const record = users.find((u: any) => u.user.id === userId);
      if (record) this.publishProfile(record.user);
    };

    performPulse();
    const pulseInterval = setInterval(performPulse, 15000);
    return () => clearInterval(pulseInterval);
  }

  private setupConnection(conn: any) {
    const parts = conn.peer.split('-');
    const otherUserId = parts[parts.length - 1] || conn.peer;
    
    conn.on('open', () => {
      console.log(`P2P Handshake established with ${otherUserId}`);
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

    conn.on('close', () => {
      console.log(`Connection closed with ${otherUserId}`);
      this.connections.delete(otherUserId);
    });
  }

  async connectToPeer(userId: string) {
    if (this.connections.has(userId) || !this.peer || userId.startsWith('ai-')) return;
    try {
      const conn = this.peer.connect(`linkup-p2p-${userId}`, {
        reliable: true
      });
      this.setupConnection(conn);
    } catch (e) {
      console.warn("Direct connection attempt failed, waiting for registry pulse...");
    }
  }

  sendMessage(targetUserId: string, chatId: string, message: Message) {
    if (targetUserId.startsWith('ai-')) return;
    const conn = this.connections.get(targetUserId);
    if (conn && conn.open) {
      conn.send({ type: 'MESSAGE', chatId, message });
    } else {
      // Try to reconnect if connection dropped
      this.connectToPeer(targetUserId);
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
      // 1. Fetch current registry
      const response = await fetch(REGISTRY_BLOB_URL);
      let registry: User[] = response.ok ? await response.json() : [];
      if (!Array.isArray(registry)) registry = [];
      
      const updatedUser = { 
        ...user, 
        lastSeen: Date.now(),
        // Ensure PeerJS ID is traceable in registry
        peerId: this.peer?.id || `linkup-p2p-${user.id}` 
      };

      // 2. Merge user into registry
      const index = registry.findIndex(u => u.id === user.id);
      if (index !== -1) registry[index] = updatedUser;
      else registry.push(updatedUser);

      // 3. Clean stale entries (older than 10 mins)
      registry = registry.filter(u => Date.now() - (u.lastSeen || 0) < 600000);

      // 4. Update registry
      await fetch(REGISTRY_BLOB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registry)
      });
      
      this.onlineCount = registry.length;
    } catch (e) {
      console.error("Cloud Registry Sync Error:", e);
    }
  }

  async fetchGlobalDiscovery(): Promise<User[]> {
    try {
      const response = await fetch(`${REGISTRY_BLOB_URL}?nocache=${Date.now()}`);
      if (!response.ok) return [];
      const registry = await response.json();
      if (!Array.isArray(registry)) return [];
      this.onlineCount = registry.length;
      return registry;
    } catch (e) {
      console.error("Discovery Fetch Error:", e);
      return [];
    }
  }

  async publishPost(post: Post) {
    try {
      const response = await fetch(FEED_BLOB_URL);
      let feed: Post[] = response.ok ? await response.json() : [];
      if (!Array.isArray(feed)) feed = [];
      
      // Prevent duplicates
      if (!feed.some(p => p.id === post.id)) {
        feed.unshift(post);
        if (feed.length > 30) feed.pop();

        await fetch(FEED_BLOB_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feed)
        });
        this.broadcastPost(post);
      }
    } catch (e) {}
  }

  async fetchGlobalPosts(): Promise<Post[]> {
    try {
      const response = await fetch(`${FEED_BLOB_URL}?nocache=${Date.now()}`);
      if (!response.ok) return [];
      const feed = await response.json();
      return Array.isArray(feed) ? feed : [];
    } catch (e) {
      return [];
    }
  }
}

export const cloudService = new CloudService();
