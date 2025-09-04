import { StreamSyncValidator } from '../services/streamSyncValidator';
import { StreamCleanupService } from '../services/streamCleanupService';

/**
 * Utility for recovering from Firestore internal errors and listener issues
 */
export class FirestoreErrorRecovery {
  
  private static isRecovering = false;
  private static recoveryAttempts = 0;
  private static readonly MAX_RECOVERY_ATTEMPTS = 3;
  private static readonly RECOVERY_DELAY = 5000; // 5 seconds
  
  /**
   * Check if an error is a Firestore internal assertion failure
   */
  static isFirestoreInternalError(error: any): boolean {
    const errorMessage = error?.message || '';
    const errorString = String(error) || '';

    return errorMessage.includes('INTERNAL ASSERTION FAILED') ||
           errorMessage.includes('Unexpected state') ||
           errorMessage.includes('ID: b815') ||
           errorMessage.includes('ID: ca9') ||
           errorString.includes('INTERNAL ASSERTION FAILED') ||
           errorString.includes('b815') ||
           errorString.includes('ca9');
  }
  
  /**
   * Attempt to recover from Firestore internal errors
   */
  static async attemptRecovery(userId?: string): Promise<boolean> {
    if (this.isRecovering) {
      console.log('🔄 Recovery already in progress, skipping...');
      return false;
    }
    
    if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
      console.error('❌ Max recovery attempts reached, giving up');
      return false;
    }
    
    this.isRecovering = true;
    this.recoveryAttempts++;
    
    console.log(`🚨 Attempting Firestore error recovery (attempt ${this.recoveryAttempts}/${this.MAX_RECOVERY_ATTEMPTS})`);
    
    try {
      // Step 1: Emergency cleanup of all listeners
      console.log('🧹 Step 1: Emergency cleanup of listeners');
      StreamSyncValidator.emergencyCleanup();
      
      // Step 2: Stop cleanup service temporarily
      console.log('🛑 Step 2: Stopping cleanup service');
      StreamCleanupService.stopCleanupService();
      
      // Step 3: Wait for cleanup to complete
      console.log('⏳ Step 3: Waiting for cleanup to complete');
      await this.sleep(this.RECOVERY_DELAY);
      
      // Step 4: Restart services if user is available
      if (userId) {
        console.log('🔄 Step 4: Restarting services');
        
        // Restart cleanup service
        StreamCleanupService.startCleanupService();
        
        // Restart sync validation with delay
        setTimeout(() => {
          StreamSyncValidator.startSyncValidation(userId, null);
        }, 2000);
      }
      
      console.log('✅ Firestore error recovery completed successfully');
      
      // Reset recovery state after successful recovery
      setTimeout(() => {
        this.isRecovering = false;
        this.recoveryAttempts = 0;
      }, 10000); // Reset after 10 seconds
      
      return true;
      
    } catch (recoveryError) {
      console.error('❌ Error during Firestore recovery:', recoveryError);
      this.isRecovering = false;
      return false;
    }
  }
  
  /**
   * Handle Firestore errors with automatic recovery
   */
  static async handleFirestoreError(error: any, context: string, userId?: string): Promise<void> {
    console.error(`❌ Firestore error in ${context}:`, error);
    
    if (this.isFirestoreInternalError(error)) {
      console.warn(`🚨 Firestore internal error detected in ${context}`);
      
      // Attempt recovery
      const recovered = await this.attemptRecovery(userId);
      
      if (!recovered) {
        console.error(`❌ Failed to recover from Firestore error in ${context}`);
        
        // As a last resort, suggest app restart
        console.warn('⚠️ Consider restarting the app to resolve Firestore issues');
      }
    }
  }
  
  /**
   * Check if the system is currently in recovery mode
   */
  static isInRecoveryMode(): boolean {
    return this.isRecovering;
  }
  
  /**
   * Get recovery status information
   */
  static getRecoveryStatus(): {
    isRecovering: boolean;
    attempts: number;
    maxAttempts: number;
  } {
    return {
      isRecovering: this.isRecovering,
      attempts: this.recoveryAttempts,
      maxAttempts: this.MAX_RECOVERY_ATTEMPTS
    };
  }
  
  /**
   * Reset recovery state (for testing or manual reset)
   */
  static resetRecoveryState(): void {
    this.isRecovering = false;
    this.recoveryAttempts = 0;
    console.log('🔄 Recovery state reset');
  }
  
  /**
   * Sleep utility for recovery delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Monitor for Firestore errors and automatically trigger recovery
   */
  static startErrorMonitoring(userId?: string): void {
    // Listen for unhandled promise rejections that might be Firestore errors
    // Only on web platforms where window is available
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        if (this.isFirestoreInternalError(error)) {
          console.warn('🚨 Detected unhandled Firestore error, attempting recovery');
          this.handleFirestoreError(error, 'unhandledrejection', userId);
        }
      });
      console.log('✅ Firestore error monitoring started (web)');
    } else {
      // For React Native, we'll rely on manual error handling in components
      console.log('✅ Firestore error monitoring started (React Native - manual handling)');
    }
  }
  
  /**
   * Create a wrapper for Firestore operations with automatic error handling
   */
  static wrapFirestoreOperation<T>(
    operation: () => Promise<T>,
    context: string,
    userId?: string
  ): Promise<T> {
    return operation().catch(async (error) => {
      await this.handleFirestoreError(error, context, userId);
      throw error; // Re-throw after handling
    });
  }
}

export default FirestoreErrorRecovery;
