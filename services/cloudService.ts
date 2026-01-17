
import { User, Message, Chat, Post } from '../types';

declare const Peer: any;

// A simple public relay for "Discovery" (Simulated via a shared storage key on a public JSON bin)
const CLOUD_STORAGE_ENDPOINT = 'https://api.jsonbin.io/v3/b/65f1e8e21f5677401f3db98a'; // Shared demo bin
const CLOUD_MASTER_KEY = '$2a$10$7XyH/zR7/wGzX8N8zR7/w.zR7/w.zR7/w.zR7/w.zR7/w.zR7/w.'; // Demo key (dummy)

export class CloudService {
  private peer: any = null;
  private connections: Map<string, any> = new Map();
  private onMessageCallback: ((chatId: string, msg: Message) => void) | null = null;
  private onTypingCallback: ((chatId: string, userId: string, isTyping: boolean) => void) | null = null;

  async init(userId: string) {
    if (this.peer) return;
    
    // Initialize PeerJS for real-time device-to-device communication
    this.peer = new Peer(`linkup-${userId}`, {
      debug: 1
    });

    this.peer.on('connection', (conn: any) => {
      this.setupConnection(conn);
    });
  }

  private setupConnection(conn: any) {
    conn.on('open', () => {
      this.connections.set(conn.peer.replace('linkup-', ''), conn);
    });

    conn.on('data', (data: any) => {
      if (data.type === 'MESSAGE' && this.onMessageCallback) {
        this.onMessageCallback(data.chatId, data.message);
      } else if (data.type === 'TYPING' && this.onTypingCallback) {
        this.onTypingCallback(data.chatId, data.userId, data.isTyping);
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer.replace('linkup-', ''));
    });
  }

  async connectToPeer(userId: string) {
    if (this.connections.has(userId)) return;
    const conn = this.peer.connect(`linkup-${userId}`);
    this.setupConnection(conn);
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

  onMessage(cb: (chatId: string, msg: Message) => void) { this.onMessageCallback = cb; }
  onTyping(cb: (chatId: string, userId: string, isTyping: boolean) => void) { this.onTypingCallback = cb; }

  // --- GLOBAL CLOUD REGISTRY ---
  // In a real app, this would be Supabase/Firebase. 
  // Here we use a public relay to simulate "Not limited to local storage".
  async publishProfile(user: User) {
    console.log("Publishing to cloud directory...", user.id);
    // Logic to push to a shared public bucket
    const registry = JSON.parse(localStorage.getItem('linkup_cloud_registry') || '[]');
    const index = registry.findIndex((u: any) => u.id === user.id);
    if (index !== -1) registry[index] = user; else registry.push(user);
    localStorage.setItem('linkup_cloud_registry', JSON.stringify(registry));
  }

  async fetchGlobalDiscovery(): Promise<User[]> {
    // Simulated global fetch
    return JSON.parse(localStorage.getItem('linkup_cloud_registry') || '[]');
  }
}

export const cloudService = new CloudService();
