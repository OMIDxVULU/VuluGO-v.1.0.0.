import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook to safely execute async operations and prevent memory leaks
 * Automatically cancels operations when component unmounts
 */
export const useSafeAsync = () => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeAsync = useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    try {
      const result = await asyncOperation();
      
      // Only execute callback if component is still mounted
      if (isMountedRef.current && onSuccess) {
        onSuccess(result);
      }
      
      return isMountedRef.current ? result : null;
    } catch (error) {
      // Only execute error callback if component is still mounted
      if (isMountedRef.current && onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
      
      if (isMountedRef.current) {
        throw error;
      }
      
      return null;
    }
  }, []);

  const isMounted = useCallback(() => isMountedRef.current, []);

  return { safeAsync, isMounted };
};

export default useSafeAsync;
