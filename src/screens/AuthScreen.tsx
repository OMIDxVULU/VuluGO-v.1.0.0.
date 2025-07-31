import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import authService from '../services/authService';

const AuthScreen: React.FC = () => {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && !displayName) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await authService.signIn(email, password);
        Alert.alert('Success', 'Welcome back!');
      } else {
        await authService.signUp(email, password, displayName);
        Alert.alert('Success', 'Account created successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LinearGradient
            colors={['#1C1D23', '#232429', '#2D2E38']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <MaterialCommunityIcons
                name="fire"
                size={60}
                color="#FF6B35"
                style={styles.logo}
              />
              <Text style={styles.title}>VULU GO</Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Welcome back!' : 'Create your account'}
              </Text>
            </View>

            {/* Auth Form */}
            <View style={styles.formContainer}>
              {!isLogin && (
                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="person"
                    size={24}
                    color="#6E69F4"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Display Name"
                    placeholderTextColor="#8E8E93"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="email"
                  size={24}
                  color="#6E69F4"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#8E8E93"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="lock"
                  size={24}
                  color="#6E69F4"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={24}
                    color="#8E8E93"
                  />
                </TouchableOpacity>
              </View>

              {/* Auth Button */}
              <TouchableOpacity
                style={[styles.authButton, loading && styles.authButtonDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#6E69F4', '#8B7CF6']}
                  style={styles.authButtonGradient}
                >
                  <Text style={styles.authButtonText}>
                    {loading
                      ? 'Loading...'
                      : isLogin
                      ? 'Sign In'
                      : 'Create Account'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Toggle Mode */}
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={toggleAuthMode}
              >
                <Text style={styles.toggleText}>
                  {isLogin
                    ? "Don't have an account? Sign Up"
                    : 'Already have an account? Sign In'}
                </Text>
              </TouchableOpacity>

              {/* Skip for now */}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  // Skip authentication and go to main app
                  router.replace('/(main)');
                }}
              >
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1D23',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  authButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    color: '#6E69F4',
    fontSize: 16,
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipText: {
    color: '#8E8E93',
    fontSize: 14,
  },
});

export default AuthScreen; 