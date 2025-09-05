/**
 * Debug Stream Test Utility
 * Manual testing functions for stream cleanup issues
 */

import { firestoreService } from '../services/firestoreService';
import { streamingService } from '../services/streamingService';

interface Participant {
  id: string;
  isHost?: boolean;
  joinedAt?: any;
  // Add other participant fields as needed
}

export class DebugStreamTest {
  /**
   * Test and log all stream data from Firebase
   */
  static async testFirebaseStreams(): Promise<void> {
    console.log('🔧 [DEBUG_TEST] Starting Firebase stream test...');
    
    try {
      // Get active streams
      const activeStreams = await firestoreService.getActiveStreams();
      console.log(`🔧 [DEBUG_TEST] Found ${activeStreams.length} active streams`);
      
      // Get all streams (including inactive)
      const allStreams = await firestoreService.getAllStreams();
      console.log(`🔧 [DEBUG_TEST] Found ${allStreams.length} total streams`);
      
      // Log detailed info for each active stream
      for (const stream of activeStreams) {
        console.log(`🔧 [DEBUG_TEST] Active Stream ${stream.id}:`, {
          title: stream.title,
          isActive: stream.isActive,
          hostId: stream.hostId,
          participants: stream.participants,
          participantCount: stream.participants?.length || 0,
          hasHosts: stream.participants?.some((p: Participant) => !!p.isHost) || false,
          startedAt: stream.startedAt ? new Date(stream.startedAt).toISOString() : 'unknown',
          createdAt: stream.createdAt ? new Date(stream.createdAt.seconds * 1000).toISOString() : 'unknown'
        });
        
        // Check if this stream should be cleaned up
        const participants = stream.participants || [];
        const hasParticipants = participants.length > 0;
        const hasHosts = participants.some((p: Participant) => !!p.isHost);
        
        if (!hasParticipants || !hasHosts) {
          console.log(`🚨 [DEBUG_TEST] Stream ${stream.id} is a PHANTOM STREAM - should be cleaned up!`);
        } else {
          console.log(`✅ [DEBUG_TEST] Stream ${stream.id} is valid`);
        }
      }
      
      // Log inactive streams
      const inactiveStreams = allStreams.filter(s => !s.isActive);
      console.log(`🔧 [DEBUG_TEST] Found ${inactiveStreams.length} inactive streams`);
      
      for (const stream of inactiveStreams.slice(0, 5)) { // Show first 5 inactive
        console.log(`🔧 [DEBUG_TEST] Inactive Stream ${stream.id}:`, {
          title: stream.title,
          isActive: stream.isActive,
          endedAt: stream.endedAt ? new Date(stream.endedAt.seconds * 1000).toISOString() : 'unknown'
        });
      }
      
    } catch (error) {
      console.error('🔧 [DEBUG_TEST] Error testing Firebase streams:', error);
    }
  }

  /**
   * Force cleanup all phantom streams
   */
  static async forceCleanupTest(): Promise<void> {
    console.log('🔧 [DEBUG_TEST] Starting force cleanup test...');
    
    try {
      await streamingService.forceCleanupPhantomStreams();
      console.log('🔧 [DEBUG_TEST] Force cleanup completed');
      
      // Poll for results with timeout to ensure cleanup has been processed
      console.log('🔧 [DEBUG_TEST] Checking results after cleanup...');
      
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 500; // 500ms
      
      while (attempts < maxAttempts) {
        try {
          const streamsAfter = await firestoreService.getActiveStreams();
          console.log(`🔧 [DEBUG_TEST] Active streams after cleanup (attempt ${attempts + 1}): ${streamsAfter.length}`);
          
          for (const stream of streamsAfter) {
            console.log(`🔧 [DEBUG_TEST] Remaining stream ${stream.id}:`, {
              participants: stream.participants?.length || 0,
              hasHosts: stream.participants?.some((p: Participant) => !!p.isHost) || false
            });
          }
          
          // If we got results, we're done
          break;
        } catch (error) {
          console.warn(`🔧 [DEBUG_TEST] Attempt ${attempts + 1} failed:`, error);
          attempts++;
          
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          } else {
            console.error('🔧 [DEBUG_TEST] All attempts failed to get post-cleanup results');
          }
        }
      }
      
    } catch (error) {
      console.error('🔧 [DEBUG_TEST] Error in force cleanup test:', error);
    }
  }

  /**
   * Test stream auto-end logic
   */
  static async testAutoEndLogic(): Promise<void> {
    console.log('🔧 [DEBUG_TEST] Testing auto-end logic...');
    
    try {
      const activeStreams = await firestoreService.getActiveStreams();
      
      for (const stream of activeStreams) {
        const participants = stream.participants || [];
        const hasParticipants = participants.length > 0;
        const hasHosts = participants.some((p: Participant) => !!p.isHost);
        
        console.log(`🔧 [DEBUG_TEST] Stream ${stream.id} auto-end check:`, {
          participantCount: participants.length,
          hasParticipants,
          hasHosts,
          shouldEnd: !hasParticipants || !hasHosts
        });
        
        // Simulate the shouldEndStreamAutomatically logic
        const shouldEnd = participants.length === 0 || !hasHosts;
        console.log(`🔧 [DEBUG_TEST] shouldEndStreamAutomatically(${stream.id}): ${shouldEnd}`);
      }
      
    } catch (error) {
      console.error('🔧 [DEBUG_TEST] Error testing auto-end logic:', error);
    }
  }

  /**
   * Test refresh system
   */
  static async testRefreshSystem(): Promise<void> {
    console.log('🔧 [DEBUG_TEST] Testing refresh system...');
    
    try {
      // Get streams before refresh
      const streamsBefore = await firestoreService.getActiveStreams();
      console.log(`🔧 [DEBUG_TEST] Streams before refresh: ${streamsBefore.length}`);
      
      // Call the streaming service getActiveStreams (which includes cleanup)
      const streamsAfter = await streamingService.getActiveStreams();
      console.log(`🔧 [DEBUG_TEST] Streams after refresh: ${streamsAfter.length}`);
      
      const difference = streamsBefore.length - streamsAfter.length;
      if (difference > 0) {
        console.log(`🔧 [DEBUG_TEST] Refresh cleaned up ${difference} phantom streams`);
      } else {
        console.log(`🔧 [DEBUG_TEST] No streams were cleaned up during refresh`);
      }
      
    } catch (error) {
      console.error('🔧 [DEBUG_TEST] Error testing refresh system:', error);
    }
  }
}

// Make functions globally available (development only)
if (typeof window !== 'undefined' && __DEV__) {
  try {
    (window as any).testFirebaseStreams = () => DebugStreamTest.testFirebaseStreams();
    (window as any).forceCleanupTest = () => DebugStreamTest.forceCleanupTest();
    (window as any).testAutoEndLogic = () => DebugStreamTest.testAutoEndLogic();
    (window as any).testRefreshSystem = () => DebugStreamTest.testRefreshSystem();

    console.log('🔧 [DEBUG_TEST] Global test functions available:');
    console.log('  - testFirebaseStreams() - Check all Firebase stream data');
    console.log('  - forceCleanupTest() - Test force cleanup');
    console.log('  - testAutoEndLogic() - Test auto-end logic');
    console.log('  - testRefreshSystem() - Test refresh cleanup');
  } catch (error) {
    console.warn('⚠️ Failed to attach debug test functions:', error);
  }
}

export default DebugStreamTest;
