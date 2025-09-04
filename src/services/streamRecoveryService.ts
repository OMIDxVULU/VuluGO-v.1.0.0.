/**
 * Stream Recovery Service for VuluGO
 * Handles automatic recovery from stream errors and network issues
 */

import { agoraService } from './agoraService';
import { agoraTokenService } from './agoraTokenService';
import { FirebaseErrorHandler, ErrorCategory } from '../utils/firebaseErrorHandler';

export interface RecoveryAttempt {
  timestamp: number;
  error: any;
  strategy: RecoveryStrategy;
  success: boolean;
  duration: number;
}

export interface RecoveryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export enum RecoveryStrategy {
  TOKEN_RENEWAL = 'token_renewal',
  RECONNECT = 'reconnect',
  REINITIALIZE = 'reinitialize',
  FALLBACK_MODE = 'fallback_mode',
  CIRCUIT_BREAKER = 'circuit_breaker',
}

export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  attempts: number;
  totalDuration: number;
  error?: string;
}

class StreamRecoveryService {
  private static instance: StreamRecoveryService;
  private recoveryHistory: RecoveryAttempt[] = [];
  private circuitBreakerOpen = false;
  private circuitBreakerOpenTime = 0;
  private consecutiveFailures = 0;

  private defaultOptions: RecoveryOptions = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 60000, // 1 minute
  };

  private constructor() {}

  static getInstance(): StreamRecoveryService {
    if (!StreamRecoveryService.instance) {
      StreamRecoveryService.instance = new StreamRecoveryService();
    }
    return StreamRecoveryService.instance;
  }

  /**
   * Attempt to recover from a stream error
   */
  async recoverFromError(
    streamId: string,
    userId: string,
    error: any,
    options: Partial<RecoveryOptions> = {}
  ): Promise<RecoveryResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    console.log(`🔄 [RECOVERY] Starting recovery for stream ${streamId}`, error);

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(opts)) {
      return {
        success: false,
        strategy: RecoveryStrategy.CIRCUIT_BREAKER,
        attempts: 0,
        totalDuration: 0,
        error: 'Circuit breaker is open - too many recent failures',
      };
    }

    const startTime = Date.now();
    let attempts = 0;
    let lastError = error;

    // Determine recovery strategy based on error type
    const strategies = this.determineRecoveryStrategies(error);

    for (const strategy of strategies) {
      if (attempts >= opts.maxRetries) {
        break;
      }

      attempts++;
      const attemptStartTime = Date.now();

      try {
        console.log(`🔄 [RECOVERY] Attempt ${attempts}/${opts.maxRetries} using strategy: ${strategy}`);

        const success = await this.executeRecoveryStrategy(
          strategy,
          streamId,
          userId,
          error,
          attempts,
          opts
        );

        const duration = Date.now() - attemptStartTime;

        // Record attempt
        this.recordRecoveryAttempt({
          timestamp: attemptStartTime,
          error,
          strategy,
          success,
          duration,
        });

        if (success) {
          console.log(`✅ [RECOVERY] Successfully recovered using strategy: ${strategy}`);
          this.consecutiveFailures = 0;
          return {
            success: true,
            strategy,
            attempts,
            totalDuration: Date.now() - startTime,
          };
        }

      } catch (recoveryError) {
        console.error(`❌ [RECOVERY] Strategy ${strategy} failed:`, recoveryError);
        lastError = recoveryError;

        const duration = Date.now() - attemptStartTime;
        this.recordRecoveryAttempt({
          timestamp: attemptStartTime,
          error: recoveryError,
          strategy,
          success: false,
          duration,
        });
      }

      // Wait before next attempt (exponential backoff)
      if (attempts < opts.maxRetries) {
        const delay = Math.min(
          opts.baseDelay * Math.pow(opts.backoffMultiplier, attempts - 1),
          opts.maxDelay
        );
        console.log(`⏳ [RECOVERY] Waiting ${delay}ms before next attempt`);
        await this.delay(delay);
      }
    }

    // All recovery attempts failed
    this.consecutiveFailures++;
    
    if (this.consecutiveFailures >= opts.circuitBreakerThreshold) {
      this.openCircuitBreaker();
    }

    return {
      success: false,
      strategy: strategies[strategies.length - 1] || RecoveryStrategy.RECONNECT,
      attempts,
      totalDuration: Date.now() - startTime,
      error: lastError?.message || 'All recovery attempts failed',
    };
  }

  /**
   * Determine recovery strategies based on error type
   */
  private determineRecoveryStrategies(error: any): RecoveryStrategy[] {
    const errorInfo = FirebaseErrorHandler.handleError(error);
    
    switch (errorInfo.category) {
      case ErrorCategory.NETWORK:
        return [
          RecoveryStrategy.RECONNECT,
          RecoveryStrategy.TOKEN_RENEWAL,
          RecoveryStrategy.REINITIALIZE,
        ];

      case ErrorCategory.AUTHENTICATION:
        return [
          RecoveryStrategy.TOKEN_RENEWAL,
          RecoveryStrategy.RECONNECT,
        ];

      case ErrorCategory.PERMISSION:
        return [
          RecoveryStrategy.TOKEN_RENEWAL,
          RecoveryStrategy.FALLBACK_MODE,
        ];

      case ErrorCategory.RATE_LIMIT:
        return [
          RecoveryStrategy.FALLBACK_MODE,
        ];

      default:
        return [
          RecoveryStrategy.RECONNECT,
          RecoveryStrategy.REINITIALIZE,
          RecoveryStrategy.FALLBACK_MODE,
        ];
    }
  }

  /**
   * Execute a specific recovery strategy
   */
  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    streamId: string,
    userId: string,
    error: any,
    attempt: number,
    options: RecoveryOptions
  ): Promise<boolean> {
    switch (strategy) {
      case RecoveryStrategy.TOKEN_RENEWAL:
        return this.attemptTokenRenewal(streamId, userId);

      case RecoveryStrategy.RECONNECT:
        return this.attemptReconnect(streamId, userId);

      case RecoveryStrategy.REINITIALIZE:
        return this.attemptReinitialize(streamId, userId);

      case RecoveryStrategy.FALLBACK_MODE:
        return this.attemptFallbackMode(streamId, userId);

      default:
        throw new Error(`Unknown recovery strategy: ${strategy}`);
    }
  }

  /**
   * Attempt token renewal
   */
  private async attemptTokenRenewal(streamId: string, userId: string): Promise<boolean> {
    try {
      console.log('🔑 [RECOVERY] Attempting token renewal');
      
      // Clear token cache to force new token generation
      agoraTokenService.clearCache();
      
      // Attempt to renew token
      const renewed = await agoraService.renewToken();
      
      return renewed;
    } catch (error) {
      console.error('❌ [RECOVERY] Token renewal failed:', error);
      return false;
    }
  }

  /**
   * Attempt to reconnect to stream
   */
  private async attemptReconnect(streamId: string, userId: string): Promise<boolean> {
    try {
      console.log('🔄 [RECOVERY] Attempting reconnect');
      
      // Leave current channel if still connected
      await agoraService.leaveChannel();
      
      // Wait a moment
      await this.delay(1000);
      
      // Rejoin channel
      const joined = await agoraService.joinChannel(streamId, userId, false);
      
      return joined;
    } catch (error) {
      console.error('❌ [RECOVERY] Reconnect failed:', error);
      return false;
    }
  }

  /**
   * Attempt to reinitialize Agora service
   */
  private async attemptReinitialize(streamId: string, userId: string): Promise<boolean> {
    try {
      console.log('🔄 [RECOVERY] Attempting reinitialization');
      
      // Destroy current service
      await agoraService.destroy();
      
      // Wait a moment
      await this.delay(2000);
      
      // Reinitialize and rejoin
      const initialized = await agoraService.initialize();
      if (!initialized) {
        return false;
      }
      
      const joined = await agoraService.joinChannel(streamId, userId, false);
      
      return joined;
    } catch (error) {
      console.error('❌ [RECOVERY] Reinitialization failed:', error);
      return false;
    }
  }

  /**
   * Attempt fallback mode (audio-only, reduced quality)
   */
  private async attemptFallbackMode(streamId: string, userId: string): Promise<boolean> {
    try {
      console.log('🔄 [RECOVERY] Attempting fallback mode');
      
      // Disable video to reduce bandwidth
      await agoraService.enableLocalVideo(false);
      
      // Attempt to reconnect with reduced requirements
      const joined = await agoraService.joinChannel(streamId, userId, false);
      
      return joined;
    } catch (error) {
      console.error('❌ [RECOVERY] Fallback mode failed:', error);
      return false;
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(options: RecoveryOptions): boolean {
    if (!options.enableCircuitBreaker || !this.circuitBreakerOpen) {
      return false;
    }

    const now = Date.now();
    if (now - this.circuitBreakerOpenTime > options.circuitBreakerTimeout) {
      console.log('🔄 [RECOVERY] Circuit breaker timeout expired, closing');
      this.circuitBreakerOpen = false;
      this.consecutiveFailures = 0;
      return false;
    }

    return true;
  }

  /**
   * Open circuit breaker
   */
  private openCircuitBreaker(): void {
    console.warn('⚠️ [RECOVERY] Opening circuit breaker due to consecutive failures');
    this.circuitBreakerOpen = true;
    this.circuitBreakerOpenTime = Date.now();
  }

  /**
   * Record recovery attempt
   */
  private recordRecoveryAttempt(attempt: RecoveryAttempt): void {
    this.recoveryHistory.push(attempt);
    
    // Keep only last 50 attempts
    if (this.recoveryHistory.length > 50) {
      this.recoveryHistory = this.recoveryHistory.slice(-50);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    totalAttempts: number;
    successRate: number;
    averageDuration: number;
    circuitBreakerOpen: boolean;
    consecutiveFailures: number;
    recentAttempts: RecoveryAttempt[];
  } {
    const recentAttempts = this.recoveryHistory.slice(-10);
    const successfulAttempts = this.recoveryHistory.filter(a => a.success).length;
    const totalDuration = this.recoveryHistory.reduce((sum, a) => sum + a.duration, 0);

    return {
      totalAttempts: this.recoveryHistory.length,
      successRate: this.recoveryHistory.length > 0 ? successfulAttempts / this.recoveryHistory.length : 0,
      averageDuration: this.recoveryHistory.length > 0 ? totalDuration / this.recoveryHistory.length : 0,
      circuitBreakerOpen: this.circuitBreakerOpen,
      consecutiveFailures: this.consecutiveFailures,
      recentAttempts,
    };
  }

  /**
   * Reset recovery state
   */
  reset(): void {
    this.recoveryHistory = [];
    this.circuitBreakerOpen = false;
    this.circuitBreakerOpenTime = 0;
    this.consecutiveFailures = 0;
    console.log('🔄 [RECOVERY] Recovery state reset');
  }
}

export const streamRecoveryService = StreamRecoveryService.getInstance();
