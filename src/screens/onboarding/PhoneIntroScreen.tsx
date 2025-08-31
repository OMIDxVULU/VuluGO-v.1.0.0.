import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingCenteredCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';

type PhoneIntroScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'PhoneIntro'>;

const PhoneIntroScreen: React.FC = () => {
  const navigation = useNavigation<PhoneIntroScreenNavigationProp>();
  const { markStepCompleted, currentStep } = useOnboarding();

  const handleBack = () => navigation.goBack();
  const handleContinue = () => {
    markStepCompleted(currentStep);
    // Navigate to next screen based on current screen
    if (currentStep < 17) {
      const nextScreens = ['ContactsPermission', 'PhoneIntro', 'PhoneVerification', 'Success', 'HomeHandoff'];
      const nextScreen = nextScreens[currentStep - 13] || 'HomeHandoff';
      navigation.navigate(nextScreen as any);
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader onBackPress={handleBack} />
      <OnboardingCenteredCard
        title={<Text style={styles.title}>PhoneIntro Title</Text>}
        subtitle={<Text style={styles.subtitle}>Placeholder for PhoneIntroScreen</Text>}
      />
      <OnboardingFooter
        primaryButtonText="Continue"
        onPrimaryPress={handleContinue}
        currentStep={currentStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AuthColors.background },
  title: { ...AuthTypography.onboardingTitle, marginBottom: 8 },
  subtitle: { ...AuthTypography.bodyText, textAlign: 'center', paddingHorizontal: 16 },
});

export default PhoneIntroScreen;
