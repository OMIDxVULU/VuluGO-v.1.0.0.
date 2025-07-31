import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { authService, GuestUser } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

interface AuthContextType {
  user: User | GuestUser | null;
  userProfile: any | null;
  loading: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | GuestUser | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const unsubscribe = authService.onAuthStateChange(async (firebaseUser) => {
      if (!mounted) return;
      
      if (firebaseUser) {
        // Regular Firebase user
        setUser(firebaseUser);
        setIsGuest(false);
        
        // Get user profile from Firestore
        try {
          const profile = await firestoreService.getUser(firebaseUser.uid);
          if (mounted) {
            if (profile) {
              setUserProfile(profile);
            } else {
              // Create new user profile
              const newProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || 'User',
                photoURL: firebaseUser.photoURL,
                gold: 1000,
                gems: 50,
                level: 1,
              };
              try {
                await firestoreService.createUser(newProfile);
                if (mounted) {
                  setUserProfile(newProfile);
                }
              } catch (createError) {
                console.error('Error creating user profile:', createError);
                // Set a default profile even if creation fails
                if (mounted) {
                  setUserProfile(newProfile);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Set a default profile even if loading fails
          if (mounted && firebaseUser) {
            const defaultProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL,
              gold: 1000,
              gems: 50,
              level: 1,
            };
            setUserProfile(defaultProfile);
          }
        }
      } else {
        // Check for guest user in AsyncStorage
        try {
          const guestUser = await authService.getGuestUser();
          if (guestUser && mounted) {
            setUser(guestUser);
            setIsGuest(true);
            
            // Create guest profile
            const guestProfile = {
              uid: guestUser.uid,
              email: null,
              displayName: 'Guest',
              username: 'guest',
              photoURL: 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=G', // Purple default avatar
              gold: 500, // Limited gold for guests
              gems: 10,  // Limited gems for guests
              level: 1,
              isGuest: true,
              guestId: guestUser.guestId,
            };
            setUserProfile(guestProfile);
          } else if (mounted) {
            setUser(null);
            setUserProfile(null);
            setIsGuest(false);
          }
        } catch (error) {
          console.error('Error loading guest user:', error);
          if (mounted) {
            setUser(null);
            setUserProfile(null);
            setIsGuest(false);
          }
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Clear any existing guest session
      await authService.clearGuestUser();
      await authService.signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      // Clear any existing guest session
      await authService.clearGuestUser();
      await authService.signUp(email, password, displayName);
    } catch (error) {
      throw error;
    }
  };

  const signInAsGuest = async () => {
    try {
      // Clear any existing Firebase session
      await authService.signOut();
      
      const guestUser = await authService.signInAsGuest();
      setUser(guestUser);
      setIsGuest(true);
      
      // Create guest profile
      const guestProfile = {
        uid: guestUser.uid,
        email: null,
        displayName: 'Guest',
        username: 'guest',
        photoURL: 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=G', // Purple default avatar
        gold: 500, // Limited gold for guests
        gems: 10,  // Limited gems for guests
        level: 1,
        isGuest: true,
        guestId: guestUser.guestId,
      };
      setUserProfile(guestProfile);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear guest user state immediately
      setUser(null);
      setUserProfile(null);
      setIsGuest(false);
      
      // Then clear the actual session
      await authService.signOut();
    } catch (error) {
      throw error;
    }
  };

  const updateUserProfile = async (updates: any) => {
    if (!user) return;
    
    // Don't allow guest users to update their profile
    if (isGuest) {
      console.warn('Guest users cannot update their profile');
      return;
    }
    
    try {
      await firestoreService.updateUser(user.uid, updates);
      setUserProfile(prev => ({ ...prev, ...updates }));
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isGuest,
    signIn,
    signUp,
    signInAsGuest,
    signOut,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 