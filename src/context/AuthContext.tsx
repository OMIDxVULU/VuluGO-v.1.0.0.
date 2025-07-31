import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      if (!mounted) return;
      
      setUser(user);
      
      if (user) {
        // Get user profile from Firestore
        try {
          const profile = await firestoreService.getUser(user.uid);
          if (mounted) {
            if (profile) {
              setUserProfile(profile);
            } else {
              // Create new user profile
              const newProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'User',
                photoURL: user.photoURL,
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
          if (mounted && user) {
            const defaultProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'User',
              photoURL: user.photoURL,
              gold: 1000,
              gems: 50,
              level: 1,
            };
            setUserProfile(defaultProfile);
          }
        }
      } else {
        if (mounted) {
          setUserProfile(null);
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
      await authService.signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      await authService.signUp(email, password, displayName);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      throw error;
    }
  };

  const updateUserProfile = async (updates: any) => {
    if (!user) return;
    
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
    signIn,
    signUp,
    signOut,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 