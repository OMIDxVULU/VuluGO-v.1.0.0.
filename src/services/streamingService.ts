import { firestoreService } from './firestoreService';
import { LiveStream, StreamHost, StreamViewer } from '../context/LiveStreamContext';

// Agora integration would go here
// For now, we'll create a service that manages stream state via Firebase

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

  // Initialize a new stream
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
        viewerCount: 1
      };

      // Store in Firebase
      await firestoreService.createStream(streamId, streamData);

      const session: StreamSession = {
        id: streamId,
        ...streamData
      };

      this.activeStreams.set(streamId, session);
      return streamId;
    } catch (error) {
      console.error('Error creating stream:', error);
      throw error;
    }
  }

  // Join a stream as viewer
  async joinStream(
    streamId: string,
    userId: string,
    userName: string,
    userAvatar: string
  ): Promise<void> {
    try {
      const session = this.activeStreams.get(streamId);
      if (!session) {
        throw new Error('Stream not found');
      }

      // Check if user is already a participant
      const existingParticipant = session.participants.find(p => p.id === userId);
      if (existingParticipant) {
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

    } catch (error) {
      console.error('Error joining stream:', error);
      throw error;
    }
  }

  // Leave a stream
  async leaveStream(streamId: string, userId: string): Promise<void> {
    try {
      const session = this.activeStreams.get(streamId);
      if (!session) return;

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
      return streams.map(this.convertToLiveStream);
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
      const liveStreams = streamsData.map(this.convertToLiveStream);
      callback(liveStreams);
    });

    return unsubscribe;
  }

  // Convert StreamSession to LiveStream format for compatibility
  private convertToLiveStream(session: StreamSession): LiveStream {
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
