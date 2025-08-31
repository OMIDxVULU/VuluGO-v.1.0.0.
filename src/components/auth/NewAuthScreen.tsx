import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import PasswordResetScreen from './PasswordResetScreen';
import EmailVerificationScreen from './EmailVerificationScreen';
import { AuthColors } from './AuthDesignSystem';

type AuthMode = 'login' | 'signup' | 'password-reset' | 'email-verification';

const NewAuthScreen: React.FC = () => {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [verificationEmail, setVerificationEmail] = useState('');

  const switchToSignup = () => setAuthMode('signup');
  const switchToLogin = () => setAuthMode('login');
  const switchToPasswordReset = () => setAuthMode('password-reset');
  const switchToEmailVerification = (email: string) => {
    setVerificationEmail(email);
    setAuthMode('email-verification');
  };
  const switchBackToAuth = () => setAuthMode('login');
  const handleVerificationComplete = () => {
    // Navigate to main app after successful verification
    router.replace('/(main)');
  };

  return (
    <View style={styles.container}>
      {authMode === 'login' && (
        <LoginScreen
          onSwitchToSignup={switchToSignup}
          onSwitchToPasswordReset={switchToPasswordReset}
        />
      )}
      {authMode === 'signup' && (
        <SignupScreen
          onSwitchToLogin={switchToLogin}
          onSwitchToEmailVerification={switchToEmailVerification}
        />
      )}
      {authMode === 'password-reset' && (
        <PasswordResetScreen onBackToLogin={switchToLogin} />
      )}
      {authMode === 'email-verification' && (
        <EmailVerificationScreen
          email={verificationEmail}
          onBackToAuth={switchBackToAuth}
          onVerificationComplete={handleVerificationComplete}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
});

export default NewAuthScreen;
