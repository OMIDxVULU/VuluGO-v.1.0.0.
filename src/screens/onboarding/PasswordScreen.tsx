import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingFormCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingPasswordInput } from '../../components/onboarding/OnboardingInputs';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';
import { validatePassword } from '../../utils/onboardingValidation';

type PasswordScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Password'>;

const PasswordScreen: React.FC = () => {
  const navigation = useNavigation<PasswordScreenNavigationProp>();
  const { onboardingData, updateOnboardingData, markStepCompleted, currentStep } = useOnboarding();
  
  const [password, setPassword] = useState(onboardingData.password || '');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => navigation.goBack();

  const handleHelp = () => {
    Alert.alert(
      'Password Requirements',
      '• At least 8 characters long\n• Must contain at least one letter\n• Must contain at least one number\n• Use a unique password you don\'t use elsewhere',
      [{ text: 'OK' }]
    );
  };

  const handleContinue = () => {
    setLoading(true);
    setError('');

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid password');
      setLoading(false);
      return;
    }

    updateOnboardingData({ password });
    markStepCompleted(5);
    
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Terms');
    }, 500);
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader onBackPress={handleBack} onHelpPress={handleHelp} />
      <OnboardingFormCard
        title={<Text style={styles.title}>Create a secure password</Text>}
        subtitle={<Text style={styles.subtitle}>Choose a strong password to protect your account</Text>}
      >
        <View style={styles.formContent}>
          <OnboardingPasswordInput
            label="Password"
            value={password}
            onChangeText={(text) => { setPassword(text); setError(''); }}
            placeholder="Enter your password"
            error={error}
            helperText="Use at least 8 characters with letters and numbers"
            showStrengthIndicator={true}
          />
        </View>
      </OnboardingFormCard>
      <OnboardingFooter
        primaryButtonText={loading ? 'Creating...' : 'Continue'}
        onPrimaryPress={handleContinue}
        primaryButtonDisabled={loading || password.length < 8}
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

export default PasswordScreen;
