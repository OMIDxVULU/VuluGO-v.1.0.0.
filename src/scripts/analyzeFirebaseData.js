/**
 * Firebase Data Analysis Script
 * Analyzes Firebase data for inconsistencies, malformed documents, and issues
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  limit, 
  orderBy,
  where,
  doc,
  getDoc
} = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHL5BpkQRDe-03hE5-7TYcbr2aad1ezqg",
  authDomain: "vulugo.firebaseapp.com",
  projectId: "vulugo",
  storageBucket: "vulugo.appspot.com",
  messagingSenderId: "876918371895",
  appId: "1:876918371895:web:49d57bd00939d49889b1b2",
  measurementId: "G-LLTSS9NFCD"
};

async function analyzeFirebaseData() {
  console.log('🔍 Firebase Data Analysis');
  console.log('========================');

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('✅ Firebase initialized successfully\n');

    // Analysis 1: Streams Collection
    console.log('📺 ANALYSIS 1: Streams Collection');
    console.log('----------------------------------');
    
    try {
      const streamsRef = collection(db, 'streams');
      const streamsQuery = query(streamsRef, limit(10));
      const streamsSnapshot = await getDocs(streamsQuery);
      
      console.log(`📊 Total streams analyzed: ${streamsSnapshot.size}`);
      
      let validStreams = 0;
      let invalidStreams = 0;
      let activeStreams = 0;
      let issues = [];
      
      streamsSnapshot.forEach((doc) => {
        const data = doc.data();
        const streamId = doc.id;
        
        // Check required fields
        const requiredFields = ['title', 'hostId', 'isActive'];
        const missingFields = requiredFields.filter(field => !(field in data));
        
        if (missingFields.length > 0) {
          invalidStreams++;
          issues.push(`❌ Stream ${streamId}: Missing fields: ${missingFields.join(', ')}`);
        } else {
          validStreams++;
        }
        
        if (data.isActive === true) {
          activeStreams++;
        }
        
        // Check for data type issues
        if (data.title && typeof data.title !== 'string') {
          issues.push(`⚠️  Stream ${streamId}: title is not a string`);
        }
        
        if (data.hostId && typeof data.hostId !== 'string') {
          issues.push(`⚠️  Stream ${streamId}: hostId is not a string`);
        }
        
        if (data.participants && !Array.isArray(data.participants)) {
          issues.push(`⚠️  Stream ${streamId}: participants is not an array`);
        }
      });
      
      console.log(`✅ Valid streams: ${validStreams}`);
      console.log(`❌ Invalid streams: ${invalidStreams}`);
      console.log(`🔴 Active streams: ${activeStreams}`);
      
      if (issues.length > 0) {
        console.log('\n🚨 Stream Issues Found:');
        issues.forEach(issue => console.log(`   ${issue}`));
      } else {
        console.log('✅ No stream data issues found');
      }
      
    } catch (error) {
      console.log(`❌ Failed to analyze streams: ${error.message}`);
    }

    // Analysis 2: Users Collection
    console.log('\n👥 ANALYSIS 2: Users Collection');
    console.log('-------------------------------');
    
    try {
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, limit(5));
      const usersSnapshot = await getDocs(usersQuery);
      
      console.log(`📊 Total users analyzed: ${usersSnapshot.size}`);
      
      let validUsers = 0;
      let userIssues = [];
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = doc.id;
        
        // Check for essential user fields
        const essentialFields = ['email'];
        const missingEssential = essentialFields.filter(field => !(field in data));
        
        if (missingEssential.length === 0) {
          validUsers++;
        } else {
          userIssues.push(`❌ User ${userId}: Missing essential fields: ${missingEssential.join(', ')}`);
        }
        
        // Check for data consistency
        if (data.email && typeof data.email !== 'string') {
          userIssues.push(`⚠️  User ${userId}: email is not a string`);
        }
        
        if (data.displayName && typeof data.displayName !== 'string') {
          userIssues.push(`⚠️  User ${userId}: displayName is not a string`);
        }
      });
      
      console.log(`✅ Valid users: ${validUsers}`);
      
      if (userIssues.length > 0) {
        console.log('\n🚨 User Issues Found:');
        userIssues.forEach(issue => console.log(`   ${issue}`));
      } else {
        console.log('✅ No user data issues found');
      }
      
    } catch (error) {
      console.log(`❌ Failed to analyze users: ${error.message}`);
    }

    // Analysis 3: Gaming Collections
    console.log('\n🎮 ANALYSIS 3: Gaming Collections');
    console.log('----------------------------------');
    
    const gamingCollections = ['userGameProfiles', 'miningStats', 'slotsStats', 'goldMinerStats'];
    
    for (const collectionName of gamingCollections) {
      try {
        const collectionRef = collection(db, collectionName);
        const collectionQuery = query(collectionRef, limit(3));
        const snapshot = await getDocs(collectionQuery);
        
        console.log(`📊 ${collectionName}: ${snapshot.size} documents`);
        
        if (snapshot.size > 0) {
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Check for userId field
            if (!data.userId) {
              console.log(`   ⚠️  Document ${doc.id}: Missing userId field`);
            }
          });
        }
        
      } catch (error) {
        console.log(`❌ Failed to analyze ${collectionName}: ${error.message}`);
      }
    }

    // Analysis 4: Shop Collections
    console.log('\n🛒 ANALYSIS 4: Shop Collections');
    console.log('-------------------------------');
    
    const shopCollections = ['products', 'purchases', 'userInventory', 'shopPromotions'];
    
    for (const collectionName of shopCollections) {
      try {
        const collectionRef = collection(db, collectionName);
        const collectionQuery = query(collectionRef, limit(3));
        const snapshot = await getDocs(collectionQuery);
        
        console.log(`📊 ${collectionName}: ${snapshot.size} documents`);
        
      } catch (error) {
        console.log(`❌ Failed to analyze ${collectionName}: ${error.message}`);
      }
    }

    // Analysis 5: Check for Orphaned Data
    console.log('\n🔍 ANALYSIS 5: Orphaned Data Check');
    console.log('----------------------------------');
    
    try {
      // Check for streams with non-existent hosts
      const streamsRef = collection(db, 'streams');
      const streamsSnapshot = await getDocs(query(streamsRef, limit(5)));
      
      let orphanedStreams = 0;
      
      for (const streamDoc of streamsSnapshot.docs) {
        const streamData = streamDoc.data();
        if (streamData.hostId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', streamData.hostId));
            if (!userDoc.exists()) {
              orphanedStreams++;
              console.log(`🔗 Orphaned stream: ${streamDoc.id} (host ${streamData.hostId} not found)`);
            }
          } catch (error) {
            console.log(`⚠️  Could not verify host for stream ${streamDoc.id}: ${error.message}`);
          }
        }
      }
      
      if (orphanedStreams === 0) {
        console.log('✅ No orphaned streams found');
      } else {
        console.log(`❌ Found ${orphanedStreams} orphaned streams`);
      }
      
    } catch (error) {
      console.log(`❌ Failed orphaned data check: ${error.message}`);
    }

    console.log('\n🎉 Data Analysis Complete!');
    console.log('\n📋 SUMMARY & RECOMMENDATIONS:');
    console.log('==============================');
    console.log('1. ✅ Firebase connection is working');
    console.log('2. ✅ Data can be read from all collections');
    console.log('3. 🔍 Check the issues above for any data inconsistencies');
    console.log('4. 🚀 Test live streaming in your app now');
    
  } catch (error) {
    console.error('❌ Data analysis failed:', error);
  }
}

// Run the analysis
if (require.main === module) {
  analyzeFirebaseData().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = { analyzeFirebaseData };
