import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { RegistrationData } from '../navigation/RegistrationNavigator';
import { useAuth } from './AuthContext';

// Registration context interface
interface RegistrationContextType {
  // Data
  registrationData: Partial<RegistrationData>;
  updateRegistrationData: (updates: Partial<RegistrationData>) => void;
  resetRegistrationData: () => void;
  
  // Progress tracking
  currentStep: number;
  totalSteps: number;
  setCurrentStep: (step: number) => void;
  
  // Validation
  validateStep: (step: number) => { isValid: boolean; error?: string };
  canProceedToNextStep: () => boolean;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Error handling
  error: string | null;
  setError: (error: string | null) => void;

  // Guest upgrade mode
  isGuestUpgrade: boolean;
}

// Default registration data
const defaultRegistrationData: Partial<RegistrationData> = {
  contactMethod: undefined,
  contactValue: '',
  displayName: '',
  username: '',
  password: '',
  dateOfBirth: undefined,
  countryCode: undefined,
  countryISO: undefined,
  countryName: undefined,
  phoneVerified: false,
  phoneVerificationDate: undefined,
  verificationId: undefined,
  skipPhoneVerification: false,
  emailVerificationRequired: false,
};

// Create context
const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

// Provider component
interface RegistrationProviderProps {
  children: ReactNode;
  isGuestUpgrade?: boolean;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({
  children,
  isGuestUpgrade = false
}) => {
  const { userProfile } = useAuth();
  const [registrationData, setRegistrationData] = useState<Partial<RegistrationData>>(defaultRegistrationData);
  const [currentStep, setCurrentStepInternal] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalSteps = 5;

  // Initialize guest upgrade data
  useEffect(() => {
    if (isGuestUpgrade && userProfile) {
      console.log('🎭 Initializing guest upgrade with profile:', userProfile);
      setRegistrationData(prev => ({
        ...prev,
        displayName: userProfile.displayName || 'Guest',
        contactMethod: 'email', // Default to email for guest upgrades
      }));
    }
  }, [isGuestUpgrade, userProfile]);

  // Debug wrapper for setCurrentStep
  const setCurrentStep = useCallback((step: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 RegistrationContext - setCurrentStep called:');
      console.log('  From step:', currentStep);
      console.log('  To step:', step);
      // Only log non-sensitive fields
      console.log('  Registration step info:', {
        hasContactValue: !!registrationData.contactValue,
        contactMethod: registrationData.contactMethod,
        hasDisplayName: !!registrationData.displayName
      });
    }
    setCurrentStepInternal(step);
  }, [currentStep, registrationData]);

  // Update registration data
  const updateRegistrationData = useCallback((updates: Partial<RegistrationData>) => {
    setRegistrationData(prev => ({ ...prev, ...updates }));
    setError(null); // Clear error when data is updated
  }, []);

  // Reset registration data
  const resetRegistrationData = useCallback(() => {
    setRegistrationData(defaultRegistrationData);
    setCurrentStep(1);
    setError(null);
    setIsLoading(false);
  }, []);

  // Validation for each step
  const validateStep = useCallback((step: number): { isValid: boolean; error?: string } => {
    switch (step) {
      case 1: // Contact Method
        if (!registrationData.contactMethod) {
          return { isValid: false, error: 'Please select a contact method' };
        }
        if (!registrationData.contactValue?.trim()) {
          return { isValid: false, error: 'Please enter your contact information' };
        }
        if (registrationData.contactMethod === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(registrationData.contactValue)) {
            return { isValid: false, error: 'Please enter a valid email address' };
          }
        }
        if (registrationData.contactMethod === 'phone') {
          // Enhanced phone validation - check for country code and proper format
          const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
          if (!phoneRegex.test(registrationData.contactValue)) {
            return { isValid: false, error: 'Please enter a valid phone number' };
          }

          // Check if country information is available for phone numbers
          if (!registrationData.countryCode || !registrationData.countryISO) {
            return { isValid: false, error: 'Please select a country for your phone number' };
          }
        }
        return { isValid: true };

      case 2: // Phone Verification (only for phone contact method)
        if (registrationData.contactMethod === 'phone') {
          if (!registrationData.phoneVerified) {
            return { isValid: false, error: 'Please verify your phone number' };
          }
        }
        return { isValid: true };

      case 3: // Display Name
        if (!registrationData.displayName?.trim()) {
          return { isValid: false, error: 'Please enter your display name' };
        }
        if (registrationData.displayName.length < 2) {
          return { isValid: false, error: 'Display name must be at least 2 characters' };
        }
        if (registrationData.displayName.length > 50) {
          return { isValid: false, error: 'Display name must be less than 50 characters' };
        }
        return { isValid: true };

      case 4: // Account Creation
        if (!registrationData.username?.trim()) {
          return { isValid: false, error: 'Please enter a username' };
        }
        if (registrationData.username.length < 3) {
          return { isValid: false, error: 'Username must be at least 3 characters' };
        }
        if (registrationData.username.length > 20) {
          return { isValid: false, error: 'Username must be less than 20 characters' };
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(registrationData.username)) {
          return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
        }
        if (!registrationData.password) {
          return { isValid: false, error: 'Please enter a password' };
        }
        if (registrationData.password.length < 8) {
          return { isValid: false, error: 'Password must be at least 8 characters' };
        }
        if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(registrationData.password)) {
          return { isValid: false, error: 'Password must contain at least one letter and one number' };
        }
        return { isValid: true };

      case 5: // Date of Birth
        if (!registrationData.dateOfBirth) {
          return { isValid: false, error: 'Please enter your date of birth' };
        }
        const today = new Date();
        const age = today.getFullYear() - registrationData.dateOfBirth.getFullYear();
        const monthDiff = today.getMonth() - registrationData.dateOfBirth.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < registrationData.dateOfBirth.getDate()) 
          ? age - 1 
          : age;
        if (actualAge < 13) {
          return { isValid: false, error: 'You must be at least 13 years old to create an account' };
        }
        if (actualAge > 120) {
          return { isValid: false, error: 'Please enter a valid date of birth' };
        }
        return { isValid: true };

      default:
        return { isValid: false, error: 'Invalid step' };
    }
  }, [registrationData]);

  // Check if can proceed to next step
  const canProceedToNextStep = useCallback(() => {
    const validation = validateStep(currentStep);
    return validation.isValid;
  }, [currentStep, validateStep]);

  const value: RegistrationContextType = {
    registrationData,
    updateRegistrationData,
    resetRegistrationData,
    currentStep,
    totalSteps,
    setCurrentStep,
    validateStep,
    canProceedToNextStep,
    isLoading,
    setIsLoading,
    error,
    setError,
    isGuestUpgrade,
  };

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
};

// Hook to use registration context
export const useRegistration = (): RegistrationContextType => {
  const context = useContext(RegistrationContext);
  if (context === undefined) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  return context;
};

export default RegistrationContext;
