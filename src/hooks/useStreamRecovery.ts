/**
 * useStreamRecovery Hook
 * React hook for handling stream recovery and error management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { streamRecoveryService, RecoveryResult, RecoveryOptions } from '../services/streamRecoveryService';

export interface UseStreamRecoveryOptions extends Partial<RecoveryOptions> {
  onRecoveryStart?: (error: any) => void;
  onRecoverySuccess?: (result: RecoveryResult) => void;
  onRecoveryFailure?: (result: RecoveryResult) => void;
  onRecoveryProgress?: (attempt: number, maxAttempts: number) => void;
  autoRecover?: boolean;
}

export interface StreamRecoveryState {
  isRecovering: boolean;
  recoveryAttempt: number;
  maxAttempts: number;
  lastError: any;
  lastRecoveryResult: RecoveryResult | null;
  recoveryStats: any;
}

export const useStreamRecovery = (
  streamId: string,
  userId: string,
  options: UseStreamRecoveryOptions = {}
) => {
  const {
    onRecoveryStart,
    onRecoverySuccess,
    onRecoveryFailure,
    onRecoveryProgress,
    autoRecover = true,
    ...recoveryOptions
  } = options;

  const [recoveryState, setRecoveryState] = useState<StreamRecoveryState>({
    isRecovering: false,
    recoveryAttempt: 0,
    maxAttempts: recoveryOptions.maxRetries || 5,
    lastError: null,
    lastRecoveryResult: null,
    recoveryStats: streamRecoveryService.getRecoveryStats(),
  });

  const recoveryInProgressRef = useRef(false);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Attempt recovery from an error
   */
  const attemptRecovery = useCallback(async (error: any): Promise<RecoveryResult> => {
    if (recoveryInProgressRef.current) {
      console.warn('⚠️ [USE_RECOVERY] Recovery already in progress, skipping');
      return {
        success: false,
        strategy: 'RECONNECT' as any,
        attempts: 0,
        totalDuration: 0,
        error: 'Recovery already in progress',
      };
    }

    recoveryInProgressRef.current = true;

    try {
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: true,
        recoveryAttempt: 0,
        lastError: error,
        lastRecoveryResult: null,
      }));

      onRecoveryStart?.(error);

      // Create a progress callback
      const progressCallback = (attempt: number, maxAttempts: number) => {
        setRecoveryState(prev => ({
          ...prev,
          recoveryAttempt: attempt,
          maxAttempts,
        }));
        onRecoveryProgress?.(attempt, maxAttempts);
      };

      // Simulate progress updates (since the recovery service doesn't provide them directly)
      const progressInterval = setInterval(() => {
        setRecoveryState(prev => {
          if (prev.recoveryAttempt < prev.maxAttempts) {
            const newAttempt = prev.recoveryAttempt + 1;
            onRecoveryProgress?.(newAttempt, prev.maxAttempts);
            return { ...prev, recoveryAttempt: newAttempt };
          }
          return prev;
        });
      }, 2000);

      const result = await streamRecoveryService.recoverFromError(
        streamId,
        userId,
        error,
        recoveryOptions
      );

      clearInterval(progressInterval);

      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
        lastRecoveryResult: result,
        recoveryStats: streamRecoveryService.getRecoveryStats(),
      }));

      if (result.success) {
        console.log('✅ [USE_RECOVERY] Recovery successful');
        onRecoverySuccess?.(result);
      } else {
        console.error('❌ [USE_RECOVERY] Recovery failed');
        onRecoveryFailure?.(result);
      }

      return result;

    } finally {
      recoveryInProgressRef.current = false;
    }
  }, [streamId, userId, recoveryOptions, onRecoveryStart, onRecoverySuccess, onRecoveryFailure, onRecoveryProgress]);

  /**
   * Handle error with optional auto-recovery
   */
  const handleError = useCallback(async (error: any, forceRecover = false): Promise<void> => {
    console.error('❌ [USE_RECOVERY] Handling error:', error);

    if (autoRecover || forceRecover) {
      await attemptRecovery(error);
    } else {
      setRecoveryState(prev => ({
        ...prev,
        lastError: error,
      }));
    }
  }, [autoRecover, attemptRecovery]);

  /**
   * Manual recovery trigger
   */
  const manualRecover = useCallback(async (): Promise<RecoveryResult> => {
    if (!recoveryState.lastError) {
      console.warn('⚠️ [USE_RECOVERY] No error to recover from');
      return {
        success: false,
        strategy: 'RECONNECT' as any,
        attempts: 0,
        totalDuration: 0,
        error: 'No error to recover from',
      };
    }

    return attemptRecovery(recoveryState.lastError);
  }, [recoveryState.lastError, attemptRecovery]);

  /**
   * Cancel ongoing recovery
   */
  const cancelRecovery = useCallback(() => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
    }

    setRecoveryState(prev => ({
      ...prev,
      isRecovering: false,
      recoveryAttempt: 0,
    }));

    recoveryInProgressRef.current = false;
    console.log('🛑 [USE_RECOVERY] Recovery cancelled');
  }, []);

  /**
   * Reset recovery state
   */
  const resetRecovery = useCallback(() => {
    streamRecoveryService.reset();
    setRecoveryState(prev => ({
      ...prev,
      lastError: null,
      lastRecoveryResult: null,
      recoveryStats: streamRecoveryService.getRecoveryStats(),
    }));
    console.log('🔄 [USE_RECOVERY] Recovery state reset');
  }, []);

  /**
   * Get current recovery statistics
   */
  const getRecoveryStats = useCallback(() => {
    return streamRecoveryService.getRecoveryStats();
  }, []);

  /**
   * Check if recovery is recommended for an error
   */
  const shouldRecover = useCallback((error: any): boolean => {
    // Add logic to determine if recovery should be attempted
    // Based on error type, frequency, etc.
    
    const stats = streamRecoveryService.getRecoveryStats();
    
    // Don't recover if circuit breaker is open
    if (stats.circuitBreakerOpen) {
      return false;
    }

    // Don't recover if too many recent failures
    if (stats.consecutiveFailures >= 3) {
      return false;
    }

    // Don't recover for certain error types
    const errorMessage = error?.message?.toLowerCase() || '';
    if (errorMessage.includes('permission') || errorMessage.includes('banned')) {
      return false;
    }

    return true;
  }, []);

  // Update recovery stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRecoveryState(prev => ({
        ...prev,
        recoveryStats: streamRecoveryService.getRecoveryStats(),
      }));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
      cancelRecovery();
    };
  }, [cancelRecovery]);

  return {
    // State
    ...recoveryState,
    
    // Actions
    handleError,
    attemptRecovery,
    manualRecover,
    cancelRecovery,
    resetRecovery,
    
    // Utils
    getRecoveryStats,
    shouldRecover,
    
    // Status
    canRecover: !recoveryState.isRecovering && !recoveryState.recoveryStats.circuitBreakerOpen,
    hasError: !!recoveryState.lastError,
    isCircuitBreakerOpen: recoveryState.recoveryStats.circuitBreakerOpen,
  };
};

/**
 * Hook for automatic error recovery with exponential backoff
 */
export const useAutoRecovery = (
  streamId: string,
  userId: string,
  onError?: (error: any) => void
) => {
  const recovery = useStreamRecovery(streamId, userId, {
    autoRecover: true,
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 60000,
    
    onRecoveryStart: (error) => {
      console.log('🔄 [AUTO_RECOVERY] Starting automatic recovery');
      onError?.(error);
    },
    
    onRecoverySuccess: (result) => {
      console.log('✅ [AUTO_RECOVERY] Automatic recovery successful');
    },
    
    onRecoveryFailure: (result) => {
      console.error('❌ [AUTO_RECOVERY] Automatic recovery failed');
      onError?.(new Error(result.error));
    },
  });

  return recovery;
};
