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
  runTransaction,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth, isFirebaseInitialized } from './firebase';
import type { AppUser, ChatMessage, DirectMessage, Conversation } from './types';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';

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

export interface GlobalChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Timestamp;
  type: 'text' | 'system';
}

class FirestoreService {
  // Firebase readiness check
  private ensureFirebaseReady(): void {
    if (!isFirebaseInitialized()) {
      throw new Error('Firebase services not initialized');
    }
    if (!db) {
      throw new Error('Firestore not available');
    }
  }

  // Authentication helper methods
  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  private requireAuth(): void {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required for this operation');
    }
  }

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

  // Global Chat operations
  async sendGlobalChatMessage(message: Omit<GlobalChatMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Debug: Log authentication state
      const currentUser = auth?.currentUser;
      const isAuth = this.isAuthenticated();
      console.log('🔐 sendGlobalChatMessage - Auth Debug:', {
        hasAuth: !!auth,
        hasCurrentUser: !!currentUser,
        isAuthenticated: isAuth,
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        authState: currentUser ? 'authenticated' : 'not authenticated'
      });

      // Authentication check
      if (!this.isAuthenticated()) {
        console.warn('❌ Guest user attempted to send global chat message');
        throw new Error('Authentication required to send messages');
      }

      // Debug: Log message data before validation
      console.log('📝 sendGlobalChatMessage - Message Data:', {
        senderId: message.senderId,
        senderName: message.senderName,
        hasAvatar: !!message.senderAvatar,
        textLength: message.text?.length,
        messageType: message.type
      });

      // Validate required fields
      if (!message.senderId?.trim()) {
        throw new Error('Sender ID is required');
      }

      if (!message.text?.trim()) {
        throw new Error('Message text is required');
      }

      if (!message.senderName?.trim()) {
        throw new Error('Sender name is required');
      }

      // Sanitize and prepare message data
      const sanitizedMessage: any = {
        senderId: message.senderId.trim(),
        senderName: message.senderName.trim(),
        text: message.text.trim(),
        type: message.type || 'text',
        timestamp: serverTimestamp()
      };

      // Only include senderAvatar if it's provided and not empty
      if (message.senderAvatar && message.senderAvatar.trim()) {
        sanitizedMessage.senderAvatar = message.senderAvatar.trim();
      }

      // Debug: Log sanitized message before sending
      console.log('✅ sendGlobalChatMessage - Sanitized Data:', {
        ...sanitizedMessage,
        timestamp: '[ServerTimestamp]'
      });

      // Attempt to send message
      console.log('🚀 sendGlobalChatMessage - Attempting to send to Firestore...');
      const messageRef = await addDoc(collection(db, 'globalChat'), sanitizedMessage);
      console.log('✅ sendGlobalChatMessage - Success! Message ID:', messageRef.id);

      return messageRef.id;
    } catch (error: any) {
      // Enhanced error logging
      console.error('❌ sendGlobalChatMessage - Error occurred:', {
        errorCode: error?.code,
        errorMessage: error?.message,
        errorName: error?.name,
        fullError: error
      });

      // Don't log validation errors as they are user input issues
      if (error.message.includes('is required') || error.message.includes('Authentication required')) {
        throw error; // Re-throw validation errors without additional logging
      }

      FirebaseErrorHandler.logError('sendGlobalChatMessage', error);
      throw new Error(`Failed to send global chat message: ${error.message}`);
    }
  }

  async getGlobalChatMessages(limitCount: number = 50): Promise<GlobalChatMessage[]> {
    try {
      // Public read access - no authentication required for viewing messages
      if (!db) {
        console.warn('Firestore not initialized');
        return [];
      }

      const messagesRef = collection(db, 'globalChat');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GlobalChatMessage[];
    } catch (error: any) {
      // For permission errors, return empty array silently (expected for guest users)
      if (FirebaseErrorHandler.isPermissionError(error)) {
        // Don't log permission errors as they are expected for guest users
        return [];
      }

      // Only log non-permission errors
      FirebaseErrorHandler.logError('getGlobalChatMessages', error);
      console.error('Failed to get global chat messages:', error.message);
      return [];
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
      this.requireAuth(); // Require authentication for creating streams
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
      // Public read access - no authentication required for viewing streams
      if (!db) {
        console.warn('Firestore not initialized');
        return [];
      }

      const streamsRef = collection(db, 'streams');
      const q = query(
        streamsRef,
        where('isLive', '==', true),
        orderBy('startedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error: any) {
      FirebaseErrorHandler.logError('getActiveStreams', error);

      // For permission errors, return empty array silently (expected for guests)
      if (FirebaseErrorHandler.isPermissionError(error)) {
        return [];
      }

      // For other errors, return empty array but log more prominently
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
    try {
      // Public read access - no authentication required for viewing streams
      if (!db) {
        console.warn('Firestore not initialized');
        callback([]);
        return () => {}; // Return empty unsubscribe function
      }

      const streamsRef = collection(db, 'streams');
      const q = query(
        streamsRef,
        where('isLive', '==', true),
        orderBy('startedAt', 'desc')
      );

      return onSnapshot(q,
        (querySnapshot) => {
          const streams = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(streams);
        },
        (error) => {
          FirebaseErrorHandler.logError('onActiveStreamsUpdate', error);

          // For permission errors, silently return empty array (expected for guests)
          if (FirebaseErrorHandler.isPermissionError(error)) {
            callback([]);
            return;
          }

          // For other errors, log and return empty array
          console.error('Error in active streams listener:', error);
          callback([]);
        }
      );
    } catch (error: any) {
      console.error('Failed to set up active streams listener:', error.message);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
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
    try {
      // Public read access - no authentication required for viewing streams
      if (!db) {
        console.warn('Firestore not initialized');
        callback([]);
        return () => {}; // Return empty unsubscribe function
      }

      const streamsRef = collection(db, 'streams');
      const q = query(streamsRef, where('isLive', '==', true), orderBy('startedAt', 'desc'));

      return onSnapshot(q,
        (querySnapshot) => {
          const streams = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as LiveStream[];
          callback(streams);
        },
        (error) => {
          console.error('Error in live streams listener:', error);
          // Call callback with empty array on error to prevent app crashes
          callback([]);
        }
      );
    } catch (error: any) {
      console.error('Failed to set up live streams listener:', error.message);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
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

  // Global Chat real-time listener
  onGlobalChatMessages(callback: (messages: GlobalChatMessage[]) => void): () => void {
    try {
      // Public read access - no authentication required for viewing messages
      if (!db) {
        console.warn('Firestore not initialized');
        callback([]);
        return () => {}; // Return empty unsubscribe function
      }

      const messagesRef = collection(db, 'globalChat');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));

      return onSnapshot(q,
        (querySnapshot) => {
          const messages = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as GlobalChatMessage[];
          callback(messages);
        },
        (error) => {
          // For permission errors, silently return empty array (expected for guest users)
          if (FirebaseErrorHandler.isPermissionError(error)) {
            // Don't log permission errors as they are expected for guest users
            callback([]);
            return;
          }

          // Only log non-permission errors
          FirebaseErrorHandler.logError('onGlobalChatMessages', error);
          console.error('Error in global chat messages listener:', error);
          callback([]);
        }
      );
    } catch (error: any) {
      console.error('Failed to set up global chat messages listener:', error.message);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
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

  // Friend management methods
  async getUserFriends(userId: string): Promise<any[]> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const friendsIds = userData.friends || [];

        // Get friend details using batched reads
        const friends = await this.getFriendsBatch(friendsIds, userData);
        return friends;
      }

      return [];
    } catch (error: any) {
      console.error('Failed to get user friends:', error.message);
      return [];
    }
  }

  private getUserStatus(lastSeen: Timestamp): 'online' | 'offline' | 'busy' | 'idle' {
    if (!lastSeen) return 'offline';

    const now = Timestamp.now();
    const diffMinutes = (now.toMillis() - lastSeen.toMillis()) / (1000 * 60);

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'idle';
    return 'offline';
  }

  async addFriend(userId: string, friendId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const friendRef = doc(db, 'users', friendId);

        // Read both user documents to verify they exist
        const userDoc = await transaction.get(userRef);
        const friendDoc = await transaction.get(friendRef);

        if (!userDoc.exists()) {
          throw new Error(`User ${userId} does not exist`);
        }
        if (!friendDoc.exists()) {
          throw new Error(`User ${friendId} does not exist`);
        }

        // Update both documents within the same transaction
        transaction.update(userRef, {
          friends: arrayUnion(friendId),
          updatedAt: serverTimestamp()
        });

        transaction.update(friendRef, {
          friends: arrayUnion(userId),
          updatedAt: serverTimestamp()
        });
      });
    } catch (error: any) {
      console.error('Failed to add friend:', error.message);
      throw error;
    }
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const friendRef = doc(db, 'users', friendId);

        // Read both user documents to verify they exist
        const userDoc = await transaction.get(userRef);
        const friendDoc = await transaction.get(friendRef);

        if (!userDoc.exists()) {
          throw new Error(`User ${userId} does not exist`);
        }
        if (!friendDoc.exists()) {
          throw new Error(`User ${friendId} does not exist`);
        }

        // Update both documents within the same transaction
        transaction.update(userRef, {
          friends: arrayRemove(friendId),
          updatedAt: serverTimestamp()
        });

        transaction.update(friendRef, {
          friends: arrayRemove(userId),
          updatedAt: serverTimestamp()
        });
      });
    } catch (error: any) {
      console.error('Failed to remove friend:', error.message);
      throw error;
    }
  }

  // Helper method for batched friend reads
  private async getFriendsBatch(friendsIds: string[], userData: any): Promise<any[]> {
    if (friendsIds.length === 0) return [];

    // Process friends in chunks to avoid hitting Firestore limits
    const CHUNK_SIZE = 10;
    const chunks = [];
    for (let i = 0; i < friendsIds.length; i += CHUNK_SIZE) {
      chunks.push(friendsIds.slice(i, i + CHUNK_SIZE));
    }

    const allFriends = [];

    // Process each chunk
    for (const chunk of chunks) {
      // Create document references for this chunk
      const friendRefs = chunk.map(friendId => doc(db, 'users', friendId));

      // Batch read all documents in this chunk
      const friendSnaps = await Promise.all(friendRefs.map(ref => getDoc(ref)));

      // Process results
      for (let i = 0; i < friendSnaps.length; i++) {
        const friendSnap = friendSnaps[i];
        const friendId = chunk[i];

        if (friendSnap.exists()) {
          const friendData = friendSnap.data();

          // Compute isCloseFriend from actual data
          const closeFriendsIds = userData.closeFriends || [];
          const isCloseFriend = Array.isArray(closeFriendsIds) && closeFriendsIds.includes(friendId);

          allFriends.push({
            id: friendId,
            name: friendData.displayName,
            avatar: friendData.photoURL || 'https://randomuser.me/api/portraits/lego/1.jpg',
            status: this.getUserStatus(friendData.lastSeen),
            isCloseFriend: isCloseFriend
          });
        }
      }
    }

    return allFriends;
  }

  // Real-time listener for user's friends
  onUserFriends(userId: string, callback: (friends: any[]) => void): () => void {
    const userRef = doc(db, 'users', userId);

    return onSnapshot(userRef, async (userSnap) => {
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const friendsIds = userData.friends || [];

        // Get friend details using batched reads
        const friends = await this.getFriendsBatch(friendsIds, userData);
        callback(friends);
      } else {
        callback([]);
      }
    });
  }
}

export const firestoreService = new FirestoreService();
export default firestoreService; 