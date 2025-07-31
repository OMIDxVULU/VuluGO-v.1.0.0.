import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

// Initialize Firebase only once
let app;
let auth;
let db;
let storage;

try {
  // Check if Firebase is already initialized
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  
  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.warn('Firebase initialization error:', error);
  // Create fallback objects if Firebase fails
  auth = null;
  db = null;
  storage = null;
}

export { auth, db, storage };
export default app; 