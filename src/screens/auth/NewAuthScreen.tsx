import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import WelcomeLandingScreen from './WelcomeLandingScreen';
import RegistrationNavigator from '../../navigation/RegistrationNavigator';
import { RegistrationProvider } from '../../context/RegistrationContext';
import LoginScreen from '../../components/auth/LoginScreen';
import { AuthColors } from '../../components/auth/AuthDesignSystem';

type AuthFlow = 'landing' | 'register' | 'login';

const NewAuthScreen: React.FC = () => {
  const [currentFlow, setCurrentFlow] = useState<AuthFlow>('landing');

  const handleRegisterPress = () => {
    setCurrentFlow('register');
  };

  const handleLoginPress = () => {
    setCurrentFlow('login');
  };

  const handleBackToLanding = () => {
    setCurrentFlow('landing');
  };

  const renderCurrentFlow = () => {
    switch (currentFlow) {
      case 'landing':
        return (
          <WelcomeLandingScreen
            onRegisterPress={handleRegisterPress}
            onLoginPress={handleLoginPress}
          />
        );
      
      case 'register':
        return (
          <RegistrationProvider>
            <RegistrationNavigator onBackToLanding={handleBackToLanding} />
          </RegistrationProvider>
        );
      
      case 'login':
        return (
          <LoginScreen
            onSwitchToSignup={handleBackToLanding}
          />
        );
      
      default:
        return (
          <WelcomeLandingScreen
            onRegisterPress={handleRegisterPress}
            onLoginPress={handleLoginPress}
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
