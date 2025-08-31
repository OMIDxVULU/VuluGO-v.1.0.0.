import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingCenteredCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { DiscordSegmentedControl } from '../../components/onboarding/DiscordSegmentedControl';
import { useOnboarding } from '../../context/OnboardingContext';

type ThemeChoiceScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'ThemeChoice'>;

const ThemeChoiceScreen: React.FC = () => {
  const navigation = useNavigation<ThemeChoiceScreenNavigationProp>();
  const { updateOnboardingData, markStepCompleted, currentStep } = useOnboarding();
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>('dark');

  const handleBack = () => navigation.goBack();

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme as 'dark' | 'light');
  };

  const handleContinue = () => {
    updateOnboardingData({ theme: selectedTheme });
    markStepCompleted(10);
    navigation.navigate('Interests');
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader onBackPress={handleBack} />
      <OnboardingCenteredCard
        title={<Text style={styles.title}>Choose Your Theme</Text>}
        subtitle={<Text style={styles.subtitle}>Pick the look that suits you best</Text>}
      >
        {/* Discord-style segmented control - NO cards */}
        <View style={styles.selectorContainer}>
          <DiscordSegmentedControl
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' }
            ]}
            selectedValue={selectedTheme}
            onValueChange={handleThemeChange}
          />
        </View>

        {/* Helper text */}
        <Text style={styles.helperText}>
          You can change this later in settings
        </Text>
      </OnboardingCenteredCard>
      <OnboardingFooter
        primaryButtonText="Continue"
        onPrimaryPress={handleContinue}
        currentStep={currentStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1117' // Exact dark mode background
  },
  // Discord typography hierarchy
  title: {
    fontSize: 26, // 26px headline
    fontWeight: '700', // Bold white
    color: '#FFFFFF', // White text
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16, // 16px body
    fontWeight: '400',
    color: '#D1D5DB', // Secondary text
    textAlign: 'center',
    paddingHorizontal: 24, // Breathing room
    lineHeight: 22,
  },
  // Discord spacing system
  selectorContainer: {
    marginTop: 24, // Section gap
    marginBottom: 16, // Field gap
  },
  helperText: {
    fontSize: 13, // 13px helper
    fontWeight: '400',
    color: '#9AA3B2', // Muted text
    textAlign: 'center',
    marginTop: 12, // Label→Field gap
  },
});

export default ThemeChoiceScreen;
