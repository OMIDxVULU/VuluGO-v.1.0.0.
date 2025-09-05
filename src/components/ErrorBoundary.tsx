import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert
} from 'react-native';

// Import proper ErrorUtils types
import type { ErrorHandlerCallback } from '../types/global';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Instance properties to store previous handlers for this specific ErrorBoundary
  private previousErrorHandler: ErrorHandlerCallback | null = null;
  private previousRejectionHandler: ((reason: any) => void) | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };

    // Set up React Native global error handlers
    this.setupGlobalErrorHandlers();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    // Store error details in state
    this.setState({ errorInfo });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to your analytics/logging service
    // Example: Firebase Crashlytics, Sentry, etc.
    // logErrorToService(error, errorInfo);
  }

  // Set up React Native compatible global error handlers
  private setupGlobalErrorHandlers = () => {
    // Store previous handlers in instance properties
    if (ErrorUtils && ErrorUtils.getGlobalHandler) {
      this.previousErrorHandler = ErrorUtils.getGlobalHandler();
    }

    // Set up React Native error handler
    if (ErrorUtils && ErrorUtils.setGlobalHandler) {
      ErrorUtils.setGlobalHandler(this.handleGlobalError);
    }

    // Set up promise rejection handler for React Native
    if (typeof globalThis !== 'undefined') {
      this.previousRejectionHandler = globalThis.onunhandledrejection;
      globalThis.onunhandledrejection = this.handleUnhandledRejection;
    }
  };

  // Handle global JavaScript errors
  private handleGlobalError = (error: any, isFatal?: boolean) => {
    console.error('Global error caught by ErrorBoundary:', error, { isFatal });

    // Call previous handler if it exists
    if (this.previousErrorHandler) {
      this.previousErrorHandler(error, isFatal);
    }

    // Prevent infinite loops by checking if already in error state
    if (!this.state.hasError) {
      // Update state to show error UI
      this.setState({
        hasError: true,
        error: error instanceof Error ? error : new Error(String(error)),
        errorInfo: null
      });
    }
  };

  // Handle unhandled promise rejections (React Native compatible)
  private handleUnhandledRejection = (reason: any) => {
    console.error('Unhandled promise rejection:', reason);

    // Call previous handler if it exists
    if (this.previousRejectionHandler) {
      this.previousRejectionHandler(reason);
    }

    // Prevent infinite loops by checking if already in error state
    if (!this.state.hasError) {
      // Treat as a regular error
      this.setState({
        hasError: true,
        error: new Error(`Unhandled Promise Rejection: ${reason}`),
        errorInfo: null
      });
    }
  };

  componentWillUnmount(): void {
    // Restore previous error handlers with proper error handling
    if (ErrorUtils && ErrorUtils.setGlobalHandler && this.previousErrorHandler) {
      try {
        ErrorUtils.setGlobalHandler(this.previousErrorHandler);
      } catch (error) {
        console.warn('Failed to restore previous error handler:', error);
      }
    }

    if (typeof globalThis !== 'undefined' && this.previousRejectionHandler) {
      try {
        globalThis.onunhandledrejection = this.previousRejectionHandler;
      } catch (error) {
        console.warn('Failed to restore previous rejection handler:', error);
      }
    }
  }
  
  handleRestart = async (): Promise<void> => {
    try {
      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Try to reload the app
      try {
        await Updates.reloadAsync();
      } catch (reloadError) {
        // Fallback for dev environments or if reload fails
        router.replace('/(main)');
      }
    } catch (error) {
      console.error('Failed to restart app:', error);
      Alert.alert(
        'Restart Failed',
        'Unable to restart the app. Please close and reopen it manually.',
        [{ text: 'OK' }]
      );
    }
  };
  
  handleGoBack = (): void => {
    try {
      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      
      // Go back to the previous screen or home
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(main)');
      }
      
      // Reset the error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    } catch (error) {
      console.error('Failed to navigate back:', error);
      // Force navigation to home screen as last resort
      router.replace('/(main)');
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.header}>
            <FontAwesome name="exclamation-triangle" size={40} color="#FF6B6B" />
            <Text style={styles.headerText}>Something went wrong</Text>
          </View>
          
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorMessage}>{error?.toString()}</Text>
              
              {__DEV__ && errorInfo && errorInfo.componentStack && (
                <View style={styles.componentStack}>
                  <Text style={styles.stackTitle}>Component Stack:</Text>
                  <Text style={styles.stackText}>
                    {errorInfo.componentStack.split('\n').slice(0, 10).join('\n')}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.backButton]} 
              onPress={this.handleGoBack}
            >
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.restartButton]} 
              onPress={this.handleRestart}
            >
              <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Restart App</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B22',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(38, 39, 48, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#FF6B6B',
    marginBottom: 16,
  },
  componentStack: {
    marginTop: 10,
  },
  stackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  stackText: {
    fontSize: 14,
    color: '#AAAAAA',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 6,
  },
  backButton: {
    backgroundColor: '#3A3B45',
  },
  restartButton: {
    backgroundColor: '#8A7DF6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  }
});

export default ErrorBoundary; 