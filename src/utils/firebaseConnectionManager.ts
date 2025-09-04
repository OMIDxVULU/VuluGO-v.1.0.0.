/**
 * Firebase Connection Manager
 * Handles Firebase connectivity issues, offline states, and provides graceful degradation
 */

import { getFirestore, enableNetwork, disableNetwork, connectFirestoreEmulator } from 'firebase/firestore';
import { getFirebaseServices } from '../services/firebase';

interface ConnectionState {
  isOnline: boolean;
  lastConnected: number;
  retryCount: number;
  isRecovering: boolean;
}

class FirebaseConnectionManager {
  private static instance: FirebaseConnectionManager;
  private connectionState: ConnectionState = {
    isOnline: true,
    lastConnected: Date.now(),
    retryCount: 0,
    isRecovering: false
  };
  
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): FirebaseConnectionManager {
    if (!FirebaseConnectionManager.instance) {
      FirebaseConnectionManager.instance = new FirebaseConnectionManager();
    }
    return FirebaseConnectionManager.instance;
  }

  /**
   * Initialize connection monitoring
   */
  initialize(): void {
    console.log('🔗 Initializing Firebase Connection Manager...');
    this.startConnectionMonitoring();
  }

  /**
   * Check if Firebase is currently online and accessible
   */
  async checkConnection(): Promise<boolean> {
    try {
      const { db, isInitialized } = getFirebaseServices();
      
      if (!isInitialized || !db) {
        console.warn('⚠️ Firebase services not initialized');
        return false;
      }

      // Try to enable network if it's disabled
      await enableNetwork(db);
      
      this.connectionState.isOnline = true;
      this.connectionState.lastConnected = Date.now();
      this.connectionState.retryCount = 0;
      
      return true;
    } catch (error: any) {
      console.warn('🔴 Firebase connection check failed:', error.message);
      this.connectionState.isOnline = false;
      return false;
    }
  }

  /**
   * Attempt to recover Firebase connection
   */
  async recoverConnection(): Promise<boolean> {
    if (this.connectionState.isRecovering) {
      console.log('🔄 Connection recovery already in progress...');
      return false;
    }

    this.connectionState.isRecovering = true;
    console.log('🚑 Attempting Firebase connection recovery...');

    try {
      const { db, isInitialized } = getFirebaseServices();
      
      if (!isInitialized || !db) {
        throw new Error('Firebase services not initialized');
      }

      // Gentle recovery approach - just ensure network is enabled
      await enableNetwork(db);
      
      // Wait a moment for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify connection is working
      const isConnected = await this.checkConnection();
      
      if (isConnected) {
        console.log('✅ Firebase connection recovered successfully');
        this.connectionState.retryCount = 0;
        return true;
      } else {
        throw new Error('Connection verification failed');
      }
      
    } catch (error: any) {
      console.error('❌ Firebase connection recovery failed:', error.message);
      this.connectionState.retryCount++;
      return false;
    } finally {
      this.connectionState.isRecovering = false;
    }
  }

  /**
   * Execute operation with connection retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'Firebase operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Check connection before attempting operation
        if (!this.connectionState.isOnline) {
          const recovered = await this.recoverConnection();
          if (!recovered && attempt === this.maxRetries) {
            throw new Error('Firebase is offline and recovery failed');
          }
        }

        // Execute the operation
        const result = await operation();
        
        // Operation succeeded
        if (attempt > 1) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a connection-related error
        if (this.isConnectionError(error)) {
          console.warn(`🔴 ${operationName} failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`);
          this.connectionState.isOnline = false;
          
          if (attempt < this.maxRetries) {
            console.log(`⏳ Retrying ${operationName} in ${this.retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            continue;
          }
        } else {
          // Non-connection error, don't retry
          throw error;
        }
      }
    }

    // All retries failed
    throw lastError || new Error(`${operationName} failed after ${this.maxRetries} attempts`);
  }

  /**
   * Check if error is connection-related
   */
  private isConnectionError(error: any): boolean {
    if (!error || !error.message) return false;
    
    const message = error.message.toLowerCase();
    return message.includes('offline') ||
           message.includes('network') ||
           message.includes('connection') ||
           message.includes('unavailable') ||
           error.code === 'unavailable';
  }

  /**
   * Start monitoring connection status
   */
  private startConnectionMonitoring(): void {
    // Check connection every 30 seconds
    this.connectionCheckInterval = setInterval(async () => {
      if (!this.connectionState.isOnline) {
        console.log('🔍 Checking Firebase connection status...');
        await this.checkConnection();
      }
    }, 30000);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }
}

// Export singleton instance
export const firebaseConnectionManager = FirebaseConnectionManager.getInstance();
export default FirebaseConnectionManager;
