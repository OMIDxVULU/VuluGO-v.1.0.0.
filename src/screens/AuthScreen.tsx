import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import NewAuthScreen from '../components/auth/NewAuthScreen';
import { AuthColors, AuthButton } from '../components/auth/AuthDesignSystem';

const AuthScreen: React.FC = () => {
  const router = useRouter();
  const { signInAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showGuestOption, setShowGuestOption] = useState(false);
  const insets = useSafeAreaInsets();



  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await signInAsGuest();
      Alert.alert('Success', 'Welcome Guest! You can explore the app with limited features.');
      router.replace('/(main)');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to sign in as guest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {showGuestOption ? (
          <View style={styles.guestContainer}>
            <Text style={styles.guestTitle}>Continue as Guest?</Text>
            <Text style={styles.guestSubtitle}>
              You'll have limited access to features. Create an account for the full experience.
            </Text>

            <AuthButton
              title="Continue as Guest"
              onPress={handleGuestLogin}
              loading={loading}
              disabled={loading}
              containerStyle={styles.guestButton}
            />

            <AuthButton
              title="Create Account Instead"
              variant="link"
              onPress={() => setShowGuestOption(false)}
              containerStyle={styles.backButton}
            />
          </View>
        ) : (
          <View style={styles.authContainer}>
            <View style={styles.authContent}>
              <NewAuthScreen />
            </View>

            <View style={[styles.guestOptionContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity
                style={styles.guestOptionButton}
                onPress={() => setShowGuestOption(true)}
              >
                <Text style={styles.guestOptionText}>Continue as Guest</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
  },
  authContent: {
    flex: 1,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: AuthColors.background,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AuthColors.primaryText,
    textAlign: 'center',
    marginBottom: 16,
  },
  guestSubtitle: {
    fontSize: 16,
    color: AuthColors.secondaryText,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  guestButton: {
    marginBottom: 16,
  },
  backButton: {
    marginTop: 8,
  },
  guestOptionContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  guestOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  guestOptionText: {
    color: AuthColors.linkColor,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AuthScreen; 