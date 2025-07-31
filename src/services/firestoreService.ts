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
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Types
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  gold: number;
  gems: number;
  level: number;
  createdAt: Timestamp;
  lastSeen: Timestamp;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  message: string;
  timestamp: Timestamp;
  type: 'text' | 'gift' | 'system';
}

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
  async createUser(userData: Omit<User, 'createdAt' | 'lastSeen'>): Promise<void> {
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

  async getUser(uid: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as User;
      }
      return null;
    } catch (error: any) {
      console.warn('Failed to get user from Firestore:', error.message);
      return null;
    }
  }

  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
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

  // Live stream operations
  async createStream(streamData: Omit<LiveStream, 'id' | 'startedAt' | 'viewerCount'>): Promise<string> {
    try {
      const streamRef = await addDoc(collection(db, 'streams'), {
        ...streamData,
        isLive: true,
        viewerCount: 0,
        startedAt: serverTimestamp()
      });
      return streamRef.id;
    } catch (error: any) {
      throw new Error(`Failed to create stream: ${error.message}`);
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
}

export const firestoreService = new FirestoreService();
export default firestoreService; 