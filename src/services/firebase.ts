import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration for VuluGO
const firebaseConfig = {
  apiKey: "AIzaSyBHL5BpkQRDe-03hE5-7TYcbr2aad1ezqg",
  authDomain: "vulugo.firebaseapp.com",
  projectId: "vulugo",
  storageBucket: "vulugo.firebasestorage.app",
  messagingSenderId: "876918371895",
  appId: "1:876918371895:web:49d57bd00939d49889b1b2",
  measurementId: "G-LLTSS9NFCD"
};

// Firebase service instances
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Initialization status
let initializationAttempted = false;
let initializationError: Error | null = null;

/**
 * Initialize Firebase services with comprehensive error handling
 */
const initializeFirebase = (): { success: boolean; error?: Error } => {
  if (initializationAttempted) {
    return { success: !!app, error: initializationError };
  }

  initializationAttempted = true;

  try {
    console.log('🔥 Initializing Firebase services...');

    // Initialize Firebase app
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');

    // Initialize Auth with persistence
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
      console.log('✅ Firebase Auth initialized with AsyncStorage persistence');
    } catch (authError: any) {
      // Handle case where auth is already initialized
      if (authError.code === 'auth/already-initialized') {
        auth = getAuth(app);
        console.log('✅ Firebase Auth already initialized, using existing instance');
      } else {
        throw authError;
      }
    }

    // Initialize Firestore
    db = getFirestore(app);
    console.log('✅ Firestore initialized');

    // Initialize Storage
    storage = getStorage(app);
    console.log('✅ Firebase Storage initialized');

    // Development environment setup
    if (__DEV__) {
      console.log('🔧 Development mode: Firebase services ready');
      // Note: Emulator connection would go here if needed
      // connectFirestoreEmulator(db, 'localhost', 8080);
    }

    console.log('🎉 All Firebase services initialized successfully');
    return { success: true };

  } catch (error: any) {
    console.error('❌ Firebase initialization failed:', error);
    initializationError = error;

    // Reset services to null on failure
    app = null;
    auth = null;
    db = null;
    storage = null;

    return { success: false, error };
  }
};

/**
 * Get Firebase services with initialization check
 */
export const getFirebaseServices = () => {
  const result = initializeFirebase();

  if (!result.success) {
    console.warn('⚠️ Firebase services not available:', result.error?.message);
  }

  return {
    app,
    auth,
    db,
    storage,
    isInitialized: result.success,
    initializationError: result.error
  };
};

/**
 * Check if Firebase is properly initialized
 */
export const isFirebaseInitialized = (): boolean => {
  return !!app && !!auth && !!db && !!storage;
};

/**
 * Get initialization status and error details
 */
export const getFirebaseStatus = () => {
  return {
    attempted: initializationAttempted,
    initialized: isFirebaseInitialized(),
    error: initializationError,
    services: {
      app: !!app,
      auth: !!auth,
      db: !!db,
      storage: !!storage
    }
  };
};

// Initialize Firebase immediately
const initResult = initializeFirebase();

// Export services (may be null if initialization failed)
export { auth, db, storage };
export default app;