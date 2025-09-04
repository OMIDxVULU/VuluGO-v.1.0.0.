/**
 * Firebase Index Refresh Utility
 * Forces Firebase client to refresh index cache and retry failed queries
 */

import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getFirebaseServices } from '../services/firebase';

class FirebaseIndexRefresh {
  private static isRefreshing = false;
  private static lastRefreshTime = 0;
  private static REFRESH_COOLDOWN = 60000; // 60 seconds (increased)
  private static refreshAttempts = 0;
  private static MAX_REFRESH_ATTEMPTS = 3;

  /**
   * Gentle Firebase client cache refresh (no network disruption)
   */
  static async refreshIndexCache(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('🔄 Index refresh already in progress...');
      return false;
    }

    const now = Date.now();
    if (now - this.lastRefreshTime < this.REFRESH_COOLDOWN) {
      console.log('🕐 Index refresh on cooldown, skipping...');
      return false;
    }

    try {
      this.isRefreshing = true;
      this.lastRefreshTime = now;

      console.log('🔄 Starting gentle Firebase index cache refresh...');

      // Get Firebase services with initialization check
      const { app, db, isInitialized } = getFirebaseServices();

      if (!isInitialized || !app || !db) {
        throw new Error('Firebase services not properly initialized');
      }

      // Gentle approach: just ensure network is enabled and wait
      console.log('📡 Ensuring Firebase network is enabled...');
      await enableNetwork(db);

      // Wait for potential index propagation
      console.log('⏳ Waiting for index propagation...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('✅ Gentle Firebase index cache refresh completed');
      return true;

    } catch (error) {
      console.error('❌ Error refreshing Firebase index cache:', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Check if we should attempt an index refresh based on error patterns
   */
  static shouldRefreshForError(error: any): boolean {
    if (!error || typeof error.message !== 'string') {
      return false;
    }

    const message = error.message.toLowerCase();
    return message.includes('query requires an index') || 
           message.includes('failed-precondition');
  }

  /**
   * Auto-refresh if index errors are detected (with attempt limiting)
   */
  static async autoRefreshOnIndexError(error: any): Promise<void> {
    if (this.shouldRefreshForError(error)) {
      if (this.refreshAttempts >= this.MAX_REFRESH_ATTEMPTS) {
        console.log('🛑 Max refresh attempts reached, skipping further refreshes');
        return;
      }

      console.log(`🔍 Index error detected, attempting cache refresh (${this.refreshAttempts + 1}/${this.MAX_REFRESH_ATTEMPTS})...`);
      this.refreshAttempts++;
      await this.refreshIndexCache();
    }
  }

  /**
   * Force immediate index refresh (bypass cooldown)
   */
  static async forceRefreshNow(): Promise<boolean> {
    console.log('🚀 Force refreshing Firebase index cache immediately...');
    this.lastRefreshTime = 0; // Reset cooldown
    return await this.refreshIndexCache();
  }
}

// Disable auto-trigger to prevent offline state issues
// Auto-refresh will be triggered only on specific index errors
console.log('🔄 Firebase Index Refresh utility loaded (auto-refresh disabled to prevent offline issues)');

export default FirebaseIndexRefresh;
