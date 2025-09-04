import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

/**
 * React Native-compatible error boundary for stream operations
 * Provides graceful degradation when stream prevention system fails
 */
export class StreamErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log the error
    console.error('🚨 StreamErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to crash analytics if available
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: any) => {
    try {
      // Here you could integrate with crash reporting services like:
      // - Firebase Crashlytics
      // - Sentry
      // - Bugsnag
      
      console.log('📊 Reporting error to analytics...');
      
      // For now, just log the error details
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: 'React Native App'
      };
      
      console.log('Error report:', JSON.stringify(errorReport, null, 2));
      
    } catch (reportingError) {
      console.error('❌ Error reporting failed:', reportingError);
    }
  };

  private handleRetry = () => {
    // Reset error state to retry
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleShowDetails = () => {
    const { error } = this.state;
    
    Alert.alert(
      'Error Details',
      `${error?.message || 'Unknown error'}\n\nThis error has been logged for investigation.`,
      [
        { text: 'OK', style: 'default' },
        { 
          text: 'Retry', 
          style: 'default',
          onPress: this.handleRetry 
        }
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <Ionicons name="warning-outline" size={48} color="#FF6B6B" />
            
            <Text style={styles.errorTitle}>
              Something went wrong
            </Text>
            
            <Text style={styles.errorMessage}>
              The live stream feature encountered an error. You can try again or continue using other features.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.retryButton]} 
                onPress={this.handleRetry}
              >
                <Ionicons name="refresh" size={16} color="#FFF" />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.detailsButton]} 
                onPress={this.handleShowDetails}
              >
                <Ionicons name="information-circle-outline" size={16} color="#666" />
                <Text style={[styles.buttonText, styles.detailsButtonText]}>Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1117',
    padding: 20,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#CCC',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  retryButton: {
    backgroundColor: '#5865F2',
  },
  detailsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  detailsButtonText: {
    color: '#666',
  },
});

/**
 * Higher-order component to wrap components with error boundary
 */
export const withStreamErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: any) => void
) => {
  return (props: P) => (
    <StreamErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </StreamErrorBoundary>
  );
};

export default StreamErrorBoundary;
