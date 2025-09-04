/**
 * Real-time Participant Tracking Service for VuluGO Live Streams
 * Handles participant presence, heartbeat monitoring, and automatic cleanup
 */

import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Stream, StreamParticipant } from './firestoreService';

export interface ParticipantPresence {
  userId: string;
  streamId: string;
  isActive: boolean;
  lastSeen: Timestamp;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  heartbeatInterval?: NodeJS.Timeout;
}

export interface ParticipantTrackingCallbacks {
  onParticipantJoined?: (participant: StreamParticipant) => void;
  onParticipantLeft?: (participantId: string) => void;
  onParticipantUpdated?: (participant: StreamParticipant) => void;
  onViewerCountChanged?: (count: number) => void;
  onConnectionQualityChanged?: (userId: string, quality: string) => void;
}

class ParticipantTrackingService {
  private static instance: ParticipantTrackingService;
  private activeStreams = new Map<string, () => void>(); // streamId -> unsubscribe function
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>(); // streamId -> interval
  private participantCallbacks = new Map<string, ParticipantTrackingCallbacks>(); // streamId -> callbacks
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    this.startCleanupService();
  }

  static getInstance(): ParticipantTrackingService {
    if (!ParticipantTrackingService.instance) {
      ParticipantTrackingService.instance = new ParticipantTrackingService();
    }
    return ParticipantTrackingService.instance;
  }

  /**
   * Start tracking participants for a stream
   */
  async startTracking(streamId: string, callbacks: ParticipantTrackingCallbacks = {}): Promise<void> {
    try {
      console.log(`🔄 Starting participant tracking for stream: ${streamId}`);
      
      // Stop existing tracking if any
      this.stopTracking(streamId);

      // Store callbacks
      this.participantCallbacks.set(streamId, callbacks);

      // Set up real-time listener for stream participants
      const streamRef = doc(db, 'streams', streamId);
      const unsubscribe = onSnapshot(streamRef, (doc) => {
        if (doc.exists()) {
          const streamData = doc.data() as Stream;
          this.handleParticipantUpdate(streamId, streamData.participants, callbacks);
        }
      }, (error) => {
        console.error(`❌ Error in participant tracking for ${streamId}:`, error);
      });

      this.activeStreams.set(streamId, unsubscribe);

      // Start heartbeat for current user if authenticated
      if (auth.currentUser) {
        this.startHeartbeat(streamId, auth.currentUser.uid);
      }

      console.log(`✅ Participant tracking started for stream: ${streamId}`);
    } catch (error: any) {
      console.error('Failed to start participant tracking:', error);
      throw error;
    }
  }

  /**
   * Stop tracking participants for a stream
   */
  stopTracking(streamId: string): void {
    console.log(`🛑 Stopping participant tracking for stream: ${streamId}`);

    // Unsubscribe from real-time updates
    const unsubscribe = this.activeStreams.get(streamId);
    if (unsubscribe) {
      unsubscribe();
      this.activeStreams.delete(streamId);
    }

    // Clear heartbeat
    this.stopHeartbeat(streamId);

    // Remove callbacks
    this.participantCallbacks.delete(streamId);
  }

  /**
   * Start heartbeat for a user in a stream
   */
  private startHeartbeat(streamId: string, userId: string): void {
    // Clear existing heartbeat
    this.stopHeartbeat(streamId);

    // Send initial heartbeat
    this.sendHeartbeat(streamId, userId);

    // Set up periodic heartbeat (every 30 seconds)
    const interval = setInterval(() => {
      this.sendHeartbeat(streamId, userId);
    }, 30000);

    this.heartbeatIntervals.set(streamId, interval);
    console.log(`💓 Heartbeat started for user ${userId} in stream ${streamId}`);
  }

  /**
   * Stop heartbeat for a stream
   */
  private stopHeartbeat(streamId: string): void {
    const interval = this.heartbeatIntervals.get(streamId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(streamId);
      console.log(`💓 Heartbeat stopped for stream ${streamId}`);
    }
  }

  /**
   * Send heartbeat to update user's last seen timestamp
   */
  private async sendHeartbeat(streamId: string, userId: string): Promise<void> {
    try {
      // Update participant's last seen in detailed tracking
      const participantRef = doc(db, `streams/${streamId}/participants`, userId);
      await updateDoc(participantRef, {
        lastSeen: serverTimestamp(),
        isActive: true,
        updatedAt: serverTimestamp()
      });

      // Update participant in main stream document
      await runTransaction(db, async (transaction) => {
        const streamRef = doc(db, 'streams', streamId);
        const streamDoc = await transaction.get(streamRef);
        
        if (streamDoc.exists()) {
          const streamData = streamDoc.data() as Stream;
          const updatedParticipants = streamData.participants.map(p => 
            p.id === userId 
              ? { ...p, lastSeen: serverTimestamp() as Timestamp, isActive: true }
              : p
          );
          
          transaction.update(streamRef, {
            participants: updatedParticipants,
            lastActivity: serverTimestamp()
          });
        }
      });

      console.log(`💓 Heartbeat sent for user ${userId} in stream ${streamId}`);
    } catch (error: any) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  /**
   * Handle participant updates from real-time listener
   */
  private handleParticipantUpdate(
    streamId: string, 
    participants: StreamParticipant[], 
    callbacks: ParticipantTrackingCallbacks
  ): void {
    try {
      // Calculate viewer count (exclude host)
      const viewerCount = participants.filter(p => p.isActive).length;
      
      // Notify about viewer count change
      if (callbacks.onViewerCountChanged) {
        callbacks.onViewerCountChanged(viewerCount);
      }

      // Check for new participants
      participants.forEach(participant => {
        if (participant.isActive) {
          if (callbacks.onParticipantJoined) {
            callbacks.onParticipantJoined(participant);
          }
        }
      });

      console.log(`👥 Participant update for stream ${streamId}: ${viewerCount} active participants`);
    } catch (error: any) {
      console.error('Error handling participant update:', error);
    }
  }

  /**
   * Start cleanup service for stale participants
   */
  private startCleanupService(): void {
    // Run cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleParticipants();
    }, 120000);

    console.log('🧹 Participant cleanup service started');
  }

  /**
   * Clean up stale participants (inactive for more than 2 minutes)
   */
  private async cleanupStaleParticipants(): Promise<void> {
    try {
      const now = Date.now();
      const staleThreshold = now - (2 * 60 * 1000); // 2 minutes ago

      // Get all active streams
      const streamsQuery = query(
        collection(db, 'streams'),
        where('isActive', '==', true)
      );

      // Note: In a real implementation, this would be done via Firebase Functions
      // to avoid client-side cleanup which can be unreliable
      console.log('🧹 Cleaning up stale participants...');
      
      // This is a placeholder for the cleanup logic that should be implemented
      // in Firebase Functions for better reliability and security
      
    } catch (error: any) {
      console.error('Error during participant cleanup:', error);
    }
  }

  /**
   * Get current participant count for a stream
   */
  async getParticipantCount(streamId: string): Promise<number> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await streamRef.get();
      
      if (streamDoc.exists()) {
        const streamData = streamDoc.data() as Stream;
        return streamData.participants.filter(p => p.isActive).length;
      }
      
      return 0;
    } catch (error: any) {
      console.error('Failed to get participant count:', error);
      return 0;
    }
  }

  /**
   * Update connection quality for a participant
   */
  async updateConnectionQuality(
    streamId: string, 
    userId: string, 
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected'
  ): Promise<void> {
    try {
      const participantRef = doc(db, `streams/${streamId}/participants`, userId);
      await updateDoc(participantRef, {
        connectionQuality: quality,
        updatedAt: serverTimestamp()
      });

      // Notify callback
      const callbacks = this.participantCallbacks.get(streamId);
      if (callbacks?.onConnectionQualityChanged) {
        callbacks.onConnectionQualityChanged(userId, quality);
      }

      console.log(`📶 Connection quality updated for ${userId}: ${quality}`);
    } catch (error: any) {
      console.error('Failed to update connection quality:', error);
    }
  }

  /**
   * Cleanup service on app termination
   */
  destroy(): void {
    // Stop all tracking
    this.activeStreams.forEach((unsubscribe, streamId) => {
      this.stopTracking(streamId);
    });

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    console.log('🧹 Participant tracking service destroyed');
  }
}

export default ParticipantTrackingService.getInstance();
