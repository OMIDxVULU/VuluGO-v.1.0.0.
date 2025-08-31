import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingCenteredCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';

type AvatarPickerScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'AvatarPicker'>;

const AvatarPickerScreen: React.FC = () => {
  const navigation = useNavigation<AvatarPickerScreenNavigationProp>();
  const { markStepCompleted, currentStep } = useOnboarding();

  const handleBack = () => navigation.goBack();
  const handleUpload = () => { markStepCompleted(9); navigation.navigate('ThemeChoice'); };
  const handleSkip = () => { markStepCompleted(9); navigation.navigate('ThemeChoice'); };

  return (
    <View style={styles.container}>
      <OnboardingHeader onBackPress={handleBack} />
      <OnboardingCenteredCard
        title={<Text style={styles.title}>Add Profile Picture</Text>}
        subtitle={<Text style={styles.subtitle}>Help friends recognize you with a profile photo</Text>}
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarPlaceholder} onPress={handleUpload}>
            <View style={styles.avatarInner}>
              <Ionicons name="camera" size={32} color={AuthColors.mutedText} />
            </View>
            <View style={styles.cameraIcon}>
              <Ionicons name="add-circle" size={24} color={AuthColors.primaryButton} />
            </View>
          </TouchableOpacity>
          <Text style={styles.uploadText}>Tap to upload photo</Text>
        </View>

        <View style={styles.optionsContainer}>
          <View style={styles.option}>
            <Ionicons name="camera" size={20} color={AuthColors.primaryButton} />
            <Text style={styles.optionText}>Take a new photo</Text>
          </View>
          <View style={styles.option}>
            <Ionicons name="images" size={20} color={AuthColors.primaryButton} />
            <Text style={styles.optionText}>Choose from gallery</Text>
          </View>
          <View style={styles.option}>
            <Ionicons name="person" size={20} color={AuthColors.primaryButton} />
            <Text style={styles.optionText}>Use default avatar</Text>
          </View>
        </View>
      </OnboardingCenteredCard>
      <OnboardingFooter
        primaryButtonText="Upload Photo"
        onPrimaryPress={handleUpload}
        secondaryText="Skip for now"
        onSecondaryPress={handleSkip}
        currentStep={currentStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AuthColors.background },
  title: { ...AuthTypography.onboardingTitle, marginBottom: 8 },
  subtitle: { ...AuthTypography.bodyText, textAlign: 'center', paddingHorizontal: 16 },
  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AuthColors.cardBackground,
    borderWidth: 3,
    borderColor: AuthColors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: AuthColors.background,
    borderRadius: 12,
    padding: 2,
  },
  uploadText: {
    ...AuthTypography.microcopy,
    marginTop: 12,
    color: AuthColors.mutedText,
  },
  optionsContainer: {
    gap: 12,
    alignSelf: 'stretch',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },
  optionText: {
    ...AuthTypography.bodyText,
    fontSize: 14,
    color: AuthColors.secondaryText,
  },
});

export default AvatarPickerScreen;
