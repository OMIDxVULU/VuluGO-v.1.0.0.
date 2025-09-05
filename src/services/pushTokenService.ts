/**
 * Push Token Service - Handle notification token storage with proper error handling
 * Fixes the "Failed to save notification token: [FirebaseError: Missing or insufficient permissions.]" error
 */

import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { FirebaseErrorHandler } from '../utils/firebaseErrorHandler';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface PushTokenData {
  token: string;
  userId: string;
  deviceId: string;
  platform: string;
  appVersion?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

class PushTokenService {
  private static instance: PushTokenService;
  private currentToken: string | null = null;

  static getInstance(): PushTokenService {
    if (!PushTokenService.instance) {
      PushTokenService.instance = new PushTokenService();
    }
    return PushTokenService.instance;
  }

  /**
   * Get push notification token with proper error handling
   */
  async getPushToken(): Promise<string | null> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('[PUSH_TOKEN] Push notifications not supported on simulator');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[PUSH_TOKEN] Push notification permissions not granted');
        return null;
      }

      // Get the token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
      });

      const token = tokenData.data;
      this.currentToken = token;
      
      console.log('[PUSH_TOKEN] Successfully obtained push token');
      return token;

    } catch (error: any) {
      console.error('[PUSH_TOKEN] Error getting push token:', error);
      FirebaseErrorHandler.logError('getPushToken', error);
      return null;
    }
  }

  /**
   * Save push token to Firestore with proper error handling and retry logic
   */
  async savePushToken(token: string, retryCount: number = 0): Promise<boolean> {
    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff

    try {
      // Check authentication
      if (!auth.currentUser) {
        console.warn('[PUSH_TOKEN] User not authenticated, cannot save token');
        return false;
      }

      const userId = auth.currentUser.uid;
      console.log(`[PUSH_TOKEN] Saving token for user ${userId} (attempt ${retryCount + 1})`);

      // Validate token format
      if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken[')) {
        console.error('[PUSH_TOKEN] Invalid token format:', token);
        return false;
      }

      // Generate device ID
      const deviceId = await this.getDeviceId();

      // Prepare token data
      const tokenData: Omit<PushTokenData, 'createdAt' | 'updatedAt'> = {
        token,
        userId,
        deviceId,
        platform: Platform.OS,
        appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
        isActive: true,
      };

      // Use userTokens collection with proper security rules
      const tokenRef = doc(db, 'userTokens', userId);

      // Check if document exists
      const existingDoc = await getDoc(tokenRef);
      
      if (existingDoc.exists()) {
        // Update existing token
        await updateDoc(tokenRef, {
          ...tokenData,
          updatedAt: serverTimestamp(),
        });
        console.log('[PUSH_TOKEN] Token updated successfully');
      } else {
        // Create new token document
        await setDoc(tokenRef, {
          ...tokenData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log('[PUSH_TOKEN] Token created successfully');
      }

      return true;

    } catch (error: any) {
      console.error(`[PUSH_TOKEN] Error saving token (attempt ${retryCount + 1}):`, error);
      
      // Handle specific error types
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.error('[PUSH_TOKEN] Permission denied - check Firestore security rules');
        return false;
      }

      // Retry for network errors
      if ((error.code === 'unavailable' || error.message.includes('network')) && retryCount < maxRetries) {
        console.log(`[PUSH_TOKEN] Network error, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.savePushToken(token, retryCount + 1);
      }

      // Log error for debugging
      FirebaseErrorHandler.logError('savePushToken', error, {
        userId: auth.currentUser?.uid,
        tokenLength: token?.length,
        retryCount,
      });

      return false;
    }
  }

  /**
   * Initialize push notifications and save token
   */
  async initializePushNotifications(): Promise<boolean> {
    try {
      console.log('[PUSH_TOKEN] Initializing push notifications...');

      // Get push token
      const token = await this.getPushToken();
      if (!token) {
        console.warn('[PUSH_TOKEN] Could not obtain push token');
        return false;
      }

      // Save token to Firestore
      const saved = await this.savePushToken(token);
      if (!saved) {
        console.warn('[PUSH_TOKEN] Could not save push token');
        return false;
      }

      console.log('[PUSH_TOKEN] Push notifications initialized successfully');
      return true;

    } catch (error: any) {
      console.error('[PUSH_TOKEN] Error initializing push notifications:', error);
      FirebaseErrorHandler.logError('initializePushNotifications', error);
      return false;
    }
  }

  /**
   * Remove push token (e.g., on logout)
   */
  async removePushToken(): Promise<boolean> {
    try {
      if (!auth.currentUser) {
        console.warn('[PUSH_TOKEN] User not authenticated, cannot remove token');
        return false;
      }

      const userId = auth.currentUser.uid;
      const tokenRef = doc(db, 'userTokens', userId);

      // Mark token as inactive instead of deleting
      await updateDoc(tokenRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });

      this.currentToken = null;
      console.log('[PUSH_TOKEN] Token marked as inactive');
      return true;

    } catch (error: any) {
      console.error('[PUSH_TOKEN] Error removing token:', error);
      FirebaseErrorHandler.logError('removePushToken', error);
      return false;
    }
  }

  /**
   * Get device ID for token identification
   */
  private async getDeviceId(): Promise<string> {
    try {
      // Try to get a unique device identifier
      const deviceId = Device.osInternalBuildId || 
                     Device.modelId || 
                     `${Platform.OS}-${Date.now()}`;
      
      return deviceId;
    } catch (error) {
      console.warn('[PUSH_TOKEN] Error getting device ID:', error);
      return `fallback-${Platform.OS}-${Date.now()}`;
    }
  }

  /**
   * Get current token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Check if push notifications are supported and enabled
   */
  async isSupported(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        return false;
      }

      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[PUSH_TOKEN] Error checking support:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pushTokenService = PushTokenService.getInstance();
export default pushTokenService;
