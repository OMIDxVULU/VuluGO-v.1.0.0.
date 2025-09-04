/**
 * Stream Lifecycle Management Service
 * Handles automated stream creation, monitoring, and cleanup processes
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Stream, StreamCategory, StreamQuality } from './firestoreService';
import agoraService from './agoraService';
import participantTrackingService from './participantTrackingService';
import { agoraTokenService } from './agoraTokenService';

export interface StreamCreationOptions {
  title: string;
  description?: string;
  category: StreamCategory;
  tags?: string[];
  isPublic?: boolean;
  allowChat?: boolean;
  allowReactions?: boolean;
  quality?: StreamQuality;
  maxParticipants?: number;
  scheduledFor?: Date;
}

export interface StreamMonitoringData {
  streamId: string;
  status: 'active' | 'inactive' | 'ended' | 'error';
  viewerCount: number;
  duration: number;
  lastActivity: Date;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  errorCount: number;
  warnings: string[];
}

class StreamLifecycleService {
  private static instance: StreamLifecycleService;
  private activeStreams = new Map<string, () => void>(); // streamId -> unsubscribe function
  private monitoringIntervals = new Map<string, NodeJS.Timeout>();
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.startHealthCheckService();
  }

  static getInstance(): StreamLifecycleService {
    if (!StreamLifecycleService.instance) {
      StreamLifecycleService.instance = new StreamLifecycleService();
    }
    return StreamLifecycleService.instance;
  }

  /**
   * Create and start a new stream
   */
  async createStream(options: StreamCreationOptions): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;
      const streamId = `stream_${user.uid}_${Date.now()}`;

      console.log(`🎬 Creating stream: ${streamId}`);

      // Create stream document in Firestore with sanitized data
      const streamData: Partial<Stream> = {
        id: streamId,
        hostId: user.uid,
        hostName: user.displayName || 'Host',
        hostAvatar: user.photoURL || null, // Use null instead of undefined
        title: options.title,
        description: options.description,
        category: options.category,
        tags: options.tags || [],
        isActive: false, // Will be set to true after successful Agora connection
        isPublic: options.isPublic ?? true,
        viewerCount: 0,
        maxViewers: 0,
        totalViewers: 0,
        participants: [],
        allowChat: options.allowChat ?? true,
        allowReactions: options.allowReactions ?? true,
        isRecording: false,
        quality: options.quality || 'auto',
        moderatorIds: [],
        bannedUserIds: [],
        chatSettings: {
          slowMode: 0,
          subscribersOnly: false,
          moderatorsOnly: false,
          profanityFilter: true,
          linkFilter: false,
          maxMessageLength: 500
        },
        totalMessages: 0,
        totalReactions: 0,
        totalGifts: 0,
        revenue: 0,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        lastActivity: serverTimestamp() as Timestamp,
        startedAt: serverTimestamp() as Timestamp,
        // Only include scheduledFor if it has a value
        ...(options.scheduledFor && { scheduledFor: Timestamp.fromDate(options.scheduledFor) })
      };

      // Create stream document
      await doc(db, 'streams', streamId).set(streamData);

      // Initialize Agora connection
      await this.initializeAgoraConnection(streamId);

      // Start monitoring
      this.startStreamMonitoring(streamId);

      // Mark stream as active
      await updateDoc(doc(db, 'streams', streamId), {
        isActive: true,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Stream created and started: ${streamId}`);
      return streamId;

    } catch (error: any) {
      console.error('Failed to create stream:', error);
      throw new Error(`Stream creation failed: ${error.message}`);
    }
  }

  /**
   * End a stream gracefully
   */
  async endStream(streamId: string): Promise<void> {
    try {
      console.log(`🛑 Ending stream: ${streamId}`);

      // Verify user is the host
      const streamDoc = await getDoc(doc(db, 'streams', streamId));
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data() as Stream;
      if (streamData.hostId !== auth.currentUser?.uid) {
        throw new Error('Only the host can end the stream');
      }

      // Stop monitoring
      this.stopStreamMonitoring(streamId);

      // Leave Agora channel
      await agoraService.leaveChannel();

      // Update stream as ended
      await updateDoc(doc(db, 'streams', streamId), {
        isActive: false,
        endedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Clean up resources
      await this.cleanupStreamResources(streamId);

      console.log(`✅ Stream ended successfully: ${streamId}`);

    } catch (error: any) {
      console.error('Failed to end stream:', error);
      throw new Error(`Stream ending failed: ${error.message}`);
    }
  }

  /**
   * Join an existing stream as viewer
   */
  async joinStream(streamId: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      console.log(`👋 Joining stream: ${streamId}`);

      // Validate stream access
      const streamDoc = await getDoc(doc(db, 'streams', streamId));
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data() as Stream;
      if (!streamData.isActive) {
        throw new Error('Stream is not active');
      }

      // Check if user is banned
      if (streamData.bannedUserIds.includes(auth.currentUser.uid)) {
        throw new Error('You are banned from this stream');
      }

      // Join Agora channel as viewer with current user's ID
      await agoraService.joinChannel(streamId, auth.currentUser.uid, false);

      // Add user to participants
      await this.addParticipant(streamId, auth.currentUser.uid, 'viewer');

      // Start participant tracking
      await participantTrackingService.startTracking(streamId);

      console.log(`✅ Joined stream successfully: ${streamId}`);

    } catch (error: any) {
      console.error('Failed to join stream:', error);
      throw new Error(`Stream joining failed: ${error.message}`);
    }
  }

  /**
   * Leave a stream as viewer
   */
  async leaveStream(streamId: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      console.log(`👋 Leaving stream: ${streamId}`);

      // Stop participant tracking
      participantTrackingService.stopTracking(streamId);

      // Leave Agora channel
      await agoraService.leaveChannel();

      // Remove user from participants
      await this.removeParticipant(streamId, auth.currentUser.uid);

      console.log(`✅ Left stream successfully: ${streamId}`);

    } catch (error: any) {
      console.error('Failed to leave stream:', error);
      throw new Error(`Stream leaving failed: ${error.message}`);
    }
  }

  /**
   * Start monitoring a stream
   */
  private startStreamMonitoring(streamId: string): void {
    console.log(`📊 Starting monitoring for stream: ${streamId}`);

    // Set up real-time listener for stream updates
    const unsubscribe = onSnapshot(
      doc(db, 'streams', streamId),
      (doc) => {
        if (doc.exists()) {
          const streamData = doc.data() as Stream;
          this.handleStreamUpdate(streamId, streamData);
        }
      },
      (error) => {
        console.error(`Error monitoring stream ${streamId}:`, error);
      }
    );

    this.activeStreams.set(streamId, unsubscribe);

    // Set up periodic health checks (reduced frequency)
    const healthCheckInterval = setInterval(() => {
      this.performStreamHealthCheck(streamId);
    }, 120000); // Every 2 minutes (reduced from 30 seconds)

    this.monitoringIntervals.set(streamId, healthCheckInterval);
  }

  /**
   * Stop monitoring a stream
   */
  private stopStreamMonitoring(streamId: string): void {
    console.log(`📊 Stopping monitoring for stream: ${streamId}`);

    // Unsubscribe from real-time updates
    const unsubscribe = this.activeStreams.get(streamId);
    if (unsubscribe) {
      unsubscribe();
      this.activeStreams.delete(streamId);
    }

    // Clear health check interval
    const interval = this.monitoringIntervals.get(streamId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(streamId);
    }
  }

  /**
   * Handle stream updates from real-time listener
   */
  private handleStreamUpdate(streamId: string, streamData: Stream): void {
    // Check for critical issues
    if (!streamData.isActive && this.activeStreams.has(streamId)) {
      console.log(`Stream ${streamId} became inactive, stopping monitoring`);
      this.stopStreamMonitoring(streamId);
    }

    // Monitor participant count
    if (streamData.viewerCount === 0 && streamData.hostId !== auth.currentUser?.uid) {
      console.log(`Stream ${streamId} has no viewers`);
      // Could trigger auto-end logic here
    }

    // Update monitoring data
    const monitoringData: StreamMonitoringData = {
      streamId,
      status: streamData.isActive ? 'active' : 'inactive',
      viewerCount: streamData.viewerCount,
      duration: streamData.startedAt ? Date.now() - streamData.startedAt.toMillis() : 0,
      lastActivity: streamData.lastActivity.toDate(),
      connectionQuality: 'good', // Would be determined by actual metrics
      errorCount: 0,
      warnings: []
    };

    // Emit monitoring event (could be used by UI components)
    this.emitMonitoringUpdate(monitoringData);
  }

  /**
   * Perform health check on a stream
   */
  private async performStreamHealthCheck(streamId: string): Promise<void> {
    try {
      // Check Agora connection status
      const agoraStatus = agoraService.getConnectionState();
      
      // Check participant activity
      const participantCount = await participantTrackingService.getParticipantCount(streamId);
      
      // Update last activity timestamp
      await updateDoc(doc(db, 'streams', streamId), {
        lastActivity: serverTimestamp()
      });

      // Log health status
      console.log(`💓 Health check for ${streamId}: Agora=${agoraStatus}, Participants=${participantCount}`);

    } catch (error) {
      console.error(`Health check failed for stream ${streamId}:`, error);
    }
  }

  /**
   * Initialize Agora connection for stream
   */
  private async initializeAgoraConnection(streamId: string): Promise<void> {
    try {
      // Initialize Agora service
      await agoraService.initialize();

      // Join as host using authenticated user's ID
      const hostUserId = auth.currentUser?.uid || 'host';
      await agoraService.joinChannel(streamId, hostUserId, true);

      console.log(`✅ Agora connection initialized for stream: ${streamId}`);

    } catch (error: any) {
      console.error('Failed to initialize Agora connection:', error);
      throw error;
    }
  }

  /**
   * Add participant to stream
   */
  private async addParticipant(streamId: string, userId: string, role: 'host' | 'viewer'): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await transaction.get(streamRef);
      
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data() as Stream;
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if user is already a participant
      const existingParticipant = streamData.participants.find(p => p.id === userId);
      if (existingParticipant) {
        return; // User already in stream
      }

      // Add new participant
      const newParticipant = {
        id: userId,
        name: user.displayName || 'User',
        avatar: user.photoURL || undefined,
        role,
        joinedAt: serverTimestamp() as Timestamp,
        lastSeen: serverTimestamp() as Timestamp,
        isMuted: false,
        isBanned: false,
        isActive: true
      };

      const updatedParticipants = [...streamData.participants, newParticipant];
      const newViewerCount = updatedParticipants.filter(p => p.isActive).length;

      transaction.update(streamRef, {
        participants: updatedParticipants,
        viewerCount: newViewerCount,
        maxViewers: Math.max(streamData.maxViewers, newViewerCount),
        totalViewers: streamData.totalViewers + 1,
        lastActivity: serverTimestamp()
      });
    });
  }

  /**
   * Remove participant from stream
   */
  private async removeParticipant(streamId: string, userId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await transaction.get(streamRef);
      
      if (!streamDoc.exists()) {
        return; // Stream doesn't exist
      }

      const streamData = streamDoc.data() as Stream;
      const updatedParticipants = streamData.participants.filter(p => p.id !== userId);
      const newViewerCount = updatedParticipants.filter(p => p.isActive).length;

      transaction.update(streamRef, {
        participants: updatedParticipants,
        viewerCount: newViewerCount,
        lastActivity: serverTimestamp()
      });
    });
  }

  /**
   * Clean up stream resources
   */
  private async cleanupStreamResources(streamId: string): Promise<void> {
    try {
      // Clear Agora tokens
      agoraTokenService.clearCache();

      // Stop participant tracking
      participantTrackingService.stopTracking(streamId);

      // Clean up any temporary data
      console.log(`🧹 Cleaned up resources for stream: ${streamId}`);

    } catch (error) {
      console.error(`Failed to cleanup resources for stream ${streamId}:`, error);
    }
  }

  /**
   * Start health check service for all streams
   */
  private startHealthCheckService(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        // Get all active streams
        const activeStreamsQuery = query(
          collection(db, 'streams'),
          where('isActive', '==', true)
        );

        const snapshot = await getDocs(activeStreamsQuery);
        
        snapshot.forEach((doc) => {
          const streamData = doc.data() as Stream;
          const lastActivity = streamData.lastActivity.toMillis();
          const now = Date.now();
          
          // Check if stream has been inactive for more than 10 minutes
          if (now - lastActivity > 10 * 60 * 1000) {
            console.log(`⚠️ Stream ${doc.id} appears inactive, may need cleanup`);
            // Could trigger automatic cleanup here
          }
        });

      } catch (error) {
        console.error('Health check service error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('💓 Stream health check service started');
  }

  /**
   * Emit monitoring update (placeholder for event system)
   */
  private emitMonitoringUpdate(data: StreamMonitoringData): void {
    // This could emit events to UI components or analytics services
    console.log('📊 Stream monitoring update:', data);
  }

  /**
   * Get stream monitoring data
   */
  async getStreamMonitoringData(streamId: string): Promise<StreamMonitoringData | null> {
    try {
      const streamDoc = await getDoc(doc(db, 'streams', streamId));
      if (!streamDoc.exists()) {
        return null;
      }

      const streamData = streamDoc.data() as Stream;
      
      return {
        streamId,
        status: streamData.isActive ? 'active' : 'inactive',
        viewerCount: streamData.viewerCount,
        duration: streamData.startedAt ? Date.now() - streamData.startedAt.toMillis() : 0,
        lastActivity: streamData.lastActivity.toDate(),
        connectionQuality: 'good', // Would be determined by actual metrics
        errorCount: 0,
        warnings: []
      };

    } catch (error) {
      console.error('Failed to get stream monitoring data:', error);
      return null;
    }
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    // Stop all monitoring
    this.activeStreams.forEach((unsubscribe) => {
      unsubscribe();
    });

    // Clear all intervals
    this.monitoringIntervals.forEach((interval) => {
      clearInterval(interval);
    });

    // Clear health check service
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Clear maps
    this.activeStreams.clear();
    this.monitoringIntervals.clear();

    console.log('🧹 Stream Lifecycle Service destroyed');
  }
}

export default StreamLifecycleService.getInstance();
