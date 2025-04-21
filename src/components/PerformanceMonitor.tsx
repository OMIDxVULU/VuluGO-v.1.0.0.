import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  InteractionManager,
  Dimensions,
  Easing,
  LayoutAnimation,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PerformanceStats {
  fps: number;
  renderTime: number;
  memory: number | null;
  fpsHistory: number[];
  lowFpsCount: number;
  animations: number;
  timeToInteractive: number | null;
}

interface PerformanceMonitorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  enabled?: boolean;
}

const FPS_THRESHOLD_GOOD = 55;
const FPS_THRESHOLD_AVERAGE = 45;
const FPS_HISTORY_LENGTH = 60; // 1 minute at 1 sample per second
const MEMORY_UPDATE_INTERVAL = 5000; // 5 seconds

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  position = 'top-right',
  textColor = '#FFFFFF',
  backgroundColor = 'rgba(0, 0, 0, 0.7)',
  fontSize = 10,
  enabled = true,
}) => {
  // Only show in development or if explicitly enabled
  const shouldShow = __DEV__ || enabled;
  if (!shouldShow) return null;

  // State
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    renderTime: 0,
    memory: null,
    fpsHistory: Array(FPS_HISTORY_LENGTH).fill(0),
    lowFpsCount: 0,
    animations: 0,
    timeToInteractive: null,
  });
  const [expanded, setExpanded] = useState(true);
  const [visible, setVisible] = useState(true);

  // References
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const renderStartTimeRef = useRef(Date.now());
  const animationCountRef = useRef(0);
  const animationRef = useRef(new Animated.Value(0));
  const pendingInteractionPromises = useRef<Set<Promise<any>>>(new Set());

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [expanded]);

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    if (visible) {
      Animated.timing(animationRef.current, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start(() => {
        setVisible(false);
      });
    } else {
      setVisible(true);
      Animated.timing(animationRef.current, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start();
    }

    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [visible]);

  // Measure FPS and performance metrics
  useEffect(() => {
    if (!shouldShow) return;

    let rafId: number;
    let memoryInterval: NodeJS.Timeout;
    let animationCount = 0;
    
    // Instead of monkey patching, use function wrappers to count animations
    const originalSpring = Animated.spring;
    const originalTiming = Animated.timing;
    
    // Create a safe wrapper for spring
    const countedSpring = function(...args: any[]): any {
      animationCountRef.current++;
      const animation = originalSpring.apply(this, args);
      const originalStop = animation.stop;
      
      animation.stop = function() {
        animationCountRef.current = Math.max(0, animationCountRef.current - 1);
        return originalStop.call(this);
      };
      
      return animation;
    };
    
    // Create a safe wrapper for timing
    const countedTiming = function(...args: any[]): any {
      animationCountRef.current++;
      const animation = originalTiming.apply(this, args);
      const originalStop = animation.stop;
      
      animation.stop = function() {
        animationCountRef.current = Math.max(0, animationCountRef.current - 1);
        return originalStop.call(this);
      };
      
      return animation;
    };
    
    // Safely override the functions by wrapping
    // @ts-ignore - This is a hack, but safer than direct property assignment
    Animated.spring = countedSpring;
    // @ts-ignore - This is a hack, but safer than direct property assignment  
    Animated.timing = countedTiming;
    
    // Track interaction completion time with a safer approach
    const originalCreate = InteractionManager.createInteractionHandle;
    const originalClear = InteractionManager.clearInteractionHandle;
    const originalRunAfter = InteractionManager.runAfterInteractions;
    
    // @ts-ignore - This is a hack, but safer than direct property assignment
    InteractionManager.createInteractionHandle = function() {
      const handle = originalCreate();
      const interactionPromise = new Promise(resolve => {
        // Create a safe wrapper for runAfterInteractions
        const safeRunAfter = function(callback?: () => unknown) {
          return originalRunAfter(() => {
            if (callback) callback();
            resolve(null);
          });
        };
        
        // @ts-ignore - This is a hack, but safer than direct property assignment
        InteractionManager.runAfterInteractions = safeRunAfter;
      });
      
      pendingInteractionPromises.current.add(interactionPromise);
      interactionPromise.then(() => {
        pendingInteractionPromises.current.delete(interactionPromise);
        setStats(prev => ({
          ...prev,
          timeToInteractive: Date.now() - renderStartTimeRef.current
        }));
      });
      
      return handle;
    };
    
    // @ts-ignore - This is a hack, but safer than direct property assignment
    InteractionManager.clearInteractionHandle = originalClear;
    
    // Clean up helper function 
    const cleanup = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (memoryInterval) clearInterval(memoryInterval);
      
      // Restore original methods
      // @ts-ignore - This is a hack, but safer than direct property assignment
      Animated.spring = originalSpring;
      // @ts-ignore - This is a hack, but safer than direct property assignment
      Animated.timing = originalTiming;
      // @ts-ignore - This is a hack, but safer than direct property assignment
      InteractionManager.createInteractionHandle = originalCreate;
      // @ts-ignore - This is a hack, but safer than direct property assignment
      InteractionManager.runAfterInteractions = originalRunAfter;
      // @ts-ignore - This is a hack, but safer than direct property assignment
      InteractionManager.clearInteractionHandle = originalClear;
    };

    // FPS calculation loop
    const updateStats = () => {
      const now = Date.now();
      const delta = now - lastFrameTimeRef.current;
      frameCountRef.current++;

      // Update every second
      if (delta > 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        const newHistory = [...stats.fpsHistory.slice(1), fps];
        setStats(prev => ({
          ...prev,
          fps,
          renderTime: delta / frameCountRef.current,
          fpsHistory: newHistory,
          animations: animationCountRef.current,
          lowFpsCount: fps < FPS_THRESHOLD_AVERAGE ? prev.lowFpsCount + 1 : prev.lowFpsCount,
        }));

        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      rafId = requestAnimationFrame(updateStats);
    };

    // Memory usage monitoring
    const updateMemory = () => {
      // Different approaches based on platform
      let memoryUsage = null;
      
      try {
        // For web
        if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
          memoryUsage = Math.round(((window.performance as any).memory.usedJSHeapSize / 1048576));
        }
        // For React Native, we can only estimate
        else {
          // This is a rough approximation since React Native doesn't expose memory usage directly
          const largeString = new Array(1000000).join('x');
          const stringSize = largeString.length * 2; // approximate bytes per character
          memoryUsage = Math.round(stringSize / 1048576); // Convert to MB
        }
      } catch (error) {
        console.log('Memory measurement error:', error);
      }

      setStats(prev => ({
        ...prev,
        memory: memoryUsage
      }));
    };

    // Start loops
    rafId = requestAnimationFrame(updateStats);
    memoryInterval = setInterval(updateMemory, MEMORY_UPDATE_INTERVAL);

    // Return cleanup function
    return cleanup;
  }, [shouldShow]);

  // Don't render if not showing
  if (!shouldShow || !visible) {
    return (
      <TouchableOpacity
        style={[styles.toggleButton, getPositionStyle(position)]}
        onPress={toggleVisibility}
      >
        <Text style={[styles.toggleButtonText, { color: textColor }]}>FPS</Text>
      </TouchableOpacity>
    );
  }

  // Get FPS color based on performance
  const getFpsColor = (fps: number) => {
    if (fps >= FPS_THRESHOLD_GOOD) return '#4CAF50'; // Green
    if (fps >= FPS_THRESHOLD_AVERAGE) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Render the FPS history graph
  const renderFpsGraph = () => {
    const barWidth = (SCREEN_WIDTH * 0.8) / FPS_HISTORY_LENGTH;
    return (
      <View style={styles.graphContainer}>
        {stats.fpsHistory.map((fps, index) => {
          const height = Math.max(2, (fps / 60) * 30); // Max height 30
          return (
            <View
              key={index}
              style={[
                styles.graphBar,
                {
                  height,
                  width: barWidth - 1,
                  backgroundColor: getFpsColor(fps),
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={toggleExpanded}
      onLongPress={toggleVisibility}
      style={[
        styles.container,
        getPositionStyle(position),
        { backgroundColor },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.fpsText, { color: getFpsColor(stats.fps), fontSize: fontSize + 4 }]}>
          {stats.fps} FPS
        </Text>
        <Text style={[styles.subText, { color: textColor, fontSize }]}>
          {Math.round(stats.renderTime)}ms/frame
        </Text>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          {stats.memory !== null && (
            <Text style={[styles.statText, { color: textColor, fontSize }]}>
              Memory: {stats.memory} MB
            </Text>
          )}
          <Text style={[styles.statText, { color: textColor, fontSize }]}>
            Active Animations: {stats.animations}
          </Text>
          <Text style={[styles.statText, { color: textColor, fontSize }]}>
            Low FPS Events: {stats.lowFpsCount}
          </Text>
          {stats.timeToInteractive && (
            <Text style={[styles.statText, { color: textColor, fontSize }]}>
              TTI: {stats.timeToInteractive}ms
            </Text>
          )}
          {renderFpsGraph()}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Helper to get position styles
const getPositionStyle = (position: string) => {
  switch (position) {
    case 'top-left':
      return { top: 50, left: 10 };
    case 'top-right':
      return { top: 50, right: 10 };
    case 'bottom-left':
      return { bottom: 50, left: 10 };
    case 'bottom-right':
    default:
      return { bottom: 50, right: 10 };
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    minWidth: 100,
    borderRadius: 5,
    padding: 8,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  fpsText: {
    fontWeight: 'bold',
  },
  subText: {
    marginLeft: 5,
  },
  statText: {
    marginTop: 4,
  },
  expandedContent: {
    marginTop: 5,
  },
  graphContainer: {
    marginTop: 5,
    height: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  graphBar: {
    width: 3,
    marginHorizontal: 1,
    backgroundColor: '#4CAF50',
  },
  toggleButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 3,
    zIndex: 9999,
  },
  toggleButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default PerformanceMonitor; 