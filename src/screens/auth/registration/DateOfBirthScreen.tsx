import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  RegistrationHeader, 
  RegistrationCard, 
  RegistrationFooter 
} from '../../../components/auth/RegistrationComponents';
import { AuthColors } from '../../../components/auth/AuthDesignSystem';
import { useRegistration } from '../../../context/RegistrationContext';
import { useAuth } from '../../../context/AuthContext';

const DateOfBirthScreen: React.FC = () => {
  const router = useRouter();
  const { signUp } = useAuth();
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

  const [dateOfBirth, setDateOfBirth] = useState<Date>(
    registrationData.dateOfBirth || new Date(2000, 0, 1)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasSelectedDate, setHasSelectedDate] = useState(!!registrationData.dateOfBirth);

  React.useEffect(() => {
    setCurrentStep(4);
  }, [setCurrentStep]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      setHasSelectedDate(true);
      setError(null);
    }
  };

  const handleBack = () => {
    setCurrentStep(3);
  };

  const handleCreateAccount = async () => {
    setIsLoading(true);
    setError(null);

    // Update registration data
    updateRegistrationData({
      dateOfBirth,
    });

    // Validate current input directly (not from context)
    const age = getAge();
    if (age < 13) {
      Alert.alert(
        'Age Requirement',
        'You must be at least 13 years old to create a VuluGO account. This is required by law to protect your privacy.',
        [
          {
            text: 'Go Back',
            onPress: () => {
              setIsLoading(false);
              setCurrentStep(3);
            }
          }
        ]
      );
      return;
    }

    if (age > 120) {
      setError('Please enter a valid date of birth');
      setIsLoading(false);
      return;
    }



    try {
      // Create Firebase account
      const email = registrationData.contactMethod === 'email'
        ? registrationData.contactValue
        : `${registrationData.username}@temp.vulugotemp.com`;
      await signUp(
        email!,
        registrationData.password!,
        registrationData.displayName!,
        registrationData.username!
      );

      // Navigate to main app or onboarding
      router.replace('/(main)');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${day}/${month}/${year}`;
  };

  const getAge = () => {
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    return monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate()) 
      ? age - 1 
      : age;
  };

  return (
    <View style={styles.container}>
      <RegistrationHeader
        title="When's your birthday?"
        currentStep={4}
        totalSteps={4}
        onBackPress={handleBack}
        showBackButton={true}
      />

      {/* Simplified layout - no complex nesting */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          We need to verify your age to ensure you can safely use our platform
        </Text>

          {/* Date Display */}
          <TouchableOpacity
            style={[
              styles.dateButton,
              hasSelectedDate ? styles.dateButtonFilled : styles.dateButtonEmpty
            ]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.dateButtonLabel,
              hasSelectedDate ? styles.dateButtonLabelFilled : styles.dateButtonLabelEmpty
            ]}>
              DATE OF BIRTH
            </Text>
            <Text style={[
              styles.dateButtonValue,
              hasSelectedDate ? styles.dateButtonValueFilled : styles.dateButtonValueEmpty
            ]}>
              {hasSelectedDate ? formatDate(dateOfBirth) : 'Select your date of birth'}
            </Text>
            <Text style={[
              styles.dateButtonHelper,
              hasSelectedDate ? styles.dateButtonHelperFilled : styles.dateButtonHelperEmpty
            ]}>
              {hasSelectedDate ? 'Tap to change date' : 'Tap to select date'}
            </Text>
          </TouchableOpacity>

          {/* Age Display */}
          <View style={styles.ageContainer}>
            <Text style={styles.ageLabel}>Your age:</Text>
            <Text style={styles.ageValue}>
              {getAge()} years old
            </Text>
          </View>

          {/* Privacy Notice */}
          <View style={styles.privacyContainer}>
            <Text style={styles.privacyText}>
              🔒 Your date of birth is kept private and secure. We use this information only for age verification and will never share it with other users.
            </Text>
          </View>

          {/* Account Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Account Summary:</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Display Name:</Text>
              <Text style={styles.summaryValue}>{registrationData.displayName}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Username:</Text>
              <Text style={styles.summaryValue}>@{registrationData.username}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                {registrationData.contactMethod === 'email' ? 'Email:' : 'Phone:'}
              </Text>
              <Text style={styles.summaryValue}>{registrationData.contactValue}</Text>
            </View>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
      </View>

      <RegistrationFooter
        primaryButtonText={isLoading ? 'Creating Account...' : 'Create Account'}
        onPrimaryPress={handleCreateAccount}
        primaryButtonDisabled={isLoading}
        primaryButtonLoading={isLoading}
      />

      {/* Date Picker with Modal Background */}
      {showDatePicker && (
        <View style={styles.datePickerModal}>
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={dateOfBirth}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
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
  dateButton: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 120,
    justifyContent: 'center',
  },
  // Empty state (unfilled) - muted, grayed-out appearance
  dateButtonEmpty: {
    backgroundColor: '#0f1117',
    borderColor: '#1F2937',
    borderStyle: 'dashed',
  },
  // Filled state - vibrant, active appearance
  dateButtonFilled: {
    backgroundColor: '#151924',
    borderColor: '#5865F2',
    borderStyle: 'solid',
    shadowColor: '#5865F2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dateButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dateButtonLabelEmpty: {
    color: '#6B7280',
  },
  dateButtonLabelFilled: {
    color: '#5865F2',
  },
  dateButtonValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  dateButtonValueEmpty: {
    color: '#6B7280',
    fontSize: 16,
    fontStyle: 'italic',
  },
  dateButtonValueFilled: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  dateButtonHelper: {
    fontSize: 14,
    fontWeight: '400',
  },
  dateButtonHelperEmpty: {
    color: '#6B7280',
  },
  dateButtonHelperFilled: {
    color: '#9AA3B2',
  },
  ageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#0f1117',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  ageLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9AA3B2',
    marginRight: 8,
  },
  ageValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5865F2',
  },
  privacyContainer: {
    backgroundColor: AuthColors.background,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: AuthColors.divider,
    marginBottom: 24,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '400',
    color: AuthColors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryContainer: {
    backgroundColor: AuthColors.background,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: AuthColors.divider,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AuthColors.primaryText,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: AuthColors.mutedText,
    width: 100,
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: AuthColors.primaryText,
  },
  errorContainer: {
    backgroundColor: AuthColors.errorColor,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // Date Picker Modal Styles
  datePickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerContainer: {
    backgroundColor: '#151924',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  datePickerDone: {
    backgroundColor: '#5865F2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DateOfBirthScreen;
