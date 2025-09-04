/**
 * Agora Live Streaming Service for VuluGO
 * Handles real-time audio/video streaming integration with Firebase token authentication
 * Uses safe import wrapper to prevent crashes in Expo Go
 */

import {
  RtcEngine,
  RtcEngineEvents,
  ChannelProfile,
  ClientRole,
  AudioProfile,
  AudioScenario,
  VideoEncoderConfiguration,
  ConnectionStateType,
  ConnectionChangedReason,
  UserOfflineReason,
  ErrorCode,
  WarningCode,
  isAgoraAvailable,
  isUsingMockAgora
} from './agoraImportWrapper';

import { agoraTokenService } from './agoraTokenService';

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
  onUserOffline?: (uid: number, reason: UserOfflineReason) => void;
  onAudioVolumeIndication?: (speakers: Array<{ uid: number; volume: number }>) => void;
  onConnectionStateChanged?: (state: ConnectionStateType, reason: ConnectionChangedReason) => void;
  onError?: (errorCode: ErrorCode) => void;
  onWarning?: (warningCode: WarningCode) => void;
  onJoinChannelSuccess?: (channel: string, uid: number, elapsed: number) => void;
  onLeaveChannel?: (stats: any) => void;
  onRemoteAudioStateChanged?: (uid: number, state: number, reason: number, elapsed: number) => void;
}

export interface AgoraTokenResponse {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  role: string;
  expiresAt: number;
}

class AgoraService {
  private static instance: AgoraService;
  private rtcEngine: any = null; // Changed to any to support mock service
  private streamState: AgoraStreamState;
  private config = getAgoraConfig();
  private eventCallbacks: AgoraEventCallbacks = {};
  private currentToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private isUsingMockService = isUsingMockAgora();

  private constructor() {
    this.streamState = {
      isConnected: false,
      isJoined: false,
      channelName: '',
      localUid: 0,
      participants: new Map(),
      connectionState: ConnectionStateType.Disconnected,
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
   * Initialize Agora RTC Engine (or mock service in development)
   */
  async initialize(): Promise<boolean> {
    try {
      // Use mock service when Agora SDK is not available
      if (isUsingMockAgora()) {
        console.log('🎭 Initializing Mock Agora Service for development');
        const { mockAgoraService } = require('./agoraServiceMock');
        await mockAgoraService.initialize('mock-app-id');
        this.rtcEngine = mockAgoraService as any; // Cast to satisfy TypeScript
        // Forward any existing callbacks to the mock engine so UI receives events
        try {
          if (this.eventCallbacks && typeof (this.rtcEngine as any).setEventCallbacks === 'function') {
            (this.rtcEngine as any).setEventCallbacks(this.eventCallbacks);
          }
        } catch (e) {
          console.warn('⚠️ Failed to forward callbacks to mock Agora service:', e);
        }
        console.log('✅ Mock Agora Service initialized successfully');
        return true;
      }

      if (!isAgoraConfigured()) {
        console.warn('⚠️ Agora not configured. Cannot initialize RTC engine.');
        return false;
      }

      if (this.rtcEngine) {
        console.log('✅ Agora RTC Engine already initialized');
        return true;
      }

      console.log('🔄 Initializing Agora RTC Engine...');

      // Create RTC Engine instance
      this.rtcEngine = await RtcEngine.create(this.config.appId);

      // Set channel profile for live broadcasting
      await this.rtcEngine.setChannelProfile(ChannelProfile.LiveBroadcasting);

      // Configure audio settings for social streaming
      await this.rtcEngine.setAudioProfile(
        AudioProfile.MusicHighQuality,
        AudioScenario.ChatRoomEntertainment
      );

      // Enable audio volume indication for speaking indicators
      await this.rtcEngine.enableAudioVolumeIndication(200, 3, true);

      // Setup event listeners
      this.setupEventListeners();

      this.streamState.isConnected = true;
      console.log('✅ Agora RTC Engine initialized successfully');
      return true;

    } catch (error: any) {
      console.error('❌ Failed to initialize Agora RTC Engine:', error);
      return false;
    }
  }

  /**
   * Set up Agora event listeners
   */
  private setupEventListeners(): void {
    if (!this.rtcEngine) return;

    console.log('📡 Setting up Agora event listeners');

    // User joined channel
    this.rtcEngine.addListener('UserJoined', (uid: number, elapsed: number) => {
      console.log(`👤 User joined: ${uid}`);
      this.eventCallbacks.onUserJoined?.(uid, elapsed);
    });

    // User left channel
    this.rtcEngine.addListener('UserOffline', (uid: number, reason: UserOfflineReason) => {
      console.log(`👤 User offline: ${uid}, reason: ${reason}`);
      this.streamState.participants.delete(uid);
      this.eventCallbacks.onUserOffline?.(uid, reason);
    });

    // Audio volume indication (speaking indicators)
    this.rtcEngine.addListener('AudioVolumeIndication', (speakers: Array<{ uid: number; volume: number }>) => {
      // Update speaking status for participants
      speakers.forEach(speaker => {
        const participant = this.streamState.participants.get(speaker.uid);
        if (participant) {
          participant.isSpeaking = speaker.volume > 5; // Threshold for speaking
          participant.audioLevel = speaker.volume;
        }
      });
      this.eventCallbacks.onAudioVolumeIndication?.(speakers);
    });

    // Connection state changed
    this.rtcEngine.addListener('ConnectionStateChanged', (state: ConnectionStateType, reason: ConnectionChangedReason) => {
      console.log(`🔗 Connection state changed: ${state}, reason: ${reason}`);
      this.streamState.connectionState = state;
      this.eventCallbacks.onConnectionStateChanged?.(state, reason);
    });

    // Join channel success
    this.rtcEngine.addListener('JoinChannelSuccess', (channel: string, uid: number, elapsed: number) => {
      console.log(`✅ Successfully joined channel: ${channel} with UID: ${uid}`);
      this.streamState.isJoined = true;
      this.streamState.channelName = channel;
      this.streamState.localUid = uid;
      this.eventCallbacks.onJoinChannelSuccess?.(channel, uid, elapsed);
    });

    // Leave channel
    this.rtcEngine.addListener('LeaveChannel', (stats: any) => {
      console.log('👋 Left channel');
      this.streamState.isJoined = false;
      this.streamState.participants.clear();
      this.eventCallbacks.onLeaveChannel?.(stats);
    });

    // Error handling
    this.rtcEngine.addListener('Error', (errorCode: ErrorCode) => {
      console.error(`❌ Agora Error: ${errorCode}`);
      this.eventCallbacks.onError?.(errorCode);
    });

    // Warning handling
    this.rtcEngine.addListener('Warning', (warningCode: WarningCode) => {
      console.warn(`⚠️ Agora Warning: ${warningCode}`);
      this.eventCallbacks.onWarning?.(warningCode);
    });

    // Remote audio state changed
    this.rtcEngine.addListener('RemoteAudioStateChanged', (uid: number, state: number, reason: number, elapsed: number) => {
      console.log(`🔊 Remote audio state changed for ${uid}: state=${state}, reason=${reason}`);
      const participant = this.streamState.participants.get(uid);
      if (participant) {
        participant.isMuted = state === 0; // 0 = stopped, 2 = decoding
      }
      this.eventCallbacks.onRemoteAudioStateChanged?.(uid, state, reason, elapsed);
    });
  }

  /**
   * Generate Agora token using token service
   */
  private async generateToken(channelName: string, uid: number, role: 'host' | 'audience'): Promise<AgoraTokenResponse> {
    try {
      const tokenData = await agoraTokenService.generateToken({
        channelName,
        uid,
        role,
        expirationTimeInSeconds: 3600 // 1 hour
      });

      this.currentToken = tokenData.token;
      this.tokenExpiresAt = tokenData.expiresAt;

      return tokenData;

    } catch (error: any) {
      console.error('❌ Failed to generate Agora token:', error);
      throw error;
    }
  }

  /**
   * Check if token needs renewal (within 5 minutes of expiry)
   */
  private needsTokenRenewal(): boolean {
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return this.tokenExpiresAt < fiveMinutesFromNow;
  }

  /**
   * Renew token for current channel
   */
  async renewToken(): Promise<boolean> {
    try {
      if (!this.streamState.isJoined || !this.rtcEngine) {
        console.warn('⚠️ Cannot renew token - not joined to channel');
        return false;
      }

      console.log('🔄 Renewing Agora token...');

      const uid = this.streamState.localUid;
      const channelName = this.streamState.channelName;

      // Determine role based on current state (simplified)
      const isHost = this.streamState.participants.get(uid)?.isHost || false;
      const role = isHost ? 'host' : 'audience';

      const tokenData = await agoraTokenService.renewTokenIfNeeded(
        channelName,
        uid,
        role,
        this.tokenExpiresAt
      );

      if (tokenData) {
        // Update token in the engine
        await this.rtcEngine.renewToken(tokenData.token);
        this.currentToken = tokenData.token;
        this.tokenExpiresAt = tokenData.expiresAt;

        console.log('✅ Token renewed successfully');
        return true;
      }

      return false; // Token was still valid

    } catch (error: any) {
      console.error('❌ Failed to renew token:', error);
      return false;
    }
  }

  /**
   * Validate stream access before joining
   */
  async validateStreamAccess(streamId: string): Promise<boolean> {
    try {
      const validation = await agoraTokenService.validateStreamAccess(streamId);
      return validation.canJoin;
    } catch (error: any) {
      console.error('❌ Stream access validation failed:', error);
      return false;
    }
  }

  /**
   * Join a streaming channel with secure token authentication
   */
  async joinChannel(
    channelName: string,
    userId: string,
    isHost: boolean = false,
    providedToken?: string,
    validateAccess: boolean = true
  ): Promise<boolean> {
    try {
      // Validate stream access if requested
      if (validateAccess && !isHost) {
        const hasAccess = await this.validateStreamAccess(channelName);
        if (!hasAccess) {
          console.error('❌ Stream access denied');
          return false;
        }
      }

      if (!this.streamState.isConnected) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }

      if (!this.rtcEngine) {
        console.error('❌ RTC Engine not initialized');
        return false;
      }

      console.log(`🔄 Joining channel: ${channelName} as ${isHost ? 'host' : 'audience'}`);

      // Generate UID from userId (consistent hash)
      const uid = this.generateUidFromUserId(userId);

      // Handle mock service differently
      if (this.isUsingMockService) {
        console.log('🎭 Using mock service to join channel');
        await this.rtcEngine.joinChannel('mock-token', channelName, uid, isHost);
        this.streamState.isJoined = true;
        this.streamState.channelName = channelName;
        this.streamState.localUid = uid;
        return true;
      }

      // Set client role for real Agora SDK
      const clientRole = isHost ? ClientRole.Broadcaster : ClientRole.Audience;
      await this.rtcEngine.setClientRole(clientRole);

      // Generate or use provided token
      let token = providedToken;
      if (!token || this.needsTokenRenewal()) {
        const tokenData = await this.generateToken(
          channelName,
          uid,
          isHost ? 'host' : 'audience'
        );
        token = tokenData.token;
      }

      // Join the channel
      await this.rtcEngine.joinChannel(token, channelName, null, uid);

      console.log(`✅ Joining channel initiated: ${channelName} with UID: ${uid}`);
      return true;

    } catch (error: any) {
      console.error('❌ Failed to join channel:', error);
      return false;
    }
  }

  /**
   * Leave the current channel
   */
  async leaveChannel(): Promise<void> {
    try {
      if (!this.streamState.isJoined || !this.rtcEngine) return;

      console.log('🔄 Leaving channel...');

      // Handle mock service
      if (this.isUsingMockService) {
        console.log('🎭 Using mock service to leave channel');
        await this.rtcEngine.leaveChannel();
        this.streamState.isJoined = false;
        this.streamState.channelName = '';
        this.streamState.participants.clear();
        return;
      }

      // Leave the channel
      await this.rtcEngine.leaveChannel();

      // Reset state (will be updated by event listener)
      this.streamState.isJoined = false;
      this.streamState.channelName = '';
      this.streamState.localUid = 0;
      this.streamState.participants.clear();
      this.currentToken = null;
      this.tokenExpiresAt = 0;

      console.log('✅ Successfully left channel');

    } catch (error: any) {
      console.error('❌ Failed to leave channel:', error);
    }
  }

  /**
   * Mute/unmute local audio
   */
  async muteLocalAudio(muted: boolean): Promise<void> {
    try {
      if (!this.rtcEngine) return;

      await this.rtcEngine.muteLocalAudioStream(muted);
      this.streamState.isAudioMuted = muted;
      console.log(`🔇 Local audio ${muted ? 'muted' : 'unmuted'}`);

    } catch (error: any) {
      console.error('❌ Failed to mute/unmute audio:', error);
    }
  }

  /**
   * Enable/disable local video
   */
  async enableLocalVideo(enabled: boolean): Promise<void> {
    try {
      if (!this.rtcEngine || !this.config.enableVideoStreaming) return;

      if (enabled) {
        await this.rtcEngine.enableVideo();
        await this.rtcEngine.startPreview();
      } else {
        await this.rtcEngine.disableVideo();
        await this.rtcEngine.stopPreview();
      }

      this.streamState.isVideoEnabled = enabled;
      console.log(`📹 Local video ${enabled ? 'enabled' : 'disabled'}`);

    } catch (error: any) {
      console.error('❌ Failed to enable/disable video:', error);
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    try {
      if (!this.rtcEngine || !this.streamState.isVideoEnabled) return;

      await this.rtcEngine.switchCamera();
      console.log('📷 Camera switched');

    } catch (error: any) {
      console.error('❌ Failed to switch camera:', error);
    }
  }

  /**
   * Adjust recording signal volume
   */
  async adjustRecordingSignalVolume(volume: number): Promise<void> {
    try {
      if (!this.rtcEngine) return;

      // Volume range: 0-400 (0 = mute, 100 = original, 400 = 4x amplification)
      const adjustedVolume = Math.max(0, Math.min(400, volume));
      await this.rtcEngine.adjustRecordingSignalVolume(adjustedVolume);
      console.log(`🔊 Recording volume adjusted to: ${adjustedVolume}`);

    } catch (error: any) {
      console.error('❌ Failed to adjust recording volume:', error);
    }
  }

  /**
   * Set event callbacks
   */
  setEventCallbacks(callbacks: AgoraEventCallbacks): void {
    const prev = this.eventCallbacks;
    const combined: AgoraEventCallbacks = { ...prev };

    const keys: Array<keyof AgoraEventCallbacks> = [
      'onUserJoined',
      'onUserOffline',
      'onAudioVolumeIndication',
      'onConnectionStateChanged',
      'onError',
      'onWarning',
      'onJoinChannelSuccess',
      'onLeaveChannel',
      'onRemoteAudioStateChanged'
    ];

    keys.forEach((key) => {
      const nextCb = callbacks[key];
      if (nextCb) {
        const prevCb = prev[key];
        combined[key] = ((...args: any[]) => {
          try { prevCb?.(...args as any); } catch (e) { console.warn(`⚠️ Error in previous ${String(key)} callback:`, e); }
          try { (nextCb as any)(...args); } catch (e) { console.warn(`⚠️ Error in new ${String(key)} callback:`, e); }
        }) as any;
      }
    });

    this.eventCallbacks = combined;

    try {
      // Forward callbacks to mock service if supported so UI receives events
      if (this.rtcEngine && typeof (this.rtcEngine as any).setEventCallbacks === 'function') {
        (this.rtcEngine as any).setEventCallbacks(this.eventCallbacks);
      }
    } catch (e) {
      console.warn('⚠️ Failed to forward event callbacks to RTC engine:', e);
    }
    console.log('📡 Event callbacks set');
  }

  /**
   * Get current stream state
   */
  getStreamState(): AgoraStreamState {
    return {
      ...this.streamState,
      participants: new Map(this.streamState.participants) // Create a copy of the Map
    };
  }

  /**
   * Get participant by UID
   */
  getParticipant(uid: number): AgoraParticipant | undefined {
    return this.streamState.participants.get(uid);
  }

  /**
   * Get all participants as array
   */
  getParticipants(): AgoraParticipant[] {
    return Array.from(this.streamState.participants.values());
  }

  /**
   * Add or update participant
   */
  updateParticipant(uid: number, participant: Partial<AgoraParticipant>): void {
    const existing = this.streamState.participants.get(uid);
    if (existing) {
      this.streamState.participants.set(uid, { ...existing, ...participant });
    } else {
      // Create new participant with defaults
      const newParticipant: AgoraParticipant = {
        uid,
        userId: participant.userId || `user_${uid}`,
        name: participant.name || `User ${uid}`,
        avatar: participant.avatar || '',
        isHost: participant.isHost || false,
        isMuted: participant.isMuted || false,
        isSpeaking: participant.isSpeaking || false,
        audioLevel: participant.audioLevel || 0,
        joinedAt: participant.joinedAt || Date.now(),
        ...participant
      };
      this.streamState.participants.set(uid, newParticipant);
    }
  }

  /**
   * Remove participant
   */
  removeParticipant(uid: number): void {
    this.streamState.participants.delete(uid);
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
   * Cleanup and destroy engine
   */
  async destroy(): Promise<void> {
    try {
      if (this.streamState.isJoined) {
        await this.leaveChannel();
      }

      if (this.rtcEngine) {
        // Remove all listeners
        this.rtcEngine.removeAllListeners();

        // Destroy the engine
        await RtcEngine.destroy();
        this.rtcEngine = null;
      }

      // Reset state
      this.streamState.isConnected = false;
      this.streamState.participants.clear();
      this.currentToken = null;
      this.tokenExpiresAt = 0;
      this.eventCallbacks = {};

      console.log('✅ Agora service destroyed');

    } catch (error: any) {
      console.error('❌ Failed to destroy Agora service:', error);
    }
  }

  /**
   * Handle app lifecycle changes
   */
  async handleAppStateChange(nextAppState: string): Promise<void> {
    try {
      if (!this.rtcEngine || !this.streamState.isJoined) return;

      if (nextAppState === 'background') {
        console.log('📱 App going to background - pausing audio');
        // Optionally mute audio when app goes to background
        // await this.muteLocalAudio(true);
      } else if (nextAppState === 'active') {
        console.log('📱 App becoming active - resuming audio');
        // Resume audio when app becomes active
        // await this.muteLocalAudio(false);
      }

    } catch (error: any) {
      console.error('❌ Failed to handle app state change:', error);
    }
  }

  /**
   * Get connection quality statistics
   */
  async getConnectionStats(): Promise<any> {
    try {
      if (!this.rtcEngine) return null;

      // Note: This would require implementing RTC stats collection
      // For now, return basic connection info
      return {
        connectionState: this.streamState.connectionState,
        isConnected: this.streamState.isConnected,
        isJoined: this.streamState.isJoined,
        participantCount: this.streamState.participants.size,
        tokenExpiresAt: this.tokenExpiresAt
      };

    } catch (error: any) {
      console.error('❌ Failed to get connection stats:', error);
      return null;
    }
  }
}

export const agoraService = AgoraService.getInstance();
