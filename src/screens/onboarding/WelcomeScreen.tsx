import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingCenteredCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';

type WelcomeScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { markStepCompleted, currentStep } = useOnboarding();

  const handleContinue = () => {
    markStepCompleted(1);
    navigation.navigate('AgeGate');
  };

  const HeroIllustration = () => (
    <View style={styles.heroContainer}>
      <LinearGradient
        colors={[AuthColors.primaryButton, AuthColors.primaryButtonHover]}
        style={styles.heroCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroInner}>
          <Ionicons 
            name="rocket" 
            size={48} 
            color="#FFFFFF" 
          />
        </View>
      </LinearGradient>
      
      {/* Floating elements for visual interest */}
      <View style={[styles.floatingElement, styles.floatingElement1]}>
        <Ionicons name="star" size={16} color={AuthColors.primaryButton} />
      </View>
      <View style={[styles.floatingElement, styles.floatingElement2]}>
        <Ionicons name="heart" size={14} color={AuthColors.successColor} />
      </View>
      <View style={[styles.floatingElement, styles.floatingElement3]}>
        <Ionicons name="musical-note" size={12} color={AuthColors.warningColor} />
      </View>
    </View>
  );

  // Discord-style title with proper hierarchy
  const Title = () => (
    <View style={styles.titleSection}>
      <Text style={styles.title}>Welcome to VULU</Text>
      <Text style={styles.subtitle}>
        Connect, share, and discover amazing content with friends around the world
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <OnboardingCenteredCard
        illustration={<HeroIllustration />}
        title={<Title />}
        showGradient={true}
      >
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons 
              name="people" 
              size={20} 
              color={AuthColors.primaryButton} 
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>Connect with friends</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons 
              name="musical-notes" 
              size={20} 
              color={AuthColors.primaryButton} 
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>Share your music</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons 
              name="game-controller" 
              size={20} 
              color={AuthColors.primaryButton} 
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>Play games together</Text>
          </View>
        </View>
      </OnboardingCenteredCard>

      <OnboardingFooter
        primaryButtonText="Get Started"
        onPrimaryPress={handleContinue}
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
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 120,
    height: 120,
  },
  heroCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    // Discord-style glow effect
    elevation: 12,
    shadowColor: AuthColors.primaryButton, // #5865F2 glow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  heroInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingElement: {
    position: 'absolute',
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    padding: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  floatingElement1: {
    top: 10,
    right: 0,
  },
  floatingElement2: {
    bottom: 15,
    left: 5,
  },
  floatingElement3: {
    top: 30,
    left: -10,
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 24, // Discord breathing room
  },
  title: {
    fontSize: 28, // Discord headline size (24-28px)
    fontWeight: '700', // Bold white
    color: AuthColors.primaryText, // #ffffff
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5, // Tighter letter spacing for modern look
  },
  subtitle: {
    fontSize: 16, // Discord supporting text (15-16px)
    fontWeight: '400',
    color: AuthColors.secondaryText, // #D1D5DB - light gray
    textAlign: 'center',
    lineHeight: 24, // Better readability
    paddingHorizontal: 16,
  },
  featuresContainer: {
    marginTop: 32,
    gap: 16,
    alignItems: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.divider,
    minWidth: 200,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    ...AuthTypography.bodyText,
    fontSize: 14,
    textAlign: 'left',
  },
});

export default WelcomeScreen;
