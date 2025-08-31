import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import {
  RegistrationHeader,
  RegistrationCard,
  RegistrationFooter
} from '../../../components/auth/RegistrationComponents';
import { AuthColors } from '../../../components/auth/AuthDesignSystem';
import { useRegistration } from '../../../context/RegistrationContext';
import { smsVerificationService } from '../../../services/smsVerificationService';

const PhoneVerificationScreen: React.FC = () => {
  const {
    registrationData,
    updateRegistrationData,
    currentStep,
    setCurrentStep,
    isLoading,
    setIsLoading,
    error,
    setError
  } = useRegistration();

  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Start resend cooldown on mount and check if verification is already active
  useEffect(() => {
    const phoneNumber = `${registrationData.countryCode}${registrationData.contactValue}`;

    // Check if there's already an active verification
    if (smsVerificationService.hasActiveVerification(phoneNumber)) {
      setResendCooldown(60); // 60 seconds cooldown
    } else {
      // If no active verification, allow immediate resend
      setResendCooldown(0);
    }
  }, [registrationData.countryCode, registrationData.contactValue]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleCodeChange = (value: string, index: number) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setError(null);

    // Auto-advance to next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (newCode.every(digit => digit !== '') && !isVerifying) {
      handleVerifyCode(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (code?: string) => {
    const codeToVerify = code || verificationCode.join('');

    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Ensure consistent phone number formatting (remove any spaces)
      const cleanContactValue = registrationData.contactValue?.replace(/\s/g, '') || '';
      const cleanCountryCode = registrationData.countryCode?.replace(/\s/g, '') || '';
      const phoneNumber = `${cleanCountryCode}${cleanContactValue}`;

      // Debug logging (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Phone Verification Debug:');
        console.log('  Has Country Code:', !!registrationData.countryCode);
        console.log('  Has Contact Value:', !!registrationData.contactValue);
        console.log('  Code Length:', codeToVerify.length);
      }

      const result = await smsVerificationService.verifyCode(phoneNumber, codeToVerify);

      console.log('📱 Verification Result:', result);

      if (result.success) {
        console.log('✅ Verification successful, proceeding to next step');

        // Mark phone as verified and move to next step
        console.log('📝 Updating registration data with phone verification...');
        updateRegistrationData({
          phoneVerified: true,
          phoneVerificationDate: new Date(),
        });

        console.log('🚀 Moving to DisplayName screen (step 3)...');
        console.log('  Current step before:', currentStep);
        console.log('  Current registration data:', registrationData);

        // Move to DisplayName step (same pattern as email flow)
        try {
          setCurrentStep(3);
          console.log('  setCurrentStep(3) completed successfully');
        } catch (error) {
          console.error('  Error calling setCurrentStep:', error);
        }
      } else {
        console.log('❌ Verification failed:', result.error);
        setError(result.error || 'Invalid verification code');
        // Clear the code inputs on error
        setVerificationCode(['', '', '', '', '', '']);
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }
    } catch (err: any) {
      console.log('💥 Verification exception:', err);
      setError(err.message || 'Verification failed. Please try again.');
      setVerificationCode(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const phoneNumber = `${registrationData.countryCode}${registrationData.contactValue}`;
      const result = await smsVerificationService.resendVerificationCode(phoneNumber);

      if (result.success) {
        setResendCooldown(60); // Reset cooldown
        setVerificationCode(['', '', '', '', '', '']); // Clear inputs
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
        Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
      } else {
        setError(result.error || 'Failed to resend code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(1); // Go back to ContactMethodScreen
  };

  const formatPhoneNumber = () => {
    if (!registrationData.countryCode || !registrationData.contactValue) {
      return 'your phone number';
    }
    return `${registrationData.countryCode} ${registrationData.contactValue}`;
  };

  const isCodeComplete = verificationCode.every(digit => digit !== '');

  return (
    <View style={styles.container}>
      <RegistrationHeader
        title="Verify Phone"
        currentStep={2}
        totalSteps={5}
        onBackPress={handleBack}
        showBackButton={true}
      />

      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>
          Enter verification code
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          We sent a 6-digit code to {formatPhoneNumber()}
        </Text>

        {/* Code Input */}
        <View style={styles.codeContainer}>
          {verificationCode.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                digit && styles.codeInputFilled,
                error && styles.codeInputError,
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!isVerifying && !isLoading}
            />
          ))}
        </View>

        {/* Error Message */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Resend Code */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>
            Didn't receive the code?{' '}
            <Text
              style={[
                styles.resendLink,
                (resendCooldown > 0 || isLoading) && styles.resendLinkDisabled,
              ]}
              onPress={resendCooldown === 0 && !isLoading ? handleResendCode : undefined}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </Text>
          </Text>
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Enter the 6-digit code we sent to your phone number to verify your account
          </Text>
        </View>
      </View>

      <RegistrationFooter
        primaryButtonText={isVerifying ? 'Verifying...' : 'Verify'}
        onPrimaryPress={() => handleVerifyCode()}
        primaryButtonDisabled={!isCodeComplete || isVerifying || isLoading}
        primaryButtonLoading={isVerifying}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: AuthColors.primaryText,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: AuthColors.secondaryText,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: AuthColors.inputBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AuthColors.inputBorder,
    fontSize: 24,
    fontWeight: '600',
    color: AuthColors.primaryText,
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: AuthColors.inputBorderFocus,
    backgroundColor: AuthColors.cardBackground,
  },
  codeInputError: {
    borderColor: AuthColors.errorColor,
  },
  errorText: {
    fontSize: 14,
    color: AuthColors.errorColor,
    textAlign: 'center',
    marginBottom: 16,
  },
  resendContainer: {
    marginBottom: 32,
  },
  resendText: {
    fontSize: 14,
    color: AuthColors.mutedText,
    textAlign: 'center',
  },
  resendLink: {
    color: AuthColors.primaryButton,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: AuthColors.mutedText,
    fontWeight: '400',
  },
  helpContainer: {
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },
  helpText: {
    fontSize: 14,
    fontWeight: '400',
    color: AuthColors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PhoneVerificationScreen;
