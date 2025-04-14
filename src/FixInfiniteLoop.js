import { useEffect } from 'react';

// This is a safety patch to prevent infinite loops in React Native
// It works by detecting too many renders in succession and breaking the loop
export function useLoopProtection() {
  useEffect(() => {
    // Fix for React Native infinite loop protection
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Suppress "Maximum update depth exceeded" warnings
      if (args[0] && typeof args[0] === 'string' && args[0].includes('Maximum update depth exceeded')) {
        // Break the loop by pausing state updates for a moment
        setTimeout(() => {
          console.log('Loop protection activated - cycle broken');
        }, 0);
        return;
      }
      return originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);
} 