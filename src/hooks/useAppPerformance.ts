import { useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager, AppState, AppStateStatus } from 'react-native';
import { analyticsService } from '../services/AnalyticsService';
import { memoryOptimizer } from '../utils/MemoryOptimizer';

interface PerformanceOptions {
  componentId: string;
  enableMonitoring?: boolean;
  trackInteractions?: boolean;
  trackMemory?: boolean;
  trackRenders?: boolean;
  optimizeChatMessages?: boolean;
}

interface PerformanceMetrics {
  renders: number;
  lastRenderTime: number;
  interactionCompletionTime: number | null;
  memoryUsage: number | null;
  isOptimized: boolean;
}

/**
 * Hook for tracking and optimizing component performance
 * 
 * @param options Configuration options
 * @returns Performance metrics and utility functions
 */
export const useAppPerformance = ({
  componentId,
  enableMonitoring = true,
  trackInteractions = true,
  trackMemory = true,
  trackRenders = true,
  optimizeChatMessages = false,
}: PerformanceOptions) => {
  // Performance metrics state
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renders: 0,
    lastRenderTime: 0,
    interactionCompletionTime: null,
    memoryUsage: null,
    isOptimized: false,
  });
  
  // Reference to track interaction handles
  const interactionHandleRef = useRef<number | null>(null);
  const renderStartTimeRef = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isActiveRef = useRef<boolean>(true);
  
  // Track render count
  useEffect(() => {
    if (!enableMonitoring || !trackRenders) return;
    
    const renderTime = Date.now() - renderStartTimeRef.current;
    renderStartTimeRef.current = Date.now();
    
    setMetrics(prev => ({
      ...prev,
      renders: prev.renders + 1,
      lastRenderTime: renderTime,
    }));
    
    // Track render in analytics if it's slow
    if (renderTime > 500) {
      analyticsService.trackEvent({
        name: 'slow_render',
        params: {
          componentId,
          renderTime,
          renderCount: metrics.renders + 1,
        }
      });
    }
    
    // Update last render time metric
    analyticsService.recordPerformanceMetric(`${componentId}_render_time`, renderTime);
  }, [componentId, enableMonitoring, trackRenders, metrics.renders]);
  
  // Register cleanup task on mount
  useEffect(() => {
    if (!enableMonitoring) return;
    
    // Register cleanup task
    memoryOptimizer.registerCleanupTask(componentId, () => {
      // Perform any component-specific cleanup here
      if (interactionHandleRef.current !== null) {
        InteractionManager.clearInteractionHandle(interactionHandleRef.current);
        interactionHandleRef.current = null;
      }
      
      // Track cleanup in analytics
      analyticsService.trackEvent({
        name: 'component_cleaned_up',
        params: { componentId }
      });
    });
    
    // Monitor app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasActive = appStateRef.current === 'active';
      const isActive = nextAppState === 'active';
      
      // App becoming active
      if (!wasActive && isActive) {
        renderStartTimeRef.current = Date.now();
        isActiveRef.current = true;
        
        // Track app resuming
        analyticsService.trackEvent({
          name: 'component_resumed',
          params: { componentId }
        });
      }
      
      // App going to background
      if (wasActive && !isActive) {
        isActiveRef.current = false;
        
        // Track app pausing
        analyticsService.trackEvent({
          name: 'component_paused',
          params: { 
            componentId,
            timeActive: Date.now() - renderStartTimeRef.current
          }
        });
        
        // Run cleanup on app backgrounding
        if (interactionHandleRef.current !== null) {
          InteractionManager.clearInteractionHandle(interactionHandleRef.current);
          interactionHandleRef.current = null;
        }
      }
      
      appStateRef.current = nextAppState;
    };
    
    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Clean up on unmount
    return () => {
      subscription.remove();
      memoryOptimizer.unregisterCleanupTask(componentId);
      
      if (interactionHandleRef.current !== null) {
        InteractionManager.clearInteractionHandle(interactionHandleRef.current);
      }
    };
  }, [componentId, enableMonitoring]);
  
  // Start interaction tracking
  const startInteraction = useCallback(() => {
    if (!enableMonitoring || !trackInteractions || !isActiveRef.current) return;
    
    // Clear any existing handle
    if (interactionHandleRef.current !== null) {
      InteractionManager.clearInteractionHandle(interactionHandleRef.current);
    }
    
    // Create new interaction handle
    const startTime = Date.now();
    interactionHandleRef.current = InteractionManager.createInteractionHandle();
    
    // Schedule completion check
    InteractionManager.runAfterInteractions(() => {
      const completionTime = Date.now() - startTime;
      
      setMetrics(prev => ({
        ...prev,
        interactionCompletionTime: completionTime
      }));
      
      // Track slow interactions
      if (completionTime > 300) {
        analyticsService.trackEvent({
          name: 'slow_interaction',
          params: {
            componentId,
            completionTime
          }
        });
      }
      
      // Update interaction time metric
      analyticsService.recordPerformanceMetric(`${componentId}_interaction_time`, completionTime);
      
      // Clear the handle
      interactionHandleRef.current = null;
    });
  }, [componentId, enableMonitoring, trackInteractions]);
  
  // End interaction tracking
  const endInteraction = useCallback(() => {
    if (interactionHandleRef.current !== null) {
      InteractionManager.clearInteractionHandle(interactionHandleRef.current);
      interactionHandleRef.current = null;
    }
  }, []);
  
  // Track memory usage
  useEffect(() => {
    if (!enableMonitoring || !trackMemory || !isActiveRef.current) return;
    
    // Track memory usage every 10 seconds
    const interval = setInterval(() => {
      // Get memory usage from memory optimizer
      const usage = memoryOptimizer.getMemoryUsageSummary()[componentId] || 0;
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage: usage
      }));
      
      // Report if usage is excessive
      if (memoryOptimizer.isMemoryUsageExcessive(componentId)) {
        analyticsService.trackEvent({
          name: 'excessive_memory_usage',
          params: {
            componentId,
            memoryUsage: usage
          }
        });
      }
    }, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, [componentId, enableMonitoring, trackMemory]);
  
  // Function to optimize chat messages
  const optimizeMessages = useCallback(<T>(messages: T[]): T[] => {
    if (!enableMonitoring || !optimizeChatMessages) {
      return messages;
    }
    
    const startTime = Date.now();
    const optimized = memoryOptimizer.optimizeChatMessages(messages);
    const optimizeTime = Date.now() - startTime;
    
    setMetrics(prev => ({
      ...prev,
      isOptimized: optimized.length < messages.length
    }));
    
    // Track optimization metrics
    if (optimized.length < messages.length) {
      analyticsService.trackEvent({
        name: 'messages_optimized',
        params: {
          componentId,
          before: messages.length,
          after: optimized.length,
          optimizeTime
        }
      });
    }
    
    return optimized;
  }, [componentId, enableMonitoring, optimizeChatMessages]);
  
  // Function to track custom metric
  const trackMetric = useCallback((metricName: string, value: number) => {
    if (!enableMonitoring) return;
    
    analyticsService.recordPerformanceMetric(`${componentId}_${metricName}`, value);
  }, [componentId, enableMonitoring]);
  
  // Function to mark component as active (reset inactivity timer)
  const markActive = useCallback(() => {
    if (!enableMonitoring) return;
    
    memoryOptimizer.resetInactivityTimer(componentId, () => {
      // Perform optimization when component is inactive
      setMetrics(prev => ({
        ...prev,
        isOptimized: true
      }));
    });
  }, [componentId, enableMonitoring]);
  
  return {
    metrics,
    startInteraction,
    endInteraction,
    optimizeMessages,
    trackMetric,
    markActive
  };
};

export default useAppPerformance; 