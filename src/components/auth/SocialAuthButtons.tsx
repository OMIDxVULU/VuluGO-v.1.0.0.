import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

interface SocialAuthButtonsProps {
  onSuccess?: () => void;
  disabled?: boolean;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onSuccess,
  disabled = false,
}) => {
  const { signInWithGoogle, signInWithApple, getSocialAuthMethods } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [availableMethods, setAvailableMethods] = useState({ google: false, apple: false });

  useEffect(() => {
    setAvailableMethods(getSocialAuthMethods());
  }, []);

  const handleGoogleSignIn = async () => {
    if (disabled || loading) return;

    setLoading('google');
    try {
      await signInWithGoogle();
      Alert.alert('Success', 'Welcome to VuluGO!');
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace('/(main)');
      }
    } catch (error: any) {
      Alert.alert('Google Sign-In Failed', error.message || 'Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    if (disabled || loading) return;

    setLoading('apple');
    try {
      await signInWithApple();
      Alert.alert('Success', 'Welcome to VuluGO!');
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace('/(main)');
      }
    } catch (error: any) {
      Alert.alert('Apple Sign-In Failed', error.message || 'Please try again.');
    } finally {
      setLoading(null);
    }
  };

  if (!availableMethods.google && !availableMethods.apple) {
    return null; // No social auth methods available
  }

  return (
    <View style={styles.container}>
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.buttonsContainer}>
        {availableMethods.google && (
          <TouchableOpacity
            style={[styles.socialButton, disabled && styles.disabledButton]}
            onPress={handleGoogleSignIn}
            disabled={disabled || loading !== null}
          >
            <LinearGradient
              colors={loading === 'google' ? ['#4285F4', '#34A853'] : ['#4285F4', '#34A853']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.socialButtonGradient}
            >
              {loading === 'google' ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingSpinner} />
                  <Text style={styles.socialButtonText}>Signing in...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {availableMethods.apple && Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialButton, disabled && styles.disabledButton]}
            onPress={handleAppleSignIn}
            disabled={disabled || loading !== null}
          >
            <LinearGradient
              colors={loading === 'apple' ? ['#000000', '#1C1C1E'] : ['#000000', '#1C1C1E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.socialButtonGradient}
            >
              {loading === 'apple' ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingSpinner} />
                  <Text style={styles.socialButtonText}>Signing in...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#9BA1A6',
    fontSize: 14,
    marginHorizontal: 16,
  },
  buttonsContainer: {
    gap: 12,
  },
  socialButton: {
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  socialButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIconText: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderTopColor: 'transparent',
    marginRight: 12,
  },
});

export default SocialAuthButtons;
