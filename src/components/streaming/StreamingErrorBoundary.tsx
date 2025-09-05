/**
 * Streaming Error Boundary - Comprehensive error handling for streaming components
 * Handles Firebase stream access failures, Agora RTC engine issues, and provides recovery options
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FirebaseErrorHandler } from '../../utils/firebaseErrorHandler';

interface StreamingErrorBoundaryProps {
  children: ReactNode;
  streamId?: string;
  userId?: string;
  onRetry?: () => void;
  onFallback?: () => void;
  fallbackComponent?: ReactNode;
}

interface StreamingErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  retryCount: number;
  isRecovering: boolean;
  errorType: 'firebase' | 'agora' | 'network' | 'unknown';
}

export class StreamingErrorBoundary extends Component<
  StreamingErrorBoundaryProps,
  StreamingErrorBoundaryState
> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: StreamingErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<StreamingErrorBoundaryState> {
    // Analyze error type
    let errorType: 'firebase' | 'agora' | 'network' | 'unknown' = 'unknown';
    
    if (error.message.includes('Firebase') || error.message.includes('permission-denied')) {
      errorType = 'firebase';
    } else if (error.message.includes('Agora') || error.message.includes('RTC')) {
      errorType = 'agora';
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      errorType = 'network';
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[STREAMING_ERROR_BOUNDARY] Caught streaming error:', error);
    console.error('[STREAMING_ERROR_BOUNDARY] Error info:', errorInfo);

    this.setState({
      errorInfo,
    });

    // Log error with Firebase error handler
    FirebaseErrorHandler.logError('StreamingErrorBoundary', error, {
      streamId: this.props.streamId,
      userId: this.props.userId,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = async () => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      Alert.alert(
        'Maximum Retries Reached',
        'Unable to recover from streaming error. Please restart the app or try again later.',
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Restart App', 
            style: 'destructive',
            onPress: () => {
              // TODO: Implement app restart logic
              console.log('App restart requested');
            }
          }
        ]
      );
      return;
    }

    this.setState({
      isRecovering: true,
      retryCount: retryCount + 1,
    });

    try {
      // Call custom retry handler if provided
      if (this.props.onRetry) {
        await this.props.onRetry();
      }

      // Wait a bit before clearing error state
      this.retryTimeout = setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isRecovering: false,
        });
      }, 1000);

    } catch (retryError: any) {
      console.error('[STREAMING_ERROR_BOUNDARY] Retry failed:', retryError);
      
      this.setState({
        isRecovering: false,
        error: retryError,
      });

      Alert.alert(
        'Retry Failed',
        `Failed to recover: ${retryError.message}`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  handleFallback = () => {
    if (this.props.onFallback) {
      this.props.onFallback();
    } else {
      // Default fallback: clear error and continue with limited functionality
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
      });
    }
  };

  getErrorMessage = (): string => {
    const { error, errorType } = this.state;
    
    if (!error) return 'Unknown streaming error occurred';

    switch (errorType) {
      case 'firebase':
        if (error.message.includes('permission-denied')) {
          return 'Stream access denied. Please sign in to join this stream.';
        }
        if (error.message.includes('not-found')) {
          return 'Stream not found. It may have ended or been removed.';
        }
        return 'Database connection error. Please check your internet connection.';
        
      case 'agora':
        if (error.message.includes('join')) {
          return 'Failed to join audio stream. Trying to reconnect...';
        }
        if (error.message.includes('initialize')) {
          return 'Audio streaming service error. Some features may be limited.';
        }
        return 'Audio streaming error. You can still view the stream without audio.';
        
      case 'network':
        return 'Network connection error. Please check your internet connection.';
        
      default:
        return error.message || 'An unexpected error occurred while streaming.';
    }
  };

  getErrorIcon = (): string => {
    const { errorType } = this.state;
    
    switch (errorType) {
      case 'firebase':
        return 'cloud-off';
      case 'agora':
        return 'volume-off';
      case 'network':
        return 'wifi-off';
      default:
        return 'error';
    }
  };

  render() {
    const { hasError, isRecovering, retryCount, errorType } = this.state;
    const { children, fallbackComponent } = this.props;

    if (!hasError) {
      return children;
    }

    // Use custom fallback component if provided
    if (fallbackComponent) {
      return fallbackComponent;
    }

    const errorMessage = this.getErrorMessage();
    const errorIcon = this.getErrorIcon();
    const canRetry = retryCount < this.maxRetries;

    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons 
            name={errorIcon as any} 
            size={48} 
            color="#FF6B6B" 
            style={styles.errorIcon}
          />
          
          <Text style={styles.errorTitle}>
            {errorType === 'firebase' ? 'Connection Error' :
             errorType === 'agora' ? 'Audio Error' :
             errorType === 'network' ? 'Network Error' :
             'Streaming Error'}
          </Text>
          
          <Text style={styles.errorMessage}>
            {errorMessage}
          </Text>

          {retryCount > 0 && (
            <Text style={styles.retryInfo}>
              Retry attempt {retryCount} of {this.maxRetries}
            </Text>
          )}

          <View style={styles.buttonContainer}>
            {canRetry && (
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={this.handleRetry}
                disabled={isRecovering}
              >
                <MaterialIcons 
                  name="refresh" 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>
                  {isRecovering ? 'Retrying...' : 'Retry'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.fallbackButton]}
              onPress={this.handleFallback}
              disabled={isRecovering}
            >
              <MaterialIcons 
                name="skip-next" 
                size={20} 
                color="#6E56F7" 
                style={styles.buttonIcon}
              />
              <Text style={[styles.buttonText, styles.fallbackButtonText]}>
                Continue Anyway
              </Text>
            </TouchableOpacity>
          </View>

          {errorType === 'agora' && (
            <Text style={styles.helpText}>
              Audio streaming is temporarily unavailable, but you can still view the stream.
            </Text>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1117',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#151924',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#B0B3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  retryInfo: {
    fontSize: 14,
    color: '#8A8D93',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44,
  },
  retryButton: {
    backgroundColor: '#6E56F7',
  },
  fallbackButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6E56F7',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fallbackButtonText: {
    color: '#6E56F7',
  },
  helpText: {
    fontSize: 12,
    color: '#8A8D93',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});

export default StreamingErrorBoundary;
