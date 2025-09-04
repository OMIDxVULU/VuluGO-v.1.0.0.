import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface PermissionState {
  microphone: boolean;
  hasRequestedThisSession: boolean;
  lastRequestTime: number;
}

class PermissionService {
  private static instance: PermissionService;
  private permissionState: PermissionState = {
    microphone: false,
    hasRequestedThisSession: false,
    lastRequestTime: 0,
  };

  private readonly PERMISSION_STORAGE_KEY = 'live_stream_permissions';
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private storageAvailable: boolean = true;
  private isSimulator: boolean = false;

  static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  private async checkStorageAvailability(): Promise<boolean> {
    try {
      // Detect if we're in iOS simulator
      this.isSimulator = Platform.OS === 'ios' && __DEV__;

      // Test storage with a simple write/read/delete operation
      const testKey = 'storage_test_key';
      const testValue = 'test';

      await AsyncStorage.setItem(testKey, testValue);
      const retrievedValue = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);

      const isWorking = retrievedValue === testValue;

      if (!isWorking && this.isSimulator) {
        console.warn('⚠️ AsyncStorage not working in iOS simulator - using in-memory fallback');
      }

      return isWorking;
    } catch (error) {
      console.warn('⚠️ AsyncStorage availability check failed:', error);

      // Check for specific iOS simulator errors
      if (error instanceof Error) {
        const isIOSStorageError = error.message.includes('NSCocoaErrorDomain') ||
                                 error.message.includes('NSPOSIXErrorDomain') ||
                                 error.message.includes('Failed to create storage directory');

        if (isIOSStorageError && this.isSimulator) {
          console.warn('🔧 Detected iOS simulator storage issue - enabling fallback mode');
        }
      }

      return false;
    }
  }

  async initializePermissions(): Promise<void> {
    try {
      // Check if storage is available
      this.storageAvailable = await this.checkStorageAvailability();

      if (this.storageAvailable) {
        // Load stored permission state
        try {
          const storedState = await AsyncStorage.getItem(this.PERMISSION_STORAGE_KEY);
          if (storedState) {
            const parsed = JSON.parse(storedState);
            const now = Date.now();

            // Check if stored permissions are still valid (within session timeout)
            if (now - parsed.lastRequestTime < this.SESSION_TIMEOUT) {
              this.permissionState = parsed;
              console.log('✅ Loaded stored permission state from AsyncStorage');
            } else {
              console.log('ℹ️ Stored permissions expired, will request fresh permissions');
            }
          }
        } catch (storageError) {
          console.warn('⚠️ Failed to load stored permissions, continuing with defaults:', storageError);
          this.storageAvailable = false;
        }
      } else {
        console.log('ℹ️ Storage not available - using session-only permission management');
      }

      // Check current system permissions
      await this.checkCurrentPermissions();
    } catch (error) {
      console.error('❌ Error initializing permissions:', error);
      // Continue with default state - don't fail the entire initialization
    }
  }

  private async checkCurrentPermissions(): Promise<void> {
    try {
      // Check microphone permission
      const audioStatus = await Audio.getPermissionsAsync();
      this.permissionState.microphone = audioStatus.status === 'granted';
    } catch (error) {
      console.error('Error checking current permissions:', error);
    }
  }

  async requestPermissions(): Promise<PermissionState> {
    // If we've already requested permissions this session and they were granted, return current state
    if (this.permissionState.hasRequestedThisSession && 
        this.permissionState.microphone) {
      return this.permissionState;
    }

    try {
      // Request microphone permission
      const audioResult = await Audio.requestPermissionsAsync();
      this.permissionState.microphone = audioResult.status === 'granted';

      // Update session state
      this.permissionState.hasRequestedThisSession = true;
      this.permissionState.lastRequestTime = Date.now();

      // Store the permission state
      await this.storePermissionState();

      return this.permissionState;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return this.permissionState;
    }
  }

  private async storePermissionState(): Promise<void> {
    if (!this.storageAvailable) {
      console.log('ℹ️ Storage not available - permission state will not persist');
      return;
    }

    try {
      await AsyncStorage.setItem(
        this.PERMISSION_STORAGE_KEY,
        JSON.stringify(this.permissionState)
      );
      console.log('✅ Permission state stored successfully');
    } catch (error) {
      console.warn('⚠️ Failed to store permission state:', error);

      // Mark storage as unavailable for future operations
      this.storageAvailable = false;

      // Check for specific iOS simulator errors
      if (error instanceof Error) {
        const isIOSStorageError = error.message.includes('NSCocoaErrorDomain') ||
                                 error.message.includes('NSPOSIXErrorDomain') ||
                                 error.message.includes('Failed to create storage directory');

        if (isIOSStorageError && this.isSimulator) {
          console.warn('🔧 iOS simulator storage issue detected - continuing without persistence');
        }
      }
    }
  }

  getPermissionState(): PermissionState {
    return { ...this.permissionState };
  }

  hasRequiredPermissions(): boolean {
    return this.permissionState.microphone;
  }

  async resetPermissions(): Promise<void> {
    // Reset in-memory state
    this.permissionState = {
      microphone: false,
      hasRequestedThisSession: false,
      lastRequestTime: 0,
    };

    // Only try to clear storage if it's available
    if (this.storageAvailable) {
      try {
        await AsyncStorage.removeItem(this.PERMISSION_STORAGE_KEY);
        console.log('✅ Permission state cleared from storage');
      } catch (error) {
        console.warn('⚠️ Failed to clear permission state from storage:', error);
        // Don't fail the reset operation due to storage issues
      }
    } else {
      console.log('ℹ️ Storage not available - only cleared in-memory permission state');
    }
  }

  // Method to handle permission denial gracefully
  handlePermissionDenied(permissionType: 'microphone'): string {
    switch (permissionType) {
      case 'microphone':
        return 'Microphone access is required for live streaming. Please enable it in your device settings.';
      default:
        return 'Microphone permission is required for live streaming.';
    }
  }

  // Get storage and environment status for debugging
  getStorageStatus(): {
    storageAvailable: boolean;
    isSimulator: boolean;
    platform: string;
    environment: string;
  } {
    return {
      storageAvailable: this.storageAvailable,
      isSimulator: this.isSimulator,
      platform: Platform.OS,
      environment: __DEV__ ? 'development' : 'production'
    };
  }
}

export const permissionService = PermissionService.getInstance();
