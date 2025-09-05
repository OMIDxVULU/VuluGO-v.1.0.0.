import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthColors } from '../components/auth/AuthDesignSystem';
import { useRegistration } from '../context/RegistrationContext';

// Import registration screens
import ContactMethodScreen from '../screens/auth/registration/ContactMethodScreen';
import PhoneVerificationScreen from '../screens/auth/registration/PhoneVerificationScreen';
import DisplayNameScreen from '../screens/auth/registration/DisplayNameScreen';
import AccountCreationScreen from '../screens/auth/registration/AccountCreationScreen';
import DateOfBirthScreen from '../screens/auth/registration/DateOfBirthScreen';
import TestInputScreen from '../screens/auth/registration/TestInputScreen';

// Define registration navigation params
export type RegistrationStackParamList = {
  ContactMethod: undefined;
  DisplayName: { contactMethod: 'phone' | 'email'; contactValue: string };
  AccountCreation: { 
    contactMethod: 'phone' | 'email'; 
    contactValue: string; 
    displayName: string;
  };
  DateOfBirth: { 
    contactMethod: 'phone' | 'email'; 
    contactValue: string; 
    displayName: string;
    username: string;
    password: string;
  };
};

// Note: Stack navigator removed in favor of state-based navigation

// Registration step configuration
export const REGISTRATION_STEPS = [
  { key: 'ContactMethod', step: 1, title: 'Contact Method' },
  { key: 'PhoneVerification', step: 2, title: 'Phone Verification' },
  { key: 'DisplayName', step: 3, title: 'Display Name' },
  { key: 'AccountCreation', step: 4, title: 'Account Creation' },
  { key: 'DateOfBirth', step: 5, title: 'Date of Birth' },
] as const;

export const TOTAL_REGISTRATION_STEPS = REGISTRATION_STEPS.length;

// Helper function to get step info
export const getRegistrationStepInfo = (routeName: keyof RegistrationStackParamList) => {
  return REGISTRATION_STEPS.find(step => step.key === routeName);
};

// Helper function to get next step
export const getNextRegistrationStep = (
  currentStep: keyof RegistrationStackParamList
): keyof RegistrationStackParamList | null => {
  const currentStepInfo = getRegistrationStepInfo(currentStep);
  if (!currentStepInfo || currentStepInfo.step >= TOTAL_REGISTRATION_STEPS) {
    return null;
  }
  
  const nextStepInfo = REGISTRATION_STEPS.find(step => step.step === currentStepInfo.step + 1);
  return nextStepInfo ? nextStepInfo.key as keyof RegistrationStackParamList : null;
};

// Helper function to get previous step
export const getPreviousRegistrationStep = (
  currentStep: keyof RegistrationStackParamList
): keyof RegistrationStackParamList | null => {
  const currentStepInfo = getRegistrationStepInfo(currentStep);
  if (!currentStepInfo || currentStepInfo.step <= 1) {
    return null;
  }
  
  const previousStepInfo = REGISTRATION_STEPS.find(step => step.step === currentStepInfo.step - 1);
  return previousStepInfo ? previousStepInfo.key as keyof RegistrationStackParamList : null;
};

// Registration data interface
export interface RegistrationData {
  contactMethod: 'phone' | 'email';
  contactValue: string;
  displayName: string;
  username: string;
  password: string;
  dateOfBirth: Date;
  // Phone number specific fields
  countryCode?: string; // e.g., "+1"
  countryISO?: string; // e.g., "US"
  countryName?: string; // e.g., "United States"
  // Phone verification fields
  phoneVerified?: boolean;
  phoneVerificationDate?: Date;
  verificationId?: string;
  // Email verification fields (Option B - verify later)
  emailVerificationRequired?: boolean;
  skipPhoneVerification?: boolean;
}

interface RegistrationNavigatorProps {
  onBackToLanding?: () => void;
}

const RegistrationNavigator: React.FC<RegistrationNavigatorProps> = ({ onBackToLanding }) => {
  const { currentStep, registrationData, setCurrentStep, isGuestUpgrade } = useRegistration();

  const renderCurrentStep = () => {
    console.log('🎯 RegistrationNavigator - renderCurrentStep called with step:', currentStep);
    console.log('  Registration data:', {
      contactMethod: registrationData.contactMethod,
      skipPhoneVerification: registrationData.skipPhoneVerification
    });

    switch (currentStep) {
      case 1:
        console.log('  → Rendering ContactMethodScreen');
        return <ContactMethodScreen onBackToLanding={onBackToLanding} isGuestUpgrade={isGuestUpgrade} />;
      case 2:
        // CRITICAL FIX: Skip phone verification for email users
        if (registrationData.contactMethod === 'email' || registrationData.skipPhoneVerification) {
          console.log('  → Skipping PhoneVerificationScreen for email user, jumping to DisplayNameScreen');
          // Automatically advance to next step for email users
          if (currentStep === 2) {
            setCurrentStep(3);
          }
          return <DisplayNameScreen />;
        }
        console.log('  → Rendering PhoneVerificationScreen');
        return <PhoneVerificationScreen />;
      case 3:
        console.log('  → Rendering DisplayNameScreen');
        return <DisplayNameScreen />;
      case 4:
        console.log('  → Rendering AccountCreationScreen');
        return <AccountCreationScreen />;
      case 5:
        console.log('  → Rendering DateOfBirthScreen');
        return <DateOfBirthScreen />;
      default:
        console.log('  → Rendering default ContactMethodScreen');
        return <ContactMethodScreen onBackToLanding={onBackToLanding} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
});

export default RegistrationNavigator;
