import React from 'react';
import { View, StyleSheet } from 'react-native';
import RegistrationNavigator from '../../src/navigation/RegistrationNavigator';
import { RegistrationProvider } from '../../src/context/RegistrationContext';
import { AuthColors } from '../../src/components/auth/AuthDesignSystem';
import { useRouter } from 'expo-router';

export default function UpgradeScreen() {
  const router = useRouter();

  const handleBackToMain = () => {
    // When guest user cancels upgrade, go back to main app
    router.replace('/(main)');
  };

  return (
    <View style={styles.container}>
      <RegistrationProvider isGuestUpgrade={true}>
        <RegistrationNavigator onBackToLanding={handleBackToMain} />
      </RegistrationProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
});
