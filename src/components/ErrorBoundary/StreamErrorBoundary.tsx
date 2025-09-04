/**
 * Stream Error Boundary Component
 * Comprehensive error handling for streaming scenarios with graceful degradation
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { captureException } from '@sentry/react-native';

// Discord-inspired colors
const colors = {
  background: '#0f1117',
  cardBackground: '#151924',
  accent: '#5865F2',
  text: '#FFFFFF',
  textMuted: '#B9BBBE',
  textSecondary: '#72767D',
  error: '#ED4245',
  warning: '#FAA61A',
  success: '#3BA55C'
};

interface StreamErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface StreamErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
  retryCount: number;
}

export class StreamErrorBoundary extends Component<StreamErrorBoundaryProps, StreamErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: StreamErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<StreamErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = this.generateErrorId();
    
    this.setState({
      errorInfo,
      errorId
    });

    // Log error to console
    console.error('StreamErrorBoundary caught an error:', error, errorInfo);

    // Report to crash analytics (Sentry, Crashlytics, etc.)
    try {
      captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        },
        tags: {
          errorBoundary: 'StreamErrorBoundary',
          errorId
        }
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Auto-retry for certain types of errors
    if (this.shouldAutoRetry(error) && this.state.retryCount < 3) {
      this.scheduleAutoRetry();
    }
  }

  componentDidUpdate(prevProps: StreamErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when specified props change
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
      );

      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldAutoRetry(error: Error): boolean {
    // Auto-retry for network-related errors
    const networkErrors = [
      'Network request failed',
      'TypeError: Network request failed',
      'Connection timeout',
      'NETWORK_ERROR'
    ];

    return networkErrors.some(networkError => 
      error.message.includes(networkError) || error.name.includes(networkError)
    );
  }

  private scheduleAutoRetry(): void {
    this.resetTimeoutId = setTimeout(() => {
      console.log(`Auto-retrying after error (attempt ${this.state.retryCount + 1})`);
      this.resetError();
    }, 2000 * (this.state.retryCount + 1)) as any; // Exponential backoff
  }

  private resetError = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private copyErrorToClipboard = async (): Promise<void> => {
    try {
      const { error, errorInfo, errorId } = this.state;
      const errorText = `
Error ID: ${errorId}
Error: ${error?.name}: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
      `.trim();

      await Clipboard.setStringAsync(errorText);
      Alert.alert('Copied', 'Error details copied to clipboard');
    } catch (clipboardError) {
      console.error('Failed to copy error to clipboard:', clipboardError);
      Alert.alert('Error', 'Failed to copy error details');
    }
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallbackComponent: FallbackComponent } = this.props;

    if (hasError) {
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            resetError={this.resetError}
            retryCount={retryCount}
          />
        );
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
          retryCount={retryCount}
          onCopyError={this.copyErrorToClipboard}
        />
      );
    }

    return children;
  }
}

interface DefaultErrorFallbackProps extends ErrorFallbackProps {
  onCopyError: () => void;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  retryCount,
  onCopyError
}: DefaultErrorFallbackProps) {
  const getErrorCategory = (error: Error | null): string => {
    if (!error) return 'Unknown Error';

    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network Error';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Permission Error';
    }
    if (message.includes('agora') || message.includes('stream')) {
      return 'Streaming Error';
    }
    if (name.includes('typeerror')) {
      return 'Code Error';
    }
    if (name.includes('rangeerror') || name.includes('referenceerror')) {
      return 'Runtime Error';
    }

    return 'Application Error';
  };

  const getErrorSuggestion = (error: Error | null): string => {
    if (!error) return 'Please try refreshing the app.';

    const message = error.message.toLowerCase();

    if (message.includes('network')) {
      return 'Check your internet connection and try again.';
    }
    if (message.includes('permission')) {
      return 'Please check app permissions in your device settings.';
    }
    if (message.includes('agora') || message.includes('stream')) {
      return 'There may be an issue with the streaming service. Please try again later.';
    }

    return 'Please try restarting the app or contact support if the issue persists.';
  };

  const errorCategory = getErrorCategory(error);
  const errorSuggestion = getErrorSuggestion(error);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={64} color={colors.error} />
        </View>

        {/* Error Title */}
        <Text style={styles.title}>Oops! Something went wrong</Text>
        
        {/* Error Category */}
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>{errorCategory}</Text>
        </View>

        {/* Error Message */}
        <Text style={styles.message}>
          {error?.message || 'An unexpected error occurred'}
        </Text>

        {/* Error Suggestion */}
        <Text style={styles.suggestion}>{errorSuggestion}</Text>

        {/* Retry Information */}
        {retryCount > 0 && (
          <Text style={styles.retryInfo}>
            Retry attempts: {retryCount}
          </Text>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={resetError}>
            <Ionicons name="refresh" size={20} color={colors.text} />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onCopyError}>
            <Ionicons name="copy" size={20} color={colors.textMuted} />
            <Text style={styles.secondaryButtonText}>Copy Error Details</Text>
          </TouchableOpacity>
        </View>

        {/* Debug Information (Development only) */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Information</Text>
            <Text style={styles.debugText}>
              Error: {error?.name}: {error?.message}
            </Text>
            {error?.stack && (
              <Text style={styles.debugText} numberOfLines={10}>
                Stack: {error.stack}
              </Text>
            )}
            {errorInfo?.componentStack && (
              <Text style={styles.debugText} numberOfLines={10}>
                Component Stack: {errorInfo.componentStack}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  categoryContainer: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  suggestion: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryInfo: {
    fontSize: 12,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textMuted,
  },
  debugContainer: {
    width: '100%',
    marginTop: 32,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
});

export default StreamErrorBoundary;
