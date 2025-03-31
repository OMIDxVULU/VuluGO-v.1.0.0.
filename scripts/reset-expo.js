const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Cleaning Expo cache...');

// Clear the Expo cache
try {
  execSync('npx expo start --clear', { stdio: 'inherit' });
} catch (error) {
  console.error('Error clearing Expo cache:', error);
}

console.log('Expo cache cleared.'); 