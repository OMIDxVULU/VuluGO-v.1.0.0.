import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { DiscordPillToggle } from '../../components/onboarding/DiscordSegmentedControl';
import { OnboardingFormCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';

type InterestsScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Interests'>;

const INTERESTS = [
  { id: 'music', name: 'Music', icon: 'musical-notes' },
  { id: 'gaming', name: 'Gaming', icon: 'game-controller' },
  { id: 'sports', name: 'Sports', icon: 'basketball' },
  { id: 'movies', name: 'Movies', icon: 'film' },
  { id: 'art', name: 'Art', icon: 'brush' },
  { id: 'technology', name: 'Technology', icon: 'laptop' },
  { id: 'travel', name: 'Travel', icon: 'airplane' },
  { id: 'food', name: 'Food', icon: 'restaurant' },
  { id: 'books', name: 'Books', icon: 'book' },
  { id: 'fitness', name: 'Fitness', icon: 'fitness' },
  { id: 'photography', name: 'Photography', icon: 'camera' },
  { id: 'fashion', name: 'Fashion', icon: 'shirt' },
];

const InterestsScreen: React.FC = () => {
  const navigation = useNavigation<InterestsScreenNavigationProp>();
  const { updateOnboardingData, markStepCompleted, currentStep } = useOnboarding();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const handleBack = () => navigation.goBack();
  
  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(i => i !== interestId)
        : [...prev, interestId]
    );
  };

  const handleContinue = () => {
    updateOnboardingData({ interests: selectedInterests });
    markStepCompleted(11);
    navigation.navigate('ContactsIntro');
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader onBackPress={handleBack} />
      <OnboardingFormCard
        title={<Text style={styles.title}>What are you interested in?</Text>}
        subtitle={<Text style={styles.subtitle}>Select topics you'd like to see content about</Text>}
      >
        {/* Discord-style pill toggles for interests */}
        <View style={styles.interestsGrid}>
          {INTERESTS.map(interest => (
            <View key={interest.id} style={styles.interestPillContainer}>
              <DiscordPillToggle
                label={interest.name}
                selected={selectedInterests.includes(interest.id)}
                onPress={() => toggleInterest(interest.id)}
                style={styles.interestPill}
              />
            </View>
          ))}
        </View>

        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedInterests.length} of {INTERESTS.length} selected
          </Text>
          <Text style={styles.selectionSubtext}>
            Select at least 3 interests to personalize your experience
          </Text>
        </View>
      </OnboardingFormCard>
      <OnboardingFooter
        primaryButtonText="Continue"
        onPrimaryPress={handleContinue}
        primaryButtonDisabled={selectedInterests.length === 0}
        currentStep={currentStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' }, // Exact dark mode background
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
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24, // Discord spacing between sections
    marginBottom: 24,
    justifyContent: 'center', // Center the pills
  },
  interestPillContainer: {
    // Container for individual pills
  },
  interestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: AuthColors.divider,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selected: {
    backgroundColor: AuthColors.primaryButton,
    borderColor: AuthColors.primaryButton,
    elevation: 4,
    shadowColor: AuthColors.primaryButton,
    shadowOpacity: 0.3,
  },
  interestText: {
    ...AuthTypography.bodyText,
    fontSize: 14,
    fontWeight: '500',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectionInfo: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },
  selectionText: {
    ...AuthTypography.bodyText,
    fontSize: 16,
    fontWeight: '600',
    color: AuthColors.primaryText,
    marginBottom: 4,
  },
  selectionSubtext: {
    ...AuthTypography.microcopy,
    color: AuthColors.mutedText,
    textAlign: 'center',
  },
});

export default InterestsScreen;
