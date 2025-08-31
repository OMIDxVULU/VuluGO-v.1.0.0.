import { useEffect, useRef, useCallback } from 'react';
import { PanResponder, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';

export const useActivityTracker = () => {
  const { updateActivity, user } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const activityThrottleMs = 30000; // Update activity at most once every 30 seconds

  const throttledUpdateActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current > activityThrottleMs) {
      lastActivityRef.current = now;
      updateActivity();
    }
  }, [updateActivity]);

  // Create PanResponder to detect touch events
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      if (user) {
        throttledUpdateActivity();
      }
      return false; // Don't capture the touch, just track it
    },
    onMoveShouldSetPanResponder: () => {
      if (user) {
        throttledUpdateActivity();
      }
      return false;
    },
  });

  // Track scroll events and other interactions
  const trackActivity = useCallback(() => {
    if (user) {
      throttledUpdateActivity();
    }
  }, [user, throttledUpdateActivity]);

  // Set up global activity tracking
  useEffect(() => {
    if (!user) return;

    // Track initial activity
    throttledUpdateActivity();

    // Set up periodic activity updates for active usage
    const activityInterval = setInterval(() => {
      // Only update if user is actively using the app
      // This is a fallback to ensure session stays active during continuous usage
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity < 60000) { // If activity within last minute
        updateActivity();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      clearInterval(activityInterval);
    };
  }, [user, updateActivity, throttledUpdateActivity]);

  return {
    panResponder,
    trackActivity,
  };
};

export default useActivityTracker;
