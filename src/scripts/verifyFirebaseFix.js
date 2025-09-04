/**
 * Verify Firebase Fix - Test all resolved issues
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where,
  limit,
  orderBy
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

async function verifyFirebaseFix() {
  console.log('🧪 Verifying Firebase Fix');
  console.log('=========================');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Test 1: Shop Promotions Index
  console.log('\n🛒 Test 1: Shop Promotions Index');
  console.log('--------------------------------');
  
  try {
    const promotionsRef = collection(db, 'shopPromotions');
    const promotionsQuery = query(
      promotionsRef,
      where('isActive', '==', true),
      orderBy('startDate', 'asc'),
      limit(5)
    );
    
    const promotionsSnapshot = await getDocs(promotionsQuery);
    console.log(`✅ Shop promotions query successful: ${promotionsSnapshot.size} results`);
    results.passed.push('✅ Shop promotions index working');
    
  } catch (promotionsError) {
    if (promotionsError.code === 'failed-precondition') {
      console.log('❌ Shop promotions index still missing');
      results.failed.push('❌ Shop promotions index not deployed yet');
    } else {
      console.log(`⚠️  Shop promotions error: ${promotionsError.message}`);
      results.warnings.push(`⚠️  Shop promotions: ${promotionsError.message}`);
    }
  }

  // Test 2: Streams Collection
  console.log('\n🎥 Test 2: Streams Collection');
  console.log('-----------------------------');
  
  try {
    const streamsRef = collection(db, 'streams');
    const streamsQuery = query(streamsRef, limit(3));
    const streamsSnapshot = await getDocs(streamsQuery);
    
    console.log(`✅ Streams collection accessible: ${streamsSnapshot.size} documents`);
    results.passed.push('✅ Streams collection working');
    
  } catch (streamsError) {
    console.log(`❌ Streams error: ${streamsError.message}`);
    results.failed.push(`❌ Streams error: ${streamsError.message}`);
  }

  // Test 3: Users Collection
  console.log('\n👥 Test 3: Users Collection');
  console.log('---------------------------');
  
  try {
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, limit(2));
    const usersSnapshot = await getDocs(usersQuery);
    
    console.log(`✅ Users collection accessible: ${usersSnapshot.size} documents`);
    results.passed.push('✅ Users collection working');
    
  } catch (usersError) {
    console.log(`❌ Users error: ${usersError.message}`);
    results.failed.push(`❌ Users error: ${usersError.message}`);
  }

  // Test 4: Global Chat
  console.log('\n💬 Test 4: Global Chat');
  console.log('----------------------');
  
  try {
    const chatRef = collection(db, 'globalChat');
    const chatQuery = query(chatRef, limit(2));
    const chatSnapshot = await getDocs(chatQuery);
    
    console.log(`✅ Global chat accessible: ${chatSnapshot.size} documents`);
    results.passed.push('✅ Global chat working');
    
  } catch (chatError) {
    console.log(`❌ Global chat error: ${chatError.message}`);
    results.failed.push(`❌ Global chat error: ${chatError.message}`);
  }

  // Test 5: Products Collection
  console.log('\n🛍️  Test 5: Products Collection');
  console.log('-------------------------------');
  
  try {
    const productsRef = collection(db, 'products');
    const productsQuery = query(productsRef, limit(1));
    const productsSnapshot = await getDocs(productsQuery);
    
    console.log(`✅ Products collection accessible: ${productsSnapshot.size} documents`);
    results.passed.push('✅ Products collection working');
    
  } catch (productsError) {
    console.log(`❌ Products error: ${productsError.message}`);
    results.failed.push(`❌ Products error: ${productsError.message}`);
  }

  // Generate Final Report
  console.log('\n📊 VERIFICATION RESULTS');
  console.log('=======================');
  
  console.log(`\n✅ PASSED TESTS (${results.passed.length}):`);
  results.passed.forEach(test => console.log(`   ${test}`));
  
  console.log(`\n⚠️  WARNINGS (${results.warnings.length}):`);
  results.warnings.forEach(warning => console.log(`   ${warning}`));
  
  console.log(`\n❌ FAILED TESTS (${results.failed.length}):`);
  results.failed.forEach(failure => console.log(`   ${failure}`));
  
  // Overall Status
  console.log('\n🎯 OVERALL STATUS:');
  console.log('==================');
  
  if (results.failed.length === 0) {
    console.log('🎉 ALL TESTS PASSED - Firebase is working correctly!');
    console.log('✅ Live streaming should work properly');
    console.log('✅ All app features should be functional');
  } else if (results.failed.length === 1 && results.failed[0].includes('shop promotions')) {
    console.log('⚠️  MOSTLY WORKING - Only shop promotions index pending');
    console.log('✅ Live streaming should work properly');
    console.log('⚠️  Shop features will work once index is built');
  } else {
    console.log('❌ CRITICAL ISSUES REMAIN - Further troubleshooting needed');
  }
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('==============');
  
  if (results.failed.some(f => f.includes('shop promotions'))) {
    console.log('1. Wait for shop promotions index to build (1-2 minutes)');
    console.log('2. Check Firebase Console for index status');
    console.log('3. Re-run this test after index is complete');
  }
  
  console.log('4. Test live streaming in your app');
  console.log('5. Monitor app logs for any remaining errors');
  
  return results;
}

verifyFirebaseFix().catch(console.error);
