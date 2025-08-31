import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingCenteredCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';

type PermissionsIntroScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'PermissionsIntro'>;

const PermissionsIntroScreen: React.FC = () => {
  const navigation = useNavigation<PermissionsIntroScreenNavigationProp>();
  const { markStepCompleted, currentStep } = useOnboarding();

  const handleBack = () => navigation.goBack();

  const handleAllow = () => {
    markStepCompleted(7);
    navigation.navigate('NotificationsPermission');
  };

  const handleNotNow = () => {
    markStepCompleted(7);
    navigation.navigate('AvatarPicker'); // Skip permissions
  };

  const Illustration = () => (
    <View style={styles.illustrationContainer}>
      <View style={styles.iconCircle}>
        <Ionicons name="shield-checkmark" size={48} color="#FFFFFF" />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <OnboardingHeader onBackPress={handleBack} />
      <OnboardingCenteredCard
        illustration={<Illustration />}
        title={<Text style={styles.title}>Enable Permissions</Text>}
        subtitle={<Text style={styles.subtitle}>We'll ask for a few permissions to enhance your experience</Text>}
      >
        <View style={styles.permissionsList}>
          <View style={styles.permissionItem}>
            <Ionicons name="notifications" size={20} color={AuthColors.primaryButton} />
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionTitle}>Notifications</Text>
              <Text style={styles.permissionText}>Get notified about messages, friend requests, and important updates</Text>
            </View>
          </View>
          <View style={styles.permissionItem}>
            <Ionicons name="people" size={20} color={AuthColors.primaryButton} />
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionTitle}>Contacts</Text>
              <Text style={styles.permissionText}>Find friends who are already using VuluGO</Text>
            </View>
          </View>
          <View style={styles.permissionItem}>
            <Ionicons name="camera" size={20} color={AuthColors.primaryButton} />
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionTitle}>Camera & Photos</Text>
              <Text style={styles.permissionText}>Share photos and set your profile picture</Text>
            </View>
          </View>
        </View>
      </OnboardingCenteredCard>
      <OnboardingFooter
        primaryButtonText="Allow"
        onPrimaryPress={handleAllow}
        secondaryText="Not now"
        onSecondaryPress={handleNotNow}
        currentStep={currentStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AuthColors.background },
  illustrationContainer: { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AuthColors.primaryButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...AuthTypography.onboardingTitle, marginBottom: 8 },
  subtitle: { ...AuthTypography.bodyText, textAlign: 'center', paddingHorizontal: 16 },
  permissionsList: { marginTop: 24, gap: 20 },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },
  permissionTextContainer: { flex: 1 },
  permissionTitle: {
    ...AuthTypography.bodyText,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: AuthColors.primaryText,
  },
  permissionText: {
    ...AuthTypography.bodyText,
    fontSize: 14,
    color: AuthColors.mutedText,
    lineHeight: 20,
  },
});

export default PermissionsIntroScreen;
