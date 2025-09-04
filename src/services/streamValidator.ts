import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { validateStreamWithCircuitBreaker } from '../utils/streamStatusCircuitBreaker';
import { throttledLog } from '../utils/loggingThrottle';

/**
 * Service for validating stream state and handling invalid streams during operations
 */
export class StreamValidator {
  
  // Retry configuration
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_RETRY_DELAY = 1000; // 1 second
  private static readonly MAX_RETRY_DELAY = 8000; // 8 seconds
  
  /**
   * Validate stream with retry logic for race conditions
   */
  static async validateStreamWithRetry(
    streamId: string,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<{
    valid: boolean;
    exists: boolean;
    isActive: boolean;
    reason?: string;
    streamData?: any;
  }> {
    let lastValidation: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      throttledLog('stream-validation', `🔄 Validating stream ${streamId} (attempt ${attempt}/${maxRetries})`);

      try {
        const validation = await validateStreamWithCircuitBreaker(streamId, () => this.validateStream(streamId));
        lastValidation = validation;

        // If valid, return immediately
        if (validation.valid) {
          if (attempt > 1) {
            console.log(`✅ Stream validation succeeded on attempt ${attempt}`);
          }
          return validation;
        }

        // If stream doesn't exist, don't retry
        if (!validation.exists) {
          throttledLog('stream-not-found', `❌ Stream ${streamId} doesn't exist, not retrying`);
          return validation;
        }

        // If stream exists but inactive, retry (could be race condition)
        if (validation.reason === 'stream_inactive' && attempt < maxRetries) {
          throttledLog('stream-inactive-retry', `⏳ Stream ${streamId} inactive, waiting ${delayMs}ms before retry...`);
          await this.sleep(delayMs);
          continue;
        }

        // For other reasons, return immediately
        return validation;

      } catch (error) {
        console.error(`❌ Stream validation failed on attempt ${attempt}:`, error);
        lastValidation = {
          valid: false,
          exists: false,
          isActive: false,
          reason: 'circuit_breaker_open'
        };

        if (attempt < maxRetries) {
          await this.sleep(delayMs);
          continue;
        }
      }
    }

    console.error(`❌ Stream validation failed after ${maxRetries} attempts`);
    return lastValidation;
  }

  /**
   * Validate that a stream exists and is active
   */
  static async validateStream(streamId: string): Promise<{
    valid: boolean;
    exists: boolean;
    isActive: boolean;
    reason?: string;
    streamData?: any;
  }> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);
      
      if (!streamDoc.exists()) {
        return {
          valid: false,
          exists: false,
          isActive: false,
          reason: 'stream_not_found'
        };
      }
      
      const streamData = streamDoc.data();

      if (!streamData.isActive) {
        console.log(`⚠️ Stream ${streamId} validation failed: isActive = ${streamData.isActive}`);
        console.log(`🔍 Stream data:`, {
          id: streamData.id,
          hostId: streamData.hostId,
          isActive: streamData.isActive,
          startedAt: streamData.startedAt,
          createdAt: streamData.createdAt
        });
        return {
          valid: false,
          exists: true,
          isActive: false,
          reason: 'stream_inactive',
          streamData
        };
      }
      
      // Additional validation checks
      if (!streamData.participants || streamData.participants.length === 0) {
        return {
          valid: false,
          exists: true,
          isActive: true,
          reason: 'no_participants',
          streamData
        };
      }
      
      // Development safeguard: treat host-only streams as valid to avoid immediate cleanup
      const hasHosts = streamData.participants?.some((p: any) => p.isHost || p.role === 'host');
      if (hasHosts) {
        return {
          valid: true,
          exists: true,
          isActive: true,
          streamData
        };
      }
      
      return {
        valid: true,
        exists: true,
        isActive: true,
        streamData
      };
      
    } catch (error) {
      console.error(`❌ Error validating stream ${streamId}:`, error);
      return {
        valid: false,
        exists: false,
        isActive: false,
        reason: 'validation_error'
      };
    }
  }
  
  /**
   * Validate stream before user operation with retry logic
   */
  static async validateStreamForOperation(
    streamId: string,
    operationType: 'join' | 'create' | 'leave',
    userId?: string
  ): Promise<{
    valid: boolean;
    canProceed: boolean;
    reason?: string;
    fallbackAction?: string;
    streamData?: any;
  }> {
    try {
      const validation = await this.validateStream(streamId);
      
      if (validation.valid) {
        // Additional operation-specific validation
        if (operationType === 'join') {
          return this.validateJoinOperation(streamId, validation.streamData, userId);
        } else if (operationType === 'leave') {
          return this.validateLeaveOperation(streamId, validation.streamData, userId);
        }
        
        return {
          valid: true,
          canProceed: true,
          streamData: validation.streamData
        };
      }
      
      // Handle invalid stream based on reason
      return this.handleInvalidStream(validation, operationType);
      
    } catch (error) {
      console.error(`❌ Error validating stream for ${operationType}:`, error);
      return {
        valid: false,
        canProceed: false,
        reason: 'validation_error',
        fallbackAction: 'show_error'
      };
    }
  }
  
  /**
   * Validate join operation specific requirements
   */
  private static validateJoinOperation(
    streamId: string, 
    streamData: any, 
    userId?: string
  ): {
    valid: boolean;
    canProceed: boolean;
    reason?: string;
    fallbackAction?: string;
    streamData?: any;
  } {
    // Check if user is already in the stream
    if (userId && streamData.participants?.some((p: any) => p.id === userId)) {
      return {
        valid: true,
        canProceed: false,
        reason: 'already_participant',
        fallbackAction: 'update_local_state',
        streamData
      };
    }
    
    // Check if stream has reached capacity (if there's a limit)
    const maxParticipants = streamData.maxParticipants || 50; // Default limit
    if (streamData.participants?.length >= maxParticipants) {
      return {
        valid: true,
        canProceed: false,
        reason: 'stream_full',
        fallbackAction: 'show_full_message',
        streamData
      };
    }
    
    return {
      valid: true,
      canProceed: true,
      streamData
    };
  }
  
  /**
   * Validate leave operation specific requirements
   */
  private static validateLeaveOperation(
    streamId: string, 
    streamData: any, 
    userId?: string
  ): {
    valid: boolean;
    canProceed: boolean;
    reason?: string;
    fallbackAction?: string;
    streamData?: any;
  } {
    // Check if user is actually in the stream
    if (userId && !streamData.participants?.some((p: any) => p.id === userId)) {
      return {
        valid: true,
        canProceed: false,
        reason: 'not_participant',
        fallbackAction: 'clear_local_state',
        streamData
      };
    }
    
    return {
      valid: true,
      canProceed: true,
      streamData
    };
  }
  
  /**
   * Handle invalid stream scenarios
   */
  private static handleInvalidStream(
    validation: any, 
    operationType: string
  ): {
    valid: boolean;
    canProceed: boolean;
    reason?: string;
    fallbackAction?: string;
  } {
    switch (validation.reason) {
      case 'stream_not_found':
        return {
          valid: false,
          canProceed: false,
          reason: 'stream_not_found',
          fallbackAction: operationType === 'leave' ? 'clear_local_state' : 'show_not_found'
        };
        
      case 'stream_inactive':
        return {
          valid: false,
          canProceed: false,
          reason: 'stream_inactive',
          fallbackAction: operationType === 'leave' ? 'clear_local_state' : 'show_ended'
        };
        
      case 'no_participants':
        return {
          valid: false,
          canProceed: false,
          reason: 'stream_empty',
          fallbackAction: 'show_ended'
        };
        
      default:
        return {
          valid: false,
          canProceed: false,
          reason: validation.reason || 'unknown_error',
          fallbackAction: 'show_error'
        };
    }
  }
  
  /**
   * Execute operation with retry logic and exponential backoff
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Executing ${operationName} (attempt ${attempt}/${maxRetries})`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${operationName} failed on attempt ${attempt}:`, error);
        
        // Don't retry on certain types of errors
        if (this.isNonRetryableError(error)) {
          console.log(`❌ Non-retryable error for ${operationName}, not retrying`);
          throw error;
        }
        
        // Don't wait after the last attempt
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }
    
    console.error(`❌ ${operationName} failed after ${maxRetries} attempts`);
    throw lastError || new Error(`Operation failed after ${maxRetries} attempts`);
  }
  
  /**
   * Check if an error should not be retried
   */
  private static isNonRetryableError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    
    // Don't retry user cancellations
    if (errorMessage.includes('cancelled') || errorMessage.includes('cancel')) {
      return true;
    }
    
    // Don't retry permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      return true;
    }
    
    // Don't retry validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate retry delay with exponential backoff
   */
  private static calculateRetryDelay(attempt: number): number {
    const delay = this.BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
    return Math.min(delay, this.MAX_RETRY_DELAY);
  }
  
  /**
   * Sleep utility for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Handle fallback actions for invalid streams
   */
  static async executeFallbackAction(
    action: string,
    streamId: string,
    userId?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      switch (action) {
        case 'clear_local_state':
          console.log(`🧹 Clearing local state for invalid stream ${streamId}`);
          return { success: true, message: 'Local state cleared' };
          
        case 'update_local_state':
          console.log(`🔄 Updating local state for stream ${streamId}`);
          return { success: true, message: 'Local state updated' };
          
        case 'show_not_found':
          return { success: true, message: 'This live stream is no longer available.' };
          
        case 'show_ended':
          return { success: true, message: 'This live stream has ended.' };
          
        case 'show_full_message':
          return { success: true, message: 'This live stream is currently full. Please try again later.' };
          
        case 'show_error':
          return { success: true, message: 'Unable to connect to this live stream. Please try again.' };
          
        default:
          return { success: false, message: 'Unknown fallback action' };
      }
    } catch (error) {
      console.error(`❌ Error executing fallback action ${action}:`, error);
      return { success: false, message: 'Fallback action failed' };
    }
  }
}

export default StreamValidator;
