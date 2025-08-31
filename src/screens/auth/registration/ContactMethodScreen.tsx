import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput } from 'react-native';
import {
  RegistrationHeader,
  RegistrationCard,
  RegistrationFooter
} from '../../../components/auth/RegistrationComponents';
import { AuthColors } from '../../../components/auth/AuthDesignSystem';
import { DiscordSegmentedControl } from '../../../components/onboarding/DiscordSegmentedControl';
import { PhoneNumberInput } from '../../../components/auth/PhoneNumberInput';
import { useRegistration } from '../../../context/RegistrationContext';
import { Country } from '../../../data/countries';
import { smsVerificationService } from '../../../services/smsVerificationService';

interface ContactMethodScreenProps {
  onBackToLanding?: () => void;
  isGuestUpgrade?: boolean;
}

const ContactMethodScreen: React.FC<ContactMethodScreenProps> = ({ onBackToLanding, isGuestUpgrade = false }) => {
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

  const [contactMethod, setContactMethod] = useState<'phone' | 'email'>(
    registrationData.contactMethod || 'email'
  );
  const [contactValue, setContactValue] = useState(registrationData.contactValue || '');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [phoneValidationError, setPhoneValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  const handleContactMethodChange = (method: 'phone' | 'email') => {
    setContactMethod(method);
    setContactValue(''); // Clear input when switching methods
    setError(null);
    setPhoneValidationError(null);
  };

  const handleContactValueChange = (value: string) => {
    setContactValue(value);
    setError(null);
    setPhoneValidationError(null);
  };

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
  };

  const handlePhoneValidationChange = (isValid: boolean, error?: string) => {
    setPhoneValidationError(error || null);
    // Clear the main error if phone validation passes
    if (isValid) {
      setError(null);
    }
  };

  const handleNext = async () => {
    setIsLoading(true);
    setError(null);

    // Validate current input directly (not from context)
    const trimmedValue = contactValue.trim();

    if (!trimmedValue) {
      setError('Please enter your contact information');
      setIsLoading(false);
      return;
    }

    // Validate email format
    if (contactMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedValue)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }
    }

    // Validate phone format
    if (contactMethod === 'phone') {
      // Check if there's a phone validation error
      if (phoneValidationError) {
        setError(phoneValidationError);
        setIsLoading(false);
        return;
      }

      // Basic phone validation as fallback
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(trimmedValue)) {
        setError('Please enter a valid phone number');
        setIsLoading(false);
        return;
      }
    }

    // Update registration data
    const updateData: any = {
      contactMethod,
      contactValue: trimmedValue,
    };

    // Include country information for phone numbers
    if (contactMethod === 'phone' && selectedCountry) {
      updateData.countryCode = selectedCountry.dialCode;
      updateData.countryISO = selectedCountry.iso2;
      updateData.countryName = selectedCountry.name;
    }

    updateRegistrationData(updateData);

    try {
      if (contactMethod === 'phone') {
        // Send SMS verification code with consistent formatting
        const cleanDialCode = selectedCountry?.dialCode?.replace(/\s/g, '') || '';
        const cleanContactValue = trimmedValue.replace(/\s/g, '');
        const phoneNumber = `${cleanDialCode}${cleanContactValue}`;

        if (process.env.NODE_ENV === 'development') {
          console.log('📱 Sending SMS verification');
          console.log('  Country:', selectedCountry?.name);
          console.log('  Phone length:', cleanContactValue.length);
        }

        const result = await smsVerificationService.sendVerificationCode(phoneNumber);

        if (result.success) {
          // Store verification ID if available
          if (result.verificationId) {
            updateRegistrationData({ verificationId: result.verificationId });
          }

          // Move to phone verification step
          setCurrentStep(2);
        } else {
          setError(result.error || 'Failed to send verification code. Please try again.');
        }
      } else {
        // For email registration - implement Option B (skip immediate verification)
        console.log('📧 Email registration selected - skipping immediate verification');

        // Simulate email validation API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mark email as the contact method and skip phone verification
        updateRegistrationData({
          emailVerificationRequired: false, // Will verify later in settings
          skipPhoneVerification: true
        });

        console.log('✅ Email registration setup complete, moving to DisplayName screen');

        // Skip phone verification step for email users
        setCurrentStep(3);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to verify contact information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getInputPlaceholder = () => {
    return contactMethod === 'email' 
      ? 'Enter your email address'
      : 'Enter your phone number';
  };

  const getInputKeyboardType = () => {
    return contactMethod === 'email' ? 'email-address' : 'phone-pad';
  };

  const handleBack = () => {
    if (onBackToLanding) {
      onBackToLanding();
    }
  };

  return (
    <View style={styles.container}>
      <RegistrationHeader
        title={isGuestUpgrade ? "Upgrade Account" : "Sign up"}
        currentStep={1}
        totalSteps={5}
        onBackPress={handleBack}
        showBackButton={true}
      />

      {/* Simplified layout - no complex nesting */}
      <View style={styles.content}>
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {isGuestUpgrade
            ? "Choose your preferred method to upgrade your guest account to a full VuluGO account"
            : "Choose your preferred method to create your VuluGO account"
          }
        </Text>

        {/* Discord-style segmented control */}
        <View style={styles.selectorContainer}>
          <DiscordSegmentedControl
            options={[
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' }
            ]}
            selectedValue={contactMethod}
            onValueChange={(value) => handleContactMethodChange(value as 'email' | 'phone')}
          />
        </View>

        {/* Contact Input */}
        <View style={styles.inputSection}>
          {contactMethod === 'email' ? (
            // Email Input
            <>
              <Text style={styles.inputLabel}>EMAIL ADDRESS *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={contactValue}
                  onChangeText={handleContactValueChange}
                  placeholder={getInputPlaceholder()}
                  placeholderTextColor="#9AA3B2"
                  keyboardType={getInputKeyboardType()}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </>
          ) : (
            // Phone Number Input with Country Code Selector
            <PhoneNumberInput
              value={contactValue}
              onChangeText={handleContactValueChange}
              onCountryChange={handleCountryChange}
              onValidationChange={handlePhoneValidationChange}
              error={phoneValidationError || error}
              disabled={isLoading}
              showValidation={true}
            />
          )}
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            {contactMethod === 'email'
              ? `We'll send you a verification email to ${isGuestUpgrade ? 'upgrade your account' : 'confirm your account'}`
              : `We'll send you a verification code via SMS to ${isGuestUpgrade ? 'upgrade your account' : 'confirm your account'}`
            }
          </Text>
          {contactMethod === 'phone' && selectedCountry && (
            <Text style={styles.countryHelpText}>
              Selected: {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dialCode})
            </Text>
          )}
        </View>
      </View>

      <RegistrationFooter
        primaryButtonText="Next"
        onPrimaryPress={handleNext}
        primaryButtonDisabled={!contactValue.trim() || isLoading}
        primaryButtonLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1117', // Exact dark mode background
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#151924', // Card background
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
  selectorContainer: {
    marginBottom: 24,
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
  helpContainer: {
    backgroundColor: '#0f1117',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  helpText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9AA3B2',
    textAlign: 'center',
    lineHeight: 20,
  },
  countryHelpText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6E69F4',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ContactMethodScreen;
