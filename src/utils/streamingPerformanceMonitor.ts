/**
 * Streaming Performance Monitor - Monitor CPU usage, packet loss, and streaming quality
 * Provides real-time performance metrics and optimization suggestions
 */

export interface StreamingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  packetLoss: number;
  audioQuality: 'excellent' | 'good' | 'fair' | 'poor';
  networkLatency: number;
  connectionStability: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  maxCpuUsage: number;
  maxMemoryUsage: number;
  maxPacketLoss: number;
  maxNetworkLatency: number;
  minConnectionStability: number;
}

export interface PerformanceAlert {
  type: 'cpu' | 'memory' | 'packet_loss' | 'latency' | 'stability';
  severity: 'warning' | 'critical';
  message: string;
  suggestion: string;
  timestamp: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  maxCpuUsage: 70, // 70%
  maxMemoryUsage: 80, // 80%
  maxPacketLoss: 5, // 5%
  maxNetworkLatency: 200, // 200ms
  minConnectionStability: 85, // 85%
};

class StreamingPerformanceMonitor {
  private static instance: StreamingPerformanceMonitor;
  private metrics: StreamingMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private callbacks: ((metrics: StreamingMetrics) => void)[] = [];

  private constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  static getInstance(thresholds?: Partial<PerformanceThresholds>): StreamingPerformanceMonitor {
    if (!StreamingPerformanceMonitor.instance) {
      StreamingPerformanceMonitor.instance = new StreamingPerformanceMonitor(thresholds);
    }
    return StreamingPerformanceMonitor.instance;
  }

  // Start monitoring streaming performance
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      console.warn('[PERFORMANCE_MONITOR] Already monitoring');
      return;
    }

    console.log('[PERFORMANCE_MONITOR] Starting performance monitoring');
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[PERFORMANCE_MONITOR] Stopping performance monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Enhanced metrics collection with memory management
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherSystemMetrics();

      // Add memory optimization flag if memory usage is high
      if (metrics.memoryUsage > 85) {
        console.warn(`[PERFORMANCE_MONITOR] High memory usage detected: ${metrics.memoryUsage.toFixed(1)}%`);
        this.optimizeMemoryUsage();
      }

      this.metrics.push(metrics);

      // More aggressive memory management - keep only last 50 metrics
      if (this.metrics.length > 50) {
        this.metrics = this.metrics.slice(-50);
      }

      // Check for performance issues
      this.checkPerformanceThresholds(metrics);

      // Notify callbacks with error isolation
      this.callbacks.forEach((callback, index) => {
        try {
          callback(metrics);
        } catch (error) {
          console.error(`[PERFORMANCE_MONITOR] Callback ${index} error:`, error);
          // Remove problematic callbacks to prevent repeated errors
          this.callbacks.splice(index, 1);
        }
      });

    } catch (error) {
      console.error('[PERFORMANCE_MONITOR] Error collecting metrics:', error);
    }
  }

  // Memory optimization when usage is high
  private optimizeMemoryUsage(): void {
    try {
      console.log('[PERFORMANCE_MONITOR] Optimizing memory usage...');

      // Clear old metrics more aggressively
      if (this.metrics.length > 20) {
        this.metrics = this.metrics.slice(-20);
      }

      // Clear old alerts
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      this.alerts = this.alerts.filter(alert => alert.timestamp > fiveMinutesAgo);

      // Force garbage collection if available (development only)
      if (__DEV__ && global.gc) {
        global.gc();
        console.log('[PERFORMANCE_MONITOR] Forced garbage collection');
      }

    } catch (error) {
      console.error('[PERFORMANCE_MONITOR] Error during memory optimization:', error);
    }
  }

  // Gather system metrics (mock implementation for React Native)
  private async gatherSystemMetrics(): Promise<StreamingMetrics> {
    // Note: In a real implementation, you would use native modules or libraries
    // to get actual system metrics. For now, we'll simulate realistic values.

    const now = Date.now();
    
    // Simulate CPU usage (with some realistic variation)
    const baseCpuUsage = 45 + Math.random() * 30; // 45-75%
    const cpuSpike = Math.random() < 0.1 ? Math.random() * 20 : 0; // 10% chance of spike
    const cpuUsage = Math.min(100, baseCpuUsage + cpuSpike);

    // Simulate memory usage
    const memoryUsage = 60 + Math.random() * 25; // 60-85%

    // Simulate packet loss (usually low, occasional spikes)
    const basePacketLoss = Math.random() * 2; // 0-2%
    const packetLossSpike = Math.random() < 0.05 ? Math.random() * 8 : 0; // 5% chance of spike
    const packetLoss = Math.min(15, basePacketLoss + packetLossSpike);

    // Simulate network latency
    const networkLatency = 50 + Math.random() * 150; // 50-200ms

    // Calculate connection stability based on recent metrics
    const connectionStability = this.calculateConnectionStability();

    // Determine audio quality based on metrics
    const audioQuality = this.determineAudioQuality(packetLoss, networkLatency, connectionStability);

    return {
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      packetLoss: Math.round(packetLoss * 100) / 100,
      audioQuality,
      networkLatency: Math.round(networkLatency),
      connectionStability: Math.round(connectionStability * 100) / 100,
      timestamp: now,
    };
  }

  // Calculate connection stability based on recent metrics
  private calculateConnectionStability(): number {
    if (this.metrics.length < 5) {
      return 95; // Default high stability for new sessions
    }

    const recentMetrics = this.metrics.slice(-10); // Last 10 measurements
    const packetLossVariance = this.calculateVariance(recentMetrics.map(m => m.packetLoss));
    const latencyVariance = this.calculateVariance(recentMetrics.map(m => m.networkLatency));

    // Lower variance = higher stability
    const stabilityScore = Math.max(0, 100 - (packetLossVariance * 10) - (latencyVariance / 100));
    return Math.min(100, stabilityScore);
  }

  // Calculate variance for stability measurement
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  // Determine audio quality based on metrics
  private determineAudioQuality(
    packetLoss: number, 
    latency: number, 
    stability: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (packetLoss <= 1 && latency <= 100 && stability >= 95) {
      return 'excellent';
    } else if (packetLoss <= 3 && latency <= 150 && stability >= 85) {
      return 'good';
    } else if (packetLoss <= 7 && latency <= 250 && stability >= 70) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  // Check if metrics exceed thresholds and create alerts
  private checkPerformanceThresholds(metrics: StreamingMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // CPU usage check
    if (metrics.cpuUsage > this.thresholds.maxCpuUsage) {
      alerts.push({
        type: 'cpu',
        severity: metrics.cpuUsage > 85 ? 'critical' : 'warning',
        message: `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
        suggestion: 'Close other apps or reduce video quality to improve performance',
        timestamp: metrics.timestamp,
      });
    }

    // Memory usage check
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      alerts.push({
        type: 'memory',
        severity: metrics.memoryUsage > 90 ? 'critical' : 'warning',
        message: `High memory usage: ${metrics.memoryUsage.toFixed(1)}%`,
        suggestion: 'Restart the app to free up memory',
        timestamp: metrics.timestamp,
      });
    }

    // Packet loss check
    if (metrics.packetLoss > this.thresholds.maxPacketLoss) {
      alerts.push({
        type: 'packet_loss',
        severity: metrics.packetLoss > 10 ? 'critical' : 'warning',
        message: `High packet loss: ${metrics.packetLoss.toFixed(1)}%`,
        suggestion: 'Check your internet connection or switch to a more stable network',
        timestamp: metrics.timestamp,
      });
    }

    // Network latency check
    if (metrics.networkLatency > this.thresholds.maxNetworkLatency) {
      alerts.push({
        type: 'latency',
        severity: metrics.networkLatency > 300 ? 'critical' : 'warning',
        message: `High network latency: ${metrics.networkLatency}ms`,
        suggestion: 'Move closer to your router or switch to a faster internet connection',
        timestamp: metrics.timestamp,
      });
    }

    // Connection stability check
    if (metrics.connectionStability < this.thresholds.minConnectionStability) {
      alerts.push({
        type: 'stability',
        severity: metrics.connectionStability < 70 ? 'critical' : 'warning',
        message: `Unstable connection: ${metrics.connectionStability.toFixed(1)}%`,
        suggestion: 'Check your network connection and try reconnecting',
        timestamp: metrics.timestamp,
      });
    }

    // Add new alerts
    this.alerts.push(...alerts);

    // Keep only recent alerts (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);

    // Log critical alerts
    alerts.forEach(alert => {
      if (alert.severity === 'critical') {
        console.warn(`[PERFORMANCE_MONITOR] ${alert.message} - ${alert.suggestion}`);
      }
    });
  }

  // Subscribe to performance updates
  onMetricsUpdate(callback: (metrics: StreamingMetrics) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  // Get current metrics
  getCurrentMetrics(): StreamingMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // Get recent alerts
  getRecentAlerts(maxAge: number = 5 * 60 * 1000): PerformanceAlert[] {
    const cutoff = Date.now() - maxAge;
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  // Get performance summary
  getPerformanceSummary(): {
    averageCpuUsage: number;
    averagePacketLoss: number;
    averageLatency: number;
    overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
    alertCount: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageCpuUsage: 0,
        averagePacketLoss: 0,
        averageLatency: 0,
        overallQuality: 'excellent',
        alertCount: 0,
      };
    }

    const recentMetrics = this.metrics.slice(-20); // Last 20 measurements
    const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length;
    const avgPacketLoss = recentMetrics.reduce((sum, m) => sum + m.packetLoss, 0) / recentMetrics.length;
    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.networkLatency, 0) / recentMetrics.length;

    // Determine overall quality
    const qualityScores = recentMetrics.map(m => {
      switch (m.audioQuality) {
        case 'excellent': return 4;
        case 'good': return 3;
        case 'fair': return 2;
        case 'poor': return 1;
        default: return 0;
      }
    });
    const avgQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    
    let overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
    if (avgQualityScore >= 3.5) overallQuality = 'excellent';
    else if (avgQualityScore >= 2.5) overallQuality = 'good';
    else if (avgQualityScore >= 1.5) overallQuality = 'fair';
    else overallQuality = 'poor';

    return {
      averageCpuUsage: Math.round(avgCpu * 100) / 100,
      averagePacketLoss: Math.round(avgPacketLoss * 100) / 100,
      averageLatency: Math.round(avgLatency),
      overallQuality,
      alertCount: this.getRecentAlerts().length,
    };
  }

  // Clear all metrics and alerts
  reset(): void {
    this.metrics = [];
    this.alerts = [];
    console.log('[PERFORMANCE_MONITOR] Reset metrics and alerts');
  }
}

// Export singleton instance
export const streamingPerformanceMonitor = StreamingPerformanceMonitor.getInstance();

export default streamingPerformanceMonitor;
