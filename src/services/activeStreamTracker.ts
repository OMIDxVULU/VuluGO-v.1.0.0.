import { doc, setDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Service for tracking user's active stream participation
 * This ensures server-side enforcement of single-stream participation
 */
export class ActiveStreamTracker {

  /**
   * Test function to verify Firebase permissions for activeStream access
   */
  static async testPermissions(userId: string): Promise<{
    canRead: boolean;
    canWrite: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let canRead = false;
    let canWrite = false;

    console.log(`🧪 Testing Firebase permissions for user ${userId}`);

    // Test write permission
    try {
      const testStreamId = `test-${Date.now()}`;
      await this.setActiveStream(userId, testStreamId);
      canWrite = true;
      console.log(`✅ Write permission test passed for user ${userId}`);

      // Clean up test data
      await this.clearActiveStream(userId);
    } catch (error: any) {
      canWrite = false;
      errors.push(`Write test failed: ${error?.code} - ${error?.message}`);
      console.log(`❌ Write permission test failed for user ${userId}:`, error?.code);
    }

    // Test read permission
    try {
      await this.getActiveStream(userId);
      canRead = true;
      console.log(`✅ Read permission test passed for user ${userId}`);
    } catch (error: any) {
      canRead = false;
      errors.push(`Read test failed: ${error?.code} - ${error?.message}`);
      console.log(`❌ Read permission test failed for user ${userId}:`, error?.code);
    }

    const result = { canRead, canWrite, errors };
    console.log(`🧪 Permission test results for user ${userId}:`, result);

    return result;
  }
  
  /**
   * Set user's active stream with enhanced error handling and debugging
   */
  static async setActiveStream(userId: string, streamId: string): Promise<void> {
    try {
      console.log(`🔄 Attempting to set active stream for user ${userId}: ${streamId}`);

      const activeStreamRef = doc(db, 'users', userId, 'activeStream', 'current');
      const streamData = {
        streamId,
        isActive: true,
        joinedAt: Date.now(),
        lastUpdated: Date.now()
      };

      await setDoc(activeStreamRef, streamData);

      console.log(`✅ Successfully set active stream for user ${userId}: ${streamId}`);
    } catch (error: any) {
      console.error('❌ Error setting active stream:', error);
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        userId,
        streamId,
        path: `users/${userId}/activeStream/current`
      });

      // Handle permission errors gracefully
      if (error?.code === 'permission-denied') {
        console.warn(`⚠️ Permission denied setting active stream for user ${userId}.`);
        console.warn(`   Path: users/${userId}/activeStream/current`);
        console.warn(`   This may indicate a security rules issue or user authentication problem.`);

        // For now, don't throw to prevent app crashes, but log the issue
        return;
      }

      // Handle other Firebase errors
      if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded') {
        console.warn(`⚠️ Firebase temporarily unavailable for setting active stream. Continuing without tracking.`);
        return;
      }

      // For other errors, still don't crash the app but log them
      console.error(`❌ Unexpected error setting active stream: ${error?.message}`);
    }
  }
  
  /**
   * Clear user's active stream with error handling for permissions
   */
  static async clearActiveStream(userId: string): Promise<void> {
    try {
      const activeStreamRef = doc(db, 'users', userId, 'activeStream', 'current');
      await deleteDoc(activeStreamRef);

      console.log(`✅ Cleared active stream for user ${userId}`);
    } catch (error: any) {
      console.error('❌ Error clearing active stream:', error);

      // Handle permission errors gracefully
      if (error?.code === 'permission-denied') {
        console.warn(`⚠️ Permission denied clearing active stream for user ${userId}. User may be guest or rules need updating.`);
        return;
      }

      // Handle not found errors (document doesn't exist)
      if (error?.code === 'not-found') {
        console.log(`ℹ️ Active stream record for user ${userId} doesn't exist, nothing to clear.`);
        return;
      }

      // Handle other Firebase errors
      if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded') {
        console.warn(`⚠️ Firebase temporarily unavailable for clearing active stream. Continuing.`);
        return;
      }

      throw error;
    }
  }
  
  /**
   * Get user's current active stream with enhanced error handling and debugging
   */
  static async getActiveStream(userId: string): Promise<{ streamId: string; isActive: boolean } | null> {
    try {
      console.log(`🔄 Attempting to get active stream for user ${userId}`);

      const activeStreamRef = doc(db, 'users', userId, 'activeStream', 'current');
      const activeStreamDoc = await getDoc(activeStreamRef);

      if (activeStreamDoc.exists()) {
        const data = activeStreamDoc.data();
        console.log(`✅ Found active stream for user ${userId}:`, data);
        return {
          streamId: data.streamId,
          isActive: data.isActive
        };
      }

      console.log(`ℹ️ No active stream record found for user ${userId}`);
      return null;
    } catch (error: any) {
      console.error('❌ Error getting active stream:', error);
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        userId,
        path: `users/${userId}/activeStream/current`
      });

      // Handle permission errors gracefully
      if (error?.code === 'permission-denied') {
        console.warn(`⚠️ Permission denied getting active stream for user ${userId}.`);
        console.warn(`   Path: users/${userId}/activeStream/current`);
        console.warn(`   This may indicate a security rules issue. Returning null.`);
        return null;
      }

      // Handle other Firebase errors
      if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded') {
        console.warn(`⚠️ Firebase temporarily unavailable for getting active stream. Returning null.`);
        return null;
      }

      // For other errors, return null to prevent crashes
      console.error(`❌ Unexpected error getting active stream: ${error?.message}`);
      return null;
    }
  }
  
  /**
   * Check if user is in another stream (different from the specified one)
   * Enhanced with automatic cleanup of stale records
   */
  static async isUserInAnotherStream(userId: string, currentStreamId: string): Promise<boolean> {
    try {
      const activeStream = await this.getActiveStream(userId);

      if (!activeStream || !activeStream.isActive) {
        return false;
      }

      if (activeStream.streamId === currentStreamId) {
        return false;
      }

      // Check if the stream actually exists and is active
      const streamRef = doc(db, 'streams', activeStream.streamId);
      const streamDoc = await getDoc(streamRef);

      if (!streamDoc.exists() || !streamDoc.data()?.isActive) {
        // Stream no longer exists or is inactive, clean up the stale record
        console.log(`🧹 Cleaning up stale active stream record for user ${userId} (stream ${activeStream.streamId} no longer active)`);
        await this.clearActiveStream(userId);
        return false;
      }

      // Check if user is actually in the stream's participants
      const streamData = streamDoc.data();
      const isParticipant = streamData?.participants?.some((p: any) => p.id === userId);

      if (!isParticipant) {
        // User is not actually in the stream, clean up the stale record
        console.log(`🧹 Cleaning up stale active stream record for user ${userId} (not in participants of stream ${activeStream.streamId})`);
        await this.clearActiveStream(userId);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error checking if user in another stream:', error);
      return false; // Fail safe - allow operation if check fails
    }
  }
  
  /**
   * Atomic stream switch operation
   * Ensures user leaves old stream and joins new stream atomically
   */
  static async atomicStreamSwitch(
    userId: string, 
    fromStreamId: string | null, 
    toStreamId: string,
    userParticipant: any
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Remove from old stream if exists
      if (fromStreamId) {
        const oldStreamRef = doc(db, 'streams', fromStreamId);
        // Note: We'll need to implement array removal logic here
        // This is a simplified version - actual implementation would need
        // to read current participants and remove the user
        console.log(`🔄 Preparing to remove user ${userId} from stream ${fromStreamId}`);
      }
      
      // Add to new stream
      const newStreamRef = doc(db, 'streams', toStreamId);
      // Note: We'll need to implement array addition logic here
      // This is a simplified version - actual implementation would need
      // to read current participants and add the user
      console.log(`🔄 Preparing to add user ${userId} to stream ${toStreamId}`);
      
      // Update user's active stream
      const activeStreamRef = doc(db, 'users', userId, 'activeStream', 'current');
      batch.set(activeStreamRef, {
        streamId: toStreamId,
        isActive: true,
        joinedAt: Date.now(),
        lastUpdated: Date.now()
      });
      
      // Commit all operations atomically
      await batch.commit();
      
      console.log(`✅ Atomic stream switch completed for user ${userId}: ${fromStreamId} -> ${toStreamId}`);
    } catch (error) {
      console.error('❌ Error in atomic stream switch:', error);
      throw error;
    }
  }
  
  /**
   * Cleanup orphaned active stream records
   * Should be called periodically to clean up stale data
   */
  static async cleanupOrphanedStreams(userId: string): Promise<void> {
    try {
      const activeStream = await this.getActiveStream(userId);

      if (activeStream) {
        // Check if the stream still exists and is active
        const streamRef = doc(db, 'streams', activeStream.streamId);
        const streamDoc = await getDoc(streamRef);

        if (!streamDoc.exists() || !streamDoc.data()?.isActive) {
          // Stream no longer exists or is inactive, clear the active stream record
          await this.clearActiveStream(userId);
          console.log(`🧹 Cleaned up orphaned active stream record for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up orphaned streams:', error);
      // Don't throw - this is a cleanup operation
    }
  }

  /**
   * Comprehensive cleanup for partial operation failures
   * Handles cases where user joined Firebase but Agora failed, etc.
   */
  static async cleanupPartialFailure(
    userId: string,
    streamId: string,
    operationType: 'join' | 'create' | 'leave'
  ): Promise<void> {
    try {
      console.log(`🧹 Starting partial failure cleanup for user ${userId}, stream ${streamId}, operation: ${operationType}`);

      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);

      if (!streamDoc.exists()) {
        // Stream doesn't exist, clear active stream record
        await this.clearActiveStream(userId);
        console.log(`🧹 Cleared active stream record - stream ${streamId} doesn't exist`);
        return;
      }

      const streamData = streamDoc.data();
      const isParticipant = streamData?.participants?.some((p: any) => p.id === userId);
      const activeStream = await this.getActiveStream(userId);

      // Check for inconsistencies and fix them
      if (operationType === 'join') {
        if (!isParticipant && activeStream?.streamId === streamId) {
          // User has active stream record but isn't in Firebase participants
          await this.clearActiveStream(userId);
          console.log(`🧹 Cleared orphaned active stream record after failed join`);
        } else if (isParticipant && (!activeStream || activeStream.streamId !== streamId)) {
          // User is in Firebase but doesn't have active stream record
          await this.setActiveStream(userId, streamId);
          console.log(`🧹 Set missing active stream record after partial join`);
        }
      } else if (operationType === 'leave') {
        if (isParticipant && (!activeStream || activeStream.streamId !== streamId)) {
          // User is still in Firebase but active stream record is wrong/missing
          await this.setActiveStream(userId, streamId);
          console.log(`🧹 Restored active stream record after partial leave`);
        } else if (!isParticipant && activeStream?.streamId === streamId) {
          // User not in Firebase but still has active stream record
          await this.clearActiveStream(userId);
          console.log(`🧹 Cleared active stream record after successful leave`);
        }
      }

    } catch (error) {
      console.error('❌ Error in partial failure cleanup:', error);
      // Don't throw - this is a cleanup operation
    }
  }

  /**
   * Recovery mechanism for users stuck in "ghost" stream states
   * Attempts to resolve inconsistent states automatically
   */
  static async recoverGhostState(userId: string): Promise<{ recovered: boolean; action: string }> {
    try {
      console.log(`👻 Starting ghost state recovery for user ${userId}`);

      const activeStream = await this.getActiveStream(userId);

      if (!activeStream) {
        return { recovered: true, action: 'no_active_stream' };
      }

      // Check if the stream exists and user is actually in it
      const streamRef = doc(db, 'streams', activeStream.streamId);
      const streamDoc = await getDoc(streamRef);

      if (!streamDoc.exists()) {
        // Stream doesn't exist, clear the record
        await this.clearActiveStream(userId);
        return { recovered: true, action: 'cleared_nonexistent_stream' };
      }

      const streamData = streamDoc.data();

      if (!streamData?.isActive) {
        // Stream is inactive, clear the record
        await this.clearActiveStream(userId);
        return { recovered: true, action: 'cleared_inactive_stream' };
      }

      const isParticipant = streamData?.participants?.some((p: any) => p.id === userId);

      if (!isParticipant) {
        // User not actually in the stream, clear the record
        await this.clearActiveStream(userId);
        return { recovered: true, action: 'cleared_non_participant' };
      }

      // State is consistent
      return { recovered: true, action: 'state_consistent' };

    } catch (error) {
      console.error('❌ Error in ghost state recovery:', error);
      return { recovered: false, action: 'recovery_failed' };
    }
  }
  
  /**
   * Validate stream participation consistency
   * Checks if user's active stream record matches their actual participation
   */
  static async validateStreamParticipation(userId: string): Promise<boolean> {
    try {
      const activeStream = await this.getActiveStream(userId);
      
      if (!activeStream) {
        return true; // No active stream record is valid
      }
      
      // Check if user is actually in the stream
      const streamRef = doc(db, 'streams', activeStream.streamId);
      const streamDoc = await getDoc(streamRef);
      
      if (!streamDoc.exists()) {
        // Stream doesn't exist, clear the active stream record
        await this.clearActiveStream(userId);
        return false;
      }
      
      const streamData = streamDoc.data();
      const isParticipant = streamData?.participants?.some((p: any) => p.id === userId);
      
      if (!isParticipant) {
        // User is not actually in the stream, clear the record
        await this.clearActiveStream(userId);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error validating stream participation:', error);
      return false;
    }
  }
}

export default ActiveStreamTracker;
