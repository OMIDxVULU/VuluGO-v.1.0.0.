/**
 * Agora Token Service for VuluGO
 * Handles secure token generation and management via Firebase Cloud Functions
 */

import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { AgoraTokenResponse } from './agoraService';

export interface TokenRequest {
  channelName: string;
  uid: number;
  role: 'host' | 'audience';
  expirationTimeInSeconds?: number;
}

export interface StreamAccessValidation {
  canJoin: boolean;
  streamData?: {
    id: string;
    title: string;
    hostId: string;
    hostName: string;
    isActive: boolean;
    participantCount: number;
    maxParticipants: number;
  };
  error?: string;
}

class AgoraTokenService {
  private static instance: AgoraTokenService;
  private tokenCache = new Map<string, { token: AgoraTokenResponse; expiresAt: number }>();
  private renewalTimers = new Map<string, NodeJS.Timeout>();
  private readonly CACHE_BUFFER_TIME = 5 * 60 * 1000; // 5 minutes buffer before expiry

  private constructor() {}

  static getInstance(): AgoraTokenService {
    if (!AgoraTokenService.instance) {
      AgoraTokenService.instance = new AgoraTokenService();
    }
    return AgoraTokenService.instance;
  }

  /**
   * Generate Agora token with caching
   */
  async generateToken(request: TokenRequest): Promise<AgoraTokenResponse> {
    try {
      const cacheKey = `${request.channelName}_${request.uid}_${request.role}`;
      
      // Check cache first
      const cached = this.tokenCache.get(cacheKey);
      if (cached && this.isTokenValid(cached.expiresAt)) {
        console.log('🔑 Using cached Agora token');
        return cached.token;
      }

      console.log(`🔑 Generating new Agora token for channel: ${request.channelName}`);

      if (!functions) {
        throw new Error('Firebase Functions not initialized');
      }

      const generateAgoraToken = httpsCallable(functions, 'generateAgoraToken');
      const result = await generateAgoraToken({
        channelName: request.channelName,
        uid: request.uid,
        role: request.role,
        expirationTimeInSeconds: request.expirationTimeInSeconds || 3600
      });

      const tokenData = result.data as AgoraTokenResponse;
      
      // Cache the token
      this.tokenCache.set(cacheKey, {
        token: tokenData,
        expiresAt: tokenData.expiresAt
      });

      console.log('✅ Agora token generated and cached successfully');
      return tokenData;

    } catch (error: any) {
      console.error('❌ Failed to generate Agora token:', error);
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Validate stream access before joining
   */
  async validateStreamAccess(streamId: string): Promise<StreamAccessValidation> {
    try {
      console.log(`🔍 Validating access to stream: ${streamId}`);

      if (!functions) {
        throw new Error('Firebase Functions not initialized');
      }

      const validateStreamAccess = httpsCallable(functions, 'validateStreamAccess');
      const result = await validateStreamAccess({ streamId });

      const validation = result.data as StreamAccessValidation;
      
      if (validation.canJoin) {
        console.log('✅ Stream access validated successfully');
      } else {
        console.warn('⚠️ Stream access denied:', validation.error);
      }

      return validation;

    } catch (error: any) {
      console.error('❌ Failed to validate stream access:', error);
      return {
        canJoin: false,
        error: `Access validation failed: ${error.message}`
      };
    }
  }

  /**
   * Renew token if it's about to expire
   */
  async renewTokenIfNeeded(
    channelName: string,
    uid: number,
    role: 'host' | 'audience',
    currentExpiresAt: number
  ): Promise<AgoraTokenResponse | null> {
    try {
      if (this.isTokenValid(currentExpiresAt)) {
        return null; // Token is still valid
      }

      console.log('🔄 Token expiring soon, renewing...');
      
      return await this.generateToken({
        channelName,
        uid,
        role,
        expirationTimeInSeconds: 3600
      });

    } catch (error: any) {
      console.error('❌ Failed to renew token:', error);
      throw error;
    }
  }

  /**
   * Check if token is valid (not expired with buffer time)
   */
  private isTokenValid(expiresAt: number): boolean {
    const now = Date.now();
    return expiresAt > (now + this.CACHE_BUFFER_TIME);
  }

  /**
   * Clear token cache
   */
  clearCache(): void {
    this.tokenCache.clear();
    console.log('🗑️ Token cache cleared');
  }

  /**
   * Get cached token info for debugging
   */
  getCacheInfo(): Array<{ key: string; expiresAt: number; isValid: boolean }> {
    const info: Array<{ key: string; expiresAt: number; isValid: boolean }> = [];
    
    this.tokenCache.forEach((value, key) => {
      info.push({
        key,
        expiresAt: value.expiresAt,
        isValid: this.isTokenValid(value.expiresAt)
      });
    });

    return info;
  }

  /**
   * Renew an existing token
   */
  async renewToken(request: TokenRequest): Promise<AgoraTokenResponse> {
    try {
      const renewAgoraToken = httpsCallable(functions, 'renewAgoraToken');
      const result = await renewAgoraToken({
        channelName: request.channelName,
        uid: request.uid,
        role: request.role
      });

      const tokenData = result.data as AgoraTokenResponse;
      const cacheKey = `${request.channelName}_${request.uid}_${request.role}`;

      // Update cache
      this.tokenCache.set(cacheKey, {
        token: tokenData,
        expiresAt: tokenData.expiresAt
      });

      // Reschedule renewal
      this.scheduleTokenRenewal(cacheKey, tokenData);

      console.log(`✅ Token renewed for ${cacheKey}`);
      return tokenData;

    } catch (error: any) {
      console.error('❌ Failed to renew Agora token:', error);
      throw new Error(`Token renewal failed: ${error.message}`);
    }
  }

  /**
   * Schedule automatic token renewal
   */
  private scheduleTokenRenewal(cacheKey: string, tokenData: AgoraTokenResponse): void {
    // Clear existing renewal timer
    const existingTimer = this.renewalTimers.get(cacheKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Calculate renewal time (5 minutes before expiry)
    const renewalTime = tokenData.expiresAt - Date.now() - this.CACHE_BUFFER_TIME;

    if (renewalTime > 0) {
      const timer = setTimeout(async () => {
        try {
          console.log(`🔄 Auto-renewing token for ${cacheKey}`);

          const [channelName, uid, role] = cacheKey.split('_');
          await this.renewToken({
            channelName,
            uid: parseInt(uid),
            role: role as 'host' | 'audience'
          });

        } catch (error) {
          console.error(`Failed to auto-renew token for ${cacheKey}:`, error);
        }
      }, renewalTime);

      this.renewalTimers.set(cacheKey, timer);
      console.log(`⏰ Scheduled token renewal for ${cacheKey} in ${Math.floor(renewalTime / 1000)}s`);
    }
  }

  /**
   * Cleanup expired tokens from cache
   */
  cleanupExpiredTokens(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.tokenCache.forEach((value, key) => {
      if (value.expiresAt <= now) {
        this.tokenCache.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired tokens from cache`);
    }
  }

  /**
   * Start periodic cleanup of expired tokens
   */
  startPeriodicCleanup(): void {
    // Clean up expired tokens every 10 minutes
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 10 * 60 * 1000);

    console.log('🔄 Started periodic token cache cleanup');
  }
}

export const agoraTokenService = AgoraTokenService.getInstance();
