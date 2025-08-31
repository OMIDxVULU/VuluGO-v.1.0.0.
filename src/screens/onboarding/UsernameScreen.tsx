import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingFormCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingInput } from '../../components/onboarding/OnboardingInputs';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';
import { validateUsername, checkUsernameAvailability } from '../../utils/onboardingValidation';

type UsernameScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Username'>;

const UsernameScreen: React.FC = () => {
  const navigation = useNavigation<UsernameScreenNavigationProp>();
  const { 
    onboardingData, 
    updateOnboardingData, 
    markStepCompleted, 
    currentStep 
  } = useOnboarding();
  
  const [username, setUsername] = useState(onboardingData.username || '');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Debounced username availability check
  useEffect(() => {
    if (username.length >= 3) {
      const timeoutId = setTimeout(async () => {
        setCheckingAvailability(true);
        setError('');
        
        // First validate format
        const validation = validateUsername(username);
        if (!validation.isValid) {
          setError(validation.error || '');
          setIsAvailable(false);
          setCheckingAvailability(false);
          return;
        }

        // Then check availability
        try {
          const availabilityCheck = await checkUsernameAvailability(username);
          setIsAvailable(availabilityCheck.isValid);
          if (!availabilityCheck.isValid) {
            setError(availabilityCheck.error || 'Username not available');
          }
        } catch (err) {
          setError('Unable to check username availability');
          setIsAvailable(false);
        }
        
        setCheckingAvailability(false);
      }, 800);

      return () => clearTimeout(timeoutId);
    } else {
      setIsAvailable(null);
      setError('');
    }
  }, [username]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleHelp = () => {
    Alert.alert(
      'Username Guidelines',
      '• 3-20 characters long\n• Letters, numbers, underscores, and hyphens only\n• Must be unique\n• You can change this later in settings',
      [{ text: 'OK' }]
    );
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
    setError('');
    setIsAvailable(null);
  };

  const handleContinue = () => {
    if (checkingAvailability) {
      return; // Wait for availability check
    }

    setLoading(true);
    setError('');

    // Final validation
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid username');
      setLoading(false);
      return;
    }

    if (!isAvailable) {
      setError('Please choose an available username');
      setLoading(false);
      return;
    }

    // Save username and continue
    updateOnboardingData({ username, displayName: username });
    markStepCompleted(3);
    
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Email');
    }, 500);
  };

  const getInputStatus = () => {
    if (checkingAvailability) return 'checking';
    if (error) return 'error';
    if (isAvailable === true) return 'success';
    return 'default';
  };

  const getHelperText = () => {
    if (checkingAvailability) return 'Checking availability...';
    if (isAvailable === true) return '✓ Username is available';
    if (username.length === 0) return 'Choose a unique username for your profile';
    return 'You can change this later in settings';
  };

  // Discord-style title with proper hierarchy
  const Title = () => (
    <Text style={styles.title}>Choose your username</Text>
  );

  // Discord-style supporting text
  const Subtitle = () => (
    <Text style={styles.subtitle}>
      This is how other users will find and identify you
    </Text>
  );

  return (
    <View style={styles.container}>
      <OnboardingHeader
        onBackPress={handleBack}
        onHelpPress={handleHelp}
        showBackButton={true}
        showHelpButton={true}
      />

      <OnboardingFormCard
        title={<Title />}
        subtitle={<Subtitle />}
      >
        <View style={styles.formContent}>
          <View style={styles.inputContainer}>
            <OnboardingInput
              label="Username"
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="your_username"
              error={error}
              helperText={getHelperText()}
              autoCapitalize="none"
              maxLength={20}
            />
            
            {/* Status indicator */}
            <View style={styles.statusIndicator}>
              {checkingAvailability && (
                <View style={styles.statusIcon}>
                  <Ionicons name="time" size={16} color={AuthColors.mutedText} />
                </View>
              )}
              {isAvailable === true && (
                <View style={styles.statusIcon}>
                  <Ionicons name="checkmark-circle" size={16} color={AuthColors.successColor} />
                </View>
              )}
              {isAvailable === false && error && (
                <View style={styles.statusIcon}>
                  <Ionicons name="close-circle" size={16} color={AuthColors.errorColor} />
                </View>
              )}
            </View>
          </View>

          <View style={styles.guidelinesContainer}>
            <Text style={styles.guidelinesTitle}>Username Guidelines:</Text>
            <View style={styles.guideline}>
              <Ionicons 
                name="checkmark" 
                size={14} 
                color={username.length >= 3 ? AuthColors.successColor : AuthColors.mutedText} 
              />
              <Text style={[
                styles.guidelineText,
                username.length >= 3 && styles.guidelineTextValid
              ]}>
                At least 3 characters
              </Text>
            </View>
            <View style={styles.guideline}>
              <Ionicons 
                name="checkmark" 
                size={14} 
                color={/^[a-z0-9_-]+$/.test(username) && username.length > 0 ? AuthColors.successColor : AuthColors.mutedText} 
              />
              <Text style={[
                styles.guidelineText,
                /^[a-z0-9_-]+$/.test(username) && username.length > 0 && styles.guidelineTextValid
              ]}>
                Letters, numbers, _ and - only
              </Text>
            </View>
          </View>
        </View>
      </OnboardingFormCard>

      <OnboardingFooter
        primaryButtonText={loading ? 'Saving...' : 'Continue'}
        onPrimaryPress={handleContinue}
        primaryButtonDisabled={loading || checkingAvailability || !isAvailable}
        primaryButtonLoading={loading}
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
  title: {
    ...AuthTypography.onboardingTitle,
    marginBottom: 8,
  },
  subtitle: {
    ...AuthTypography.bodyText,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  formContent: {
    paddingTop: 16,
  },
  inputContainer: {
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    right: 16,
    top: 45,
  },
  statusIcon: {
    padding: 4,
  },
  guidelinesContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },
  guidelinesTitle: {
    ...AuthTypography.microcopy,
    fontWeight: '600',
    marginBottom: 8,
    color: AuthColors.primaryText,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  guidelineText: {
    ...AuthTypography.microcopy,
    color: AuthColors.mutedText,
  },
  guidelineTextValid: {
    color: AuthColors.successColor,
  },
});

export default UsernameScreen;
