import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthColors, AuthTypography } from './AuthDesignSystem';

// Registration Header Component
interface RegistrationHeaderProps {
  title: string;
  currentStep: number;
  totalSteps: number;
  onBackPress?: () => void;
  showBackButton?: boolean;
}

export const RegistrationHeader: React.FC<RegistrationHeaderProps> = ({
  title,
  currentStep,
  totalSteps,
  onBackPress,
  showBackButton = true,
}) => {
  return (
    <SafeAreaView edges={['top']} style={styles.headerContainer}>
      <View style={styles.header}>
        {/* Back Button */}
        <View style={styles.headerLeft}>
          {showBackButton && onBackPress && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBackPress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={AuthColors.primaryText} 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        {/* Step Counter */}
        <View style={styles.headerRight}>
          <Text style={styles.stepCounter}>
            {currentStep}/{totalSteps}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <LinearGradient
            colors={[AuthColors.primaryButton, AuthColors.primaryButtonHover]}
            style={[
              styles.progressFill,
              { width: `${(currentStep / totalSteps) * 100}%` }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

// Registration Card Component
interface RegistrationCardProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export const RegistrationCard: React.FC<RegistrationCardProps> = ({
  children,
  scrollable = false,
}) => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.card}>
        {children}
      </View>
    </View>
  );
};

// Registration Footer Component
interface RegistrationFooterProps {
  primaryButtonText: string;
  onPrimaryPress: () => void;
  primaryButtonDisabled?: boolean;
  primaryButtonLoading?: boolean;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
}

export const RegistrationFooter: React.FC<RegistrationFooterProps> = ({
  primaryButtonText,
  onPrimaryPress,
  primaryButtonDisabled = false,
  primaryButtonLoading = false,
  secondaryButtonText,
  onSecondaryPress,
}) => {
  return (
    <SafeAreaView edges={['bottom']} style={styles.footerContainer}>
      <View style={styles.footer}>
        {/* Secondary Button */}
        {secondaryButtonText && onSecondaryPress && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onSecondaryPress}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>
              {secondaryButtonText}
            </Text>
          </TouchableOpacity>
        )}

        {/* Primary Button */}
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

// ToggleOption Component - REMOVED (replaced with DiscordSegmentedControl)
// This component created bulky cards with radio buttons - not Discord-style
// Use DiscordSegmentedControl instead for minimal segmented controls

/*
interface ToggleOptionProps {
  title: string;
  subtitle?: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}

export const ToggleOption: React.FC<ToggleOptionProps> = ({
  title,
  subtitle,
  icon,
  selected,
  onPress,
}) => {
  // DEPRECATED - Use DiscordSegmentedControl instead
  return null;
};
*/

const styles = StyleSheet.create({
  // Header styles
  headerContainer: {
    backgroundColor: AuthColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AuthColors.primaryText,
    textAlign: 'center',
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: '500',
    color: AuthColors.mutedText,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  progressBackground: {
    height: 3,
    backgroundColor: AuthColors.divider,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },

  // Card styles
  cardContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  card: {
    flex: 1,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },

  // Footer styles
  footerContainer: {
    backgroundColor: AuthColors.background,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.25,
  },
  primaryButtonTextDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: AuthColors.mutedText,
    textDecorationLine: 'underline',
  },

  // Toggle option styles - REMOVED (replaced with DiscordSegmentedControl)
  // These styles created bulky cards with heavy borders and radio buttons
  // Use DiscordSegmentedControl for minimal Discord-style toggles
});

export default {
  RegistrationHeader,
  RegistrationCard,
  RegistrationFooter,
  // ToggleOption removed - use DiscordSegmentedControl instead
};
