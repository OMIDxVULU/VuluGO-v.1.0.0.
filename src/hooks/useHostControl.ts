/**
 * React Hook for Host Controls
 * Provides easy integration with host control service
 */

import { useState, useEffect, useCallback } from 'react';
import hostControlService, {
  StreamSettings,
  ModerationAction,
  StreamAnalytics
} from '../services/hostControlService';
import { StreamParticipant, ChatSettings } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

export interface UseHostControlOptions {
  streamId: string;
  autoLoadAnalytics?: boolean;
  analyticsRefreshInterval?: number;
  onModerationAction?: (action: ModerationAction) => void;
  onSettingsUpdate?: (settings: Partial<StreamSettings>) => void;
  onError?: (error: string) => void;
}

export interface HostControlState {
  analytics: StreamAnalytics | null;
  participants: StreamParticipant[];
  moderationLogs: any[];
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useHostControl(options: UseHostControlOptions) {
  const { streamId, autoLoadAnalytics = true, analyticsRefreshInterval } = options;
  const { user } = useAuth();

  const [state, setState] = useState<HostControlState>({
    analytics: null,
    participants: [],
    moderationLogs: [],
    isLoading: false,
    isUpdating: false,
    error: null,
    lastUpdated: null
  });

  // Update stream settings
  const updateStreamSettings = useCallback(async (settings: Partial<StreamSettings>) => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      await hostControlService.updateStreamSettings(streamId, settings);

      setState(prev => ({ 
        ...prev, 
        isUpdating: false,
        lastUpdated: new Date()
      }));

      options.onSettingsUpdate?.(settings);
      console.log(`✅ Stream settings updated`);

    } catch (error: any) {
      const errorMessage = `Failed to update settings: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isUpdating: false, 
        error: errorMessage 
      }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // Update chat settings
  const updateChatSettings = useCallback(async (chatSettings: Partial<ChatSettings>) => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      await hostControlService.updateChatSettings(streamId, chatSettings);

      setState(prev => ({ 
        ...prev, 
        isUpdating: false,
        lastUpdated: new Date()
      }));

      console.log(`✅ Chat settings updated`);

    } catch (error: any) {
      const errorMessage = `Failed to update chat settings: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isUpdating: false, 
        error: errorMessage 
      }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // Perform moderation action
  const moderateParticipant = useCallback(async (action: ModerationAction) => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      await hostControlService.moderateParticipant(streamId, action);

      // Refresh participants list
      const updatedParticipants = await hostControlService.getParticipantList(streamId);
      
      setState(prev => ({ 
        ...prev, 
        participants: updatedParticipants,
        isUpdating: false,
        lastUpdated: new Date()
      }));

      options.onModerationAction?.(action);
      console.log(`✅ Moderation action ${action.type} completed`);

    } catch (error: any) {
      const errorMessage = `Failed to moderate participant: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isUpdating: false, 
        error: errorMessage 
      }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const analytics = await hostControlService.getStreamAnalytics(streamId);
      
      setState(prev => ({ 
        ...prev, 
        analytics,
        isLoading: false,
        lastUpdated: new Date()
      }));

      return analytics;

    } catch (error: any) {
      const errorMessage = `Failed to load analytics: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // Load participants
  const loadParticipants = useCallback(async () => {
    try {
      const participants = await hostControlService.getParticipantList(streamId);
      
      setState(prev => ({ 
        ...prev, 
        participants,
        lastUpdated: new Date()
      }));

      return participants;

    } catch (error: any) {
      const errorMessage = `Failed to load participants: ${error.message}`;
      setState(prev => ({ ...prev, error: errorMessage }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // Load moderation logs
  const loadModerationLogs = useCallback(async (limit: number = 50) => {
    try {
      const logs = await hostControlService.getModerationLogs(streamId, limit);
      
      setState(prev => ({ 
        ...prev, 
        moderationLogs: logs,
        lastUpdated: new Date()
      }));

      return logs;

    } catch (error: any) {
      const errorMessage = `Failed to load moderation logs: ${error.message}`;
      setState(prev => ({ ...prev, error: errorMessage }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // Clear all chat
  const clearAllChat = useCallback(async (reason?: string) => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      await hostControlService.clearAllChat(streamId, reason);

      setState(prev => ({ 
        ...prev, 
        isUpdating: false,
        lastUpdated: new Date()
      }));

      console.log(`✅ All chat cleared`);

    } catch (error: any) {
      const errorMessage = `Failed to clear chat: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isUpdating: false, 
        error: errorMessage 
      }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // End stream
  const endStream = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      await hostControlService.endStream(streamId);

      setState(prev => ({ 
        ...prev, 
        isUpdating: false,
        lastUpdated: new Date()
      }));

      console.log(`✅ Stream ended`);

    } catch (error: any) {
      const errorMessage = `Failed to end stream: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isUpdating: false, 
        error: errorMessage 
      }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // Toggle stream privacy
  const toggleStreamPrivacy = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      const newPrivacy = await hostControlService.toggleStreamPrivacy(streamId);

      setState(prev => ({ 
        ...prev, 
        isUpdating: false,
        lastUpdated: new Date()
      }));

      console.log(`✅ Stream privacy toggled to ${newPrivacy ? 'public' : 'private'}`);
      return newPrivacy;

    } catch (error: any) {
      const errorMessage = `Failed to toggle privacy: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isUpdating: false, 
        error: errorMessage 
      }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // Update stream quality
  const updateStreamQuality = useCallback(async (quality: 'low' | 'medium' | 'high' | 'auto') => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      await hostControlService.updateStreamQuality(streamId, quality);

      setState(prev => ({ 
        ...prev, 
        isUpdating: false,
        lastUpdated: new Date()
      }));

      console.log(`✅ Stream quality updated to ${quality}`);

    } catch (error: any) {
      const errorMessage = `Failed to update quality: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isUpdating: false, 
        error: errorMessage 
      }));
      
      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const [analytics, participants, logs] = await Promise.all([
        hostControlService.getStreamAnalytics(streamId),
        hostControlService.getParticipantList(streamId),
        hostControlService.getModerationLogs(streamId)
      ]);

      setState(prev => ({
        ...prev,
        analytics,
        participants,
        moderationLogs: logs,
        isLoading: false,
        lastUpdated: new Date()
      }));

      console.log(`✅ Host control data refreshed`);

    } catch (error: any) {
      const errorMessage = `Failed to refresh data: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      options.onError?.(errorMessage);
    }
  }, [streamId, options]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Helper functions
  const getParticipantById = useCallback((userId: string): StreamParticipant | undefined => {
    return state.participants.find(p => p.id === userId);
  }, [state.participants]);

  const getActiveParticipants = useCallback((): StreamParticipant[] => {
    return state.participants.filter(p => p.isActive);
  }, [state.participants]);

  const getModerators = useCallback((): StreamParticipant[] => {
    return state.participants.filter(p => p.role === 'moderator');
  }, [state.participants]);

  const getViewers = useCallback((): StreamParticipant[] => {
    return state.participants.filter(p => p.role === 'viewer');
  }, [state.participants]);

  // Auto-load analytics on mount
  useEffect(() => {
    if (autoLoadAnalytics && streamId && user) {
      refreshAll();
    }
  }, [autoLoadAnalytics, streamId, user, refreshAll]);

  // Set up analytics refresh interval
  useEffect(() => {
    if (analyticsRefreshInterval && analyticsRefreshInterval > 0) {
      const interval = setInterval(() => {
        loadAnalytics();
      }, analyticsRefreshInterval);

      return () => clearInterval(interval);
    }
  }, [analyticsRefreshInterval, loadAnalytics]);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [state.error, clearError]);

  return {
    // State
    analytics: state.analytics,
    participants: state.participants,
    moderationLogs: state.moderationLogs,
    isLoading: state.isLoading,
    isUpdating: state.isUpdating,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    updateStreamSettings,
    updateChatSettings,
    moderateParticipant,
    loadAnalytics,
    loadParticipants,
    loadModerationLogs,
    clearAllChat,
    endStream,
    toggleStreamPrivacy,
    updateStreamQuality,
    refreshAll,
    clearError,

    // Helpers
    getParticipantById,
    getActiveParticipants,
    getModerators,
    getViewers,

    // Computed values
    totalParticipants: state.participants.length,
    activeParticipants: getActiveParticipants().length,
    moderatorCount: getModerators().length,
    viewerCount: getViewers().length,
    hasAnalytics: !!state.analytics,
    hasParticipants: state.participants.length > 0,
    hasModerationLogs: state.moderationLogs.length > 0,
    isActive: !state.isLoading && !state.error,
    
    // Quick stats
    currentViewers: state.analytics?.viewerCount || 0,
    maxViewers: state.analytics?.maxViewers || 0,
    totalMessages: state.analytics?.chatMessages || 0,
    totalReactions: state.analytics?.reactions || 0,
    revenue: state.analytics?.revenue || 0,
    engagementRate: state.analytics?.engagementRate || 0
  };
}

export default useHostControl;
