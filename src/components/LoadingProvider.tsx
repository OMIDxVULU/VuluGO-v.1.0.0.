import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface LoadingContextType {
  isAppReady: boolean;
  setAppReady: (ready: boolean) => void;
  addLoadingTask: (taskId: string) => void;
  removeLoadingTask: (taskId: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

/**
 * LoadingProvider manages the overall app loading state
 * Prevents race conditions between context providers
 * Maintains the existing dark theme design
 */
export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());
  const { loading: authLoading } = useAuth();

  // Add a loading task
  const addLoadingTask = (taskId: string) => {
    setLoadingTasks(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(taskId)) {
        newSet.add(taskId);
        // Only set app not ready when transitioning from empty to non-empty
        if (prev.size === 0) {
          setIsAppReady(false);
        }
      }
      return newSet;
    });
  };

  // Remove a loading task
  const removeLoadingTask = (taskId: string) => {
    setLoadingTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
        // Only set app ready when transitioning to empty and auth is not loading
        if (newSet.size === 0 && !authLoading) {
          setIsAppReady(true);
        }
      }
      return newSet;
    });
  };

  // Set app ready when all tasks are complete
  useEffect(() => {
    if (loadingTasks.size === 0 && !authLoading) {
      // Small delay to ensure all providers are ready
      const timer = setTimeout(() => {
        setIsAppReady(true);
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setIsAppReady(false);
    }
  }, [loadingTasks.size, authLoading]);

  const setAppReady = (ready: boolean) => {
    setIsAppReady(ready);
  };

  const value: LoadingContextType = {
    isAppReady,
    setAppReady,
    addLoadingTask,
    removeLoadingTask,
  };

  // Show loading screen while app is not ready - don't render children until ready
  if (!isAppReady) {
    return (
      <LoadingContext.Provider value={value}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6E69F4" />
          <Text style={styles.loadingText}>Loading VuluGO...</Text>
          {__DEV__ && loadingTasks.size > 0 && (
            <Text style={styles.debugText}>
              Loading tasks: {Array.from(loadingTasks).join(', ')}
            </Text>
          )}
        </View>
      </LoadingContext.Provider>
    );
  }

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#131318', // Match app background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  debugText: {
    color: '#AAAAAB',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default LoadingProvider;
