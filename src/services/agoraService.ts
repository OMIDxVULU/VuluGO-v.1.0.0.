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
import { StreamingCircuitBreakers } from '../utils/circuitBreaker';

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
   * Initialize Agora RTC Engine with proper error handling
   */
  async initialize(): Promise<boolean> {
    try {
      return await StreamingCircuitBreakers.AGORA_ENGINE.execute(async () => {
        if (!isAgoraConfigured()) {
          console.warn('⚠️ Agora not configured. Using fallback mode.');
          this.streamState.isConnected = true;
          return true;
        }

        if (this.rtcEngine) {
          console.log('✅ Agora RTC Engine already initialized');
          this.streamState.isConnected = true;
          return true;
        }

        console.log('🔄 Initializing Agora RTC Engine...');

        // TODO: Replace with actual Agora initialization when package is installed
        // For now, simulate initialization with proper error handling

        // Simulate potential initialization failures
        if (Math.random() < 0.1) { // 10% failure rate for testing
          throw new Error('Simulated Agora initialization failure');
        }

        // Mock successful initialization
        this.streamState.isConnected = true;
        this.setupEventListeners();

        console.log('✅ Agora RTC Engine initialized successfully');
        return true;
      });

    } catch (error: any) {
      console.error('❌ Failed to initialize Agora RTC Engine:', error);

      // Set connection state to failed
      this.streamState.isConnected = false;
      this.streamState.connectionState = -1; // Failed state

      // Don't throw error to prevent app crashes, but return false to indicate failure
      return false;
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
   * Join a streaming channel with proper error handling and recovery
   */
  async joinChannel(
    channelName: string,
    userId: string,
    isHost: boolean = false,
    token?: string
  ): Promise<boolean> {
    try {
      return await StreamingCircuitBreakers.CHANNEL_JOIN.execute(async () => {
        console.log(`[AGORA_VIEW] Attempting to join channel: ${channelName} as ${isHost ? 'host' : 'audience'}`);

        if (!this.streamState.isConnected) {
          console.log('[AGORA_VIEW] Engine not connected, initializing...');
          const initialized = await this.initialize();
          if (!initialized) {
            throw new Error('Failed to initialize Agora engine before joining channel');
          }
        }

        // Validate channel name
        if (!channelName || channelName.trim().length === 0) {
          throw new Error('Invalid channel name provided');
        }

        // Generate UID from userId (simple hash)
        const uid = this.generateUidFromUserId(userId);

        // TODO: Replace with actual Agora channel join when package is installed
        // For now, simulate channel join with potential failures

        // Simulate potential join failures
        if (Math.random() < 0.15) { // 15% failure rate for testing
          throw new Error('Failed to join channel');
        }

        // Mock successful join
        this.streamState.isJoined = true;
        this.streamState.channelName = channelName;
        this.streamState.localUid = uid;
        this.streamState.connectionState = 3; // Connected state

        // Trigger connection state callback if available
        if (this.eventCallbacks.onConnectionStateChanged) {
          this.eventCallbacks.onConnectionStateChanged(3, 0); // Connected, Join Success
        }

        console.log(`[AGORA_VIEW] Successfully joined channel: ${channelName} with UID: ${uid}`);
        return true;
      });

    } catch (error: any) {
      console.error(`[AGORA_VIEW] Failed to initialize and join: ${error.message}`);

      // Update connection state to failed
      this.streamState.connectionState = -1;
      this.streamState.isJoined = false;

      // Trigger error callback if available
      if (this.eventCallbacks.onError) {
        this.eventCallbacks.onError(error.code || 'CHANNEL_JOIN_FAILED', error.message);
      }

      return false;

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
   * Cleanup and destroy engine with proper error handling
   */
  async destroy(): Promise<void> {
    try {
      await StreamingCircuitBreakers.RTC_ENGINE_CLEANUP.execute(async () => {
        console.log('🔄 Destroying Agora service...');

        if (this.streamState.isJoined) {
          console.log('🔄 Leaving channel before destruction...');
          await this.leaveChannel();
        }

        // TODO: Replace with actual Agora cleanup when package is installed
        // For now, safely handle mock cleanup

        // Enhanced RTC engine cleanup with comprehensive null checks
        if (this.rtcEngine) {
          try {
            console.log('🔄 Cleaning up RTC engine methods...');

            // Check and safely remove all listeners
            if (this.rtcEngine && typeof this.rtcEngine.removeAllListeners === 'function') {
              console.log('🔄 Removing all RTC engine listeners...');
              this.rtcEngine.removeAllListeners();
              console.log('✅ RTC engine listeners removed');
            } else {
              console.log('ℹ️ removeAllListeners method not available (mock engine)');
            }

            // Check and safely destroy engine
            if (this.rtcEngine && typeof this.rtcEngine.destroy === 'function') {
              console.log('🔄 Destroying RTC engine...');
              await this.rtcEngine.destroy();
              console.log('✅ RTC engine destroyed');
            } else {
              console.log('ℹ️ destroy method not available (mock engine)');
            }

            // Additional cleanup for mock engines
            if (this.rtcEngine && typeof this.rtcEngine.leaveChannel === 'function') {
              try {
                await this.rtcEngine.leaveChannel();
                console.log('✅ Left RTC channel during cleanup');
              } catch (leaveError: any) {
                console.warn('⚠️ Error leaving channel during cleanup:', leaveError.message);
              }
            }

          } catch (cleanupError: any) {
            console.warn('⚠️ Error during RTC engine cleanup:', cleanupError.message);
            // Log the specific error type for debugging
            if (cleanupError.message.includes('removeAllListeners')) {
              console.warn('⚠️ removeAllListeners method failed - likely mock engine issue');
            }
            if (cleanupError.message.includes('destroy')) {
              console.warn('⚠️ destroy method failed - continuing with forced cleanup');
            }
            // Continue with cleanup even if some operations fail
          }
        } else {
          console.log('ℹ️ No RTC engine to cleanup (already null)');
        }

        // Reset state
        this.rtcEngine = null;
        this.streamState.isConnected = false;
        this.streamState.isJoined = false;
        this.streamState.channelName = '';
        this.streamState.localUid = 0;
        this.streamState.connectionState = 0; // Disconnected
        this.streamState.participants.clear();

        console.log('✅ Agora service destroyed successfully');
      });

    } catch (error: any) {
      console.error('❌ Failed to destroy Agora service:', error);

      // Force reset state even if cleanup failed
      this.rtcEngine = null;
      this.streamState.isConnected = false;
      this.streamState.isJoined = false;
      this.streamState.channelName = '';
      this.streamState.localUid = 0;
      this.streamState.connectionState = -1; // Failed state
      this.streamState.participants.clear();

      // Don't throw error to prevent app crashes during cleanup
      console.warn('⚠️ Forced Agora service reset due to cleanup failure');
    }
  }
}

export const agoraService = AgoraService.getInstance();
