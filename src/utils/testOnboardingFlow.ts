// Test utility for onboarding flow
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingData } from '../context/OnboardingContext';
import { validateStep, validateCompleteOnboarding } from './onboardingValidation';

// Test data for onboarding flow
export const mockOnboardingData: OnboardingData = {
  email: 'test@example.com',
  username: 'testuser123',
  password: 'TestPassword123',
  displayName: 'Test User',
  dateOfBirth: new Date(1995, 5, 15), // June 15, 1995
  theme: 'dark',
  interests: ['Music', 'Gaming', 'Technology'],
  notificationsEnabled: true,
  contactsPermissionGranted: false,
  avatarUri: null,
  phoneNumber: '+1234567890',
  phoneVerified: false,
  termsAccepted: true,
  privacyAccepted: true,
};

// Test cases for validation
export const testValidationCases = () => {
  console.log('🧪 Testing Onboarding Validation...');
  
  // Test each step validation
  for (let step = 1; step <= 17; step++) {
    const result = validateStep(step, mockOnboardingData);
    console.log(`Step ${step}: ${result.isValid ? '✅ Valid' : '❌ Invalid'} ${result.error || ''}`);
  }
  
  // Test complete onboarding validation
  const completeValidation = validateCompleteOnboarding(mockOnboardingData);
  console.log(`Complete Onboarding: ${completeValidation.isValid ? '✅ Valid' : '❌ Invalid'} ${completeValidation.error || ''}`);
};

// Test onboarding persistence
export const testOnboardingPersistence = async () => {
  console.log('🧪 Testing Onboarding Persistence...');
  
  try {
    // Clear any existing data
    await AsyncStorage.removeItem('@onboarding_data');
    await AsyncStorage.removeItem('@onboarding_progress');
    await AsyncStorage.removeItem('@onboarding_completed');
    
    // Test saving onboarding data
    await AsyncStorage.setItem('@onboarding_data', JSON.stringify({
      ...mockOnboardingData,
      dateOfBirth: mockOnboardingData.dateOfBirth?.toISOString(),
    }));
    
    // Test saving progress
    await AsyncStorage.setItem('@onboarding_progress', JSON.stringify({
      currentStep: 10,
      completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    }));
    
    // Test loading data
    const savedData = await AsyncStorage.getItem('@onboarding_data');
    const savedProgress = await AsyncStorage.getItem('@onboarding_progress');
    
    if (savedData && savedProgress) {
      const data = JSON.parse(savedData);
      const progress = JSON.parse(savedProgress);
      
      console.log('✅ Data saved and loaded successfully');
      console.log(`Current step: ${progress.currentStep}`);
      console.log(`Completed steps: ${progress.completedSteps.length}`);
      console.log(`User email: ${data.email}`);
    } else {
      console.log('❌ Failed to save/load data');
    }
    
    // Test completion
    await AsyncStorage.setItem('@onboarding_completed', 'true');
    const completed = await AsyncStorage.getItem('@onboarding_completed');
    console.log(`Onboarding completed: ${completed === 'true' ? '✅ Yes' : '❌ No'}`);
    
  } catch (error) {
    console.error('❌ Persistence test failed:', error);
  }
};

// Test navigation flow
export const testNavigationFlow = () => {
  console.log('🧪 Testing Navigation Flow...');
  
  const steps = [
    'Welcome', 'AgeGate', 'Username', 'Email', 'Password', 'Terms',
    'PermissionsIntro', 'NotificationsPermission', 'AvatarPicker', 'ThemeChoice',
    'Interests', 'ContactsIntro', 'ContactsPermission', 'PhoneIntro',
    'PhoneVerification', 'Success', 'HomeHandoff'
  ];
  
  console.log(`Total steps: ${steps.length}`);
  console.log('Navigation sequence:');
  steps.forEach((step, index) => {
    console.log(`${index + 1}. ${step}`);
  });
  
  // Test step info retrieval
  const { getStepInfo, getNextStep, getPreviousStep } = require('../navigation/OnboardingNavigator');
  
  console.log('\nStep transitions:');
  steps.forEach((step, index) => {
    const stepInfo = getStepInfo(step);
    const nextStep = getNextStep(step);
    const prevStep = getPreviousStep(step);
    
    console.log(`${step}: Step ${stepInfo?.step || 'Unknown'} -> Next: ${nextStep || 'None'}, Prev: ${prevStep || 'None'}`);
  });
};

// Test error handling
export const testErrorHandling = () => {
  console.log('🧪 Testing Error Handling...');
  
  // Test invalid data
  const invalidData: Partial<OnboardingData> = {
    email: 'invalid-email',
    username: 'ab', // too short
    password: '123', // too weak
    dateOfBirth: new Date(2020, 0, 1), // too young
    interests: [], // empty
  };
  
  console.log('Testing invalid data:');
  for (let step = 1; step <= 17; step++) {
    const result = validateStep(step, invalidData as OnboardingData);
    if (!result.isValid) {
      console.log(`Step ${step}: ❌ ${result.error}`);
    }
  }
};

// Run all tests
export const runOnboardingTests = async () => {
  console.log('🚀 Starting Onboarding Flow Tests...\n');
  
  testValidationCases();
  console.log('\n');
  
  await testOnboardingPersistence();
  console.log('\n');
  
  testNavigationFlow();
  console.log('\n');
  
  testErrorHandling();
  console.log('\n');
  
  console.log('✅ All onboarding tests completed!');
};

// Test checklist for manual testing
export const manualTestChecklist = [
  '1. ✅ Welcome screen displays with hero illustration and features',
  '2. ✅ Age gate accepts valid birth date and rejects underage users',
  '3. ✅ Username validation works with availability checking',
  '4. ✅ Email validation and availability checking works',
  '5. ✅ Password strength indicator updates correctly',
  '6. ✅ Terms screen requires checkbox acceptance',
  '7. ✅ Permission screens handle allow/deny correctly',
  '8. ✅ Avatar picker allows upload and skip',
  '9. ✅ Theme selection works (dark theme selected by default)',
  '10. ✅ Interest selection requires at least one choice',
  '11. ✅ Contact permission can be skipped',
  '12. ✅ Phone verification can be skipped for users under 16',
  '13. ✅ Success screen shows completion message',
  '14. ✅ Home handoff completes onboarding and navigates to main app',
  '15. ✅ Back navigation works correctly between steps',
  '16. ✅ Progress dots show current step accurately',
  '17. ✅ Data persistence works across app restarts',
  '18. ✅ Error states display appropriate messages',
  '19. ✅ Loading states show during async operations',
  '20. ✅ Completed onboarding prevents re-entry to flow',
];

export default {
  runOnboardingTests,
  testValidationCases,
  testOnboardingPersistence,
  testNavigationFlow,
  testErrorHandling,
  manualTestChecklist,
  mockOnboardingData,
};
