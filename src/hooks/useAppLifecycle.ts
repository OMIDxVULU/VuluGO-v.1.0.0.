/**
 * useAppLifecycle Hook
 * React hook for managing app lifecycle events in live streaming contexts
 */

import { useEffect, useRef, useState } from 'react';
import { AppStateStatus } from 'react-native';
import { appLifecycleService, AppLifecycleCallbacks } from '../services/appLifecycleService';

export interface UseAppLifecycleOptions {
  onAppStateChange?: (nextAppState: AppStateStatus) => void;
  onStreamInterrupted?: () => void;
  onStreamResumed?: () => void;
  onBackgroundTransition?: () => void;
  onForegroundTransition?: () => void;
  enableAutoReconnect?: boolean;
  reconnectDelay?: number;
}

export interface AppLifecycleState {
  appState: AppStateStatus;
  isInBackground: boolean;
  isActive: boolean;
  streamWasInterrupted: boolean;
}

export const useAppLifecycle = (options: UseAppLifecycleOptions = {}) => {
  const {
    onAppStateChange,
    onStreamInterrupted,
    onStreamResumed,
    onBackgroundTransition,
    onForegroundTransition,
    enableAutoReconnect = true,
    reconnectDelay = 2000,
  } = options;

  const [lifecycleState, setLifecycleState] = useState<AppLifecycleState>({
    appState: appLifecycleService.getCurrentAppState(),
    isInBackground: appLifecycleService.isInBackground(),
    isActive: appLifecycleService.isActive(),
    streamWasInterrupted: false,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const callbacksRef = useRef<AppLifecycleCallbacks>({});

  // Update callbacks ref when options change
  useEffect(() => {
    callbacksRef.current = {
      onAppStateChange: (nextAppState: AppStateStatus) => {
        setLifecycleState(prev => ({
          ...prev,
          appState: nextAppState,
          isInBackground: nextAppState === 'background',
          isActive: nextAppState === 'active',
        }));
        onAppStateChange?.(nextAppState);
      },

      onStreamInterrupted: () => {
        console.log('🔄 [USE_LIFECYCLE] Stream interrupted');
        setLifecycleState(prev => ({
          ...prev,
          streamWasInterrupted: true,
        }));
        onStreamInterrupted?.();
      },

      onStreamResumed: () => {
        console.log('✅ [USE_LIFECYCLE] Stream resumed');
        setLifecycleState(prev => ({
          ...prev,
          streamWasInterrupted: false,
        }));
        onStreamResumed?.();
      },

      onBackgroundTransition: () => {
        console.log('📱 [USE_LIFECYCLE] Background transition');
        onBackgroundTransition?.();
      },

      onForegroundTransition: () => {
        console.log('📱 [USE_LIFECYCLE] Foreground transition');
        
        // Auto-reconnect logic
        if (enableAutoReconnect && lifecycleState.streamWasInterrupted) {
          console.log(`🔄 [USE_LIFECYCLE] Auto-reconnect in ${reconnectDelay}ms`);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 [USE_LIFECYCLE] Attempting auto-reconnect');
            onStreamResumed?.();
          }, reconnectDelay);
        }

        onForegroundTransition?.();
      },
    };
  }, [
    onAppStateChange,
    onStreamInterrupted,
    onStreamResumed,
    onBackgroundTransition,
    onForegroundTransition,
    enableAutoReconnect,
    reconnectDelay,
    lifecycleState.streamWasInterrupted,
  ]);

  // Set up lifecycle service callbacks
  useEffect(() => {
    appLifecycleService.setCallbacks(callbacksRef.current);

    return () => {
      // Clear timeout on cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Utility functions
  const setStreamActive = (isActive: boolean) => {
    appLifecycleService.setStreamActive(isActive);
  };

  const handleAudioInterruption = (type: 'began' | 'ended') => {
    appLifecycleService.handleAudioInterruption(type);
  };

  const handleNetworkStateChange = (isConnected: boolean) => {
    appLifecycleService.handleNetworkStateChange(isConnected);
  };

  const handleMemoryWarning = () => {
    appLifecycleService.handleMemoryWarning();
  };

  const getLifecycleStats = () => {
    return appLifecycleService.getStats();
  };

  const forceReconnect = () => {
    console.log('🔄 [USE_LIFECYCLE] Force reconnect triggered');
    onStreamResumed?.();
  };

  return {
    // State
    ...lifecycleState,
    
    // Actions
    setStreamActive,
    handleAudioInterruption,
    handleNetworkStateChange,
    handleMemoryWarning,
    forceReconnect,
    
    // Utils
    getLifecycleStats,
  };
};

/**
 * Hook specifically for live streaming lifecycle management
 */
export const useStreamLifecycle = (
  streamId: string,
  isActive: boolean,
  onReconnect?: () => Promise<void>
) => {
  const lifecycle = useAppLifecycle({
    onStreamInterrupted: () => {
      console.log(`🔄 [STREAM_LIFECYCLE] Stream ${streamId} interrupted`);
    },
    
    onStreamResumed: async () => {
      console.log(`✅ [STREAM_LIFECYCLE] Resuming stream ${streamId}`);
      if (onReconnect) {
        try {
          await onReconnect();
        } catch (error) {
          console.error(`❌ [STREAM_LIFECYCLE] Failed to reconnect stream ${streamId}:`, error);
        }
      }
    },

    onBackgroundTransition: () => {
      console.log(`📱 [STREAM_LIFECYCLE] Stream ${streamId} going to background`);
    },

    onForegroundTransition: () => {
      console.log(`📱 [STREAM_LIFECYCLE] Stream ${streamId} coming to foreground`);
    },

    enableAutoReconnect: true,
    reconnectDelay: 3000, // 3 seconds for streams
  });

  // Update stream active status
  useEffect(() => {
    lifecycle.setStreamActive(isActive);
  }, [isActive, lifecycle]);

  return {
    ...lifecycle,
    streamId,
  };
};

/**
 * Hook for network-aware lifecycle management
 */
export const useNetworkAwareLifecycle = (
  onNetworkChange?: (isConnected: boolean) => void
) => {
  const [isNetworkConnected, setIsNetworkConnected] = useState(true);

  const lifecycle = useAppLifecycle({
    onStreamInterrupted: () => {
      console.log('🌐 [NETWORK_LIFECYCLE] Stream interrupted due to network/lifecycle');
    },
    
    onStreamResumed: () => {
      console.log('🌐 [NETWORK_LIFECYCLE] Stream resumed after network/lifecycle event');
    },
  });

  // Network state management
  const handleNetworkChange = (isConnected: boolean) => {
    setIsNetworkConnected(isConnected);
    lifecycle.handleNetworkStateChange(isConnected);
    onNetworkChange?.(isConnected);
  };

  return {
    ...lifecycle,
    isNetworkConnected,
    handleNetworkChange,
  };
};
