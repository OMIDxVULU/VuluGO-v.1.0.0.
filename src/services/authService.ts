import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { auth, getFirebaseServices, isFirebaseInitialized } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest?: boolean;
}

// Guest user interface
export interface GuestUser {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string;
  isGuest: true;
  guestId: string;
}

class AuthService {
  // In-memory storage for guest user (will be lost on app restart)
  private guestUserStorage: GuestUser | null = null;
  private readonly GUEST_USER_KEY = '@vulugo_guest_user';

  // Generate unique guest ID
  private generateGuestId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `guest_${timestamp}_${randomStr}`;
  }

  // Check if Firebase is ready for authentication operations
  private ensureFirebaseReady(): void {
    if (!isFirebaseInitialized()) {
      const status = getFirebaseServices();
      if (!status.isInitialized) {
        throw new Error(`Firebase not initialized: ${status.initializationError?.message || 'Unknown error'}`);
      }
    }
  }

  // Persist guest user to AsyncStorage
  private async persistGuestUser(guestUser: GuestUser): Promise<void> {
    try {
      await AsyncStorage.setItem(this.GUEST_USER_KEY, JSON.stringify(guestUser));
    } catch (error) {
      console.warn('Failed to persist guest user:', error);
    }
  }

  // Load guest user from AsyncStorage
  private async loadPersistedGuestUser(): Promise<GuestUser | null> {
    try {
      const stored = await AsyncStorage.getItem(this.GUEST_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load persisted guest user:', error);
      return null;
    }
  }

  // Clear persisted guest user
  private async clearPersistedGuestUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.GUEST_USER_KEY);
    } catch (error) {
      console.warn('Failed to clear persisted guest user:', error);
    }
  }

  // Sign in as guest
  async signInAsGuest(): Promise<GuestUser> {
    try {
      const guestId = this.generateGuestId();
      const guestUser: GuestUser = {
        uid: guestId,
        email: null,
        displayName: 'Guest',
        photoURL: 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=G', // Default guest avatar
        isGuest: true,
        guestId: guestId
      };

      // Store guest user in memory and persist to AsyncStorage
      this.guestUserStorage = guestUser;
      await this.persistGuestUser(guestUser);

      return guestUser;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // Get guest user from memory or AsyncStorage
  async getGuestUser(): Promise<GuestUser | null> {
    // First check memory
    if (this.guestUserStorage) {
      return this.guestUserStorage;
    }

    // Then check AsyncStorage
    const persisted = await this.loadPersistedGuestUser();
    if (persisted) {
      this.guestUserStorage = persisted;
      return persisted;
    }

    return null;
  }

  // Clear guest user data
  async clearGuestUser(): Promise<void> {
    this.guestUserStorage = null;
    await this.clearPersistedGuestUser();
  }

  // Check if current user is guest
  isGuestUser(user: User | GuestUser | null): boolean {
    if (!user) return false;
    return 'isGuest' in user && user.isGuest === true;
  }

  // Sign up with email and password
  async signUp(email: string, password: string, displayName?: string): Promise<AuthUser> {
    try {
      this.ensureFirebaseReady();

      if (!auth) {
        throw new Error('Firebase Auth not available');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Clear any guest user data when signing up
      await this.clearGuestUser();

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      this.ensureFirebaseReady();

      if (!auth) {
        throw new Error('Firebase Auth not available');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Clear any guest user data when signing in
      await this.clearGuestUser();

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      // Clear guest user data if signing out
      await this.clearGuestUser();
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
}

export const authService = new AuthService();
export default authService; 