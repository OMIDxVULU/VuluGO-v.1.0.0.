import { FirebaseError } from 'firebase/app';

export interface FirebaseErrorInfo {
  code: string;
  message: string;
  userFriendlyMessage: string;
  shouldRetry: boolean;
  requiresAuth: boolean;
}

export class FirebaseErrorHandler {
  static handleError(error: any): FirebaseErrorInfo {
    // Handle validation errors (user input issues)
    if (error?.message && this.isValidationError(error.message)) {
      return {
        code: 'validation-error',
        message: error.message,
        userFriendlyMessage: error.message,
        shouldRetry: false,
        requiresAuth: false
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
            requiresAuth: true
          };

        case 'unavailable':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Service temporarily unavailable. Please try again.',
            shouldRetry: true,
            requiresAuth: false
          };

        case 'unauthenticated':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Please sign in to access this feature.',
            shouldRetry: false,
            requiresAuth: true
          };

        case 'network-request-failed':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Network error. Please check your connection.',
            shouldRetry: true,
            requiresAuth: false
          };

        case 'quota-exceeded':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Service limit reached. Please try again later.',
            shouldRetry: true,
            requiresAuth: false
          };

        case 'invalid-argument':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Invalid data provided. Please check your input.',
            shouldRetry: false,
            requiresAuth: false
          };

        case 'failed-precondition':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Service not ready. Please try again in a moment.',
            shouldRetry: true,
            requiresAuth: false
          };

        case 'resource-exhausted':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Too many requests. Please wait a moment and try again.',
            shouldRetry: true,
            requiresAuth: false
          };

        case 'cancelled':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Operation was cancelled. Please try again.',
            shouldRetry: true,
            requiresAuth: false
          };

        case 'data-loss':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Data corruption detected. Please contact support.',
            shouldRetry: false,
            requiresAuth: false
          };

        case 'deadline-exceeded':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Request timed out. Please check your connection and try again.',
            shouldRetry: true,
            requiresAuth: false
          };

        case 'not-found':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Requested data not found.',
            shouldRetry: false,
            requiresAuth: false
          };

        case 'already-exists':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'This item already exists.',
            shouldRetry: false,
            requiresAuth: false
          };

        case 'internal':
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'Internal server error. Please try again later.',
            shouldRetry: true,
            requiresAuth: false
          };

        default:
          return {
            code: error.code,
            message: error.message,
            userFriendlyMessage: 'An unexpected error occurred. Please try again.',
            shouldRetry: true,
            requiresAuth: false
          };
      }
    }

    // Handle generic errors
    return {
      code: 'unknown',
      message: error?.message || 'Unknown error',
      userFriendlyMessage: 'Something went wrong. Please try again.',
      shouldRetry: true,
      requiresAuth: false
    };
  }

  static logError(operation: string, error: any, context?: any): void {
    const errorInfo = this.handleError(error);
    console.error(`Firebase Error in ${operation}:`, {
      code: errorInfo.code,
      message: errorInfo.message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  static isPermissionError(error: any): boolean {
    return error?.code === 'permission-denied' || error?.code === 'unauthenticated';
  }

  static isNetworkError(error: any): boolean {
    return error?.code === 'unavailable' || error?.code === 'network-request-failed';
  }

  static shouldShowToUser(error: any): boolean {
    const errorInfo = this.handleError(error);
    // Don't show permission errors to users if they're not authenticated
    // These are expected for guest users
    return !this.isPermissionError(error);
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
        requiresAuth: false
      };
    }

    return this.handleError(error);
  }
}

export default FirebaseErrorHandler;
