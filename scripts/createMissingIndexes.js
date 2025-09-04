#!/usr/bin/env node

/**
 * Manual Index Creation Script
 * Creates missing Firestore indexes using Firebase Console URLs from error messages
 */

const { execSync } = require('child_process');
const open = require('open');

// Index URLs from error messages
const INDEX_URLS = [
  // purchases: userId (ASC) + timestamp (DESC) + __name__ (ASC)
  'https://console.firebase.google.com/v1/r/project/vulugo/firestore/indexes?create_composite=Ckhwcm9qZWN0cy92dWx1Z28vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3B1cmNoYXNlcy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgl0aW1lc3RhbXAQAhoMCghfX25hbWVfXxAC',
  
  // musicActivities: isCurrentlyPlaying (ASC) + userId (ASC) + startTime (DESC) + __name__ (ASC)
  'https://console.firebase.google.com/v1/r/project/vulugo/firestore/indexes?create_composite=Ck5wcm9qZWN0cy92dWx1Z28vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL211c2ljQWN0aXZpdGllcy9pbmRleGVzL18QARoWChJpc0N1cnJlbnRseVBsYXlpbmcQARoKCgZ1c2VySWQQARoNCglzdGFydFRpbWUQAhoMCghfX25hbWVfXxAC',
  
  // products: isActive (ASC) + createdAt (DESC) + __name__ (ASC)
  'https://console.firebase.google.com/v1/r/project/vulugo/firestore/indexes?create_composite=Ckdwcm9qZWN0cy92dWx1Z28vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3Byb2R1Y3RzL2luZGV4ZXMvXxABGgwKCGlzQWN0aXZlEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg',
  
  // miningSessions: isActive (ASC) + userId (ASC) + startTime (DESC) + __name__ (ASC)
  'https://console.firebase.google.com/v1/r/project/vulugo/firestore/indexes?create_composite=Ck1wcm9qZWN0cy92dWx1Z28vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL21pbmluZ1Nlc3Npb25zL2luZGV4ZXMvXxABGgwKCGlzQWN0aXZlEAEaCgoGdXNlcklkEAEaDQoJc3RhcnRUaW1lEAIaDAoIX19uYW1lX18QAg',
  
  // profileViews: profileOwnerId (ASC) + timestamp (DESC) + __name__ (ASC)
  'https://console.firebase.google.com/v1/r/project/vulugo/firestore/indexes?create_composite=Cktwcm9qZWN0cy92dWx1Z28vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3Byb2ZpbGVWaWV3cy9pbmRleGVzL18QARoSCg5wcm9maWxlT3duZXJJZBABGg0KCXRpbWVzdGFtcBACGgwKCF9fbmFtZV9fEAI',
  
  // notifications: userId (ASC) + timestamp (DESC) + __name__ (ASC)
  'https://console.firebase.google.com/v1/r/project/vulugo/firestore/indexes?create_composite=Ckxwcm9qZWN0cy92dWx1Z28vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25vdGlmaWNhdGlvbnMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaDQoJdGltZXN0YW1wEAIaDAoIX19uYW1lX18QAg'
];

const INDEX_DESCRIPTIONS = [
  'purchases: userId + timestamp + __name__',
  'musicActivities: isCurrentlyPlaying + userId + startTime + __name__',
  'products: isActive + createdAt + __name__',
  'miningSessions: isActive + userId + startTime + __name__',
  'profileViews: profileOwnerId + timestamp + __name__',
  'notifications: userId + timestamp + __name__'
];

async function checkCurrentIndexes() {
  console.log('🔍 Checking current Firebase indexes...');
  
  try {
    const result = execSync('npx firebase firestore:indexes --json', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    const data = JSON.parse(result);
    const indexes = data.result?.indexes || [];
    
    console.log(`📊 Found ${indexes.length} existing indexes:`);
    indexes.forEach((index, i) => {
      const fields = index.fields.map(f => `${f.fieldPath}(${f.order || f.arrayConfig})`).join(' + ');
      console.log(`  ${i + 1}. ${index.collectionGroup}: ${fields}`);
    });
    
    return indexes;
  } catch (error) {
    console.error('❌ Failed to check current indexes:', error.message);
    return [];
  }
}

async function openIndexCreationUrls() {
  console.log('\n🚀 Opening Firebase Console URLs for manual index creation...');
  console.log('📝 Please create the following indexes manually:\n');
  
  for (let i = 0; i < INDEX_URLS.length; i++) {
    const url = INDEX_URLS[i];
    const description = INDEX_DESCRIPTIONS[i];
    
    console.log(`${i + 1}. ${description}`);
    console.log(`   URL: ${url}\n`);
    
    // Open URL in browser
    try {
      await open(url);
      console.log(`✅ Opened browser for index ${i + 1}`);
    } catch (error) {
      console.warn(`⚠️ Could not open browser for index ${i + 1}:`, error.message);
    }
    
    // Wait between opens to avoid overwhelming the browser
    if (i < INDEX_URLS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function waitForUserConfirmation() {
  console.log('\n⏳ Please create all indexes in the Firebase Console, then press Enter to continue...');
  
  return new Promise((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

async function verifyIndexes() {
  console.log('\n🔍 Verifying indexes after creation...');
  
  const indexes = await checkCurrentIndexes();
  const requiredCollections = ['purchases', 'musicActivities', 'products', 'miningSessions', 'profileViews', 'notifications'];
  
  const missingIndexes = [];
  
  for (const collection of requiredCollections) {
    const collectionIndexes = indexes.filter(idx => idx.collectionGroup === collection);
    
    if (collectionIndexes.length === 0) {
      missingIndexes.push(collection);
    } else {
      console.log(`✅ ${collection}: ${collectionIndexes.length} index(es) found`);
    }
  }
  
  if (missingIndexes.length > 0) {
    console.log(`\n❌ Missing indexes for collections: ${missingIndexes.join(', ')}`);
    return false;
  } else {
    console.log('\n✅ All required collections have indexes!');
    return true;
  }
}

async function forceClientCacheReset() {
  console.log('\n🔄 Forcing Firebase client cache reset...');
  
  try {
    // Clear Metro cache
    execSync('npx expo r --clear', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Metro cache cleared');
    
    // Additional cache clearing
    execSync('rm -rf node_modules/.cache', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Node modules cache cleared');
    
    console.log('🎯 Cache reset complete. Restart your app to see the changes.');
    
  } catch (error) {
    console.warn('⚠️ Cache reset partially failed:', error.message);
  }
}

async function main() {
  console.log('🔧 Firebase Index Creation Script');
  console.log('==================================\n');
  
  // Step 1: Check current indexes
  await checkCurrentIndexes();
  
  // Step 2: Open URLs for manual creation
  await openIndexCreationUrls();
  
  // Step 3: Wait for user to create indexes
  await waitForUserConfirmation();
  
  // Step 4: Verify indexes were created
  const allIndexesCreated = await verifyIndexes();
  
  if (allIndexesCreated) {
    // Step 5: Force cache reset
    await forceClientCacheReset();
    
    console.log('\n🎉 Index creation process completed successfully!');
    console.log('📱 Restart your React Native app to use the new indexes.');
  } else {
    console.log('\n❌ Some indexes are still missing. Please check the Firebase Console.');
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { checkCurrentIndexes, openIndexCreationUrls, verifyIndexes };
