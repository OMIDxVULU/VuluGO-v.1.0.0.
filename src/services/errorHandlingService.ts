/**
 * Error Handling Service
 * Centralized error handling, logging, and recovery mechanisms
 */

import { Alert } from 'react-native';
import { captureException, captureMessage, addBreadcrumb } from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ErrorContext {
  userId?: string;
  streamId?: string;
  action?: string;
  component?: string;
  additionalData?: any;
}

export interface ErrorLog {
  id: string;
  error: Error;
  context: ErrorContext;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
  userAgent?: string;
  appVersion?: string;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'redirect' | 'refresh' | 'logout';
  label: string;
  action: () => void | Promise<void>;
}

class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errorLogs: ErrorLog[] = [];
  private maxErrorLogs = 100;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Initialize error handling service
   */
  async initialize(): Promise<void> {
    try {
      // Load persisted error logs
      await this.loadErrorLogs();
      
      // Set up global error handlers
      this.setupGlobalErrorHandlers();
      
      this.isInitialized = true;
      console.log('✅ Error Handling Service initialized');

    } catch (error) {
      console.error('Failed to initialize Error Handling Service:', error);
    }
  }

  /**
   * Handle error with context and recovery options
   */
  async handleError(
    error: Error,
    context: ErrorContext = {},
    severity: ErrorLog['severity'] = 'medium',
    showUserAlert: boolean = true,
    recoveryActions: RecoveryAction[] = []
  ): Promise<void> {
    try {
      // Create error log
      const errorLog = this.createErrorLog(error, context, severity);
      
      // Add to local logs
      this.addErrorLog(errorLog);
      
      // Log to console
      console.error(`[${severity.toUpperCase()}] Error in ${context.component || 'Unknown'}:`, error);
      
      // Add breadcrumb for debugging
      addBreadcrumb({
        message: `Error: ${error.message}`,
        category: 'error',
        level: severity === 'critical' ? 'error' : 'warning',
        data: context
      });

      // Report to crash analytics
      await this.reportError(error, context, severity);
      
      // Handle based on severity
      await this.handleBySeverity(error, context, severity, showUserAlert, recoveryActions);
      
      // Persist error logs
      await this.saveErrorLogs();

    } catch (handlingError) {
      console.error('Error in error handling:', handlingError);
    }
  }

  /**
   * Handle network errors specifically
   */
  async handleNetworkError(
    error: Error,
    context: ErrorContext = {},
    retryAction?: () => Promise<void>
  ): Promise<void> {
    const recoveryActions: RecoveryAction[] = [];
    
    if (retryAction) {
      recoveryActions.push({
        type: 'retry',
        label: 'Retry',
        action: retryAction
      });
    }

    recoveryActions.push({
      type: 'refresh',
      label: 'Refresh App',
      action: () => {
        // Would implement app refresh logic
        console.log('Refreshing app...');
      }
    });

    await this.handleError(
      error,
      { ...context, action: 'network_request' },
      'medium',
      true,
      recoveryActions
    );
  }

  /**
   * Handle streaming errors
   */
  async handleStreamingError(
    error: Error,
    streamId: string,
    context: ErrorContext = {},
    onRetry?: () => Promise<void>
  ): Promise<void> {
    const recoveryActions: RecoveryAction[] = [];
    
    if (onRetry) {
      recoveryActions.push({
        type: 'retry',
        label: 'Reconnect',
        action: onRetry
      });
    }

    recoveryActions.push({
      type: 'fallback',
      label: 'Switch to Audio Only',
      action: () => {
        console.log('Switching to audio only mode...');
      }
    });

    await this.handleError(
      error,
      { ...context, streamId, action: 'streaming' },
      'high',
      true,
      recoveryActions
    );
  }

  /**
   * Handle authentication errors
   */
  async handleAuthError(
    error: Error,
    context: ErrorContext = {},
    onReauth?: () => Promise<void>
  ): Promise<void> {
    const recoveryActions: RecoveryAction[] = [];
    
    if (onReauth) {
      recoveryActions.push({
        type: 'retry',
        label: 'Sign In Again',
        action: onReauth
      });
    }

    recoveryActions.push({
      type: 'logout',
      label: 'Sign Out',
      action: () => {
        console.log('Signing out user...');
      }
    });

    await this.handleError(
      error,
      { ...context, action: 'authentication' },
      'high',
      true,
      recoveryActions
    );
  }

  /**
   * Handle permission errors
   */
  async handlePermissionError(
    error: Error,
    permission: string,
    context: ErrorContext = {}
  ): Promise<void> {
    const recoveryActions: RecoveryAction[] = [
      {
        type: 'redirect',
        label: 'Open Settings',
        action: () => {
          console.log('Opening device settings...');
          // Would implement settings navigation
        }
      }
    ];

    await this.handleError(
      error,
      { ...context, action: 'permission_request', additionalData: { permission } },
      'medium',
      true,
      recoveryActions
    );
  }

  /**
   * Create error log entry
   */
  private createErrorLog(
    error: Error,
    context: ErrorContext,
    severity: ErrorLog['severity']
  ): ErrorLog {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error,
      context,
      timestamp: new Date(),
      severity,
      handled: true,
      userAgent: 'React Native App', // Would get actual user agent
      appVersion: '1.0.0' // Would get from app config
    };
  }

  /**
   * Add error log to collection
   */
  private addErrorLog(errorLog: ErrorLog): void {
    this.errorLogs.unshift(errorLog);
    
    // Limit number of stored logs
    if (this.errorLogs.length > this.maxErrorLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxErrorLogs);
    }
  }

  /**
   * Handle error based on severity
   */
  private async handleBySeverity(
    error: Error,
    context: ErrorContext,
    severity: ErrorLog['severity'],
    showUserAlert: boolean,
    recoveryActions: RecoveryAction[]
  ): Promise<void> {
    switch (severity) {
      case 'critical':
        if (showUserAlert) {
          this.showCriticalErrorAlert(error, recoveryActions);
        }
        break;
        
      case 'high':
        if (showUserAlert) {
          this.showHighSeverityAlert(error, recoveryActions);
        }
        break;
        
      case 'medium':
        if (showUserAlert && this.shouldShowMediumAlert(error)) {
          this.showMediumSeverityAlert(error, recoveryActions);
        }
        break;
        
      case 'low':
        // Log only, no user alert
        break;
    }
  }

  /**
   * Show critical error alert
   */
  private showCriticalErrorAlert(error: Error, recoveryActions: RecoveryAction[]): void {
    const buttons = recoveryActions.map(action => ({
      text: action.label,
      onPress: action.action,
      style: action.type === 'logout' ? 'destructive' : 'default' as any
    }));

    buttons.push({
      text: 'Cancel',
      style: 'cancel' as any
    });

    Alert.alert(
      'Critical Error',
      'A critical error occurred that may affect app functionality. Please choose how to proceed.',
      buttons
    );
  }

  /**
   * Show high severity alert
   */
  private showHighSeverityAlert(error: Error, recoveryActions: RecoveryAction[]): void {
    const buttons = recoveryActions.slice(0, 2).map(action => ({
      text: action.label,
      onPress: action.action
    }));

    buttons.push({
      text: 'Dismiss',
      style: 'cancel' as any
    });

    Alert.alert(
      'Error Occurred',
      this.getUserFriendlyMessage(error),
      buttons
    );
  }

  /**
   * Show medium severity alert
   */
  private showMediumSeverityAlert(error: Error, recoveryActions: RecoveryAction[]): void {
    const primaryAction = recoveryActions[0];
    
    const buttons = [];
    
    if (primaryAction) {
      buttons.push({
        text: primaryAction.label,
        onPress: primaryAction.action
      });
    }

    buttons.push({
      text: 'OK',
      style: 'cancel' as any
    });

    Alert.alert(
      'Something went wrong',
      this.getUserFriendlyMessage(error),
      buttons
    );
  }

  /**
   * Check if medium severity alert should be shown
   */
  private shouldShowMediumAlert(error: Error): boolean {
    // Don't show too many alerts for the same error type
    const recentSimilarErrors = this.errorLogs
      .filter(log => 
        log.timestamp.getTime() > Date.now() - 60000 && // Last minute
        log.error.name === error.name
      );

    return recentSimilarErrors.length < 3;
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'Please check your internet connection and try again.';
    }
    
    if (message.includes('permission')) {
      return 'This feature requires additional permissions. Please check your device settings.';
    }
    
    if (message.includes('agora') || message.includes('stream')) {
      return 'There was an issue with the streaming service. Please try again.';
    }
    
    if (message.includes('auth') || message.includes('unauthorized')) {
      return 'Your session has expired. Please sign in again.';
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Report error to analytics service
   */
  private async reportError(
    error: Error,
    context: ErrorContext,
    severity: ErrorLog['severity']
  ): Promise<void> {
    try {
      captureException(error, {
        tags: {
          severity,
          component: context.component,
          action: context.action
        },
        user: context.userId ? { id: context.userId } : undefined,
        contexts: {
          stream: context.streamId ? { streamId: context.streamId } : undefined,
          additional: context.additionalData
        }
      });

    } catch (reportingError) {
      console.error('Failed to report error to analytics:', reportingError);
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    const originalHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      this.handleError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        { action: 'unhandled_promise' },
        'high',
        false
      );

      if (originalHandler) {
        originalHandler(event);
      }
    };

    // Handle JavaScript errors
    const originalErrorHandler = global.ErrorUtils?.getGlobalHandler();
    global.ErrorUtils?.setGlobalHandler((error, isFatal) => {
      console.error('Global JavaScript error:', error, 'Fatal:', isFatal);
      
      this.handleError(
        error,
        { action: 'javascript_error', additionalData: { isFatal } },
        isFatal ? 'critical' : 'high',
        isFatal
      );

      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });
  }

  /**
   * Load error logs from storage
   */
  private async loadErrorLogs(): Promise<void> {
    try {
      const logsStr = await AsyncStorage.getItem('error_logs');
      if (logsStr) {
        const logs = JSON.parse(logsStr);
        this.errorLogs = logs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
          error: new Error(log.error.message)
        }));
      }
    } catch (error) {
      console.error('Failed to load error logs:', error);
    }
  }

  /**
   * Save error logs to storage
   */
  private async saveErrorLogs(): Promise<void> {
    try {
      const logsToSave = this.errorLogs.slice(0, 50).map(log => ({
        ...log,
        error: {
          name: log.error.name,
          message: log.error.message,
          stack: log.error.stack
        }
      }));

      await AsyncStorage.setItem('error_logs', JSON.stringify(logsToSave));
    } catch (error) {
      console.error('Failed to save error logs:', error);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
    recent: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const bySeverity: Record<string, number> = {};
    const byComponent: Record<string, number> = {};
    let recent = 0;

    this.errorLogs.forEach(log => {
      // Count by severity
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      
      // Count by component
      const component = log.context.component || 'Unknown';
      byComponent[component] = (byComponent[component] || 0) + 1;
      
      // Count recent errors
      if (log.timestamp.getTime() > oneHourAgo) {
        recent++;
      }
    });

    return {
      total: this.errorLogs.length,
      bySeverity,
      byComponent,
      recent
    };
  }

  /**
   * Clear error logs
   */
  async clearErrorLogs(): Promise<void> {
    try {
      this.errorLogs = [];
      await AsyncStorage.removeItem('error_logs');
      console.log('✅ Error logs cleared');
    } catch (error) {
      console.error('Failed to clear error logs:', error);
    }
  }

  /**
   * Get recent error logs
   */
  getRecentErrors(limit: number = 10): ErrorLog[] {
    return this.errorLogs.slice(0, limit);
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

export default ErrorHandlingService.getInstance();
