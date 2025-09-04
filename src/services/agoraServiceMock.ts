/**
 * Mock Agora Service for Development
 * Provides mock implementations for Agora SDK functionality when running in Expo Go
 */

// Mock types that match the real Agora SDK
export enum ConnectionStateType {
  Disconnected = 1,
  Connecting = 2,
  Connected = 3,
  Reconnecting = 4,
  Failed = 5,
}

export enum ConnectionChangedReason {
  Connecting = 0,
  JoinSuccess = 1,
  Interrupted = 2,
  BannedByServer = 3,
  JoinFailed = 4,
  LeaveChannel = 5,
  InvalidAppId = 6,
  InvalidChannelName = 7,
  InvalidToken = 8,
  TokenExpired = 9,
  RejectedByServer = 10,
  SettingProxyServer = 11,
  RenewToken = 12,
  ClientIpAddressChanged = 13,
  KeepAliveTimeout = 14,
}

export enum UserOfflineReason {
  Quit = 0,
  Dropped = 1,
  BecomeAudience = 2,
}

export enum ErrorCode {
  NoError = 0,
  Failed = 1,
  InvalidArgument = 2,
  NotReady = 3,
  NotSupported = 4,
  Refused = 5,
  BufferTooSmall = 6,
  NotInitialized = 7,
  InvalidState = 10,
  NoPermission = 11,
  TimedOut = 12,
  Canceled = 13,
  TooOften = 14,
  BindSocket = 15,
  NetDown = 16,
  NetNobufs = 17,
  JoinChannelRejected = 18,
  LeaveChannelRejected = 19,
  AlreadyInUse = 20,
  InvalidAppId = 101,
  InvalidChannelName = 102,
  NoServerResources = 103,
  TokenExpired = 109,
  InvalidToken = 110,
  ConnectionInterrupted = 111,
  ConnectionLost = 112,
  NotInChannel = 113,
  SizeTooLarge = 114,
  BitrateLimit = 115,
  TooManyDataStreams = 116,
  StreamMessageTimeout = 117,
  SetClientRoleNotAuthorized = 119,
  DecryptionFailed = 120,
  InvalidUserId = 121,
  ClientIsRecording = 1025,
}

export enum WarningCode {
  InvalidView = 8,
  InitVideo = 16,
  Pending = 20,
  NoAvailableChannel = 103,
  LookupChannelTimeout = 104,
  LookupChannelRejected = 105,
  OpenChannelTimeout = 106,
  OpenChannelRejected = 107,
  SwitchLiveVideoTimeout = 111,
  SetClientRoleTimeout = 118,
  SetClientRoleNotAuthorized = 119,
  OpenChannelInvalidTicket = 121,
  OpenChannelTryNextVos = 122,
  AudioMixingOpenError = 701,
  AdmRuntimePlayoutWarning = 1014,
  AdmRuntimeRecordingWarning = 1016,
  AdmRecordAudioSilence = 1019,
  AdmPlaybackMalfunction = 1020,
  AdmRecordMalfunction = 1021,
  AdmInterruption = 1025,
  AdmCategoryNotPlayAndRecord = 1029,
  AdmRecordAudioLowlevel = 1031,
  AdmPlayoutAudioLowlevel = 1032,
  AdmRecordIsOccupied = 1033,
  AdmNoDataReadyCallback = 1040,
  AdmInconsistentDevices = 1042,
  ApmHowling = 1051,
  AdmGlitchState = 1052,
  AdmImproperSettings = 1053,
}

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
  isVideoMuted: boolean;
  networkQuality: number;
  audioStats: any;
  videoStats: any;
}

export interface AgoraEventCallbacks {
  onJoinChannelSuccess?: (channel: string, uid: number, elapsed: number) => void;
  onUserJoined?: (uid: number, elapsed: number) => void;
  onUserOffline?: (uid: number, reason: UserOfflineReason) => void;
  onConnectionStateChanged?: (state: ConnectionStateType, reason: ConnectionChangedReason) => void;
  onError?: (errorCode: ErrorCode) => void;
  onWarning?: (warningCode: WarningCode) => void;
  onAudioVolumeIndication?: (speakers: Array<{ uid: number; volume: number; vad: number }>, totalVolume: number) => void;
  onNetworkQuality?: (uid: number, txQuality: number, rxQuality: number) => void;
  onRtcStats?: (stats: any) => void;
  onLocalAudioStats?: (stats: any) => void;
  onRemoteAudioStats?: (stats: any) => void;
  onTokenPrivilegeWillExpire?: (token: string) => void;
  onRequestToken?: () => void;
}

class MockAgoraService {
  private engine: any = null;
  private streamState: AgoraStreamState = {
    isConnected: false,
    isJoined: false,
    channelName: '',
    localUid: 0,
    participants: new Map(),
    connectionState: ConnectionStateType.Disconnected,
    isAudioMuted: false,
    isVideoMuted: false,
    networkQuality: 6, // Excellent quality
    audioStats: {},
    videoStats: {},
  };
  private callbacks: AgoraEventCallbacks = {};
  private mockParticipants: AgoraParticipant[] = [];

  async initialize(appId: string): Promise<void> {
    console.log('🎭 Mock Agora: Initializing with appId:', appId);
    
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.engine = {
      // Mock engine methods
      destroy: () => Promise.resolve(),
      joinChannel: () => Promise.resolve(0),
      leaveChannel: () => Promise.resolve(0),
      muteLocalAudioStream: () => Promise.resolve(0),
      muteLocalVideoStream: () => Promise.resolve(0),
      setChannelProfile: () => Promise.resolve(0),
      setClientRole: () => Promise.resolve(0),
      enableAudioVolumeIndication: () => Promise.resolve(0),
      renewToken: () => Promise.resolve(0),
    };
    
    console.log('✅ Mock Agora: Initialized successfully');
  }

  async joinChannel(
    token: string,
    channelName: string,
    uid: number,
    isHost: boolean = false
  ): Promise<void> {
    console.log('🎭 Mock Agora: Joining channel:', channelName, 'as', isHost ? 'host' : 'audience');
    
    // Simulate join delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.streamState.channelName = channelName;
    this.streamState.localUid = uid;
    this.streamState.isJoined = true;
    this.streamState.isConnected = true;
    this.streamState.connectionState = ConnectionStateType.Connected;
    
    // Add some mock participants
    this.addMockParticipants();
    
    // Trigger join success callback
    if (this.callbacks.onJoinChannelSuccess) {
      this.callbacks.onJoinChannelSuccess(channelName, uid, 1000);
    }
    
    // Simulate connection state change
    if (this.callbacks.onConnectionStateChanged) {
      this.callbacks.onConnectionStateChanged(
        ConnectionStateType.Connected,
        ConnectionChangedReason.JoinSuccess
      );
    }
    
    console.log('✅ Mock Agora: Joined channel successfully');
  }

  async leaveChannel(): Promise<void> {
    console.log('🎭 Mock Agora: Leaving channel');
    
    this.streamState.isJoined = false;
    this.streamState.isConnected = false;
    this.streamState.connectionState = ConnectionStateType.Disconnected;
    this.streamState.participants.clear();
    
    // Simulate connection state change
    if (this.callbacks.onConnectionStateChanged) {
      this.callbacks.onConnectionStateChanged(
        ConnectionStateType.Disconnected,
        ConnectionChangedReason.LeaveChannel
      );
    }
    
    console.log('✅ Mock Agora: Left channel successfully');
  }

  async muteLocalAudio(muted: boolean): Promise<void> {
    console.log('🎭 Mock Agora: Muting local audio:', muted);
    this.streamState.isAudioMuted = muted;
  }

  async muteLocalVideo(muted: boolean): Promise<void> {
    console.log('🎭 Mock Agora: Muting local video:', muted);
    this.streamState.isVideoMuted = muted;
  }

  async renewToken(token: string): Promise<void> {
    console.log('🎭 Mock Agora: Renewing token');
    // Simulate token renewal
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  setEventCallbacks(callbacks: AgoraEventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    console.log('🎭 Mock Agora: Event callbacks set');
  }

  getStreamState(): AgoraStreamState {
    return { ...this.streamState };
  }

  async destroy(): Promise<void> {
    console.log('🎭 Mock Agora: Destroying engine');
    
    if (this.streamState.isJoined) {
      await this.leaveChannel();
    }
    
    this.engine = null;
    this.callbacks = {};
    this.mockParticipants = [];
    
    console.log('✅ Mock Agora: Destroyed successfully');
  }

  private addMockParticipants(): void {
    // Add some mock participants for testing
    const mockUsers = [
      { uid: 1001, userId: 'user1', name: 'Alice', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
      { uid: 1002, userId: 'user2', name: 'Bob', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
      { uid: 1003, userId: 'user3', name: 'Charlie', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
    ];

    mockUsers.forEach(user => {
      const participant: AgoraParticipant = {
        ...user,
        isHost: Math.random() > 0.7, // 30% chance of being host
        isMuted: Math.random() > 0.8, // 20% chance of being muted
        isSpeaking: Math.random() > 0.5, // 50% chance of speaking
        audioLevel: Math.floor(Math.random() * 100),
        joinedAt: Date.now() - Math.floor(Math.random() * 300000), // Joined within last 5 minutes
      };
      
      this.streamState.participants.set(user.uid, participant);
      
      // Simulate user joined event
      setTimeout(() => {
        if (this.callbacks.onUserJoined) {
          this.callbacks.onUserJoined(user.uid, 100);
        }
      }, Math.random() * 2000);
    });

    // Simulate audio volume updates
    this.startMockAudioUpdates();
  }

  private startMockAudioUpdates(): void {
    const updateInterval = setInterval(() => {
      if (!this.streamState.isJoined) {
        clearInterval(updateInterval);
        return;
      }

      const speakers: Array<{ uid: number; volume: number; vad: number }> = [];
      
      this.streamState.participants.forEach((participant, uid) => {
        if (participant.isSpeaking && !participant.isMuted) {
          speakers.push({
            uid,
            volume: Math.floor(Math.random() * 100),
            vad: 1, // Voice activity detected
          });
        }
      });

      if (this.callbacks.onAudioVolumeIndication && speakers.length > 0) {
        this.callbacks.onAudioVolumeIndication(speakers, Math.floor(Math.random() * 100));
      }
    }, 1000);
  }

  // Static method to check if we're in development mode
  static isDevelopmentMode(): boolean {
    return __DEV__ && !global.RNAgora;
  }
}

// Export the mock service
export const mockAgoraService = new MockAgoraService();

// Export mock constants
export const MOCK_AGORA_CONFIG = {
  appId: 'mock-app-id',
  channelProfile: 1, // Live Broadcasting
  clientRole: {
    BROADCASTER: 1,
    AUDIENCE: 2,
  },
  audioProfile: {
    DEFAULT: 0,
    SPEECH_STANDARD: 1,
    MUSIC_STANDARD: 2,
    MUSIC_STANDARD_STEREO: 3,
    MUSIC_HIGH_QUALITY: 4,
    MUSIC_HIGH_QUALITY_STEREO: 5,
  },
  audioScenario: {
    DEFAULT: 0,
    CHATROOM_ENTERTAINMENT: 1,
    EDUCATION: 2,
    GAME_STREAMING: 3,
    SHOWROOM: 4,
    CHATROOM_GAMING: 5,
  },
};

export default mockAgoraService;
