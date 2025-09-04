/**
 * Script to directly check Firebase streams collection
 * Run with: node src/scripts/checkFirebaseStreams.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy } = require('firebase/firestore');

// Firebase config (same as in your app)
const firebaseConfig = {
  apiKey: "AIzaSyBHL5BpkQRDe-03hE5-7TYcbr2aad1ezqg",
  authDomain: "vulugo.firebaseapp.com",
  projectId: "vulugo",
  storageBucket: "vulugo.appspot.com",
  messagingSenderId: "876918371895",
  appId: "1:876918371895:web:49d57bd00939d49889b1b2"
};

async function checkStreams() {
  try {
    console.log('🔍 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('📊 Checking all streams in database...');
    
    // Get all streams
    const allStreamsRef = collection(db, 'streams');
    const allStreamsQuery = query(allStreamsRef, orderBy('startedAt', 'desc'));
    const allSnapshot = await getDocs(allStreamsQuery);
    
    console.log(`\n📈 Total streams in database: ${allSnapshot.docs.length}`);
    
    // Get active streams
    const activeStreamsQuery = query(
      allStreamsRef, 
      where('isActive', '==', true), 
      orderBy('startedAt', 'desc')
    );
    const activeSnapshot = await getDocs(activeStreamsQuery);
    
    console.log(`🔴 Active streams (isActive: true): ${activeSnapshot.docs.length}`);
    
    // Show details of all streams
    console.log('\n📋 All streams details:');
    allSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const startedAt = data.startedAt ? new Date(data.startedAt).toLocaleString() : 'Unknown';
      const age = data.startedAt ? Math.round((Date.now() - data.startedAt) / 60000) : 'Unknown';
      
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   Title: ${data.title || 'No title'}`);
      console.log(`   Active: ${data.isActive}`);
      console.log(`   Started: ${startedAt} (${age} minutes ago)`);
      console.log(`   Host: ${data.hosts?.[0]?.name || 'Unknown'}`);
      console.log(`   Views: ${data.views || 0}`);
      console.log('');
    });
    
    // Show active streams specifically
    if (activeSnapshot.docs.length > 0) {
      console.log('\n🔴 Active streams details:');
      activeSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const startedAt = data.startedAt ? new Date(data.startedAt).toLocaleString() : 'Unknown';
        const age = data.startedAt ? Math.round((Date.now() - data.startedAt) / 60000) : 'Unknown';
        
        console.log(`${index + 1}. ${data.title || 'No title'} (${age} min ago)`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Host: ${data.hosts?.[0]?.name || 'Unknown'}`);
      });
    }
    
    console.log('\n✅ Database check complete');
    
  } catch (error) {
    console.error('❌ Error checking Firebase:', error);
  }
}

// Run the check
checkStreams();
