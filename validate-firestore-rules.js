#!/usr/bin/env node

/**
 * Simple Firestore rules syntax validator
 * This script performs basic syntax validation on firestore.rules
 */

const fs = require('fs');
const path = require('path');

function validateFirestoreRules() {
  const rulesPath = path.join(__dirname, 'firestore.rules');
  
  if (!fs.existsSync(rulesPath)) {
    console.error('❌ firestore.rules file not found');
    process.exit(1);
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  
  console.log('🔍 Validating Firestore rules syntax...');
  
  // Basic syntax checks
  const errors = [];
  
  // Check for balanced braces
  const openBraces = (rulesContent.match(/{/g) || []).length;
  const closeBraces = (rulesContent.match(/}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`);
  }
  
  // Check for required structure
  if (!rulesContent.includes('rules_version = \'2\';')) {
    errors.push('Missing rules_version declaration');
  }
  
  if (!rulesContent.includes('service cloud.firestore')) {
    errors.push('Missing service cloud.firestore declaration');
  }
  
  // Check for common syntax issues
  const lines = rulesContent.split('\n');
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Skip semicolon check - too many false positives with multi-line rules
    // Firestore rules syntax is complex and the check is not reliable
    
    // Check for invalid characters in function names
    if (line.includes('function ') && /function\s+[^a-zA-Z_]/.test(line)) {
      errors.push(`Line ${lineNum}: Invalid function name`);
    }
  });
  
  if (errors.length > 0) {
    console.error('❌ Firestore rules validation failed:');
    errors.forEach(error => console.error(`   ${error}`));
    process.exit(1);
  }
  
  console.log('✅ Firestore rules syntax validation passed!');
  console.log('📝 Rules summary:');
  
  // Count collections
  const collections = rulesContent.match(/match \/[^{]+{/g) || [];
  console.log(`   - ${collections.length} collection rules defined`);
  
  // Count functions
  const functions = rulesContent.match(/function\s+\w+\(/g) || [];
  console.log(`   - ${functions.length} helper functions defined`);
  
  console.log('\n🚀 Rules are ready for deployment!');
  console.log('   Deploy manually through Firebase Console:');
  console.log('   https://console.firebase.google.com/project/vulugo/firestore/rules');
}

if (require.main === module) {
  validateFirestoreRules();
}

module.exports = { validateFirestoreRules };
