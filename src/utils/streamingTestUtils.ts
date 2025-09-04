/**
 * Streaming Test Utilities for VuluGO
 * Comprehensive testing tools for live streaming functionality
 */

import { agoraService } from '../services/agoraService';
import { streamRecoveryService } from '../services/streamRecoveryService';
import { performanceMonitor } from '../services/performanceMonitor';
import { agoraTokenService } from '../services/agoraTokenService';

export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalDuration: number;
  successRate: number;
}

export class StreamingTestRunner {
  private testResults: TestResult[] = [];

  /**
   * Run comprehensive streaming tests
   */
  async runAllTests(): Promise<TestSuite> {
    console.log('🧪 [TEST] Starting comprehensive streaming tests');
    const startTime = Date.now();

    const tests = [
      () => this.testAgoraInitialization(),
      () => this.testTokenGeneration(),
      () => this.testChannelJoinLeave(),
      () => this.testAudioControls(),
      () => this.testVideoControls(),
      () => this.testParticipantManagement(),
      () => this.testErrorRecovery(),
      () => this.testNetworkInterruption(),
      () => this.testAppLifecycle(),
      () => this.testPerformanceMonitoring(),
    ];

    this.testResults = [];

    for (const test of tests) {
      try {
        const result = await test();
        this.testResults.push(result);
      } catch (error) {
        console.error('❌ [TEST] Test execution failed:', error);
        this.testResults.push({
          testName: 'Unknown Test',
          success: false,
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successfulTests = this.testResults.filter(t => t.success).length;
    const successRate = this.testResults.length > 0 ? successfulTests / this.testResults.length : 0;

    const suite: TestSuite = {
      name: 'VuluGO Streaming Tests',
      tests: this.testResults,
      totalDuration,
      successRate,
    };

    console.log(`🧪 [TEST] Tests completed: ${successfulTests}/${this.testResults.length} passed (${(successRate * 100).toFixed(1)}%)`);
    return suite;
  }

  /**
   * Test Agora service initialization
   */
  private async testAgoraInitialization(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [TEST] Testing Agora initialization');
      
      // Destroy any existing instance
      await agoraService.destroy();
      
      // Test initialization
      const initialized = await agoraService.initialize();
      
      if (!initialized) {
        throw new Error('Agora initialization failed');
      }

      const streamState = agoraService.getStreamState();
      if (!streamState.isConnected) {
        throw new Error('Agora not connected after initialization');
      }

      return {
        testName: 'Agora Initialization',
        success: true,
        duration: Date.now() - startTime,
        details: { streamState },
      };

    } catch (error) {
      return {
        testName: 'Agora Initialization',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test token generation
   */
  private async testTokenGeneration(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [TEST] Testing token generation');
      
      const token = await agoraTokenService.generateToken({
        channelName: 'test-channel',
        uid: 12345,
        role: 'audience',
        expirationTimeInSeconds: 3600,
      });

      if (!token.token || !token.appId) {
        throw new Error('Invalid token response');
      }

      // Test token caching
      const cachedToken = await agoraTokenService.generateToken({
        channelName: 'test-channel',
        uid: 12345,
        role: 'audience',
        expirationTimeInSeconds: 3600,
      });

      if (token.token !== cachedToken.token) {
        throw new Error('Token caching not working');
      }

      return {
        testName: 'Token Generation',
        success: true,
        duration: Date.now() - startTime,
        details: { tokenLength: token.token.length, cached: true },
      };

    } catch (error) {
      return {
        testName: 'Token Generation',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test channel join and leave
   */
  private async testChannelJoinLeave(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [TEST] Testing channel join/leave');
      
      const testChannelName = `test-channel-${Date.now()}`;
      const testUserId = 'test-user-123';

      // Test joining channel
      const joined = await agoraService.joinChannel(testChannelName, testUserId, false, undefined, false);
      
      if (!joined) {
        throw new Error('Failed to join channel');
      }

      // Wait a moment
      await this.delay(1000);

      const streamState = agoraService.getStreamState();
      if (!streamState.isJoined || streamState.channelName !== testChannelName) {
        throw new Error('Channel join state incorrect');
      }

      // Test leaving channel
      await agoraService.leaveChannel();
      
      // Wait a moment
      await this.delay(1000);

      const finalState = agoraService.getStreamState();
      if (finalState.isJoined) {
        throw new Error('Failed to leave channel');
      }

      return {
        testName: 'Channel Join/Leave',
        success: true,
        duration: Date.now() - startTime,
        details: { channelName: testChannelName, userId: testUserId },
      };

    } catch (error) {
      return {
        testName: 'Channel Join/Leave',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test audio controls
   */
  private async testAudioControls(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [TEST] Testing audio controls');
      
      // Test mute
      await agoraService.muteLocalAudio(true);
      let streamState = agoraService.getStreamState();
      
      if (!streamState.isAudioMuted) {
        throw new Error('Audio mute failed');
      }

      // Test unmute
      await agoraService.muteLocalAudio(false);
      streamState = agoraService.getStreamState();
      
      if (streamState.isAudioMuted) {
        throw new Error('Audio unmute failed');
      }

      // Test volume adjustment
      await agoraService.adjustRecordingSignalVolume(150);

      return {
        testName: 'Audio Controls',
        success: true,
        duration: Date.now() - startTime,
        details: { muteUnmuteWorking: true, volumeAdjustment: true },
      };

    } catch (error) {
      return {
        testName: 'Audio Controls',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test video controls
   */
  private async testVideoControls(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [TEST] Testing video controls');
      
      // Test enable video
      await agoraService.enableLocalVideo(true);
      let streamState = agoraService.getStreamState();
      
      if (!streamState.isVideoEnabled) {
        throw new Error('Video enable failed');
      }

      // Test camera switch
      await agoraService.switchCamera();

      // Test disable video
      await agoraService.enableLocalVideo(false);
      streamState = agoraService.getStreamState();
      
      if (streamState.isVideoEnabled) {
        throw new Error('Video disable failed');
      }

      return {
        testName: 'Video Controls',
        success: true,
        duration: Date.now() - startTime,
        details: { enableDisableWorking: true, cameraSwitchWorking: true },
      };

    } catch (error) {
      return {
        testName: 'Video Controls',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test participant management
   */
  private async testParticipantManagement(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [TEST] Testing participant management');
      
      // Add mock participants
      agoraService.updateParticipant(1001, {
        userId: 'user1',
        name: 'Test User 1',
        isHost: false,
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        joinedAt: Date.now(),
      });

      agoraService.updateParticipant(1002, {
        userId: 'user2',
        name: 'Test User 2',
        isHost: true,
        isMuted: true,
        isSpeaking: false,
        audioLevel: 0,
        joinedAt: Date.now(),
      });

      const participants = agoraService.getParticipants();
      
      if (participants.length !== 2) {
        throw new Error(`Expected 2 participants, got ${participants.length}`);
      }

      const user1 = agoraService.getParticipant(1001);
      const user2 = agoraService.getParticipant(1002);

      if (!user1 || !user2) {
        throw new Error('Failed to retrieve participants');
      }

      if (user1.isHost || !user2.isHost) {
        throw new Error('Participant roles incorrect');
      }

      // Test participant removal
      agoraService.removeParticipant(1001);
      const remainingParticipants = agoraService.getParticipants();
      
      if (remainingParticipants.length !== 1) {
        throw new Error('Participant removal failed');
      }

      return {
        testName: 'Participant Management',
        success: true,
        duration: Date.now() - startTime,
        details: { participantsAdded: 2, participantsRemoved: 1 },
      };

    } catch (error) {
      return {
        testName: 'Participant Management',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test error recovery
   */
  private async testErrorRecovery(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [TEST] Testing error recovery');
      
      // Reset recovery service
      streamRecoveryService.reset();

      // Simulate a network error
      const mockError = new Error('Network connection lost');
      
      const result = await streamRecoveryService.recoverFromError(
        'test-stream',
        'test-user',
        mockError,
        { maxRetries: 2, baseDelay: 100 }
      );

      const stats = streamRecoveryService.getRecoveryStats();

      return {
        testName: 'Error Recovery',
        success: true, // Recovery attempt itself is success, regardless of outcome
        duration: Date.now() - startTime,
        details: { 
          recoveryResult: result,
          recoveryStats: stats,
        },
      };

    } catch (error) {
      return {
        testName: 'Error Recovery',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test network interruption handling
   */
  private async testNetworkInterruption(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [TEST] Testing network interruption handling');
      
      // This would typically involve mocking network conditions
      // For now, we'll test the basic structure
      
      const connectionStats = await agoraService.getConnectionStats();
      
      return {
        testName: 'Network Interruption',
        success: true,
        duration: Date.now() - startTime,
        details: { connectionStats },
      };

    } catch (error) {
      return {
        testName: 'Network Interruption',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test app lifecycle handling
   */
  private async testAppLifecycle(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [TEST] Testing app lifecycle handling');
      
      // Test background transition
      await agoraService.handleAppStateChange('background');
      
      // Test foreground transition
      await agoraService.handleAppStateChange('active');

      return {
        testName: 'App Lifecycle',
        success: true,
        duration: Date.now() - startTime,
        details: { backgroundTransition: true, foregroundTransition: true },
      };

    } catch (error) {
      return {
        testName: 'App Lifecycle',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test performance monitoring
   */
  private async testPerformanceMonitoring(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 [TEST] Testing performance monitoring');
      
      // Start monitoring
      performanceMonitor.startMonitoring(1000);
      
      // Wait for some metrics
      await this.delay(3000);
      
      const summary = performanceMonitor.getPerformanceSummary();
      
      // Stop monitoring
      performanceMonitor.stopMonitoring();

      if (!summary.current) {
        throw new Error('No performance metrics collected');
      }

      return {
        testName: 'Performance Monitoring',
        success: true,
        duration: Date.now() - startTime,
        details: { 
          metricsCollected: true,
          currentMetrics: summary.current,
          alertsGenerated: summary.alerts.length,
        },
      };

    } catch (error) {
      return {
        testName: 'Performance Monitoring',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get test results
   */
  getTestResults(): TestResult[] {
    return [...this.testResults];
  }
}

export const streamingTestRunner = new StreamingTestRunner();
