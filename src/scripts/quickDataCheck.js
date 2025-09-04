/**
 * Quick Firebase Data Check
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBHL5BpkQRDe-03hE5-7TYcbr2aad1ezqg",
  authDomain: "vulugo.firebaseapp.com",
  projectId: "vulugo",
  storageBucket: "vulugo.appspot.com",
  messagingSenderId: "876918371895",
  appId: "1:876918371895:web:49d57bd00939d49889b1b2",
  measurementId: "G-LLTSS9NFCD"
};

async function quickCheck() {
  console.log('🔍 Quick Firebase Data Check');
  console.log('============================');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  // Check streams
  console.log('\n📺 Checking streams...');
  try {
    const streamsRef = collection(db, 'streams');
    const q = query(streamsRef, limit(3));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} streams`);
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.title || 'Untitled'} (${doc.id})`);
      console.log(`    Host: ${data.hostId || 'Unknown'}`);
      console.log(`    Active: ${data.isActive || false}`);
    });
  } catch (error) {
    console.log(`❌ Streams error: ${error.message}`);
  }
  
  // Check users
  console.log('\n👥 Checking users...');
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(2));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} users`);
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.displayName || data.email || 'Unknown'} (${doc.id})`);
    });
  } catch (error) {
    console.log(`❌ Users error: ${error.message}`);
  }
  
  // Check gaming collections
  console.log('\n🎮 Checking gaming collections...');
  const gamingCollections = ['userGameProfiles', 'miningStats', 'slotsStats'];
  
  for (const collectionName of gamingCollections) {
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, limit(1));
      const snapshot = await getDocs(q);
      console.log(`  ${collectionName}: ${snapshot.size} documents`);
    } catch (error) {
      console.log(`  ${collectionName}: Error - ${error.message}`);
    }
  }
  
  console.log('\n✅ Quick check complete!');
}

quickCheck().catch(console.error);
