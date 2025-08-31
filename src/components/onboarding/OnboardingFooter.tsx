import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthColors, AuthTypography } from '../auth/AuthDesignSystem';

interface OnboardingFooterProps {
  primaryButtonText: string;
  onPrimaryPress: () => void;
  primaryButtonDisabled?: boolean;
  primaryButtonLoading?: boolean;
  secondaryText?: string;
  onSecondaryPress?: () => void;
  currentStep: number;
  totalSteps?: number;
  showStepDots?: boolean;
}

export const OnboardingFooter: React.FC<OnboardingFooterProps> = ({
  primaryButtonText,
  onPrimaryPress,
  primaryButtonDisabled = false,
  primaryButtonLoading = false,
  secondaryText,
  onSecondaryPress,
  currentStep,
  totalSteps = 17,
  showStepDots = true,
}) => {
  const renderStepDots = () => {
    if (!showStepDots) return null;

    const dots = [];
    for (let i = 1; i <= totalSteps; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.stepDot,
            i === currentStep && styles.stepDotActive,
            i < currentStep && styles.stepDotCompleted,
          ]}
        />
      );
    }
    return dots;
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.footer}>
        {/* Step Progress Dots */}
        {showStepDots && (
          <View style={styles.stepDotsContainer}>
            <View style={styles.stepDots}>
              {renderStepDots()}
            </View>
            <Text style={styles.stepText}>
              {currentStep} of {totalSteps}
            </Text>
          </View>
        )}

        {/* Secondary Ghost Text */}
        {secondaryText && onSecondaryPress && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onSecondaryPress}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>
              {secondaryText}
            </Text>
          </TouchableOpacity>
        )}

        {/* Primary CTA Button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            primaryButtonDisabled && styles.primaryButtonDisabled,
          ]}
          onPress={onPrimaryPress}
          disabled={primaryButtonDisabled || primaryButtonLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              primaryButtonDisabled
                ? [AuthColors.mutedText, AuthColors.mutedText]
                : [AuthColors.primaryButton, AuthColors.primaryButtonHover]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={[
              styles.primaryButtonText,
              primaryButtonDisabled && styles.primaryButtonTextDisabled,
            ]}>
              {primaryButtonLoading ? 'Loading...' : primaryButtonText}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AuthColors.background,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  stepDotsContainer: {
    alignItems: 'center',
    gap: 8,
  },
  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AuthColors.mutedText,
  },
  stepDotActive: {
    backgroundColor: AuthColors.primaryButton,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotCompleted: {
    backgroundColor: AuthColors.primaryButton,
  },
  stepText: {
    ...AuthTypography.microcopy,
    color: AuthColors.mutedText,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 15, // Slightly smaller than primary
    fontWeight: '500',
    color: AuthColors.mutedText, // #9AA3B2 - muted gray
    textDecorationLine: 'underline',
  },
  primaryButton: {
    borderRadius: 14, // Discord rounded corners
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonGradient: {
    paddingVertical: 14, // Adjusted for 48px total height
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Discord button height
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700', // Bold white text
    color: '#FFFFFF',
    letterSpacing: 0.25,
  },
  primaryButtonTextDisabled: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
});

export default OnboardingFooter;
