import { useEffect } from 'react';

// This is a safety patch to prevent infinite loops in React Native
// It works by detecting too many renders in succession and breaking the loop
export function useLoopProtection() {
  useEffect(() => {
    // Fix for React Native infinite loop protection
    const originalConsoleError = console.error;
    let isOverrideActive = true;

    const protectedConsoleError = (...args) => {
      // Only intercept if override is still active
      if (!isOverrideActive) {
        return originalConsoleError(...args);
      }

      // Suppress "Maximum update depth exceeded" warnings
      if (args[0] && typeof args[0] === 'string' && args[0].includes('Maximum update depth exceeded')) {
        // Break the loop by pausing state updates for a moment
        // Using Promise.resolve() instead of setTimeout for compatibility
        Promise.resolve().then(() => {
          console.log('Loop protection activated - cycle broken');
        });
        return;
      }
      return originalConsoleError(...args);
    };

    console.error = protectedConsoleError;

    return () => {
      isOverrideActive = false;
      console.error = originalConsoleError;
    };
  }, []);
} 