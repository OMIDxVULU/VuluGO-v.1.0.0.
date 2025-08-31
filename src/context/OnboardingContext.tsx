import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Onboarding data interface
export interface OnboardingData {
  // Basic account info
  email: string;
  username: string;
  password: string;
  displayName: string;
  dateOfBirth: Date | null;
  
  // Preferences
  theme: 'dark' | 'light';
  interests: string[];
  
  // Permissions
  notificationsEnabled: boolean;
  contactsPermissionGranted: boolean;
  
  // Profile
  avatarUri: string | null;
  
  // Phone verification
  phoneNumber: string;
  phoneVerified: boolean;
  
  // Terms
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

// Onboarding context interface
interface OnboardingContextType {
  // Data
  onboardingData: OnboardingData;
  updateOnboardingData: (updates: Partial<OnboardingData>) => void;
  resetOnboardingData: () => void;
  
  // Progress tracking
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  markStepCompleted: (step: number) => void;
  isStepCompleted: (step: number) => boolean;
  
  // Navigation helpers
  canProceedToNextStep: () => boolean;
  getNextStepValidation: () => string | null;
  
  // Persistence
  saveOnboardingProgress: () => Promise<void>;
  loadOnboardingProgress: () => Promise<void>;
  clearOnboardingProgress: () => Promise<void>;
  
  // Completion
  isOnboardingComplete: () => boolean;
  completeOnboarding: () => Promise<void>;
}

// Default onboarding data
const defaultOnboardingData: OnboardingData = {
  email: '',
  username: '',
  password: '',
  displayName: '',
  dateOfBirth: null,
  theme: 'dark',
  interests: [],
  notificationsEnabled: false,
  contactsPermissionGranted: false,
  avatarUri: null,
  phoneNumber: '',
  phoneVerified: false,
  termsAccepted: false,
  privacyAccepted: false,
};

// Create context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Storage keys
const ONBOARDING_DATA_KEY = '@onboarding_data';
const ONBOARDING_PROGRESS_KEY = '@onboarding_progress';

// Provider component
interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(defaultOnboardingData);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const totalSteps = 17;

  // Update onboarding data
  const updateOnboardingData = useCallback((updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset onboarding data
  const resetOnboardingData = useCallback(() => {
    setOnboardingData(defaultOnboardingData);
    setCurrentStep(1);
    setCompletedSteps([]);
  }, []);

  // Mark step as completed
  const markStepCompleted = useCallback((step: number) => {
    setCompletedSteps(prev => {
      if (!prev.includes(step)) {
        return [...prev, step].sort((a, b) => a - b);
      }
      return prev;
    });
    
    // Update current step if this is the next sequential step
    if (step === currentStep) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  }, [currentStep, totalSteps]);

  // Check if step is completed
  const isStepCompleted = useCallback((step: number) => {
    return completedSteps.includes(step);
  }, [completedSteps]);

  // Validation for each step
  const getNextStepValidation = useCallback((): string | null => {
    switch (currentStep) {
      case 1: // Welcome
        return null; // No validation needed
      case 2: // Age Gate
        if (!onboardingData.dateOfBirth) {
          return 'Please enter your date of birth';
        }
        const age = new Date().getFullYear() - onboardingData.dateOfBirth.getFullYear();
        if (age < 13) {
          return 'You must be at least 13 years old to use this app';
        }
        return null;
      case 3: // Username
        if (!onboardingData.username.trim()) {
          return 'Please enter a username';
        }
        if (onboardingData.username.length < 3) {
          return 'Username must be at least 3 characters';
        }
        return null;
      case 4: // Email
        if (!onboardingData.email.trim()) {
          return 'Please enter your email';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(onboardingData.email)) {
          return 'Please enter a valid email address';
        }
        return null;
      case 5: // Password
        if (!onboardingData.password) {
          return 'Please enter a password';
        }
        if (onboardingData.password.length < 8) {
          return 'Password must be at least 8 characters';
        }
        return null;
      case 6: // Terms
        if (!onboardingData.termsAccepted) {
          return 'Please accept the terms and conditions';
        }
        return null;
      default:
        return null; // Other steps don't require validation
    }
  }, [currentStep, onboardingData]);

  // Check if can proceed to next step
  const canProceedToNextStep = useCallback(() => {
    return getNextStepValidation() === null;
  }, [getNextStepValidation]);

  // Save onboarding progress to AsyncStorage
  const saveOnboardingProgress = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify({
        ...onboardingData,
        dateOfBirth: onboardingData.dateOfBirth?.toISOString() || null,
      }));
      await AsyncStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify({
        currentStep,
        completedSteps,
      }));
    } catch (error) {
      // Handle AsyncStorage errors gracefully in development environment
      console.warn('AsyncStorage unavailable in development environment, onboarding progress not saved');
    }
  }, [onboardingData, currentStep, completedSteps]);

  // Load onboarding progress from AsyncStorage
  const loadOnboardingProgress = useCallback(async () => {
    try {
      const dataString = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      const progressString = await AsyncStorage.getItem(ONBOARDING_PROGRESS_KEY);

      if (dataString) {
        const data = JSON.parse(dataString);
        setOnboardingData({
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        });
      }

      if (progressString) {
        const progress = JSON.parse(progressString);
        setCurrentStep(progress.currentStep || 1);
        setCompletedSteps(progress.completedSteps || []);
      }
    } catch (error) {
      // Handle AsyncStorage errors gracefully in development environment
      console.warn('AsyncStorage unavailable in development environment, using default onboarding state');
      // Continue with default values - onboarding will start from step 1
    }
  }, []);

  // Clear onboarding progress
  const clearOnboardingProgress = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_DATA_KEY);
      await AsyncStorage.removeItem(ONBOARDING_PROGRESS_KEY);
      resetOnboardingData();
    } catch (error) {
      // Handle AsyncStorage errors gracefully in development environment
      console.warn('AsyncStorage unavailable in development environment, clearing local state only');
      // Still reset the local data even if storage fails
      resetOnboardingData();
    }
  }, [resetOnboardingData]);

  // Check if onboarding is complete
  const isOnboardingComplete = useCallback(() => {
    return completedSteps.length === totalSteps && currentStep > totalSteps;
  }, [completedSteps, currentStep, totalSteps]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    try {
      // Mark all steps as completed
      setCompletedSteps(Array.from({ length: totalSteps }, (_, i) => i + 1));
      setCurrentStep(totalSteps + 1);

      // Save completion status
      await AsyncStorage.setItem('@onboarding_completed', 'true');

      // Clear progress data (no longer needed)
      await clearOnboardingProgress();
    } catch (error) {
      // Handle AsyncStorage errors gracefully in development environment
      console.warn('AsyncStorage unavailable in development environment, onboarding completion not persisted');
      // Still mark as completed locally so the flow continues
      setCompletedSteps(Array.from({ length: totalSteps }, (_, i) => i + 1));
      setCurrentStep(totalSteps + 1);
    }
  }, [totalSteps, clearOnboardingProgress]);

  const value: OnboardingContextType = {
    onboardingData,
    updateOnboardingData,
    resetOnboardingData,
    currentStep,
    totalSteps,
    completedSteps,
    markStepCompleted,
    isStepCompleted,
    canProceedToNextStep,
    getNextStepValidation,
    saveOnboardingProgress,
    loadOnboardingProgress,
    clearOnboardingProgress,
    isOnboardingComplete,
    completeOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Hook to use onboarding context
export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;
