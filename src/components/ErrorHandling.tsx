import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ErrorStateProps {
  error: string | null;
  onRetry?: () => void;
  onBack?: () => void;
}

interface LoadingStateProps {
  message?: string;
}

interface EmptyStateProps {
  message: string;
  actionText?: string;
  onAction?: () => void;
}

// Error state component
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, onBack }) => {
  if (!error) return null;

  return (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={48} color="#FF6B6B" />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>

      <View style={styles.errorButtons}>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={20} color="#8A7DF6" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Loading state component
export const LoadingState: React.FC<LoadingStateProps> = ({ message = "Loading..." }) => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6E69F4" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

// Empty state component
export const EmptyState: React.FC<EmptyStateProps> = ({ message, actionText, onAction }) => {
  return (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="chat-bubble-outline" size={48} color="#8E8E93" />
      <Text style={styles.emptyTitle}>{message}</Text>

      {actionText && onAction && (
        <TouchableOpacity style={styles.emptyActionButton} onPress={onAction}>
          <Text style={styles.emptyActionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Skeleton loader for messages
export const MessageSkeletonLoader: React.FC = () => {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skeletonMessage}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonHeader} />
            <View style={styles.skeletonText} />
            {i % 3 === 0 && <View style={styles.skeletonTextShort} />}
          </View>
        </View>
      ))}
    </View>
  );
};

// Network status indicator
export const NetworkStatusIndicator: React.FC<{ isConnected: boolean }> = ({ isConnected }) => {
  if (isConnected) return null;

  return (
    <View style={styles.networkWarning}>
      <MaterialIcons name="wifi-off" size={16} color="#FF9500" />
      <Text style={styles.networkWarningText}>No internet connection</Text>
    </View>
  );
};

// Error boundary for chat components
export class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chat component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorState
          error="Chat temporarily unavailable"
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

// Custom hook for error handling
export const useErrorHandler = () => {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleError = React.useCallback((error: string) => {
    setError(error);
    setLoading(false);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const startLoading = React.useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const stopLoading = React.useCallback(() => {
    setLoading(false);
  }, []);

  const withErrorHandling = React.useCallback(async <T,>(
    operation: () => Promise<T>,
    errorMessage: string = "An error occurred"
  ): Promise<T | null> => {
    try {
      startLoading();
      const result = await operation();
      stopLoading();
      return result;
    } catch (error: any) {
      handleError(error.message || errorMessage);
      return null;
    }
  }, [startLoading, stopLoading, handleError]);

  return {
    error,
    loading,
    handleError,
    clearError,
    startLoading,
    stopLoading,
    withErrorHandling
  };
};

const styles = StyleSheet.create({
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#131318',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6E69F4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6E69F4',
  },
  backButtonText: {
    color: '#6E69F4',
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#131318',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#131318',
  },
  emptyTitle: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  emptyActionButton: {
    backgroundColor: '#6E69F4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Skeleton loader styles
  skeletonContainer: {
    padding: 16,
  },
  skeletonMessage: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonHeader: {
    width: '40%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonText: {
    width: '80%',
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 7,
    marginBottom: 6,
  },
  skeletonTextShort: {
    width: '60%',
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 7,
  },

  // Network status styles
  networkWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  networkWarningText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
