/**
 * usePerformanceOptimization Hook
 * React hook for monitoring and optimizing streaming performance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceMonitor, PerformanceMetrics, PerformanceAlert, PerformanceOptimizer } from '../services/performanceMonitor';

export interface OptimizationSettings {
  videoEnabled: boolean;
  audioQuality: 'low' | 'medium' | 'high';
  maxParticipants: number;
  autoOptimize: boolean;
}

export interface PerformanceState {
  currentMetrics: PerformanceMetrics | null;
  performanceScore: number;
  alerts: PerformanceAlert[];
  recommendations: string[];
  optimizationSettings: OptimizationSettings;
  isMonitoring: boolean;
}

export interface UsePerformanceOptimizationOptions {
  enableAutoOptimization?: boolean;
  monitoringInterval?: number;
  onPerformanceAlert?: (alert: PerformanceAlert) => void;
  onOptimizationApplied?: (settings: OptimizationSettings) => void;
  onPerformanceScoreChange?: (score: number) => void;
}

export const usePerformanceOptimization = (
  options: UsePerformanceOptimizationOptions = {}
) => {
  const {
    enableAutoOptimization = true,
    monitoringInterval = 5000,
    onPerformanceAlert,
    onOptimizationApplied,
    onPerformanceScoreChange,
  } = options;

  const [performanceState, setPerformanceState] = useState<PerformanceState>({
    currentMetrics: null,
    performanceScore: 100,
    alerts: [],
    recommendations: [],
    optimizationSettings: {
      videoEnabled: true,
      audioQuality: 'high',
      maxParticipants: 50,
      autoOptimize: enableAutoOptimization,
    },
    isMonitoring: false,
  });

  const lastOptimizationTime = useRef(0);
  const alertCallbackRef = useRef(onPerformanceAlert);
  const optimizationCallbackRef = useRef(onOptimizationApplied);
  const scoreCallbackRef = useRef(onPerformanceScoreChange);

  // Update callback refs
  useEffect(() => {
    alertCallbackRef.current = onPerformanceAlert;
    optimizationCallbackRef.current = onOptimizationApplied;
    scoreCallbackRef.current = onPerformanceScoreChange;
  }, [onPerformanceAlert, onOptimizationApplied, onPerformanceScoreChange]);

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(() => {
    if (performanceState.isMonitoring) {
      console.warn('⚠️ [PERF_HOOK] Already monitoring');
      return;
    }

    console.log('📊 [PERF_HOOK] Starting performance monitoring');
    performanceMonitor.startMonitoring(monitoringInterval);
    
    setPerformanceState(prev => ({
      ...prev,
      isMonitoring: true,
    }));
  }, [performanceState.isMonitoring, monitoringInterval]);

  /**
   * Stop performance monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!performanceState.isMonitoring) {
      return;
    }

    console.log('📊 [PERF_HOOK] Stopping performance monitoring');
    performanceMonitor.stopMonitoring();
    
    setPerformanceState(prev => ({
      ...prev,
      isMonitoring: false,
    }));
  }, [performanceState.isMonitoring]);

  /**
   * Apply optimization settings
   */
  const applyOptimization = useCallback(async (settings: Partial<OptimizationSettings>) => {
    const newSettings = {
      ...performanceState.optimizationSettings,
      ...settings,
    };

    console.log('⚡ [PERF_HOOK] Applying optimization settings:', newSettings);

    setPerformanceState(prev => ({
      ...prev,
      optimizationSettings: newSettings,
    }));

    // Notify callback
    optimizationCallbackRef.current?.(newSettings);

    // Update last optimization time
    lastOptimizationTime.current = Date.now();
  }, [performanceState.optimizationSettings]);

  /**
   * Auto-optimize based on current metrics
   */
  const autoOptimize = useCallback(async (metrics: PerformanceMetrics) => {
    // Don't optimize too frequently (minimum 30 seconds between optimizations)
    if (Date.now() - lastOptimizationTime.current < 30000) {
      return;
    }

    try {
      const optimization = await PerformanceOptimizer.optimizeStreamSettings(metrics);
      
      const newSettings: OptimizationSettings = {
        videoEnabled: optimization.videoEnabled,
        audioQuality: optimization.audioQuality,
        maxParticipants: optimization.maxParticipants,
        autoOptimize: performanceState.optimizationSettings.autoOptimize,
      };

      // Only apply if settings actually changed
      const currentSettings = performanceState.optimizationSettings;
      const hasChanges = 
        currentSettings.videoEnabled !== newSettings.videoEnabled ||
        currentSettings.audioQuality !== newSettings.audioQuality ||
        currentSettings.maxParticipants !== newSettings.maxParticipants;

      if (hasChanges) {
        console.log('⚡ [PERF_HOOK] Auto-optimization triggered:', optimization.recommendations);
        await applyOptimization(newSettings);
        
        // Update recommendations
        setPerformanceState(prev => ({
          ...prev,
          recommendations: optimization.recommendations,
        }));
      }

    } catch (error) {
      console.error('❌ [PERF_HOOK] Auto-optimization failed:', error);
    }
  }, [performanceState.optimizationSettings, applyOptimization]);

  /**
   * Update performance metrics
   */
  const updateMetrics = useCallback(async () => {
    try {
      const summary = performanceMonitor.getPerformanceSummary();
      
      if (summary.current) {
        const score = PerformanceOptimizer.calculatePerformanceScore(summary.current);
        
        setPerformanceState(prev => {
          const prevScore = prev.performanceScore;
          
          // Notify score change if significant
          if (Math.abs(score - prevScore) >= 5) {
            scoreCallbackRef.current?.(score);
          }
          
          return {
            ...prev,
            currentMetrics: summary.current,
            performanceScore: score,
            alerts: summary.alerts,
          };
        });

        // Check for new alerts
        const newAlerts = summary.alerts.filter(alert => 
          Date.now() - alert.timestamp < 10000 // Last 10 seconds
        );

        for (const alert of newAlerts) {
          alertCallbackRef.current?.(alert);
        }

        // Auto-optimize if enabled
        if (performanceState.optimizationSettings.autoOptimize) {
          await autoOptimize(summary.current);
        }
      }

    } catch (error) {
      console.error('❌ [PERF_HOOK] Failed to update metrics:', error);
    }
  }, [performanceState.optimizationSettings.autoOptimize, autoOptimize]);

  /**
   * Manual optimization trigger
   */
  const manualOptimize = useCallback(async () => {
    if (!performanceState.currentMetrics) {
      console.warn('⚠️ [PERF_HOOK] No metrics available for optimization');
      return;
    }

    await autoOptimize(performanceState.currentMetrics);
  }, [performanceState.currentMetrics, autoOptimize]);

  /**
   * Reset optimization settings to defaults
   */
  const resetOptimization = useCallback(() => {
    const defaultSettings: OptimizationSettings = {
      videoEnabled: true,
      audioQuality: 'high',
      maxParticipants: 50,
      autoOptimize: enableAutoOptimization,
    };

    applyOptimization(defaultSettings);
    
    setPerformanceState(prev => ({
      ...prev,
      recommendations: [],
    }));
  }, [enableAutoOptimization, applyOptimization]);

  /**
   * Get performance insights
   */
  const getPerformanceInsights = useCallback(() => {
    if (!performanceState.currentMetrics) {
      return {
        status: 'unknown',
        message: 'No performance data available',
        suggestions: [],
      };
    }

    const metrics = performanceState.currentMetrics;
    const score = performanceState.performanceScore;

    let status: 'excellent' | 'good' | 'fair' | 'poor';
    let message: string;
    const suggestions: string[] = [];

    if (score >= 90) {
      status = 'excellent';
      message = 'Stream performance is excellent';
    } else if (score >= 75) {
      status = 'good';
      message = 'Stream performance is good';
    } else if (score >= 60) {
      status = 'fair';
      message = 'Stream performance is fair';
      suggestions.push('Consider optimizing settings for better performance');
    } else {
      status = 'poor';
      message = 'Stream performance needs improvement';
      suggestions.push('Enable auto-optimization');
      suggestions.push('Check network connection');
      suggestions.push('Close other apps');
    }

    // Add specific suggestions based on metrics
    if (metrics.audioLatency > 150) {
      suggestions.push('High audio latency detected - check network');
    }
    if (metrics.cpuUsage > 80) {
      suggestions.push('High CPU usage - consider disabling video');
    }
    if (metrics.memoryUsage > 85) {
      suggestions.push('High memory usage - restart app if needed');
    }

    return {
      status,
      message,
      suggestions: [...new Set(suggestions)], // Remove duplicates
    };
  }, [performanceState.currentMetrics, performanceState.performanceScore]);

  // Update metrics periodically when monitoring
  useEffect(() => {
    if (!performanceState.isMonitoring) {
      return;
    }

    const interval = setInterval(updateMetrics, monitoringInterval);
    return () => clearInterval(interval);
  }, [performanceState.isMonitoring, monitoringInterval, updateMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (performanceState.isMonitoring) {
        performanceMonitor.stopMonitoring();
      }
    };
  }, [performanceState.isMonitoring]);

  return {
    // State
    ...performanceState,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    applyOptimization,
    manualOptimize,
    resetOptimization,
    
    // Utils
    getPerformanceInsights,
    updateMetrics,
    
    // Status
    isOptimal: performanceState.performanceScore >= 80,
    needsOptimization: performanceState.performanceScore < 60,
    hasAlerts: performanceState.alerts.length > 0,
  };
};

/**
 * Hook for basic performance monitoring without optimization
 */
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [score, setScore] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const summary = performanceMonitor.getPerformanceSummary();
      if (summary.current) {
        setMetrics(summary.current);
        setScore(PerformanceOptimizer.calculatePerformanceScore(summary.current));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    score,
    isGood: score >= 75,
    isFair: score >= 60 && score < 75,
    isPoor: score < 60,
  };
};
