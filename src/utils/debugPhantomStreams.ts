/**
 * Debug utility for phantom stream analysis
 * This can be used from browser console to debug phantom stream issues
 */

import { firestoreService } from '../services/firestoreService';
import { streamingService } from '../services/streamingService';

export class PhantomStreamDebugger {
  /**
   * Comprehensive phantom stream analysis
   */
  static async analyzePhantomStreams(): Promise<void> {
    console.log('🔧 [PHANTOM_DEBUG] Starting comprehensive phantom stream analysis...');
    
    try {
      // 1. Get all active streams from Firebase
      const activeStreams = await firestoreService.getActiveStreams();
      console.log(`📊 [PHANTOM_DEBUG] Found ${activeStreams.length} active streams in Firebase`);
      
      if (activeStreams.length === 0) {
        console.log('✅ [PHANTOM_DEBUG] No active streams found - system is clean!');
        return;
      }
      
      // 2. Analyze each stream
      const phantomStreams = [];
      const validStreams = [];
      
      for (const stream of activeStreams) {
        console.log(`\n🔍 [PHANTOM_DEBUG] Analyzing stream ${stream.id}:`);
        console.log(`  - Title: ${stream.title}`);
        console.log(`  - Host ID: ${stream.hostId}`);
        console.log(`  - Is Active: ${stream.isActive}`);
        console.log(`  - Started At: ${stream.startedAt}`);
        
        const participants = stream.participants || [];
        const hasParticipants = participants.length > 0;
        const hasHosts = participants.some((p: any) => p.isHost);
        
        console.log(`  - Participants: ${participants.length}`);
        console.log(`  - Has Hosts: ${hasHosts}`);
        console.log(`  - Participant Details:`, participants.map((p: any) => ({
          id: p.id,
          name: p.name,
          isHost: p.isHost
        })));
        
        // Check if this is a phantom stream
        const isPhantom = !hasParticipants || !hasHosts;
        
        if (isPhantom) {
          console.log(`  - 🚨 PHANTOM STREAM DETECTED!`);
          console.log(`  - Reason: ${!hasParticipants ? 'No participants' : 'No hosts'}`);
          phantomStreams.push(stream);
        } else {
          console.log(`  - ✅ Valid stream`);
          validStreams.push(stream);
        }
      }
      
      // 3. Summary
      console.log(`\n📊 [PHANTOM_DEBUG] Analysis Summary:`);
      console.log(`  - Total Active Streams: ${activeStreams.length}`);
      console.log(`  - Valid Streams: ${validStreams.length}`);
      console.log(`  - Phantom Streams: ${phantomStreams.length}`);
      
      if (phantomStreams.length > 0) {
        console.log(`\n🚨 [PHANTOM_DEBUG] PHANTOM STREAMS FOUND:`);
        phantomStreams.forEach(stream => {
          console.log(`  - ${stream.id} (${stream.title})`);
        });
        
        console.log(`\n💡 [PHANTOM_DEBUG] These streams should be cleaned up!`);
        console.log(`Run debugCleanupPhantomStreams() to force cleanup.`);
      } else {
        console.log(`\n✅ [PHANTOM_DEBUG] No phantom streams detected - system is healthy!`);
      }
      
    } catch (error) {
      console.error('❌ [PHANTOM_DEBUG] Error during analysis:', error);
    }
  }
  
  /**
   * Test the cleanup system
   */
  static async testCleanupSystem(): Promise<void> {
    console.log('🧪 [PHANTOM_DEBUG] Testing cleanup system...');
    
    try {
      // 1. Get streams before cleanup
      const streamsBefore = await firestoreService.getActiveStreams();
      console.log(`📊 [PHANTOM_DEBUG] Streams before cleanup: ${streamsBefore.length}`);
      
      // 2. Run force cleanup
      console.log('🧹 [PHANTOM_DEBUG] Running forceCleanupPhantomStreams...');
      await streamingService.forceCleanupPhantomStreams();
      
      // 3. Wait a moment for Firebase to sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 4. Get streams after cleanup
      const streamsAfter = await firestoreService.getActiveStreams();
      console.log(`📊 [PHANTOM_DEBUG] Streams after cleanup: ${streamsAfter.length}`);
      
      const cleanedCount = streamsBefore.length - streamsAfter.length;
      
      if (cleanedCount > 0) {
        console.log(`✅ [PHANTOM_DEBUG] Cleanup successful! Removed ${cleanedCount} phantom streams.`);
      } else {
        console.log(`ℹ️ [PHANTOM_DEBUG] No streams were cleaned up. Either no phantoms exist or cleanup failed.`);
      }
      
      // 5. Analyze remaining streams
      if (streamsAfter.length > 0) {
        console.log(`\n🔍 [PHANTOM_DEBUG] Analyzing remaining streams:`);
        await this.analyzePhantomStreams();
      }
      
    } catch (error) {
      console.error('❌ [PHANTOM_DEBUG] Error testing cleanup system:', error);
    }
  }
  
  /**
   * Force cleanup all phantom streams
   */
  static async cleanupPhantomStreams(): Promise<void> {
    console.log('🧹 [PHANTOM_DEBUG] Force cleaning up phantom streams...');
    
    try {
      await streamingService.forceCleanupPhantomStreams();
      console.log('✅ [PHANTOM_DEBUG] Cleanup completed!');
      
      // Wait and verify
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.analyzePhantomStreams();
      
    } catch (error) {
      console.error('❌ [PHANTOM_DEBUG] Error during cleanup:', error);
    }
  }

  /**
   * Clean up a specific phantom stream by ID
   */
  static async cleanupSpecificStream(streamId: string): Promise<void> {
    console.log(`🧹 [PHANTOM_DEBUG] Cleaning up specific stream: ${streamId}`);
    
    try {
      // Use the streaming service to end the stream
      await streamingService.endStream(streamId);
      console.log(`✅ [PHANTOM_DEBUG] Successfully ended stream: ${streamId}`);
      
      // Wait and verify
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if it's gone
      const stream = await firestoreService.getStreamById(streamId);
      if (!stream || !stream.isActive) {
        console.log(`✅ [PHANTOM_DEBUG] Stream ${streamId} is now inactive!`);
      } else {
        console.log(`⚠️ [PHANTOM_DEBUG] Stream ${streamId} is still active - may need manual cleanup`);
      }
      
    } catch (error) {
      console.error(`❌ [PHANTOM_DEBUG] Error cleaning up stream ${streamId}:`, error);
    }
  }
  
  /**
   * Test a specific stream by ID
   */
  static async testStream(streamId: string): Promise<void> {
    console.log(`🔍 [PHANTOM_DEBUG] Testing specific stream: ${streamId}`);
    
    try {
      const stream = await firestoreService.getStreamById(streamId);
      
      if (!stream) {
        console.log(`❌ [PHANTOM_DEBUG] Stream ${streamId} not found`);
        return;
      }
      
      console.log(`📊 [PHANTOM_DEBUG] Stream details:`, {
        id: stream.id,
        title: stream.title,
        isActive: stream.isActive,
        participants: stream.participants?.length || 0,
        hasHosts: stream.participants?.some((p: any) => p.isHost) || false,
        participantDetails: stream.participants?.map((p: any) => ({
          id: p.id,
          name: p.name,
          isHost: p.isHost
        })) || []
      });
      
      const participants = stream.participants || [];
      const hasParticipants = participants.length > 0;
      const hasHosts = participants.some((p: any) => p.isHost);
      const isPhantom = !hasParticipants || !hasHosts;
      
      if (isPhantom) {
        console.log(`🚨 [PHANTOM_DEBUG] This is a PHANTOM STREAM!`);
        console.log(`Reason: ${!hasParticipants ? 'No participants' : 'No hosts'}`);
        console.log(`Run cleanupPhantomStreams() to clean it up.`);
      } else {
        console.log(`✅ [PHANTOM_DEBUG] This is a valid stream.`);
      }
      
    } catch (error) {
      console.error(`❌ [PHANTOM_DEBUG] Error testing stream ${streamId}:`, error);
    }
  }
}

// Make functions globally available in development
if (typeof window !== 'undefined' && __DEV__) {
  try {
    (window as any).analyzePhantomStreams = () => PhantomStreamDebugger.analyzePhantomStreams();
    (window as any).testCleanupSystem = () => PhantomStreamDebugger.testCleanupSystem();
    (window as any).debugCleanupPhantomStreams = () => PhantomStreamDebugger.cleanupPhantomStreams();
    (window as any).cleanupSpecificStream = (streamId: string) => PhantomStreamDebugger.cleanupSpecificStream(streamId);
    (window as any).testStream = (streamId: string) => PhantomStreamDebugger.testStream(streamId);

    console.log('🔧 [PHANTOM_DEBUG] Debug functions available:');
    console.log('  - analyzePhantomStreams() - Analyze all active streams for phantoms');
    console.log('  - testCleanupSystem() - Test the cleanup system end-to-end');
    console.log('  - debugCleanupPhantomStreams() - Force cleanup all phantom streams');
    console.log('  - cleanupSpecificStream(streamId) - Clean up a specific stream by ID');
    console.log('  - testStream(streamId) - Test a specific stream by ID');
  } catch (error) {
    console.warn('⚠️ Failed to attach phantom debug functions:', error);
  }
}

export default PhantomStreamDebugger;
