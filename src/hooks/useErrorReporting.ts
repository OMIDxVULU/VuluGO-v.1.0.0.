import { useCallback, useEffect } from 'react';
import { ErrorInfo } from 'react';
import { analyticsService } from '../services/AnalyticsService';

/**
 * Custom hook for error reporting
 * 
 * This hook provides functions to report errors to the analytics service
 * and sets up global error handlers for unhandled errors and promise rejections.
 * 
 * @param componentName Name of the component using this hook (for better error context)
 * @returns Object with error reporting functions
 */
export const useErrorReporting = (componentName: string) => {
  /**
   * Report an error with additional context
   */
  const reportError = useCallback((error: Error, metadata: Record<string, any> = {}) => {
    analyticsService.reportError({
      error,
      metadata: {
        ...metadata,
        componentName,
        timestamp: Date.now(),
      }
    });
  }, [componentName]);

  /**
   * Handle errors from ErrorBoundary
   */
  const handleBoundaryError = useCallback((error: Error, errorInfo: ErrorInfo) => {
    analyticsService.reportError({
      error,
      componentStack: errorInfo.componentStack || '',
      metadata: {
        componentName,
        boundaryError: true,
        timestamp: Date.now(),
      }
    });
  }, [componentName]);

  /**
   * Set up global error handlers for the component
   */
  useEffect(() => {
    // Handler for unhandled promise rejections
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      reportError(error, {
        type: 'unhandled_promise_rejection',
        promise: String(event.promise),
      });
    };

    // Handler for uncaught errors
    const handleGlobalError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      
      reportError(error, {
        type: 'uncaught_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
      
      // Prevent default browser error handling
      event.preventDefault();
    };

    // Set up global handlers only on web
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handlePromiseRejection);
      window.addEventListener('error', handleGlobalError);

      // Clean up event listeners
      return () => {
        window.removeEventListener('unhandledrejection', handlePromiseRejection);
        window.removeEventListener('error', handleGlobalError);
      };
    }

    // For React Native, return empty cleanup function
    return () => {};
  }, [reportError]);

  /**
   * Try/catch wrapper for async functions
   * 
   * This function wraps an async function with try/catch and reports any errors
   */
  const withErrorReporting = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorMetadata: Record<string, any> = {}
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error(String(error));
        reportError(typedError, {
          ...errorMetadata,
          functionName: fn.name,
          args: JSON.stringify(args),
        });
        throw error; // Re-throw to allow caller to handle
      }
    };
  }, [reportError]);

  /**
   * Try/catch wrapper for synchronous functions
   */
  const withSyncErrorReporting = useCallback(<T extends any[], R>(
    fn: (...args: T) => R,
    errorMetadata: Record<string, any> = {}
  ) => {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error(String(error));
        reportError(typedError, {
          ...errorMetadata,
          functionName: fn.name,
          args: JSON.stringify(args),
        });
        throw error; // Re-throw to allow caller to handle
      }
    };
  }, [reportError]);

  return {
    reportError,
    handleBoundaryError,
    withErrorReporting,
    withSyncErrorReporting,
  };
};

export default useErrorReporting; 