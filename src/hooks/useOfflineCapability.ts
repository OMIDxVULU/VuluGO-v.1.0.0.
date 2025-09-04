/**
 * Offline Capability Hook
 * Handles offline detection, data caching, and graceful degradation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface OfflineCapabilityState {
  isOnline: boolean;
  isConnected: boolean;
  connectionType: string | null;
  isInternetReachable: boolean | null;
  lastOnlineTime: Date | null;
  offlineDuration: number; // in seconds
  hasOfflineData: boolean;
  pendingActions: OfflineAction[];
}

export interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface UseOfflineCapabilityOptions {
  enableOfflineMode?: boolean;
  maxOfflineActions?: number;
  autoRetryOnReconnect?: boolean;
  showOfflineAlert?: boolean;
  cacheKey?: string;
  onConnectionChange?: (isOnline: boolean) => void;
  onOfflineActionQueued?: (action: OfflineAction) => void;
  onOfflineActionExecuted?: (action: OfflineAction) => void;
}

export function useOfflineCapability(options: UseOfflineCapabilityOptions = {}) {
  const {
    enableOfflineMode = true,
    maxOfflineActions = 100,
    autoRetryOnReconnect = true,
    showOfflineAlert = true,
    cacheKey = 'offline_data',
    onConnectionChange,
    onOfflineActionQueued,
    onOfflineActionExecuted
  } = options;

  const [state, setState] = useState<OfflineCapabilityState>({
    isOnline: true,
    isConnected: true,
    connectionType: null,
    isInternetReachable: null,
    lastOnlineTime: new Date(),
    offlineDuration: 0,
    hasOfflineData: false,
    pendingActions: []
  });

  const offlineTimerRef = useRef<NodeJS.Timeout>();
  const netInfoUnsubscribe = useRef<(() => void) | null>(null);

  // Initialize offline capability
  useEffect(() => {
    if (!enableOfflineMode) return;

    initializeOfflineCapability();
    
    return () => {
      cleanup();
    };
  }, [enableOfflineMode]);

  // Update offline duration timer
  useEffect(() => {
    if (!state.isOnline && state.lastOnlineTime) {
      offlineTimerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          offlineDuration: Math.floor((Date.now() - prev.lastOnlineTime!.getTime()) / 1000)
        }));
      }, 1000);
    } else {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
      }
    }

    return () => {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
      }
    };
  }, [state.isOnline, state.lastOnlineTime]);

  // Initialize offline capability
  const initializeOfflineCapability = useCallback(async () => {
    try {
      // Load cached offline data
      await loadOfflineData();

      // Set up network monitoring
      netInfoUnsubscribe.current = NetInfo.addEventListener(handleConnectionChange);

      // Get initial network state
      const netInfo = await NetInfo.fetch();
      handleConnectionChange(netInfo);

      console.log('✅ Offline capability initialized');
    } catch (error) {
      console.error('Failed to initialize offline capability:', error);
    }
  }, []);

  // Handle connection state changes
  const handleConnectionChange = useCallback((netInfo: NetInfoState) => {
    const isOnline = netInfo.isConnected === true && netInfo.isInternetReachable !== false;
    const wasOffline = !state.isOnline;

    setState(prev => ({
      ...prev,
      isOnline,
      isConnected: netInfo.isConnected === true,
      connectionType: netInfo.type,
      isInternetReachable: netInfo.isInternetReachable,
      lastOnlineTime: isOnline ? new Date() : prev.lastOnlineTime,
      offlineDuration: isOnline ? 0 : prev.offlineDuration
    }));

    // Notify about connection change
    onConnectionChange?.(isOnline);

    // Handle reconnection
    if (isOnline && wasOffline) {
      handleReconnection();
    }

    // Show offline alert
    if (!isOnline && showOfflineAlert) {
      showOfflineNotification();
    }

    console.log(`📶 Connection changed: ${isOnline ? 'Online' : 'Offline'} (${netInfo.type})`);
  }, [state.isOnline, showOfflineAlert, onConnectionChange]);

  // Handle reconnection
  const handleReconnection = useCallback(async () => {
    try {
      console.log('🔄 Reconnected to internet, processing offline actions...');

      if (autoRetryOnReconnect && state.pendingActions.length > 0) {
        await processPendingActions();
      }

      // Sync any cached data
      await syncOfflineData();

    } catch (error) {
      console.error('Failed to handle reconnection:', error);
    }
  }, [autoRetryOnReconnect, state.pendingActions]);

  // Queue action for offline execution
  const queueOfflineAction = useCallback(async (
    type: string,
    data: any,
    maxRetries: number = 3
  ): Promise<string> => {
    try {
      const action: OfflineAction = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries
      };

      setState(prev => {
        const updatedActions = [...prev.pendingActions, action];
        
        // Limit number of offline actions
        if (updatedActions.length > maxOfflineActions) {
          updatedActions.splice(0, updatedActions.length - maxOfflineActions);
        }

        return {
          ...prev,
          pendingActions: updatedActions
        };
      });

      // Save to persistent storage
      await saveOfflineData();

      onOfflineActionQueued?.(action);
      console.log(`📝 Queued offline action: ${type}`);

      return action.id;

    } catch (error) {
      console.error('Failed to queue offline action:', error);
      throw error;
    }
  }, [maxOfflineActions, onOfflineActionQueued]);

  // Process pending offline actions
  const processPendingActions = useCallback(async (): Promise<void> => {
    try {
      const actionsToProcess = [...state.pendingActions];
      
      for (const action of actionsToProcess) {
        try {
          await executeOfflineAction(action);
          
          // Remove successful action
          setState(prev => ({
            ...prev,
            pendingActions: prev.pendingActions.filter(a => a.id !== action.id)
          }));

          onOfflineActionExecuted?.(action);
          console.log(`✅ Executed offline action: ${action.type}`);

        } catch (error) {
          console.error(`Failed to execute offline action ${action.type}:`, error);
          
          // Increment retry count
          setState(prev => ({
            ...prev,
            pendingActions: prev.pendingActions.map(a => 
              a.id === action.id 
                ? { ...a, retryCount: a.retryCount + 1 }
                : a
            )
          }));

          // Remove action if max retries exceeded
          if (action.retryCount >= action.maxRetries) {
            setState(prev => ({
              ...prev,
              pendingActions: prev.pendingActions.filter(a => a.id !== action.id)
            }));
            console.warn(`❌ Offline action ${action.type} exceeded max retries`);
          }
        }
      }

      // Save updated state
      await saveOfflineData();

    } catch (error) {
      console.error('Failed to process pending actions:', error);
    }
  }, [state.pendingActions, onOfflineActionExecuted]);

  // Execute a specific offline action
  const executeOfflineAction = useCallback(async (action: OfflineAction): Promise<void> => {
    // This would be implemented based on your specific action types
    switch (action.type) {
      case 'send_message':
        // Implement message sending logic
        break;
      case 'update_profile':
        // Implement profile update logic
        break;
      case 'follow_user':
        // Implement follow user logic
        break;
      default:
        console.warn(`Unknown offline action type: ${action.type}`);
    }
  }, []);

  // Cache data for offline use
  const cacheData = useCallback(async (key: string, data: any): Promise<void> => {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        key
      };

      await AsyncStorage.setItem(`${cacheKey}_${key}`, JSON.stringify(cacheEntry));
      
      setState(prev => ({ ...prev, hasOfflineData: true }));
      console.log(`💾 Cached data: ${key}`);

    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }, [cacheKey]);

  // Retrieve cached data
  const getCachedData = useCallback(async (key: string, maxAge?: number): Promise<any | null> => {
    try {
      const cachedItem = await AsyncStorage.getItem(`${cacheKey}_${key}`);
      
      if (!cachedItem) {
        return null;
      }

      const cacheEntry = JSON.parse(cachedItem);
      
      // Check if data is too old
      if (maxAge && Date.now() - cacheEntry.timestamp > maxAge) {
        await AsyncStorage.removeItem(`${cacheKey}_${key}`);
        return null;
      }

      console.log(`📖 Retrieved cached data: ${key}`);
      return cacheEntry.data;

    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }, [cacheKey]);

  // Clear cached data
  const clearCachedData = useCallback(async (key?: string): Promise<void> => {
    try {
      if (key) {
        await AsyncStorage.removeItem(`${cacheKey}_${key}`);
      } else {
        // Clear all cached data
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith(cacheKey));
        await AsyncStorage.multiRemove(cacheKeys);
        
        setState(prev => ({ ...prev, hasOfflineData: false }));
      }

      console.log(`🗑️ Cleared cached data: ${key || 'all'}`);

    } catch (error) {
      console.error('Failed to clear cached data:', error);
    }
  }, [cacheKey]);

  // Load offline data from storage
  const loadOfflineData = useCallback(async (): Promise<void> => {
    try {
      const offlineDataStr = await AsyncStorage.getItem(`${cacheKey}_pending_actions`);
      
      if (offlineDataStr) {
        const offlineData = JSON.parse(offlineDataStr);
        
        setState(prev => ({
          ...prev,
          pendingActions: offlineData.pendingActions || [],
          hasOfflineData: true
        }));

        console.log(`📂 Loaded ${offlineData.pendingActions?.length || 0} offline actions`);
      }

    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }, [cacheKey]);

  // Save offline data to storage
  const saveOfflineData = useCallback(async (): Promise<void> => {
    try {
      const offlineData = {
        pendingActions: state.pendingActions,
        lastSaved: Date.now()
      };

      await AsyncStorage.setItem(`${cacheKey}_pending_actions`, JSON.stringify(offlineData));

    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  }, [state.pendingActions, cacheKey]);

  // Sync offline data when reconnected
  const syncOfflineData = useCallback(async (): Promise<void> => {
    try {
      // This would implement your specific sync logic
      console.log('🔄 Syncing offline data...');
      
      // Example: sync cached user data, messages, etc.
      
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }, []);

  // Show offline notification
  const showOfflineNotification = useCallback(() => {
    Alert.alert(
      'You\'re Offline',
      'Some features may be limited. Your actions will be saved and synced when you reconnect.',
      [{ text: 'OK', style: 'default' }]
    );
  }, []);

  // Cleanup resources
  const cleanup = useCallback(() => {
    if (netInfoUnsubscribe.current) {
      netInfoUnsubscribe.current();
    }
    
    if (offlineTimerRef.current) {
      clearInterval(offlineTimerRef.current);
    }
  }, []);

  // Force refresh network state
  const refreshNetworkState = useCallback(async (): Promise<void> => {
    try {
      const netInfo = await NetInfo.fetch();
      handleConnectionChange(netInfo);
    } catch (error) {
      console.error('Failed to refresh network state:', error);
    }
  }, [handleConnectionChange]);

  return {
    // State
    ...state,

    // Actions
    queueOfflineAction,
    processPendingActions,
    cacheData,
    getCachedData,
    clearCachedData,
    refreshNetworkState,

    // Computed values
    canUseOnlineFeatures: state.isOnline,
    shouldShowOfflineMode: !state.isOnline && enableOfflineMode,
    offlineActionCount: state.pendingActions.length,
    connectionStatus: state.isOnline ? 'online' : 'offline',
    connectionQuality: state.isInternetReachable === true ? 'good' : 
                     state.isConnected ? 'limited' : 'none',

    // Helper functions
    isFeatureAvailableOffline: (feature: string) => {
      // Define which features work offline
      const offlineFeatures = ['view_profile', 'browse_cached_content', 'settings'];
      return offlineFeatures.includes(feature);
    },

    formatOfflineDuration: () => {
      const duration = state.offlineDuration;
      if (duration < 60) return `${duration}s`;
      if (duration < 3600) return `${Math.floor(duration / 60)}m`;
      return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
    }
  };
}

export default useOfflineCapability;
