/**
 * Account Verification Utility
 * Helps verify specific user accounts and diagnose authentication issues
 */

import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';

export interface AccountVerificationResult {
  exists: boolean;
  signInMethods: string[];
  canSignIn: boolean;
  error?: string;
  recommendation?: string;
}

export class AccountVerification {
  /**
   * Verify if a specific email account exists and can be used for sign-in
   */
  static async verifyAccount(email: string): Promise<AccountVerificationResult> {
    try {
      if (!auth) {
        return {
          exists: false,
          signInMethods: [],
          canSignIn: false,
          error: 'Firebase Auth not available',
          recommendation: 'Check Firebase initialization'
        };
      }

      console.log(`🔍 Verifying account: ${email}`);

      // Check what sign-in methods are available for this email
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      console.log(`📧 Sign-in methods for ${email}:`, signInMethods);

      const exists = signInMethods.length > 0;
      const canSignIn = signInMethods.includes('password');

      if (!exists) {
        return {
          exists: false,
          signInMethods: [],
          canSignIn: false,
          recommendation: 'Account does not exist. Create a new account or check email spelling.'
        };
      }

      if (!canSignIn) {
        return {
          exists: true,
          signInMethods,
          canSignIn: false,
          recommendation: `Account exists but password sign-in not available. Available methods: ${signInMethods.join(', ')}`
        };
      }

      return {
        exists: true,
        signInMethods,
        canSignIn: true,
        recommendation: 'Account exists and password sign-in is available'
      };

    } catch (error: any) {
      console.error(`❌ Account verification failed for ${email}:`, error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/invalid-email') {
        return {
          exists: false,
          signInMethods: [],
          canSignIn: false,
          error: error.code,
          recommendation: 'Invalid email format'
        };
      }

      if (error.code === 'auth/network-request-failed') {
        return {
          exists: false,
          signInMethods: [],
          canSignIn: false,
          error: error.code,
          recommendation: 'Network error - check internet connection'
        };
      }

      return {
        exists: false,
        signInMethods: [],
        canSignIn: false,
        error: error.code || error.message,
        recommendation: 'Account verification failed - check Firebase configuration'
      };
    }
  }

  /**
   * Test authentication with specific credentials
   */
  static async testAuthentication(email: string, password: string): Promise<{
    success: boolean;
    userInfo?: any;
    error?: string;
    errorCode?: string;
    recommendation?: string;
  }> {
    try {
      if (!auth) {
        return {
          success: false,
          error: 'Firebase Auth not available',
          recommendation: 'Check Firebase initialization'
        };
      }

      console.log(`🔐 Testing authentication for: ${email}`);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log(`✅ Authentication successful for: ${email}`);

      return {
        success: true,
        userInfo: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName,
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        }
      };

    } catch (error: any) {
      console.error(`❌ Authentication failed for ${email}:`, error);

      let recommendation = 'Unknown authentication error';

      switch (error.code) {
        case 'auth/user-not-found':
          recommendation = 'Account does not exist. Check email or create new account.';
          break;
        case 'auth/wrong-password':
          recommendation = 'Incorrect password. Try again or reset password.';
          break;
        case 'auth/invalid-credential':
          recommendation = 'Invalid email/password combination. Verify both email and password are correct.';
          break;
        case 'auth/too-many-requests':
          recommendation = 'Too many failed attempts. Wait before trying again.';
          break;
        case 'auth/user-disabled':
          recommendation = 'Account has been disabled. Contact support.';
          break;
        case 'auth/network-request-failed':
          recommendation = 'Network error. Check internet connection.';
          break;
      }

      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        recommendation
      };
    }
  }

  /**
   * Comprehensive account diagnostic for specific email
   */
  static async runAccountDiagnostic(email: string, password?: string): Promise<{
    accountVerification: AccountVerificationResult;
    authenticationTest?: any;
    summary: string;
    nextSteps: string[];
  }> {
    console.log(`🔍 Running comprehensive diagnostic for: ${email}`);

    // Step 1: Verify account exists
    const accountVerification = await this.verifyAccount(email);

    // Step 2: Test authentication if password provided
    let authenticationTest;
    if (password && accountVerification.canSignIn) {
      authenticationTest = await this.testAuthentication(email, password);
    }

    // Step 3: Generate summary and next steps
    let summary = '';
    const nextSteps: string[] = [];

    if (!accountVerification.exists) {
      summary = `❌ Account ${email} does not exist in Firebase Authentication`;
      nextSteps.push('Create account in Firebase Console or via app registration');
      nextSteps.push('Verify email spelling and domain');
    } else if (!accountVerification.canSignIn) {
      summary = `⚠️ Account ${email} exists but password sign-in not available`;
      nextSteps.push(`Available sign-in methods: ${accountVerification.signInMethods.join(', ')}`);
      nextSteps.push('Enable email/password authentication in Firebase Console');
    } else if (authenticationTest && !authenticationTest.success) {
      summary = `❌ Account ${email} exists but authentication failed: ${authenticationTest.errorCode}`;
      nextSteps.push(authenticationTest.recommendation || 'Check credentials');
    } else if (authenticationTest && authenticationTest.success) {
      summary = `✅ Account ${email} verified and authentication successful`;
      nextSteps.push('Account is working properly');
    } else {
      summary = `✅ Account ${email} exists and password sign-in is available`;
      nextSteps.push('Try signing in with correct password');
    }

    return {
      accountVerification,
      authenticationTest,
      summary,
      nextSteps
    };
  }
}

/**
 * Quick diagnostic for the specific "Amin99@live.no" account
 */
export const diagnoseAminAccount = async (password?: string) => {
  console.log('🔍 Running diagnostic for Amin99@live.no account...');
  return await AccountVerification.runAccountDiagnostic('Amin99@live.no', password);
};
