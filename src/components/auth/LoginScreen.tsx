import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import FirebaseErrorHandler from '../../utils/firebaseErrorHandler';
import { useAuthLoading, AuthLoadingMessages } from '../../hooks/useAuthLoading';
import LoadingOverlay from './LoadingOverlay';
import { validateEmail, loginRateLimiter } from '../../utils/inputSanitization';
import SocialAuthButtons from './SocialAuthButtons';
import BiometricAuthButton from './BiometricAuthButton';
import { AuthDiagnostics } from '../../utils/authDiagnostics';
import { AccountVerification, diagnoseAminAccount } from '../../utils/accountVerification';
import {
  AuthContainer,
  AuthTitle,
  AuthInput,
  AuthButton,
  AuthLink,
  AuthColors,
  AuthTypography,
  AuthSpacing,
  AuthLayout,
} from './AuthDesignSystem';

interface LoginScreenProps {
  onSwitchToSignup: () => void;
  onSwitchToPasswordReset?: () => void; // Made optional since it's not always provided
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSwitchToSignup, onSwitchToPasswordReset }) => {
  const router = useRouter();
  const { signIn } = useAuth();
  const { loadingState, setLoading, setSuccess, setError, clearLoading } = useAuthLoading();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // CRITICAL FIX: Add debugging for input changes
  const handleEmailChange = (text: string) => {
    console.log('📧 Email input changed:', text);
    setEmail(text);
  };

  const handlePasswordChange = (text: string) => {
    console.log('🔒 Password input changed:', text.length, 'characters');
    setPassword(text);
  };
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [fieldStates, setFieldStates] = useState<{ email?: boolean; password?: boolean }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    // Validate email with enhanced security
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    // Check rate limiting
    const emailValidation = validateEmail(email);
    const userIdentifier = emailValidation.sanitizedValue || email.trim().toLowerCase();

    if (!loginRateLimiter.isAllowed(userIdentifier)) {
      const remainingTime = Math.ceil(loginRateLimiter.getRemainingTime(userIdentifier) / 1000 / 60);
      setError(
        'Too Many Login Attempts',
        `Please wait ${remainingTime} minutes before trying again`
      );
      return;
    }

    // DIAGNOSTIC: Enhanced logging for authentication debugging
    console.log('🔐 Login attempt started:', {
      email: email.trim(),
      emailLength: email.trim().length,
      passwordLength: password.length,
      emailDomain: email.trim().split('@')[1],
      timestamp: new Date().toISOString()
    });

    setLoading(AuthLoadingMessages.SIGNING_IN.message, AuthLoadingMessages.SIGNING_IN.submessage);

    try {
      await signIn(email.trim(), password);
      console.log('✅ Login successful');

      // Show success state briefly
      setSuccess(AuthLoadingMessages.SUCCESS_SIGNED_IN.message, AuthLoadingMessages.SUCCESS_SIGNED_IN.submessage);

      // Navigate after success animation
      setTimeout(() => {
        router.replace('/(main)');
      }, 1500);

    } catch (error: any) {
      // DIAGNOSTIC: Enhanced error logging for debugging
      console.error('❌ Login failed:', {
        errorCode: error.code,
        errorMessage: error.message,
        email: email.trim(),
        emailDomain: email.trim().split('@')[1],
        passwordProvided: !!password,
        passwordLength: password.length,
        timestamp: new Date().toISOString()
      });

      // Use enhanced Firebase error handling
      const errorInfo = FirebaseErrorHandler.formatAuthErrorForUI(error);

      // Set appropriate error message based on error type
      if (error.code === 'auth/user-not-found') {
        setError(AuthLoadingMessages.ERROR_USER_NOT_FOUND.message, AuthLoadingMessages.ERROR_USER_NOT_FOUND.submessage);

        // Show option to switch to signup after error clears
        setTimeout(() => {
          Alert.alert(
            'Account Not Found',
            'Would you like to create a new account instead?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Create Account',
                onPress: () => onSwitchToSignup()
              }
            ]
          );
        }, 3500);
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        // ENHANCED: More specific error handling for invalid credentials
        console.warn('🔐 Invalid credential error - possible causes:', {
          possibleCauses: [
            'Incorrect password',
            'Account does not exist',
            'Email/password authentication disabled',
            'Account disabled by admin',
            'Malformed email/password'
          ],
          troubleshooting: 'Check Firebase Console for user existence and auth methods'
        });

        setError(
          'Invalid Login Credentials',
          'Please check your email and password. If you forgot your password, use the "Forgot password?" link below.'
        );
      } else if (error.code === 'auth/too-many-requests') {
        setError(AuthLoadingMessages.ERROR_TOO_MANY_REQUESTS.message, AuthLoadingMessages.ERROR_TOO_MANY_REQUESTS.submessage);
      } else if (error.code === 'auth/network-request-failed') {
        setError(AuthLoadingMessages.ERROR_NETWORK.message, AuthLoadingMessages.ERROR_NETWORK.submessage);
      } else {
        setError(AuthLoadingMessages.ERROR_GENERIC.message, errorInfo.message);
      }

      // Log the error for debugging (without PII)
      FirebaseErrorHandler.logError('login', error, {
        emailProvided: !!email,
        emailDomain: email ? email.trim().split('@')[1] : undefined,
        hasPassword: !!password
      });
    }
  };

  const handleForgotPassword = () => {
    onSwitchToPasswordReset();
  };

  // DIAGNOSTIC: Function to test authentication setup
  const runDiagnostics = async () => {
    console.log('🔍 Running comprehensive authentication & storage diagnostics...');
    try {
      const results = await AuthDiagnostics.runDiagnostics(email.trim(), password);

      Alert.alert(
        'Authentication & Storage Diagnostics',
        `Firebase Init: ${results.firebaseInit.success ? '✅' : '❌'}\n` +
        `Auth Service: ${results.authService.success ? '✅' : '❌'}\n` +
        `Storage Status: ${results.storageStatus.success ? '✅' : '❌'}\n` +
        `${results.credentials ? `Credentials: ${results.credentials.success ? '✅' : '❌'}\n` : ''}` +
        `Overall: ${results.overall.success ? '✅' : '❌'}\n\n` +
        `${results.overall.issue || 'System appears healthy'}\n\n` +
        `${results.overall.recommendation || ''}\n\n` +
        `${!results.storageStatus.success ? '⚠️ Storage issues may affect auth persistence' : ''}`,
        [
          { text: 'OK' },
          ...(results.overall.recommendation?.includes('simulator reset') ? [{
            text: 'Reset Simulator',
            onPress: () => {
              Alert.alert(
                'Simulator Reset Instructions',
                '1. Close iOS Simulator\n2. Run: xcrun simctl shutdown all && xcrun simctl erase all\n3. Restart: npx expo start --clear',
                [{ text: 'Got it' }]
              );
            }
          }] : [])
        ]
      );
    } catch (error: any) {
      Alert.alert('Diagnostic Error', error.message);
    }
  };

  // DIAGNOSTIC: Specific test for Amin99@live.no account
  const testAminAccount = async () => {
    console.log('🔍 Testing Amin99@live.no account specifically...');
    try {
      const result = await diagnoseAminAccount(email.toLowerCase().includes('amin99@live.no') ? password : undefined);

      Alert.alert(
        'Amin99@live.no Account Diagnostic',
        `${result.summary}\n\n` +
        `Next Steps:\n${result.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n` +
        `Account Exists: ${result.accountVerification.exists ? '✅' : '❌'}\n` +
        `Can Sign In: ${result.accountVerification.canSignIn ? '✅' : '❌'}\n` +
        `Sign-in Methods: ${result.accountVerification.signInMethods.join(', ') || 'None'}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Account Diagnostic Error', error.message);
    }
  };

  return (
    <View style={styles.discordContainer}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            // CRITICAL FIX: Ensure scroll view doesn't interfere with input touches
            nestedScrollEnabled={false}
            scrollEnabled={true}
            // CRITICAL FIX: Ensure touch events reach inputs properly
            keyboardDismissMode="none"
            automaticallyAdjustKeyboardInsets={false}
            // CRITICAL FIX: Prevent ScrollView from stealing focus
            removeClippedSubviews={false}
            bounces={false}
          >
            <View style={styles.discordCard}>
              <View style={styles.discordTitle}>
                <Text style={styles.discordTitleText}>Welcome back!</Text>
              </View>

              <View style={styles.discordForm}>
                  <View style={styles.discordInputGroup}>
                    <AuthInput
                      label="EMAIL"
                      value={email}
                      onChangeText={handleEmailChange}
                      placeholder="Enter your email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      required
                      error={errors.email}
                      success={fieldStates.email}
                      disabled={loadingState.isLoading}
                      containerStyle={styles.discordInput}
                    />
                  </View>

                  <View style={styles.discordInputGroup}>
                    <AuthInput
                      label="PASSWORD"
                      value={password}
                      onChangeText={handlePasswordChange}
                      placeholder="Enter your password"
                      showPasswordToggle
                      isPasswordVisible={showPassword}
                      onTogglePassword={() => setShowPassword(!showPassword)}
                      required
                      error={errors.password}
                      success={fieldStates.password}
                      disabled={loadingState.isLoading}
                      containerStyle={styles.discordInput}
                    />
                  </View>

                  <AuthButton
                    title="Forgot password?"
                    variant="link"
                    onPress={handleForgotPassword}
                    containerStyle={styles.discordForgotPassword}
                    disabled={loadingState.isLoading}
                  />

                  <AuthButton
                    title="Log In"
                    onPress={handleLogin}
                    loading={loadingState.isLoading && loadingState.type === 'loading'}
                    disabled={loadingState.isLoading}
                    containerStyle={[
                      styles.discordLoginButton,
                      loadingState.isLoading && styles.discordLoginButtonDisabled
                    ]}
                    textStyle={styles.discordButtonText}
                  />

                  <BiometricAuthButton
                    disabled={loadingState.isLoading}
                    onSuccess={() => {
                      setTimeout(() => {
                        router.replace('/(main)');
                      }, 1500);
                    }}
                    style={styles.discordBiometricButton}
                  />

                  {/* DIAGNOSTIC: Development-only diagnostic buttons */}
                  {__DEV__ && (
                    <View style={styles.diagnosticContainer}>
                      <AuthButton
                        title="🔍 Run Full Diagnostics"
                        variant="link"
                        onPress={runDiagnostics}
                        containerStyle={styles.discordDiagnosticButton}
                        disabled={loadingState.isLoading}
                      />
                      <AuthButton
                        title="👤 Test Amin Account"
                        variant="link"
                        onPress={testAminAccount}
                        containerStyle={styles.discordDiagnosticButton}
                        disabled={loadingState.isLoading}
                      />
                    </View>
                  )}

                  <View style={styles.discordSocialContainer}>
                    <SocialAuthButtons
                      disabled={loadingState.isLoading}
                      onSuccess={() => {
                        setTimeout(() => {
                          router.replace('/(main)');
                        }, 1500);
                      }}
                    />
                  </View>

                  <AuthLink
                    text="Need an account?"
                    linkText="Register"
                    onLinkPress={onSwitchToSignup}
                    containerStyle={styles.discordRegisterLink}
                  />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <LoadingOverlay
          visible={loadingState.isLoading}
          message={loadingState.message}
          submessage={loadingState.submessage}
          type={loadingState.type}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Discord-style dark background
  discordContainer: {
    flex: 1,
    backgroundColor: AuthColors.background, // #0f1117 - true dark
  },

  // Safe area with transparent background
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Keyboard avoiding view
  keyboardView: {
    flex: 1,
  },

  // Scroll view for better mobile experience
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: AuthSpacing.lg,
  },

  // Discord-style card container
  discordCard: {
    backgroundColor: AuthColors.cardBackground, // #151924 - slightly lighter dark
    borderRadius: 16, // Discord-style rounded corners
    padding: 32, // More generous padding
    marginHorizontal: 24, // Side margins
    marginVertical: 16,
    width: undefined, // Remove fixed width
    alignItems: 'stretch', // Full width content
    borderWidth: 1,
    borderColor: AuthColors.divider, // #252A3A - subtle border
  },

  // Discord-style title section with proper spacing
  discordTitle: {
    marginBottom: 24, // 24px gap from title to first field
    alignItems: 'center',
  },

  discordTitleText: {
    fontSize: 24, // Discord-style title size
    fontWeight: '700',
    color: AuthColors.primaryText, // Pure white
    marginBottom: 8,
    textAlign: 'center',
  },

  discordSubtitleText: {
    fontSize: 16, // 15-16px body text
    fontWeight: '400',
    color: AuthColors.secondaryText, // Light gray #D1D5DB
    textAlign: 'center',
  },

  // Discord-style form layout with proper spacing
  discordForm: {
    width: '100%',
    marginBottom: 16, // Reduced bottom margin
  },

  discordInputGroup: {
    marginBottom: 16, // 16px vertical gap between inputs
    width: '100%',
  },

  discordInput: {
    width: '100%',
  },

  // Discord-style forgot password link (muted gray, accent on hover)
  discordForgotPassword: {
    alignSelf: 'flex-start',
    marginBottom: 24, // 24px gap before CTA
    marginTop: -8, // Slight negative margin to tighten spacing
  },

  // Discord-style login button (full-width, 48px tall, rounded 14px)
  discordLoginButton: {
    marginTop: 0,
    marginBottom: 16, // 16px below CTA for footer/secondary link
    paddingVertical: 16, // 48px total height with padding
    alignSelf: 'center',
    width: '100%',
    borderRadius: 14, // Discord-style rounded corners
    backgroundColor: AuthColors.primaryButton, // #5865F2
    minHeight: 48, // Ensure 48px height
  },

  discordLoginButtonDisabled: {
    opacity: 0.6,
  },

  discordButtonText: {
    fontSize: 16, // Bold 16px text
    fontWeight: '600',
    color: '#FFFFFF', // White text
    textAlign: 'center',
  },

  // Discord-style biometric button
  discordBiometricButton: {
    marginVertical: 12,
    alignSelf: 'center',
    width: '100%',
  },

  // Discord-style social auth container
  discordSocialContainer: {
    marginVertical: 16,
    alignItems: 'center',
    width: '100%',
  },

  // Discord-style guest button (ghost button, muted text)
  discordGuestButton: {
    marginVertical: 8,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },

  discordGuestButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: AuthColors.mutedText, // Muted gray
    textAlign: 'center',
  },

  // DIAGNOSTIC: Development-only diagnostic styles
  diagnosticContainer: {
    alignItems: 'center',
    marginTop: 16,
    opacity: 0.7,
  },

  discordDiagnosticButton: {
    alignSelf: 'center',
    marginTop: 8,
  },

  // Discord-style register link (16px below CTA)
  discordRegisterLink: {
    marginTop: 16, // 16px below CTA
    marginBottom: 16,
    alignSelf: 'center',
  },
});

export default LoginScreen;
