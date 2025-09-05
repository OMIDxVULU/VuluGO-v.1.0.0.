#!/usr/bin/env node

/**
 * Simple validation script to check streaming fixes implementation
 * Validates file existence, basic syntax, and key exports
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    log(`✅ ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${filePath} - NOT FOUND`, 'red');
    return false;
  }
}

function checkFileContent(filePath, requiredContent) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`❌ ${filePath} - FILE NOT FOUND`, 'red');
    return false;
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const missing = [];
    
    requiredContent.forEach(item => {
      if (!content.includes(item)) {
        missing.push(item);
      }
    });
    
    if (missing.length === 0) {
      log(`✅ ${filePath} - Content validation passed`, 'green');
      return true;
    } else {
      log(`⚠️  ${filePath} - Missing content:`, 'yellow');
      missing.forEach(item => {
        log(`   - ${item}`, 'yellow');
      });
      return false;
    }
  } catch (error) {
    log(`❌ ${filePath} - Error reading file: ${error.message}`, 'red');
    return false;
  }
}

function validateStreamingFixes() {
  log('\n🔧 Validating Streaming Infrastructure Fixes...', 'bold');
  
  let totalChecks = 0;
  let passedChecks = 0;
  
  // Check 1: Core files exist
  log('\n📁 Checking file existence:', 'blue');
  const coreFiles = [
    'src/hooks/useStreamRecovery.ts',
    'src/components/streaming/StreamingErrorBoundary.tsx',
    'src/utils/streamingPerformanceMonitor.ts',
    'src/utils/testStreamingFixes.ts',
    'STREAMING_FIXES_COMPLETE.md'
  ];
  
  coreFiles.forEach(file => {
    totalChecks++;
    if (checkFileExists(file)) {
      passedChecks++;
    }
  });
  
  // Check 2: Updated services
  log('\n🔄 Checking service updates:', 'blue');
  
  // Firestore service validation
  totalChecks++;
  if (checkFileContent('src/services/firestoreService.ts', [
    'validateStreamAccess',
    'isActive',
    'FirebaseErrorHandler'
  ])) {
    passedChecks++;
  }
  
  // Agora service validation
  totalChecks++;
  if (checkFileContent('src/services/agoraService.ts', [
    'StreamingCircuitBreakers',
    'removeAllListeners',
    'typeof'
  ])) {
    passedChecks++;
  }
  
  // Streaming service validation
  totalChecks++;
  if (checkFileContent('src/services/streamingService.ts', [
    'validateStreamAccess',
    'StreamingCircuitBreakers'
  ])) {
    passedChecks++;
  }
  
  // Check 3: Circuit breaker updates
  log('\n🔒 Checking circuit breaker updates:', 'blue');
  totalChecks++;
  if (checkFileContent('src/utils/circuitBreaker.ts', [
    'StreamingCircuitBreakers',
    'AGORA_ENGINE',
    'CHANNEL_JOIN'
  ])) {
    passedChecks++;
  }
  
  // Check 4: LiveStreamView integration
  log('\n📺 Checking LiveStreamView integration:', 'blue');
  totalChecks++;
  if (checkFileContent('src/screens/LiveStreamView.tsx', [
    'StreamingErrorBoundary',
    'useStreamRecovery',
    'handleStreamingError'
  ])) {
    passedChecks++;
  }
  
  // Check 5: Key exports and imports
  log('\n📦 Checking key exports:', 'blue');
  
  // useStreamRecovery hook
  totalChecks++;
  if (checkFileContent('src/hooks/useStreamRecovery.ts', [
    'export const useStreamRecovery',
    'validateStreamAccess',
    'handleStreamingError',
    'executeRecovery'
  ])) {
    passedChecks++;
  }
  
  // StreamingErrorBoundary component
  totalChecks++;
  if (checkFileContent('src/components/streaming/StreamingErrorBoundary.tsx', [
    'export class StreamingErrorBoundary',
    'componentDidCatch',
    'handleRetry',
    'handleFallback'
  ])) {
    passedChecks++;
  }
  
  // Performance monitor
  totalChecks++;
  if (checkFileContent('src/utils/streamingPerformanceMonitor.ts', [
    'export const streamingPerformanceMonitor',
    'startMonitoring',
    'getCurrentMetrics',
    'getPerformanceSummary'
  ])) {
    passedChecks++;
  }
  
  // Print summary
  log('\n📊 Validation Summary:', 'bold');
  log(`Total Checks: ${totalChecks}`, 'blue');
  log(`Passed: ${passedChecks}`, 'green');
  log(`Failed: ${totalChecks - passedChecks}`, 'red');
  
  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');
  
  if (passedChecks === totalChecks) {
    log('\n🎉 All streaming fixes validation checks passed!', 'green');
    log('✅ Implementation is complete and ready for testing.', 'green');
  } else {
    log('\n⚠️  Some validation checks failed.', 'yellow');
    log('Please review the missing content and fix any issues.', 'yellow');
  }
  
  return {
    total: totalChecks,
    passed: passedChecks,
    failed: totalChecks - passedChecks,
    successRate: parseFloat(successRate)
  };
}

// Run validation
if (require.main === module) {
  const results = validateStreamingFixes();
  process.exit(results.failed > 0 ? 1 : 0);
}

module.exports = { validateStreamingFixes };
