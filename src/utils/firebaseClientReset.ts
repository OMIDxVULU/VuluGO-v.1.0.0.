/**
 * Firebase Client Reset Utility
 * Forces complete Firebase client cache reset to recognize new indexes
 */

import { getFirebaseServices } from '../services/firebase';
import { clearIndexedDbPersistence, enableNetwork, disableNetwork } from 'firebase/firestore';

class FirebaseClientReset {
  private static isResetting = false;
  private static lastResetTime = 0;
  private static RESET_COOLDOWN = 300000; // 5 minutes

  /**
   * Force complete Firebase client reset
   */
  static async forceClientReset(): Promise<boolean> {
    if (this.isResetting) {
      console.log('🔄 Client reset already in progress...');
      return false;
    }

    const now = Date.now();
    if (now - this.lastResetTime < this.RESET_COOLDOWN) {
      console.log('🕐 Client reset on cooldown, skipping...');
      return false;
    }

    try {
      this.isResetting = true;
      this.lastResetTime = now;

      console.log('🚀 Starting aggressive Firebase client reset...');

      const { db, isInitialized } = getFirebaseServices();
      if (!isInitialized || !db) {
        throw new Error('Firebase services not initialized');
      }

      // Step 1: Disable network
      console.log('📡 Disabling Firebase network...');
      await disableNetwork(db);
      
      // Step 2: Wait for network to fully disconnect
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Clear IndexedDB persistence (aggressive cache clear)
      try {
        console.log('🗑️ Clearing IndexedDB persistence...');
        await clearIndexedDbPersistence(db);
        console.log('✅ IndexedDB persistence cleared');
      } catch (persistenceError: any) {
        // This might fail if there are active listeners, which is okay
        console.warn('⚠️ Could not clear persistence (expected if app is active):', persistenceError.message);
      }

      // Step 4: Wait before re-enabling
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 5: Re-enable network
      console.log('📡 Re-enabling Firebase network...');
      await enableNetwork(db);

      // Step 6: Wait for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('✅ Aggressive Firebase client reset completed');
      return true;

    } catch (error: any) {
      console.error('❌ Firebase client reset failed:', error);
      
      // Try to recover by at least enabling network
      try {
        const { db } = getFirebaseServices();
        if (db) {
          await enableNetwork(db);
          console.log('🔧 Network re-enabled after reset failure');
        }
      } catch (recoveryError) {
        console.error('❌ Failed to recover network after reset failure:', recoveryError);
      }
      
      return false;
    } finally {
      this.isResetting = false;
    }
  }

  /**
   * Gentle client refresh (less aggressive)
   */
  static async gentleClientRefresh(): Promise<boolean> {
    try {
      console.log('🔄 Starting gentle Firebase client refresh...');

      const { db, isInitialized } = getFirebaseServices();
      if (!isInitialized || !db) {
        throw new Error('Firebase services not initialized');
      }

      // Just ensure network is enabled and wait
      await enableNetwork(db);
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('✅ Gentle Firebase client refresh completed');
      return true;

    } catch (error: any) {
      console.error('❌ Gentle client refresh failed:', error);
      return false;
    }
  }

  /**
   * Check if client reset is needed based on error patterns
   */
  static shouldResetClient(errorCount: number, timeWindow: number): boolean {
    // Reset if we've had many index errors in a short time
    return errorCount >= 10 && timeWindow < 60000; // 10 errors in 1 minute
  }

  /**
   * Get reset status
   */
  static getResetStatus() {
    return {
      isResetting: this.isResetting,
      lastResetTime: this.lastResetTime,
      canReset: Date.now() - this.lastResetTime > this.RESET_COOLDOWN
    };
  }
}

export default FirebaseClientReset;
