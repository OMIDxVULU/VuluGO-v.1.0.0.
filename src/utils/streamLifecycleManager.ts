/**
 * Stream Lifecycle Manager
 * Handles proper stream ending, participant cleanup, and UI updates
 */

import { streamingService } from '../services/streamingService';
import { firestoreService } from '../services/firestoreService';

interface StreamEndReason {
  type: 'host_left' | 'no_participants' | 'manual_end' | 'timeout' | 'error';
  details?: string;
}

class StreamLifecycleManager {
  private static endingStreams = new Set<string>();

  /**
   * End a stream with proper lifecycle management
   */
  static async endStreamWithLifecycle(
    streamId: string, 
    reason: StreamEndReason,
    triggerUserId?: string
  ): Promise<void> {
    // Prevent duplicate ending operations
    if (this.endingStreams.has(streamId)) {
      console.log(`🔄 [LIFECYCLE] Stream ${streamId} already being ended, skipping`);
      return;
    }

    try {
      this.endingStreams.add(streamId);
      console.log(`🔄 [LIFECYCLE] Starting stream lifecycle end for ${streamId}`, reason);

      // 1. Get current stream state
      const session = streamingService.getStreamSession(streamId);
      if (!session) {
        console.warn(`⚠️ [LIFECYCLE] Stream ${streamId} not found in local cache`);
        // Still proceed with Firebase cleanup
      }

      // 2. Log current state for debugging
      if (session) {
        console.log(`📊 [LIFECYCLE] Stream ${streamId} current state:`, {
          participants: session.participants?.length || 0,
          hosts: session.participants?.filter(p => p.isHost).length || 0,
          viewers: session.participants?.filter(p => !p.isHost).length || 0,
          isActive: session.isActive
        });
      }

      // 3. Notify all participants about stream ending
      await this.notifyParticipantsStreamEnding(streamId, reason, session);

      // 4. End the stream through streaming service
      console.log(`🔄 [LIFECYCLE] Calling streamingService.endStream for ${streamId}`);
      await streamingService.endStream(streamId);

      // 5. Verify stream was properly ended in Firebase
      await this.verifyStreamEnded(streamId);

      // 6. Clean up any remaining participant records
      await this.cleanupParticipantRecords(streamId, session);

      console.log(`✅ [LIFECYCLE] Stream ${streamId} lifecycle end completed successfully`);

    } catch (error) {
      console.error(`❌ [LIFECYCLE] Error ending stream ${streamId}:`, error);
      
      // Emergency cleanup - force end the stream
      try {
        await this.emergencyStreamCleanup(streamId);
      } catch (cleanupError) {
        console.error(`❌ [LIFECYCLE] Emergency cleanup failed for ${streamId}:`, cleanupError);
      }
      
      throw error;
    } finally {
      this.endingStreams.delete(streamId);
    }
  }

  /**
   * Check if a stream should be automatically ended
   */
  static shouldAutoEndStream(session: any): { shouldEnd: boolean; reason?: StreamEndReason } {
    if (!session) {
      return { shouldEnd: true, reason: { type: 'error', details: 'Session not found' } };
    }

    // No participants at all
    if (!session.participants || session.participants.length === 0) {
      return { shouldEnd: true, reason: { type: 'no_participants' } };
    }

    // No hosts remaining
    const hasHosts = session.participants.some((p: any) => p.isHost);
    if (!hasHosts) {
      return { shouldEnd: true, reason: { type: 'host_left' } };
    }

    return { shouldEnd: false };
  }

  /**
   * Handle host leaving with proper confirmation and cleanup
   */
  static async handleHostLeave(streamId: string, hostId: string): Promise<void> {
    console.log(`🔄 [LIFECYCLE] Handling host leave: ${hostId} from stream ${streamId}`);

    // First remove the host from participants
    await streamingService.leaveStream(streamId, hostId);

    // Check if stream should end after host leaves
    const session = streamingService.getStreamSession(streamId);
    const autoEndCheck = this.shouldAutoEndStream(session);

    if (autoEndCheck.shouldEnd) {
      console.log(`🔄 [LIFECYCLE] Auto-ending stream ${streamId} after host left:`, autoEndCheck.reason);
      await this.endStreamWithLifecycle(streamId, autoEndCheck.reason!, hostId);
    }
  }

  /**
   * Notify participants that stream is ending
   */
  private static async notifyParticipantsStreamEnding(
    streamId: string, 
    reason: StreamEndReason,
    session: any
  ): Promise<void> {
    try {
      if (!session?.participants) return;

      console.log(`📢 [LIFECYCLE] Notifying ${session.participants.length} participants about stream ${streamId} ending`);

      // In a real implementation, you might send push notifications or in-app messages
      // For now, we'll just log the notification
      const reasonText = this.getEndReasonText(reason);
      console.log(`📢 [LIFECYCLE] Stream ending notification: "${reasonText}"`);

    } catch (error) {
      console.warn(`⚠️ [LIFECYCLE] Failed to notify participants about stream ${streamId} ending:`, error);
    }
  }

  /**
   * Verify stream was properly ended in Firebase
   */
  private static async verifyStreamEnded(streamId: string): Promise<void> {
    try {
      console.log(`🔍 [LIFECYCLE] Verifying stream ${streamId} was properly ended in Firebase`);
      
      const streamData = await firestoreService.getStreamById(streamId);
      
      if (streamData && streamData.isActive) {
        console.warn(`⚠️ [LIFECYCLE] Stream ${streamId} still marked as active in Firebase, forcing end`);
        await firestoreService.endStream(streamId, 'emergency_cleanup');
      } else {
        console.log(`✅ [LIFECYCLE] Stream ${streamId} properly marked as ended in Firebase`);
      }
      
    } catch (error) {
      console.warn(`⚠️ [LIFECYCLE] Could not verify stream ${streamId} end status:`, error);
    }
  }

  /**
   * Clean up participant active stream records
   */
  private static async cleanupParticipantRecords(streamId: string, session: any): Promise<void> {
    try {
      if (!session?.participants) return;

      console.log(`🧹 [LIFECYCLE] Cleaning up active stream records for ${session.participants.length} participants`);

      // Import here to avoid circular dependency
      const { ActiveStreamTracker } = await import('../services/activeStreamTracker');

      for (const participant of session.participants) {
        try {
          await ActiveStreamTracker.clearActiveStream(participant.id);
          console.log(`🧹 [LIFECYCLE] Cleared active stream record for participant ${participant.id}`);
        } catch (error) {
          console.warn(`⚠️ [LIFECYCLE] Failed to clear active stream record for ${participant.id}:`, error);
        }
      }

    } catch (error) {
      console.warn(`⚠️ [LIFECYCLE] Error cleaning up participant records for stream ${streamId}:`, error);
    }
  }

  /**
   * Emergency cleanup for failed stream ending
   */
  private static async emergencyStreamCleanup(streamId: string): Promise<void> {
    console.log(`🚨 [LIFECYCLE] Performing emergency cleanup for stream ${streamId}`);

    try {
      // Force end in Firebase
      await firestoreService.endStream(streamId, 'emergency_cleanup');
      
      // Clear from local cache
      const session = streamingService.getStreamSession(streamId);
      if (session) {
        session.isActive = false;
        session.participants = [];
        session.viewerCount = 0;
      }

      // Trigger UI update
      streamingService.triggerManualUIUpdate();

      console.log(`✅ [LIFECYCLE] Emergency cleanup completed for stream ${streamId}`);
      
    } catch (error) {
      console.error(`❌ [LIFECYCLE] Emergency cleanup failed for stream ${streamId}:`, error);
    }
  }

  /**
   * Get human-readable end reason text
   */
  private static getEndReasonText(reason: StreamEndReason): string {
    switch (reason.type) {
      case 'host_left':
        return 'Stream ended because the host left';
      case 'no_participants':
        return 'Stream ended because no participants remained';
      case 'manual_end':
        return 'Stream was manually ended';
      case 'timeout':
        return 'Stream ended due to inactivity';
      case 'error':
        return `Stream ended due to an error: ${reason.details || 'Unknown error'}`;
      default:
        return 'Stream ended';
    }
  }

  /**
   * Get current ending streams (for debugging)
   */
  static getEndingStreams(): string[] {
    return Array.from(this.endingStreams);
  }
}

export default StreamLifecycleManager;
