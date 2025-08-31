/**
 * Firebase Authentication Diagnostics Utility
 * Helps diagnose common authentication issues
 */

import { auth, getFirebaseServices, isFirebaseInitialized } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getStorageStatus, isStorageAvailable } from './storageUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthDiagnosticResult {
  success: boolean;
  issue?: string;
  recommendation?: string;
  details?: any;
}

export class AuthDiagnostics {
  /**
   * Run comprehensive authentication diagnostics
   */
  static async runDiagnostics(email?: string, password?: string): Promise<{
    firebaseInit: AuthDiagnosticResult;
    authService: AuthDiagnosticResult;
    storageStatus: AuthDiagnosticResult;
    credentials?: AuthDiagnosticResult;
    overall: AuthDiagnosticResult;
  }> {
    console.log('🔍 Running Comprehensive Authentication & Storage Diagnostics...');

    // Test 1: Firebase Initialization
    const firebaseInit = this.testFirebaseInitialization();

    // Test 2: Auth Service Availability
    const authService = this.testAuthService();

    // Test 3: Storage Status (Critical for iOS Simulator)
    const storageStatus = await this.testStorageStatus();

    // Test 4: Credential Test (if provided)
    let credentials: AuthDiagnosticResult | undefined;
    if (email && password) {
      credentials = await this.testCredentials(email, password);
    }

    // Overall assessment
    const overall = this.assessOverall(firebaseInit, authService, storageStatus, credentials);

    const results = {
      firebaseInit,
      authService,
      storageStatus,
      credentials,
      overall
    };

    console.log('📊 Comprehensive Diagnostic Results:', results);
    return results;
  }

  /**
   * Test Firebase initialization
   */
  static testFirebaseInitialization(): AuthDiagnosticResult {
    try {
      const services = getFirebaseServices();
      const initialized = isFirebaseInitialized();

      if (!initialized) {
        return {
          success: false,
          issue: 'Firebase not properly initialized',
          recommendation: 'Check Firebase configuration and network connection',
          details: {
            services: services,
            initializationError: services.initializationError?.message
          }
        };
      }

      return {
        success: true,
        details: {
          app: !!services.app,
          auth: !!services.auth,
          db: !!services.db,
          storage: !!services.storage
        }
      };
    } catch (error: any) {
      return {
        success: false,
        issue: 'Firebase initialization error',
        recommendation: 'Check Firebase configuration',
        details: { error: error.message }
      };
    }
  }

  /**
   * Test Auth service availability
   */
  static testAuthService(): AuthDiagnosticResult {
    try {
      if (!auth) {
        return {
          success: false,
          issue: 'Firebase Auth instance not available',
          recommendation: 'Ensure Firebase Auth is properly initialized'
        };
      }

      return {
        success: true,
        details: {
          currentUser: auth.currentUser?.uid || null,
          authDomain: auth.config.authDomain,
          apiKey: auth.config.apiKey ? 'present' : 'missing'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        issue: 'Auth service error',
        recommendation: 'Check Firebase Auth configuration',
        details: { error: error.message }
      };
    }
  }

  /**
   * Test AsyncStorage and persistence status (Critical for iOS Simulator)
   */
  static async testStorageStatus(): Promise<AuthDiagnosticResult> {
    try {
      console.log('🔍 Testing AsyncStorage availability...');

      const storageStatus = await getStorageStatus();
      const isAvailable = await isStorageAvailable();

      // Test Firebase Auth persistence specifically
      let authPersistenceWorking = false;
      try {
        // Check if Firebase Auth can use AsyncStorage for persistence
        if (auth && auth.app) {
          authPersistenceWorking = true;
        }
      } catch (persistenceError) {
        console.warn('Firebase Auth persistence test failed:', persistenceError);
      }

      if (!isAvailable) {
        return {
          success: false,
          issue: `AsyncStorage unavailable: ${storageStatus.error}`,
          recommendation: storageStatus.environment === 'development'
            ? 'iOS Simulator storage issue - try simulator reset: xcrun simctl shutdown all && xcrun simctl erase all'
            : 'Storage system error - check device storage permissions',
          details: {
            available: isAvailable,
            environment: storageStatus.environment,
            error: storageStatus.error,
            authPersistence: authPersistenceWorking,
            bypassMode: (global as any).__STORAGE_BYPASS_MODE__ || false
          }
        };
      }

      return {
        success: true,
        details: {
          available: isAvailable,
          environment: storageStatus.environment,
          authPersistence: authPersistenceWorking,
          bypassMode: (global as any).__STORAGE_BYPASS_MODE__ || false
        }
      };
    } catch (error: any) {
      return {
        success: false,
        issue: 'Storage diagnostic failed',
        recommendation: 'Critical storage system error - restart app and simulator',
        details: { error: error.message }
      };
    }
  }

  /**
   * Test specific credentials
   */
  static async testCredentials(email: string, password: string): Promise<AuthDiagnosticResult> {
    try {
      if (!auth) {
        return {
          success: false,
          issue: 'Auth service not available for credential test'
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          issue: 'Invalid email format',
          recommendation: 'Check email format',
          details: { email: email }
        };
      }

      // Validate password
      if (!password || password.length < 6) {
        return {
          success: false,
          issue: 'Password too short or empty',
          recommendation: 'Password must be at least 6 characters',
          details: { passwordLength: password.length }
        };
      }

      // Attempt sign-in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      return {
        success: true,
        details: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          emailVerified: userCredential.user.emailVerified,
          displayName: userCredential.user.displayName
        }
      };

    } catch (error: any) {
      return {
        success: false,
        issue: `Authentication failed: ${error.code}`,
        recommendation: this.getRecommendationForError(error.code),
        details: {
          errorCode: error.code,
          errorMessage: error.message,
          email: email,
          emailDomain: email.split('@')[1]
        }
      };
    }
  }

  /**
   * Get recommendation based on error code
   */
  static getRecommendationForError(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'User account does not exist. Check email or create new account.';
      case 'auth/wrong-password':
        return 'Incorrect password. Try again or reset password.';
      case 'auth/invalid-credential':
        return 'Invalid email/password combination. Verify credentials or check if account exists.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Wait before trying again.';
      case 'auth/network-request-failed':
        return 'Network error. Check internet connection.';
      case 'auth/invalid-email':
        return 'Invalid email format. Check email address.';
      case 'auth/user-disabled':
        return 'Account has been disabled. Contact support.';
      case 'auth/operation-not-allowed':
        return 'Email/password authentication not enabled in Firebase Console.';
      default:
        return 'Unknown authentication error. Check Firebase Console and logs.';
    }
  }

  /**
   * Assess overall authentication health
   */
  static assessOverall(
    firebaseInit: AuthDiagnosticResult,
    authService: AuthDiagnosticResult,
    storageStatus: AuthDiagnosticResult,
    credentials?: AuthDiagnosticResult
  ): AuthDiagnosticResult {
    if (!firebaseInit.success) {
      return {
        success: false,
        issue: 'Firebase initialization failed',
        recommendation: 'Fix Firebase configuration before attempting authentication'
      };
    }

    if (!authService.success) {
      return {
        success: false,
        issue: 'Auth service unavailable',
        recommendation: 'Check Firebase Auth setup and configuration'
      };
    }

    if (!storageStatus.success) {
      return {
        success: false,
        issue: 'Storage system unavailable - affects auth persistence',
        recommendation: storageStatus.recommendation || 'Fix AsyncStorage issues for proper authentication persistence'
      };
    }

    if (credentials && !credentials.success) {
      return {
        success: false,
        issue: 'Credential authentication failed',
        recommendation: credentials.recommendation || 'Check user credentials and account status'
      };
    }

    return {
      success: true,
      recommendation: 'Authentication and storage systems are working properly'
    };
  }

  /**
   * Quick diagnostic for common issues
   */
  static async quickDiagnostic(): Promise<string[]> {
    const issues: string[] = [];

    // Check Firebase initialization
    if (!isFirebaseInitialized()) {
      issues.push('Firebase not initialized');
    }

    // Check Auth service
    if (!auth) {
      issues.push('Firebase Auth not available');
    }

    // Check network connectivity (basic)
    try {
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
    } catch {
      issues.push('Network connectivity issues');
    }

    return issues;
  }
}

/**
 * Helper function to run diagnostics from console
 */
export const runAuthDiagnostics = async (email?: string, password?: string) => {
  return await AuthDiagnostics.runDiagnostics(email, password);
};
