/**
 * Guest User Service Wrapper
 * 
 * This utility provides early returns for guest users to prevent unnecessary
 * Firebase calls that would result in permission errors.
 */

import { auth } from '../services/firebase';
import { FirebaseErrorHandler } from './firebaseErrorHandler';

export class GuestUserServiceWrapper {
  /**
   * Check if current user is authenticated
   */
  static isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  /**
   * Check if current user is a guest
   */
  static isGuestUser(): boolean {
    return !this.isAuthenticated();
  }

  /**
   * Get current user ID or null
   */
  static getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  /**
   * Wrapper for service methods that require authentication
   * Returns early with appropriate fallback for guest users
   */
  static async withAuthCheck<T>(
    operation: string,
    serviceCall: () => Promise<T>,
    guestFallback: T
  ): Promise<T> {
    if (this.isGuestUser()) {
      console.warn(`Guest user attempted ${operation} - returning fallback value`);
      return guestFallback;
    }

    try {
      return await serviceCall();
    } catch (error: any) {
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn(`Permission denied for ${operation} - returning fallback value`);
        return guestFallback;
      }
      throw error;
    }
  }

  /**
   * Wrapper for service methods that return arrays
   */
  static async withAuthCheckArray<T>(
    operation: string,
    serviceCall: () => Promise<T[]>
  ): Promise<T[]> {
    return this.withAuthCheck(operation, serviceCall, []);
  }

  /**
   * Wrapper for service methods that return nullable objects
   */
  static async withAuthCheckNullable<T>(
    operation: string,
    serviceCall: () => Promise<T | null>
  ): Promise<T | null> {
    return this.withAuthCheck(operation, serviceCall, null);
  }

  /**
   * Wrapper for service methods that return objects with default values
   */
  static async withAuthCheckDefault<T>(
    operation: string,
    serviceCall: () => Promise<T>,
    defaultValue: T
  ): Promise<T> {
    return this.withAuthCheck(operation, serviceCall, defaultValue);
  }

  /**
   * Check if operation is allowed for guest users
   */
  static isOperationAllowedForGuest(operation: string): boolean {
    const allowedOperations = [
      'view_public_streams',
      'browse_public_content',
      'view_leaderboard',
      'play_demo_games',
      'view_shop_items',
      'read_public_profiles',
      'view_global_chat'
    ];

    return allowedOperations.includes(operation);
  }

  /**
   * Get appropriate error message for guest restriction
   */
  static getGuestRestrictionMessage(operation: string): string {
    const messages: Record<string, string> = {
      'getUserGameProfile': 'Sign in to track your gaming progress',
      'getMiningStats': 'Sign in to view your mining statistics',
      'getSlotsStats': 'Sign in to view your slots statistics',
      'getGoldMinerStats': 'Sign in to view your gold miner statistics',
      'getUserInventory': 'Sign in to access your inventory',
      'getFriendActivities': 'Sign in to see friend activities',
      'getFriendsMusicActivities': 'Sign in to see friends\' music activities',
      'getActivePromotions': 'Sign in to view personalized promotions',
      'getShopStats': 'Sign in to view your shopping statistics',
      'createStream': 'Sign in to start live streaming',
      'joinStream': 'Sign in to join live streams',
      'sendMessage': 'Sign in to send messages',
      'makePurchase': 'Sign in to make purchases'
    };

    return messages[operation] || `Sign in to access ${operation}`;
  }

  /**
   * Create default/empty data structures for common service returns
   */
  static getDefaultUserInventory(userId: string) {
    return {
      userId,
      items: {},
      activeBoosts: {},
      lastUpdated: new Date()
    };
  }

  static getDefaultCurrencyBalance() {
    return {
      gold: 0,
      gems: 0,
      tokens: 0,
      lastUpdated: new Date()
    };
  }

  static getDefaultGameProfile(userId: string) {
    return {
      userId,
      totalGamesPlayed: 0,
      totalTimeSpent: 0,
      totalEarnings: { gold: 0, gems: 0, tokens: 0 },
      favoriteGame: 'mining' as const,
      achievements: [],
      level: 1,
      experience: 0,
      rank: 'Novice',
      lastActiveDate: new Date(),
      createdAt: new Date(),
      lastUpdated: new Date()
    };
  }

  /**
   * Log guest user attempt for analytics
   */
  static logGuestUserAttempt(operation: string, context?: any) {
    console.log(`📊 Guest user attempted: ${operation}`, context);
    
    // Could be extended to send analytics events
    // analyticsService.trackEvent('guest_user_attempt', {
    //   operation,
    //   timestamp: new Date().toISOString(),
    //   ...context
    // });
  }

  /**
   * Show user-friendly message for guest restrictions
   */
  static showGuestRestrictionMessage(operation: string) {
    const message = this.getGuestRestrictionMessage(operation);
    console.info(`ℹ️ Guest Restriction: ${message}`);
    
    // Could be extended to show toast/alert
    // ToastService.show(message, 'info');
  }
}

export default GuestUserServiceWrapper;
