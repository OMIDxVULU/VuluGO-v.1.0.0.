import { useEffect, useRef, useCallback } from 'react';
import { InteractionManager } from 'react-native';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  slowRenders: number;
}

interface UsePerformanceMonitorOptions {
  componentName: string;
  enableLogging?: boolean;
  slowRenderThreshold?: number;
  sampleRate?: number; // Percentage of renders to sample (0-1)
}

/**
 * Hook to monitor component performance and detect potential issues
 * Maintains the existing UI design while tracking performance metrics
 */
export const usePerformanceMonitor = ({
  componentName,
  enableLogging = __DEV__,
  slowRenderThreshold = 16, // 16ms for 60fps
  sampleRate = 0.1 // Sample 10% of renders by default
}: UsePerformanceMonitorOptions) => {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    slowRenders: 0
  });
  
  const renderStartTimeRef = useRef<number>(Date.now());
  const renderTimesRef = useRef<number[]>([]);

  // Track render performance with sampling
  useEffect(() => {
    // Sample only a subset of renders to reduce performance impact
    if (Math.random() > sampleRate) {
      renderStartTimeRef.current = performance.now();
      return;
    }

    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTimeRef.current;

    // Update metrics only when sampled
    metricsRef.current.renderCount++;
    metricsRef.current.lastRenderTime = renderTime;

    // Track render times for average calculation (fixed-size buffer)
    renderTimesRef.current.push(renderTime);
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current.shift(); // Keep only last 10 renders
    }

    // Calculate average
    const sum = renderTimesRef.current.reduce((a, b) => a + b, 0);
    metricsRef.current.averageRenderTime = sum / renderTimesRef.current.length;

    // Track slow renders
    if (renderTime > slowRenderThreshold) {
      metricsRef.current.slowRenders++;

      if (enableLogging) {
        console.warn(`[Performance] Slow render in ${componentName}: ${renderTime}ms`);
      }
    }

    // Reset start time for next render
    renderStartTimeRef.current = performance.now();
  });

  // Get current metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Log performance summary
  const logPerformanceSummary = useCallback(() => {
    if (!enableLogging) return;
    
    const metrics = metricsRef.current;
    console.log(`[Performance Summary] ${componentName}:`, {
      totalRenders: metrics.renderCount,
      averageRenderTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
      slowRenders: metrics.slowRenders,
      slowRenderPercentage: `${((metrics.slowRenders / metrics.renderCount) * 100).toFixed(1)}%`
    });
  }, [componentName, enableLogging]);

  // Track interaction completion time
  const trackInteraction = useCallback((interactionName: string) => {
    const startTime = Date.now();
    
    return () => {
      InteractionManager.runAfterInteractions(() => {
        const completionTime = Date.now() - startTime;
        
        if (enableLogging && completionTime > 100) {
          console.warn(`[Performance] Slow interaction in ${componentName}.${interactionName}: ${completionTime}ms`);
        }
      });
    };
  }, [componentName, enableLogging]);

  return {
    getMetrics,
    logPerformanceSummary,
    trackInteraction
  };
};

export default usePerformanceMonitor;
