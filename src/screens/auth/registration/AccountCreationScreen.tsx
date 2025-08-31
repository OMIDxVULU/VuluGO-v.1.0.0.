import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  RegistrationHeader, 
  RegistrationCard, 
  RegistrationFooter 
} from '../../../components/auth/RegistrationComponents';

import { AuthColors } from '../../../components/auth/AuthDesignSystem';
import { useRegistration } from '../../../context/RegistrationContext';

const AccountCreationScreen: React.FC = () => {
  const { 
    registrationData, 
    updateRegistrationData, 
    setCurrentStep, 
    validateStep,
    isLoading,
    setIsLoading,
    error,
    setError 
  } = useRegistration();

  const [username, setUsername] = useState(registrationData.username || '');
  const [password, setPassword] = useState(registrationData.password || '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setCurrentStep(3);
  }, [setCurrentStep]);

  // Debounced username availability check
  useEffect(() => {
    if (username.length >= 3) {
      const timeoutId = setTimeout(async () => {
        setCheckingUsername(true);
        setUsernameError(null);
        
        // Validate username format first
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
          setUsernameError('Username can only contain letters, numbers, underscores, and hyphens');
          setCheckingUsername(false);
          return;
        }

        // Simulate API call for username availability
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Mock unavailable usernames
          const unavailableUsernames = ['admin', 'user', 'test', 'vulu', 'vulugoadmin'];
          if (unavailableUsernames.includes(username.toLowerCase())) {
            setUsernameError('This username is already taken');
          }
        } catch (err) {
          setUsernameError('Unable to check username availability');
        }
        
        setCheckingUsername(false);
      }, 800);

      return () => clearTimeout(timeoutId);
    } else {
      setUsernameError(null);
    }
  }, [username]);

  const handleUsernameChange = (value: string) => {
    // Convert to lowercase and remove invalid characters
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(cleanValue);
    setUsernameError(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(null);
  };

  const handleBack = () => {
    setCurrentStep(2);
  };

  const handleNext = async () => {
    setIsLoading(true);
    setError(null);
    setUsernameError(null);
    setPasswordError(null);

    // Validate current input directly (not from context)
    const trimmedUsername = username.trim();

    // Username validation
    if (!trimmedUsername) {
      setUsernameError('Please enter a username');
      setIsLoading(false);
      return;
    }

    if (trimmedUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters long');
      setIsLoading(false);
      return;
    }

    if (trimmedUsername.length > 20) {
      setUsernameError('Username must be 20 characters or less');
      setIsLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      setIsLoading(false);
      return;
    }

    // Password validation
    if (!password) {
      setPasswordError('Please enter a password');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      setPasswordError('Password must contain both letters and numbers');
      setIsLoading(false);
      return;
    }

    // Check if username is available (from real-time checking)
    if (usernameError) {
      setIsLoading(false);
      return;
    }

    // Update registration data
    updateRegistrationData({
      username: trimmedUsername,
      password,
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Move to next step
      setCurrentStep(4);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (password.length < 4) return { strength: 'weak', color: AuthColors.errorColor };
    if (password.length < 8) return { strength: 'medium', color: AuthColors.warningColor };
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) return { strength: 'medium', color: AuthColors.warningColor };
    return { strength: 'strong', color: AuthColors.successColor };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <View style={styles.container}>
      <RegistrationHeader
        title="Create your account"
        currentStep={3}
        totalSteps={4}
        onBackPress={handleBack}
        showBackButton={true}
      />

      {/* Simplified layout - no complex nesting */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Choose a unique username and secure password for your account
        </Text>

        {/* Username Input - DIRECT IMPLEMENTATION */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>USERNAME *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="Enter your username"
              placeholderTextColor="#9AA3B2"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              editable={!isLoading}
            />
          </View>
          {usernameError && <Text style={styles.errorText}>{usernameError}</Text>}

          {/* Username Status */}
          <View style={styles.inputStatus}>
            {checkingUsername && (
              <View style={styles.statusIndicator}>
                <Ionicons name="time" size={16} color="#9AA3B2" />
                <Text style={styles.statusText}>Checking...</Text>
              </View>
            )}
            {!checkingUsername && username.length >= 3 && !usernameError && (
              <View style={styles.statusIndicator}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={[styles.statusText, { color: '#4CAF50' }]}>Available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Password Input - DIRECT IMPLEMENTATION */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>PASSWORD *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="Enter your password"
              placeholderTextColor="#9AA3B2"
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            {/* Password Toggle */}
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#9AA3B2"
              />
            </TouchableOpacity>
          </View>
          {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

          {/* Password Strength */}
          {password.length > 0 && (
            <View style={styles.passwordStrength}>
              <View style={styles.strengthBar}>
                <View style={[
                  styles.strengthFill,
                  {
                    width: password.length < 4 ? '25%' : password.length < 8 ? '50%' : '100%',
                    backgroundColor: passwordStrength.color
                  }
                ]} />
              </View>
              <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                {passwordStrength.strength.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Requirements */}
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <View style={styles.requirement}>
            <Ionicons
              name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={password.length >= 8 ? '#4CAF50' : '#9AA3B2'}
            />
            <Text style={[
              styles.requirementText,
              password.length >= 8 && { color: '#4CAF50' }
            ]}>
              At least 8 characters
            </Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons
              name={/(?=.*[a-zA-Z])(?=.*\d)/.test(password) ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={/(?=.*[a-zA-Z])(?=.*\d)/.test(password) ? '#4CAF50' : '#9AA3B2'}
            />
            <Text style={[
              styles.requirementText,
              /(?=.*[a-zA-Z])(?=.*\d)/.test(password) && { color: '#4CAF50' }
            ]}>
              Contains letters and numbers
            </Text>
          </View>
        </View>
      </View>

      <RegistrationFooter
        primaryButtonText="Next"
        onPrimaryPress={handleNext}
        primaryButtonDisabled={
          !username.trim() || 
          !password || 
          username.length < 3 || 
          password.length < 8 ||
          checkingUsername ||
          !!usernameError ||
          isLoading
        }
        primaryButtonLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1117',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#151924',
    marginHorizontal: 24,
    marginVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    backgroundColor: '#1e2230',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252A3A',
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 12,
  },
  passwordToggle: {
    padding: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 8,
  },
  inputStatus: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9AA3B2',
  },
  passwordStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    backgroundColor: '#252A3A',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementsContainer: {
    backgroundColor: '#0f1117',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9AA3B2',
  },
});

export default AccountCreationScreen;
