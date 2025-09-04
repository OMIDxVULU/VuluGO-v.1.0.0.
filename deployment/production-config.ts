/**
 * Production Deployment Configuration
 * This file contains all production-ready configurations and deployment settings
 */

export interface DeploymentEnvironment {
  name: 'development' | 'staging' | 'production';
  apiUrl: string;
  firebaseConfig: FirebaseConfig;
  agoraConfig: AgoraConfig;
  securityConfig: SecurityConfig;
  monitoringConfig: MonitoringConfig;
  performanceConfig: PerformanceConfig;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface AgoraConfig {
  appId: string;
  appCertificate: string;
  customerId: string;
  customerSecret: string;
  enableVideoStreaming: boolean;
  defaultStreamProfile: string;
  maxParticipantsPerStream: number;
}

export interface SecurityConfig {
  enableRateLimiting: boolean;
  enableDDoSProtection: boolean;
  enableContentFiltering: boolean;
  maxFailedAttempts: number;
  accountLockDuration: number;
  enableSecurityAudit: boolean;
  auditInterval: number; // in milliseconds
}

export interface MonitoringConfig {
  enableCrashlytics: boolean;
  enableAnalytics: boolean;
  enablePerformanceMonitoring: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableRemoteLogging: boolean;
}

export interface PerformanceConfig {
  enableCodeSplitting: boolean;
  enableImageOptimization: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
  enableCompression: boolean;
}

// Production Environment Configuration
export const PRODUCTION_CONFIG: DeploymentEnvironment = {
  name: 'production',
  apiUrl: 'https://api.vulugo.com',
  firebaseConfig: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
  agoraConfig: {
    appId: process.env.EXPO_PUBLIC_AGORA_APP_ID || '',
    appCertificate: process.env.EXPO_PUBLIC_AGORA_APP_CERTIFICATE || '',
    customerId: process.env.EXPO_PUBLIC_AGORA_CUSTOMER_ID || '',
    customerSecret: process.env.EXPO_PUBLIC_AGORA_CUSTOMER_SECRET || '',
    enableVideoStreaming: process.env.EXPO_PUBLIC_ENABLE_VIDEO_STREAMING === 'true',
    defaultStreamProfile: process.env.EXPO_PUBLIC_DEFAULT_STREAM_PROFILE || 'HD',
    maxParticipantsPerStream: parseInt(process.env.EXPO_PUBLIC_MAX_PARTICIPANTS_PER_STREAM || '50'),
  },
  securityConfig: {
    enableRateLimiting: true,
    enableDDoSProtection: true,
    enableContentFiltering: true,
    maxFailedAttempts: 5,
    accountLockDuration: 30 * 60 * 1000, // 30 minutes
    enableSecurityAudit: true,
    auditInterval: 24 * 60 * 60 * 1000, // 24 hours
  },
  monitoringConfig: {
    enableCrashlytics: true,
    enableAnalytics: true,
    enablePerformanceMonitoring: true,
    logLevel: 'error',
    enableRemoteLogging: true,
  },
  performanceConfig: {
    enableCodeSplitting: true,
    enableImageOptimization: true,
    enableCaching: true,
    cacheTimeout: 60 * 60 * 1000, // 1 hour
    enableCompression: true,
  },
};

// Staging Environment Configuration
export const STAGING_CONFIG: DeploymentEnvironment = {
  ...PRODUCTION_CONFIG,
  name: 'staging',
  apiUrl: 'https://staging-api.vulugo.com',
  monitoringConfig: {
    ...PRODUCTION_CONFIG.monitoringConfig,
    logLevel: 'info',
  },
  securityConfig: {
    ...PRODUCTION_CONFIG.securityConfig,
    auditInterval: 12 * 60 * 60 * 1000, // 12 hours
  },
};

// Development Environment Configuration
export const DEVELOPMENT_CONFIG: DeploymentEnvironment = {
  ...PRODUCTION_CONFIG,
  name: 'development',
  apiUrl: 'http://localhost:3000',
  monitoringConfig: {
    ...PRODUCTION_CONFIG.monitoringConfig,
    logLevel: 'debug',
    enableRemoteLogging: false,
  },
  securityConfig: {
    ...PRODUCTION_CONFIG.securityConfig,
    enableSecurityAudit: false,
    maxFailedAttempts: 10, // More lenient for development
  },
  performanceConfig: {
    ...PRODUCTION_CONFIG.performanceConfig,
    enableCodeSplitting: false,
    enableImageOptimization: false,
    enableCaching: false,
  },
};

// Get current environment configuration
export function getCurrentConfig(): DeploymentEnvironment {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'staging':
      return STAGING_CONFIG;
    default:
      return DEVELOPMENT_CONFIG;
  }
}

// Validate configuration
export function validateConfig(config: DeploymentEnvironment): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate Firebase config
  if (!config.firebaseConfig.apiKey) errors.push('Firebase API key is required');
  if (!config.firebaseConfig.projectId) errors.push('Firebase project ID is required');
  if (!config.firebaseConfig.authDomain) errors.push('Firebase auth domain is required');

  // Validate Agora config for production
  if (config.name === 'production') {
    if (!config.agoraConfig.appId) errors.push('Agora App ID is required for production');
    if (!config.agoraConfig.appCertificate) errors.push('Agora App Certificate is required for production');
  }

  // Validate security config
  if (config.securityConfig.maxFailedAttempts < 1) {
    errors.push('Max failed attempts must be at least 1');
  }
  if (config.securityConfig.accountLockDuration < 60000) {
    errors.push('Account lock duration must be at least 1 minute');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Environment-specific feature flags
export const FEATURE_FLAGS = {
  development: {
    enableDebugMode: true,
    enableMockServices: true,
    enableTestingTools: true,
    skipAuthentication: false,
    enableVerboseLogging: true,
  },
  staging: {
    enableDebugMode: true,
    enableMockServices: false,
    enableTestingTools: true,
    skipAuthentication: false,
    enableVerboseLogging: false,
  },
  production: {
    enableDebugMode: false,
    enableMockServices: false,
    enableTestingTools: false,
    skipAuthentication: false,
    enableVerboseLogging: false,
  },
};

// Get feature flags for current environment
export function getFeatureFlags() {
  const config = getCurrentConfig();
  return FEATURE_FLAGS[config.name];
}

// Deployment checklist
export const DEPLOYMENT_CHECKLIST = {
  preDeployment: [
    'Run comprehensive test suite',
    'Perform security audit',
    'Validate all environment variables',
    'Check Firebase security rules',
    'Verify Agora configuration',
    'Test authentication flows',
    'Validate API endpoints',
    'Check error handling',
    'Verify logging configuration',
    'Test offline functionality',
  ],
  postDeployment: [
    'Monitor application startup',
    'Check authentication service',
    'Verify streaming functionality',
    'Monitor error rates',
    'Check performance metrics',
    'Validate push notifications',
    'Test critical user flows',
    'Monitor security events',
    'Check database connections',
    'Verify third-party integrations',
  ],
  rollback: [
    'Identify rollback trigger conditions',
    'Prepare rollback scripts',
    'Notify stakeholders',
    'Execute rollback procedure',
    'Verify rollback success',
    'Monitor post-rollback metrics',
    'Document incident',
    'Plan hotfix deployment',
  ],
};

export default {
  PRODUCTION_CONFIG,
  STAGING_CONFIG,
  DEVELOPMENT_CONFIG,
  getCurrentConfig,
  validateConfig,
  getFeatureFlags,
  DEPLOYMENT_CHECKLIST,
};
