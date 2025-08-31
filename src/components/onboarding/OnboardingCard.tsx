import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthColors } from '../auth/AuthDesignSystem';

interface OnboardingCardProps {
  children: React.ReactNode;
  scrollable?: boolean;
  showGradient?: boolean;
  contentStyle?: ViewStyle;
  cardStyle?: ViewStyle;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  children,
  scrollable = false,
  showGradient = true,
  contentStyle,
  cardStyle,
}) => {
  const CardContent = () => (
    <View style={[styles.card, cardStyle]}>
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </View>
  );

  const Container = showGradient ? LinearGradient : View;
  const containerProps = showGradient
    ? {
        colors: [AuthColors.background, AuthColors.cardBackground],
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
      }
    : { style: { backgroundColor: AuthColors.background } };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Container {...containerProps} style={styles.gradientContainer}>
        {scrollable ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <CardContent />
          </ScrollView>
        ) : (
          <View style={styles.staticContainer}>
            <CardContent />
          </View>
        )}
      </Container>
    </SafeAreaView>
  );
};

// Specialized card for centered content (like welcome screen)
interface OnboardingCenteredCardProps extends OnboardingCardProps {
  illustration?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}

export const OnboardingCenteredCard: React.FC<OnboardingCenteredCardProps> = ({
  illustration,
  title,
  subtitle,
  children,
  ...props
}) => {
  return (
    <OnboardingCard {...props}>
      <View style={styles.centeredContent}>
        {/* Hero Section */}
        {illustration && (
          <View style={styles.illustrationContainer}>
            {illustration}
          </View>
        )}

        {/* Title Section */}
        {title && (
          <View style={styles.titleContainer}>
            {title}
          </View>
        )}

        {/* Subtitle Section */}
        {subtitle && (
          <View style={styles.subtitleContainer}>
            {subtitle}
          </View>
        )}

        {/* Additional Content */}
        {children && (
          <View style={styles.additionalContent}>
            {children}
          </View>
        )}
      </View>
    </OnboardingCard>
  );
};

// Specialized card for form content
interface OnboardingFormCardProps extends OnboardingCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}

export const OnboardingFormCard: React.FC<OnboardingFormCardProps> = ({
  title,
  subtitle,
  children,
  ...props
}) => {
  return (
    <OnboardingCard scrollable={true} {...props}>
      <View style={styles.formContent}>
        {/* Header Section */}
        {(title || subtitle) && (
          <View style={styles.formHeader}>
            {title && (
              <View style={styles.formTitleContainer}>
                {title}
              </View>
            )}
            {subtitle && (
              <View style={styles.formSubtitleContainer}>
                {subtitle}
              </View>
            )}
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formFields}>
          {children}
        </View>
      </View>
    </OnboardingCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  gradientContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  staticContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  card: {
    flex: 1,
    marginHorizontal: 24,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AuthColors.divider,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  // Centered card styles
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  illustrationContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  titleContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  subtitleContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  additionalContent: {
    width: '100%',
    alignItems: 'center',
  },
  // Form card styles
  formContent: {
    flex: 1,
  },
  formHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  formTitleContainer: {
    marginBottom: 8,
    alignItems: 'center',
  },
  formSubtitleContainer: {
    alignItems: 'center',
  },
  formFields: {
    flex: 1,
  },
});

export default OnboardingCard;
