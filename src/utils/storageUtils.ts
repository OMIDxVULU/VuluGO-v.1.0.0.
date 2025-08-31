import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility functions for handling AsyncStorage operations with proper error handling
 * for development environments where storage may not be available
 */

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Safely get an item from AsyncStorage with error handling
 */
export const safeGetItem = async (key: string): Promise<StorageResult<string | null>> => {
  try {
    const value = await AsyncStorage.getItem(key);
    return { success: true, data: value };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';

    // Check for various development environment storage errors
    if (errorMessage.includes('storage directory') ||
        errorMessage.includes('ExponentExperienceData') ||
        errorMessage.includes('Not a directory') ||
        errorMessage.includes('ENOTDIR') ||
        errorMessage.includes('ENOENT') ||
        errorMessage.includes('directory creation failed') ||
        errorMessage.includes('permission denied') ||
        errorMessage.includes('operation not permitted') ||
        errorMessage.includes('NSCocoaErrorDomain') ||
        errorMessage.includes('Code=512') ||
        errorMessage.includes('NSFileWriteFileExistsError')) {

      // Only log warning once per key to avoid spam
      if (!global.__STORAGE_WARNINGS_LOGGED__) {
        global.__STORAGE_WARNINGS_LOGGED__ = new Set();
      }

      if (!global.__STORAGE_WARNINGS_LOGGED__.has(key)) {
        console.warn(`AsyncStorage unavailable in development environment for key: ${key}`);
        global.__STORAGE_WARNINGS_LOGGED__.add(key);
      }

      // In development, try to use the fallback in-memory storage
      if (__DEV__ && global.__DEV_STORAGE_CACHE__) {
        const fallbackValue = global.__DEV_STORAGE_CACHE__.get(key) || null;
        if (fallbackValue !== null) {
          console.info(`Retrieved from in-memory fallback storage for key: ${key}`);
        }
        return { success: true, data: fallbackValue };
      }

      return { success: false, data: null, error: 'Development environment storage limitation' };
    }

    console.error(`Error getting item from AsyncStorage (${key}):`, error);
    return { success: false, data: null, error: errorMessage };
  }
};

/**
 * Safely set an item in AsyncStorage with error handling
 */
export const safeSetItem = async (key: string, value: string): Promise<StorageResult<void>> => {
  try {
    await AsyncStorage.setItem(key, value);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';

    // Check for various development environment storage errors
    if (errorMessage.includes('storage directory') ||
        errorMessage.includes('ExponentExperienceData') ||
        errorMessage.includes('Not a directory') ||
        errorMessage.includes('ENOTDIR') ||
        errorMessage.includes('ENOENT') ||
        errorMessage.includes('directory creation failed') ||
        errorMessage.includes('permission denied') ||
        errorMessage.includes('operation not permitted') ||
        errorMessage.includes('NSCocoaErrorDomain') ||
        errorMessage.includes('Code=512') ||
        errorMessage.includes('NSFileWriteFileExistsError')) {

      // Only log warning once per key to avoid spam
      if (!global.__STORAGE_WARNINGS_LOGGED__) {
        global.__STORAGE_WARNINGS_LOGGED__ = new Set();
      }

      if (!global.__STORAGE_WARNINGS_LOGGED__.has(key)) {
        console.warn(`AsyncStorage unavailable in development environment for key: ${key}`);
        global.__STORAGE_WARNINGS_LOGGED__.add(key);
      }

      // In development, try to use a fallback in-memory storage
      if (__DEV__) {
        try {
          // Store in a simple in-memory cache as fallback
          if (!global.__DEV_STORAGE_CACHE__) {
            global.__DEV_STORAGE_CACHE__ = new Map();
          }
          global.__DEV_STORAGE_CACHE__.set(key, value);
          console.info(`Using in-memory fallback storage for key: ${key}`);
          return { success: true };
        } catch (fallbackError) {
          console.warn('In-memory fallback also failed:', fallbackError);
        }
      }

      return { success: false, error: 'Development environment storage limitation' };
    }

    console.error(`Error setting item in AsyncStorage (${key}):`, error);
    return { success: false, error: errorMessage };
  }
};

/**
 * Safely remove an item from AsyncStorage with error handling
 */
export const safeRemoveItem = async (key: string): Promise<StorageResult<void>> => {
  try {
    await AsyncStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
    
    // Check if it's a development environment storage error
    if (errorMessage.includes('storage directory') || errorMessage.includes('ExponentExperienceData')) {
      console.warn(`AsyncStorage unavailable in development environment for key: ${key}`);
      return { success: false, error: 'Development environment storage limitation' };
    }
    
    console.error(`Error removing item from AsyncStorage (${key}):`, error);
    return { success: false, error: errorMessage };
  }
};

/**
 * Safely get and parse JSON from AsyncStorage
 */
export const safeGetJSON = async <T>(key: string): Promise<StorageResult<T | null>> => {
  const result = await safeGetItem(key);
  
  if (!result.success || !result.data) {
    return { success: result.success, data: null, error: result.error };
  }
  
  try {
    const parsed = JSON.parse(result.data) as T;
    return { success: true, data: parsed };
  } catch (error) {
    console.error(`Error parsing JSON from AsyncStorage (${key}):`, error);
    return { success: false, data: null, error: 'Invalid JSON data' };
  }
};

/**
 * Safely set JSON data in AsyncStorage
 */
export const safeSetJSON = async <T>(key: string, data: T): Promise<StorageResult<void>> => {
  try {
    const jsonString = JSON.stringify(data);
    return await safeSetItem(key, jsonString);
  } catch (error) {
    console.error(`Error stringifying data for AsyncStorage (${key}):`, error);
    return { success: false, error: 'Failed to serialize data' };
  }
};

/**
 * Check if AsyncStorage is available in the current environment
 */
export const isStorageAvailable = async (): Promise<boolean> => {
  try {
    const testKey = '@storage_test';
    const testValue = 'test';
    
    await AsyncStorage.setItem(testKey, testValue);
    const retrieved = await AsyncStorage.getItem(testKey);
    await AsyncStorage.removeItem(testKey);
    
    return retrieved === testValue;
  } catch (error) {
    return false;
  }
};

/**
 * Get storage availability status with detailed information
 */
export const getStorageStatus = async (): Promise<{
  available: boolean;
  environment: 'development' | 'production' | 'unknown';
  error?: string;
}> => {
  const available = await isStorageAvailable();
  
  if (!available) {
    // Try to determine if this is a development environment issue
    try {
      await AsyncStorage.setItem('@test', 'test');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('ExponentExperienceData') || errorMessage.includes('storage directory')) {
        return {
          available: false,
          environment: 'development',
          error: 'Expo Go simulator storage limitation'
        };
      }
      
      return {
        available: false,
        environment: 'unknown',
        error: errorMessage
      };
    }
  }
  
  return {
    available: true,
    environment: __DEV__ ? 'development' : 'production'
  };
};
