/**
 * React Hook for Stream Analytics
 * Provides easy integration with stream analytics service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import streamAnalyticsService, {
  StreamAnalytics,
  UserAnalytics,
  AnalyticsEvent,
  AnalyticsQuery
} from '../services/streamAnalyticsService';
import { useAuth } from '../contexts/AuthContext';

export interface UseStreamAnalyticsOptions {
  streamId?: string;
  userId?: string;
  autoLoad?: boolean;
  realTimeUpdates?: boolean;
  updateInterval?: number;
  onAnalyticsUpdate?: (analytics: StreamAnalytics) => void;
  onError?: (error: string) => void;
}

export interface StreamAnalyticsState {
  streamAnalytics: StreamAnalytics | null;
  userAnalytics: UserAnalytics | null;
  realtimeMetrics: any;
  events: AnalyticsEvent[];
  isLoading: boolean;
  isTracking: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useStreamAnalytics(options: UseStreamAnalyticsOptions = {}) {
  const { streamId, userId, autoLoad = false, realTimeUpdates = false, updateInterval = 30000 } = options;
  const { user } = useAuth();

  const [state, setState] = useState<StreamAnalyticsState>({
    streamAnalytics: null,
    userAnalytics: null,
    realtimeMetrics: null,
    events: [],
    isLoading: false,
    isTracking: false,
    error: null,
    lastUpdated: null
  });

  const updateIntervalRef = useRef<NodeJS.Timeout>();
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Track analytics event
  const trackEvent = useCallback(async (
    eventStreamId: string,
    eventType: AnalyticsEvent['eventType'],
    eventData: any = {},
    sessionId?: string
  ) => {
    try {
      setState(prev => ({ ...prev, isTracking: true }));

      await streamAnalyticsService.trackEvent(
        eventStreamId,
        eventType,
        eventData,
        sessionId
      );

      setState(prev => ({ ...prev, isTracking: false }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isTracking: false,
        error: `Failed to track event: ${error.message}`
      }));
    }
  }, []);

  // Load stream analytics
  const loadStreamAnalytics = useCallback(async (targetStreamId?: string) => {
    try {
      const analyticsStreamId = targetStreamId || streamId;
      if (!analyticsStreamId) {
        throw new Error('Stream ID is required');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const analytics = await streamAnalyticsService.getStreamAnalytics(analyticsStreamId);

      setState(prev => ({
        ...prev,
        streamAnalytics: analytics,
        isLoading: false,
        lastUpdated: new Date()
      }));

      callbacksRef.current.onAnalyticsUpdate?.(analytics!);
      return analytics;

    } catch (error: any) {
      const errorMessage = `Failed to load stream analytics: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      callbacksRef.current.onError?.(errorMessage);
      throw error;
    }
  }, [streamId]);

  // Load user analytics
  const loadUserAnalytics = useCallback(async (targetUserId?: string) => {
    try {
      const analyticsUserId = targetUserId || userId || user?.uid;
      if (!analyticsUserId) {
        throw new Error('User ID is required');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const analytics = await streamAnalyticsService.getUserAnalytics(analyticsUserId);

      setState(prev => ({
        ...prev,
        userAnalytics: analytics,
        isLoading: false,
        lastUpdated: new Date()
      }));

      return analytics;

    } catch (error: any) {
      const errorMessage = `Failed to load user analytics: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      callbacksRef.current.onError?.(errorMessage);
      throw error;
    }
  }, [userId, user]);

  // Load real-time metrics
  const loadRealtimeMetrics = useCallback(async (targetStreamId?: string) => {
    try {
      const analyticsStreamId = targetStreamId || streamId;
      if (!analyticsStreamId) {
        throw new Error('Stream ID is required');
      }

      const metrics = await streamAnalyticsService.getRealTimeMetrics(analyticsStreamId);

      setState(prev => ({
        ...prev,
        realtimeMetrics: metrics,
        lastUpdated: new Date()
      }));

      return metrics;

    } catch (error: any) {
      console.error('Failed to load real-time metrics:', error);
      return null;
    }
  }, [streamId]);

  // Load analytics events
  const loadEvents = useCallback(async (query: AnalyticsQuery = {}) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const events = await streamAnalyticsService.getAnalyticsEvents({
        streamId,
        userId,
        ...query
      });

      setState(prev => ({
        ...prev,
        events,
        isLoading: false,
        lastUpdated: new Date()
      }));

      return events;

    } catch (error: any) {
      const errorMessage = `Failed to load events: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, [streamId, userId]);

  // Generate analytics report
  const generateReport = useCallback(async (
    targetStreamId?: string,
    startDate?: Date,
    endDate?: Date
  ) => {
    try {
      const analyticsStreamId = targetStreamId || streamId;
      if (!analyticsStreamId) {
        throw new Error('Stream ID is required');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const report = await streamAnalyticsService.generateAnalyticsReport(
        analyticsStreamId,
        startDate,
        endDate
      );

      setState(prev => ({ ...prev, isLoading: false }));

      return report;

    } catch (error: any) {
      const errorMessage = `Failed to generate report: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, [streamId]);

  // Start real-time updates
  const startRealtimeUpdates = useCallback(() => {
    if (!streamId || updateIntervalRef.current) return;

    updateIntervalRef.current = setInterval(async () => {
      try {
        await Promise.all([
          loadRealtimeMetrics(),
          loadStreamAnalytics()
        ]);
      } catch (error) {
        console.warn('Failed to update real-time analytics:', error);
      }
    }, updateInterval);

    console.log(`✅ Started real-time analytics updates for stream: ${streamId}`);
  }, [streamId, updateInterval, loadRealtimeMetrics, loadStreamAnalytics]);

  // Stop real-time updates
  const stopRealtimeUpdates = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = undefined;
      console.log('🛑 Stopped real-time analytics updates');
    }
  }, []);

  // Quick tracking methods
  const trackViewStart = useCallback((sessionId?: string) => {
    if (streamId) {
      return trackEvent(streamId, 'view_start', {}, sessionId);
    }
  }, [streamId, trackEvent]);

  const trackViewEnd = useCallback((sessionId?: string, watchTime?: number) => {
    if (streamId) {
      return trackEvent(streamId, 'view_end', { watchTime }, sessionId);
    }
  }, [streamId, trackEvent]);

  const trackMessage = useCallback((messageId: string, messageLength: number) => {
    if (streamId) {
      return trackEvent(streamId, 'message', { messageId, messageLength });
    }
  }, [streamId, trackEvent]);

  const trackReaction = useCallback((emoji: string, messageId?: string) => {
    if (streamId) {
      return trackEvent(streamId, 'reaction', { emoji, messageId });
    }
  }, [streamId, trackEvent]);

  const trackGift = useCallback((giftType: string, value: number) => {
    if (streamId) {
      return trackEvent(streamId, 'gift', { giftType, value });
    }
  }, [streamId, trackEvent]);

  const trackFollow = useCallback((targetUserId: string) => {
    if (streamId) {
      return trackEvent(streamId, 'follow', { targetUserId });
    }
  }, [streamId, trackEvent]);

  const trackShare = useCallback((platform: string) => {
    if (streamId) {
      return trackEvent(streamId, 'share', { platform });
    }
  }, [streamId, trackEvent]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    try {
      const promises = [];

      if (streamId) {
        promises.push(loadStreamAnalytics());
        promises.push(loadRealtimeMetrics());
      }

      if (userId || user?.uid) {
        promises.push(loadUserAnalytics());
      }

      await Promise.all(promises);

    } catch (error) {
      console.error('Failed to refresh analytics data:', error);
    }
  }, [streamId, userId, user, loadStreamAnalytics, loadRealtimeMetrics, loadUserAnalytics]);

  // Auto-load data on mount
  useEffect(() => {
    if (autoLoad) {
      refreshAll();
    }
  }, [autoLoad, refreshAll]);

  // Start/stop real-time updates
  useEffect(() => {
    if (realTimeUpdates && streamId) {
      startRealtimeUpdates();
    } else {
      stopRealtimeUpdates();
    }

    return () => {
      stopRealtimeUpdates();
    };
  }, [realTimeUpdates, streamId, startRealtimeUpdates, stopRealtimeUpdates]);

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
    streamAnalytics: state.streamAnalytics,
    userAnalytics: state.userAnalytics,
    realtimeMetrics: state.realtimeMetrics,
    events: state.events,
    isLoading: state.isLoading,
    isTracking: state.isTracking,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    trackEvent,
    loadStreamAnalytics,
    loadUserAnalytics,
    loadRealtimeMetrics,
    loadEvents,
    generateReport,
    startRealtimeUpdates,
    stopRealtimeUpdates,
    refreshAll,
    clearError,

    // Quick tracking methods
    trackViewStart,
    trackViewEnd,
    trackMessage,
    trackReaction,
    trackGift,
    trackFollow,
    trackShare,

    // Computed values
    hasStreamAnalytics: !!state.streamAnalytics,
    hasUserAnalytics: !!state.userAnalytics,
    hasRealtimeMetrics: !!state.realtimeMetrics,
    hasEvents: state.events.length > 0,
    isActive: !state.isLoading && !state.error,

    // Quick metrics (from stream analytics)
    currentViewers: state.realtimeMetrics?.currentViewers || 0,
    totalViewers: state.streamAnalytics?.totalViewers || 0,
    peakViewers: state.streamAnalytics?.peakViewers || 0,
    engagementRate: state.streamAnalytics?.engagementRate || 0,
    totalRevenue: state.streamAnalytics?.totalRevenue || 0,
    totalMessages: state.streamAnalytics?.totalMessages || 0,
    totalReactions: state.streamAnalytics?.totalReactions || 0,
    totalGifts: state.streamAnalytics?.totalGifts || 0,

    // User metrics
    userTotalStreams: state.userAnalytics?.totalStreams || 0,
    userTotalWatchTime: state.userAnalytics?.totalWatchTime || 0,
    userTotalEarnings: state.userAnalytics?.totalEarnings || 0,
    userTotalSpent: state.userAnalytics?.totalSpent || 0,

    // Event counts
    totalEvents: state.events.length,
    recentEvents: state.events.slice(0, 10),
    eventsByType: state.events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

export default useStreamAnalytics;
