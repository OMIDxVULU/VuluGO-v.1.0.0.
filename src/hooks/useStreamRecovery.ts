/**
 * Stream Recovery Hook - Comprehensive error handling and recovery for streaming
 * Handles Firebase stream access failures, Agora RTC engine issues, and automatic recovery
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { agoraService } from '../services/agoraService';
import { firestoreService } from '../services/firestoreService';
import { FirebaseErrorHandler } from '../utils/firebaseErrorHandler';
import { getCircuitBreaker } from '../utils/circuitBreaker';

export interface StreamRecoveryState {
  isRecovering: boolean;
  recoveryAttempts: number;
  lastError: string | null;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed';
  recoveryStrategy: 'none' | 'reconnect' | 'reinitialize' | 'fallback';
}

export interface StreamRecoveryConfig {
  maxRecoveryAttempts: number;
  recoveryDelay: number;
  backoffMultiplier: number;
  enableAutoRecovery: boolean;
  fallbackToFirebaseOnly: boolean;
}

const DEFAULT_RECOVERY_CONFIG: StreamRecoveryConfig = {
  maxRecoveryAttempts: 3,
  recoveryDelay: 2000,
  backoffMultiplier: 1.5,
  enableAutoRecovery: true,
  fallbackToFirebaseOnly: true,
};

// Circuit breaker for streaming operations
const streamingCircuitBreaker = getCircuitBreaker('streaming', {
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  maxRetries: 2
});

export const useStreamRecovery = (config: Partial<StreamRecoveryConfig> = {}) => {
  const finalConfig = { ...DEFAULT_RECOVERY_CONFIG, ...config };
  
  const [recoveryState, setRecoveryState] = useState<StreamRecoveryState>({
    isRecovering: false,
    recoveryAttempts: 0,
    lastError: null,
    connectionState: 'disconnected',
    recoveryStrategy: 'none',
  });

  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRecoveryInProgressRef = useRef(false);

  // Clear recovery timeout on unmount
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  const updateRecoveryState = useCallback((updates: Partial<StreamRecoveryState>) => {
    setRecoveryState(prev => ({ ...prev, ...updates }));
  }, []);

  const logRecoveryEvent = useCallback((event: string, details?: any) => {
    console.log(`[USE_RECOVERY] ${event}`, details || '');
  }, []);

  // Validate stream access before attempting operations
  const validateStreamAccess = useCallback(async (streamId: string, userId?: string) => {
    try {
      logRecoveryEvent('Validating stream access', { streamId, userId });
      
      const validation = await firestoreService.validateStreamAccess(streamId, userId);
      
      if (!validation.exists) {
        throw new Error(`Stream ${streamId} not found`);
      }
      
      if (!validation.accessible) {
        throw new Error(`Stream access denied: ${validation.error}`);
      }
      
      logRecoveryEvent('Stream access validated successfully', validation);
      return validation;
      
    } catch (error: any) {
      logRecoveryEvent('Stream access validation failed', error.message);
      throw new Error(`Failed to validate stream access: ${error.message}`);
    }
  }, [logRecoveryEvent]);

  // Enhanced recovery strategy 1: Simple reconnection with state validation
  const attemptReconnection = useCallback(async (streamId: string, userId: string, isHost: boolean) => {
    logRecoveryEvent('Attempting reconnection', { streamId, userId, isHost });

    try {
      // First validate stream access with retry logic
      const validation = await validateStreamAccess(streamId, userId);
      if (!validation.exists || !validation.accessible) {
        throw new Error(`Stream validation failed: ${validation.error}`);
      }

      // Check current Agora state
      const currentState = agoraService.getStreamState();
      logRecoveryEvent('Current Agora state', currentState);

      // Leave current channel if joined to ensure clean state
      if (currentState.isJoined) {
        logRecoveryEvent('Leaving current channel before reconnection');
        try {
          await agoraService.leaveChannel();
          // Wait a bit for cleanup to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (leaveError: any) {
          logRecoveryEvent('Error leaving channel, continuing with reconnection', leaveError.message);
        }
      }

      // Ensure engine is initialized
      if (!currentState.isConnected) {
        logRecoveryEvent('Reinitializing Agora engine for reconnection');
        const initialized = await agoraService.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize Agora engine for reconnection');
        }
      }

      // Rejoin channel with timeout
      logRecoveryEvent('Rejoining channel');
      const joinPromise = agoraService.joinChannel(streamId, userId, isHost);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Channel join timeout')), 15000)
      );

      const joined = await Promise.race([joinPromise, timeoutPromise]);
      if (!joined) {
        throw new Error('Failed to rejoin channel');
      }

      logRecoveryEvent('Reconnection successful');
      return true;

    } catch (error: any) {
      logRecoveryEvent('Reconnection failed', error.message);
      throw error;
    }
  }, [validateStreamAccess, logRecoveryEvent]);

  // Recovery strategy 2: Full reinitialization
  const attemptReinitialization = useCallback(async (streamId: string, userId: string, isHost: boolean) => {
    logRecoveryEvent('Attempting reinitialization', { streamId, userId, isHost });
    
    try {
      // First validate stream access
      await validateStreamAccess(streamId, userId);
      
      // Destroy current engine
      await agoraService.destroy();
      
      // Reinitialize engine
      const initialized = await agoraService.initialize();
      if (!initialized) {
        throw new Error('Failed to reinitialize Agora engine');
      }
      
      // Join channel
      const joined = await agoraService.joinChannel(streamId, userId, isHost);
      if (!joined) {
        throw new Error('Failed to join channel after reinitialization');
      }
      
      logRecoveryEvent('Reinitialization successful');
      return true;
      
    } catch (error: any) {
      logRecoveryEvent('Reinitialization failed', error.message);
      throw error;
    }
  }, [validateStreamAccess, logRecoveryEvent]);

  // Recovery strategy 3: Fallback to Firebase-only mode
  const attemptFallback = useCallback(async (streamId: string, userId: string) => {
    logRecoveryEvent('Attempting fallback to Firebase-only mode', { streamId, userId });
    
    try {
      // Validate stream access
      await validateStreamAccess(streamId, userId);
      
      // Destroy Agora engine
      await agoraService.destroy();
      
      logRecoveryEvent('Fallback successful - Firebase-only mode active');
      return true;
      
    } catch (error: any) {
      logRecoveryEvent('Fallback failed', error.message);
      throw error;
    }
  }, [validateStreamAccess, logRecoveryEvent]);

  // Main recovery function
  const executeRecovery = useCallback(async (
    error: Error,
    streamId: string,
    userId: string,
    isHost: boolean = false
  ): Promise<boolean> => {
    if (isRecoveryInProgressRef.current) {
      logRecoveryEvent('Recovery already in progress, skipping');
      return false;
    }

    if (recoveryState.recoveryAttempts >= finalConfig.maxRecoveryAttempts) {
      logRecoveryEvent('Max recovery attempts reached', { attempts: recoveryState.recoveryAttempts });
      updateRecoveryState({
        isRecovering: false,
        connectionState: 'failed',
        recoveryStrategy: 'none',
        lastError: 'Max recovery attempts exceeded'
      });
      return false;
    }

    isRecoveryInProgressRef.current = true;
    
    updateRecoveryState({
      isRecovering: true,
      recoveryAttempts: recoveryState.recoveryAttempts + 1,
      lastError: error.message,
      connectionState: 'connecting'
    });

    try {
      logRecoveryEvent('Starting recovery', { 
        error: error.message, 
        attempt: recoveryState.recoveryAttempts + 1,
        maxAttempts: finalConfig.maxRecoveryAttempts
      });

      // Use circuit breaker for recovery operations
      const success = await streamingCircuitBreaker.execute(async () => {
        const attempt = recoveryState.recoveryAttempts + 1;
        
        // Strategy 1: Simple reconnection (first attempt)
        if (attempt === 1) {
          updateRecoveryState({ recoveryStrategy: 'reconnect' });
          return await attemptReconnection(streamId, userId, isHost);
        }
        
        // Strategy 2: Full reinitialization (second attempt)
        if (attempt === 2) {
          updateRecoveryState({ recoveryStrategy: 'reinitialize' });
          return await attemptReinitialization(streamId, userId, isHost);
        }
        
        // Strategy 3: Fallback to Firebase-only (final attempt)
        if (finalConfig.fallbackToFirebaseOnly) {
          updateRecoveryState({ recoveryStrategy: 'fallback' });
          return await attemptFallback(streamId, userId);
        }
        
        throw new Error('All recovery strategies exhausted');
      });

      if (success) {
        logRecoveryEvent('Recovery successful');
        updateRecoveryState({
          isRecovering: false,
          connectionState: 'connected',
          lastError: null,
          recoveryStrategy: 'none'
        });
        return true;
      }

    } catch (recoveryError: any) {
      logRecoveryEvent('Recovery failed', recoveryError.message);
      
      // Schedule next recovery attempt if auto-recovery is enabled
      if (finalConfig.enableAutoRecovery && recoveryState.recoveryAttempts < finalConfig.maxRecoveryAttempts - 1) {
        const delay = finalConfig.recoveryDelay * Math.pow(finalConfig.backoffMultiplier, recoveryState.recoveryAttempts);
        
        logRecoveryEvent('Scheduling next recovery attempt', { delay });
        
        recoveryTimeoutRef.current = setTimeout(() => {
          isRecoveryInProgressRef.current = false;
          executeRecovery(error, streamId, userId, isHost);
        }, delay);
      } else {
        updateRecoveryState({
          isRecovering: false,
          connectionState: 'failed',
          recoveryStrategy: 'none',
          lastError: recoveryError.message
        });
      }
    }

    isRecoveryInProgressRef.current = false;
    return false;
  }, [
    recoveryState.recoveryAttempts,
    finalConfig,
    updateRecoveryState,
    logRecoveryEvent,
    attemptReconnection,
    attemptReinitialization,
    attemptFallback
  ]);

  // Handle streaming errors with automatic recovery
  const handleStreamingError = useCallback(async (
    error: Error,
    streamId: string,
    userId: string,
    isHost: boolean = false
  ) => {
    logRecoveryEvent('Handling streaming error', { 
      error: error.message, 
      streamId, 
      userId, 
      isHost 
    });

    // Check if this is a recoverable error
    const isRecoverable = !error.message.includes('permission-denied') && 
                         !error.message.includes('not-found') &&
                         !error.message.includes('Max recovery attempts');

    if (!isRecoverable) {
      logRecoveryEvent('Error is not recoverable', error.message);
      updateRecoveryState({
        connectionState: 'failed',
        lastError: error.message,
        isRecovering: false
      });
      return false;
    }

    if (finalConfig.enableAutoRecovery) {
      return await executeRecovery(error, streamId, userId, isHost);
    }

    return false;
  }, [executeRecovery, finalConfig.enableAutoRecovery, logRecoveryEvent, updateRecoveryState]);

  // Reset recovery state
  const resetRecovery = useCallback(() => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
    
    isRecoveryInProgressRef.current = false;
    
    setRecoveryState({
      isRecovering: false,
      recoveryAttempts: 0,
      lastError: null,
      connectionState: 'disconnected',
      recoveryStrategy: 'none',
    });
    
    logRecoveryEvent('Recovery state reset');
  }, [logRecoveryEvent]);

  return {
    recoveryState,
    handleStreamingError,
    executeRecovery,
    resetRecovery,
    validateStreamAccess,
  };
};

export default useStreamRecovery;
