import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

interface AuthSelectionScreenProps {
  onSignUpPress: () => void;
  onLoginPress: () => void;
  onGuestContinue: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

const AuthSelectionScreen: React.FC<AuthSelectionScreenProps> = ({
  onSignUpPress,
  onLoginPress,
  onGuestContinue,
  showBackButton = false,
  onBackPress,
}) => {
  const router = useRouter();
  const { signIn } = useAuth();
  const [isDevLoginLoading, setIsDevLoginLoading] = useState(false);
  const [isDevLogin2Loading, setIsDevLogin2Loading] = useState(false);

  // TEMPORARY DEV LOGIN - Remove before production release
  const handleDevLogin = async () => {
    if (!__DEV__) return; // Extra safety check

    console.log('🔧 DEV LOGIN: Development login button pressed');
    setIsDevLoginLoading(true);
    try {
      console.log('🔧 DEV LOGIN: Attempting automatic login with test credentials');
      console.log('📧 Email: Amin@live.no');
      console.log('🔑 Password: [HIDDEN]');

      await signIn('Amin@live.no', 'Maxi123rio');

      console.log('✅ DEV LOGIN: Authentication successful!');
      console.log('🚀 DEV LOGIN: Navigating to main app...');
      router.replace('/(main)');
    } catch (error: any) {
      console.error('❌ DEV LOGIN: Authentication failed', {
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      });

      Alert.alert(
        'Dev Login Failed',
        `Could not login with test credentials:\n\nError: ${error.message}\n\nCheck console for details.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsDevLoginLoading(false);
    }
  };

  // TEMPORARY DEV LOGIN 2 - Remove before production release
  const handleDevLogin2 = async () => {
    if (!__DEV__) return; // Extra safety check

    console.log('🔧 DEV LOGIN 2: Development login button pressed');
    setIsDevLogin2Loading(true);
    try {
      console.log('🔧 DEV LOGIN 2: Attempting automatic login with test credentials');
      console.log('📧 Email: amin88@live.no');
      console.log('🔑 Password: [HIDDEN]');

      await signIn('amin88@live.no', 'Maxi123rio');

      console.log('✅ DEV LOGIN 2: Authentication successful!');
      console.log('🚀 DEV LOGIN 2: Navigating to main app...');
      router.replace('/(main)');
    } catch (error: any) {
      console.error('❌ DEV LOGIN 2: Authentication failed', {
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      });

      Alert.alert(
        'Dev Login 2 Failed',
        `Could not login with test credentials:\n\nError: ${error.message}\n\nCheck console for details.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsDevLogin2Loading(false);
    }
  };
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header with optional back button */}
        {showBackButton && onBackPress && (
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBackPress}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={AuthColors.primaryText} />
            </TouchableOpacity>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.content}>
          {/* Logo and Branding */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[AuthColors.primaryButton, AuthColors.primaryButtonHover]}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoText}>V</Text>
            </LinearGradient>
            <Text style={styles.brandName}>VULU</Text>
          </View>

          {/* Title and Description */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Choose Your Path</Text>
            <Text style={styles.subtitle}>
              How would you like to continue with VULU?
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={onSignUpPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[AuthColors.primaryButton, AuthColors.primaryButtonHover]}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.actionButtonContent}>
                  <Ionicons name="person-add" size={20} color="#FFFFFF" />
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Sign Up</Text>
                    <Text style={styles.actionSubtitle}>Create a new account</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Log In Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={onLoginPress}
              activeOpacity={0.8}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="log-in" size={20} color={AuthColors.primaryText} />
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, styles.secondaryActionTitle]}>Log In</Text>
                  <Text style={[styles.actionSubtitle, styles.secondaryActionSubtitle]}>
                    Sign into existing account
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={AuthColors.primaryText} />
              </View>
            </TouchableOpacity>

            {/* Continue as Guest Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.guestAction]}
              onPress={onGuestContinue}
              activeOpacity={0.8}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="person-outline" size={20} color={AuthColors.secondaryText} />
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, styles.guestActionTitle]}>Continue as Guest</Text>
                  <Text style={[styles.actionSubtitle, styles.guestActionSubtitle]}>
                    Limited features, no account needed
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={AuthColors.secondaryText} />
              </View>
            </TouchableOpacity>

            {/* TEMPORARY: Development Login Button - REMOVE BEFORE PRODUCTION */}
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.actionButton, styles.devAction]}
                onPress={handleDevLogin}
                activeOpacity={0.8}
                disabled={isDevLoginLoading}
              >
                <View style={styles.actionButtonContent}>
                  <Ionicons
                    name={isDevLoginLoading ? "hourglass" : "code-working"}
                    size={20}
                    color="#FF6B35"
                  />
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionTitle, styles.devActionTitle]}>
                      {isDevLoginLoading ? 'Logging in...' : 'DEV LOGIN'}
                    </Text>
                    <Text style={[styles.actionSubtitle, styles.devActionSubtitle]}>
                      Test user: Amin@live.no
                    </Text>
                  </View>
                  <Ionicons name="bug" size={20} color="#FF6B35" />
                </View>
              </TouchableOpacity>
            )}

            {/* TEMPORARY: Development Login Button 2 - REMOVE BEFORE PRODUCTION */}
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.actionButton, styles.devAction2]}
                onPress={handleDevLogin2}
                activeOpacity={0.8}
                disabled={isDevLogin2Loading}
              >
                <View style={styles.actionButtonContent}>
                  <Ionicons
                    name={isDevLogin2Loading ? "hourglass" : "code-working"}
                    size={20}
                    color="#35A7FF"
                  />
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionTitle, styles.devAction2Title]}>
                      {isDevLogin2Loading ? 'Logging in...' : 'DEV LOGIN 2'}
                    </Text>
                    <Text style={[styles.actionSubtitle, styles.devAction2Subtitle]}>
                      Test user: amin88@live.no
                    </Text>
                  </View>
                  <Ionicons name="bug" size={20} color="#35A7FF" />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text style={styles.footerLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AuthColors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 8,
    shadowColor: AuthColors.primaryButton,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    color: AuthColors.primaryText,
    letterSpacing: -0.5,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AuthColors.primaryText,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: AuthColors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionsContainer: {
    marginBottom: 32,
  },
  actionButton: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryAction: {
    elevation: 4,
    shadowColor: AuthColors.primaryButton,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  secondaryAction: {
    backgroundColor: AuthColors.cardBackground,
    borderWidth: 1,
    borderColor: AuthColors.border,
  },
  guestAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: AuthColors.border,
  },
  // TEMPORARY: Development button styles - REMOVE BEFORE PRODUCTION
  devAction: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)', // Orange tint background
    borderWidth: 2,
    borderColor: '#FF6B35', // Orange border
    borderStyle: 'dashed', // Dashed border to indicate temporary/dev nature
  },
  devAction2: {
    backgroundColor: 'rgba(53, 167, 255, 0.1)', // Blue tint background
    borderWidth: 2,
    borderColor: '#35A7FF', // Blue border
    borderStyle: 'dashed', // Dashed border to indicate temporary/dev nature
  },
  actionButtonGradient: {
    height: 64,
    justifyContent: 'center',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  secondaryActionTitle: {
    color: AuthColors.primaryText,
  },
  guestActionTitle: {
    color: AuthColors.secondaryText,
  },
  // TEMPORARY: Development button text styles - REMOVE BEFORE PRODUCTION
  devActionTitle: {
    color: '#FF6B35', // Orange text
    fontWeight: '700', // Bold to stand out
  },
  devAction2Title: {
    color: '#35A7FF', // Blue text
    fontWeight: '700', // Bold to stand out
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  secondaryActionSubtitle: {
    color: AuthColors.secondaryText,
  },
  guestActionSubtitle: {
    color: AuthColors.mutedText,
  },
  // TEMPORARY: Development button subtitle styles - REMOVE BEFORE PRODUCTION
  devActionSubtitle: {
    color: 'rgba(255, 107, 53, 0.8)', // Muted orange
    fontStyle: 'italic', // Italic to indicate temporary nature
  },
  devAction2Subtitle: {
    color: 'rgba(53, 167, 255, 0.8)', // Muted blue
    fontStyle: 'italic', // Italic to indicate temporary nature
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: AuthColors.mutedText,
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: AuthColors.linkColor,
    fontWeight: '500',
  },
});

export default AuthSelectionScreen;
