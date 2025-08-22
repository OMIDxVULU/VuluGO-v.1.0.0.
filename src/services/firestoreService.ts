import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  increment,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import type { AppUser, ChatMessage, DirectMessage, Conversation } from './types';

// Re-export types for backward compatibility
export type { AppUser as User, ChatMessage, DirectMessage, Conversation };

export interface LiveStream {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  title: string;
  description?: string;
  isLive: boolean;
  viewerCount: number;
  startedAt: Timestamp;
  endedAt?: Timestamp;
}

class FirestoreService {
  // User operations
  async createUser(userData: Omit<AppUser, 'createdAt' | 'lastSeen'>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userData.uid);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      });
    } catch (error: any) {
      console.warn('Failed to create user in Firestore:', error.message);
      // Don't throw error, just log it
    }
  }

  async getUser(uid: string): Promise<AppUser | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return userSnap.data() as AppUser;
      }
      return null;
    } catch (error: any) {
      console.warn('Failed to get user from Firestore:', error.message);
      return null;
    }
  }

  async updateUser(uid: string, updates: Partial<AppUser>): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        lastSeen: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  // Chat operations
  async sendMessage(streamId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      const messageRef = await addDoc(collection(db, `streams/${streamId}/messages`), {
        ...message,
        timestamp: serverTimestamp()
      });
      return messageRef.id;
    } catch (error: any) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async getStreamMessages(streamId: string, limitCount: number = 50): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, `streams/${streamId}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
    } catch (error: any) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  // Direct messaging operations
  async createConversation(participantIds: string[], participantNames: { [userId: string]: string }, participantAvatars: { [userId: string]: string }): Promise<string> {
    try {
      // Check if conversation already exists
      const existingConversation = await this.getConversationByParticipants(participantIds);
      if (existingConversation) {
        return existingConversation.id;
      }

      // Create deterministic conversation ID by sorting participant IDs
      const sortedParticipantIds = [...participantIds].sort();
      const conversationId = sortedParticipantIds.join('|');

      const conversationData: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> = {
        participants: participantIds,
        participantNames,
        participantAvatars,
        lastMessageTime: serverTimestamp() as Timestamp,
        unreadCount: participantIds.reduce((acc, userId) => ({ ...acc, [userId]: 0 }), {})
      };

      // Use setDoc with deterministic ID to avoid race conditions
      const conversationRef = doc(db, 'conversations', conversationId);
      await setDoc(conversationRef, {
        ...conversationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return conversationId;
    } catch (error: any) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  async getConversationByParticipants(participantIds: string[]): Promise<Conversation | null> {
    try {
      // Create deterministic conversation ID by sorting participant IDs
      const sortedParticipantIds = [...participantIds].sort();
      const conversationId = sortedParticipantIds.join('|');

      // Direct document lookup using deterministic ID
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        return { id: conversationSnap.id, ...conversationSnap.data() } as Conversation;
      }

      return null;
    } catch (error: any) {
      console.error('Failed to get conversation by participants:', error.message);
      return null;
    }
  }

  async sendDirectMessage(conversationId: string, message: Omit<DirectMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Use transaction for atomic message sending and unread count update
      return await runTransaction(db, async (transaction) => {
        // Get conversation document first
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationSnap = await transaction.get(conversationRef);

        if (!conversationSnap.exists()) {
          throw new Error('Conversation not found');
        }

        const conversation = conversationSnap.data() as Conversation;

        // Validate that recipient is a participant
        if (!conversation.participants.includes(message.recipientId)) {
          throw new Error('Recipient is not a participant in this conversation');
        }

        // Validate that sender is a participant
        if (!conversation.participants.includes(message.senderId)) {
          throw new Error('Sender is not a participant in this conversation');
        }

        // Add the message
        const messageRef = doc(collection(db, `conversations/${conversationId}/messages`));
        transaction.set(messageRef, {
          ...message,
          timestamp: serverTimestamp()
        });

        // Update conversation with last message and conditionally increment unread count
        const updateData: any = {
          lastMessage: {
            text: message.text,
            senderId: message.senderId,
            senderName: message.senderName,
            timestamp: serverTimestamp()
          },
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Only increment unread count if recipient is a valid participant
        updateData[`unreadCount.${message.recipientId}`] = increment(1);

        transaction.update(conversationRef, updateData);

        return messageRef.id;
      });
    } catch (error: any) {
      throw new Error(`Failed to send direct message: ${error.message}`);
    }
  }

  async getConversationMessages(conversationId: string, limitCount: number = 50): Promise<DirectMessage[]> {
    try {
      const messagesRef = collection(db, `conversations/${conversationId}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DirectMessage[];
    } catch (error: any) {
      throw new Error(`Failed to get conversation messages: ${error.message}`);
    }
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', userId),
        orderBy('lastMessageTime', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
    } catch (error: any) {
      console.error('Failed to get user conversations:', error.message);
      return [];
    }
  }

  // Streaming methods
  async createStream(streamId: string, streamData: any): Promise<void> {
    try {
      const streamsRef = collection(db, 'streams');
      await setDoc(doc(streamsRef, streamId), {
        ...streamData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Failed to create stream:', error.message);
      throw error;
    }
  }

  async getActiveStreams(): Promise<any[]> {
    try {
      const streamsRef = collection(db, 'streams');
      const q = query(
        streamsRef,
        where('isActive', '==', true),
        orderBy('startedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error: any) {
      console.error('Failed to get active streams:', error.message);
      return [];
    }
  }

  async updateStreamParticipants(streamId: string, participants: any[]): Promise<void> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      await updateDoc(streamRef, {
        participants,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Failed to update stream participants:', error.message);
      throw error;
    }
  }

  async updateStreamViewerCount(streamId: string, viewerCount: number): Promise<void> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      await updateDoc(streamRef, {
        viewerCount,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Failed to update stream viewer count:', error.message);
      throw error;
    }
  }

  async updateStreamStatus(streamId: string, isActive: boolean): Promise<void> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      await updateDoc(streamRef, {
        isActive,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Failed to update stream status:', error.message);
      throw error;
    }
  }

  onStreamUpdate(streamId: string, callback: (data: any) => void): () => void {
    const streamRef = doc(db, 'streams', streamId);
    return onSnapshot(streamRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      }
    });
  }

  onActiveStreamsUpdate(callback: (streams: any[]) => void): () => void {
    const streamsRef = collection(db, 'streams');
    const q = query(
      streamsRef,
      where('isActive', '==', true),
      orderBy('startedAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const streams = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(streams);
    });
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Failed to mark messages as read:', error.message);
    }
  }



  async getLiveStreams(): Promise<LiveStream[]> {
    try {
      const streamsRef = collection(db, 'streams');
      const q = query(streamsRef, where('isLive', '==', true), orderBy('startedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LiveStream[];
    } catch (error: any) {
      throw new Error(`Failed to get live streams: ${error.message}`);
    }
  }

  async endStream(streamId: string): Promise<void> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      await updateDoc(streamRef, {
        isLive: false,
        endedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(`Failed to end stream: ${error.message}`);
    }
  }

  // Real-time listeners
  onStreamMessages(streamId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const messagesRef = collection(db, `streams/${streamId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
    
    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      callback(messages);
    });
  }

  onLiveStreams(callback: (streams: LiveStream[]) => void): () => void {
    const streamsRef = collection(db, 'streams');
    const q = query(streamsRef, where('isLive', '==', true), orderBy('startedAt', 'desc'));

    return onSnapshot(q, (querySnapshot) => {
      const streams = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LiveStream[];
      callback(streams);
    });
  }

  // Real-time listeners for direct messages
  onConversationMessages(conversationId: string, callback: (messages: DirectMessage[]) => void): () => void {
    const messagesRef = collection(db, `conversations/${conversationId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));

    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DirectMessage[];
      callback(messages);
    });
  }

  onUserConversations(userId: string, callback: (conversations: Conversation[]) => void): () => void {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const conversations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      callback(conversations);
    });
  }
}

export const firestoreService = new FirestoreService();
export default firestoreService; 