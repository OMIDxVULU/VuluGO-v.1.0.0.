/**
 * Performance Monitoring Service
 * Comprehensive monitoring for stream quality, connection stability, and performance metrics
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
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface PerformanceMetrics {
  id: string;
  sessionId: string;
  userId: string;
  streamId?: string;
  
  // Connection metrics
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number; // milliseconds
  jitter: number; // milliseconds
  packetLoss: number; // percentage
  bandwidth: {
    upload: number; // kbps
    download: number; // kbps
  };
  
  // Video metrics
  videoQuality: {
    resolution: string;
    frameRate: number;
    bitrate: number; // kbps
    codec: string;
  };
  
  // Audio metrics
  audioQuality: {
    bitrate: number; // kbps
    sampleRate: number; // Hz
    codec: string;
  };
  
  // Performance metrics
  cpuUsage: number; // percentage
  memoryUsage: number; // MB
  batteryLevel?: number; // percentage
  thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
  
  // User experience metrics
  bufferingEvents: number;
  reconnectionAttempts: number;
  errorCount: number;
  crashCount: number;
  
  // Timestamps
  timestamp: Timestamp;
  sessionDuration: number; // seconds
}

export interface StreamQualityReport {
  streamId: string;
  hostId: string;
  reportPeriod: {
    start: Timestamp;
    end: Timestamp;
  };
  
  // Aggregate metrics
  averageLatency: number;
  averageJitter: number;
  averagePacketLoss: number;
  averageConnectionQuality: number; // 1-4 scale
  
  // Quality distribution
  qualityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  
  // Issues detected
  majorIssues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: Timestamp;
    affectedUsers: number;
  }>;
  
  // Recommendations
  recommendations: Array<{
    category: 'network' | 'hardware' | 'settings' | 'infrastructure';
    priority: 'low' | 'medium' | 'high';
    description: string;
    impact: string;
  }>;
  
  createdAt: Timestamp;
}

export interface PerformanceAlert {
  id: string;
  type: 'latency_spike' | 'connection_drop' | 'quality_degradation' | 'resource_exhaustion' | 'error_rate_high';
  severity: 'warning' | 'critical';
  streamId?: string;
  userId?: string;
  message: string;
  metrics: any;
  acknowledged: boolean;
  resolvedAt?: Timestamp;
  createdAt: Timestamp;
}

class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private currentSession: string | null = null;
  private metricsBuffer: PerformanceMetrics[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private alertCount = 0;
  private lastAlertReset = Date.now();
  private readonly MAX_ALERTS_PER_MINUTE = 5;

  private constructor() {}

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Start performance monitoring session
   */
  async startMonitoring(streamId?: string): Promise<string> {
    try {
      if (this.isMonitoring) {
        console.warn('Performance monitoring already active');
        return this.currentSession!;
      }

      this.currentSession = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.isMonitoring = true;

      // Start collecting metrics
      this.startMetricsCollection();

      console.log(`✅ Performance monitoring started: ${this.currentSession}`);
      return this.currentSession;

    } catch (error: any) {
      console.error('Failed to start performance monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop performance monitoring session
   */
  async stopMonitoring(): Promise<void> {
    try {
      if (!this.isMonitoring) {
        return;
      }

      this.isMonitoring = false;

      // Stop metrics collection
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }

      // Flush remaining metrics
      await this.flushMetricsBuffer();

      this.currentSession = null;
      console.log('✅ Performance monitoring stopped');

    } catch (error: any) {
      console.error('Failed to stop performance monitoring:', error);
    }
  }

  /**
   * Record performance metrics
   */
  async recordMetrics(metrics: Partial<PerformanceMetrics>): Promise<void> {
    try {
      if (!this.currentSession || !auth.currentUser) {
        return;
      }

      const fullMetrics: PerformanceMetrics = {
        id: `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: this.currentSession,
        userId: auth.currentUser.uid,
        streamId: metrics.streamId,
        
        // Default values
        connectionQuality: 'good',
        latency: 0,
        jitter: 0,
        packetLoss: 0,
        bandwidth: { upload: 0, download: 0 },
        videoQuality: {
          resolution: '720p',
          frameRate: 30,
          bitrate: 1000,
          codec: 'H.264'
        },
        audioQuality: {
          bitrate: 128,
          sampleRate: 44100,
          codec: 'AAC'
        },
        cpuUsage: 0,
        memoryUsage: 0,
        bufferingEvents: 0,
        reconnectionAttempts: 0,
        errorCount: 0,
        crashCount: 0,
        timestamp: serverTimestamp() as Timestamp,
        sessionDuration: 0,
        
        // Override with provided metrics
        ...metrics
      };

      // Add to buffer
      this.metricsBuffer.push(fullMetrics);

      // Check for performance issues
      await this.checkPerformanceThresholds(fullMetrics);

      // Flush buffer if it's getting full
      if (this.metricsBuffer.length >= 50) {
        await this.flushMetricsBuffer();
      }

    } catch (error: any) {
      console.error('Failed to record metrics:', error);
    }
  }

  /**
   * Start automatic metrics collection
   */
  private startMetricsCollection(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectSystemMetrics();
        await this.recordMetrics(metrics);
      } catch (error) {
        console.error('Failed to collect system metrics:', error);
      }
    }, 30000); // Collect every 30 seconds (reduced from 5 seconds)
  }

  /**
   * Collect system performance metrics
   */
  private async collectSystemMetrics(): Promise<Partial<PerformanceMetrics>> {
    try {
      // This would integrate with actual system monitoring APIs
      // For now, return mock data with some realistic variations
      
      const baseLatency = 50 + Math.random() * 100;
      const connectionQuality = this.determineConnectionQuality(baseLatency);
      
      return {
        connectionQuality,
        latency: Math.round(baseLatency),
        jitter: Math.round(Math.random() * 20),
        packetLoss: Math.random() * 2, // 0-2%
        bandwidth: {
          upload: 1000 + Math.random() * 2000,
          download: 5000 + Math.random() * 10000
        },
        cpuUsage: 20 + Math.random() * 60,
        memoryUsage: 100 + Math.random() * 200,
        batteryLevel: 50 + Math.random() * 50,
        thermalState: Math.random() > 0.8 ? 'fair' : 'nominal',
        sessionDuration: this.currentSession ? 
          Math.floor((Date.now() - parseInt(this.currentSession.split('_')[1])) / 1000) : 0
      };

    } catch (error) {
      console.error('Failed to collect system metrics:', error);
      return {};
    }
  }

  /**
   * Determine connection quality based on metrics
   */
  private determineConnectionQuality(latency: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (latency < 50) return 'excellent';
    if (latency < 100) return 'good';
    if (latency < 200) return 'fair';
    return 'poor';
  }

  /**
   * Check performance thresholds and create alerts
   */
  private async checkPerformanceThresholds(metrics: PerformanceMetrics): Promise<void> {
    try {
      // Reset alert count every minute
      const now = Date.now();
      if (now - this.lastAlertReset > 60000) {
        this.alertCount = 0;
        this.lastAlertReset = now;
      }

      // Skip alert generation if we've hit the rate limit
      if (this.alertCount >= this.MAX_ALERTS_PER_MINUTE) {
        return;
      }

      const alerts: Omit<PerformanceAlert, 'id'>[] = [];

      // Check latency
      if (metrics.latency > 300) {
        alerts.push({
          type: 'latency_spike',
          severity: 'critical',
          streamId: metrics.streamId,
          userId: metrics.userId,
          message: `High latency detected: ${metrics.latency}ms`,
          metrics: { latency: metrics.latency },
          acknowledged: false,
          createdAt: serverTimestamp() as Timestamp
        });
      }

      // Check packet loss (increased threshold to reduce spam)
      if (metrics.packetLoss > 15) {
        alerts.push({
          type: 'connection_drop',
          severity: 'warning',
          streamId: metrics.streamId,
          userId: metrics.userId,
          message: `High packet loss: ${metrics.packetLoss.toFixed(1)}%`,
          metrics: { packetLoss: metrics.packetLoss },
          acknowledged: false,
          createdAt: serverTimestamp() as Timestamp
        });
      }

      // Check CPU usage (increased threshold to reduce spam)
      if (metrics.cpuUsage > 95) {
        alerts.push({
          type: 'resource_exhaustion',
          severity: 'warning',
          streamId: metrics.streamId,
          userId: metrics.userId,
          message: `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
          metrics: { cpuUsage: metrics.cpuUsage },
          acknowledged: false,
          createdAt: serverTimestamp() as Timestamp
        });
      }

      // Create alerts in Firestore
      if (alerts.length > 0) {
        this.alertCount += alerts.length;
        const batch = writeBatch(db);
        alerts.forEach(alert => {
          const alertRef = doc(collection(db, 'performanceAlerts'));
          batch.set(alertRef, alert);
        });
        await batch.commit();

        console.warn(`⚠️ Created ${alerts.length} performance alerts (${this.alertCount}/${this.MAX_ALERTS_PER_MINUTE} this minute)`);
      }

    } catch (error) {
      console.error('Failed to check performance thresholds:', error);
    }
  }

  /**
   * Flush metrics buffer to Firestore
   */
  private async flushMetricsBuffer(): Promise<void> {
    try {
      if (this.metricsBuffer.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      const metricsToFlush = [...this.metricsBuffer];
      this.metricsBuffer = [];

      metricsToFlush.forEach(metrics => {
        const metricsRef = doc(collection(db, 'performanceMetrics'));
        batch.set(metricsRef, metrics);
      });

      await batch.commit();
      console.log(`📊 Flushed ${metricsToFlush.length} performance metrics`);

    } catch (error) {
      console.error('Failed to flush metrics buffer:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...this.metricsBuffer);
    }
  }

  /**
   * Generate stream quality report
   */
  async generateStreamQualityReport(
    streamId: string,
    startTime: Date,
    endTime: Date
  ): Promise<StreamQualityReport> {
    try {
      const generateReport = httpsCallable(functions, 'generateStreamQualityReport');
      
      const result = await generateReport({
        streamId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

      const report = result.data as StreamQualityReport;
      console.log(`✅ Generated quality report for stream ${streamId}`);
      
      return report;

    } catch (error: any) {
      console.error('Failed to generate stream quality report:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for analysis
   */
  async getPerformanceMetrics(
    filters: {
      userId?: string;
      streamId?: string;
      sessionId?: string;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
    } = {}
  ): Promise<PerformanceMetrics[]> {
    try {
      let metricsQuery = collection(db, 'performanceMetrics');
      const constraints: any[] = [];

      if (filters.userId) {
        constraints.push(where('userId', '==', filters.userId));
      }

      if (filters.streamId) {
        constraints.push(where('streamId', '==', filters.streamId));
      }

      if (filters.sessionId) {
        constraints.push(where('sessionId', '==', filters.sessionId));
      }

      if (filters.startTime) {
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startTime)));
      }

      if (filters.endTime) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.endTime)));
      }

      constraints.push(orderBy('timestamp', 'desc'));
      constraints.push(limit(filters.limit || 100));

      const q = query(metricsQuery, ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PerformanceMetrics[];

    } catch (error: any) {
      console.error('Failed to get performance metrics:', error);
      return [];
    }
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(
    filters: {
      streamId?: string;
      userId?: string;
      severity?: 'warning' | 'critical';
      acknowledged?: boolean;
      limit?: number;
    } = {}
  ): Promise<PerformanceAlert[]> {
    try {
      let alertsQuery = collection(db, 'performanceAlerts');
      const constraints: any[] = [];

      if (filters.streamId) {
        constraints.push(where('streamId', '==', filters.streamId));
      }

      if (filters.userId) {
        constraints.push(where('userId', '==', filters.userId));
      }

      if (filters.severity) {
        constraints.push(where('severity', '==', filters.severity));
      }

      if (filters.acknowledged !== undefined) {
        constraints.push(where('acknowledged', '==', filters.acknowledged));
      }

      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(filters.limit || 50));

      const q = query(alertsQuery, ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PerformanceAlert[];

    } catch (error: any) {
      console.error('Failed to get performance alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge performance alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'performanceAlerts', alertId), {
        acknowledged: true,
        acknowledgedAt: serverTimestamp(),
        acknowledgedBy: auth.currentUser?.uid
      });

      console.log(`✅ Acknowledged alert: ${alertId}`);

    } catch (error: any) {
      console.error('Failed to acknowledge alert:', error);
      throw error;
    }
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary(
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    try {
      const now = new Date();
      let startTime: Date;

      switch (timeRange) {
        case 'hour':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const metrics = await this.getPerformanceMetrics({
        startTime,
        endTime: now,
        limit: 1000
      });

      if (metrics.length === 0) {
        return {
          timeRange,
          period: { start: startTime, end: now },
          summary: 'No data available',
          metrics: {}
        };
      }

      // Calculate averages
      const avgLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length;
      const avgJitter = metrics.reduce((sum, m) => sum + m.jitter, 0) / metrics.length;
      const avgPacketLoss = metrics.reduce((sum, m) => sum + m.packetLoss, 0) / metrics.length;
      const avgCpuUsage = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;

      // Quality distribution
      const qualityDistribution = metrics.reduce((acc, m) => {
        acc[m.connectionQuality] = (acc[m.connectionQuality] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        timeRange,
        period: { start: startTime, end: now },
        totalSamples: metrics.length,
        averages: {
          latency: Math.round(avgLatency),
          jitter: Math.round(avgJitter),
          packetLoss: Math.round(avgPacketLoss * 100) / 100,
          cpuUsage: Math.round(avgCpuUsage)
        },
        qualityDistribution,
        trends: {
          // Would calculate trends over time
          latencyTrend: 'stable',
          qualityTrend: 'improving'
        }
      };

    } catch (error: any) {
      console.error('Failed to get performance summary:', error);
      return null;
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSession(): string | null {
    return this.currentSession;
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.metricsBuffer = [];
    console.log('🧹 Performance Monitoring Service destroyed');
  }
}

export default PerformanceMonitoringService.getInstance();
