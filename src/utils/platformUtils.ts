import { Platform } from 'react-native';

/**
 * Utility functions for platform-specific API checks and compatibility
 */
export class PlatformUtils {
  
  /**
   * Check if we're running on React Native
   */
  static isReactNative(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }
  
  /**
   * Check if we're running on web
   */
  static isWeb(): boolean {
    return Platform.OS === 'web';
  }
  
  /**
   * Check if we're running on iOS
   */
  static isIOS(): boolean {
    return Platform.OS === 'ios';
  }
  
  /**
   * Check if we're running on Android
   */
  static isAndroid(): boolean {
    return Platform.OS === 'android';
  }
  
  /**
   * Safely check if window object exists (web-specific)
   */
  static hasWindow(): boolean {
    return typeof window !== 'undefined';
  }
  
  /**
   * Safely check if document object exists (web-specific)
   */
  static hasDocument(): boolean {
    return typeof document !== 'undefined';
  }
  
  /**
   * Get platform-specific event emitter
   * Returns DeviceEventEmitter for React Native, custom emitter for web
   */
  static getEventEmitter() {
    try {
      if (this.isReactNative()) {
        const { DeviceEventEmitter } = require('react-native');
        if (DeviceEventEmitter) {
          return DeviceEventEmitter;
        } else {
          console.warn('⚠️ DeviceEventEmitter not available, using fallback');
          return this.createMockEventEmitter();
        }
      } else if (this.hasWindow()) {
        // Web fallback - create a simple event emitter
        return this.createWebEventEmitter();
      } else {
        // Fallback for other environments
        return this.createMockEventEmitter();
      }
    } catch (error) {
      console.error('❌ Error getting event emitter:', error);
      return this.createMockEventEmitter();
    }
  }
  
  /**
   * Create a web-compatible event emitter
   */
  private static createWebEventEmitter() {
    const listeners: { [key: string]: Function[] } = {};
    
    return {
      addListener: (eventName: string, callback: Function) => {
        if (!listeners[eventName]) {
          listeners[eventName] = [];
        }
        listeners[eventName].push(callback);
        
        return {
          remove: () => {
            const index = listeners[eventName]?.indexOf(callback);
            if (index !== undefined && index > -1) {
              listeners[eventName].splice(index, 1);
            }
          }
        };
      },
      
      emit: (eventName: string, data: any) => {
        if (listeners[eventName]) {
          listeners[eventName].forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error(`Error in event listener for ${eventName}:`, error);
            }
          });
        }
      },
      
      removeAllListeners: (eventName?: string) => {
        if (eventName) {
          delete listeners[eventName];
        } else {
          Object.keys(listeners).forEach(key => delete listeners[key]);
        }
      }
    };
  }
  
  /**
   * Create a mock event emitter for unsupported environments
   */
  private static createMockEventEmitter() {
    return {
      addListener: (eventName: string, callback: Function) => {
        console.warn(`Event emitter not available in this environment. Event: ${eventName}`);
        return { remove: () => {} };
      },
      
      emit: (eventName: string, data: any) => {
        console.warn(`Event emitter not available in this environment. Event: ${eventName}`);
      },
      
      removeAllListeners: (eventName?: string) => {
        console.warn(`Event emitter not available in this environment.`);
      }
    };
  }
  
  /**
   * Safely execute platform-specific code
   */
  static executeForPlatform<T>(handlers: {
    ios?: () => T;
    android?: () => T;
    web?: () => T;
    default?: () => T;
  }): T | undefined {
    try {
      if (this.isIOS() && handlers.ios) {
        return handlers.ios();
      } else if (this.isAndroid() && handlers.android) {
        return handlers.android();
      } else if (this.isWeb() && handlers.web) {
        return handlers.web();
      } else if (handlers.default) {
        return handlers.default();
      }
    } catch (error) {
      console.error('Error executing platform-specific code:', error);
      if (handlers.default) {
        try {
          return handlers.default();
        } catch (defaultError) {
          console.error('Error executing default handler:', defaultError);
        }
      }
    }
    
    return undefined;
  }
  
  /**
   * Safely access platform-specific APIs with fallbacks
   */
  static safeApiCall<T>(
    apiCall: () => T,
    fallback: T,
    errorMessage?: string
  ): T {
    try {
      return apiCall();
    } catch (error) {
      console.warn(errorMessage || 'API call failed, using fallback:', error);
      return fallback;
    }
  }
  
  /**
   * Check if Firebase is available and properly configured
   */
  static isFirebaseAvailable(): boolean {
    try {
      // Try to import Firebase and check if it's configured
      const { db } = require('../services/firebase');
      return db !== null && db !== undefined;
    } catch (error) {
      console.warn('Firebase not available:', error);
      return false;
    }
  }
  
  /**
   * Get platform-specific storage
   */
  static getStorage() {
    return this.executeForPlatform({
      ios: () => {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          return AsyncStorage;
        } catch (error) {
          console.warn('AsyncStorage not available on iOS');
          return null;
        }
      },
      android: () => {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          return AsyncStorage;
        } catch (error) {
          console.warn('AsyncStorage not available on Android');
          return null;
        }
      },
      web: () => {
        return this.hasWindow() ? window.localStorage : null;
      },
      default: () => null
    });
  }
  
  /**
   * Get platform info for debugging
   */
  static getPlatformInfo() {
    return {
      os: Platform.OS,
      version: Platform.Version,
      isReactNative: this.isReactNative(),
      isWeb: this.isWeb(),
      hasWindow: this.hasWindow(),
      hasDocument: this.hasDocument(),
      isFirebaseAvailable: this.isFirebaseAvailable()
    };
  }
  
  /**
   * Log platform info for debugging
   */
  static logPlatformInfo() {
    const info = this.getPlatformInfo();
    console.log('🔍 Platform Info:', JSON.stringify(info, null, 2));
  }
}

export default PlatformUtils;
