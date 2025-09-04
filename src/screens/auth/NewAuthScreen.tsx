import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import AuthSelectionScreen from './AuthSelectionScreen';
import RegistrationNavigator from '../../navigation/RegistrationNavigator';
import { RegistrationProvider } from '../../context/RegistrationContext';
import LoginScreen from '../../components/auth/LoginScreen';
import { AuthColors } from '../../components/auth/AuthDesignSystem';

type AuthFlow = 'auth-selection' | 'register' | 'login';

const NewAuthScreen: React.FC = () => {
  const router = useRouter();
  const { signInAsGuest } = useAuth();
  const [currentFlow, setCurrentFlow] = useState<AuthFlow>('auth-selection');

  const handleRegisterPress = () => {
    setCurrentFlow('register');
  };

  const handleLoginPress = () => {
    setCurrentFlow('login');
  };

  const handleBackToAuthSelection = () => {
    setCurrentFlow('auth-selection');
  };

  const handleGuestContinue = async () => {
    try {
      await signInAsGuest();
      router.replace('/(main)');
    } catch (error) {
      console.error('Guest login failed:', error);
    }
  };

  const renderCurrentFlow = () => {
    switch (currentFlow) {
      case 'auth-selection':
        return (
          <AuthSelectionScreen
            onSignUpPress={handleRegisterPress}
            onLoginPress={handleLoginPress}
            onGuestContinue={handleGuestContinue}
            showBackButton={false}
            onBackPress={undefined}
          />
        );

      case 'register':
        return (
          <RegistrationProvider>
            <RegistrationNavigator onBackToLanding={handleBackToAuthSelection} />
          </RegistrationProvider>
        );

      case 'login':
        return (
          <LoginScreen
            onSwitchToSignup={handleBackToAuthSelection}
          />
        );

      default:
        return (
          <AuthSelectionScreen
            onSignUpPress={handleRegisterPress}
            onLoginPress={handleLoginPress}
            onGuestContinue={handleGuestContinue}
            showBackButton={false}
            onBackPress={undefined}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentFlow()}
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
