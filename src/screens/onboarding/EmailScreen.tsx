import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingFormCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingInput } from '../../components/onboarding/OnboardingInputs';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';
import { validateEmail, checkEmailAvailability } from '../../utils/onboardingValidation';

type EmailScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Email'>;

const EmailScreen: React.FC = () => {
  const navigation = useNavigation<EmailScreenNavigationProp>();
  const { onboardingData, updateOnboardingData, markStepCompleted, currentStep } = useOnboarding();
  
  const [email, setEmail] = useState(onboardingData.email || '');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => navigation.goBack();

  const handleHelp = () => {
    Alert.alert(
      'Email Address',
      'We need your email to:\n• Send you important account updates\n• Help you recover your account if needed\n• Verify your identity\n\nWe will never spam you or share your email.',
      [{ text: 'OK' }]
    );
  };

  const handleContinue = async () => {
    setLoading(true);
    setError('');

    const validation = validateEmail(email);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid email');
      setLoading(false);
      return;
    }

    try {
      const availabilityCheck = await checkEmailAvailability(email);
      if (!availabilityCheck.isValid) {
        setError(availabilityCheck.error || 'Email not available');
        setLoading(false);
        return;
      }
    } catch (err) {
      setError('Unable to verify email availability');
      setLoading(false);
      return;
    }

    updateOnboardingData({ email });
    markStepCompleted(4);
    
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Password');
    }, 500);
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader onBackPress={handleBack} onHelpPress={handleHelp} />
      <OnboardingFormCard
        title={<Text style={styles.title}>Enter your email address</Text>}
        subtitle={<Text style={styles.subtitle}>We'll use this to keep your account secure</Text>}
      >
        <View style={styles.formContent}>
          <OnboardingInput
            label="Email Address"
            value={email}
            onChangeText={(text) => { setEmail(text); setError(''); }}
            placeholder="your.email@example.com"
            error={error}
            helperText="We'll never share your email with anyone"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </OnboardingFormCard>
      <OnboardingFooter
        primaryButtonText={loading ? 'Verifying...' : 'Continue'}
        onPrimaryPress={handleContinue}
        primaryButtonDisabled={loading || !email.trim()}
        primaryButtonLoading={loading}
        currentStep={currentStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AuthColors.background },
  title: { ...AuthTypography.onboardingTitle, marginBottom: 8 },
  subtitle: { ...AuthTypography.bodyText, textAlign: 'center', paddingHorizontal: 16 },
  formContent: { paddingTop: 16 },
});

export default EmailScreen;
