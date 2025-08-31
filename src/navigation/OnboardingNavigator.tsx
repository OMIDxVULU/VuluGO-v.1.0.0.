import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthColors } from '../components/auth/AuthDesignSystem';

// Import onboarding screens (will be created in Phase 3)
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import AgeGateScreen from '../screens/onboarding/AgeGateScreen';
import UsernameScreen from '../screens/onboarding/UsernameScreen';
import EmailScreen from '../screens/onboarding/EmailScreen';
import PasswordScreen from '../screens/onboarding/PasswordScreen';
import TermsScreen from '../screens/onboarding/TermsScreen';
import PermissionsIntroScreen from '../screens/onboarding/PermissionsIntroScreen';
import NotificationsPermissionScreen from '../screens/onboarding/NotificationsPermissionScreen';
import AvatarPickerScreen from '../screens/onboarding/AvatarPickerScreen';
import ThemeChoiceScreen from '../screens/onboarding/ThemeChoiceScreen';
import InterestsScreen from '../screens/onboarding/InterestsScreen';
import ContactsIntroScreen from '../screens/onboarding/ContactsIntroScreen';
import ContactsPermissionScreen from '../screens/onboarding/ContactsPermissionScreen';
import PhoneIntroScreen from '../screens/onboarding/PhoneIntroScreen';
import PhoneVerificationScreen from '../screens/onboarding/PhoneVerificationScreen';
import SuccessScreen from '../screens/onboarding/SuccessScreen';
import HomeHandoffScreen from '../screens/onboarding/HomeHandoffScreen';

// Define onboarding navigation params
export type OnboardingStackParamList = {
  Welcome: undefined;
  AgeGate: undefined;
  Username: undefined;
  Email: undefined;
  Password: undefined;
  Terms: undefined;
  PermissionsIntro: undefined;
  NotificationsPermission: undefined;
  AvatarPicker: undefined;
  ThemeChoice: undefined;
  Interests: undefined;
  ContactsIntro: undefined;
  ContactsPermission: undefined;
  PhoneIntro: undefined;
  PhoneVerification: { phoneNumber?: string };
  Success: undefined;
  HomeHandoff: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

// Onboarding step configuration
export const ONBOARDING_STEPS = [
  { key: 'Welcome', step: 1, title: 'Welcome' },
  { key: 'AgeGate', step: 2, title: 'Age Verification' },
  { key: 'Username', step: 3, title: 'Username' },
  { key: 'Email', step: 4, title: 'Email' },
  { key: 'Password', step: 5, title: 'Password' },
  { key: 'Terms', step: 6, title: 'Terms & Privacy' },
  { key: 'PermissionsIntro', step: 7, title: 'Permissions' },
  { key: 'NotificationsPermission', step: 8, title: 'Notifications' },
  { key: 'AvatarPicker', step: 9, title: 'Avatar' },
  { key: 'ThemeChoice', step: 10, title: 'Theme' },
  { key: 'Interests', step: 11, title: 'Interests' },
  { key: 'ContactsIntro', step: 12, title: 'Contacts' },
  { key: 'ContactsPermission', step: 13, title: 'Contacts Permission' },
  { key: 'PhoneIntro', step: 14, title: 'Phone Number' },
  { key: 'PhoneVerification', step: 15, title: 'Verification' },
  { key: 'Success', step: 16, title: 'Success' },
  { key: 'HomeHandoff', step: 17, title: 'Welcome to VuluGO' },
] as const;

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

// Helper function to get step info
export const getStepInfo = (routeName: keyof OnboardingStackParamList) => {
  return ONBOARDING_STEPS.find(step => step.key === routeName);
};

// Helper function to get next step
export const getNextStep = (currentStep: keyof OnboardingStackParamList): keyof OnboardingStackParamList | null => {
  const currentStepInfo = getStepInfo(currentStep);
  if (!currentStepInfo || currentStepInfo.step >= TOTAL_ONBOARDING_STEPS) {
    return null;
  }
  
  const nextStepInfo = ONBOARDING_STEPS.find(step => step.step === currentStepInfo.step + 1);
  return nextStepInfo ? nextStepInfo.key as keyof OnboardingStackParamList : null;
};

// Helper function to get previous step
export const getPreviousStep = (currentStep: keyof OnboardingStackParamList): keyof OnboardingStackParamList | null => {
  const currentStepInfo = getStepInfo(currentStep);
  if (!currentStepInfo || currentStepInfo.step <= 1) {
    return null;
  }
  
  const previousStepInfo = ONBOARDING_STEPS.find(step => step.step === currentStepInfo.step - 1);
  return previousStepInfo ? previousStepInfo.key as keyof OnboardingStackParamList : null;
};

const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: AuthColors.background },
        animationEnabled: true,
        animationTypeForReplace: 'push',
        presentation: 'card',
      }}
    >
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        options={{
          gestureEnabled: false, // Disable back gesture on welcome screen
        }}
      />
      <Stack.Screen name="AgeGate" component={AgeGateScreen} />
      <Stack.Screen name="Username" component={UsernameScreen} />
      <Stack.Screen name="Email" component={EmailScreen} />
      <Stack.Screen name="Password" component={PasswordScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="PermissionsIntro" component={PermissionsIntroScreen} />
      <Stack.Screen name="NotificationsPermission" component={NotificationsPermissionScreen} />
      <Stack.Screen name="AvatarPicker" component={AvatarPickerScreen} />
      <Stack.Screen name="ThemeChoice" component={ThemeChoiceScreen} />
      <Stack.Screen name="Interests" component={InterestsScreen} />
      <Stack.Screen name="ContactsIntro" component={ContactsIntroScreen} />
      <Stack.Screen name="ContactsPermission" component={ContactsPermissionScreen} />
      <Stack.Screen name="PhoneIntro" component={PhoneIntroScreen} />
      <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
      <Stack.Screen 
        name="Success" 
        component={SuccessScreen}
        options={{
          gestureEnabled: false, // Disable back gesture on success screen
        }}
      />
      <Stack.Screen 
        name="HomeHandoff" 
        component={HomeHandoffScreen}
        options={{
          gestureEnabled: false, // Disable back gesture on final screen
        }}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
