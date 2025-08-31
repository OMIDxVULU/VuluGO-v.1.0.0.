import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingCenteredCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';

type HomeHandoffScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'HomeHandoff'>;

const HomeHandoffScreen: React.FC = () => {
  const navigation = useNavigation<HomeHandoffScreenNavigationProp>();
  const router = useRouter();
  const { onboardingData, completeOnboarding, markStepCompleted, currentStep } = useOnboarding();
  const { completeOnboarding: authCompleteOnboarding } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleStartExploring = async () => {
    setLoading(true);

    try {
      // Mark final step as completed
      markStepCompleted(17);

      // Complete onboarding in context
      await completeOnboarding();

      // Complete onboarding in auth context with collected data
      await authCompleteOnboarding(onboardingData);

      // Navigate to main app
      router.replace('/(main)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingCenteredCard
        title={<Text style={styles.title}>You're all set!</Text>}
        subtitle={<Text style={styles.subtitle}>Welcome to VuluGO! Let's start your journey.</Text>}
      />
      <OnboardingFooter
        primaryButtonText={loading ? 'Setting up...' : 'Start Exploring'}
        onPrimaryPress={handleStartExploring}
        primaryButtonDisabled={loading}
        primaryButtonLoading={loading}
        currentStep={currentStep}
        showStepDots={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AuthColors.background },
  title: { ...AuthTypography.onboardingTitle, marginBottom: 8 },
  subtitle: { ...AuthTypography.bodyText, textAlign: 'center', paddingHorizontal: 16 },
});

export default HomeHandoffScreen;
