import React, { useState, useRef, useEffect } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import authService from '../../services/authService';
import FirebaseErrorHandler from '../../utils/firebaseErrorHandler';
import { validateEmail, passwordResetRateLimiter } from '../../utils/inputSanitization';
import {
  AuthContainer,
  AuthTitle,
  AuthInput,
  AuthButton,
  AuthColors,
} from './AuthDesignSystem';

interface PasswordResetScreenProps {
  onBackToLogin: () => void;
}

const PasswordResetScreen: React.FC<PasswordResetScreenProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const validateForm = () => {
    const newErrors: { email?: string } = {};

    // Validate email with enhanced security
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendResetEmail = async () => {
    if (!validateForm()) return;

    // Check rate limiting
    const emailValidation = validateEmail(email);
    const userIdentifier = emailValidation.sanitizedValue || email.trim().toLowerCase();

    if (!passwordResetRateLimiter.isAllowed(userIdentifier)) {
      const remainingTime = Math.ceil(passwordResetRateLimiter.getRemainingTime(userIdentifier) / 1000 / 60);
      Alert.alert(
        'Too Many Reset Attempts',
        `Please wait ${remainingTime} minutes before trying again`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      await authService.sendPasswordResetEmail(email.trim());
      setEmailSent(true);
      
      Alert.alert(
        'Reset Email Sent',
        `We've sent a password reset link to ${email.trim()}. Please check your email and follow the instructions to reset your password.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Clear any existing timeout
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }

              // Navigate back to login after a delay (cancellable)
              timeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  onBackToLogin();
                }
              }, 2000);
            }
          }
        ]
      );
    } catch (error: any) {
      // Use enhanced Firebase error handling
      const errorInfo = FirebaseErrorHandler.formatAuthErrorForUI(error);
      Alert.alert(errorInfo.title, errorInfo.message);
      
      // Log the error for debugging
      FirebaseErrorHandler.logError('password_reset', error, {
        email: email.trim()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    await handleSendResetEmail();
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <AuthContainer>
              <View style={styles.successContainer}>
                <View style={styles.iconContainer}>
                  <MaterialIcons 
                    name="mark-email-read" 
                    size={64} 
                    color={AuthColors.primaryButton} 
                  />
                </View>
                
                <AuthTitle
                  title="Check your email"
                />

                <Text style={styles.instructionText}>
                  Click the link in your email to reset your password.
                </Text>

                <AuthButton
                  title="Resend Email"
                  variant="secondary"
                  onPress={handleResendEmail}
                  loading={loading}
                  disabled={loading}
                  containerStyle={styles.resendButton}
                />

                <AuthButton
                  title="Back"
                  variant="link"
                  onPress={onBackToLogin}
                  containerStyle={styles.backButton}
                />
              </View>
            </AuthContainer>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <AuthContainer>
            <View style={styles.headerContainer}>
              <AuthButton
                title="← Back"
                variant="link"
                onPress={onBackToLogin}
                containerStyle={styles.backButtonHeader}
              />
            </View>

            <AuthTitle
              title="Reset password"
            />

            <View style={styles.form}>
              <AuthInput
                label="EMAIL ADDRESS"
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                required
                error={errors.email}
              />

              <AuthButton
                title="Send Link"
                onPress={handleSendResetEmail}
                loading={loading}
                disabled={loading || !email.trim()}
                containerStyle={styles.sendButton}
              />

              <Text style={styles.helpText}>
                Remember your password?{' '}
                <Text style={styles.linkText} onPress={onBackToLogin}>
                  Sign in instead
                </Text>
              </Text>
            </View>
          </AuthContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  headerContainer: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonHeader: {
    alignSelf: 'flex-start',
    paddingLeft: 0,
  },
  form: {
    width: '100%',
  },
  sendButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  helpText: {
    textAlign: 'center',
    color: AuthColors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    color: AuthColors.linkColor,
    textDecorationLine: 'underline',
  },
  successContainer: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: 24,
  },
  instructionText: {
    textAlign: 'center',
    color: AuthColors.secondaryText,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  resendButton: {
    marginBottom: 16,
  },
  backButton: {
    marginTop: 8,
  },
});

export default PasswordResetScreen;
