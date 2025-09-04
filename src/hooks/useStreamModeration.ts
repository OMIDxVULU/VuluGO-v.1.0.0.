/**
 * React Hook for Stream Moderation
 * Provides easy integration with stream moderation service
 */

import { useState, useEffect, useCallback } from 'react';
import streamModerationService, {
  ModerationAction,
  ModerationRule,
  UserModerationStatus,
  SpamDetectionResult
} from '../services/streamModerationService';
import { useAuth } from '../contexts/AuthContext';

export interface UseStreamModerationOptions {
  streamId: string;
  autoLoadActions?: boolean;
  autoLoadRules?: boolean;
  onModerationAction?: (action: ModerationAction) => void;
  onSpamDetected?: (result: SpamDetectionResult) => void;
  onError?: (error: string) => void;
}

export interface StreamModerationState {
  actions: ModerationAction[];
  rules: ModerationRule[];
  userStatuses: Map<string, UserModerationStatus>;
  stats: any;
  isLoading: boolean;
  isExecuting: boolean;
  error: string | null;
  hasModeratorPermissions: boolean;
  lastUpdated: Date | null;
}

export function useStreamModeration(options: UseStreamModerationOptions) {
  const { streamId, autoLoadActions = true, autoLoadRules = false } = options;
  const { user } = useAuth();

  const [state, setState] = useState<StreamModerationState>({
    actions: [],
    rules: [],
    userStatuses: new Map(),
    stats: null,
    isLoading: false,
    isExecuting: false,
    error: null,
    hasModeratorPermissions: false,
    lastUpdated: null
  });

  // Check moderator permissions
  const checkModeratorPermissions = useCallback(async () => {
    if (!user || !streamId) return;

    try {
      const hasPermissions = await streamModerationService.hasModeratorPermissions(
        streamId,
        user.uid
      );

      setState(prev => ({
        ...prev,
        hasModeratorPermissions: hasPermissions
      }));

    } catch (error) {
      console.error('Failed to check moderator permissions:', error);
    }
  }, [streamId, user]);

  // Load moderation actions
  const loadActions = useCallback(async (limit: number = 50) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const actions = await streamModerationService.getModerationActions(streamId, limit);

      setState(prev => ({
        ...prev,
        actions,
        isLoading: false,
        lastUpdated: new Date()
      }));

      return actions;

    } catch (error: any) {
      const errorMessage = `Failed to load moderation actions: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, options]);

  // Load moderation statistics
  const loadStats = useCallback(async () => {
    try {
      const stats = await streamModerationService.getModerationStats(streamId);

      setState(prev => ({
        ...prev,
        stats,
        lastUpdated: new Date()
      }));

      return stats;

    } catch (error: any) {
      console.error('Failed to load moderation stats:', error);
      return null;
    }
  }, [streamId]);

  // Execute moderation action
  const executeModerationAction = useCallback(async (
    targetUserId: string,
    action: ModerationAction['action'],
    reason: string,
    duration?: number,
    messageId?: string
  ) => {
    try {
      if (!state.hasModeratorPermissions) {
        throw new Error('Insufficient permissions to perform moderation actions');
      }

      setState(prev => ({ ...prev, isExecuting: true, error: null }));

      const actionId = await streamModerationService.executeModerationAction(
        streamId,
        targetUserId,
        action,
        reason,
        duration,
        messageId
      );

      // Reload actions to get updated list
      await loadActions();

      setState(prev => ({ ...prev, isExecuting: false }));

      options.onModerationAction?.({
        id: actionId,
        streamId,
        moderatorId: user?.uid || '',
        moderatorName: user?.displayName || 'Moderator',
        targetUserId,
        targetUserName: 'User',
        action,
        reason,
        duration,
        messageId,
        isAutomated: false,
        timestamp: new Date() as any
      });

      console.log(`✅ Moderation action ${action} executed successfully`);
      return actionId;

    } catch (error: any) {
      const errorMessage = `Failed to execute moderation action: ${error.message}`;
      setState(prev => ({
        ...prev,
        isExecuting: false,
        error: errorMessage
      }));

      options.onError?.(errorMessage);
      throw error;
    }
  }, [streamId, state.hasModeratorPermissions, user, loadActions, options]);

  // Analyze message for spam/violations
  const analyzeMessage = useCallback(async (
    userId: string,
    message: string,
    userHistory?: any
  ): Promise<SpamDetectionResult> => {
    try {
      const result = await streamModerationService.analyzeMessage(
        streamId,
        userId,
        message,
        userHistory
      );

      if (result.isSpam) {
        options.onSpamDetected?.(result);
      }

      return result;

    } catch (error: any) {
      console.error('Failed to analyze message:', error);
      return {
        isSpam: false,
        confidence: 0,
        reasons: [],
        suggestedAction: 'none'
      };
    }
  }, [streamId, options]);

  // Get user moderation status
  const getUserStatus = useCallback(async (userId: string): Promise<UserModerationStatus | null> => {
    try {
      // Check cache first
      const cachedStatus = state.userStatuses.get(userId);
      if (cachedStatus) {
        return cachedStatus;
      }

      const status = await streamModerationService.getUserModerationStatus(streamId, userId);
      
      if (status) {
        setState(prev => ({
          ...prev,
          userStatuses: new Map(prev.userStatuses.set(userId, status))
        }));
      }

      return status;

    } catch (error: any) {
      console.error('Failed to get user moderation status:', error);
      return null;
    }
  }, [streamId, state.userStatuses]);

  // Quick moderation actions
  const warnUser = useCallback(async (userId: string, reason: string) => {
    return executeModerationAction(userId, 'warn', reason);
  }, [executeModerationAction]);

  const muteUser = useCallback(async (userId: string, reason: string) => {
    return executeModerationAction(userId, 'mute', reason);
  }, [executeModerationAction]);

  const unmuteUser = useCallback(async (userId: string, reason: string = 'Unmuted by moderator') => {
    return executeModerationAction(userId, 'unmute', reason);
  }, [executeModerationAction]);

  const timeoutUser = useCallback(async (userId: string, reason: string, duration: number = 10) => {
    return executeModerationAction(userId, 'timeout', reason, duration);
  }, [executeModerationAction]);

  const banUser = useCallback(async (userId: string, reason: string) => {
    return executeModerationAction(userId, 'ban', reason);
  }, [executeModerationAction]);

  const unbanUser = useCallback(async (userId: string, reason: string = 'Unbanned by moderator') => {
    return executeModerationAction(userId, 'unban', reason);
  }, [executeModerationAction]);

  const deleteMessage = useCallback(async (messageId: string, reason: string) => {
    return executeModerationAction('', 'delete_message', reason, undefined, messageId);
  }, [executeModerationAction]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const [actions, stats] = await Promise.all([
        streamModerationService.getModerationActions(streamId),
        streamModerationService.getModerationStats(streamId)
      ]);

      setState(prev => ({
        ...prev,
        actions,
        stats,
        isLoading: false,
        lastUpdated: new Date()
      }));

    } catch (error: any) {
      const errorMessage = `Failed to refresh moderation data: ${error.message}`;
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
  const getActionsByType = useCallback((actionType: ModerationAction['action']) => {
    return state.actions.filter(action => action.action === actionType);
  }, [state.actions]);

  const getActionsByUser = useCallback((userId: string) => {
    return state.actions.filter(action => action.targetUserId === userId);
  }, [state.actions]);

  const getRecentActions = useCallback((count: number = 10) => {
    return state.actions.slice(0, count);
  }, [state.actions]);

  const isUserMuted = useCallback(async (userId: string): Promise<boolean> => {
    const status = await getUserStatus(userId);
    return status?.isMuted || false;
  }, [getUserStatus]);

  const isUserBanned = useCallback(async (userId: string): Promise<boolean> => {
    const status = await getUserStatus(userId);
    return status?.isBanned || false;
  }, [getUserStatus]);

  const isUserTimedOut = useCallback(async (userId: string): Promise<boolean> => {
    const status = await getUserStatus(userId);
    if (!status?.isTimedOut || !status.timeoutExpiresAt) return false;
    
    return status.timeoutExpiresAt.toMillis() > Date.now();
  }, [getUserStatus]);

  // Auto-load data on mount
  useEffect(() => {
    if (streamId && user) {
      checkModeratorPermissions();
      
      if (autoLoadActions) {
        loadActions();
        loadStats();
      }
    }
  }, [streamId, user, autoLoadActions, checkModeratorPermissions, loadActions, loadStats]);

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
    actions: state.actions,
    rules: state.rules,
    userStatuses: state.userStatuses,
    stats: state.stats,
    isLoading: state.isLoading,
    isExecuting: state.isExecuting,
    error: state.error,
    hasModeratorPermissions: state.hasModeratorPermissions,
    lastUpdated: state.lastUpdated,

    // Actions
    loadActions,
    loadStats,
    executeModerationAction,
    analyzeMessage,
    getUserStatus,
    refreshAll,
    clearError,

    // Quick actions
    warnUser,
    muteUser,
    unmuteUser,
    timeoutUser,
    banUser,
    unbanUser,
    deleteMessage,

    // Helpers
    getActionsByType,
    getActionsByUser,
    getRecentActions,
    isUserMuted,
    isUserBanned,
    isUserTimedOut,

    // Computed values
    totalActions: state.actions.length,
    recentActions: getRecentActions(5),
    hasActions: state.actions.length > 0,
    hasStats: !!state.stats,
    canModerate: state.hasModeratorPermissions && !state.isExecuting,
    
    // Quick stats
    totalWarnings: state.stats?.warnings || 0,
    totalMutes: state.stats?.mutes || 0,
    totalTimeouts: state.stats?.timeouts || 0,
    totalBans: state.stats?.bans || 0,
    automatedActions: state.stats?.automatedActions || 0,
    manualActions: state.stats?.manualActions || 0
  };
}

export default useStreamModeration;
