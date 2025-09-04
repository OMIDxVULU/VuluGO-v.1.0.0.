/**
 * React Hook for Stream Discovery
 * Provides easy integration with stream discovery service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import streamDiscoveryService, {
  StreamDiscoveryFilters,
  StreamDiscoveryOptions,
  DiscoveredStream,
  StreamRecommendation
} from '../services/streamDiscoveryService';
import { StreamCategory } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

export interface UseStreamDiscoveryOptions {
  autoLoad?: boolean;
  realtime?: boolean;
  refreshInterval?: number;
  onStreamsUpdated?: (streams: DiscoveredStream[]) => void;
  onError?: (error: string) => void;
}

export interface StreamDiscoveryState {
  streams: DiscoveredStream[];
  trendingStreams: DiscoveredStream[];
  recommendations: StreamRecommendation[];
  popularCategories: { category: StreamCategory; count: number; streams: DiscoveredStream[] }[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  currentFilters: StreamDiscoveryFilters;
}

export function useStreamDiscovery(
  initialFilters: StreamDiscoveryFilters = {},
  options: UseStreamDiscoveryOptions = {}
) {
  const { user } = useAuth();
  const {
    autoLoad = true,
    realtime = false,
    refreshInterval,
    onStreamsUpdated,
    onError
  } = options;

  const [state, setState] = useState<StreamDiscoveryState>({
    streams: [],
    trendingStreams: [],
    recommendations: [],
    popularCategories: [],
    isLoading: false,
    isLoadingMore: false,
    isRefreshing: false,
    error: null,
    hasMore: true,
    currentFilters: initialFilters
  });

  const realtimeUnsubscribeRef = useRef<(() => void) | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Discover streams with filters
  const discoverStreams = useCallback(async (
    filters: StreamDiscoveryFilters = {},
    discoveryOptions: StreamDiscoveryOptions = {},
    append: boolean = false
  ) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: !append,
        isLoadingMore: append,
        error: null,
        currentFilters: filters
      }));

      const streams = await streamDiscoveryService.discoverStreams(filters, discoveryOptions);

      setState(prev => ({
        ...prev,
        streams: append ? [...prev.streams, ...streams] : streams,
        isLoading: false,
        isLoadingMore: false,
        hasMore: streams.length === (discoveryOptions.limit || 20)
      }));

      callbacksRef.current.onStreamsUpdated?.(streams);
      console.log(`✅ Discovered ${streams.length} streams`);

      return streams;

    } catch (error: any) {
      const errorMessage = `Failed to discover streams: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        error: errorMessage
      }));

      callbacksRef.current.onError?.(errorMessage);
      throw error;
    }
  }, []);

  // Search streams
  const searchStreams = useCallback(async (searchQuery: string) => {
    return discoverStreams({ ...state.currentFilters, searchQuery });
  }, [state.currentFilters, discoverStreams]);

  // Filter by category
  const filterByCategory = useCallback(async (category: StreamCategory) => {
    return discoverStreams({ ...state.currentFilters, category });
  }, [state.currentFilters, discoverStreams]);

  // Load more streams (pagination)
  const loadMore = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore) return;

    const offset = state.streams.length;
    return discoverStreams(
      state.currentFilters,
      { limit: 20, offset },
      true // append to existing streams
    );
  }, [state.currentFilters, state.streams.length, state.isLoadingMore, state.hasMore, discoverStreams]);

  // Refresh streams
  const refresh = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isRefreshing: true, error: null }));

      const streams = await streamDiscoveryService.discoverStreams(state.currentFilters);

      setState(prev => ({
        ...prev,
        streams,
        isRefreshing: false,
        hasMore: true
      }));

      console.log('🔄 Refreshed stream discovery');

    } catch (error: any) {
      const errorMessage = `Failed to refresh streams: ${error.message}`;
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        error: errorMessage
      }));

      callbacksRef.current.onError?.(errorMessage);
    }
  }, [state.currentFilters]);

  // Load trending streams
  const loadTrendingStreams = useCallback(async (limit: number = 10) => {
    try {
      const trendingStreams = await streamDiscoveryService.getTrendingStreams(limit);
      
      setState(prev => ({
        ...prev,
        trendingStreams
      }));

      return trendingStreams;

    } catch (error: any) {
      console.error('Failed to load trending streams:', error);
      return [];
    }
  }, []);

  // Load recommendations
  const loadRecommendations = useCallback(async (limit: number = 10) => {
    if (!user) return [];

    try {
      const recommendations = await streamDiscoveryService.getRecommendedStreams(user.uid, limit);
      
      setState(prev => ({
        ...prev,
        recommendations
      }));

      return recommendations;

    } catch (error: any) {
      console.error('Failed to load recommendations:', error);
      return [];
    }
  }, [user]);

  // Load popular categories
  const loadPopularCategories = useCallback(async () => {
    try {
      const popularCategories = await streamDiscoveryService.getPopularCategories();
      
      setState(prev => ({
        ...prev,
        popularCategories
      }));

      return popularCategories;

    } catch (error: any) {
      console.error('Failed to load popular categories:', error);
      return [];
    }
  }, []);

  // Start real-time updates
  const startRealtime = useCallback(() => {
    if (realtimeUnsubscribeRef.current) {
      realtimeUnsubscribeRef.current();
    }

    const unsubscribe = streamDiscoveryService.startRealtimeDiscovery(
      state.currentFilters,
      (streams) => {
        setState(prev => ({
          ...prev,
          streams
        }));
        callbacksRef.current.onStreamsUpdated?.(streams);
      }
    );

    realtimeUnsubscribeRef.current = unsubscribe;
    console.log('🔄 Started real-time stream discovery');
  }, [state.currentFilters]);

  // Stop real-time updates
  const stopRealtime = useCallback(() => {
    if (realtimeUnsubscribeRef.current) {
      realtimeUnsubscribeRef.current();
      realtimeUnsubscribeRef.current = null;
      console.log('🛑 Stopped real-time stream discovery');
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get cached streams
  const getCachedStreams = useCallback((filters: StreamDiscoveryFilters = {}) => {
    return streamDiscoveryService.getCachedStreams(filters);
  }, []);

  // Update filters
  const updateFilters = useCallback(async (newFilters: Partial<StreamDiscoveryFilters>) => {
    const updatedFilters = { ...state.currentFilters, ...newFilters };
    return discoverStreams(updatedFilters);
  }, [state.currentFilters, discoverStreams]);

  // Clear filters
  const clearFilters = useCallback(async () => {
    return discoverStreams({});
  }, [discoverStreams]);

  // Auto-load streams on mount
  useEffect(() => {
    if (autoLoad) {
      discoverStreams(initialFilters);
    }
  }, [autoLoad]); // Only run on mount

  // Start real-time updates if enabled
  useEffect(() => {
    if (realtime && state.streams.length > 0) {
      startRealtime();
    }

    return () => {
      stopRealtime();
    };
  }, [realtime, state.streams.length]); // Don't include startRealtime/stopRealtime to avoid loops

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refresh();
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval, refresh]);

  // Load additional data on mount
  useEffect(() => {
    if (autoLoad) {
      loadTrendingStreams();
      loadPopularCategories();
      
      if (user) {
        loadRecommendations();
      }
    }
  }, [autoLoad, user]); // Only run when autoLoad or user changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealtime();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    streams: state.streams,
    trendingStreams: state.trendingStreams,
    recommendations: state.recommendations,
    popularCategories: state.popularCategories,
    isLoading: state.isLoading,
    isLoadingMore: state.isLoadingMore,
    isRefreshing: state.isRefreshing,
    error: state.error,
    hasMore: state.hasMore,
    currentFilters: state.currentFilters,

    // Actions
    discoverStreams,
    searchStreams,
    filterByCategory,
    loadMore,
    refresh,
    loadTrendingStreams,
    loadRecommendations,
    loadPopularCategories,
    startRealtime,
    stopRealtime,
    updateFilters,
    clearFilters,
    clearError,
    getCachedStreams,

    // Computed values
    streamCount: state.streams.length,
    hasStreams: state.streams.length > 0,
    hasTrending: state.trendingStreams.length > 0,
    hasRecommendations: state.recommendations.length > 0,
    isActive: !state.isLoading && !state.error,
    isEmpty: !state.isLoading && state.streams.length === 0,

    // Categories
    availableCategories: state.popularCategories.map(cat => cat.category),
    topCategory: state.popularCategories[0]?.category || 'gaming'
  };
}

export default useStreamDiscovery;
