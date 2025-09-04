#!/usr/bin/env node

/**
 * Cleanup Phantom Stream Script
 * This script directly cleans up the persistent phantom stream
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, serverTimestamp } = require('firebase/firestore');

// Optionally load environment variables from a .env file if present
try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional; ignore if not installed
}

// Firebase configuration - strict environment variable checks (no insecure defaults)
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ [CLEANUP] Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Provide Firebase config via environment variables or a secure secrets mechanism.');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

async function cleanupPhantomStream() {
  try {
    console.log('🔧 [CLEANUP] Initializing Firebase for phantom stream cleanup...');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Resolve phantom stream ID from env or CLI arg
    const cliArgId = process.argv.find((arg) => arg.startsWith('--id='))?.split('=')[1]
      || process.argv[2];
    const phantomStreamId = process.env.PHANTOM_STREAM_ID || cliArgId;

    if (!phantomStreamId) {
      console.error('❌ [CLEANUP] Missing phantom stream ID. Set PHANTOM_STREAM_ID env var or pass as --id=STREAM_ID');
      process.exit(1);
    }
    
    console.log(`🧹 [CLEANUP] Cleaning up phantom stream: ${phantomStreamId}`);
    
    // Mark the stream as inactive
    const streamRef = doc(db, 'streams', phantomStreamId);
    await updateDoc(streamRef, {
      isActive: false,
      endedAt: serverTimestamp(),
      endReason: 'phantom_cleanup',
      participants: [] // Clear participants
    });
    
    console.log(`✅ [CLEANUP] Successfully cleaned up phantom stream: ${phantomStreamId}`);
    console.log('🎉 [CLEANUP] Phantom stream should now be removed from the app!');
    
  } catch (error) {
    console.error('❌ [CLEANUP] Error cleaning up phantom stream:', error);
    
    if (error.code === 'permission-denied') {
      console.log('💡 [CLEANUP] Permission denied - you may need to:');
      console.log('1. Deploy the Firebase security rules');
      console.log('2. Or run this cleanup from within the app using debug functions');
    }
  }
}

// Run the cleanup
cleanupPhantomStream();
