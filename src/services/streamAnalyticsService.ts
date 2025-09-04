/**
 * Stream Analytics Service
 * Comprehensive analytics for stream performance, engagement, and revenue tracking
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface StreamAnalytics {
  streamId: string;
  hostId: string;
  
  // Basic metrics
  totalViewers: number;
  peakViewers: number;
  averageViewers: number;
  totalWatchTime: number; // in seconds
  averageWatchTime: number; // in seconds
  
  // Engagement metrics
  totalMessages: number;
  totalReactions: number;
  totalGifts: number;
  engagementRate: number; // percentage
  chatParticipationRate: number; // percentage
  
  // Revenue metrics
  totalRevenue: number;
  averageRevenuePerViewer: number;
  topGifters: { userId: string; amount: number }[];
  
  // Performance metrics
  averageLatency: number; // in milliseconds
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  dropoutRate: number; // percentage
  
  // Time-based data
  viewerTimeline: { timestamp: Timestamp; count: number }[];
  engagementTimeline: { timestamp: Timestamp; messages: number; reactions: number }[];
  revenueTimeline: { timestamp: Timestamp; amount: number }[];
  
  // Geographic data
  viewersByRegion: { region: string; count: number }[];
  
  // Device/platform data
  viewersByPlatform: { platform: string; count: number }[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserAnalytics {
  userId: string;
  
  // Streaming stats (as host)
  totalStreams: number;
  totalStreamTime: number; // in seconds
  averageStreamDuration: number; // in seconds
  totalViewersAcrossStreams: number;
  averageViewersPerStream: number;
  
  // Viewing stats (as viewer)
  totalWatchTime: number; // in seconds
  streamsWatched: number;
  averageWatchDuration: number; // in seconds
  
  // Engagement stats
  messagesSent: number;
  reactionsSent: number;
  giftsReceived: number;
  giftsSent: number;
  
  // Revenue stats
  totalEarnings: number;
  totalSpent: number;
  
  // Growth metrics
  followerGrowth: { date: string; count: number }[];
  engagementGrowth: { date: string; rate: number }[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AnalyticsEvent {
  id: string;
  streamId: string;
  userId: string;
  eventType: 'view_start' | 'view_end' | 'message' | 'reaction' | 'gift' | 'follow' | 'share';
  eventData: any;
  timestamp: Timestamp;
  sessionId?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    region: string;
  };
}

export interface AnalyticsQuery {
  streamId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  eventTypes?: string[];
  limit?: number;
}

class StreamAnalyticsService {
  private static instance: StreamAnalyticsService;
  private analyticsBuffer: AnalyticsEvent[] = [];
  private flushInterval?: NodeJS.Timeout;

  private constructor() {
    this.startAnalyticsBuffer();
  }

  static getInstance(): StreamAnalyticsService {
    if (!StreamAnalyticsService.instance) {
      StreamAnalyticsService.instance = new StreamAnalyticsService();
    }
    return StreamAnalyticsService.instance;
  }

  /**
   * Track analytics event
   */
  async trackEvent(
    streamId: string,
    eventType: AnalyticsEvent['eventType'],
    eventData: any = {},
    sessionId?: string
  ): Promise<void> {
    try {
      if (!auth.currentUser) {
        return; // Skip tracking for unauthenticated users
      }

      const event: Omit<AnalyticsEvent, 'id'> = {
        streamId,
        userId: auth.currentUser.uid,
        eventType,
        eventData,
        timestamp: serverTimestamp() as Timestamp,
        sessionId,
        deviceInfo: {
          platform: 'mobile', // Would detect actual platform
          version: '1.0.0',
          region: 'US' // Would detect actual region
        }
      };

      // Add to buffer for batch processing
      this.analyticsBuffer.push(event as AnalyticsEvent);

      // If buffer is full, flush immediately
      if (this.analyticsBuffer.length >= 50) {
        await this.flushAnalyticsBuffer();
      }

    } catch (error) {
      console.warn('Failed to track analytics event:', error);
    }
  }

  /**
   * Get stream analytics
   */
  async getStreamAnalytics(streamId: string): Promise<StreamAnalytics | null> {
    try {
      const analyticsDoc = await doc(db, 'streamAnalytics', streamId).get();
      
      if (!analyticsDoc.exists()) {
        // Generate analytics if not exists
        return await this.generateStreamAnalytics(streamId);
      }

      return {
        streamId,
        ...analyticsDoc.data()
      } as StreamAnalytics;

    } catch (error: any) {
      console.error('Failed to get stream analytics:', error);
      return null;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
    try {
      const analyticsDoc = await doc(db, 'userAnalytics', userId).get();
      
      if (!analyticsDoc.exists()) {
        // Generate analytics if not exists
        return await this.generateUserAnalytics(userId);
      }

      return {
        userId,
        ...analyticsDoc.data()
      } as UserAnalytics;

    } catch (error: any) {
      console.error('Failed to get user analytics:', error);
      return null;
    }
  }

  /**
   * Get analytics events
   */
  async getAnalyticsEvents(queryParams: AnalyticsQuery): Promise<AnalyticsEvent[]> {
    try {
      let eventsQuery = collection(db, 'analyticsEvents');
      const constraints: any[] = [];

      if (queryParams.streamId) {
        constraints.push(where('streamId', '==', queryParams.streamId));
      }

      if (queryParams.userId) {
        constraints.push(where('userId', '==', queryParams.userId));
      }

      if (queryParams.eventTypes && queryParams.eventTypes.length > 0) {
        constraints.push(where('eventType', 'in', queryParams.eventTypes));
      }

      if (queryParams.startDate) {
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(queryParams.startDate)));
      }

      if (queryParams.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(queryParams.endDate)));
      }

      constraints.push(orderBy('timestamp', 'desc'));
      constraints.push(limit(queryParams.limit || 100));

      const q = query(eventsQuery, ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalyticsEvent[];

    } catch (error: any) {
      console.error('Failed to get analytics events:', error);
      return [];
    }
  }

  /**
   * Get real-time stream metrics
   */
  async getRealTimeMetrics(streamId: string): Promise<any> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent events
      const recentEvents = await this.getAnalyticsEvents({
        streamId,
        startDate: oneHourAgo,
        endDate: now,
        limit: 1000
      });

      // Calculate real-time metrics
      const currentViewers = this.calculateCurrentViewers(recentEvents);
      const engagementRate = this.calculateEngagementRate(recentEvents);
      const revenueRate = this.calculateRevenueRate(recentEvents);

      return {
        currentViewers,
        engagementRate,
        revenueRate,
        totalEvents: recentEvents.length,
        lastUpdated: now
      };

    } catch (error: any) {
      console.error('Failed to get real-time metrics:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateAnalyticsReport(
    streamId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      const events = await this.getAnalyticsEvents({
        streamId,
        startDate,
        endDate,
        limit: 10000
      });

      const report = {
        streamId,
        period: {
          start: startDate || new Date(0),
          end: endDate || new Date()
        },
        
        // Viewer metrics
        viewerMetrics: this.calculateViewerMetrics(events),
        
        // Engagement metrics
        engagementMetrics: this.calculateEngagementMetrics(events),
        
        // Revenue metrics
        revenueMetrics: this.calculateRevenueMetrics(events),
        
        // Timeline data
        timelineData: this.generateTimelineData(events),
        
        // Geographic data
        geographicData: this.generateGeographicData(events),
        
        // Platform data
        platformData: this.generatePlatformData(events),
        
        generatedAt: new Date()
      };

      return report;

    } catch (error: any) {
      console.error('Failed to generate analytics report:', error);
      return null;
    }
  }

  /**
   * Update stream analytics in real-time
   */
  async updateStreamAnalytics(streamId: string, updates: Partial<StreamAnalytics>): Promise<void> {
    try {
      const analyticsRef = doc(db, 'streamAnalytics', streamId);
      
      await updateDoc(analyticsRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.warn('Failed to update stream analytics:', error);
    }
  }

  /**
   * Generate stream analytics from events
   */
  private async generateStreamAnalytics(streamId: string): Promise<StreamAnalytics> {
    try {
      const events = await this.getAnalyticsEvents({ streamId, limit: 10000 });
      
      const analytics: StreamAnalytics = {
        streamId,
        hostId: '', // Would get from stream data
        
        // Basic metrics
        totalViewers: this.calculateTotalViewers(events),
        peakViewers: this.calculatePeakViewers(events),
        averageViewers: this.calculateAverageViewers(events),
        totalWatchTime: this.calculateTotalWatchTime(events),
        averageWatchTime: this.calculateAverageWatchTime(events),
        
        // Engagement metrics
        totalMessages: events.filter(e => e.eventType === 'message').length,
        totalReactions: events.filter(e => e.eventType === 'reaction').length,
        totalGifts: events.filter(e => e.eventType === 'gift').length,
        engagementRate: this.calculateEngagementRate(events),
        chatParticipationRate: this.calculateChatParticipationRate(events),
        
        // Revenue metrics
        totalRevenue: this.calculateTotalRevenue(events),
        averageRevenuePerViewer: 0, // Would calculate
        topGifters: this.calculateTopGifters(events),
        
        // Performance metrics
        averageLatency: 150, // Would calculate from connection data
        connectionQuality: 'good',
        dropoutRate: this.calculateDropoutRate(events),
        
        // Timeline data
        viewerTimeline: this.generateViewerTimeline(events),
        engagementTimeline: this.generateEngagementTimeline(events),
        revenueTimeline: this.generateRevenueTimeline(events),
        
        // Geographic and platform data
        viewersByRegion: this.generateGeographicData(events),
        viewersByPlatform: this.generatePlatformData(events),
        
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      // Save generated analytics
      await doc(db, 'streamAnalytics', streamId).set(analytics);
      
      return analytics;

    } catch (error: any) {
      console.error('Failed to generate stream analytics:', error);
      throw error;
    }
  }

  /**
   * Generate user analytics from events
   */
  private async generateUserAnalytics(userId: string): Promise<UserAnalytics> {
    try {
      const events = await this.getAnalyticsEvents({ userId, limit: 10000 });
      
      const analytics: UserAnalytics = {
        userId,
        
        // Streaming stats
        totalStreams: 0, // Would calculate from stream data
        totalStreamTime: 0,
        averageStreamDuration: 0,
        totalViewersAcrossStreams: 0,
        averageViewersPerStream: 0,
        
        // Viewing stats
        totalWatchTime: this.calculateUserWatchTime(events),
        streamsWatched: this.calculateStreamsWatched(events),
        averageWatchDuration: 0,
        
        // Engagement stats
        messagesSent: events.filter(e => e.eventType === 'message').length,
        reactionsSent: events.filter(e => e.eventType === 'reaction').length,
        giftsReceived: 0, // Would calculate
        giftsSent: events.filter(e => e.eventType === 'gift').length,
        
        // Revenue stats
        totalEarnings: 0, // Would calculate
        totalSpent: this.calculateUserSpending(events),
        
        // Growth metrics
        followerGrowth: [],
        engagementGrowth: [],
        
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      // Save generated analytics
      await doc(db, 'userAnalytics', userId).set(analytics);
      
      return analytics;

    } catch (error: any) {
      console.error('Failed to generate user analytics:', error);
      throw error;
    }
  }

  /**
   * Start analytics buffer for batch processing
   */
  private startAnalyticsBuffer(): void {
    // Flush buffer every 30 seconds
    this.flushInterval = setInterval(() => {
      if (this.analyticsBuffer.length > 0) {
        this.flushAnalyticsBuffer();
      }
    }, 30000);
  }

  /**
   * Flush analytics buffer to Firestore
   */
  private async flushAnalyticsBuffer(): Promise<void> {
    try {
      if (this.analyticsBuffer.length === 0) return;

      const batch = db.batch();
      const eventsToFlush = [...this.analyticsBuffer];
      this.analyticsBuffer = [];

      eventsToFlush.forEach(event => {
        const eventRef = doc(collection(db, 'analyticsEvents'));
        batch.set(eventRef, event);
      });

      await batch.commit();
      console.log(`✅ Flushed ${eventsToFlush.length} analytics events`);

    } catch (error) {
      console.error('Failed to flush analytics buffer:', error);
      // Re-add events to buffer for retry
      this.analyticsBuffer.unshift(...this.analyticsBuffer);
    }
  }

  // Helper calculation methods
  private calculateCurrentViewers(events: AnalyticsEvent[]): number {
    const viewStarts = events.filter(e => e.eventType === 'view_start');
    const viewEnds = events.filter(e => e.eventType === 'view_end');
    return Math.max(0, viewStarts.length - viewEnds.length);
  }

  private calculateEngagementRate(events: AnalyticsEvent[]): number {
    const totalViewers = this.calculateTotalViewers(events);
    const engagementEvents = events.filter(e => 
      ['message', 'reaction', 'gift'].includes(e.eventType)
    );
    return totalViewers > 0 ? (engagementEvents.length / totalViewers) * 100 : 0;
  }

  private calculateRevenueRate(events: AnalyticsEvent[]): number {
    const giftEvents = events.filter(e => e.eventType === 'gift');
    return giftEvents.reduce((sum, event) => sum + (event.eventData.value || 0), 0);
  }

  private calculateTotalViewers(events: AnalyticsEvent[]): number {
    const uniqueViewers = new Set(
      events.filter(e => e.eventType === 'view_start').map(e => e.userId)
    );
    return uniqueViewers.size;
  }

  private calculatePeakViewers(events: AnalyticsEvent[]): number {
    // Would implement timeline-based peak calculation
    return this.calculateTotalViewers(events);
  }

  private calculateAverageViewers(events: AnalyticsEvent[]): number {
    // Would implement time-weighted average
    return Math.floor(this.calculateTotalViewers(events) * 0.7);
  }

  private calculateTotalWatchTime(events: AnalyticsEvent[]): number {
    // Would calculate from view_start/view_end pairs
    return events.filter(e => e.eventType === 'view_start').length * 300; // 5 min average
  }

  private calculateAverageWatchTime(events: AnalyticsEvent[]): number {
    const totalViewers = this.calculateTotalViewers(events);
    const totalWatchTime = this.calculateTotalWatchTime(events);
    return totalViewers > 0 ? totalWatchTime / totalViewers : 0;
  }

  private calculateChatParticipationRate(events: AnalyticsEvent[]): number {
    const totalViewers = this.calculateTotalViewers(events);
    const chatters = new Set(
      events.filter(e => e.eventType === 'message').map(e => e.userId)
    );
    return totalViewers > 0 ? (chatters.size / totalViewers) * 100 : 0;
  }

  private calculateTotalRevenue(events: AnalyticsEvent[]): number {
    return events
      .filter(e => e.eventType === 'gift')
      .reduce((sum, event) => sum + (event.eventData.value || 0), 0);
  }

  private calculateTopGifters(events: AnalyticsEvent[]): { userId: string; amount: number }[] {
    const gifterMap = new Map<string, number>();
    
    events.filter(e => e.eventType === 'gift').forEach(event => {
      const current = gifterMap.get(event.userId) || 0;
      gifterMap.set(event.userId, current + (event.eventData.value || 0));
    });

    return Array.from(gifterMap.entries())
      .map(([userId, amount]) => ({ userId, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }

  private calculateDropoutRate(events: AnalyticsEvent[]): number {
    const viewStarts = events.filter(e => e.eventType === 'view_start').length;
    const viewEnds = events.filter(e => e.eventType === 'view_end').length;
    return viewStarts > 0 ? (viewEnds / viewStarts) * 100 : 0;
  }

  private generateViewerTimeline(events: AnalyticsEvent[]): { timestamp: Timestamp; count: number }[] {
    // Would generate timeline data
    return [];
  }

  private generateEngagementTimeline(events: AnalyticsEvent[]): { timestamp: Timestamp; messages: number; reactions: number }[] {
    // Would generate engagement timeline
    return [];
  }

  private generateRevenueTimeline(events: AnalyticsEvent[]): { timestamp: Timestamp; amount: number }[] {
    // Would generate revenue timeline
    return [];
  }

  private generateGeographicData(events: AnalyticsEvent[]): { region: string; count: number }[] {
    const regionMap = new Map<string, number>();
    
    events.forEach(event => {
      const region = event.deviceInfo?.region || 'Unknown';
      regionMap.set(region, (regionMap.get(region) || 0) + 1);
    });

    return Array.from(regionMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);
  }

  private generatePlatformData(events: AnalyticsEvent[]): { platform: string; count: number }[] {
    const platformMap = new Map<string, number>();
    
    events.forEach(event => {
      const platform = event.deviceInfo?.platform || 'Unknown';
      platformMap.set(platform, (platformMap.get(platform) || 0) + 1);
    });

    return Array.from(platformMap.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateViewerMetrics(events: AnalyticsEvent[]): any {
    return {
      total: this.calculateTotalViewers(events),
      peak: this.calculatePeakViewers(events),
      average: this.calculateAverageViewers(events)
    };
  }

  private calculateEngagementMetrics(events: AnalyticsEvent[]): any {
    return {
      rate: this.calculateEngagementRate(events),
      messages: events.filter(e => e.eventType === 'message').length,
      reactions: events.filter(e => e.eventType === 'reaction').length
    };
  }

  private calculateRevenueMetrics(events: AnalyticsEvent[]): any {
    return {
      total: this.calculateTotalRevenue(events),
      gifts: events.filter(e => e.eventType === 'gift').length
    };
  }

  private generateTimelineData(events: AnalyticsEvent[]): any {
    return {
      viewers: this.generateViewerTimeline(events),
      engagement: this.generateEngagementTimeline(events),
      revenue: this.generateRevenueTimeline(events)
    };
  }

  private calculateUserWatchTime(events: AnalyticsEvent[]): number {
    // Would calculate from view events
    return events.filter(e => e.eventType === 'view_start').length * 300;
  }

  private calculateStreamsWatched(events: AnalyticsEvent[]): number {
    const uniqueStreams = new Set(
      events.filter(e => e.eventType === 'view_start').map(e => e.streamId)
    );
    return uniqueStreams.size;
  }

  private calculateUserSpending(events: AnalyticsEvent[]): number {
    return events
      .filter(e => e.eventType === 'gift')
      .reduce((sum, event) => sum + (event.eventData.value || 0), 0);
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Flush remaining events
    if (this.analyticsBuffer.length > 0) {
      this.flushAnalyticsBuffer();
    }

    this.analyticsBuffer = [];
    console.log('🧹 Stream Analytics Service destroyed');
  }
}

export default StreamAnalyticsService.getInstance();
