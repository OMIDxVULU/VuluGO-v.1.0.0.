#!/usr/bin/env node

/**
 * Debug Script for Phantom Stream Analysis
 * This script will directly query Firebase to analyze phantom streams
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, getDoc, updateDoc } = require('firebase/firestore');

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
  console.error(`❌ [DEBUG] Missing required environment variables: ${missing.join(', ')}`);
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

async function debugPhantomStreams() {
  try {
    console.log('🔧 [DEBUG] Initializing Firebase for phantom stream analysis...');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('🔍 [DEBUG] Querying active streams from Firebase...');
    
    // Get all active streams
    const activeStreamsQuery = query(
      collection(db, 'streams'),
      where('isActive', '==', true)
    );
    
    const activeStreamsSnapshot = await getDocs(activeStreamsQuery);
    console.log(`📊 [DEBUG] Found ${activeStreamsSnapshot.size} active streams`);
    
    activeStreamsSnapshot.forEach((doc) => {
      const streamData = doc.data();
      const participants = streamData.participants || [];
      const hasHosts = participants.some(p => p.isHost);
      
      console.log(`\n🔍 [DEBUG] Stream ${doc.id}:`);
      console.log(`  - isActive: ${streamData.isActive}`);
      console.log(`  - title: ${streamData.title}`);
      console.log(`  - hostId: ${streamData.hostId}`);
      console.log(`  - participants: ${participants.length}`);
      console.log(`  - hasHosts: ${hasHosts}`);
      console.log(`  - startedAt: ${streamData.startedAt}`);
      console.log(`  - participants details:`, participants.map(p => ({ 
        id: p.id, 
        name: p.name, 
        isHost: p.isHost 
      })));
      
      // Check if this is a phantom stream
      const isPhantom = participants.length === 0 || !hasHosts;
      console.log(`  - IS PHANTOM: ${isPhantom ? '🚨 YES' : '✅ NO'}`);
      
      if (isPhantom) {
        console.log(`  - SHOULD BE CLEANED UP: This stream has no ${participants.length === 0 ? 'participants' : 'hosts'}`);
      }
    });
    
    // Also check for any inactive streams that might be showing up
    console.log('\n🔍 [DEBUG] Checking for recently inactive streams...');
    const allStreamsSnapshot = await getDocs(collection(db, 'streams'));
    
    let inactiveCount = 0;
    allStreamsSnapshot.forEach((doc) => {
      const streamData = doc.data();
      if (!streamData.isActive) {
        inactiveCount++;
        if (inactiveCount <= 5) { // Show first 5 inactive streams
          console.log(`📋 [DEBUG] Inactive stream ${doc.id}:`, {
            isActive: streamData.isActive,
            endedAt: streamData.endedAt,
            endReason: streamData.endReason,
            title: streamData.title
          });
        }
      }
    });
    
    console.log(`📊 [DEBUG] Total inactive streams: ${inactiveCount}`);
    
  } catch (error) {
    console.error('❌ [DEBUG] Error analyzing phantom streams:', error);
    console.log('\n💡 [DEBUG] Make sure to set your Firebase configuration in the script or environment variables.');
  }
}

// Run the debug analysis
debugPhantomStreams();
