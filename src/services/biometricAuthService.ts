import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface BiometricAuthConfig {
  enabled: boolean;
  lastUsed: number;
  userEmail?: string;
  userId?: string;
}

export interface BiometricCapabilities {
  isAvailable: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  isEnrolled: boolean;
  securityLevel: LocalAuthentication.SecurityLevel;
}

class BiometricAuthService {
  private static instance: BiometricAuthService;
  private readonly BIOMETRIC_CONFIG_KEY = '@vulugo_biometric_config';
  private readonly BIOMETRIC_CREDENTIALS_KEY = '@vulugo_biometric_credentials';

  private constructor() {}

  public static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  // Check if biometric authentication is available on the device
  async getCapabilities(): Promise<BiometricCapabilities> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      return {
        isAvailable,
        supportedTypes,
        isEnrolled,
        securityLevel,
      };
    } catch (error) {
      console.warn('Error checking biometric capabilities:', error);
      return {
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false,
        securityLevel: LocalAuthentication.SecurityLevel.NONE,
      };
    }
  }

  // Get user-friendly description of available biometric types
  async getBiometricTypeDescription(): Promise<string> {
    const capabilities = await this.getCapabilities();
    
    if (!capabilities.isAvailable || !capabilities.isEnrolled) {
      return 'Biometric authentication not available';
    }

    const types = capabilities.supportedTypes;
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Recognition';
    } else {
      return 'Biometric Authentication';
    }
  }

  // Enable biometric authentication for a user
  async enableBiometricAuth(userEmail: string, userId: string): Promise<boolean> {
    try {
      const capabilities = await this.getCapabilities();
      
      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        throw new Error('Biometric authentication is not available or not set up on this device');
      }

      // Authenticate user first to confirm they can use biometrics
      const authResult = await this.authenticateWithBiometrics('Enable biometric login for VuluGO?');
      
      if (!authResult.success) {
        return false;
      }

      // Store biometric configuration
      const config: BiometricAuthConfig = {
        enabled: true,
        lastUsed: Date.now(),
        userEmail,
        userId,
      };

      await AsyncStorage.setItem(this.BIOMETRIC_CONFIG_KEY, JSON.stringify(config));

      // Store encrypted credentials in secure storage
      const credentials = {
        userEmail,
        userId,
        enabledAt: Date.now(),
      };

      try {
        await SecureStore.setItemAsync(this.BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
      } catch (error) {
        console.warn('Failed to store credentials in secure storage, falling back to AsyncStorage:', error);
        await AsyncStorage.setItem(this.BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
      }
      
      return true;
    } catch (error: any) {
      console.warn('Error enabling biometric auth:', error);
      throw new Error(error.message || 'Failed to enable biometric authentication');
    }
  }

  // Disable biometric authentication
  async disableBiometricAuth(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.BIOMETRIC_CONFIG_KEY);

      // Remove from secure storage first, fallback to AsyncStorage
      try {
        await SecureStore.deleteItemAsync(this.BIOMETRIC_CREDENTIALS_KEY);
      } catch (error) {
        console.warn('Failed to remove from secure storage, trying AsyncStorage:', error);
        await AsyncStorage.removeItem(this.BIOMETRIC_CREDENTIALS_KEY);
      }
    } catch (error) {
      console.warn('Error disabling biometric auth:', error);
      throw new Error('Failed to disable biometric authentication');
    }
  }

  // Check if biometric authentication is enabled for the current device
  async isBiometricAuthEnabled(): Promise<boolean> {
    try {
      const configStr = await AsyncStorage.getItem(this.BIOMETRIC_CONFIG_KEY);
      if (!configStr) return false;

      const config: BiometricAuthConfig = JSON.parse(configStr);
      return config.enabled;
    } catch (error) {
      console.warn('Error checking biometric auth status:', error);
      return false;
    }
  }

  // Get stored biometric configuration
  async getBiometricConfig(): Promise<BiometricAuthConfig | null> {
    try {
      const configStr = await AsyncStorage.getItem(this.BIOMETRIC_CONFIG_KEY);
      if (!configStr) return null;

      return JSON.parse(configStr);
    } catch (error) {
      console.warn('Error getting biometric config:', error);
      return null;
    }
  }

  // Authenticate user with biometrics
  async authenticateWithBiometrics(promptMessage?: string): Promise<{
    success: boolean;
    error?: string;
    userEmail?: string;
    userId?: string;
  }> {
    try {
      const capabilities = await this.getCapabilities();
      
      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      if (!capabilities.isEnrolled) {
        return {
          success: false,
          error: 'No biometric credentials are enrolled on this device',
        };
      }

      const biometricType = await this.getBiometricTypeDescription();
      const defaultPrompt = `Use ${biometricType} to sign in to VuluGO`;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || defaultPrompt,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Get stored credentials from secure storage first, fallback to AsyncStorage
        let credentialsStr: string | null = null;

        try {
          credentialsStr = await SecureStore.getItemAsync(this.BIOMETRIC_CREDENTIALS_KEY);
        } catch (error) {
          console.warn('Failed to read from secure storage, trying AsyncStorage:', error);
          credentialsStr = await AsyncStorage.getItem(this.BIOMETRIC_CREDENTIALS_KEY);
        }

        if (credentialsStr) {
          const credentials = JSON.parse(credentialsStr);

          // Update last used timestamp
          const config = await this.getBiometricConfig();
          if (config) {
            config.lastUsed = Date.now();
            await AsyncStorage.setItem(this.BIOMETRIC_CONFIG_KEY, JSON.stringify(config));
          }

          return {
            success: true,
            userEmail: credentials.userEmail,
            userId: credentials.userId,
          };
        } else {
          // Biometric auth succeeded but no stored credentials found
          console.warn('Biometric authentication succeeded but no stored credentials found');

          // Clear stale biometric config
          await this.disableBiometricAuth();

          return {
            success: false,
            error: 'No stored credentials found. Please re-enable biometric authentication.',
          };
        }
      }

      return {
        success: false,
        error: result.error || 'Biometric authentication failed',
      };
    } catch (error: any) {
      console.warn('Error during biometric authentication:', error);
      return {
        success: false,
        error: error.message || 'Biometric authentication failed',
      };
    }
  }

  // Check if biometric authentication should be offered (user has it enabled and device supports it)
  async shouldOfferBiometricAuth(): Promise<boolean> {
    try {
      const isEnabled = await this.isBiometricAuthEnabled();
      if (!isEnabled) return false;

      const capabilities = await this.getCapabilities();
      return capabilities.isAvailable && capabilities.isEnrolled;
    } catch (error) {
      console.warn('Error checking if should offer biometric auth:', error);
      return false;
    }
  }

  // Get the stored user email for biometric authentication
  async getStoredUserEmail(): Promise<string | null> {
    try {
      const config = await this.getBiometricConfig();
      return config?.userEmail || null;
    } catch (error) {
      console.warn('Error getting stored user email:', error);
      return null;
    }
  }

  // Clear all biometric data (useful for logout or account switching)
  async clearBiometricData(): Promise<void> {
    try {
      await this.disableBiometricAuth();
    } catch (error) {
      console.warn('Error clearing biometric data:', error);
    }
  }
}

export const biometricAuthService = BiometricAuthService.getInstance();
export default biometricAuthService;
