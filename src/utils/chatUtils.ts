import { firestoreService } from '../services/firestoreService';
import { UnifiedMessage, MessageConverter, Conversation } from '../services/types';
import { Timestamp } from 'firebase/firestore';

// Retry utility with exponential backoff
export const retry = async <T,>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Chat operation utilities with error handling
export class ChatOperations {
  static async sendMessage(
    conversationId: string,
    message: {
      senderId: string;
      senderName: string;
      senderAvatar?: string;
      recipientId: string;
      text: string;
    }
  ): Promise<string | null> {
    try {
      return await retry(async () => {
        return await firestoreService.sendDirectMessage(conversationId, {
          senderId: message.senderId,
          senderName: message.senderName,
          senderAvatar: message.senderAvatar,
          recipientId: message.recipientId,
          text: message.text,
          type: 'text'
        });
      });
    } catch (error: any) {
      console.error('Failed to send message after retries:', error.message);
      return null;
    }
  }

  static async loadMessages(
    conversationId: string,
    limit: number = 50
  ): Promise<UnifiedMessage[]> {
    return retry(async () => {
      const messages = await firestoreService.getConversationMessages(conversationId, limit);
      return messages.map(MessageConverter.fromDirectMessage);
    });
  }

  static async createConversation(
    participantIds: string[],
    participantNames: { [userId: string]: string },
    participantAvatars: { [userId: string]: string }
  ): Promise<string> {
    return retry(async () => {
      return await firestoreService.createConversation(
        participantIds,
        participantNames,
        participantAvatars
      );
    });
  }

  static async getUserConversations(userId: string): Promise<Conversation[]> {
    return retry(async () => {
      return await firestoreService.getUserConversations(userId);
    });
  }

  static async markAsRead(conversationId: string, userId: string): Promise<void> {
    return retry(async () => {
      return await firestoreService.markMessagesAsRead(conversationId, userId);
    });
  }
}

// Message validation utilities
export class MessageValidator {
  static validateMessage(text: string): { isValid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return { isValid: false, error: 'Message cannot be empty' };
    }

    if (text.length > 2000) {
      return { isValid: false, error: 'Message too long (max 2000 characters)' };
    }

    return { isValid: true };
  }

  static validateAttachment(file: any): { isValid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    if (file.size > maxSize) {
      return { isValid: false, error: 'File too large (max 10MB)' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not supported' };
    }

    return { isValid: true };
  }
}

// Message formatting utilities
export class MessageFormatter {
  static formatTimestamp(timestamp: Timestamp | string): string {
    if (typeof timestamp === 'string') {
      return timestamp;
    }

    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

// Real-time subscription manager
export class ChatSubscriptionManager {
  private subscriptions: Map<string, () => void> = new Map();

  subscribe(key: string, unsubscribe: () => void) {
    this.unsubscribe(key);
    this.subscriptions.set(key, unsubscribe);
  }

  unsubscribe(key: string) {
    const existing = this.subscriptions.get(key);
    if (existing) {
      existing();
      this.subscriptions.delete(key);
    }
  }

  unsubscribeAll() {
    for (const [key, unsubscribe] of this.subscriptions) {
      unsubscribe();
    }
    this.subscriptions.clear();
  }

  getSubscription(key: string) {
    return this.subscriptions.get(key);
  }
}

// Export singleton instance
export const chatSubscriptionManager = new ChatSubscriptionManager();
