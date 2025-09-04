/**
 * Stream Discovery Service
 * Handles stream browsing, search, filtering, and recommendations
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Stream, StreamCategory } from './firestoreService';

export interface StreamDiscoveryFilters {
  category?: StreamCategory;
  isLive?: boolean;
  minViewers?: number;
  maxViewers?: number;
  tags?: string[];
  hostId?: string;
  searchQuery?: string;
  sortBy?: 'viewers' | 'recent' | 'duration' | 'popular';
  sortOrder?: 'asc' | 'desc';
}

export interface StreamDiscoveryOptions {
  limit?: number;
  offset?: number;
  realtime?: boolean;
}

export interface DiscoveredStream {
  id: string;
  title: string;
  description?: string;
  category: StreamCategory;
  tags: string[];
  thumbnailUrl?: string;
  
  // Host information
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  
  // Stream status
  isActive: boolean;
  viewerCount: number;
  maxViewers: number;
  duration: number; // in milliseconds
  
  // Timestamps
  startedAt: Date;
  lastActivity: Date;
  
  // Engagement metrics
  totalMessages: number;
  totalReactions: number;
  
  // Computed fields
  isPopular: boolean;
  isNew: boolean;
  engagementScore: number;
}

export interface StreamRecommendation {
  stream: DiscoveredStream;
  reason: 'similar_category' | 'popular_host' | 'trending' | 'friend_watching' | 'new_streamer';
  score: number;
}

class StreamDiscoveryService {
  private static instance: StreamDiscoveryService;
  private discoveryCache = new Map<string, DiscoveredStream[]>();
  private realtimeListeners = new Map<string, () => void>();
  private trendingStreams: DiscoveredStream[] = [];
  private popularCategories: { category: StreamCategory; count: number }[] = [];

  private constructor() {
    this.startTrendingAnalysis();
  }

  static getInstance(): StreamDiscoveryService {
    if (!StreamDiscoveryService.instance) {
      StreamDiscoveryService.instance = new StreamDiscoveryService();
    }
    return StreamDiscoveryService.instance;
  }

  /**
   * Discover streams based on filters and options
   */
  async discoverStreams(
    filters: StreamDiscoveryFilters = {},
    options: StreamDiscoveryOptions = {}
  ): Promise<DiscoveredStream[]> {
    try {
      const {
        category,
        isLive = true,
        minViewers,
        maxViewers,
        tags,
        searchQuery,
        sortBy = 'viewers',
        sortOrder = 'desc'
      } = filters;

      const {
        limit: queryLimit = 20,
        realtime = false
      } = options;

      console.log('🔍 Discovering streams with filters:', filters);

      // Build Firestore query
      let streamQuery = collection(db, 'streams');
      const constraints: any[] = [];

      // Basic filters
      if (isLive !== undefined) {
        constraints.push(where('isActive', '==', isLive));
      }

      if (category) {
        constraints.push(where('category', '==', category));
      }

      if (minViewers !== undefined) {
        constraints.push(where('viewerCount', '>=', minViewers));
      }

      if (maxViewers !== undefined) {
        constraints.push(where('viewerCount', '<=', maxViewers));
      }

      // Sorting
      let orderByField = 'viewerCount';
      switch (sortBy) {
        case 'recent':
          orderByField = 'startedAt';
          break;
        case 'duration':
          orderByField = 'startedAt';
          break;
        case 'popular':
          orderByField = 'maxViewers';
          break;
        default:
          orderByField = 'viewerCount';
      }

      constraints.push(orderBy(orderByField, sortOrder));
      constraints.push(limit(queryLimit));

      // Execute query
      const q = query(streamQuery, ...constraints);
      const snapshot = await getDocs(q);

      let streams = snapshot.docs.map(doc => {
        const data = doc.data() as Stream;
        return this.transformToDiscoveredStream(data);
      });

      // Apply client-side filters that can't be done in Firestore
      if (searchQuery) {
        streams = this.filterBySearch(streams, searchQuery);
      }

      if (tags && tags.length > 0) {
        streams = this.filterByTags(streams, tags);
      }

      // Calculate engagement scores
      streams = streams.map(stream => ({
        ...stream,
        engagementScore: this.calculateEngagementScore(stream)
      }));

      // Cache results
      const cacheKey = this.generateCacheKey(filters, options);
      this.discoveryCache.set(cacheKey, streams);

      console.log(`✅ Discovered ${streams.length} streams`);
      return streams;

    } catch (error: any) {
      console.error('Failed to discover streams:', error);
      throw new Error(`Stream discovery failed: ${error.message}`);
    }
  }

  /**
   * Search streams by text query
   */
  async searchStreams(
    searchQuery: string,
    options: StreamDiscoveryOptions = {}
  ): Promise<DiscoveredStream[]> {
    return this.discoverStreams(
      { searchQuery, isLive: true },
      options
    );
  }

  /**
   * Get streams by category
   */
  async getStreamsByCategory(
    category: StreamCategory,
    options: StreamDiscoveryOptions = {}
  ): Promise<DiscoveredStream[]> {
    return this.discoverStreams(
      { category, isLive: true },
      options
    );
  }

  /**
   * Get trending streams
   */
  async getTrendingStreams(limit: number = 10): Promise<DiscoveredStream[]> {
    try {
      // Get streams with high engagement in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const streams = await this.discoverStreams({
        isLive: true,
        sortBy: 'popular'
      }, { limit: limit * 2 });

      // Filter for recently active streams and sort by engagement
      const trendingStreams = streams
        .filter(stream => stream.lastActivity > oneHourAgo)
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit);

      this.trendingStreams = trendingStreams;
      return trendingStreams;

    } catch (error: any) {
      console.error('Failed to get trending streams:', error);
      return [];
    }
  }

  /**
   * Get recommended streams for a user
   */
  async getRecommendedStreams(
    userId: string,
    limit: number = 10
  ): Promise<StreamRecommendation[]> {
    try {
      console.log(`🎯 Getting recommendations for user: ${userId}`);

      const recommendations: StreamRecommendation[] = [];
      
      // Get user's viewing history and preferences
      // This would be implemented based on user data
      
      // For now, provide basic recommendations
      const allStreams = await this.discoverStreams({
        isLive: true
      }, { limit: 50 });

      // Recommend popular streams
      const popularStreams = allStreams
        .filter(stream => stream.isPopular)
        .slice(0, Math.floor(limit / 2));

      popularStreams.forEach(stream => {
        recommendations.push({
          stream,
          reason: 'trending',
          score: stream.engagementScore
        });
      });

      // Recommend new streamers
      const newStreams = allStreams
        .filter(stream => stream.isNew)
        .slice(0, Math.floor(limit / 2));

      newStreams.forEach(stream => {
        recommendations.push({
          stream,
          reason: 'new_streamer',
          score: stream.engagementScore * 0.8
        });
      });

      // Sort by score and limit
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error: any) {
      console.error('Failed to get recommended streams:', error);
      return [];
    }
  }

  /**
   * Get popular categories
   */
  async getPopularCategories(): Promise<{ category: StreamCategory; count: number; streams: DiscoveredStream[] }[]> {
    try {
      const categories: StreamCategory[] = ['gaming', 'music', 'talk', 'education', 'entertainment', 'other'];
      const categoryData = [];

      for (const category of categories) {
        const streams = await this.getStreamsByCategory(category, { limit: 5 });
        categoryData.push({
          category,
          count: streams.length,
          streams
        });
      }

      // Sort by stream count
      return categoryData.sort((a, b) => b.count - a.count);

    } catch (error: any) {
      console.error('Failed to get popular categories:', error);
      return [];
    }
  }

  /**
   * Start real-time discovery updates
   */
  startRealtimeDiscovery(
    filters: StreamDiscoveryFilters,
    callback: (streams: DiscoveredStream[]) => void,
    options: StreamDiscoveryOptions = {}
  ): () => void {
    const cacheKey = this.generateCacheKey(filters, options);
    
    // Stop existing listener if any
    this.stopRealtimeDiscovery(cacheKey);

    console.log('🔄 Starting real-time discovery:', cacheKey);

    // Build query (similar to discoverStreams but with onSnapshot)
    let streamQuery = collection(db, 'streams');
    const constraints: any[] = [];

    if (filters.isLive !== undefined) {
      constraints.push(where('isActive', '==', filters.isLive));
    }

    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }

    constraints.push(orderBy('viewerCount', 'desc'));
    constraints.push(limit(options.limit || 20));

    const q = query(streamQuery, ...constraints);
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let streams = snapshot.docs.map(doc => {
          const data = doc.data() as Stream;
          return this.transformToDiscoveredStream(data);
        });

        // Apply client-side filters
        if (filters.searchQuery) {
          streams = this.filterBySearch(streams, filters.searchQuery);
        }

        if (filters.tags && filters.tags.length > 0) {
          streams = this.filterByTags(streams, filters.tags);
        }

        // Calculate engagement scores
        streams = streams.map(stream => ({
          ...stream,
          engagementScore: this.calculateEngagementScore(stream)
        }));

        // Update cache
        this.discoveryCache.set(cacheKey, streams);

        // Notify callback
        callback(streams);
      },
      (error) => {
        console.error('Real-time discovery error:', error);
      }
    );

    this.realtimeListeners.set(cacheKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Stop real-time discovery updates
   */
  stopRealtimeDiscovery(cacheKey: string): void {
    const unsubscribe = this.realtimeListeners.get(cacheKey);
    if (unsubscribe) {
      unsubscribe();
      this.realtimeListeners.delete(cacheKey);
      console.log('🛑 Stopped real-time discovery:', cacheKey);
    }
  }

  /**
   * Get cached discovery results
   */
  getCachedStreams(filters: StreamDiscoveryFilters, options: StreamDiscoveryOptions = {}): DiscoveredStream[] | null {
    const cacheKey = this.generateCacheKey(filters, options);
    return this.discoveryCache.get(cacheKey) || null;
  }

  /**
   * Clear discovery cache
   */
  clearCache(): void {
    this.discoveryCache.clear();
    console.log('🗑️ Discovery cache cleared');
  }

  /**
   * Transform Stream to DiscoveredStream
   */
  private transformToDiscoveredStream(stream: Stream): DiscoveredStream {
    const now = Date.now();
    const startTime = stream.startedAt.toMillis();
    const duration = now - startTime;
    const isNew = duration < 30 * 60 * 1000; // Less than 30 minutes old
    const isPopular = stream.viewerCount > 10 || stream.maxViewers > 20;

    return {
      id: stream.id,
      title: stream.title,
      description: stream.description,
      category: stream.category,
      tags: stream.tags || [],
      thumbnailUrl: stream.thumbnailUrl,
      hostId: stream.hostId,
      hostName: stream.hostName,
      hostAvatar: stream.hostAvatar,
      isActive: stream.isActive,
      viewerCount: stream.viewerCount,
      maxViewers: stream.maxViewers,
      duration,
      startedAt: stream.startedAt.toDate(),
      lastActivity: stream.lastActivity.toDate(),
      totalMessages: stream.totalMessages,
      totalReactions: stream.totalReactions,
      isPopular,
      isNew,
      engagementScore: 0 // Will be calculated later
    };
  }

  /**
   * Filter streams by search query
   */
  private filterBySearch(streams: DiscoveredStream[], searchQuery: string): DiscoveredStream[] {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return streams;

    return streams.filter(stream => 
      stream.title.toLowerCase().includes(query) ||
      stream.description?.toLowerCase().includes(query) ||
      stream.hostName.toLowerCase().includes(query) ||
      stream.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  /**
   * Filter streams by tags
   */
  private filterByTags(streams: DiscoveredStream[], tags: string[]): DiscoveredStream[] {
    return streams.filter(stream =>
      tags.some(tag => 
        stream.tags.some(streamTag => 
          streamTag.toLowerCase().includes(tag.toLowerCase())
        )
      )
    );
  }

  /**
   * Calculate engagement score for a stream
   */
  private calculateEngagementScore(stream: DiscoveredStream): number {
    const viewerWeight = 0.4;
    const messageWeight = 0.3;
    const reactionWeight = 0.2;
    const durationWeight = 0.1;

    const viewerScore = Math.min(stream.viewerCount / 100, 1) * viewerWeight;
    const messageScore = Math.min(stream.totalMessages / 1000, 1) * messageWeight;
    const reactionScore = Math.min(stream.totalReactions / 500, 1) * reactionWeight;
    const durationScore = Math.min(stream.duration / (2 * 60 * 60 * 1000), 1) * durationWeight;

    return (viewerScore + messageScore + reactionScore + durationScore) * 100;
  }

  /**
   * Generate cache key for filters and options
   */
  private generateCacheKey(filters: StreamDiscoveryFilters, options: StreamDiscoveryOptions): string {
    return JSON.stringify({ filters, options });
  }

  /**
   * Start trending analysis (runs periodically)
   */
  private startTrendingAnalysis(): void {
    // Update trending streams every 5 minutes
    setInterval(async () => {
      try {
        await this.getTrendingStreams();
        console.log('📈 Updated trending streams');
      } catch (error) {
        console.error('Failed to update trending streams:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    // Stop all real-time listeners
    this.realtimeListeners.forEach((unsubscribe) => {
      unsubscribe();
    });

    // Clear all caches
    this.discoveryCache.clear();
    this.realtimeListeners.clear();
    this.trendingStreams = [];
    this.popularCategories = [];

    console.log('🧹 Stream Discovery Service destroyed');
  }
}

export default StreamDiscoveryService.getInstance();
