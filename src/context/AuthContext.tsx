import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, GuestUser } from '../services/authService';
import { firestoreService } from '../services/firestoreService';
import { sessionService } from '../services/sessionService';
// Import socialAuthService dynamically to avoid Google Sign-In errors in Expo Go
let socialAuthService: any = null;
try {
  socialAuthService = require('../services/socialAuthService').socialAuthService;
} catch (error) {
  console.warn('Social auth service not available');
}
import { biometricAuthService } from '../services/biometricAuthService';
import { securityService } from '../services/securityService';

interface AuthContextType {
  user: User | GuestUser | null;
  userProfile: any | null;
  loading: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, username: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthCache: () => Promise<void>; // ADDED: For debugging automatic sign-in issues
  updateUserProfile: (updates: any) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  isEmailVerified: () => boolean;
  updateUserEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  deleteAccount: (currentPassword: string) => Promise<void>;
  updateActivity: () => void;
  getSessionData: () => any;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  getSocialAuthMethods: () => { google: boolean; apple: boolean };
  // Onboarding methods
  completeOnboarding: (onboardingData: any) => Promise<void>;
  isOnboardingComplete: () => Promise<boolean>;
  enableBiometricAuth: () => Promise<boolean>;
  disableBiometricAuth: () => Promise<void>;
  signInWithBiometrics: () => Promise<boolean>;
  isBiometricAuthAvailable: () => Promise<boolean>;
  getBiometricTypeDescription: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Safe version of useAuth that returns null instead of throwing
// Use this in components that might render before AuthProvider is ready
export const useAuthSafe = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.warn('⚠️ useAuthSafe: AuthProvider not available yet');
    return null;
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// CRITICAL FIX: Helper functions for iOS Simulator AsyncStorage errors
const isSimulatorStorageError = (error: any): boolean => {
  if (!error || typeof error !== 'object') return false;

  const errorMessage = error.message || '';
  const errorString = error.toString() || '';

  // Check for iOS Simulator specific storage errors
  return (
    errorMessage.includes('Failed to create storage directory') ||
    errorMessage.includes('Failed to delete storage directory') ||
    errorMessage.includes('NSCocoaErrorDomain') ||
    errorMessage.includes('NSPOSIXErrorDomain') ||
    errorMessage.includes('ExponentExperienceData') ||
    errorMessage.includes('@anonymous') ||
    errorMessage.includes('RCTAsyncLocalStorage') ||
    errorMessage.includes('Not a directory') ||
    errorMessage.includes('No such file or directory') ||
    errorString.includes('storage directory')
  );
};

// Safe AsyncStorage wrapper that handles corruption
const safeAsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    if ((global as any).__STORAGE_BYPASS_MODE__) {
      console.warn(`🚧 Storage bypass: getItem(${key}) returning null`);
      return null;
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      if (isSimulatorStorageError(error)) {
        console.warn(`🚧 Storage error on getItem(${key}), enabling bypass mode`);
        (global as any).__STORAGE_BYPASS_MODE__ = true;
        return null;
      }
      throw error;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if ((global as any).__STORAGE_BYPASS_MODE__) {
      console.warn(`🚧 Storage bypass: setItem(${key}) ignored`);
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      if (isSimulatorStorageError(error)) {
        console.warn(`🚧 Storage error on setItem(${key}), enabling bypass mode`);
        (global as any).__STORAGE_BYPASS_MODE__ = true;
        return;
      }
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    if ((global as any).__STORAGE_BYPASS_MODE__) {
      console.warn(`🚧 Storage bypass: removeItem(${key}) ignored`);
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (isSimulatorStorageError(error)) {
        console.warn(`🚧 Storage error on removeItem(${key}), enabling bypass mode`);
        (global as any).__STORAGE_BYPASS_MODE__ = true;
        return;
      }
      throw error;
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    if ((global as any).__STORAGE_BYPASS_MODE__) {
      console.warn(`🚧 Storage bypass: multiRemove ignored`);
      return;
    }

    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      if (isSimulatorStorageError(error)) {
        console.warn(`🚧 Storage error on multiRemove, enabling bypass mode`);
        (global as any).__STORAGE_BYPASS_MODE__ = true;
        return;
      }
      throw error;
    }
  }
};

// Enhanced storage corruption recovery with multiple fallback strategies
const handleSimulatorStorageError = async (): Promise<void> => {
  console.log('🔧 Starting enhanced iOS Simulator storage recovery...');

  // Strategy 1: Try gentle AsyncStorage clear
  try {
    console.log('📋 Strategy 1: Attempting AsyncStorage.clear()...');
    await AsyncStorage.clear();
    console.log('✅ AsyncStorage cleared successfully');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test if storage is working now
    await AsyncStorage.setItem('__test_key__', 'test');
    await AsyncStorage.removeItem('__test_key__');
    console.log('✅ Storage recovery successful - AsyncStorage is working');
    return;
  } catch (clearError) {
    console.warn('❌ Strategy 1 failed:', clearError);
  }

  // Strategy 2: Try individual key removal
  try {
    console.log('📋 Strategy 2: Attempting individual key removal...');
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
      console.log('✅ Individual keys removed successfully');
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }
  } catch (removeError) {
    console.warn('❌ Strategy 2 failed:', removeError);
  }

  // Strategy 3: Enable storage bypass mode for development
  if (__DEV__) {
    console.log('📋 Strategy 3: Enabling development storage bypass mode...');

    // Set a global flag to bypass AsyncStorage operations
    (global as any).__STORAGE_BYPASS_MODE__ = true;

    console.warn('🚧 DEVELOPMENT MODE: AsyncStorage bypass enabled');
    console.warn('💡 App will continue without persistent storage');
    console.warn('🔄 Manual simulator reset recommended:');
    console.warn('   1. Close iOS Simulator completely');
    console.warn('   2. Run: xcrun simctl shutdown all && xcrun simctl erase all');
    console.warn('   3. Restart: npx expo start --clear');

    return;
  }

  // Strategy 4: Production fallback (should not happen)
  console.error('❌ All storage recovery strategies failed');
  throw new Error('Critical storage corruption - manual intervention required');
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | GuestUser | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;
    let loadingTimeout: ReturnType<typeof setTimeout>;

    // Initialize session service
    const initializeSession = async () => {
      await sessionService.initialize(() => {
        // Session expired callback
        if (mounted) {
          console.log('Session expired, signing out user');
          signOut();
        }
      });
    };

    initializeSession();

    // Set a maximum loading time to prevent infinite loading states
    loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Authentication loading timeout, setting loading to false');
        setLoading(false);
      }
    }, 15000); // 15 second timeout

    const unsubscribe = authService.onAuthStateChange(async (firebaseUser) => {
      if (!mounted) return;

      // Clear timeout since we got a response
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      
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
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'User',
                photoURL: firebaseUser.photoURL || undefined,
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
        // CRITICAL FIX: Disable automatic sign-in - always require explicit user choice
        console.log('🚫 No Firebase user found - requiring explicit authentication choice');

        if (mounted) {
          // Always set to signed out state - no automatic guest sign-in
          setUser(null);
          setUserProfile(null);
          setIsGuest(false);
          console.log('✅ User state cleared - authentication selection required');
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      unsubscribe();
      sessionService.cleanup();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const userIdentifier = email.toLowerCase().trim();

    try {
      // Check if account is locked
      const lockInfo = await securityService.isAccountLocked(userIdentifier);
      if (lockInfo.isLocked) {
        const remainingTime = lockInfo.lockUntil ? Math.ceil((lockInfo.lockUntil - Date.now()) / 1000 / 60) : 0;
        throw new Error(`Account temporarily locked due to too many failed attempts. Please try again in ${remainingTime} minutes.`);
      }

      // Log login attempt
      await securityService.logSecurityEvent({
        type: 'login_attempt',
        userIdentifier,
      });

      // Clear any existing guest session
      await authService.clearGuestUser();
      await authService.signIn(email, password);

      // Clear failed attempts on successful login
      await securityService.clearFailedAttempts(userIdentifier);

      // Log successful login
      await securityService.logSecurityEvent({
        type: 'login_success',
        userIdentifier,
      });

      // Start new session
      await sessionService.startSession();
    } catch (error: any) {
      // Log failed login attempt
      await securityService.logSecurityEvent({
        type: 'login_failure',
        userIdentifier,
        details: { error: error.message },
      });

      // Record failed attempt and check if account should be locked
      const isLocked = await securityService.recordFailedAttempt(userIdentifier);

      if (isLocked) {
        throw new Error('Too many failed login attempts. Your account has been temporarily locked for security.');
      }

      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string, username: string) => {
    const userIdentifier = email.toLowerCase().trim();

    try {
      // Log signup attempt
      await securityService.logSecurityEvent({
        type: 'signup_attempt',
        userIdentifier,
        details: { username, displayName },
      });

      // Clear any existing guest session
      await authService.clearGuestUser();
      await authService.signUp(email, password, displayName, username);

      // Start new session
      await sessionService.startSession();
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

      // CRITICAL FIX: Clear ALL cached authentication data with error handling
      await safeAsyncStorage.multiRemove([
        'guestUser',
        'userProfile',
        'authToken',
        'lastLoginMethod',
        'biometricEnabled',
        'rememberMe'
      ]);

      // End session
      await sessionService.endSession();

      // Sign out from social providers
      if (socialAuthService) {
        await socialAuthService.signOut();
      }

      // Clear biometric data if user is signing out
      await biometricAuthService.clearBiometricData();

      // Then clear the actual session
      await authService.signOut();

      console.log('✅ User signed out successfully and cache cleared');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  };

  // ADDED: Clear all authentication cache (for debugging automatic sign-in issues)
  const clearAuthCache = async (): Promise<void> => {
    try {
      console.log('🧹 Clearing all authentication cache...');

      // Clear AsyncStorage with enhanced error handling
      await safeAsyncStorage.multiRemove([
        'guestUser',
        'userProfile',
        'authToken',
        'lastLoginMethod',
        'biometricEnabled',
        'rememberMe'
      ]);

      // Sign out from Firebase
      await authService.signOut();

      // Clear state
      setUser(null);
      setUserProfile(null);
      setIsGuest(false);

      console.log('✅ Authentication cache cleared completely');
    } catch (error: any) {
      console.error('❌ Error clearing auth cache:', error);
      // Still try to clear state even if storage operations fail
      setUser(null);
      setUserProfile(null);
      setIsGuest(false);
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

  const sendPasswordResetEmail = async (email: string) => {
    try {
      await authService.sendPasswordResetEmail(email);
    } catch (error) {
      throw error;
    }
  };

  const sendEmailVerification = async () => {
    try {
      await authService.sendEmailVerification();
    } catch (error) {
      throw error;
    }
  };

  const isEmailVerified = (): boolean => {
    return authService.isEmailVerified();
  };

  const updateUserEmail = async (newEmail: string, currentPassword: string) => {
    try {
      await authService.updateEmail(newEmail, currentPassword);
      // Update local user profile
      if (userProfile) {
        setUserProfile(prev => ({ ...prev, email: newEmail }));
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteAccount = async (currentPassword: string) => {
    try {
      await authService.deleteAccount(currentPassword);
      // End session
      await sessionService.endSession();
      // Clear local state
      setUser(null);
      setUserProfile(null);
      setIsGuest(false);
    } catch (error) {
      throw error;
    }
  };

  const updateActivity = () => {
    sessionService.updateActivity();
  };

  const getSessionData = () => {
    return sessionService.getSessionData();
  };

  const signInWithGoogle = async () => {
    if (!socialAuthService) {
      throw new Error('Google Sign-In is not available. Please use a development build to enable Google Sign-In functionality.');
    }
    try {
      await socialAuthService.signInWithGoogle();
      // Start new session
      await sessionService.startSession();
    } catch (error) {
      throw error;
    }
  };

  const signInWithApple = async () => {
    if (!socialAuthService) {
      throw new Error('Social authentication is not available.');
    }
    try {
      await socialAuthService.signInWithApple();
      // Start new session
      await sessionService.startSession();
    } catch (error) {
      throw error;
    }
  };

  const getSocialAuthMethods = () => {
    if (!socialAuthService) {
      return { google: false, apple: false }; // No social auth methods available when service is missing
    }
    return socialAuthService.getAvailableMethods();
  };

  const enableBiometricAuth = async (): Promise<boolean> => {
    try {
      if (!user || isGuest) {
        throw new Error('Please sign in to enable biometric authentication');
      }

      const email = userProfile?.email || user.email;
      if (!email) {
        throw new Error('No email address found for user');
      }

      // Check if biometric enrollment exists on device
      const capabilities = await biometricAuthService.getCapabilities();
      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        throw new Error('No biometric enrollment found on this device');
      }

      return await biometricAuthService.enableBiometricAuth(email, user.uid);
    } catch (error) {
      throw error;
    }
  };

  const disableBiometricAuth = async (): Promise<void> => {
    try {
      await biometricAuthService.disableBiometricAuth();
    } catch (error) {
      throw error;
    }
  };

  const signInWithBiometrics = async (): Promise<boolean> => {
    try {
      const result = await biometricAuthService.authenticateWithBiometrics();

      if (result.success && result.userEmail && result.userId) {
        // TODO: Implement secure credential retrieval and sign-in
        // This requires storing encrypted credentials or implementing a secure token system
        throw new Error('Biometric sign-in not fully implemented - secure credential storage required');
      }

      return false;
    } catch (error) {
      throw error;
    }
  };

  const isBiometricAuthAvailable = async (): Promise<boolean> => {
    try {
      return await biometricAuthService.shouldOfferBiometricAuth();
    } catch (error) {
      return false;
    }
  };

  const getBiometricTypeDescription = async (): Promise<string> => {
    try {
      return await biometricAuthService.getBiometricTypeDescription();
    } catch (error) {
      return 'Biometric Authentication';
    }
  };

  // Onboarding methods
  const completeOnboarding = async (onboardingData: any) => {
    try {
      // Update user profile with onboarding data
      if (user && userProfile) {
        const updates = {
          ...onboardingData,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        };
        await updateUserProfile(updates);
      }

      // Mark onboarding as complete in AsyncStorage
      await AsyncStorage.setItem('@onboarding_completed', 'true');
    } catch (error) {
      // Handle AsyncStorage errors gracefully in development environment
      if (error instanceof Error && error.message.includes('storage directory')) {
        console.warn('AsyncStorage unavailable in development environment, onboarding completion not persisted');
        // Don't throw error - allow onboarding to complete even if storage fails
      } else {
        console.error('Error completing onboarding:', error);
        throw error;
      }
    }
  };

  const isOnboardingComplete = async (): Promise<boolean> => {
    try {
      const completed = await AsyncStorage.getItem('@onboarding_completed');
      return completed === 'true';
    } catch (error) {
      // Handle AsyncStorage errors gracefully in development environment
      console.warn('AsyncStorage unavailable in development environment, defaulting to incomplete onboarding');
      return false;
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
    clearAuthCache, // ADDED: For debugging automatic sign-in issues
    updateUserProfile,
    sendPasswordResetEmail,
    sendEmailVerification,
    isEmailVerified,
    updateUserEmail,
    deleteAccount,
    updateActivity,
    getSessionData,
    signInWithGoogle,
    signInWithApple,
    getSocialAuthMethods,
    enableBiometricAuth,
    disableBiometricAuth,
    signInWithBiometrics,
    isBiometricAuthAvailable,
    getBiometricTypeDescription,
    completeOnboarding,
    isOnboardingComplete,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 