import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingFormCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingDateInput } from '../../components/onboarding/OnboardingInputs';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';
import { validateAge } from '../../utils/onboardingValidation';

type AgeGateScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'AgeGate'>;

const AgeGateScreen: React.FC = () => {
  const navigation = useNavigation<AgeGateScreenNavigationProp>();
  const { 
    onboardingData, 
    updateOnboardingData, 
    markStepCompleted, 
    currentStep 
  } = useOnboarding();
  
  const [dateOfBirth, setDateOfBirth] = useState<Date>(
    onboardingData.dateOfBirth || new Date(2000, 0, 1)
  );
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleHelp = () => {
    Alert.alert(
      'Why do we need your age?',
      'We need to verify your age to comply with privacy laws and ensure age-appropriate content. Your date of birth is kept private and secure.',
      [{ text: 'OK' }]
    );
  };

  const handleDateChange = (date: Date) => {
    setDateOfBirth(date);
    setError(''); // Clear error when user changes date
  };

  const handleContinue = () => {
    setLoading(true);
    setError('');

    // Validate age
    const validation = validateAge(dateOfBirth);
    
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid date of birth');
      setLoading(false);
      return;
    }

    // Check if user is too young
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate()) 
      ? age - 1 
      : age;

    if (actualAge < 13) {
      Alert.alert(
        'Age Requirement',
        'You must be at least 13 years old to use VuluGO. This is required by law to protect your privacy.',
        [
          {
            text: 'Go Back',
            onPress: () => {
              setLoading(false);
              navigation.goBack();
            }
          }
        ]
      );
      return;
    }

    // Save date of birth and continue
    updateOnboardingData({ dateOfBirth });
    markStepCompleted(2);
    
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Username');
    }, 500);
  };

  // Discord-style title with proper hierarchy
  const Title = () => (
    <Text style={styles.title}>When's your birthday?</Text>
  );

  // Discord-style supporting text
  const Subtitle = () => (
    <Text style={styles.subtitle}>
      We need to verify your age to ensure you can safely use our platform
    </Text>
  );

  return (
    <View style={styles.container}>
      <OnboardingHeader
        onBackPress={handleBack}
        onHelpPress={handleHelp}
        showBackButton={true}
        showHelpButton={true}
      />

      <OnboardingFormCard
        title={<Title />}
        subtitle={<Subtitle />}
      >
        <View style={styles.formContent}>
          <OnboardingDateInput
            label="Date of Birth"
            date={dateOfBirth}
            onDateChange={handleDateChange}
            error={error}
            helperText="Your date of birth is kept private and secure"
          />

          <View style={styles.privacyNote}>
            <Text style={styles.privacyText}>
              🔒 Your personal information is encrypted and protected according to our privacy policy
            </Text>
          </View>
        </View>
      </OnboardingFormCard>

      <OnboardingFooter
        primaryButtonText={loading ? 'Verifying...' : 'Continue'}
        onPrimaryPress={handleContinue}
        primaryButtonDisabled={loading}
        primaryButtonLoading={loading}
        currentStep={currentStep}
        showStepDots={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1117', // Exact dark mode background
  },
  title: {
    fontSize: 26, // Discord headline size (24-28px)
    fontWeight: '700', // Bold white
    color: AuthColors.primaryText, // #ffffff
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16, // Discord supporting text (15-16px)
    fontWeight: '400',
    color: AuthColors.secondaryText, // #D1D5DB - light gray
    textAlign: 'center',
    paddingHorizontal: 24, // More breathing room
    lineHeight: 22,
  },
  formContent: {
    paddingTop: 24, // Discord spacing between sections
  },
  privacyNote: {
    marginTop: 24,
    padding: 16,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },
  privacyText: {
    ...AuthTypography.microcopy,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default AgeGateScreen;
