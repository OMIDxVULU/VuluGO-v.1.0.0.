/**
 * SMS Service Configuration
 * Centralized configuration for SMS verification services
 */

export interface SMSServiceConfig {
  // Service selection
  preferredService: 'firebase' | 'twilio' | 'mock';
  enableFallback: boolean;
  
  // Development settings
  useMockInDevelopment: boolean;
  logVerificationCodes: boolean;
  
  // Verification settings
  codeLength: number;
  codeExpirationMinutes: number;
  maxAttempts: number;
  resendCooldownSeconds: number;
  
  // Twilio settings
  twilio: {
    accountSid: string;
    apiKeySid: string;
    apiKeySecret: string;
    authToken: string; // Fallback
    fromNumber: string;
    enabled: boolean;
  };
  
  // Firebase settings
  firebase: {
    enabled: boolean;
    useRecaptcha: boolean;
  };
}

/**
 * Default SMS service configuration
 */
export const defaultSMSConfig: SMSServiceConfig = {
  // Service selection
  preferredService: 'twilio', // Use Twilio as primary service for React Native
  enableFallback: true, // Allow fallback to other services if preferred fails

  // Development settings
  useMockInDevelopment: true, // Use mock SMS in development to avoid Twilio timeouts
  logVerificationCodes: true, // Log codes to console in development
  
  // Verification settings
  codeLength: 6,
  codeExpirationMinutes: 10,
  maxAttempts: 3,
  resendCooldownSeconds: 60,
  
  // Twilio settings (from environment variables)
  twilio: {
    accountSid: process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID || '',
    apiKeySid: process.env.EXPO_PUBLIC_TWILIO_API_KEY_SID || '',
    apiKeySecret: process.env.EXPO_PUBLIC_TWILIO_API_KEY_SECRET || '',
    authToken: process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN || '', // Fallback
    fromNumber: process.env.EXPO_PUBLIC_TWILIO_FROM_NUMBER || '',
    enabled: !!(
      process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID &&
      process.env.EXPO_PUBLIC_TWILIO_FROM_NUMBER &&
      process.env.EXPO_PUBLIC_TWILIO_FROM_NUMBER !== '+1234567890' && // Not placeholder
      (
        // API Key credentials (preferred)
        (process.env.EXPO_PUBLIC_TWILIO_API_KEY_SID && process.env.EXPO_PUBLIC_TWILIO_API_KEY_SECRET) ||
        // Account credentials (fallback)
        process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN
      )
    ),
  },
  
  // Firebase settings
  firebase: {
    enabled: true, // Firebase is always available if properly configured
    useRecaptcha: true, // Required for web environments
  },
};

/**
 * Get current SMS service configuration
 */
export const getSMSConfig = (): SMSServiceConfig => {
  // In production, you might want to fetch this from a remote config service
  // For now, return the default configuration
  return defaultSMSConfig;
};

/**
 * Check if a specific SMS service is available
 */
export const isSMSServiceAvailable = (service: 'firebase' | 'twilio' | 'mock'): boolean => {
  const config = getSMSConfig();
  
  switch (service) {
    case 'firebase':
      return config.firebase.enabled;
    
    case 'twilio':
      const hasAccountSid = config.twilio.accountSid.length > 0;
      const hasFromNumber = config.twilio.fromNumber.length > 0;
      const hasApiKey = config.twilio.apiKeySid.length > 0 && config.twilio.apiKeySecret.length > 0;
      const hasAuthToken = config.twilio.authToken.length > 0;

      return config.twilio.enabled &&
             hasAccountSid &&
             hasFromNumber &&
             (hasApiKey || hasAuthToken); // Either API key or auth token
    
    case 'mock':
      return true; // Mock is always available
    
    default:
      return false;
  }
};

/**
 * Get the best available SMS service based on configuration and environment
 */
export const getBestSMSService = (): 'firebase' | 'twilio' | 'mock' => {
  const config = getSMSConfig();
  
  // In development, use mock if configured
  const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV === "development";
  if (isDev && config.useMockInDevelopment) {
    return 'mock';
  }
  
  // Try preferred service first
  if (isSMSServiceAvailable(config.preferredService)) {
    return config.preferredService;
  }
  
  // If fallback is enabled, try other services
  if (config.enableFallback) {
    const services: Array<'firebase' | 'twilio' | 'mock'> = ['firebase', 'twilio', 'mock'];
    
    for (const service of services) {
      if (service !== config.preferredService && isSMSServiceAvailable(service)) {
        return service;
      }
    }
  }
  
  // Final fallback to mock
  return 'mock';
};

/**
 * Log SMS service configuration status
 */
export const logSMSServiceStatus = (): void => {
  const config = getSMSConfig();
  const bestService = getBestSMSService();

  console.log('📱 SMS Service Configuration:');
  console.log(`  Preferred: ${config.preferredService}`);
  console.log(`  Best Available: ${bestService}`);
  console.log(`  Firebase Available: ${isSMSServiceAvailable('firebase')}`);
  console.log(`  Twilio Available: ${isSMSServiceAvailable('twilio')}`);
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  console.log(`  Development Mode: ${isDev}`);
  console.log(`  Use Mock in Dev: ${config.useMockInDevelopment}`);

  console.log('🔍 Environment Variables:');
  console.log(`  TWILIO_ACCOUNT_SID: ${process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING'}`);
  console.log(`  TWILIO_API_KEY_SID: ${process.env.EXPO_PUBLIC_TWILIO_API_KEY_SID ? 'SET' : 'MISSING'}`);
  console.log(`  TWILIO_API_KEY_SECRET: ${process.env.EXPO_PUBLIC_TWILIO_API_KEY_SECRET ? 'SET' : 'MISSING'}`);
  console.log(`  TWILIO_AUTH_TOKEN: ${process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING'}`);
  console.log(`  TWILIO_FROM_NUMBER: ${process.env.EXPO_PUBLIC_TWILIO_FROM_NUMBER || 'MISSING'}`);

  console.log('⚙️ Twilio Configuration:');
  console.log(`  Account SID: ${config.twilio.accountSid ? config.twilio.accountSid.substring(0, 10) + '...' : 'MISSING'}`);
  console.log(`  API Key SID: ${config.twilio.apiKeySid ? config.twilio.apiKeySid.substring(0, 10) + '...' : 'MISSING'}`);
  console.log(`  API Key Secret: ${config.twilio.apiKeySecret ? 'SET' : 'MISSING'}`);
  console.log(`  Auth Token (fallback): ${config.twilio.authToken ? 'SET' : 'MISSING'}`);
  console.log(`  From Number: ${config.twilio.fromNumber || 'MISSING'}`);
  console.log(`  Authentication: ${config.twilio.apiKeySid ? 'API Key' : 'Account Credentials'}`);
  console.log(`  Enabled: ${config.twilio.enabled}`);
};

export default defaultSMSConfig;
