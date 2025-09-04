/**
 * Stream Cleanup Utility
 * Provides manual cleanup functions for phantom/empty streams
 */

import { streamingService } from '../services/streamingService';
import { firestoreService } from '../services/firestoreService';

export class StreamCleanupUtility {
  /**
   * Perform comprehensive cleanup of all phantom streams
   */
  static async performFullCleanup(): Promise<{
    totalStreams: number;
    phantomStreams: number;
    cleanedStreams: string[];
    errors: string[];
  }> {
    console.log('🧹 [CLEANUP] Starting comprehensive stream cleanup...');
    
    const result = {
      totalStreams: 0,
      phantomStreams: 0,
      cleanedStreams: [] as string[],
      errors: [] as string[]
    };

    try {
      // Get all streams from Firebase (including inactive ones)
      const allStreams = await firestoreService.getAllStreams();
      result.totalStreams = allStreams.length;
      
      console.log(`📊 [CLEANUP] Found ${allStreams.length} total streams in Firebase`);

      for (const stream of allStreams) {
        try {
          const participants = stream.participants || [];
          const hasParticipants = participants.length > 0;
          const hasHosts = participants.some((p: any) => p.isHost);
          const isActive = stream.isActive;

          console.log(`🔍 [CLEANUP] Analyzing stream ${stream.id}:`, {
            isActive,
            participants: participants.length,
            hasHosts,
            title: stream.title
          });

          // Mark as phantom if:
          // 1. Stream is marked as active but has no participants
          // 2. Stream is marked as active but has no hosts
          // 3. Stream has been active for more than 24 hours (stale)
          const isPhantom = isActive && (!hasParticipants || !hasHosts);
          // Convert startedAt to numeric timestamp for safe comparison
          let startedAtTimestamp: number | null = null;
          if (stream.startedAt) {
            if (typeof stream.startedAt === 'number') {
              startedAtTimestamp = stream.startedAt;
            } else if (stream.startedAt.seconds) {
              // Firestore timestamp object
              startedAtTimestamp = stream.startedAt.seconds * 1000;
            } else {
              // Try parsing as date string or Date object
              const parsed = new Date(stream.startedAt).getTime();
              if (!isNaN(parsed)) {
                startedAtTimestamp = parsed;
              }
            }
          }
          
          const isStale = isActive && startedAtTimestamp && 
            Number.isFinite(startedAtTimestamp) && 
            (Date.now() - startedAtTimestamp > 24 * 60 * 60 * 1000);

          if (isPhantom || isStale) {
            console.log(`🚨 [CLEANUP] Stream ${stream.id} is ${isPhantom ? 'phantom' : 'stale'}, cleaning up...`);
            result.phantomStreams++;

            // End the stream with proper cleanup reason
            await streamingService.endStream(stream.id);
            result.cleanedStreams.push(stream.id);
            
            console.log(`✅ [CLEANUP] Successfully cleaned up stream ${stream.id}`);
          } else {
            console.log(`✅ [CLEANUP] Stream ${stream.id} is valid, keeping`);
          }

        } catch (error) {
          const errorMsg = `Failed to cleanup stream ${stream.id}: ${error}`;
          console.error(`❌ [CLEANUP] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      console.log(`🎉 [CLEANUP] Cleanup completed:`, {
        total: result.totalStreams,
        phantom: result.phantomStreams,
        cleaned: result.cleanedStreams.length,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      console.error('❌ [CLEANUP] Error during full cleanup:', error);
      result.errors.push(`Full cleanup error: ${error}`);
      return result;
    }
  }

  /**
   * Quick cleanup of obviously phantom streams
   */
  static async performQuickCleanup(): Promise<number> {
    console.log('🧹 [CLEANUP] Starting quick phantom stream cleanup...');
    
    try {
      const activeStreams = await firestoreService.getActiveStreams();
      console.log(`📊 [CLEANUP] Found ${activeStreams.length} active streams`);

      let cleanedCount = 0;

      for (const stream of activeStreams) {
        const participants = stream.participants || [];
        const hasParticipants = participants.length > 0;
        const hasHosts = participants.some((p: any) => p.isHost);

        if (!hasParticipants || !hasHosts) {
          console.log(`🚨 [CLEANUP] Quick cleanup of phantom stream ${stream.id}`);
          
          try {
            await streamingService.endStream(stream.id);
            cleanedCount++;
            console.log(`✅ [CLEANUP] Quick cleanup successful for stream ${stream.id}`);
          } catch (error) {
            console.error(`❌ [CLEANUP] Quick cleanup failed for stream ${stream.id}:`, error);
          }
        }
      }

      console.log(`🎉 [CLEANUP] Quick cleanup completed: ${cleanedCount} streams cleaned`);
      return cleanedCount;

    } catch (error) {
      console.error('❌ [CLEANUP] Error during quick cleanup:', error);
      return 0;
    }
  }

  /**
   * Validate stream integrity and report issues
   */
  static async validateStreamIntegrity(): Promise<{
    validStreams: number;
    phantomStreams: number;
    staleStreams: number;
    issues: string[];
  }> {
    console.log('🔍 [CLEANUP] Starting stream integrity validation...');
    
    const result = {
      validStreams: 0,
      phantomStreams: 0,
      staleStreams: 0,
      issues: [] as string[]
    };

    try {
      const activeStreams = await firestoreService.getActiveStreams();
      console.log(`📊 [CLEANUP] Validating ${activeStreams.length} active streams`);

      for (const stream of activeStreams) {
        const participants = stream.participants || [];
        const hasParticipants = participants.length > 0;
        const hasHosts = participants.some((p: any) => p.isHost);
        const isStale = stream.startedAt && (Date.now() - stream.startedAt > 24 * 60 * 60 * 1000);

        if (!hasParticipants) {
          result.phantomStreams++;
          result.issues.push(`Stream ${stream.id} has no participants`);
        } else if (!hasHosts) {
          result.phantomStreams++;
          result.issues.push(`Stream ${stream.id} has no hosts`);
        } else if (isStale) {
          result.staleStreams++;
          result.issues.push(`Stream ${stream.id} is stale (>24h old)`);
        } else {
          result.validStreams++;
        }
      }

      console.log(`🎉 [CLEANUP] Validation completed:`, result);
      return result;

    } catch (error) {
      console.error('❌ [CLEANUP] Error during validation:', error);
      result.issues.push(`Validation error: ${error}`);
      return result;
    }
  }
}

// Export default for easy importing
export default StreamCleanupUtility;
