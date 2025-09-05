import { firestoreService } from './firestoreService';
import { LiveStream, StreamHost, StreamViewer } from '../context/LiveStreamContext';
import { agoraService, AgoraEventCallbacks } from './agoraService';
import { isAgoraConfigured } from '../config/agoraConfig';
import { StreamingCircuitBreakers } from '../utils/circuitBreaker';

export interface StreamParticipant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  joinedAt: number;
}

export interface StreamSession {
  id: string;
  title: string;
  hostId: string;
  participants: StreamParticipant[];
  startedAt: number;
  isActive: boolean;
  viewerCount: number;
}

class StreamingService {
  private activeStreams = new Map<string, StreamSession>();
  private streamListeners = new Map<string, () => void>();
  private currentStreamId: string | null = null;

  // Helper method to check if local session is stale compared to server data
  private isSessionStale(localSession: StreamSession, serverData: any): boolean {
    if (!serverData) return false;

    // Check if server data is newer
    const serverTimestamp = serverData.updatedAt?.toMillis?.() || serverData.updatedAt || 0;
    const localTimestamp = localSession.startedAt || 0;

    // Consider session stale if server data is significantly newer (more than 30 seconds)
    const stalenessThreshold = 30 * 1000; // 30 seconds
    const isStale = serverTimestamp > localTimestamp + stalenessThreshold;

    if (isStale) {
      console.log(`[STREAMING_SERVICE] Session ${localSession.id} is stale (server: ${new Date(serverTimestamp)}, local: ${new Date(localTimestamp)})`);
    }

    return isStale;
  }

  // Initialize a new stream with Agora integration
  async createStream(
    title: string,
    hostId: string,
    hostName: string,
    hostAvatar: string
  ): Promise<string> {
    try {
      const streamId = `stream_${Date.now()}_${hostId}`;

      const streamData = {
        title,
        hostId,
        participants: [{
          id: hostId,
          name: hostName,
          avatar: hostAvatar,
          isHost: true,
          isSpeaking: false,
          isMuted: false,
          joinedAt: Date.now()
        }],
        startedAt: Date.now(),
        isActive: true,
        viewerCount: 0
      };

      // Store in Firebase
      await firestoreService.createStream(streamId, streamData);

      // Initialize Agora if configured
      if (isAgoraConfigured()) {
        console.log('🔄 Initializing Agora for new stream...');
        const initialized = await agoraService.initialize();
        if (initialized) {
          // Join as host
          await agoraService.joinChannel(streamId, hostId, true);
          console.log('✅ Host joined Agora channel successfully');
        } else {
          console.warn('⚠️ Agora initialization failed, continuing with Firebase-only mode');
        }
      } else {
        console.log('ℹ️ Agora not configured, using Firebase-only mode');
      }

      const session: StreamSession = {
        id: streamId,
        ...streamData
      };

      this.activeStreams.set(streamId, session);
      this.currentStreamId = streamId;
      return streamId;
    } catch (error) {
      console.error('Error creating stream:', error);
      throw error;
    }
  }

  // Join a stream as viewer with validation and error handling
  async joinStream(
    streamId: string,
    userId: string,
    userName: string,
    userAvatar: string
  ): Promise<void> {
    try {
      return await StreamingCircuitBreakers.STREAM_ACCESS.execute(async () => {
        console.log(`[STREAMING_SERVICE] Attempting to join stream ${streamId} as ${userName}`);

        // Enhanced stream validation with state synchronization
        console.log(`[STREAMING_SERVICE] Validating stream access for ${streamId}...`);
        const validation = await firestoreService.validateStreamAccess(streamId, userId);

        if (!validation.exists) {
          console.error(`[STREAMING_SERVICE] Stream ${streamId} does not exist`);
          throw new Error(`Stream ${streamId} not found`);
        }

        if (!validation.accessible) {
          console.error(`[STREAMING_SERVICE] Stream ${streamId} access denied: ${validation.error}`);
          throw new Error(`Stream access denied: ${validation.error}`);
        }

        console.log(`[STREAMING_SERVICE] Stream ${streamId} validation successful`);

        // Synchronize local session with server state
        let session = this.activeStreams.get(streamId);
        const serverStreamData = validation.stream;

        if (!session || this.isSessionStale(session, serverStreamData)) {
          console.log(`[STREAMING_SERVICE] Creating/updating local session for stream ${streamId}`);

          // Create or update session from validated stream data
          const newSession: StreamSession = {
            id: streamId,
            title: serverStreamData?.title || 'Live Stream',
            hostId: serverStreamData?.hostId || '',
            participants: serverStreamData?.participants || [],
            startedAt: serverStreamData?.startedAt?.toMillis?.() || serverStreamData?.startedAt || Date.now(),
            isActive: serverStreamData?.isActive || serverStreamData?.isLive || true,
            viewerCount: serverStreamData?.viewerCount || 0
          };

          this.activeStreams.set(streamId, newSession);
          session = newSession;

          console.log(`[STREAMING_SERVICE] Local session synchronized with server state`);
        } else {
          console.log(`[STREAMING_SERVICE] Using existing local session for stream ${streamId}`);
        }

        // Check if user is already a participant
        const currentSession = this.activeStreams.get(streamId)!;
        const existingParticipant = currentSession.participants.find(p => p.id === userId);
        if (existingParticipant) {
          console.log(`[STREAMING_SERVICE] User ${userName} already joined stream ${streamId}`);
          return; // Already joined
        }

        const newParticipant: StreamParticipant = {
          id: userId,
          name: userName,
          avatar: userAvatar,
          isHost: false,
          isSpeaking: false,
          isMuted: false,
          joinedAt: Date.now()
        };

      // Update session
      session.participants.push(newParticipant);
      session.viewerCount = session.participants.filter(p => !p.isHost).length;

      // Update Firebase
      await firestoreService.updateStreamParticipants(streamId, session.participants);
      await firestoreService.updateStreamViewerCount(streamId, session.viewerCount);

        // Join Agora channel if configured
        if (isAgoraConfigured()) {
          console.log(`[STREAMING_SERVICE] Joining Agora channel: ${streamId} as viewer`);

          // Set up Agora event callbacks for this stream
          this.setupAgoraCallbacks(streamId);

          // Join as audience member with error handling
          try {
            const joined = await agoraService.joinChannel(streamId, userId, false);
            if (joined) {
              console.log('[STREAMING_SERVICE] Successfully joined Agora channel as viewer');
              this.currentStreamId = streamId;
            } else {
              console.warn('[STREAMING_SERVICE] Failed to join Agora channel, continuing with Firebase-only mode');
              // Don't throw error, allow Firebase-only mode
            }
          } catch (agoraError: any) {
            console.error('[STREAMING_SERVICE] Agora join error:', agoraError.message);
            // Continue with Firebase-only mode instead of failing completely
            console.warn('[STREAMING_SERVICE] Continuing with Firebase-only mode due to Agora error');
          }
        }

        console.log(`[STREAMING_SERVICE] Successfully joined stream ${streamId} as ${userName}`);
      });

    } catch (error: any) {
      console.error(`[STREAMING_SERVICE] Error joining stream ${streamId}:`, error.message);
      throw error;
    }
  }

  // Leave a stream with Agora integration
  async leaveStream(streamId: string, userId: string): Promise<void> {
    try {
      const session = this.activeStreams.get(streamId);
      if (!session) return;

      // Leave Agora channel if this is the current stream
      if (isAgoraConfigured() && this.currentStreamId === streamId) {
        console.log('🔄 Leaving Agora channel...');
        await agoraService.leaveChannel();
        this.currentStreamId = null;
      }

      // Remove participant
      session.participants = session.participants.filter(p => p.id !== userId);
      session.viewerCount = session.participants.filter(p => !p.isHost).length;

      // If host left, end the stream
      if (session.participants.length === 0 || session.participants.every(p => !p.isHost)) {
        await this.endStream(streamId);
      } else {
        // Update Firebase
        await firestoreService.updateStreamParticipants(streamId, session.participants);
        await firestoreService.updateStreamViewerCount(streamId, session.viewerCount);
      }

    } catch (error) {
      console.error('Error leaving stream:', error);
      throw error;
    }
  }

  // End a stream
  async endStream(streamId: string): Promise<void> {
    try {
      const session = this.activeStreams.get(streamId);
      if (!session) return;

      session.isActive = false;

      // Update Firebase
      await firestoreService.updateStreamStatus(streamId, false);

      // Clean up
      this.activeStreams.delete(streamId);
      const listener = this.streamListeners.get(streamId);
      if (listener) {
        listener();
        this.streamListeners.delete(streamId);
      }

    } catch (error) {
      console.error('Error ending stream:', error);
      throw error;
    }
  }

  // Get active streams
  async getActiveStreams(): Promise<LiveStream[]> {
    try {
      const streams = await firestoreService.getActiveStreams();
      return streams.map(StreamingService.convertToLiveStream);
    } catch (error) {
      console.error('Error getting active streams:', error);
      return [];
    }
  }

  // Listen to stream updates
  onStreamUpdate(streamId: string, callback: (session: StreamSession) => void): () => void {
    // Set up Firebase listener
    const unsubscribe = firestoreService.onStreamUpdate(streamId, (data) => {
      const session: StreamSession = {
        id: streamId,
        ...data
      };
      this.activeStreams.set(streamId, session);
      callback(session);
    });

    this.streamListeners.set(streamId, unsubscribe);
    return unsubscribe;
  }

  // Listen to all active streams (for global updates)
  onActiveStreamsUpdate(callback: (streams: LiveStream[]) => void): () => void {
    // Set up Firebase listener for active streams collection
    const unsubscribe = firestoreService.onActiveStreamsUpdate((streamsData) => {
      const liveStreams = streamsData.map(StreamingService.convertToLiveStream);
      callback(liveStreams);
    });

    return unsubscribe;
  }

  // Convert StreamSession to LiveStream format for compatibility
  private static convertToLiveStream(session: StreamSession): LiveStream {
    const hosts: StreamHost[] = session.participants
      .filter(p => p.isHost)
      .map((p, index) => ({
        name: p.name,
        avatar: p.avatar,
        joinOrder: index + 1,
        isSpeaking: p.isSpeaking,
        isMuted: p.isMuted
      }));

    const viewers: StreamViewer[] = session.participants
      .filter(p => !p.isHost)
      .map(p => ({
        name: p.name,
        avatar: p.avatar,
        isMuted: p.isMuted,
        isBanned: false // TODO: Implement ban functionality
      }));

    return {
      id: session.id,
      title: session.title,
      hosts,
      viewers,
      views: session.viewerCount,
      isActive: session.isActive,
      startedAt: session.startedAt
    };
  }

  // Update participant speaking status (for Agora integration)
  async updateParticipantSpeaking(streamId: string, userId: string, isSpeaking: boolean): Promise<void> {
    try {
      const session = this.activeStreams.get(streamId);
      if (!session) return;

      const participant = session.participants.find(p => p.id === userId);
      if (participant) {
        participant.isSpeaking = isSpeaking;
        await firestoreService.updateStreamParticipants(streamId, session.participants);
      }
    } catch (error) {
      console.error('Error updating speaking status:', error);
    }
  }

  // Set up Agora event callbacks for real-time updates
  private setupAgoraCallbacks(streamId: string): void {
    const callbacks: AgoraEventCallbacks = {
      onUserJoined: (uid: number, elapsed: number) => {
        console.log(`👤 User ${uid} joined Agora channel`);
        // Note: User info will be updated via Firebase listeners
      },

      onUserOffline: (uid: number, reason: number) => {
        console.log(`👤 User ${uid} left Agora channel (reason: ${reason})`);
        // Note: User removal will be handled via Firebase listeners
      },

      onAudioVolumeIndication: (speakers) => {
        // Update speaking status for participants
        speakers.forEach(speaker => {
          if (speaker.volume > 10) { // Speaking threshold
            // Find user by UID and update speaking status
            // This would require mapping Agora UIDs to user IDs
            console.log(`🎤 User ${speaker.uid} is speaking (volume: ${speaker.volume})`);
          }
        });
      },

      onConnectionStateChanged: (state, reason) => {
        console.log(`🔗 Agora connection state: ${state} (reason: ${reason})`);
      },

      onError: (errorCode) => {
        console.error(`❌ Agora error: ${errorCode}`);
      },

      onWarning: (warningCode) => {
        console.warn(`⚠️ Agora warning: ${warningCode}`);
      }
    };

    agoraService.setEventCallbacks(callbacks);
  }

  // Mute/unmute local audio in current stream
  async muteLocalAudio(muted: boolean): Promise<void> {
    if (isAgoraConfigured() && this.currentStreamId) {
      await agoraService.muteLocalAudio(muted);

      // Update Firebase state
      const session = this.activeStreams.get(this.currentStreamId);
      if (session) {
        const localParticipant = session.participants.find(p => p.id === 'currentUser'); // You'll need to track current user ID
        if (localParticipant) {
          localParticipant.isMuted = muted;
          await firestoreService.updateStreamParticipants(this.currentStreamId, session.participants);
        }
      }
    }
  }

  // Enable/disable local video in current stream
  async enableLocalVideo(enabled: boolean): Promise<void> {
    if (isAgoraConfigured() && this.currentStreamId) {
      await agoraService.enableLocalVideo(enabled);
    }
  }

  // Get current Agora stream state
  getAgoraStreamState() {
    return agoraService.getStreamState();
  }

  // Mute/unmute participant
  async toggleParticipantMute(streamId: string, userId: string): Promise<void> {
    try {
      const session = this.activeStreams.get(streamId);
      if (!session) return;

      const participant = session.participants.find(p => p.id === userId);
      if (participant) {
        participant.isMuted = !participant.isMuted;
        await firestoreService.updateStreamParticipants(streamId, session.participants);
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }

  // Kick a participant from the stream
  async kickParticipant(streamId: string, userId: string, kickedById: string): Promise<void> {
    try {
      const session = this.activeStreams.get(streamId);
      if (!session) return;

      // Check if the kicker is a host and has permission
      const kicker = session.participants.find(p => p.id === kickedById);
      const participantToKick = session.participants.find(p => p.id === userId);

      if (!kicker?.isHost) {
        throw new Error('Only hosts can kick participants');
      }

      if (!participantToKick) {
        throw new Error('Participant not found');
      }

      // Remove the participant
      session.participants = session.participants.filter(p => p.id !== userId);
      session.viewerCount = session.participants.filter(p => !p.isHost).length;

      // Update Firebase
      await firestoreService.updateStreamParticipants(streamId, session.participants);
      await firestoreService.updateStreamViewerCount(streamId, session.viewerCount);

    } catch (error) {
      console.error('Error kicking participant:', error);
      throw error;
    }
  }

  // Ban a participant from the stream
  async banParticipant(streamId: string, userId: string, bannedById: string): Promise<void> {
    try {
      const session = this.activeStreams.get(streamId);
      if (!session) return;

      // Check if the banner is a host and has permission
      const banner = session.participants.find(p => p.id === bannedById);
      const participantToBan = session.participants.find(p => p.id === userId);

      if (!banner?.isHost) {
        throw new Error('Only hosts can ban participants');
      }

      if (!participantToBan) {
        throw new Error('Participant not found');
      }

      // For now, just kick them (implement proper ban logic later)
      // TODO: Add ban list to prevent rejoining
      session.participants = session.participants.filter(p => p.id !== userId);
      session.viewerCount = session.participants.filter(p => !p.isHost).length;

      // Update Firebase
      await firestoreService.updateStreamParticipants(streamId, session.participants);
      await firestoreService.updateStreamViewerCount(streamId, session.viewerCount);

    } catch (error) {
      console.error('Error banning participant:', error);
      throw error;
    }
  }
}

export const streamingService = new StreamingService();
