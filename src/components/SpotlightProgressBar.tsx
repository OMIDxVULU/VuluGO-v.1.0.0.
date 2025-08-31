import React, { useEffect, memo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import Svg, { Rect, Defs, Filter, FeGaussianBlur, FeColorMatrix } from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  useSharedValue, 
  withTiming,
  useDerivedValue,
  interpolateColor,
  cancelAnimation
} from 'react-native-reanimated';

// Make the Rect component animatable
const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Duration categories for different visual effects
export type DurationCategory = 'short' | 'medium' | 'long';

type SpotlightProgressBarProps = {
  width: number;
  height: number;
  borderRadius: number;
  progress: number; // 0 to 1 value
  color?: string;
  strokeWidth?: number;
  glowIntensity?: number;
  durationCategory?: DurationCategory; // New prop for duration-based styling
};

// Generate a static filter ID to use across renders
const FILTER_ID = "spotlight-glow-filter";

// Memoized component to prevent unnecessary re-renders
const SpotlightProgressBar = memo(({
  width,
  height,
  borderRadius,
  progress,
  color,
  strokeWidth = 3,
  glowIntensity = 2.5, // Keep intensity prop for potential future use, but default won't be used by filter
  durationCategory = 'medium', // Default to medium
}: SpotlightProgressBarProps) => {
  // Set colors based on duration category
  const getDurationColor = (): string => {
    if (!color) {
      switch (durationCategory) {
        case 'short': return '#34C759'; // Green for 2 min
        case 'medium': return '#FFC107'; // Yellow for 5 min
        case 'long': return '#6E69F4'; // Purple for 10 min
        default: return '#34C759';
      }
    }
    return color;
  };
  
  // Set warning color based on duration category
  const getWarningColor = (): string => {
    switch (durationCategory) {
      case 'short': return '#FF3B30'; // Red warning
      case 'medium': return '#FF9500'; // Orange warning
      case 'long': return '#FF375F'; // Pink warning
      default: return '#FF3B30';
    }
  };
  
  // Adjust stroke width based on duration
  const effectiveStrokeWidth = React.useMemo(() => {
    switch (durationCategory) {
      case 'short': return strokeWidth;
      case 'medium': return strokeWidth * 1.1; // Slightly thicker
      case 'long': return strokeWidth * 1.2; // Thickest stroke
      default: return strokeWidth;
    }
  }, [durationCategory, strokeWidth]);
  
  // Calculate the adjusted dimensions and radius for a centered stroke
  const strokeOffset = effectiveStrokeWidth / 2; // Center the stroke using the effective width
  const adjustedWidth = width - strokeOffset * 2;
  const adjustedHeight = height - strokeOffset * 2;
  // Adjust radius based on the centered stroke offset
  const adjustedRadius = Math.max(0, borderRadius - strokeOffset);
  
  // Calculate perimeter of the centered stroke path
  const perimeter = React.useMemo(() => 
    2 * (adjustedWidth + adjustedHeight) + 2 * Math.PI * adjustedRadius, 
    [adjustedWidth, adjustedHeight, adjustedRadius]
  );
  
  // Create an animated value for the progress
  const progressAnim = useSharedValue(progress);
  
  // Adjust glow intensity based on duration
  const currentGlowIntensity = React.useMemo(() => {
    switch (durationCategory) {
      case 'short': return glowIntensity; // Standard glow
      case 'medium': return glowIntensity * 1.3; // More intense glow
      case 'long': return glowIntensity * 1.6; // Most intense glow
      default: return glowIntensity;
    }
  }, [durationCategory, glowIntensity]);

  // Get color based on duration and progress
  const baseColor = React.useMemo(() => getDurationColor(), [durationCategory, color]);
  const warningColor = React.useMemo(() => getWarningColor(), [durationCategory]);
  
  // Calculate the color based on progress (first 80%, warning color last 20%)
  const animatedColor = useDerivedValue(() => {
    // If progress is less than 0.2 (last 20% of time), transition to warning color
    return progressAnim.value > 0.2
      ? baseColor
      : interpolateColor(
          Math.min(1, progressAnim.value * 5), // Scale 0-0.2 to 0-1 for smooth transition
          [0, 1],
          [warningColor, baseColor]
        );
  }, [baseColor, warningColor]); // Remove progressAnim.value from dependencies
  
  // Adjust animation duration based on duration category
  const getAnimationDuration = (): number => {
    switch (durationCategory) {
      case 'short': return 300; // Faster animation
      case 'medium': return 400; // Standard animation
      case 'long': return 500; // Slower, more dramatic animation
      default: return 400;
    }
  };
  
  // Update animation when progress changes
  useEffect(() => {
    // Use duration based on category
    progressAnim.value = withTiming(progress, { duration: getAnimationDuration() });
    
    // Clean up animations on unmount
    return () => {
      cancelAnimation(progressAnim);
    };
  }, [progress, progressAnim, durationCategory]);
  
  // Create animated props for the strokeDashoffset and variable stroke width
  const animatedProps = useAnimatedProps(() => {
    // Calculate the offset based on progress (from 0 to perimeter)
    const strokeDashoffset = perimeter * (1 - progressAnim.value);
    
    return {
      strokeDashoffset,
      stroke: animatedColor.value,
    };
  });
  
  // For Android performance optimization, reduce filter quality and adjust SVG complexity
  const blurRadius = Platform.OS === 'android' ? 1.7 : 2.3;
  
  // Adjust filter complexity based on platform
  const filterMatrix = Platform.OS === 'android' 
    ? "0 0 0 0 0.2 0 0 0 0 1 0 0 0 0 0.2 0 0 0 0.9 0" // Simpler matrix for Android
    : "0 0 0 0 0.2 0 0 0 0 1 0 0 0 0 0.2 0 0 0 1 0";  // Full quality for iOS
  
  // Adjust filter parameters based on duration category
  const getFilterMatrix = () => {
    // These matrices adjust the color of the glow based on duration category
    switch (durationCategory) {
      case 'short': 
        return Platform.OS === 'android'
          ? "0 0 0 0 0.2 0 0 0 0 1 0 0 0 0 0.2 0 0 0 0.9 0" // Green glow (Android)
          : "0 0 0 0 0.2 0 0 0 0 1 0 0 0 0 0.2 0 0 0 1 0";  // Green glow (iOS)
      case 'medium':
        return Platform.OS === 'android'
          ? "0 0 0 0 1 0 0 0 0 0.8 0 0 0 0 0.2 0 0 0 0.9 0" // Yellow glow (Android)
          : "0 0 0 0 1 0 0 0 0 0.8 0 0 0 0 0.2 0 0 0 1 0";  // Yellow glow (iOS)
      case 'long':
        return Platform.OS === 'android'
          ? "0 0 0 0 0.4 0 0 0 0 0.4 0 0 0 0 1 0 0 0 0.9 0" // Purple glow (Android)
          : "0 0 0 0 0.4 0 0 0 0 0.4 0 0 0 0 1 0 0 0 1 0";  // Purple glow (iOS)
      default:
        return filterMatrix;
    }
  };
  
  // Create platform-specific props
  const platformProps = Platform.OS === 'android' 
    ? { renderToHardwareTextureAndroid: true } 
    : { shouldRasterizeIOS: true };
  
  return (
    <View 
      style={[
        styles.container, 
        { 
          width, 
          height,
        },
        Platform.OS === 'android' ? styles.androidOptimizations : null
      ]}
      {...platformProps}
    >
      <Svg width="100%" height="100%" style={{ overflow: 'visible' }}>
        {/* Glow stroke outline - REMOVED
        <AnimatedRect
          x={strokeOffset}
          y={strokeOffset}
          width={adjustedWidth}
          height={adjustedHeight}
          rx={adjustedRadius}
          ry={adjustedRadius}
          strokeWidth={effectiveStrokeWidth * 1.55} 
          fill="transparent"
          strokeDasharray={perimeter}
          stroke={baseColor}
          filter={`url(#${FILTER_ID})`}
          opacity={Platform.OS === 'android' ? 0.6 : 0.7} 
          animatedProps={animatedProps}
          strokeLinejoin="round" 
        /> 
        */}
        
        {/* Main stroke outline */}
        <AnimatedRect
          x={strokeOffset}
          y={strokeOffset}
          width={adjustedWidth}
          height={adjustedHeight}
          rx={adjustedRadius}
          ry={adjustedRadius}
          strokeWidth={effectiveStrokeWidth}
          fill="transparent"
          strokeDasharray={perimeter}
          strokeLinecap="round"
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    // Reduce pressure on the UI thread
    backfaceVisibility: 'hidden',
  },
  // Platform-specific optimizations
  androidOptimizations: {
    opacity: 0.95,
  }
});

// Add displayName after the component definition
SpotlightProgressBar.displayName = 'SpotlightProgressBar';

export default SpotlightProgressBar; 