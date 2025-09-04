/**
 * React Hook for Performance Monitoring
 * Provides easy integration with performance monitoring service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import performanceMonitoringService, {
  PerformanceMetrics,
  StreamQualityReport,
  PerformanceAlert
} from '../services/performanceMonitoringService';
import { useAuth } from '../contexts/AuthContext';

export interface UsePerformanceMonitoringOptions {
  streamId?: string;
  autoStart?: boolean;
  monitoringInterval?: number;
  alertThresholds?: {
    latency?: number;
    packetLoss?: number;
    cpuUsage?: number;
    memoryUsage?: number;
  };
  onAlert?: (alert: PerformanceAlert) => void;
  onQualityChange?: (quality: string) => void;
}

export interface PerformanceMonitoringState {
  isMonitoring: boolean;
  currentSession: string | null;
  currentMetrics: PerformanceMetrics | null;
  recentMetrics: PerformanceMetrics[];
  alerts: PerformanceAlert[];
  qualityReport: StreamQualityReport | null;
  performanceSummary: any;
  isLoading: boolean;
  error: string | null;
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions = {}) {
  const {
    streamId,
    autoStart = false,
    monitoringInterval = 5000,
    alertThresholds = {
      latency: 300,
      packetLoss: 5,
      cpuUsage: 90,
      memoryUsage: 1000
    },
    onAlert,
    onQualityChange
  } = options;

  const { user } = useAuth();

  const [state, setState] = useState<PerformanceMonitoringState>({
    isMonitoring: false,
    currentSession: null,
    currentMetrics: null,
    recentMetrics: [],
    alerts: [],
    qualityReport: null,
    performanceSummary: null,
    isLoading: false,
    error: null
  });

  const metricsIntervalRef = useRef<NodeJS.Timeout>();
  const alertsIntervalRef = useRef<NodeJS.Timeout>();
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Start performance monitoring
  const startMonitoring = useCallback(async (targetStreamId?: string) => {
    try {
      if (state.isMonitoring) {
        console.warn('Performance monitoring already active');
        return state.currentSession;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const sessionId = await performanceMonitoringService.startMonitoring(
        targetStreamId || streamId
      );

      setState(prev => ({
        ...prev,
        isMonitoring: true,
        currentSession: sessionId,
        isLoading: false
      }));

      // Start periodic metrics collection
      startMetricsCollection();

      // Start alert monitoring
      startAlertMonitoring();

      console.log(`✅ Performance monitoring started: ${sessionId}`);
      return sessionId;

    } catch (error: any) {
      const errorMessage = `Failed to start monitoring: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, [streamId, state.isMonitoring, state.currentSession]);

  // Stop performance monitoring
  const stopMonitoring = useCallback(async () => {
    try {
      if (!state.isMonitoring) {
        return;
      }

      setState(prev => ({ ...prev, isLoading: true }));

      await performanceMonitoringService.stopMonitoring();

      // Clear intervals
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (alertsIntervalRef.current) {
        clearInterval(alertsIntervalRef.current);
      }

      setState(prev => ({
        ...prev,
        isMonitoring: false,
        currentSession: null,
        currentMetrics: null,
        isLoading: false
      }));

      console.log('✅ Performance monitoring stopped');

    } catch (error: any) {
      const errorMessage = `Failed to stop monitoring: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, [state.isMonitoring]);

  // Record custom metrics
  const recordMetrics = useCallback(async (metrics: Partial<PerformanceMetrics>) => {
    try {
      if (!state.isMonitoring) {
        console.warn('Performance monitoring not active');
        return;
      }

      await performanceMonitoringService.recordMetrics({
        ...metrics,
        streamId: metrics.streamId || streamId
      });

      // Update current metrics
      setState(prev => ({
        ...prev,
        currentMetrics: {
          ...prev.currentMetrics,
          ...metrics
        } as PerformanceMetrics
      }));

    } catch (error: any) {
      console.error('Failed to record metrics:', error);
    }
  }, [state.isMonitoring, streamId]);

  // Load performance metrics
  const loadMetrics = useCallback(async (
    filters: {
      startTime?: Date;
      endTime?: Date;
      limit?: number;
    } = {}
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const metrics = await performanceMonitoringService.getPerformanceMetrics({
        streamId,
        userId: user?.uid,
        ...filters
      });

      setState(prev => ({
        ...prev,
        recentMetrics: metrics,
        isLoading: false
      }));

      return metrics;

    } catch (error: any) {
      const errorMessage = `Failed to load metrics: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, [streamId, user]);

  // Load performance alerts
  const loadAlerts = useCallback(async (
    filters: {
      severity?: 'warning' | 'critical';
      acknowledged?: boolean;
      limit?: number;
    } = {}
  ) => {
    try {
      const alerts = await performanceMonitoringService.getPerformanceAlerts({
        streamId,
        userId: user?.uid,
        ...filters
      });

      setState(prev => ({ ...prev, alerts }));
      return alerts;

    } catch (error: any) {
      console.error('Failed to load alerts:', error);
      return [];
    }
  }, [streamId, user]);

  // Generate quality report
  const generateQualityReport = useCallback(async (
    startTime: Date,
    endTime: Date,
    targetStreamId?: string
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const report = await performanceMonitoringService.generateStreamQualityReport(
        targetStreamId || streamId!,
        startTime,
        endTime
      );

      setState(prev => ({
        ...prev,
        qualityReport: report,
        isLoading: false
      }));

      return report;

    } catch (error: any) {
      const errorMessage = `Failed to generate quality report: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, [streamId]);

  // Load performance summary
  const loadPerformanceSummary = useCallback(async (
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const summary = await performanceMonitoringService.getPerformanceSummary(timeRange);

      setState(prev => ({
        ...prev,
        performanceSummary: summary,
        isLoading: false
      }));

      return summary;

    } catch (error: any) {
      const errorMessage = `Failed to load performance summary: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await performanceMonitoringService.acknowledgeAlert(alertId);

      // Update local state
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      }));

      console.log(`✅ Alert acknowledged: ${alertId}`);

    } catch (error: any) {
      console.error('Failed to acknowledge alert:', error);
      throw error;
    }
  }, []);

  // Start periodic metrics collection
  const startMetricsCollection = useCallback(() => {
    metricsIntervalRef.current = setInterval(async () => {
      try {
        // This would collect real system metrics
        // For now, we'll simulate some metrics
        const mockMetrics = {
          connectionQuality: 'good' as const,
          latency: 50 + Math.random() * 100,
          jitter: Math.random() * 20,
          packetLoss: Math.random() * 2,
          cpuUsage: 20 + Math.random() * 60,
          memoryUsage: 100 + Math.random() * 200
        };

        await recordMetrics(mockMetrics);

        // Check for threshold violations
        checkAlertThresholds(mockMetrics);

      } catch (error) {
        console.error('Failed to collect metrics:', error);
      }
    }, monitoringInterval);
  }, [monitoringInterval, recordMetrics]);

  // Start alert monitoring
  const startAlertMonitoring = useCallback(() => {
    alertsIntervalRef.current = setInterval(async () => {
      try {
        await loadAlerts({ acknowledged: false });
      } catch (error) {
        console.error('Failed to load alerts:', error);
      }
    }, 30000); // Check every 30 seconds
  }, [loadAlerts]);

  // Check alert thresholds
  const checkAlertThresholds = useCallback((metrics: any) => {
    const alerts: any[] = [];

    if (metrics.latency > alertThresholds.latency!) {
      alerts.push({
        type: 'latency_spike',
        severity: 'warning',
        message: `High latency: ${metrics.latency}ms`,
        metrics
      });
    }

    if (metrics.packetLoss > alertThresholds.packetLoss!) {
      alerts.push({
        type: 'connection_drop',
        severity: 'warning',
        message: `High packet loss: ${metrics.packetLoss.toFixed(1)}%`,
        metrics
      });
    }

    if (metrics.cpuUsage > alertThresholds.cpuUsage!) {
      alerts.push({
        type: 'resource_exhaustion',
        severity: 'critical',
        message: `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
        metrics
      });
    }

    // Notify about alerts
    alerts.forEach(alert => {
      callbacksRef.current.onAlert?.(alert as PerformanceAlert);
    });

    // Notify about quality changes
    if (state.currentMetrics?.connectionQuality !== metrics.connectionQuality) {
      callbacksRef.current.onQualityChange?.(metrics.connectionQuality);
    }
  }, [alertThresholds, state.currentMetrics]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart && user && streamId && !state.isMonitoring) {
      startMonitoring();
    }
  }, [autoStart, user, streamId, state.isMonitoring, startMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (alertsIntervalRef.current) {
        clearInterval(alertsIntervalRef.current);
      }
    };
  }, []);

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
    isMonitoring: state.isMonitoring,
    currentSession: state.currentSession,
    currentMetrics: state.currentMetrics,
    recentMetrics: state.recentMetrics,
    alerts: state.alerts,
    qualityReport: state.qualityReport,
    performanceSummary: state.performanceSummary,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    startMonitoring,
    stopMonitoring,
    recordMetrics,
    loadMetrics,
    loadAlerts,
    generateQualityReport,
    loadPerformanceSummary,
    acknowledgeAlert,
    clearError,

    // Computed values
    hasCurrentMetrics: !!state.currentMetrics,
    hasRecentMetrics: state.recentMetrics.length > 0,
    hasAlerts: state.alerts.length > 0,
    unacknowledgedAlerts: state.alerts.filter(a => !a.acknowledged).length,
    criticalAlerts: state.alerts.filter(a => a.severity === 'critical').length,
    connectionQuality: state.currentMetrics?.connectionQuality || 'unknown',
    averageLatency: state.recentMetrics.length > 0 ?
      Math.round(state.recentMetrics.reduce((sum, m) => sum + m.latency, 0) / state.recentMetrics.length) : 0,
    
    // Quick metrics
    currentLatency: state.currentMetrics?.latency || 0,
    currentJitter: state.currentMetrics?.jitter || 0,
    currentPacketLoss: state.currentMetrics?.packetLoss || 0,
    currentCpuUsage: state.currentMetrics?.cpuUsage || 0,
    currentMemoryUsage: state.currentMetrics?.memoryUsage || 0,

    // Status flags
    isHealthy: state.currentMetrics ? 
      state.currentMetrics.latency < 150 && 
      state.currentMetrics.packetLoss < 2 && 
      state.currentMetrics.cpuUsage < 80 : false,
    
    hasPerformanceIssues: state.alerts.some(a => !a.acknowledged),
    
    // Helper functions
    getQualityColor: (quality?: string) => {
      switch (quality || state.currentMetrics?.connectionQuality) {
        case 'excellent': return '#3BA55C';
        case 'good': return '#5865F2';
        case 'fair': return '#FAA61A';
        case 'poor': return '#ED4245';
        default: return '#72767D';
      }
    },

    formatLatency: (latency?: number) => {
      const value = latency || state.currentMetrics?.latency || 0;
      return `${Math.round(value)}ms`;
    },

    formatPacketLoss: (packetLoss?: number) => {
      const value = packetLoss || state.currentMetrics?.packetLoss || 0;
      return `${value.toFixed(1)}%`;
    }
  };
}

export default usePerformanceMonitoring;
