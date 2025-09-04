/**
 * Test Authenticated Firebase Operations
 * Tests live streaming and gaming features with authentication
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc,
  doc,
  getDocs,
  query,
  limit,
  where
} = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyBHL5BpkQRDe-03hE5-7TYcbr2aad1ezqg",
  authDomain: "vulugo.firebaseapp.com",
  projectId: "vulugo",
  storageBucket: "vulugo.appspot.com",
  messagingSenderId: "876918371895",
  appId: "1:876918371895:web:49d57bd00939d49889b1b2",
  measurementId: "G-LLTSS9NFCD"
};

async function testAuthenticatedOperations() {
  console.log('🔐 Testing Authenticated Firebase Operations');
  console.log('===========================================');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  // Test 1: Try to sign in with existing user
  console.log('\n🔑 Test 1: Authentication');
  console.log('-------------------------');
  
  try {
    // Try to sign in with a test account (you may need to create this)
    const testEmail = 'test@vulugo.com';
    const testPassword = 'testpassword123';
    
    let user;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
      user = userCredential.user;
      console.log(`✅ Signed in successfully: ${user.uid}`);
    } catch (signInError) {
      if (signInError.code === 'auth/user-not-found') {
        console.log('ℹ️  Test user not found, creating new test user...');
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
          user = userCredential.user;
          console.log(`✅ Created and signed in test user: ${user.uid}`);
        } catch (createError) {
          console.log(`❌ Failed to create test user: ${createError.message}`);
          return;
        }
      } else {
        console.log(`❌ Sign in failed: ${signInError.message}`);
        return;
      }
    }
    
    // Test 2: Test Stream Creation
    console.log('\n🎥 Test 2: Stream Creation');
    console.log('--------------------------');
    
    try {
      const testStreamData = {
        title: 'Test Stream - Authenticated',
        hostId: user.uid,
        hostName: user.displayName || 'Test User',
        isActive: true,
        createdAt: new Date(),
        participants: [{
          id: user.uid,
          name: user.displayName || 'Test User',
          isHost: true,
          joinedAt: new Date()
        }]
      };
      
      const streamsRef = collection(db, 'streams');
      const docRef = await addDoc(streamsRef, testStreamData);
      
      console.log(`✅ Stream creation successful: ${docRef.id}`);
      
      // Clean up test stream
      await deleteDoc(doc(db, 'streams', docRef.id));
      console.log('🧹 Test stream cleaned up');
      
    } catch (streamError) {
      console.log(`❌ Stream creation failed: ${streamError.message}`);
      if (streamError.code === 'permission-denied') {
        console.log('🚨 PERMISSION DENIED: Stream creation rules may need adjustment');
      }
    }
    
    // Test 3: Test Gaming Collections
    console.log('\n🎮 Test 3: Gaming Collections Access');
    console.log('------------------------------------');
    
    const gamingCollections = ['userGameProfiles', 'miningStats', 'slotsStats', 'goldMinerStats'];
    
    for (const collectionName of gamingCollections) {
      try {
        // Try to read user's own gaming data
        const collectionRef = collection(db, collectionName);
        const userQuery = query(collectionRef, where('userId', '==', user.uid), limit(1));
        const snapshot = await getDocs(userQuery);
        
        console.log(`✅ ${collectionName}: Read access successful (${snapshot.size} documents)`);
        
        // Try to create a test document
        try {
          const testData = {
            userId: user.uid,
            testField: 'test-value',
            createdAt: new Date()
          };
          
          const docRef = await addDoc(collectionRef, testData);
          console.log(`✅ ${collectionName}: Write access successful`);
          
          // Clean up
          await deleteDoc(doc(db, collectionName, docRef.id));
          console.log(`🧹 ${collectionName}: Test document cleaned up`);
          
        } catch (writeError) {
          console.log(`❌ ${collectionName}: Write failed - ${writeError.message}`);
        }
        
      } catch (readError) {
        console.log(`❌ ${collectionName}: Read failed - ${readError.message}`);
      }
    }
    
    // Test 4: Test Shop Collections
    console.log('\n🛒 Test 4: Shop Collections Access');
    console.log('----------------------------------');
    
    try {
      // Test userInventory access
      const inventoryRef = collection(db, 'userInventory');
      const userInventoryQuery = query(inventoryRef, where('userId', '==', user.uid), limit(1));
      const inventorySnapshot = await getDocs(userInventoryQuery);
      
      console.log(`✅ userInventory: Read access successful (${inventorySnapshot.size} documents)`);
      
      // Test products read access (should be public)
      const productsRef = collection(db, 'products');
      const productsQuery = query(productsRef, limit(1));
      const productsSnapshot = await getDocs(productsQuery);
      
      console.log(`✅ products: Public read access successful (${productsSnapshot.size} documents)`);
      
    } catch (shopError) {
      console.log(`❌ Shop collections error: ${shopError.message}`);
    }
    
    console.log('\n🎉 Authenticated operations test complete!');
    
    // Sign out
    await auth.signOut();
    console.log('👋 Signed out successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthenticatedOperations().catch(console.error);
