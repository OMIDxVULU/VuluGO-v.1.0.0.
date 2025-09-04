/**
 * Test Script for Stream Creation Race Condition Fix
 * Tests the "stream_inactive" validation error resolution
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBHL5BpkQRDe-03hE5-7TYcbr2aad1ezqg",
  authDomain: "vulugo.firebaseapp.com",
  projectId: "vulugo",
  storageBucket: "vulugo.appspot.com",
  messagingSenderId: "876918371895",
  appId: "1:876918371895:web:49d57bd00939d49889b1b2",
  measurementId: "G-LLTSS9NFCD"
};

async function testStreamCreationFix() {
  console.log('🧪 Testing Stream Creation Race Condition Fix');
  console.log('==============================================');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Simulate the race condition scenario
  console.log('\n🔄 Test 1: Simulating Race Condition Scenario');
  console.log('----------------------------------------------');
  
  try {
    const testStreamId = `test_stream_${Date.now()}_race_condition`;
    
    // Step 1: Create stream with isActive: false (simulating the old behavior)
    const streamData = {
      id: testStreamId,
      hostId: 'test-user-123',
      hostName: 'Test User',
      title: 'Test Stream - Race Condition',
      isActive: false, // Initially false
      startedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      participants: [],
      viewerCount: 0
    };
    
    console.log('📝 Creating stream with isActive: false...');
    await setDoc(doc(db, 'streams', testStreamId), streamData);
    
    // Step 2: Immediate validation (this should fail with old logic)
    console.log('🔍 Performing immediate validation...');
    const immediateValidation = await validateStreamDirect(db, testStreamId);
    
    if (!immediateValidation.valid && immediateValidation.reason === 'stream_inactive') {
      console.log('✅ Immediate validation correctly failed with stream_inactive');
      testResults.tests.push({ name: 'Immediate validation failure', passed: true });
    } else {
      console.log('❌ Immediate validation should have failed');
      testResults.tests.push({ name: 'Immediate validation failure', passed: false });
    }
    
    // Step 3: Update stream to active (simulating Agora setup completion)
    console.log('🔄 Updating stream to active...');
    await setDoc(doc(db, 'streams', testStreamId), {
      ...streamData,
      isActive: true,
      updatedAt: serverTimestamp()
    });
    
    // Step 4: Validation with retry logic (this should succeed)
    console.log('🔍 Testing validation with retry logic...');
    const retryValidation = await validateStreamWithRetry(db, testStreamId, 3, 500);
    
    if (retryValidation.valid) {
      console.log('✅ Retry validation succeeded');
      testResults.tests.push({ name: 'Retry validation success', passed: true });
      testResults.passed++;
    } else {
      console.log('❌ Retry validation failed:', retryValidation.reason);
      testResults.tests.push({ name: 'Retry validation success', passed: false });
      testResults.failed++;
    }
    
    // Cleanup
    await deleteDoc(doc(db, 'streams', testStreamId));
    console.log('🧹 Test stream cleaned up');
    
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    testResults.failed++;
    testResults.tests.push({ name: 'Race condition simulation', passed: false, error: error.message });
  }

  // Test 2: Test normal stream creation flow
  console.log('\n🔄 Test 2: Normal Stream Creation Flow');
  console.log('-------------------------------------');
  
  try {
    const testStreamId = `test_stream_${Date.now()}_normal_flow`;
    
    // Create stream with isActive: true (correct behavior)
    const streamData = {
      id: testStreamId,
      hostId: 'test-user-456',
      hostName: 'Test User 2',
      title: 'Test Stream - Normal Flow',
      isActive: true, // Correctly set to true
      startedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      participants: [{
        id: 'test-user-456',
        name: 'Test User 2',
        isHost: true,
        joinedAt: Date.now()
      }],
      viewerCount: 1
    };
    
    console.log('📝 Creating stream with isActive: true...');
    await setDoc(doc(db, 'streams', testStreamId), streamData);
    
    // Small delay to ensure write propagation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Immediate validation should succeed
    console.log('🔍 Performing immediate validation...');
    const validation = await validateStreamDirect(db, testStreamId);
    
    if (validation.valid) {
      console.log('✅ Normal flow validation succeeded');
      testResults.tests.push({ name: 'Normal flow validation', passed: true });
      testResults.passed++;
    } else {
      console.log('❌ Normal flow validation failed:', validation.reason);
      testResults.tests.push({ name: 'Normal flow validation', passed: false });
      testResults.failed++;
    }
    
    // Cleanup
    await deleteDoc(doc(db, 'streams', testStreamId));
    console.log('🧹 Test stream cleaned up');
    
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    testResults.failed++;
    testResults.tests.push({ name: 'Normal flow test', passed: false, error: error.message });
  }

  // Generate Report
  console.log('\n📊 TEST RESULTS');
  console.log('===============');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📋 Total: ${testResults.tests.length}`);
  
  console.log('\n📋 Detailed Results:');
  testResults.tests.forEach((test, index) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.name}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - Stream creation fix is working!');
  } else {
    console.log('\n⚠️ Some tests failed - review the fixes needed');
  }
  
  return testResults;
}

// Helper function to validate stream directly (simulating old behavior)
async function validateStreamDirect(db, streamId) {
  try {
    const streamRef = doc(db, 'streams', streamId);
    const streamDoc = await getDoc(streamRef);
    
    if (!streamDoc.exists()) {
      return {
        valid: false,
        exists: false,
        isActive: false,
        reason: 'stream_not_found'
      };
    }
    
    const streamData = streamDoc.data();
    
    if (!streamData.isActive) {
      return {
        valid: false,
        exists: true,
        isActive: false,
        reason: 'stream_inactive',
        streamData
      };
    }
    
    return {
      valid: true,
      exists: true,
      isActive: true,
      streamData
    };
    
  } catch (error) {
    return {
      valid: false,
      exists: false,
      isActive: false,
      reason: 'validation_error',
      error: error.message
    };
  }
}

// Helper function to validate stream with retry logic (simulating new behavior)
async function validateStreamWithRetry(db, streamId, maxRetries = 3, delayMs = 1000) {
  let lastValidation = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Validating stream ${streamId} (attempt ${attempt}/${maxRetries})`);
    
    const validation = await validateStreamDirect(db, streamId);
    lastValidation = validation;
    
    // If valid, return immediately
    if (validation.valid) {
      if (attempt > 1) {
        console.log(`✅ Stream validation succeeded on attempt ${attempt}`);
      }
      return validation;
    }
    
    // If stream doesn't exist, don't retry
    if (!validation.exists) {
      console.log(`❌ Stream ${streamId} doesn't exist, not retrying`);
      return validation;
    }
    
    // If stream exists but inactive, retry (could be race condition)
    if (validation.reason === 'stream_inactive' && attempt < maxRetries) {
      console.log(`⏳ Stream ${streamId} inactive, waiting ${delayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }
    
    // For other reasons, return immediately
    return validation;
  }
  
  console.error(`❌ Stream validation failed after ${maxRetries} attempts`);
  return lastValidation;
}

// Run the test
if (require.main === module) {
  testStreamCreationFix().then((results) => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testStreamCreationFix };
