/**
 * Agora Import Wrapper
 * Safely imports Agora SDK with fallback to mock service
 */

// Check if we're in Expo Go environment
const isExpoGo = __DEV__ && typeof global.RNAgora === 'undefined';

// Mock implementations for when Agora SDK is not available
const mockAgoraExports = {
  default: null,
  RtcEngine: null,
  RtcEngineEvents: {},
  ChannelProfile: {
    Communication: 0,
    LiveBroadcasting: 1
  },
  ClientRole: {
    Broadcaster: 1,
    Audience: 2
  },
  AudioProfile: {
    Default: 0,
    SpeechStandard: 1,
    MusicStandard: 2,
    MusicStandardStereo: 3,
    MusicHighQuality: 4,
    MusicHighQualityStereo: 5
  },
  AudioScenario: {
    Default: 0,
    ChatRoomEntertainment: 1,
    Education: 2,
    GameStreaming: 3,
    ShowRoom: 4,
    ChatRoomGaming: 5
  },
  VideoEncoderConfiguration: {},
  ConnectionStateType: {
    Disconnected: 1,
    Connecting: 2,
    Connected: 3,
    Reconnecting: 4,
    Failed: 5
  },
  ConnectionChangedReason: {
    Connecting: 0,
    JoinSuccess: 1,
    Interrupted: 2,
    BannedByServer: 3,
    JoinFailed: 4,
    LeaveChannel: 5,
    InvalidAppId: 6,
    InvalidChannelName: 7,
    InvalidToken: 8,
    TokenExpired: 9,
    RejectedByServer: 10,
    SettingProxyServer: 11,
    RenewToken: 12,
    ClientIpAddressChanged: 13,
    KeepAliveTimeout: 14
  },
  UserOfflineReason: {
    Quit: 0,
    Dropped: 1,
    BecomeAudience: 2
  },
  ErrorCode: {
    NoError: 0,
    Failed: 1,
    InvalidArgument: 2,
    NotReady: 3,
    NotSupported: 4,
    Refused: 5,
    BufferTooSmall: 6,
    NotInitialized: 7,
    InvalidState: 10,
    NoPermission: 11,
    TimedOut: 12,
    Canceled: 13,
    TooOften: 14,
    BindSocket: 15,
    NetDown: 16,
    NetNobufs: 17,
    JoinChannelRejected: 18,
    LeaveChannelRejected: 19,
    AlreadyInUse: 20,
    InvalidAppId: 101,
    InvalidChannelName: 102,
    NoServerResources: 103,
    TokenExpired: 109,
    InvalidToken: 110,
    ConnectionInterrupted: 111,
    ConnectionLost: 112,
    NotInChannel: 113,
    SizeTooLarge: 114,
    BitrateLimit: 115,
    TooManyDataStreams: 116,
    StreamMessageTimeout: 117,
    SetClientRoleNotAuthorized: 119,
    DecryptionFailed: 120,
    InvalidUserId: 121,
    ClientIsRecording: 1025
  },
  WarningCode: {
    InvalidView: 8,
    InitVideo: 16,
    Pending: 20,
    NoAvailableChannel: 103,
    LookupChannelTimeout: 104,
    LookupChannelRejected: 105,
    OpenChannelTimeout: 106,
    OpenChannelRejected: 107,
    SwitchLiveVideoTimeout: 111,
    SetClientRoleTimeout: 118,
    SetClientRoleNotAuthorized: 119,
    OpenChannelInvalidTicket: 121,
    OpenChannelTryNextVos: 122,
    AudioMixingOpenError: 701,
    AdmRuntimePlayoutWarning: 1014,
    AdmRuntimeRecordingWarning: 1016,
    AdmRecordAudioSilence: 1019,
    AdmPlaybackMalfunction: 1020,
    AdmRecordMalfunction: 1021,
    AdmInterruption: 1025,
    AdmCategoryNotPlayAndRecord: 1029,
    AdmRecordAudioLowlevel: 1031,
    AdmPlayoutAudioLowlevel: 1032,
    AdmRecordIsOccupied: 1033,
    AdmNoDataReadyCallback: 1040,
    AdmInconsistentDevices: 1042,
    ApmHowling: 1051,
    AdmGlitchState: 1052,
    AdmImproperSettings: 1053
  }
};

// Safe import function
let agoraExports: any = mockAgoraExports;

if (!isExpoGo) {
  try {
    // Try to import the real Agora SDK
    agoraExports = require('react-native-agora');
    console.log('✅ Real Agora SDK imported successfully');
  } catch (error) {
    console.warn('⚠️ Agora SDK not available, using mock exports:', error.message);
    agoraExports = mockAgoraExports;
  }
} else {
  console.log('🎭 Using mock Agora exports for Expo Go development');
}

// Export all Agora types and classes
export default agoraExports.default;
export const RtcEngine = agoraExports.RtcEngine;
export const RtcEngineEvents = agoraExports.RtcEngineEvents;
export const ChannelProfile = agoraExports.ChannelProfile;
export const ClientRole = agoraExports.ClientRole;
export const AudioProfile = agoraExports.AudioProfile;
export const AudioScenario = agoraExports.AudioScenario;
export const VideoEncoderConfiguration = agoraExports.VideoEncoderConfiguration;
export const ConnectionStateType = agoraExports.ConnectionStateType;
export const ConnectionChangedReason = agoraExports.ConnectionChangedReason;
export const UserOfflineReason = agoraExports.UserOfflineReason;
export const ErrorCode = agoraExports.ErrorCode;
export const WarningCode = agoraExports.WarningCode;

// Export utility functions
export const isAgoraAvailable = () => !isExpoGo && agoraExports.default !== null;
export const isUsingMockAgora = () => isExpoGo || agoraExports.default === null;

// Log the current state
console.log(`🔧 Agora Import Wrapper: ${isUsingMockAgora() ? 'Using Mock' : 'Using Real SDK'}`);
