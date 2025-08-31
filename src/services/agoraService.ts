/**
 * Agora Live Streaming Service for VuluGO
 * Handles real-time audio/video streaming integration
 */

// Temporarily disable Agora imports until package is properly installed
// import RtcEngine, {
//   RtcEngineEvents,
//   ChannelProfile,
//   ClientRole,
//   AudioProfile,
//   AudioScenario,
//   VideoEncoderConfiguration,
//   ConnectionStateType,
//   ConnectionChangedReason,
// } from 'agora-react-native-rtc';

// Temporary types for development
export type ConnectionStateType = number;
export type ConnectionChangedReason = number;
export type RtcEngine = any;

import {
  getAgoraConfig,
  isAgoraConfigured,
  AGORA_CHANNEL_PROFILES,
  AGORA_CLIENT_ROLES,
  AGORA_AUDIO_PROFILES,
  AGORA_AUDIO_SCENARIOS,
} from '../config/agoraConfig';

export interface AgoraParticipant {
  uid: number;
  userId: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  joinedAt: number;
}

export interface AgoraStreamState {
  isConnected: boolean;
  isJoined: boolean;
  channelName: string;
  localUid: number;
  participants: Map<number, AgoraParticipant>;
  connectionState: ConnectionStateType;
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
}

export interface AgoraEventCallbacks {
  onUserJoined?: (uid: number, elapsed: number) => void;
  onUserOffline?: (uid: number, reason: number) => void;
  onAudioVolumeIndication?: (speakers: Array<{ uid: number; volume: number }>) => void;
  onConnectionStateChanged?: (state: ConnectionStateType, reason: ConnectionChangedReason) => void;
  onError?: (errorCode: number) => void;
  onWarning?: (warningCode: number) => void;
}

class AgoraService {
  private static instance: AgoraService;
  private rtcEngine: RtcEngine | null = null;
  private streamState: AgoraStreamState;
  private config = getAgoraConfig();
  private eventCallbacks: AgoraEventCallbacks = {};

  private constructor() {
    this.streamState = {
      isConnected: false,
      isJoined: false,
      channelName: '',
      localUid: 0,
      participants: new Map(),
      connectionState: 0, // Disconnected state
      isAudioMuted: false,
      isVideoEnabled: false,
    };
  }

  static getInstance(): AgoraService {
    if (!AgoraService.instance) {
      AgoraService.instance = new AgoraService();
    }
    return AgoraService.instance;
  }

  /**
   * Initialize Agora RTC Engine (Mock Implementation)
   */
  async initialize(): Promise<boolean> {
    try {
      if (!isAgoraConfigured()) {
        console.warn('⚠️ Agora not configured. Using mock implementation.');
        // Return true to allow app to continue
        this.streamState.isConnected = true;
        return true;
      }

      if (this.rtcEngine) {
        console.log('✅ Agora RTC Engine already initialized (mock)');
        return true;
      }

      console.log('🔄 Initializing Agora RTC Engine (mock)...');

      // Mock initialization - no actual Agora calls
      this.streamState.isConnected = true;
      console.log('✅ Agora RTC Engine initialized successfully (mock)');
      return true;

    } catch (error: any) {
      console.error('❌ Failed to initialize Agora RTC Engine:', error);
      // Still return true to prevent app crashes
      this.streamState.isConnected = true;
      return true;
    }
  }

  /**
   * Set up Agora event listeners (Mock Implementation)
   */
  private setupEventListeners(): void {
    // Mock implementation - no actual event listeners
    console.log('📡 Setting up Agora event listeners (mock)');
  }

  /**
   * Join a streaming channel (Mock Implementation)
   */
  async joinChannel(
    channelName: string,
    userId: string,
    isHost: boolean = false,
    token?: string
  ): Promise<boolean> {
    try {
      if (!this.streamState.isConnected) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }

      console.log(`🔄 Joining channel: ${channelName} as ${isHost ? 'host' : 'audience'} (mock)`);

      // Generate UID from userId (simple hash)
      const uid = this.generateUidFromUserId(userId);

      // Update state (mock)
      this.streamState.isJoined = true;
      this.streamState.channelName = channelName;
      this.streamState.localUid = uid;

      console.log(`✅ Successfully joined channel: ${channelName} with UID: ${uid} (mock)`);
      return true;

    } catch (error: any) {
      console.error('❌ Failed to join channel:', error);
      return false;
    }
  }

  /**
   * Leave the current channel (Mock Implementation)
   */
  async leaveChannel(): Promise<void> {
    try {
      if (!this.streamState.isJoined) return;

      console.log('🔄 Leaving channel (mock)...');

      // Reset state
      this.streamState.isJoined = false;
      this.streamState.channelName = '';
      this.streamState.localUid = 0;
      this.streamState.participants.clear();

      console.log('✅ Successfully left channel (mock)');

    } catch (error: any) {
      console.error('❌ Failed to leave channel:', error);
    }
  }

  /**
   * Mute/unmute local audio (Mock Implementation)
   */
  async muteLocalAudio(muted: boolean): Promise<void> {
    try {
      this.streamState.isAudioMuted = muted;
      console.log(`🔇 Local audio ${muted ? 'muted' : 'unmuted'} (mock)`);

    } catch (error: any) {
      console.error('❌ Failed to mute/unmute audio:', error);
    }
  }

  /**
   * Enable/disable local video (Mock Implementation)
   */
  async enableLocalVideo(enabled: boolean): Promise<void> {
    try {
      if (!this.config.enableVideoStreaming) return;

      this.streamState.isVideoEnabled = enabled;
      console.log(`📹 Local video ${enabled ? 'enabled' : 'disabled'} (mock)`);

    } catch (error: any) {
      console.error('❌ Failed to enable/disable video:', error);
    }
  }

  /**
   * Set event callbacks (Mock Implementation)
   */
  setEventCallbacks(callbacks: AgoraEventCallbacks): void {
    this.eventCallbacks = { ...this.eventCallbacks, ...callbacks };
    console.log('📡 Event callbacks set (mock)');
  }

  /**
   * Get current stream state
   */
  getStreamState(): AgoraStreamState {
    return { ...this.streamState };
  }

  /**
   * Generate consistent UID from user ID
   */
  private generateUidFromUserId(userId: string): number {
    // Simple hash function to generate consistent numeric UID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 2147483647; // Ensure positive and within Agora's UID range
  }

  /**
   * Cleanup and destroy engine (Mock Implementation)
   */
  async destroy(): Promise<void> {
    try {
      if (this.streamState.isJoined) {
        await this.leaveChannel();
      }

      this.rtcEngine = null;
      this.streamState.isConnected = false;
      console.log('✅ Agora service destroyed (mock)');

    } catch (error: any) {
      console.error('❌ Failed to destroy Agora service:', error);
    }
  }
}

export const agoraService = AgoraService.getInstance();
