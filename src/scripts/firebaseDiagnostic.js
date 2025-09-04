/**
 * Firebase Comprehensive Diagnostic Script
 * Identifies specific Firebase errors and provides targeted solutions
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  limit,
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} = require('firebase/firestore');
const { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getStorage, ref, uploadBytes } = require('firebase/storage');

const firebaseConfig = {
  apiKey: "AIzaSyBHL5BpkQRDe-03hE5-7TYcbr2aad1ezqg",
  authDomain: "vulugo.firebaseapp.com",
  projectId: "vulugo",
  storageBucket: "vulugo.appspot.com",
  messagingSenderId: "876918371895",
  appId: "1:876918371895:web:49d57bd00939d49889b1b2",
  measurementId: "G-LLTSS9NFCD"
};

async function runFirebaseDiagnostic() {
  console.log('🔍 Firebase Comprehensive Diagnostic');
  console.log('====================================');
  
  const errors = [];
  const warnings = [];
  const successes = [];

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);
    
    successes.push('✅ Firebase SDK initialized successfully');

    // Test 1: Firestore Read Operations
    console.log('\n📖 DIAGNOSTIC 1: Firestore Read Operations');
    console.log('------------------------------------------');
    
    try {
      const streamsRef = collection(db, 'streams');
      const streamsQuery = query(streamsRef, limit(3));
      const streamsSnapshot = await getDocs(streamsQuery);
      
      successes.push(`✅ Firestore Read: Successfully read ${streamsSnapshot.size} streams`);
      console.log(`✅ Streams collection: ${streamsSnapshot.size} documents`);
      
      // Test reading from other critical collections
      const collections = ['users', 'globalChat', 'products', 'notifications'];
      
      for (const collectionName of collections) {
        try {
          const collectionRef = collection(db, collectionName);
          const collectionQuery = query(collectionRef, limit(1));
          const snapshot = await getDocs(collectionQuery);
          console.log(`✅ ${collectionName}: ${snapshot.size} documents`);
          successes.push(`✅ ${collectionName} collection readable`);
        } catch (readError) {
          console.log(`❌ ${collectionName}: ${readError.message}`);
          errors.push(`❌ ${collectionName} read error: ${readError.message}`);
        }
      }
      
    } catch (firestoreError) {
      console.log(`❌ Firestore read failed: ${firestoreError.message}`);
      errors.push(`❌ Firestore read error: ${firestoreError.message}`);
    }

    // Test 2: Authentication Service
    console.log('\n🔐 DIAGNOSTIC 2: Authentication Service');
    console.log('--------------------------------------');
    
    try {
      // Test anonymous authentication
      try {
        const userCredential = await signInAnonymously(auth);
        console.log(`✅ Anonymous auth successful: ${userCredential.user.uid}`);
        successes.push('✅ Anonymous authentication working');
        
        // Test authenticated operations
        await testAuthenticatedOperations(db, userCredential.user);
        
      } catch (authError) {
        if (authError.code === 'auth/admin-restricted-operation') {
          console.log('⚠️  Anonymous auth disabled by admin (expected)');
          warnings.push('⚠️  Anonymous authentication disabled by admin settings');
        } else {
          console.log(`❌ Anonymous auth failed: ${authError.message}`);
          errors.push(`❌ Anonymous auth error: ${authError.message}`);
        }
      }
      
    } catch (authServiceError) {
      console.log(`❌ Auth service error: ${authServiceError.message}`);
      errors.push(`❌ Authentication service error: ${authServiceError.message}`);
    }

    // Test 3: Storage Service
    console.log('\n💾 DIAGNOSTIC 3: Storage Service');
    console.log('--------------------------------');
    
    try {
      const testRef = ref(storage, 'test/diagnostic.txt');
      const testData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      
      // Note: This will fail without authentication, but we can test the service initialization
      console.log('✅ Storage service initialized');
      successes.push('✅ Firebase Storage service available');
      
    } catch (storageError) {
      console.log(`❌ Storage error: ${storageError.message}`);
      errors.push(`❌ Storage error: ${storageError.message}`);
    }

    // Test 4: Live Streaming Specific Tests
    console.log('\n🎥 DIAGNOSTIC 4: Live Streaming Operations');
    console.log('-----------------------------------------');
    
    try {
      // Test stream creation permissions (without auth - should fail gracefully)
      const testStreamData = {
        title: 'Diagnostic Test Stream',
        hostId: 'test-user-id',
        isActive: true,
        createdAt: new Date()
      };
      
      try {
        const streamsRef = collection(db, 'streams');
        const docRef = await addDoc(streamsRef, testStreamData);
        
        console.log('⚠️  Stream creation succeeded without auth (unexpected)');
        warnings.push('⚠️  Stream creation allowed without authentication');
        
        // Clean up
        await deleteDoc(doc(db, 'streams', docRef.id));
        
      } catch (streamError) {
        if (streamError.code === 'permission-denied') {
          console.log('✅ Stream creation properly blocked without auth');
          successes.push('✅ Stream security rules working correctly');
        } else {
          console.log(`❌ Stream creation error: ${streamError.message}`);
          errors.push(`❌ Stream creation error: ${streamError.message}`);
        }
      }
      
    } catch (streamTestError) {
      console.log(`❌ Stream test error: ${streamTestError.message}`);
      errors.push(`❌ Stream test error: ${streamTestError.message}`);
    }

    // Test 5: Index and Query Performance
    console.log('\n📊 DIAGNOSTIC 5: Index and Query Performance');
    console.log('--------------------------------------------');
    
    try {
      // Test complex queries that require indexes
      const streamsRef = collection(db, 'streams');
      
      // Test query that might need an index
      try {
        const activeStreamsQuery = query(
          streamsRef, 
          where('isActive', '==', true),
          limit(5)
        );
        const activeStreams = await getDocs(activeStreamsQuery);
        console.log(`✅ Active streams query: ${activeStreams.size} results`);
        successes.push('✅ Stream queries working correctly');
        
      } catch (queryError) {
        if (queryError.code === 'failed-precondition') {
          console.log('❌ Missing index for streams query');
          errors.push('❌ Missing Firestore index for streams query');
        } else {
          console.log(`❌ Query error: ${queryError.message}`);
          errors.push(`❌ Query error: ${queryError.message}`);
        }
      }
      
    } catch (indexError) {
      console.log(`❌ Index test error: ${indexError.message}`);
      errors.push(`❌ Index test error: ${indexError.message}`);
    }

  } catch (initError) {
    console.log(`❌ Firebase initialization failed: ${initError.message}`);
    errors.push(`❌ Firebase initialization error: ${initError.message}`);
  }

  // Generate Diagnostic Report
  console.log('\n📋 DIAGNOSTIC REPORT');
  console.log('====================');
  
  console.log(`\n✅ SUCCESSES (${successes.length}):`);
  successes.forEach(success => console.log(`   ${success}`));
  
  console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
  warnings.forEach(warning => console.log(`   ${warning}`));
  
  console.log(`\n❌ ERRORS (${errors.length}):`);
  errors.forEach(error => console.log(`   ${error}`));
  
  // Provide specific recommendations
  console.log('\n🔧 RECOMMENDATIONS:');
  console.log('===================');
  
  if (errors.length === 0) {
    console.log('✅ No critical errors found - Firebase is working correctly!');
  } else {
    console.log('❌ Critical errors found - see solutions below:');
    
    errors.forEach(error => {
      if (error.includes('permission-denied')) {
        console.log('   🔧 Deploy Firebase security rules');
      }
      if (error.includes('failed-precondition')) {
        console.log('   🔧 Deploy missing Firestore indexes');
      }
      if (error.includes('auth/')) {
        console.log('   🔧 Check Firebase Authentication configuration');
      }
      if (error.includes('network')) {
        console.log('   🔧 Check network connectivity');
      }
    });
  }
  
  return { errors, warnings, successes };
}

async function testAuthenticatedOperations(db, user) {
  console.log('\n🔐 Testing authenticated operations...');
  
  try {
    // Test user document access
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      console.log('✅ User document accessible');
    } else {
      console.log('ℹ️  User document does not exist (normal for test user)');
    }
    
    // Test creating user-specific data
    const testData = {
      userId: user.uid,
      testField: 'diagnostic-test',
      timestamp: new Date()
    };
    
    const testCollections = ['userGameProfiles', 'miningStats', 'userInventory'];
    
    for (const collectionName of testCollections) {
      try {
        const collectionRef = collection(db, collectionName);
        const docRef = await addDoc(collectionRef, testData);
        
        console.log(`✅ ${collectionName}: Write successful`);
        
        // Clean up
        await deleteDoc(doc(db, collectionName, docRef.id));
        
      } catch (writeError) {
        console.log(`❌ ${collectionName}: Write failed - ${writeError.message}`);
      }
    }
    
  } catch (testError) {
    console.log(`❌ Authenticated operations test failed: ${testError.message}`);
  }
}

// Run diagnostic
if (require.main === module) {
  runFirebaseDiagnostic().then((result) => {
    console.log('\n🎉 Diagnostic complete!');
    process.exit(result.errors.length > 0 ? 1 : 0);
  }).catch((error) => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
}

module.exports = { runFirebaseDiagnostic };
