// Firebase error handling utilities
import { FirebaseCircuitBreakers, executeWithCircuitBreaker } from './circuitBreaker';
import FirebaseIndexRefresh from './firebaseIndexRefresh';
import { firebaseConnectionManager } from './firebaseConnectionManager';

export interface FirebaseErrorInfo {
  code: string;
  message: string;
  userFriendlyMessage: string;
  shouldRetry: boolean;
  requiresAuth: boolean;
  severity: ErrorSeverity;
  category: ErrorCategory;
  operation?: string;
  context?: any;
  retryDelay?: number;
  maxRetries?: number;
  fallbackAction?: string;
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  NETWORK = 'network',
  STREAMING = 'streaming',
  CHAT_MESSAGING = 'chat_messaging',
  GAMING = 'gaming',
  PROFILE = 'profile',
  NOTIFICATION = 'notification',
  GUEST_RESTRICTION = 'guest_restriction',
  VALIDATION = 'validation',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info'
}

export class FirebaseErrorHandler {
  static handleError(error: any): FirebaseErrorInfo {
    // Check for connection issues and attempt recovery
    if (this.isConnectionError(error)) {
      console.log('🔗 Connection error detected, checking Firebase connectivity...');
      firebaseConnectionManager.checkConnection().catch(err => {
        console.warn('Connection check failed:', err);
      });
    }

    // Auto-refresh Firebase index cache if index errors are detected
    FirebaseIndexRefresh.autoRefreshOnIndexError(error);

    // Handle validation errors (user input issues)
    if (error?.message && this.isValidationError(error.message)) {
      return {
        code: 'validation-error',
        message: error.message,
        userFriendlyMessage: error.message,
        shouldRetry: false,
        requiresAuth: false,
        severity: ErrorSeverity.WARN,
        category: ErrorCategory.VALIDATION,
        retryDelay: 0,
        maxRetries: 0
      };
    }

    // Handle Firebase-specific errors
    if (error?.code) {
      switch (error.code) {
        case 'permission-denied':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Access denied. Please sign in to continue.',
            shouldRetry: false,
            requiresAuth: true,
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.PERMISSION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'redirect_to_auth'
          };

        case 'unavailable':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Service temporarily unavailable. Please try again.',
            shouldRetry: true,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.NETWORK,
            retryDelay: 2000,
            maxRetries: 3,
            fallbackAction: 'show_offline_mode'
          };

        case 'unauthenticated':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Please sign in to access this feature.',
            shouldRetry: false,
            requiresAuth: true,
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.AUTHENTICATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'redirect_to_auth'
          };

        case 'network-request-failed':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Network error. Please check your connection.',
            shouldRetry: true,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.NETWORK,
            retryDelay: 1000,
            maxRetries: 5,
            fallbackAction: 'show_offline_mode'
          };

        case 'quota-exceeded':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Service limit reached. Please try again later.',
            shouldRetry: true,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.SYSTEM,
            retryDelay: 30000,
            maxRetries: 2,
            fallbackAction: 'show_rate_limit_message'
          };

        case 'invalid-argument':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Invalid data provided. Please check your input.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.VALIDATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'show_validation_help'
          };

        case 'failed-precondition':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Service not ready. Please try again in a moment.',
            shouldRetry: true,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.SYSTEM,
            retryDelay: 3000,
            maxRetries: 3,
            fallbackAction: 'show_service_status'
          };

        case 'resource-exhausted':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Too many requests. Please wait a moment and try again.',
            shouldRetry: true,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.SYSTEM,
            retryDelay: 5000,
            maxRetries: 2,
            fallbackAction: 'show_rate_limit_message'
          };

        case 'cancelled':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Operation was cancelled. Please try again.',
            shouldRetry: true,
            requiresAuth: false,
            severity: ErrorSeverity.INFO,
            category: ErrorCategory.SYSTEM,
            retryDelay: 1000,
            maxRetries: 3,
            fallbackAction: 'retry_operation'
          };

        case 'data-loss':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Data corruption detected. Please contact support.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.SYSTEM,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'contact_support'
          };

        case 'deadline-exceeded':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Request timed out. Please check your connection and try again.',
            shouldRetry: true,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.NETWORK,
            retryDelay: 2000,
            maxRetries: 3,
            fallbackAction: 'check_connection'
          };

        case 'not-found':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Requested data not found.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.SYSTEM,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'show_not_found_help'
          };

        case 'already-exists':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'This item already exists.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.INFO,
            category: ErrorCategory.VALIDATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'show_existing_item'
          };

        case 'internal':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Internal server error. Please try again later.',
            shouldRetry: true,
            requiresAuth: false,
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.SYSTEM,
            retryDelay: 5000,
            maxRetries: 2,
            fallbackAction: 'show_system_status'
          };

        // Firebase Authentication specific errors
        case 'auth/email-already-in-use':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'This email is already registered. Please sign in or use a different email.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.AUTHENTICATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'switch_to_login'
          };

        case 'auth/weak-password':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Password is too weak. Please choose a stronger password with at least 6 characters.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.VALIDATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'show_password_requirements'
          };

        case 'auth/invalid-email':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Please enter a valid email address.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.VALIDATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'fix_email_format'
          };

        case 'auth/user-not-found':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'No account found with this email. Please check your email or create a new account.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.AUTHENTICATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'switch_to_signup'
          };

        case 'auth/wrong-password':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Incorrect password. Please try again or reset your password.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.AUTHENTICATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'show_forgot_password'
          };

        case 'auth/user-disabled':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'This account has been disabled. Please contact support.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.AUTHENTICATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'contact_support'
          };

        case 'auth/too-many-requests':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Too many failed attempts. Please try again later.',
            shouldRetry: true,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.AUTHENTICATION,
            retryDelay: 60000, // 1 minute
            maxRetries: 1,
            fallbackAction: 'show_rate_limit_message'
          };

        case 'auth/operation-not-allowed':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'This sign-in method is not enabled. Please contact support.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.AUTHENTICATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'contact_support'
          };

        case 'auth/invalid-credential':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Invalid credentials. Please check your email and password.',
            shouldRetry: false,
            requiresAuth: false,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.AUTHENTICATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'check_credentials'
          };

        case 'auth/requires-recent-login':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Please sign in again to continue.',
            shouldRetry: false,
            requiresAuth: true,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.AUTHENTICATION,
            retryDelay: 0,
            maxRetries: 0,
            fallbackAction: 'redirect_to_auth'
          };

        default:
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'An unexpected error occurred. Please try again.',
            shouldRetry: true,
            requiresAuth: false,
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.UNKNOWN,
            retryDelay: 3000,
            maxRetries: 2,
            fallbackAction: 'generic_retry'
          };
      }
    }

    // Handle generic errors
    return {
      code: 'unknown',
      message: error?.message || 'Unknown error',
      userFriendlyMessage: 'Something went wrong. Please try again.',
      shouldRetry: true,
      requiresAuth: false,
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.UNKNOWN,
      retryDelay: 3000,
      maxRetries: 2,
      fallbackAction: 'generic_retry'
    };
  }

  static logError(operation: string, error: any, context?: any): void {
    const errorInfo = this.handleError(error);
    this.logWithSeverity(errorInfo.severity, operation, errorInfo, context);
  }

  static logWithSeverity(severity: ErrorSeverity, operation: string, errorInfo: FirebaseErrorInfo, context?: any): void {
    const logData = {
      operation,
      code: errorInfo.code,
      message: errorInfo.message,
      category: errorInfo.category,
      severity: errorInfo.severity,
      shouldRetry: errorInfo.shouldRetry,
      requiresAuth: errorInfo.requiresAuth,
      retryDelay: errorInfo.retryDelay,
      maxRetries: errorInfo.maxRetries,
      fallbackAction: errorInfo.fallbackAction,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location?.href : 'Unknown'
    };

    switch (severity) {
      case ErrorSeverity.ERROR:
        console.error(`🔴 Firebase Error in ${operation}:`, logData);
        break;
      case ErrorSeverity.WARN:
        console.warn(`🟡 Firebase Warning in ${operation}:`, logData);
        break;
      case ErrorSeverity.INFO:
        console.info(`🔵 Firebase Info in ${operation}:`, logData);
        break;
      default:
        console.log(`⚪ Firebase Log in ${operation}:`, logData);
    }
  }

  static logErrorGroup(operation: string, errors: any[], context?: any): void {
    if (errors.length === 0) return;

    const errorGroups = this.groupErrorsByCategory(errors);

    console.group(`🔥 Firebase Error Group in ${operation} (${errors.length} errors)`);

    Object.entries(errorGroups).forEach(([category, categoryErrors]) => {
      console.group(`📂 ${category} (${categoryErrors.length} errors)`);

      categoryErrors.forEach((error, index) => {
        const errorInfo = this.handleError(error);
        console.log(`${index + 1}.`, {
          code: errorInfo.code,
          message: errorInfo.message,
          severity: errorInfo.severity,
          shouldRetry: errorInfo.shouldRetry
        });
      });

      console.groupEnd();
    });

    if (context) {
      console.log('Context:', context);
    }

    console.groupEnd();
  }

  static groupErrorsByCategory(errors: any[]): Record<string, any[]> {
    return errors.reduce((groups, error) => {
      const errorInfo = this.handleError(error);
      const category = errorInfo.category;

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(error);
      return groups;
    }, {} as Record<string, any[]>);
  }

  static isPermissionError(error: any): boolean {
    return error?.code === 'permission-denied' || error?.code === 'unauthenticated';
  }

  static isNetworkError(error: any): boolean {
    return error?.code === 'unavailable' || error?.code === 'network-request-failed';
  }

  static shouldShowToUser(error: any): boolean {
    const errorInfo = this.handleError(error);

    // Don't show permission errors to users if they're guest users
    if (this.isPermissionError(error)) {
      return false;
    }

    // Don't show system/internal errors to users
    if (errorInfo.category === ErrorCategory.SYSTEM && errorInfo.severity === ErrorSeverity.ERROR) {
      return false;
    }

    // Don't show validation errors that are too technical
    if (errorInfo.category === ErrorCategory.VALIDATION && errorInfo.code === 'invalid-argument') {
      return false;
    }

    // Show most other errors to users
    return true;
  }

  static shouldLogSilently(error: any): boolean {
    const errorInfo = this.handleError(error);

    // Log permission errors silently for guest users
    if (this.isPermissionError(error) && errorInfo.severity === ErrorSeverity.INFO) {
      return true;
    }

    // Log cancelled operations silently
    if (errorInfo.code === 'cancelled') {
      return true;
    }

    // Log network errors silently if they're frequent
    if (this.isNetworkError(error) && errorInfo.severity === ErrorSeverity.INFO) {
      return true;
    }

    return false;
  }

  static getRetryRecommendation(error: any): {
    shouldRetry: boolean;
    delay: number;
    maxAttempts: number;
    strategy: string;
  } {
    const errorInfo = this.handleError(error);

    if (!errorInfo.shouldRetry) {
      return {
        shouldRetry: false,
        delay: 0,
        maxAttempts: 0,
        strategy: 'no_retry'
      };
    }

    // Network errors: exponential backoff
    if (this.isNetworkError(error)) {
      return {
        shouldRetry: true,
        delay: errorInfo.retryDelay || 1000,
        maxAttempts: errorInfo.maxRetries || 5,
        strategy: 'exponential_backoff'
      };
    }

    // System errors: fixed delay
    if (errorInfo.category === ErrorCategory.SYSTEM) {
      return {
        shouldRetry: true,
        delay: errorInfo.retryDelay || 3000,
        maxAttempts: errorInfo.maxRetries || 3,
        strategy: 'fixed_delay'
      };
    }

    // Gaming errors: immediate retry with limit
    if (this.isGamingError(error)) {
      return {
        shouldRetry: true,
        delay: 500,
        maxAttempts: 2,
        strategy: 'immediate_retry'
      };
    }

    // Default retry strategy
    return {
      shouldRetry: true,
      delay: errorInfo.retryDelay || 2000,
      maxAttempts: errorInfo.maxRetries || 3,
      strategy: 'default'
    };
  }

  static getFallbackAction(error: any): {
    action: string;
    message: string;
    buttonText?: string;
    route?: string;
  } {
    const errorInfo = this.handleError(error);

    switch (errorInfo.fallbackAction) {
      case 'redirect_to_auth':
        return {
          action: 'redirect_to_auth',
          message: 'Please sign in to continue',
          buttonText: 'Sign In',
          route: '/auth'
        };

      case 'show_offline_mode':
        return {
          action: 'show_offline_mode',
          message: 'You\'re offline. Some features may be limited.',
          buttonText: 'Retry Connection'
        };

      case 'contact_support':
        return {
          action: 'contact_support',
          message: 'Something went wrong. Please contact support.',
          buttonText: 'Contact Support'
        };

      case 'show_rate_limit_message':
        return {
          action: 'show_rate_limit_message',
          message: 'Too many requests. Please wait a moment.',
          buttonText: 'Try Again Later'
        };

      case 'check_connection':
        return {
          action: 'check_connection',
          message: 'Please check your internet connection.',
          buttonText: 'Retry'
        };

      case 'show_validation_help':
        return {
          action: 'show_validation_help',
          message: 'Please check your input and try again.',
          buttonText: 'Fix Input'
        };

      default:
        return {
          action: 'generic_retry',
          message: 'Something went wrong. Please try again.',
          buttonText: 'Retry'
        };
    }
  }

  static isConnectionError(error: any): boolean {
    if (!error || !error.message) return false;

    const message = error.message.toLowerCase();
    return message.includes('offline') ||
           message.includes('network') ||
           message.includes('connection') ||
           message.includes('unavailable') ||
           error.code === 'unavailable';
  }

  static isValidationError(message: string): boolean {
    const validationKeywords = [
      'is required',
      'cannot be empty',
      'cannot exceed',
      'must be a',
      'Authentication required',
      'User ID is required',
      'Sender ID is required',
      'Message text is required',
      'Sender name is required'
    ];

    return validationKeywords.some(keyword => message.includes(keyword));
  }

  static isRetryableError(error: any): boolean {
    const retryableCodes = [
      'unavailable',
      'network-request-failed',
      'quota-exceeded',
      'failed-precondition',
      'resource-exhausted',
      'cancelled',
      'deadline-exceeded',
      'internal'
    ];

    return retryableCodes.includes(error?.code);
  }

  static isTemporaryError(error: any): boolean {
    const temporaryCodes = [
      'unavailable',
      'network-request-failed',
      'resource-exhausted',
      'deadline-exceeded',
      'internal'
    ];

    return temporaryCodes.includes(error?.code);
  }

  static isGuestUser(user: any): boolean {
    // Check if user is a guest user based on various indicators
    if (!user) return true; // No user means guest

    // Check for guest user ID pattern
    if (typeof user.uid === 'string' && user.uid.startsWith('guest_')) {
      return true;
    }

    // Check for guest user ID pattern in user.id as well
    if (typeof user.id === 'string' && user.id.startsWith('guest_')) {
      return true;
    }

    // Check if user is explicitly marked as guest
    if (user.isGuest === true) {
      return true;
    }

    // Check for anonymous authentication
    if (user.isAnonymous === true) {
      return true;
    }

    // Check for missing email (common guest user indicator)
    if (!user.email && !user.phoneNumber && user.providerData?.length === 0) {
      return true;
    }

    return false;
  }

  static shouldSkipFirestoreOperation(user: any): boolean {
    // Skip Firestore operations for guest users to prevent permission errors
    return this.isGuestUser(user);
  }

  static getGuestUserMessage(operation: string = 'access this feature'): string {
    return `Sign in to ${operation}`;
  }

  static getGuestRestrictionMessage(feature: string): string {
    const messages: Record<string, string> = {
      'messaging': 'Sign in to send and receive messages',
      'chat': 'Sign in to join conversations',
      'gaming': 'Sign in to save your game progress and compete on leaderboards',
      'profile': 'Sign in to create and customize your profile',
      'notifications': 'Sign in to receive personalized notifications',
      'streaming': 'Sign in to start live streams and interact with viewers',
      'friends': 'Sign in to add friends and see their activity',
      'shop': 'Sign in to purchase items and manage your inventory',
      'leaderboard': 'Sign in to compete and see your ranking',
      'achievements': 'Sign in to unlock and track achievements'
    };

    return messages[feature] || `Sign in to access ${feature}`;
  }

  static isOperationAllowedForGuest(operation: string): boolean {
    const allowedOperations = [
      'view_public_streams',
      'browse_public_content',
      'view_leaderboard',
      'play_demo_games',
      'view_shop_items',
      'read_public_profiles'
    ];

    return allowedOperations.includes(operation);
  }

  static getGuestLimitationError(operation: string): FirebaseErrorInfo {
    return {
      code: 'guest-restriction',
      message: `Guest users cannot ${operation}`,
      userFriendlyMessage: this.getGuestRestrictionMessage(operation),
      shouldRetry: false,
      requiresAuth: true,
      severity: ErrorSeverity.INFO,
      category: ErrorCategory.GUEST_RESTRICTION,
      retryDelay: 0,
      maxRetries: 0,
      fallbackAction: 'redirect_to_auth'
    };
  }

  static handleGuestUserError(operation: string, originalError?: any): FirebaseErrorInfo {
    // If there's an original error and it's a permission error, convert it to guest restriction
    if (originalError && this.isPermissionError(originalError)) {
      return this.getGuestLimitationError(operation);
    }

    // Otherwise, return the original error or a generic guest restriction
    return originalError ? this.handleError(originalError) : this.getGuestLimitationError(operation);
  }

  static createGuestUserContext(operation: string): any {
    return {
      userType: 'guest',
      operation,
      timestamp: new Date().toISOString(),
      allowedOperations: [
        'view_public_streams',
        'browse_public_content',
        'view_leaderboard',
        'play_demo_games'
      ],
      restrictedFeatures: [
        'messaging',
        'chat',
        'profile_creation',
        'friend_management',
        'notifications',
        'streaming',
        'purchases'
      ]
    };
  }

  // Error categorization methods for major error types
  static isStreamingError(error: any): boolean {
    const streamingKeywords = [
      'stream',
      'streaming',
      'live',
      'broadcast',
      'video',
      'audio',
      'media',
      'rtmp',
      'webrtc'
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';

    return streamingKeywords.some(keyword =>
      errorMessage.includes(keyword) || errorCode.includes(keyword)
    );
  }

  static isChatMessagingError(error: any): boolean {
    const chatKeywords = [
      'message',
      'chat',
      'conversation',
      'direct message',
      'dm',
      'send message',
      'receive message',
      'chat room',
      'messaging'
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';

    return chatKeywords.some(keyword =>
      errorMessage.includes(keyword) || errorCode.includes(keyword)
    );
  }

  static isGamingError(error: any): boolean {
    const gamingKeywords = [
      'mining',
      'slots',
      'gold miner',
      'game',
      'gaming',
      'score',
      'leaderboard',
      'achievement',
      'reward',
      'coins',
      'gems',
      'currency'
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';

    return gamingKeywords.some(keyword =>
      errorMessage.includes(keyword) || errorCode.includes(keyword)
    );
  }

  static isProfileError(error: any): boolean {
    const profileKeywords = [
      'profile',
      'user',
      'avatar',
      'bio',
      'settings',
      'preferences',
      'account',
      'personal'
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';

    return profileKeywords.some(keyword =>
      errorMessage.includes(keyword) || errorCode.includes(keyword)
    );
  }

  static isNotificationError(error: any): boolean {
    const notificationKeywords = [
      'notification',
      'push',
      'alert',
      'badge',
      'notify',
      'announcement',
      'message notification'
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';

    return notificationKeywords.some(keyword =>
      errorMessage.includes(keyword) || errorCode.includes(keyword)
    );
  }

  static getRetryDelay(error: any, attemptNumber: number = 1): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    if (!this.isRetryableError(error)) {
      return 0; // Don't retry
    }

    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter

    return Math.floor(exponentialDelay + jitter);
  }

  static isFirebaseInitializationError(error: any): boolean {
    const initErrorMessages = [
      'Firebase not initialized',
      'Firebase Auth not available',
      'Firestore not initialized'
    ];

    return initErrorMessages.some(msg => error?.message?.includes(msg));
  }

  static handleFirebaseServiceError(serviceName: string, error: any): FirebaseErrorInfo {
    if (this.isFirebaseInitializationError(error)) {
      return {
        code: 'firebase-not-initialized',
        message: error.message,
        userFriendlyMessage: 'Service is starting up. Please try again in a moment.',
        shouldRetry: true,
        requiresAuth: false,
        severity: ErrorSeverity.WARN,
        category: ErrorCategory.SYSTEM,
        operation: serviceName,
        retryDelay: 2000,
        maxRetries: 3,
        fallbackAction: 'wait_for_initialization'
      };
    }

    const errorInfo = this.handleError(error);
    return {
      ...errorInfo,
      operation: serviceName
    };
  }

  // Additional utility methods for comprehensive error handling
  static getErrorSummary(errors: any[]): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    criticalErrors: number;
    retryableErrors: number;
  } {
    const summary = {
      total: errors.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      criticalErrors: 0,
      retryableErrors: 0
    };

    errors.forEach(error => {
      const errorInfo = this.handleError(error);

      // Count by category
      summary.byCategory[errorInfo.category] = (summary.byCategory[errorInfo.category] || 0) + 1;

      // Count by severity
      summary.bySeverity[errorInfo.severity] = (summary.bySeverity[errorInfo.severity] || 0) + 1;

      // Count critical errors
      if (errorInfo.severity === ErrorSeverity.ERROR && !errorInfo.shouldRetry) {
        summary.criticalErrors++;
      }

      // Count retryable errors
      if (errorInfo.shouldRetry) {
        summary.retryableErrors++;
      }
    });

    return summary;
  }

  static formatErrorForUser(error: any, operation?: string): string {
    const errorInfo = this.handleError(error);

    if (!this.shouldShowToUser(error)) {
      return 'Something went wrong. Please try again.';
    }

    let message = errorInfo.userFriendlyMessage;

    if (operation) {
      message = message.replace('this feature', operation);
    }

    return message;
  }

  static createErrorReport(operation: string, error: any, context?: any): {
    id: string;
    timestamp: string;
    operation: string;
    errorInfo: FirebaseErrorInfo;
    context?: any;
    userAgent?: string;
    url?: string;
  } {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      operation,
      errorInfo: this.handleError(error),
      context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location?.href : undefined
    };
  }

  // Authentication-specific error handling utilities
  static isAuthenticationError(error: any): boolean {
    const authErrorCodes = [
      'auth/email-already-in-use',
      'auth/weak-password',
      'auth/invalid-email',
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/user-disabled',
      'auth/too-many-requests',
      'auth/operation-not-allowed',
      'auth/invalid-credential',
      'auth/requires-recent-login'
    ];

    return authErrorCodes.includes(error?.code);
  }

  static getAuthErrorAction(error: any): {
    action: string;
    message: string;
    buttonText?: string;
    switchMode?: boolean;
  } {
    const errorInfo = this.handleError(error);

    switch (errorInfo.fallbackAction) {
      case 'switch_to_login':
        return {
          action: 'switch_to_login',
          message: errorInfo.userFriendlyMessage,
          buttonText: 'Sign In Instead',
          switchMode: true
        };

      case 'switch_to_signup':
        return {
          action: 'switch_to_signup',
          message: errorInfo.userFriendlyMessage,
          buttonText: 'Create Account',
          switchMode: true
        };

      case 'show_forgot_password':
        return {
          action: 'show_forgot_password',
          message: errorInfo.userFriendlyMessage,
          buttonText: 'Reset Password'
        };

      case 'show_password_requirements':
        return {
          action: 'show_password_requirements',
          message: errorInfo.userFriendlyMessage,
          buttonText: 'Got It'
        };

      default:
        return {
          action: 'generic_error',
          message: errorInfo.userFriendlyMessage,
          buttonText: 'Try Again'
        };
    }
  }

  static formatAuthErrorForUI(error: any): {
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    action?: {
      text: string;
      handler: string;
    };
  } {
    const errorInfo = this.handleError(error);
    const authAction = this.getAuthErrorAction(error);

    let type: 'error' | 'warning' | 'info' = 'error';
    if (errorInfo.severity === ErrorSeverity.WARN) type = 'warning';
    if (errorInfo.severity === ErrorSeverity.INFO) type = 'info';

    let title = 'Authentication Error';
    if (errorInfo.category === ErrorCategory.VALIDATION) title = 'Invalid Input';
    if (errorInfo.category === ErrorCategory.NETWORK) title = 'Connection Error';

    return {
      title,
      message: authAction.message,
      type,
      action: authAction.buttonText ? {
        text: authAction.buttonText,
        handler: authAction.action
      } : undefined
    };
  }

  // Execute Firebase operations with circuit breaker protection
  static async executeWithProtection<T>(
    operation: () => Promise<T>,
    operationType: 'auth' | 'firestore' | 'username-check' | 'storage' = 'firestore'
  ): Promise<T> {
    const circuitBreaker = {
      'auth': FirebaseCircuitBreakers.AUTH,
      'firestore': FirebaseCircuitBreakers.FIRESTORE,
      'username-check': FirebaseCircuitBreakers.USERNAME_CHECK,
      'storage': FirebaseCircuitBreakers.STORAGE
    }[operationType];

    return executeWithCircuitBreaker(circuitBreaker, operation, {
      maxRetries: 2,
      retryDelay: 1000,
      backoffMultiplier: 1.5
    });
  }

  // Check if we should suppress error logging to prevent spam
  static shouldSuppressErrorLogging(error: any, operationType: string): boolean {
    // Suppress permission errors for guest users
    if (this.isPermissionError(error) && operationType === 'guest') {
      return true;
    }

    // Suppress development environment storage errors
    if (error?.message?.includes('Development environment') ||
        error?.message?.includes('ExponentExperienceData')) {
      return true;
    }

    // Suppress circuit breaker errors (they're already logged by the circuit breaker)
    if (error?.message?.includes('Circuit breaker') && error?.message?.includes('OPEN')) {
      return true;
    }

    return false;
  }
}

export default FirebaseErrorHandler;
