/**
 * Performance Monitor Service for VuluGO
 * Monitors and optimizes live streaming performance
 */

export interface PerformanceMetrics {
  timestamp: number;
  
  // Audio metrics
  audioLatency: number;
  audioPacketLoss: number;
  audioQuality: number;
  
  // Video metrics (if enabled)
  videoLatency?: number;
  videoPacketLoss?: number;
  videoFrameRate?: number;
  videoBitrate?: number;
  
  // Network metrics
  networkLatency: number;
  networkBandwidth: number;
  networkJitter: number;
  
  // System metrics
  cpuUsage: number;
  memoryUsage: number;
  batteryLevel?: number;
  
  // Stream metrics
  participantCount: number;
  streamDuration: number;
  reconnectionCount: number;
}

export interface PerformanceThresholds {
  maxAudioLatency: number;
  maxVideoLatency: number;
  maxPacketLoss: number;
  minAudioQuality: number;
  maxCpuUsage: number;
  maxMemoryUsage: number;
  minBatteryLevel: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  timestamp: number;
  message: string;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private defaultThresholds: PerformanceThresholds = {
    maxAudioLatency: 150, // ms
    maxVideoLatency: 200, // ms
    maxPacketLoss: 5, // %
    minAudioQuality: 70, // %
    maxCpuUsage: 80, // %
    maxMemoryUsage: 85, // %
    minBatteryLevel: 20, // %
  };

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 60000): void { // Increased default from 5s to 60s
    if (this.isMonitoring) {
      console.warn('⚠️ [PERF_MONITOR] Already monitoring');
      return;
    }

    console.log('📊 [PERF_MONITOR] Starting performance monitoring');
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('📊 [PERF_MONITOR] Stopping performance monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Collect current performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        
        // Mock metrics - in real implementation, these would come from:
        // - Agora SDK statistics
        // - React Native performance APIs
        // - Device information APIs
        audioLatency: this.getRandomMetric(50, 200),
        audioPacketLoss: this.getRandomMetric(0, 10),
        audioQuality: this.getRandomMetric(60, 100),
        
        networkLatency: this.getRandomMetric(20, 150),
        networkBandwidth: this.getRandomMetric(1000, 10000), // kbps
        networkJitter: this.getRandomMetric(5, 50),
        
        cpuUsage: this.getRandomMetric(30, 90),
        memoryUsage: this.getRandomMetric(40, 95),
        batteryLevel: this.getRandomMetric(15, 100),
        
        participantCount: 0, // Will be updated by stream service
        streamDuration: 0, // Will be updated by stream service
        reconnectionCount: 0, // Will be updated by recovery service
      };

      // Add video metrics if video is enabled
      // This would be determined by checking Agora service state
      if (Math.random() > 0.5) { // Mock condition
        metrics.videoLatency = this.getRandomMetric(80, 300);
        metrics.videoPacketLoss = this.getRandomMetric(0, 15);
        metrics.videoFrameRate = this.getRandomMetric(15, 30);
        metrics.videoBitrate = this.getRandomMetric(500, 2000); // kbps
      }

      this.metrics.push(metrics);

      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

      // Check thresholds and generate alerts
      this.checkThresholds(metrics);

    } catch (error) {
      console.error('❌ [PERF_MONITOR] Error collecting metrics:', error);
    }
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const checks = [
      {
        metric: 'audioLatency' as keyof PerformanceMetrics,
        value: metrics.audioLatency,
        threshold: this.defaultThresholds.maxAudioLatency,
        condition: (v: number, t: number) => v > t,
        message: `Audio latency is high: ${metrics.audioLatency}ms`,
      },
      {
        metric: 'audioPacketLoss' as keyof PerformanceMetrics,
        value: metrics.audioPacketLoss,
        threshold: this.defaultThresholds.maxPacketLoss,
        condition: (v: number, t: number) => v > t,
        message: `Audio packet loss is high: ${metrics.audioPacketLoss}%`,
      },
      {
        metric: 'cpuUsage' as keyof PerformanceMetrics,
        value: metrics.cpuUsage,
        threshold: this.defaultThresholds.maxCpuUsage,
        condition: (v: number, t: number) => v > t,
        message: `CPU usage is high: ${metrics.cpuUsage}%`,
      },
      {
        metric: 'memoryUsage' as keyof PerformanceMetrics,
        value: metrics.memoryUsage,
        threshold: this.defaultThresholds.maxMemoryUsage,
        condition: (v: number, t: number) => v > t,
        message: `Memory usage is high: ${metrics.memoryUsage}%`,
      },
    ];

    for (const check of checks) {
      if (check.condition(check.value, check.threshold)) {
        const alertType = check.value > check.threshold * 1.2 ? 'critical' : 'warning';
        
        this.addAlert({
          type: alertType,
          metric: check.metric,
          value: check.value,
          threshold: check.threshold,
          timestamp: Date.now(),
          message: check.message,
        });
      }
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(alert: PerformanceAlert): void {
    // Avoid duplicate alerts within 30 seconds
    const recentAlert = this.alerts.find(a => 
      a.metric === alert.metric && 
      Date.now() - a.timestamp < 30000
    );

    if (!recentAlert) {
      this.alerts.push(alert);
      console.warn(`⚠️ [PERF_MONITOR] ${alert.type.toUpperCase()}: ${alert.message}`);

      // Keep only last 50 alerts
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(-50);
      }
    }
  }

  /**
   * Update stream-specific metrics
   */
  updateStreamMetrics(participantCount: number, streamDuration: number, reconnectionCount: number): void {
    if (this.metrics.length > 0) {
      const latest = this.metrics[this.metrics.length - 1];
      latest.participantCount = participantCount;
      latest.streamDuration = streamDuration;
      latest.reconnectionCount = reconnectionCount;
    }
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(): {
    current: PerformanceMetrics | null;
    average: Partial<PerformanceMetrics>;
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const current = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 300000); // Last 5 minutes

    // Calculate averages from last 10 metrics
    const recentMetrics = this.metrics.slice(-10);
    const average: Partial<PerformanceMetrics> = {};

    if (recentMetrics.length > 0) {
      average.audioLatency = this.calculateAverage(recentMetrics, 'audioLatency');
      average.audioPacketLoss = this.calculateAverage(recentMetrics, 'audioPacketLoss');
      average.networkLatency = this.calculateAverage(recentMetrics, 'networkLatency');
      average.cpuUsage = this.calculateAverage(recentMetrics, 'cpuUsage');
      average.memoryUsage = this.calculateAverage(recentMetrics, 'memoryUsage');
    }

    const recommendations = this.generateRecommendations(current, recentAlerts);

    return {
      current,
      average,
      alerts: recentAlerts,
      recommendations,
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(current: PerformanceMetrics | null, alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];

    if (!current) return recommendations;

    // High latency recommendations
    if (current.audioLatency > this.defaultThresholds.maxAudioLatency) {
      recommendations.push('Consider switching to audio-only mode to reduce latency');
    }

    // High CPU usage recommendations
    if (current.cpuUsage > this.defaultThresholds.maxCpuUsage) {
      recommendations.push('Close other apps to reduce CPU usage');
      recommendations.push('Disable video streaming to reduce processing load');
    }

    // High memory usage recommendations
    if (current.memoryUsage > this.defaultThresholds.maxMemoryUsage) {
      recommendations.push('Restart the app to free up memory');
      recommendations.push('Reduce the number of participants displayed');
    }

    // Low battery recommendations
    if (current.batteryLevel && current.batteryLevel < this.defaultThresholds.minBatteryLevel) {
      recommendations.push('Connect to a charger to maintain stream quality');
      recommendations.push('Enable low-power mode');
    }

    // Network recommendations
    if (current.networkLatency > 100) {
      recommendations.push('Switch to a better network connection');
      recommendations.push('Move closer to your WiFi router');
    }

    return recommendations;
  }

  /**
   * Calculate average for a metric
   */
  private calculateAverage(metrics: PerformanceMetrics[], key: keyof PerformanceMetrics): number {
    const values = metrics.map(m => m[key] as number).filter(v => typeof v === 'number');
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  /**
   * Generate random metric for testing
   */
  private getRandomMetric(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics and alerts
   */
  clearData(): void {
    this.metrics = [];
    this.alerts = [];
    console.log('📊 [PERF_MONITOR] Data cleared');
  }

  /**
   * Export performance data
   */
  exportData(): {
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    summary: any;
  } {
    return {
      metrics: this.getAllMetrics(),
      alerts: [...this.alerts],
      summary: this.getPerformanceSummary(),
    };
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Performance optimization utilities
 */
export class PerformanceOptimizer {
  /**
   * Optimize stream settings based on current performance
   */
  static async optimizeStreamSettings(metrics: PerformanceMetrics): Promise<{
    videoEnabled: boolean;
    audioQuality: 'low' | 'medium' | 'high';
    maxParticipants: number;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    let videoEnabled = true;
    let audioQuality: 'low' | 'medium' | 'high' = 'high';
    let maxParticipants = 50;

    // Optimize based on CPU usage
    if (metrics.cpuUsage > 80) {
      videoEnabled = false;
      audioQuality = 'medium';
      maxParticipants = 20;
      recommendations.push('Disabled video to reduce CPU usage');
      recommendations.push('Reduced audio quality to medium');
    } else if (metrics.cpuUsage > 60) {
      audioQuality = 'medium';
      maxParticipants = 30;
      recommendations.push('Reduced audio quality to medium');
    }

    // Optimize based on memory usage
    if (metrics.memoryUsage > 85) {
      maxParticipants = Math.min(maxParticipants, 15);
      recommendations.push('Limited participants to reduce memory usage');
    }

    // Optimize based on network conditions
    if (metrics.networkLatency > 150 || metrics.audioPacketLoss > 5) {
      audioQuality = 'low';
      videoEnabled = false;
      recommendations.push('Reduced quality due to poor network conditions');
    }

    // Optimize based on battery level
    if (metrics.batteryLevel && metrics.batteryLevel < 20) {
      videoEnabled = false;
      audioQuality = 'low';
      recommendations.push('Enabled power saving mode due to low battery');
    }

    return {
      videoEnabled,
      audioQuality,
      maxParticipants,
      recommendations,
    };
  }

  /**
   * Get performance score (0-100)
   */
  static calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100;

    // Deduct points for high latency
    if (metrics.audioLatency > 100) {
      score -= Math.min(30, (metrics.audioLatency - 100) / 5);
    }

    // Deduct points for packet loss
    score -= metrics.audioPacketLoss * 5;

    // Deduct points for high CPU usage
    if (metrics.cpuUsage > 70) {
      score -= (metrics.cpuUsage - 70) * 2;
    }

    // Deduct points for high memory usage
    if (metrics.memoryUsage > 80) {
      score -= (metrics.memoryUsage - 80) * 1.5;
    }

    // Deduct points for network issues
    if (metrics.networkLatency > 100) {
      score -= (metrics.networkLatency - 100) / 5;
    }

    return Math.max(0, Math.min(100, score));
  }
}
