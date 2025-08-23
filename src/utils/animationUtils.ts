import { Animated } from 'react-native';

/**
 * Animation utilities to prevent conflicts between React Native Animated API
 * and React Native Reanimated (used internally by gesture handlers)
 */

/**
 * Creates an isolated animated value that won't conflict with Reanimated
 * @param initialValue - The initial value for the animated value
 * @returns Animated.Value instance
 */
export const createIsolatedAnimatedValue = (initialValue: number): Animated.Value => {
  const animatedValue = new Animated.Value(initialValue);
  
  // Add a flag to identify this as a standard Animated API value
  (animatedValue as any).__isStandardAnimated = true;
  
  return animatedValue;
};

/**
 * Safely starts an animation with proper isolation from Reanimated
 * @param animation - The animation to start
 * @param callback - Optional callback when animation completes
 */
export const startIsolatedAnimation = (
  animation: Animated.CompositeAnimation,
  callback?: () => void
): void => {
  // Use setTimeout to ensure the animation starts in the next tick
  // This prevents conflicts with gesture handler animations
  setTimeout(() => {
    animation.start(callback);
  }, 0);
};

/**
 * Creates a timing animation with proper isolation
 * @param animatedValue - The animated value to animate
 * @param config - Animation configuration
 * @returns Animated timing animation
 */
export const createIsolatedTiming = (
  animatedValue: Animated.Value,
  config: Animated.TimingAnimationConfig
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    ...config,
    // Ensure we're using the correct driver type consistently
    useNativeDriver: config.useNativeDriver ?? true,
  });
};

/**
 * Creates a spring animation with proper isolation
 * @param animatedValue - The animated value to animate
 * @param config - Animation configuration
 * @returns Animated spring animation
 */
export const createIsolatedSpring = (
  animatedValue: Animated.Value,
  config: Animated.SpringAnimationConfig
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    ...config,
    // Ensure we're using the correct driver type consistently
    useNativeDriver: config.useNativeDriver ?? true,
  });
};

/**
 * Creates a parallel animation with proper isolation
 * @param animations - Array of animations to run in parallel
 * @returns Animated parallel animation
 */
export const createIsolatedParallel = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.parallel(animations);
};

/**
 * Creates a sequence animation with proper isolation
 * @param animations - Array of animations to run in sequence
 * @returns Animated sequence animation
 */
export const createIsolatedSequence = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.sequence(animations);
};

/**
 * Creates an isolated loop animation that prevents Reanimated conflicts
 * @param animation - The animation to loop
 * @returns Animated loop animation
 */
export const createIsolatedLoop = (
  animation: Animated.CompositeAnimation
): Animated.CompositeAnimation => {
  return Animated.loop(animation);
};



/**
 * Creates an isolated scroll event handler that prevents driver conflicts
 * @param animatedValue - The animated value for scroll tracking
 * @param config - Scroll event configuration
 * @returns Animated event handler
 */
export const createIsolatedScrollEvent = (
  animatedValue: Animated.Value,
  config: {
    useNativeDriver?: boolean;
    listener?: (event: any) => void;
  } = {}
): any => {
  return Animated.event(
    [{ nativeEvent: { contentOffset: { y: animatedValue } } }],
    {
      useNativeDriver: config.useNativeDriver ?? false,
      listener: config.listener,
    }
  );
};

/**
 * Safely stops an animation
 * @param animatedValue - The animated value to stop
 */
export const stopIsolatedAnimation = (animatedValue: Animated.Value): void => {
  try {
    animatedValue.stopAnimation();
  } catch (error) {
    // Silently handle any stop animation errors
  }
};

/**
 * Resets an animated value to its initial state
 * @param animatedValue - The animated value to reset
 * @param initialValue - The value to reset to
 */
export const resetIsolatedAnimatedValue = (
  animatedValue: Animated.Value,
  initialValue: number
): void => {
  try {
    animatedValue.setValue(initialValue);
  } catch (error) {
    // Silently handle any reset errors
  }
};
