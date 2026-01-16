
import { Message } from '../types';

type MessageCallback = (data: { chatId: string; message: Message }) => void;
type TypingCallback = (data: { chatId: string; userId: string; isTyping: boolean }) => void;

class SocketService {
  private channel: BroadcastChannel;
  private messageListeners: Set<MessageCallback> = new Set();
  private typingListeners: Set<TypingCallback> = new Set();

  constructor() {
    this.channel = new BroadcastChannel('linkup_chat_socket');
    this.channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'NEW_MESSAGE') {
        this.messageListeners.forEach(callback => callback(data));
      } else if (type === 'TYPING_STATUS') {
        this.typingListeners.forEach(callback => callback(data));
      }
    };
  }

  // Simulate sending a message to a server
  sendMessage(chatId: string, message: Message) {
    this.channel.postMessage({
      type: 'NEW_MESSAGE',
      data: { chatId, message }
    });
    
    this.messageListeners.forEach(callback => callback({ chatId, message }));
    
    // Auto-reply logic removed to avoid Sarah (demo user) conflicts.
    // In a real environment, this would hit a backend.
  }

  // Send typing status to other participants
  sendTypingStatus(chatId: string, userId: string, isTyping: boolean) {
    this.channel.postMessage({
      type: 'TYPING_STATUS',
      data: { chatId, userId, isTyping }
    });
    // Trigger local listeners too
    this.typingListeners.forEach(callback => callback({ chatId, userId, isTyping }));
  }

  onMessage(callback: MessageCallback) {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  onTypingStatus(callback: TypingCallback) {
    this.typingListeners.add(callback);
    return () => this.typingListeners.delete(callback);
  }
}

export const socketService = new SocketService();
