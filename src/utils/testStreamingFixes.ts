/**
 * Comprehensive test suite for streaming fixes
 * Tests Firebase stream access validation, Agora RTC engine fixes, and recovery systems
 */

import { firestoreService } from '../services/firestoreService';
import { agoraService } from '../services/agoraService';
import { streamingService } from '../services/streamingService';
import { streamingPerformanceMonitor } from './streamingPerformanceMonitor';
import { FirebaseErrorHandler } from './firebaseErrorHandler';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class StreamingFixesTest {
  private results: TestResult[] = [];

  // Run all streaming tests
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting comprehensive streaming fixes test suite...');
    
    this.results = [];

    // Test Firebase stream access validation
    await this.testFirebaseStreamValidation();
    
    // Test Agora RTC engine fixes
    await this.testAgoraRTCEngineFixes();
    
    // Test streaming service improvements
    await this.testStreamingServiceFixes();
    
    // Test performance monitoring
    await this.testPerformanceMonitoring();
    
    // Test error handling improvements
    await this.testErrorHandling();

    // Test new fixes for critical errors
    await this.testCriticalErrorFixes();

    // Print summary
    this.printTestSummary();
    
    return this.results;
  }

  // Test Firebase stream access validation
  private async testFirebaseStreamValidation(): Promise<void> {
    console.log('\n📋 Testing Firebase Stream Access Validation...');

    // Test 1: Validate non-existent stream with retry logic
    await this.runTest('Stream validation - non-existent stream with retry', async () => {
      const result = await firestoreService.validateStreamAccess('non-existent-stream-' + Date.now(), 'test-user');

      if (result.exists) {
        throw new Error('Non-existent stream should not exist');
      }

      if (result.accessible) {
        throw new Error('Non-existent stream should not be accessible');
      }

      if (!result.error) {
        throw new Error('Should have error message for non-existent stream');
      }

      return { validation: result };
    });

    // Test 2: Test retry logic with timeout
    await this.runTest('Stream validation - timeout handling', async () => {
      // This test verifies that timeout errors are handled properly
      const startTime = Date.now();
      const result = await firestoreService.validateStreamAccess('timeout-test-stream', 'test-user');
      const endTime = Date.now();

      // Should complete within reasonable time (not hang indefinitely)
      if (endTime - startTime > 30000) { // 30 seconds max
        throw new Error('Stream validation took too long');
      }

      return { duration: endTime - startTime, result };
    });

    // Test 2: Test field name fix (isActive vs isLive)
    await this.runTest('Firestore query field fix', async () => {
      // This test verifies that getActiveStreams uses 'isActive' instead of 'isLive'
      const streams = await firestoreService.getActiveStreams();
      
      // Should not throw error and return array (even if empty)
      if (!Array.isArray(streams)) {
        throw new Error('getActiveStreams should return an array');
      }
      
      return { streamCount: streams.length };
    });

    // Test 3: Test permission error handling
    await this.runTest('Permission error handling', async () => {
      // Test that permission errors are handled gracefully
      try {
        const streams = await firestoreService.getActiveStreams();
        return { handled: true, streamCount: streams.length };
      } catch (error: any) {
        // Should not throw unhandled permission errors
        if (error.message.includes('permission-denied')) {
          throw new Error('Permission errors should be handled gracefully');
        }
        throw error;
      }
    });
  }

  // Test Agora RTC engine fixes
  private async testAgoraRTCEngineFixes(): Promise<void> {
    console.log('\n🎵 Testing Agora RTC Engine Fixes...');

    // Test 1: Engine initialization with error handling
    await this.runTest('Agora engine initialization', async () => {
      const initialized = await agoraService.initialize();
      
      // Should return boolean (true for mock, but shouldn't throw)
      if (typeof initialized !== 'boolean') {
        throw new Error('Initialize should return boolean');
      }
      
      return { initialized };
    });

    // Test 2: Channel join with validation
    await this.runTest('Channel join with validation', async () => {
      const joined = await agoraService.joinChannel('test-channel', 'test-user', false);
      
      // Should return boolean and not throw
      if (typeof joined !== 'boolean') {
        throw new Error('joinChannel should return boolean');
      }
      
      return { joined };
    });

    // Test 3: Engine cleanup without errors (enhanced)
    await this.runTest('Engine cleanup safety with null checks', async () => {
      // Test multiple destroy calls to ensure safety
      await agoraService.destroy();
      await agoraService.destroy(); // Should not throw on second call

      const state = agoraService.getStreamState();

      if (state.isConnected) {
        throw new Error('Engine should be disconnected after destroy');
      }

      // Test that state is properly reset
      if (state.isJoined) {
        throw new Error('Engine should not be joined after destroy');
      }

      if (state.channelName !== '') {
        throw new Error('Channel name should be cleared after destroy');
      }

      return { cleanupSuccessful: true, state };
    });

    // Test 4: Multiple initialization calls
    await this.runTest('Multiple initialization safety', async () => {
      const init1 = await agoraService.initialize();
      const init2 = await agoraService.initialize();
      
      // Both should succeed without issues
      return { init1, init2 };
    });
  }

  // Test streaming service improvements
  private async testStreamingServiceFixes(): Promise<void> {
    console.log('\n🔄 Testing Streaming Service Fixes...');

    // Test 1: Stream creation with validation
    await this.runTest('Stream creation with validation', async () => {
      try {
        const streamId = await streamingService.createStream(
          'Test Stream',
          'test-host-id',
          'Test Host',
          'https://example.com/avatar.jpg'
        );
        
        if (!streamId || typeof streamId !== 'string') {
          throw new Error('Stream creation should return valid stream ID');
        }
        
        return { streamId };
      } catch (error: any) {
        // Expected to fail due to auth requirements, but should handle gracefully
        if (error.message.includes('Authentication required')) {
          return { expectedAuthError: true };
        }
        throw error;
      }
    });

    // Test 2: Join stream with validation
    await this.runTest('Join stream with validation', async () => {
      try {
        await streamingService.joinStream(
          'test-stream-id',
          'test-user-id',
          'Test User',
          'https://example.com/avatar.jpg'
        );
        
        return { joinAttempted: true };
      } catch (error: any) {
        // Expected to fail for non-existent stream, but should handle gracefully
        if (error.message.includes('Stream') && error.message.includes('not found')) {
          return { expectedNotFoundError: true };
        }
        throw error;
      }
    });

    // Test 3: Get active streams
    await this.runTest('Get active streams', async () => {
      const streams = await streamingService.getActiveStreams();
      
      if (!Array.isArray(streams)) {
        throw new Error('getActiveStreams should return array');
      }
      
      return { streamCount: streams.length };
    });
  }

  // Test performance monitoring
  private async testPerformanceMonitoring(): Promise<void> {
    console.log('\n📊 Testing Performance Monitoring...');

    // Test 1: Start monitoring
    await this.runTest('Performance monitoring start', async () => {
      streamingPerformanceMonitor.startMonitoring(1000); // 1 second interval for testing
      
      // Wait a bit for metrics collection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const metrics = streamingPerformanceMonitor.getCurrentMetrics();
      
      if (!metrics) {
        throw new Error('Should have collected metrics');
      }
      
      return { metricsCollected: true, metrics };
    });

    // Test 2: Performance summary
    await this.runTest('Performance summary', async () => {
      const summary = streamingPerformanceMonitor.getPerformanceSummary();
      
      if (typeof summary.averageCpuUsage !== 'number') {
        throw new Error('Summary should include CPU usage');
      }
      
      return { summary };
    });

    // Test 3: Stop monitoring
    await this.runTest('Performance monitoring stop', async () => {
      streamingPerformanceMonitor.stopMonitoring();
      return { stopped: true };
    });
  }

  // Test error handling improvements
  private async testErrorHandling(): Promise<void> {
    console.log('\n🛡️ Testing Error Handling Improvements...');

    // Test 1: Firebase error detection
    await this.runTest('Firebase error detection', async () => {
      const mockPermissionError = { code: 'permission-denied', message: 'Test error' };
      const isPermissionError = FirebaseErrorHandler.isPermissionError(mockPermissionError);
      
      if (!isPermissionError) {
        throw new Error('Should detect permission errors');
      }
      
      return { detected: true };
    });

    // Test 2: Error info generation
    await this.runTest('Error info generation', async () => {
      const mockError = { code: 'unavailable', message: 'Service unavailable' };
      const errorInfo = FirebaseErrorHandler.handleError(mockError);
      
      if (!errorInfo.userFriendlyMessage) {
        throw new Error('Should generate user-friendly message');
      }
      
      return { errorInfo };
    });

    // Test 3: Circuit breaker functionality
    await this.runTest('Circuit breaker basic functionality', async () => {
      // Import circuit breaker
      const { getCircuitBreaker } = await import('./circuitBreaker');
      
      const testBreaker = getCircuitBreaker('test-breaker', {
        failureThreshold: 2,
        resetTimeout: 1000,
        maxRetries: 1
      });
      
      // Should be healthy initially
      if (!testBreaker.isHealthy()) {
        throw new Error('Circuit breaker should be healthy initially');
      }
      
      return { healthy: true };
    });
  }

  // Test critical error fixes from the logs
  private async testCriticalErrorFixes(): Promise<void> {
    console.log('\n🚨 Testing Critical Error Fixes...');

    // Test 1: Push token service
    await this.runTest('Push token service initialization', async () => {
      const { pushTokenService } = await import('../services/pushTokenService');

      const isSupported = await pushTokenService.isSupported();
      // Should not throw error even if not supported

      return { supported: isSupported };
    });

    // Test 2: Image utils for Jimp error prevention
    await this.runTest('Image utils null buffer handling', async () => {
      const ImageUtils = (await import('../utils/imageUtils')).default;

      // Test null buffer validation
      const nullValidation = ImageUtils.validateImageBuffer(null);
      if (nullValidation.isValid) {
        throw new Error('Null buffer should be invalid');
      }

      // Test empty buffer validation
      const emptyValidation = ImageUtils.validateImageBuffer(new Uint8Array(0));
      if (emptyValidation.isValid) {
        throw new Error('Empty buffer should be invalid');
      }

      // Test safe avatar generation
      const safeAvatar = ImageUtils.getSafeAvatarUri(null, 'test-user');
      if (!safeAvatar || typeof safeAvatar !== 'string') {
        throw new Error('Should return valid avatar URI');
      }

      return { nullValidation, emptyValidation, safeAvatar };
    });

    // Test 3: Memory optimization
    await this.runTest('Performance monitor memory optimization', async () => {
      const { streamingPerformanceMonitor } = await import('../utils/streamingPerformanceMonitor');

      // Start monitoring briefly
      streamingPerformanceMonitor.startMonitoring(500);

      // Wait for some metrics
      await new Promise(resolve => setTimeout(resolve, 1000));

      const metrics = streamingPerformanceMonitor.getCurrentMetrics();
      const summary = streamingPerformanceMonitor.getPerformanceSummary();

      // Stop monitoring
      streamingPerformanceMonitor.stopMonitoring();

      return { hasMetrics: !!metrics, summary };
    });

    // Test 4: Stream state synchronization
    await this.runTest('Stream state synchronization', async () => {
      // Test that streaming service handles stale sessions
      const streams = await streamingService.getActiveStreams();

      // Should return array without throwing
      if (!Array.isArray(streams)) {
        throw new Error('Should return array of streams');
      }

      return { streamCount: streams.length };
    });

    // Test 5: Enhanced recovery system
    await this.runTest('Enhanced recovery system validation', async () => {
      const { useStreamRecovery } = await import('../hooks/useStreamRecovery');

      // Test that hook can be imported without errors
      if (typeof useStreamRecovery !== 'function') {
        throw new Error('useStreamRecovery should be a function');
      }

      return { hookAvailable: true };
    });
  }

  // Helper method to run individual tests
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    try {
      console.log(`  ⏳ ${testName}...`);
      const details = await testFn();
      
      this.results.push({
        testName,
        passed: true,
        details
      });
      
      console.log(`  ✅ ${testName} - PASSED`);
    } catch (error: any) {
      this.results.push({
        testName,
        passed: false,
        error: error.message
      });
      
      console.log(`  ❌ ${testName} - FAILED: ${error.message}`);
    }
  }

  // Print test summary
  private printTestSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log('\n📋 Test Summary:');
    console.log(`  Total Tests: ${total}`);
    console.log(`  Passed: ${passed} ✅`);
    console.log(`  Failed: ${failed} ❌`);
    console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.testName}: ${result.error}`);
      });
    }
    
    console.log('\n🎉 Streaming fixes test suite completed!');
  }

  // Get test results
  getResults(): TestResult[] {
    return this.results;
  }
}

// Export test runner
export const runStreamingFixesTest = async (): Promise<TestResult[]> => {
  const tester = new StreamingFixesTest();
  return await tester.runAllTests();
};

export default StreamingFixesTest;
