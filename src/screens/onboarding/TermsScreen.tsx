import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';

type TermsScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Terms'>;

const TermsScreen: React.FC = () => {
  const navigation = useNavigation<TermsScreenNavigationProp>();
  const { updateOnboardingData, markStepCompleted, currentStep } = useOnboarding();
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBack = () => navigation.goBack();

  const handleContinue = () => {
    if (!termsAccepted) return;
    
    setLoading(true);
    updateOnboardingData({ termsAccepted: true, privacyAccepted: true });
    markStepCompleted(6);
    
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('PermissionsIntro');
    }, 500);
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader onBackPress={handleBack} />
      
      <OnboardingCard scrollable={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Terms & Privacy</Text>
          <Text style={styles.subtitle}>
            Please review and accept our terms to continue
          </Text>

          <ScrollView style={styles.termsContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.termsTitle}>Terms of Service</Text>
            <Text style={styles.termsText}>
              By using VuluGO, you agree to our terms of service. You must be at least 13 years old to use this service. 
              You are responsible for maintaining the security of your account and for all activities that occur under your account.
              {'\n\n'}
              We reserve the right to suspend or terminate accounts that violate our community guidelines or engage in harmful behavior.
              {'\n\n'}
              You retain ownership of the content you post, but grant us a license to use, display, and distribute your content on our platform.
            </Text>

            <Text style={styles.termsTitle}>Privacy Policy</Text>
            <Text style={styles.termsText}>
              We respect your privacy and are committed to protecting your personal information. We collect only the information necessary to provide our services.
              {'\n\n'}
              Your personal data is encrypted and stored securely. We will never sell your personal information to third parties.
              {'\n\n'}
              You can request to delete your account and all associated data at any time through your account settings.
            </Text>

            <Text style={styles.termsTitle}>Community Guidelines</Text>
            <Text style={styles.termsText}>
              VuluGO is a safe space for everyone. We do not tolerate harassment, hate speech, or harmful content.
              {'\n\n'}
              Be respectful to other users and follow our community guidelines to maintain a positive environment for all.
              {'\n\n'}
              Report any inappropriate behavior through our in-app reporting system.
            </Text>

            <Text style={styles.termsTitle}>Data Usage</Text>
            <Text style={styles.termsText}>
              We collect minimal data necessary to provide our services. Your music preferences, gaming activity, and social interactions help us personalize your experience.
              {'\n\n'}
              You can control your data sharing preferences in your account settings at any time.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </OnboardingCard>

      <OnboardingFooter
        primaryButtonText={loading ? 'Accepting...' : 'Accept & Continue'}
        onPrimaryPress={handleContinue}
        primaryButtonDisabled={!termsAccepted || loading}
        primaryButtonLoading={loading}
        currentStep={currentStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AuthColors.background },
  content: { flex: 1, padding: 24 },
  title: { ...AuthTypography.onboardingTitle, textAlign: 'center', marginBottom: 8 },
  subtitle: { ...AuthTypography.bodyText, textAlign: 'center', marginBottom: 24 },
  termsContainer: { 
    flex: 1, 
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    maxHeight: 300,
  },
  termsTitle: { 
    ...AuthTypography.label, 
    color: AuthColors.primaryText,
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'none',
  },
  termsText: { 
    ...AuthTypography.bodyText, 
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  checkboxContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 16,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },
  checkbox: { 
    width: 24, 
    height: 24, 
    borderRadius: 4,
    borderWidth: 2,
    borderColor: AuthColors.inputBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { 
    backgroundColor: AuthColors.primaryButton,
    borderColor: AuthColors.primaryButton,
  },
  checkboxText: { 
    ...AuthTypography.bodyText, 
    flex: 1,
    fontSize: 14,
  },
});

export default TermsScreen;
