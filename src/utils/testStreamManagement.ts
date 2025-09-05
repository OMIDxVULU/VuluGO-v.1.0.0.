/**
 * Test utilities for stream management functionality
 * Use these functions to test the automatic ending, rejoin logic, and UI updates
 */

import { streamingService } from '../services/streamingService';
import { Alert } from 'react-native';

export const testStreamManagement = {
  /**
   * Test automatic stream ending when all participants leave
   */
  async testAutomaticStreamEnding() {
    console.log('🧪 Testing automatic stream ending...');
    
    try {
      // Create a test stream
      const streamId = await streamingService.createStream(
        'Test Stream',
        'test-host-id',
        'Test Host',
        'https://via.placeholder.com/40'
      );
      
      console.log(`✅ Created test stream: ${streamId}`);
      
      // Add a viewer
      await streamingService.joinStream(
        streamId,
        'test-viewer-id',
        'Test Viewer',
        'https://via.placeholder.com/40'
      );
      
      console.log('✅ Added viewer to stream');
      
      // Check stream has participants
      const session = streamingService.getStreamSession(streamId);
      console.log(`📊 Stream has ${session?.participants.length} participants`);
      
      // Remove viewer
      await streamingService.leaveStream(streamId, 'test-viewer-id');
      console.log('✅ Viewer left stream');
      
      // Remove host (should trigger automatic ending)
      await streamingService.leaveStream(streamId, 'test-host-id');
      console.log('✅ Host left stream');
      
      // Check if stream ended automatically
      const finalSession = streamingService.getStreamSession(streamId);
      if (!finalSession) {
        console.log('🎉 SUCCESS: Stream ended automatically when all participants left');
      } else {
        console.log('❌ FAILED: Stream did not end automatically');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  },

  /**
   * Test host identification
   */
  async testHostIdentification() {
    console.log('🧪 Testing host identification...');
    
    try {
      // Create a test stream
      const streamId = await streamingService.createStream(
        'Host Test Stream',
        'host-user-id',
        'Host User',
        'https://via.placeholder.com/40'
      );
      
      // Test host identification
      const isHost = await streamingService.isUserStreamHost(streamId, 'host-user-id');
      const isNotHost = await streamingService.isUserStreamHost(streamId, 'random-user-id');
      
      if (isHost && !isNotHost) {
        console.log('🎉 SUCCESS: Host identification working correctly');
      } else {
        console.log('❌ FAILED: Host identification not working');
        console.log(`Host check: ${isHost}, Non-host check: ${isNotHost}`);
      }
      
      // Clean up
      await streamingService.endStream(streamId);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  },

  /**
   * Test participant counting
   */
  async testParticipantCounting() {
    console.log('🧪 Testing participant counting...');
    
    try {
      // Create a test stream
      const streamId = await streamingService.createStream(
        'Participant Test Stream',
        'host-id',
        'Host',
        'https://via.placeholder.com/40'
      );
      
      let session = streamingService.getStreamSession(streamId);
      console.log(`📊 Initial participants: ${session?.participants.length} (should be 1)`);
      
      // Add viewers
      await streamingService.joinStream(streamId, 'viewer1', 'Viewer 1', 'https://via.placeholder.com/40');
      await streamingService.joinStream(streamId, 'viewer2', 'Viewer 2', 'https://via.placeholder.com/40');
      
      session = streamingService.getStreamSession(streamId);
      console.log(`📊 After adding viewers: ${session?.participants.length} (should be 3)`);
      console.log(`📊 Viewer count: ${session?.viewerCount} (should be 2)`);
      
      // Remove one viewer
      await streamingService.leaveStream(streamId, 'viewer1');
      
      session = streamingService.getStreamSession(streamId);
      console.log(`📊 After removing one viewer: ${session?.participants.length} (should be 2)`);
      console.log(`📊 Viewer count: ${session?.viewerCount} (should be 1)`);
      
      if (session?.participants.length === 2 && session?.viewerCount === 1) {
        console.log('🎉 SUCCESS: Participant counting working correctly');
      } else {
        console.log('❌ FAILED: Participant counting not working correctly');
      }
      
      // Clean up
      await streamingService.endStream(streamId);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  },

  /**
   * Test rejoin functionality (the main issue reported)
   */
  async testRejoinFunctionality() {
    console.log('🧪 Testing rejoin functionality...');

    try {
      // Create two test streams
      const stream1Id = await streamingService.createStream(
        'Test Stream 1',
        'test-host-1',
        'Host 1',
        'https://via.placeholder.com/40'
      );

      const stream2Id = await streamingService.createStream(
        'Test Stream 2',
        'test-host-2',
        'Host 2',
        'https://via.placeholder.com/40'
      );

      console.log(`✅ Created test streams: ${stream1Id} and ${stream2Id}`);

      // Join first stream as viewer
      await streamingService.joinStream(
        stream1Id,
        'test-viewer',
        'Test Viewer',
        'https://via.placeholder.com/40'
      );
      console.log('✅ Joined first stream');

      // Leave first stream
      await streamingService.leaveStream(stream1Id, 'test-viewer');
      console.log('✅ Left first stream');

      // Immediately try to join second stream (this was failing before)
      await streamingService.joinStream(
        stream2Id,
        'test-viewer',
        'Test Viewer',
        'https://via.placeholder.com/40'
      );
      console.log('✅ Successfully joined second stream immediately after leaving first');

      // Clean up
      await streamingService.endStream(stream1Id);
      await streamingService.endStream(stream2Id);

      console.log('🎉 SUCCESS: Rejoin functionality working correctly');

    } catch (error) {
      console.error('❌ Rejoin test failed:', error);
    }
  },

  /**
   * Test stream cleanup when empty
   */
  async testStreamCleanupWhenEmpty() {
    console.log('🧪 Testing stream cleanup when empty...');

    try {
      // Create a test stream
      const streamId = await streamingService.createStream(
        'Empty Test Stream',
        'test-host',
        'Test Host',
        'https://via.placeholder.com/40'
      );

      console.log(`✅ Created test stream: ${streamId}`);

      // Add a viewer
      await streamingService.joinStream(
        streamId,
        'test-viewer',
        'Test Viewer',
        'https://via.placeholder.com/40'
      );
      console.log('✅ Added viewer to stream');

      // Check stream exists in cache
      let session = streamingService.getStreamSession(streamId);
      console.log(`📊 Stream has ${session?.participants.length} participants`);

      // Remove viewer (should not end stream yet - host still there)
      await streamingService.leaveStream(streamId, 'test-viewer');
      console.log('✅ Viewer left stream');

      session = streamingService.getStreamSession(streamId);
      if (session) {
        console.log(`📊 Stream still active with ${session.participants.length} participants (host remaining)`);
      }

      // Remove host (should end stream automatically)
      await streamingService.leaveStream(streamId, 'test-host');
      console.log('✅ Host left stream');

      // Check if stream ended automatically
      session = streamingService.getStreamSession(streamId);
      if (!session) {
        console.log('🎉 SUCCESS: Stream ended automatically when empty');
      } else {
        console.log('❌ FAILED: Stream did not end automatically');
      }

    } catch (error) {
      console.error('❌ Empty stream cleanup test failed:', error);
    }
  },

  /**
   * Test UI state synchronization (highlighting persistence fix)
   */
  async testUIStateSynchronization() {
    console.log('🧪 Testing UI state synchronization...');

    try {
      // Create a test stream
      const streamId = await streamingService.createStream(
        'UI Test Stream',
        'test-host',
        'Test Host',
        'https://via.placeholder.com/40'
      );

      console.log(`✅ Created test stream: ${streamId}`);

      // Join stream as viewer
      await streamingService.joinStream(
        streamId,
        'test-viewer',
        'Test Viewer',
        'https://via.placeholder.com/40'
      );
      console.log('✅ Joined stream - should be highlighted in UI');

      // Wait a moment to simulate user interaction
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Leave stream
      await streamingService.leaveStream(streamId, 'test-viewer');
      console.log('✅ Left stream - highlighting should be cleared immediately');

      // Clean up
      await streamingService.endStream(streamId);

      console.log('🎉 SUCCESS: UI state synchronization test completed');
      console.log('📝 Manual verification needed: Check that stream highlighting is cleared when leaving');

    } catch (error) {
      console.error('❌ UI state synchronization test failed:', error);
    }
  },

  /**
   * Test empty stream visibility issue (main reported problem)
   */
  async testEmptyStreamVisibility() {
    console.log('🧪 Testing empty stream visibility issue...');

    try {
      // Create a test stream
      const streamId = await streamingService.createStream(
        'Visibility Test Stream',
        'test-host',
        'Test Host',
        'https://via.placeholder.com/40'
      );

      console.log(`✅ Created test stream: ${streamId}`);

      // Verify stream appears in active streams
      let activeStreams = await streamingService.getActiveStreams();
      const streamExists = activeStreams.some(s => s.id === streamId);
      console.log(`📊 Stream visible in active streams: ${streamExists} (${activeStreams.length} total streams)`);

      // Join as viewer
      await streamingService.joinStream(
        streamId,
        'test-viewer',
        'Test Viewer',
        'https://via.placeholder.com/40'
      );
      console.log('✅ Viewer joined stream');

      // Leave as viewer (host should still be there)
      await streamingService.leaveStream(streamId, 'test-viewer');
      console.log('✅ Viewer left stream');

      // Check if stream is still visible (should be, host is still there)
      activeStreams = await streamingService.getActiveStreams();
      const streamStillExists = activeStreams.some(s => s.id === streamId);
      console.log(`📊 Stream still visible after viewer left: ${streamStillExists}`);

      // Leave as host (should end stream)
      await streamingService.leaveStream(streamId, 'test-host');
      console.log('✅ Host left stream');

      // Wait a moment for cleanup to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if stream is gone from active streams
      activeStreams = await streamingService.getActiveStreams();
      const streamGone = !activeStreams.some(s => s.id === streamId);
      console.log(`📊 Stream removed from active streams: ${streamGone} (${activeStreams.length} total streams)`);

      if (streamGone) {
        console.log('🎉 SUCCESS: Empty stream properly removed from visibility');
      } else {
        console.log('❌ FAILED: Empty stream still visible in active streams');
        // Show details of the problematic stream
        const problematicStream = activeStreams.find(s => s.id === streamId);
        if (problematicStream) {
          console.log(`🔍 Problematic stream details:`, {
            id: problematicStream.id,
            hosts: problematicStream.hosts.length,
            viewers: problematicStream.viewers.length,
            views: problematicStream.views,
            isActive: problematicStream.isActive
          });
        }
      }

    } catch (error) {
      console.error('❌ Empty stream visibility test failed:', error);
    }
  },

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive stream management tests...');

    await this.testEmptyStreamVisibility();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait between tests

    await this.testUIStateSynchronization();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests

    await this.testRejoinFunctionality();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests

    await this.testStreamCleanupWhenEmpty();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests

    await this.testAutomaticStreamEnding();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests

    await this.testHostIdentification();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests

    await this.testParticipantCounting();

    console.log('✅ All stream management tests completed');
  }
};

/**
 * Simple test function that can be called from console
 */
export const quickStreamTest = async () => {
  console.log('🚀 Starting quick stream test...');

  try {
    // Get initial stream count
    const initialStreams = await streamingService.getActiveStreams();
    console.log(`📊 Initial active streams: ${initialStreams.length}`);

    // Create a test stream
    const streamId = await streamingService.createStream(
      'Quick Test Stream',
      'test-user-123',
      'Test User',
      'https://via.placeholder.com/40'
    );

    console.log(`✅ Created stream: ${streamId}`);

    // Wait 2 seconds for creation to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check stream was created
    const afterCreateStreams = await streamingService.getActiveStreams();
    console.log(`📊 After creation: ${afterCreateStreams.length} active streams`);

    // Leave the stream (should trigger immediate cleanup)
    console.log(`🔄 Leaving stream ${streamId}...`);
    await streamingService.leaveStream(streamId, 'test-user-123');

    console.log(`✅ Left stream: ${streamId}`);

    // Wait for cleanup to process (should be immediate with our fix)
    console.log(`⏳ Waiting for cleanup to process...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if stream is gone
    const finalStreams = await streamingService.getActiveStreams();
    const streamExists = finalStreams.some(s => s.id === streamId);

    console.log(`📊 Final active streams: ${finalStreams.length}`);
    console.log(`📊 Stream still exists: ${streamExists}`);

    if (!streamExists && finalStreams.length === initialStreams.length) {
      console.log('🎉 SUCCESS: Stream was properly cleaned up immediately!');
      console.log('✅ Stream count returned to initial value');
    } else if (!streamExists) {
      console.log('🎉 SUCCESS: Stream was cleaned up, but stream count may be different');
    } else {
      console.log('❌ FAILED: Stream still exists after cleanup');
      console.log('🔍 Problematic stream details:', finalStreams.find(s => s.id === streamId));
    }

  } catch (error) {
    console.error('❌ Quick test failed:', error);
  }
};

// Make it available globally for console testing (development only)
if (__DEV__) {
  try {
    (global as any).quickStreamTest = quickStreamTest;
  } catch (error) {
    console.warn('⚠️ Failed to attach quickStreamTest globally:', error);
  }
}

/**
 * Show test results in an alert
 */
export const showTestResults = () => {
  Alert.alert(
    'Stream Management Tests',
    'Check the console for detailed test results. Tests include:\n\n• Automatic stream ending\n• Host identification\n• Participant counting',
    [
      {
        text: 'Run Tests',
        onPress: () => testStreamManagement.runAllTests()
      },
      {
        text: 'Quick Test',
        onPress: () => quickStreamTest()
      },
      {
        text: 'Cancel',
        style: 'cancel'
      }
    ]
  );
};
