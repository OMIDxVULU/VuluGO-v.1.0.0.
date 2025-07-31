import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';

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

  // Generate unique guest ID
  private generateGuestId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `guest_${timestamp}_${randomStr}`;
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

      // Store guest user in memory
      this.guestUserStorage = guestUser;

      return guestUser;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // Get guest user from memory
  async getGuestUser(): Promise<GuestUser | null> {
    return this.guestUserStorage;
  }

  // Clear guest user data
  async clearGuestUser(): Promise<void> {
    this.guestUserStorage = null;
  }

  // Check if current user is guest
  isGuestUser(user: User | GuestUser | null): boolean {
    if (!user) return false;
    return 'isGuest' in user && user.isGuest === true;
  }

  // Sign up with email and password
  async signUp(email: string, password: string, displayName?: string): Promise<AuthUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
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