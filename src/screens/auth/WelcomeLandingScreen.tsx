import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface WelcomeLandingScreenProps {
  onRegisterPress: () => void;
  onLoginPress: () => void;
}

const WelcomeLandingScreen: React.FC<WelcomeLandingScreenProps> = ({
  onRegisterPress,
  onLoginPress,
}) => {
  const { signInAsGuest } = useAuth();
  const router = useRouter();

  // CRITICAL FIX: Add guest login functionality
  const handleGuestLogin = async () => {
    try {
      console.log('🎭 Guest login initiated');
      await signInAsGuest();
      console.log('✅ Guest login successful, navigating to main app');
      router.replace('/(main)');
    } catch (error: any) {
      console.error('❌ Guest login failed:', error);
      Alert.alert(
        'Guest Login Failed',
        'Unable to sign in as guest. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
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

          {/* Hero Imagery */}
          <View style={styles.heroImagery}>
            <View style={styles.heroIllustration}>
              {/* Main central element */}
              <LinearGradient
                colors={[AuthColors.primaryButton, AuthColors.primaryButtonHover]}
                style={styles.centralOrb}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="musical-notes" size={32} color="#FFFFFF" />
              </LinearGradient>

              {/* Floating elements */}
              <View style={[styles.floatingElement, styles.element1]}>
                <Ionicons name="people" size={20} color={AuthColors.primaryButton} />
              </View>
              <View style={[styles.floatingElement, styles.element2]}>
                <Ionicons name="game-controller" size={18} color={AuthColors.successColor} />
              </View>
              <View style={[styles.floatingElement, styles.element3]}>
                <Ionicons name="camera" size={16} color={AuthColors.warningColor} />
              </View>
              <View style={[styles.floatingElement, styles.element4]}>
                <Ionicons name="heart" size={14} color="#FF6B9D" />
              </View>
            </View>
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeTitle}>Welcome to VULU</Text>
            <Text style={styles.welcomeSubtitle}>
              Connect, share, and discover together
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Action Buttons */}
      <SafeAreaView style={styles.bottomSection} edges={['bottom', 'left', 'right']}>
        <View style={styles.buttonContainer}>
          {/* Primary Register Button */}
          <TouchableOpacity
            style={styles.primaryButtonContainer}
            onPress={onRegisterPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[AuthColors.primaryButton, AuthColors.primaryButtonHover]}
              style={styles.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryButtonText}>
                Register
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary Login Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onLoginPress}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>
              Log In
            </Text>
          </TouchableOpacity>

          {/* CRITICAL FIX: Guest Login Button */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestLogin}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={18} color={AuthColors.secondaryText} style={styles.guestIcon} />
            <Text style={styles.guestButtonText}>
              Continue as Guest
            </Text>
          </TouchableOpacity>

          {/* Terms and Privacy */}
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
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
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: AuthColors.primaryButton,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    color: AuthColors.primaryText,
    letterSpacing: -0.5,
  },
  heroImagery: {
    width: width * 0.8,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  heroIllustration: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralOrb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: AuthColors.primaryButton,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  floatingElement: {
    position: 'absolute',
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 16,
    padding: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  element1: {
    top: -10,
    right: -20,
  },
  element2: {
    bottom: -15,
    left: -25,
  },
  element3: {
    top: 20,
    left: -35,
  },
  element4: {
    bottom: 10,
    right: -30,
  },
  welcomeText: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: AuthColors.primaryText,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: AuthColors.secondaryText,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  bottomSection: {
    backgroundColor: AuthColors.background,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  primaryButtonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: AuthColors.primaryButton,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  primaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.25,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: AuthColors.secondaryText,
    letterSpacing: 0.25,
  },
  // CRITICAL FIX: Guest button styles
  guestButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.3)',
    flexDirection: 'row',
  },
  guestIcon: {
    marginRight: 8,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: AuthColors.secondaryText,
    letterSpacing: 0.1,
  },
  termsText: {
    fontSize: 13,
    color: AuthColors.mutedText,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  termsLink: {
    color: AuthColors.primaryButton,
    textDecorationLine: 'underline',
  },
});

export default WelcomeLandingScreen;
