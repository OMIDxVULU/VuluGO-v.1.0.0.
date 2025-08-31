import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { 
  RegistrationHeader, 
  RegistrationCard, 
  RegistrationFooter 
} from '../../../components/auth/RegistrationComponents';

import { AuthColors } from '../../../components/auth/AuthDesignSystem';
import { useRegistration } from '../../../context/RegistrationContext';

const DisplayNameScreen: React.FC = () => {
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

  const [displayName, setDisplayName] = useState(registrationData.displayName || '');

  React.useEffect(() => {
    setCurrentStep(2);
  }, [setCurrentStep]);

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setError(null);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleNext = async () => {
    setIsLoading(true);
    setError(null);

    // Validate current input directly (not from context)
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setError('Please enter a display name');
      setIsLoading(false);
      return;
    }

    if (trimmedDisplayName.length < 2) {
      setError('Display name must be at least 2 characters long');
      setIsLoading(false);
      return;
    }

    if (trimmedDisplayName.length > 50) {
      setError('Display name must be 50 characters or less');
      setIsLoading(false);
      return;
    }

    // Update registration data
    updateRegistrationData({
      displayName: trimmedDisplayName,
    });

    // Simulate processing delay
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Move to next step
      setCurrentStep(3);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCharacterCount = () => {
    return `${displayName.length}/50`;
  };

  const isCharacterLimitExceeded = () => {
    return displayName.length > 50;
  };

  return (
    <View style={styles.container}>
      <RegistrationHeader
        title="What's your name?"
        currentStep={2}
        totalSteps={4}
        onBackPress={handleBack}
        showBackButton={true}
      />

      {/* Simplified layout - no complex nesting */}
      <View style={styles.content}>
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          This is the name that will be displayed to other users on VuluGO
        </Text>

        {/* Display Name Input - DIRECT IMPLEMENTATION */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>DISPLAY NAME *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={handleDisplayNameChange}
              placeholder="Enter your display name"
              placeholderTextColor="#9AA3B2"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
              editable={!isLoading}
            />
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Character Counter */}
          <View style={styles.characterCounter}>
            <Text style={[
              styles.characterCountText,
              isCharacterLimitExceeded() && styles.characterCountError
            ]}>
              {getCharacterCount()}
            </Text>
          </View>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelinesContainer}>
          <Text style={styles.guidelinesTitle}>Display Name Guidelines:</Text>
          <View style={styles.guideline}>
            <Text style={styles.guidelineBullet}>•</Text>
            <Text style={styles.guidelineText}>
              Use your real name or a name you'd like to be known by
            </Text>
          </View>
          <View style={styles.guideline}>
            <Text style={styles.guidelineBullet}>•</Text>
            <Text style={styles.guidelineText}>
              Must be between 2-50 characters long
            </Text>
          </View>
          <View style={styles.guideline}>
            <Text style={styles.guidelineBullet}>•</Text>
            <Text style={styles.guidelineText}>
              You can change this later in your profile settings
            </Text>
          </View>
        </View>

        {/* Contact Info Display */}
        <View style={styles.contactInfoContainer}>
          <Text style={styles.contactInfoLabel}>
            {registrationData.contactMethod === 'email' ? 'Email:' : 'Phone:'}
          </Text>
          <Text style={styles.contactInfoValue}>
            {registrationData.contactValue}
          </Text>
        </View>
      </View>

      <RegistrationFooter
        primaryButtonText="Next"
        onPrimaryPress={handleNext}
        primaryButtonDisabled={
          !displayName.trim() || 
          displayName.length < 2 || 
          isCharacterLimitExceeded() || 
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
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 8,
  },
  characterCounter: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  characterCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9AA3B2',
  },
  characterCountError: {
    color: '#FF6B6B',
  },
  guidelinesContainer: {
    backgroundColor: '#0f1117',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#252A3A',
    marginBottom: 24,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  guidelineBullet: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5865F2',
    marginRight: 8,
    marginTop: 1,
  },
  guidelineText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#9AA3B2',
    lineHeight: 20,
  },
  contactInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#0f1117',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  contactInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9AA3B2',
    marginRight: 8,
  },
  contactInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DisplayNameScreen;
