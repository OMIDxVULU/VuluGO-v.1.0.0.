/**
 * Custom hook for live stream refresh functionality
 * Provides enhanced refresh capabilities with automatic intervals and error handling
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveStreams } from '../context/LiveStreamContext';

interface UseStreamRefreshOptions {
  autoRefreshInterval?: number; // in milliseconds
  enableAutoRefresh?: boolean;
  onRefreshStart?: () => void;
  onRefreshComplete?: (success: boolean, error?: Error) => void;
  onRefreshError?: (error: Error) => void;
}

interface UseStreamRefreshReturn {
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  refreshCount: number;
  manualRefresh: () => Promise<void>;
  toggleAutoRefresh: () => void;
  isAutoRefreshEnabled: boolean;
  nextRefreshIn: number; // seconds until next auto refresh
}

export const useLiveStreamRefresh = (options: UseStreamRefreshOptions = {}): UseStreamRefreshReturn => {
  const {
    autoRefreshInterval = 5000, // 5 seconds default
    enableAutoRefresh = true,
    onRefreshStart,
    onRefreshComplete,
    onRefreshError
  } = options;

  const { refreshStreams, isRefreshing: contextIsRefreshing, lastRefreshTime: contextLastRefreshTime } = useLiveStreams();

  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(enableAutoRefresh);
  const [refreshCount, setRefreshCount] = useState(0);
  const [nextRefreshIn, setNextRefreshIn] = useState(Math.floor(autoRefreshInterval / 1000));

  const autoRefreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const contextIsRefreshingRef = useRef<boolean>(false);
  const lastAutoRefreshTime = useRef<number>(0);
  const hookId = useRef<string>(`refresh-hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Update ref when contextIsRefreshing changes to avoid stale closures
  useEffect(() => {
    contextIsRefreshingRef.current = contextIsRefreshing;
  }, [contextIsRefreshing]);

  // Log hook creation for debugging
  useEffect(() => {
    console.log(`🔄 [REFRESH_HOOK] Hook ${hookId.current} created`);
    return () => {
      console.log(`🔄 [REFRESH_HOOK] Hook ${hookId.current} destroyed`);
    };
  }, []);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    if (contextIsRefreshing) {
      console.log('🔄 [REFRESH_HOOK] Already refreshing, skipping manual refresh');
      return;
    }

    if (!refreshStreams) {
      console.error('❌ [REFRESH_HOOK] refreshStreams function not available');
      onRefreshError?.(new Error('Refresh function not available'));
      return;
    }

    try {
      console.log('🔄 [REFRESH_HOOK] Starting manual refresh...');
      onRefreshStart?.();

      await refreshStreams();

      setRefreshCount(prev => prev + 1);
      lastAutoRefreshTime.current = Date.now();

      console.log('✅ [REFRESH_HOOK] Manual refresh completed successfully');
      onRefreshComplete?.(true);

      // Reset countdown after manual refresh
      setNextRefreshIn(Math.floor(autoRefreshInterval / 1000));

    } catch (error) {
      const refreshError = error instanceof Error ? error : new Error('Unknown refresh error');
      console.error('❌ [REFRESH_HOOK] Manual refresh failed:', refreshError);

      onRefreshError?.(refreshError);
      onRefreshComplete?.(false, refreshError);
    }
  }, [contextIsRefreshing, refreshStreams, onRefreshStart, onRefreshComplete, onRefreshError, autoRefreshInterval]);

  // Toggle auto refresh
  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled(prev => {
      const newState = !prev;
      console.log(`🔄 [REFRESH_HOOK] Auto-refresh ${newState ? 'enabled' : 'disabled'}`);
      return newState;
    });
  }, []);

  // Auto refresh functionality
  useEffect(() => {
    // Clear any existing timers first
    if (autoRefreshTimer.current) {
      clearInterval(autoRefreshTimer.current);
      autoRefreshTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }

    if (!isAutoRefreshEnabled || !refreshStreams) {
      if (!refreshStreams) {
        console.warn('⚠️ [REFRESH_HOOK] Auto-refresh disabled - refreshStreams function not available');
      }
      return;
    }

    console.log(`🔄 [REFRESH_HOOK] Hook ${hookId.current} setting up auto-refresh every ${autoRefreshInterval}ms`);

    // Set up auto refresh timer
    autoRefreshTimer.current = setInterval(async () => {
      if (!contextIsRefreshingRef.current && refreshStreams) {
        try {
          console.log(`🔄 [REFRESH_HOOK] Hook ${hookId.current} auto-refresh triggered`);
          await refreshStreams();
          setRefreshCount(prev => prev + 1);
          lastAutoRefreshTime.current = Date.now();

          // Reset countdown
          setNextRefreshIn(Math.floor(autoRefreshInterval / 1000));

        } catch (error) {
          console.warn('⚠️ [REFRESH_HOOK] Auto-refresh failed (will retry):', error);
          onRefreshError?.(error instanceof Error ? error : new Error('Auto-refresh failed'));
        }
      } else if (!refreshStreams) {
        console.warn('⚠️ [REFRESH_HOOK] Auto-refresh skipped - refreshStreams function not available');
      }
    }, autoRefreshInterval);

    // Set up countdown timer (updates every second) - only when auto-refresh is enabled
    if (isAutoRefreshEnabled) {
      countdownTimer.current = setInterval(() => {
        const timeSinceLastRefresh = Date.now() - lastAutoRefreshTime.current;
        const timeUntilNext = Math.max(0, autoRefreshInterval - timeSinceLastRefresh);
        setNextRefreshIn(Math.ceil(timeUntilNext / 1000));
      }, 1000);
    }

    // Initialize countdown
    lastAutoRefreshTime.current = Date.now();
    setNextRefreshIn(Math.floor(autoRefreshInterval / 1000));

    return () => {
      if (autoRefreshTimer.current) {
        clearInterval(autoRefreshTimer.current);
        autoRefreshTimer.current = null;
      }
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
    };
  }, [isAutoRefreshEnabled, autoRefreshInterval, refreshStreams]); // Removed contextIsRefreshing and onRefreshError to prevent excessive re-renders

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimer.current) {
        clearInterval(autoRefreshTimer.current);
      }
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, []);

  return {
    isRefreshing: contextIsRefreshing,
    lastRefreshTime: contextLastRefreshTime,
    refreshCount,
    manualRefresh,
    toggleAutoRefresh,
    isAutoRefreshEnabled,
    nextRefreshIn
  };
};
