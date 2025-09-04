/**
 * Real-time Stream Chat Service
 * Handles live chat with message persistence, reactions, mentions, and moderation
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { StreamChatMessage, MessageReaction, MessageType } from './firestoreService';

export interface ChatMessage {
  id: string;
  streamId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: 'host' | 'moderator' | 'viewer';
  message: string;
  type: MessageType;
  mentions: string[];
  reactions: MessageReaction[];
  reactionCount: number;
  isDeleted: boolean;
  deletedBy?: string;
  deleteReason?: string;
  isFiltered: boolean;
  timestamp: Timestamp;
  editedAt?: Timestamp;
  clientTimestamp: number;
}

export interface ChatSettings {
  slowMode: number;
  subscribersOnly: boolean;
  moderatorsOnly: boolean;
  profanityFilter: boolean;
  linkFilter: boolean;
  maxMessageLength: number;
}

export interface ChatModerationAction {
  type: 'delete_message' | 'timeout_user' | 'ban_user' | 'clear_chat';
  targetUserId?: string;
  targetMessageId?: string;
  reason: string;
  duration?: number; // For timeouts, in minutes
}

class StreamChatService {
  private static instance: StreamChatService;
  private chatListeners = new Map<string, () => void>(); // streamId -> unsubscribe function
  private messageCache = new Map<string, ChatMessage[]>(); // streamId -> messages
  private rateLimitMap = new Map<string, number[]>(); // userId -> timestamps
  private bannedWords = new Set([
    // Basic profanity filter - in production, use a comprehensive list
    'spam', 'scam', 'fake', 'bot'
  ]);

  private constructor() {}

  static getInstance(): StreamChatService {
    if (!StreamChatService.instance) {
      StreamChatService.instance = new StreamChatService();
    }
    return StreamChatService.instance;
  }

  /**
   * Start listening to chat messages for a stream
   */
  startChatListener(
    streamId: string,
    onMessage: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    console.log(`💬 Starting chat listener for stream: ${streamId}`);

    // Stop existing listener if any
    this.stopChatListener(streamId);

    const chatRef = collection(db, `streams/${streamId}/chat`);
    const q = query(
      chatRef,
      orderBy('timestamp', 'desc'),
      limit(100) // Load last 100 messages
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages: ChatMessage[] = [];
        
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Omit<ChatMessage, 'id'>;
          messages.push({
            id: doc.id,
            ...data
          });
        });

        // Sort by timestamp (newest first)
        messages.sort((a, b) => b.clientTimestamp - a.clientTimestamp);

        // Cache messages
        this.messageCache.set(streamId, messages);

        // Notify callback
        onMessage(messages);
      },
      (error) => {
        console.error(`Error in chat listener for ${streamId}:`, error);
        onError?.(error);
      }
    );

    this.chatListeners.set(streamId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Stop listening to chat messages for a stream
   */
  stopChatListener(streamId: string): void {
    const unsubscribe = this.chatListeners.get(streamId);
    if (unsubscribe) {
      unsubscribe();
      this.chatListeners.delete(streamId);
      this.messageCache.delete(streamId);
      console.log(`💬 Stopped chat listener for stream: ${streamId}`);
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(
    streamId: string,
    message: string,
    mentions: string[] = [],
    type: MessageType = 'text'
  ): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;

      // Validate message
      await this.validateMessage(streamId, message, user.uid);

      // Get user role in stream
      const userRole = await this.getUserRole(streamId, user.uid);

      // Create message object
      const chatMessage: Omit<ChatMessage, 'id'> = {
        streamId,
        senderId: user.uid,
        senderName: user.displayName || 'User',
        senderAvatar: user.photoURL || undefined,
        senderRole: userRole,
        message: this.sanitizeMessage(message),
        type,
        mentions,
        reactions: [],
        reactionCount: 0,
        isDeleted: false,
        isFiltered: this.isMessageFiltered(message),
        timestamp: serverTimestamp() as Timestamp,
        clientTimestamp: Date.now()
      };

      // Add message to Firestore
      const chatRef = collection(db, `streams/${streamId}/chat`);
      const messageRef = await addDoc(chatRef, chatMessage);

      // Update stream message count
      await updateDoc(doc(db, 'streams', streamId), {
        totalMessages: increment(1),
        lastActivity: serverTimestamp()
      });

      // Update user message count
      await this.updateUserMessageCount(streamId, user.uid);

      // Update rate limit
      this.updateRateLimit(user.uid);

      console.log(`💬 Message sent to stream ${streamId}: ${messageRef.id}`);
      return messageRef.id;

    } catch (error: any) {
      console.error('Failed to send chat message:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(streamId: string, messageId: string, emoji: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;

      await runTransaction(db, async (transaction) => {
        const messageRef = doc(db, `streams/${streamId}/chat`, messageId);
        const messageDoc = await transaction.get(messageRef);

        if (!messageDoc.exists()) {
          throw new Error('Message not found');
        }

        const messageData = messageDoc.data() as ChatMessage;
        const existingReaction = messageData.reactions.find(r => r.emoji === emoji);

        if (existingReaction) {
          // Toggle reaction
          if (existingReaction.userIds.includes(user.uid)) {
            // Remove reaction
            existingReaction.userIds = existingReaction.userIds.filter(id => id !== user.uid);
            existingReaction.count = existingReaction.userIds.length;
          } else {
            // Add reaction
            existingReaction.userIds.push(user.uid);
            existingReaction.count = existingReaction.userIds.length;
          }
        } else {
          // Add new reaction
          messageData.reactions.push({
            emoji,
            userIds: [user.uid],
            count: 1
          });
        }

        // Remove empty reactions
        messageData.reactions = messageData.reactions.filter(r => r.count > 0);
        messageData.reactionCount = messageData.reactions.reduce((sum, r) => sum + r.count, 0);

        transaction.update(messageRef, {
          reactions: messageData.reactions,
          reactionCount: messageData.reactionCount
        });
      });

      console.log(`💬 Reaction ${emoji} toggled on message ${messageId}`);

    } catch (error: any) {
      console.error('Failed to add reaction:', error);
      throw new Error(`Failed to add reaction: ${error.message}`);
    }
  }

  /**
   * Delete a message (moderation)
   */
  async deleteMessage(
    streamId: string,
    messageId: string,
    reason: string = 'Inappropriate content'
  ): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;
      const userRole = await this.getUserRole(streamId, user.uid);

      // Check if user has moderation permissions
      if (!['host', 'moderator'].includes(userRole)) {
        throw new Error('Insufficient permissions to delete messages');
      }

      // Soft delete the message
      await updateDoc(doc(db, `streams/${streamId}/chat`, messageId), {
        isDeleted: true,
        deletedBy: user.uid,
        deleteReason: reason,
        editedAt: serverTimestamp()
      });

      console.log(`💬 Message ${messageId} deleted by ${user.uid}: ${reason}`);

    } catch (error: any) {
      console.error('Failed to delete message:', error);
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }

  /**
   * Clear all chat messages (moderation)
   */
  async clearChat(streamId: string, reason: string = 'Chat cleared by moderator'): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;
      const userRole = await this.getUserRole(streamId, user.uid);

      // Check if user has moderation permissions
      if (!['host', 'moderator'].includes(userRole)) {
        throw new Error('Insufficient permissions to clear chat');
      }

      // Get all messages in the chat
      const chatRef = collection(db, `streams/${streamId}/chat`);
      const messagesQuery = query(chatRef, where('isDeleted', '==', false));
      const snapshot = await messagesQuery.get();

      // Batch delete all messages
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isDeleted: true,
          deletedBy: user.uid,
          deleteReason: reason,
          editedAt: serverTimestamp()
        });
      });

      await batch.commit();

      console.log(`💬 Chat cleared for stream ${streamId} by ${user.uid}`);

    } catch (error: any) {
      console.error('Failed to clear chat:', error);
      throw new Error(`Failed to clear chat: ${error.message}`);
    }
  }

  /**
   * Update chat settings (host/moderator only)
   */
  async updateChatSettings(streamId: string, settings: Partial<ChatSettings>): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;
      const userRole = await this.getUserRole(streamId, user.uid);

      // Check if user has moderation permissions
      if (!['host', 'moderator'].includes(userRole)) {
        throw new Error('Insufficient permissions to update chat settings');
      }

      // Update stream chat settings
      await updateDoc(doc(db, 'streams', streamId), {
        [`chatSettings.${Object.keys(settings)[0]}`]: Object.values(settings)[0],
        updatedAt: serverTimestamp()
      });

      console.log(`💬 Chat settings updated for stream ${streamId}:`, settings);

    } catch (error: any) {
      console.error('Failed to update chat settings:', error);
      throw new Error(`Failed to update chat settings: ${error.message}`);
    }
  }

  /**
   * Get cached messages for a stream
   */
  getCachedMessages(streamId: string): ChatMessage[] {
    return this.messageCache.get(streamId) || [];
  }

  /**
   * Validate message before sending
   */
  private async validateMessage(streamId: string, message: string, userId: string): Promise<void> {
    // Check rate limiting
    if (this.isRateLimited(userId)) {
      throw new Error('You are sending messages too quickly. Please slow down.');
    }

    // Check message length
    if (message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > 500) {
      throw new Error('Message is too long (max 500 characters)');
    }

    // Get stream settings
    const streamDoc = await doc(db, 'streams', streamId).get();
    if (!streamDoc.exists()) {
      throw new Error('Stream not found');
    }

    const streamData = streamDoc.data();
    const chatSettings = streamData.chatSettings as ChatSettings;

    // Check if message exceeds custom length limit
    if (message.length > chatSettings.maxMessageLength) {
      throw new Error(`Message is too long (max ${chatSettings.maxMessageLength} characters)`);
    }

    // Check if user is banned
    if (streamData.bannedUserIds && streamData.bannedUserIds.includes(userId)) {
      throw new Error('You are banned from this stream');
    }

    // Check chat permissions
    if (!streamData.allowChat) {
      throw new Error('Chat is disabled for this stream');
    }

    const userRole = await this.getUserRole(streamId, userId);

    if (chatSettings.moderatorsOnly && !['host', 'moderator'].includes(userRole)) {
      throw new Error('Only moderators can chat in this stream');
    }
  }

  /**
   * Check if user is rate limited
   */
  private isRateLimited(userId: string): boolean {
    const now = Date.now();
    const userTimestamps = this.rateLimitMap.get(userId) || [];
    
    // Remove timestamps older than 10 seconds
    const recentTimestamps = userTimestamps.filter(timestamp => now - timestamp < 10000);
    
    // Allow max 5 messages per 10 seconds
    return recentTimestamps.length >= 5;
  }

  /**
   * Update rate limit for user
   */
  private updateRateLimit(userId: string): void {
    const now = Date.now();
    const userTimestamps = this.rateLimitMap.get(userId) || [];
    
    // Add current timestamp
    userTimestamps.push(now);
    
    // Keep only recent timestamps (last 10 seconds)
    const recentTimestamps = userTimestamps.filter(timestamp => now - timestamp < 10000);
    
    this.rateLimitMap.set(userId, recentTimestamps);
  }

  /**
   * Get user role in stream
   */
  private async getUserRole(streamId: string, userId: string): Promise<'host' | 'moderator' | 'viewer'> {
    try {
      const streamDoc = await doc(db, 'streams', streamId).get();
      if (!streamDoc.exists()) {
        return 'viewer';
      }

      const streamData = streamDoc.data();
      
      if (streamData.hostId === userId) {
        return 'host';
      }
      
      if (streamData.moderatorIds && streamData.moderatorIds.includes(userId)) {
        return 'moderator';
      }
      
      return 'viewer';

    } catch (error) {
      console.error('Failed to get user role:', error);
      return 'viewer';
    }
  }

  /**
   * Sanitize message content
   */
  private sanitizeMessage(message: string): string {
    // Basic sanitization - remove excessive whitespace
    return message.trim().replace(/\s+/g, ' ');
  }

  /**
   * Check if message should be filtered
   */
  private isMessageFiltered(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Check against banned words
    for (const word of this.bannedWords) {
      if (lowerMessage.includes(word)) {
        return true;
      }
    }
    
    // Check for excessive caps (more than 70% uppercase)
    const uppercaseCount = (message.match(/[A-Z]/g) || []).length;
    const letterCount = (message.match(/[A-Za-z]/g) || []).length;
    
    if (letterCount > 10 && uppercaseCount / letterCount > 0.7) {
      return true;
    }
    
    return false;
  }

  /**
   * Update user message count
   */
  private async updateUserMessageCount(streamId: string, userId: string): Promise<void> {
    try {
      const participantRef = doc(db, `streams/${streamId}/participants`, userId);
      await updateDoc(participantRef, {
        messagesSent: increment(1),
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // Non-critical error, just log it
      console.warn('Failed to update user message count:', error);
    }
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    // Stop all chat listeners
    this.chatListeners.forEach((unsubscribe) => {
      unsubscribe();
    });

    // Clear all caches
    this.chatListeners.clear();
    this.messageCache.clear();
    this.rateLimitMap.clear();

    console.log('💬 Stream Chat Service destroyed');
  }
}

export default StreamChatService.getInstance();
