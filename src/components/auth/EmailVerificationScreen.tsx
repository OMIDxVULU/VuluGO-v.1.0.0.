import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import FirebaseErrorHandler from '../../utils/firebaseErrorHandler';
import {
  AuthContainer,
  AuthTitle,
  AuthButton,
  AuthColors,
} from './AuthDesignSystem';

interface EmailVerificationScreenProps {
  email: string;
  onBackToAuth: () => void;
  onVerificationComplete: () => void;
}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ 
  email, 
  onBackToAuth, 
  onVerificationComplete 
}) => {
  const router = useRouter();
  const { user, sendEmailVerification, isEmailVerified } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check verification status periodically
  useEffect(() => {
    const checkVerification = async () => {
      if (user && !checkingVerification) {
        setCheckingVerification(true);
        try {
          // Reload user to get latest verification status (only if user has reload method)
          if (typeof user.reload === 'function') {
            await user.reload();
          }
          if (isEmailVerified()) {
            onVerificationComplete();
          }
        } catch (error) {
          console.log('Error checking verification status:', error);
        } finally {
          setCheckingVerification(false);
        }
      }
    };

    // Check immediately and then every 3 seconds
    checkVerification();
    const interval = setInterval(checkVerification, 3000);

    return () => clearInterval(interval);
  }, [user, isEmailVerified, onVerificationComplete, checkingVerification]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      await sendEmailVerification();
      setResendCooldown(60); // 60 second cooldown
      
      Alert.alert(
        'Verification Email Sent',
        `We've sent another verification email to ${email}. Please check your inbox and spam folder.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      const errorInfo = FirebaseErrorHandler.formatAuthErrorForUI(error);
      Alert.alert(errorInfo.title, errorInfo.message);
      
      FirebaseErrorHandler.logError('email_verification_resend', error, {
        email,
        userId: user?.uid
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    try {
      if (user && typeof user.reload === 'function') {
        await user.reload();
        if (isEmailVerified()) {
          Alert.alert(
            'Email Verified!',
            'Your email has been successfully verified. Welcome to VuluGO!',
            [{ text: 'Continue', onPress: onVerificationComplete }]
          );
        } else {
          Alert.alert(
            'Not Verified Yet',
            'Your email is not verified yet. Please check your email and click the verification link.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      const errorInfo = FirebaseErrorHandler.formatAuthErrorForUI(error);
      Alert.alert(errorInfo.title, errorInfo.message);
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleSkipForNow = () => {
    Alert.alert(
      'Skip Email Verification?',
      'You can verify your email later in account settings. Some features may be limited until your email is verified.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip for Now', 
          style: 'destructive',
          onPress: onVerificationComplete 
        }
      ]
    );
  };

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
            <View style={styles.contentContainer}>
              <View style={styles.iconContainer}>
                <MaterialIcons 
                  name="mark-email-unread" 
                  size={64} 
                  color={AuthColors.primaryButton} 
                />
              </View>
              
              <AuthTitle
                title="Verify your email"
              />

              <Text style={styles.instructionText}>
                Click the link in your email to verify your account.
              </Text>

              <View style={styles.buttonContainer}>
                <AuthButton
                  title={checkingVerification ? "Checking..." : "I'm Verified"}
                  onPress={handleCheckVerification}
                  loading={checkingVerification}
                  disabled={checkingVerification}
                  containerStyle={styles.primaryButton}
                />

                <AuthButton
                  title={
                    resendCooldown > 0
                      ? `Resend (${resendCooldown}s)`
                      : "Resend Email"
                  }
                  variant="secondary"
                  onPress={handleResendVerification}
                  loading={loading}
                  disabled={loading || resendCooldown > 0}
                  containerStyle={styles.secondaryButton}
                />

                <AuthButton
                  title="Skip for Now"
                  variant="link"
                  onPress={handleSkipForNow}
                  containerStyle={styles.skipButton}
                />
              </View>

              <View style={styles.helpContainer}>
                <Text style={styles.helpText}>
                  Didn't receive the email? Check your spam folder or{' '}
                  <Text style={styles.linkText} onPress={onBackToAuth}>
                    try a different email address
                  </Text>
                </Text>
              </View>
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
  contentContainer: {
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
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  primaryButton: {
    marginBottom: 16,
  },
  secondaryButton: {
    marginBottom: 16,
  },
  skipButton: {
    marginTop: 8,
  },
  helpContainer: {
    paddingHorizontal: 16,
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
});

export default EmailVerificationScreen;
