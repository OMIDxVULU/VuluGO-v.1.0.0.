/**
 * Agora Live Streaming Configuration
 * Centralized configuration for Agora audio/video streaming
 */

import { throttledAgoraLog } from '../utils/loggingThrottle';

export interface AgoraConfig {
  // Agora credentials
  appId: string;
  appCertificate: string;
  customerId: string;
  customerSecret: string;
  
  // Streaming settings
  enableVideoStreaming: boolean;
  defaultStreamProfile: 'AUDIO_ONLY' | 'VIDEO_LOW' | 'VIDEO_HIGH';
  maxParticipantsPerStream: number;
  
  // Audio settings
  audioProfile: 'DEFAULT' | 'SPEECH' | 'MUSIC_STANDARD' | 'MUSIC_HIGH_QUALITY';
  audioScenario: 'DEFAULT' | 'CHATROOM' | 'EDUCATION' | 'GAME_STREAMING';
  
  // Video settings (when enabled)
  videoProfile: 'LOW' | 'STANDARD' | 'HIGH';
  videoFrameRate: 15 | 24 | 30;
  
  // Development settings
  enableLogging: boolean;
  logLevel: 'NONE' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
}

/**
 * Default Agora configuration optimized for VuluGO
 */
export const defaultAgoraConfig: AgoraConfig = {
  // Agora credentials from environment (with fallback for debugging)
  appId: process.env.EXPO_PUBLIC_AGORA_APP_ID || '5943c83532bf462a95e260293f6c9e11',
  appCertificate: process.env.EXPO_PUBLIC_AGORA_APP_CERTIFICATE || '14774f02c9fa45f2b2b35ef32e63f9c9',
  customerId: process.env.EXPO_PUBLIC_AGORA_CUSTOMER_ID || '5943c83532bf462a95e260293f6c9e11',
  customerSecret: process.env.EXPO_PUBLIC_AGORA_CUSTOMER_SECRET || '14774f02c9fa45f2b2b35ef32e63f9c9',
  
  // Streaming settings
  enableVideoStreaming: process.env.EXPO_PUBLIC_ENABLE_VIDEO_STREAMING === 'true',
  defaultStreamProfile: (process.env.EXPO_PUBLIC_DEFAULT_STREAM_PROFILE as any) || 'AUDIO_ONLY',
  maxParticipantsPerStream: parseInt(process.env.EXPO_PUBLIC_MAX_PARTICIPANTS_PER_STREAM || '50'),
  
  // Audio settings optimized for social streaming
  audioProfile: 'MUSIC_STANDARD', // Good quality for voice + background music
  audioScenario: 'CHATROOM', // Optimized for interactive audio rooms
  
  // Video settings (when enabled)
  videoProfile: 'STANDARD', // 640x480, good balance of quality/bandwidth
  videoFrameRate: 24, // Smooth video without excessive bandwidth
  
  // Development settings
  enableLogging: __DEV__,
  logLevel: __DEV__ ? 'INFO' : 'ERROR',
};

// Throttle debug logging to prevent spam
let lastDebugLog = 0;
const DEBUG_LOG_THROTTLE = 60000; // 1 minute

/**
 * Get Agora configuration with validation
 */
export const getAgoraConfig = (): AgoraConfig => {
  const config = { ...defaultAgoraConfig };

  // Debug environment variables (throttled)
  const now = Date.now();
  if (now - lastDebugLog > DEBUG_LOG_THROTTLE) {
    throttledAgoraLog('🔍 Agora Environment Variables Debug:');
    throttledAgoraLog(`EXPO_PUBLIC_AGORA_APP_ID: ${process.env.EXPO_PUBLIC_AGORA_APP_ID ? 'SET' : 'NOT SET'}`);
    throttledAgoraLog(`EXPO_PUBLIC_AGORA_APP_CERTIFICATE: ${process.env.EXPO_PUBLIC_AGORA_APP_CERTIFICATE ? 'SET' : 'NOT SET'}`);
    lastDebugLog = now;
  }

  // Validate required credentials
  if (!config.appId) {
    console.warn('⚠️ Agora App ID not configured. Set EXPO_PUBLIC_AGORA_APP_ID environment variable.');
    console.warn('Current value:', process.env.EXPO_PUBLIC_AGORA_APP_ID);
  }

  if (!config.appCertificate) {
    console.warn('⚠️ Agora App Certificate not configured. Set EXPO_PUBLIC_AGORA_APP_CERTIFICATE environment variable.');
    console.warn('Current value:', process.env.EXPO_PUBLIC_AGORA_APP_CERTIFICATE);
  }

  return config;
};

/**
 * Check if Agora is properly configured
 */
export const isAgoraConfigured = (): boolean => {
  const config = getAgoraConfig();
  return !!(config.appId && config.appCertificate);
};

/**
 * Get Agora service status for diagnostics
 */
export const getAgoraServiceStatus = () => {
  const config = getAgoraConfig();
  
  return {
    configured: isAgoraConfigured(),
    appId: config.appId ? `${config.appId.substring(0, 8)}...` : 'Not set',
    videoEnabled: config.enableVideoStreaming,
    maxParticipants: config.maxParticipantsPerStream,
    audioProfile: config.audioProfile,
    streamProfile: config.defaultStreamProfile,
  };
};

/**
 * Agora channel profiles for different use cases
 */
export const AGORA_CHANNEL_PROFILES = {
  COMMUNICATION: 0, // 1-on-1 or small group calls
  LIVE_BROADCASTING: 1, // Live streaming with hosts and audience
  GAME: 2, // Gaming scenarios with low latency
} as const;

/**
 * Agora client roles
 */
export const AGORA_CLIENT_ROLES = {
  BROADCASTER: 1, // Can send and receive audio/video (hosts)
  AUDIENCE: 2, // Can only receive audio/video (viewers)
} as const;

/**
 * Audio profiles for different streaming scenarios
 */
export const AGORA_AUDIO_PROFILES = {
  DEFAULT: 0,
  SPEECH_STANDARD: 1, // 32 kbps, mono, speech
  MUSIC_STANDARD: 2, // 64 kbps, mono, music
  MUSIC_STANDARD_STEREO: 3, // 80 kbps, stereo, music
  MUSIC_HIGH_QUALITY: 4, // 128 kbps, mono, high quality music
  MUSIC_HIGH_QUALITY_STEREO: 5, // 192 kbps, stereo, high quality music
} as const;

/**
 * Audio scenarios for optimization
 */
export const AGORA_AUDIO_SCENARIOS = {
  DEFAULT: 0,
  CHATROOM_ENTERTAINMENT: 1, // Entertainment chatroom
  EDUCATION: 2, // Education scenario
  GAME_STREAMING: 3, // Gaming with background music
  SHOWROOM: 4, // Showroom scenario
  CHATROOM_GAMING: 5, // Gaming chatroom
} as const;
