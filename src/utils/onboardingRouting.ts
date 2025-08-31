import { OnboardingStackParamList } from '../navigation/OnboardingNavigator';
import { OnboardingData } from '../context/OnboardingContext';
import * as Permissions from 'expo-permissions';
import { Platform } from 'react-native';

// Route decision interface
export interface RouteDecision {
  nextRoute: keyof OnboardingStackParamList | 'COMPLETE';
  skipReason?: string;
  params?: any;
}

// Permission status interface
interface PermissionStatus {
  notifications: boolean;
  contacts: boolean;
  camera: boolean;
}

// Check device permissions
export const checkDevicePermissions = async (): Promise<PermissionStatus> => {
  try {
    const [notificationStatus, contactsStatus, cameraStatus] = await Promise.all([
      Permissions.getAsync(Permissions.NOTIFICATIONS),
      Permissions.getAsync(Permissions.CONTACTS),
      Permissions.getAsync(Permissions.CAMERA),
    ]);

    return {
      notifications: notificationStatus.status === 'granted',
      contacts: contactsStatus.status === 'granted',
      camera: cameraStatus.status === 'granted',
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return {
      notifications: false,
      contacts: false,
      camera: false,
    };
  }
};

// Determine next route based on current step and conditions
export const getNextRoute = async (
  currentRoute: keyof OnboardingStackParamList,
  onboardingData: OnboardingData,
  permissions?: PermissionStatus
): Promise<RouteDecision> => {
  
  const devicePermissions = permissions || await checkDevicePermissions();

  switch (currentRoute) {
    case 'Welcome':
      return { nextRoute: 'AgeGate' };

    case 'AgeGate':
      // Check if user is old enough
      if (onboardingData.dateOfBirth) {
        const age = new Date().getFullYear() - onboardingData.dateOfBirth.getFullYear();
        if (age < 13) {
          // Could redirect to age restriction screen or show error
          return { nextRoute: 'Welcome', skipReason: 'User too young' };
        }
      }
      return { nextRoute: 'Username' };

    case 'Username':
      return { nextRoute: 'Email' };

    case 'Email':
      return { nextRoute: 'Password' };

    case 'Password':
      return { nextRoute: 'Terms' };

    case 'Terms':
      return { nextRoute: 'PermissionsIntro' };

    case 'PermissionsIntro':
      return { nextRoute: 'NotificationsPermission' };

    case 'NotificationsPermission':
      return { nextRoute: 'AvatarPicker' };

    case 'AvatarPicker':
      return { nextRoute: 'ThemeChoice' };

    case 'ThemeChoice':
      return { nextRoute: 'Interests' };

    case 'Interests':
      return { nextRoute: 'ContactsIntro' };

    case 'ContactsIntro':
      return { nextRoute: 'ContactsPermission' };

    case 'ContactsPermission':
      // Skip phone verification if user is under 16 (privacy consideration)
      if (onboardingData.dateOfBirth) {
        const age = new Date().getFullYear() - onboardingData.dateOfBirth.getFullYear();
        if (age < 16) {
          return { 
            nextRoute: 'Success', 
            skipReason: 'Phone verification skipped for users under 16' 
          };
        }
      }
      return { nextRoute: 'PhoneIntro' };

    case 'PhoneIntro':
      return { nextRoute: 'PhoneVerification' };

    case 'PhoneVerification':
      return { nextRoute: 'Success' };

    case 'Success':
      return { nextRoute: 'HomeHandoff' };

    case 'HomeHandoff':
      return { nextRoute: 'COMPLETE' };

    default:
      return { nextRoute: 'Welcome' };
  }
};

// Determine previous route (for back navigation)
export const getPreviousRoute = (
  currentRoute: keyof OnboardingStackParamList,
  onboardingData: OnboardingData
): keyof OnboardingStackParamList | null => {
  
  switch (currentRoute) {
    case 'Welcome':
      return null; // No previous route

    case 'AgeGate':
      return 'Welcome';

    case 'Username':
      return 'AgeGate';

    case 'Email':
      return 'Username';

    case 'Password':
      return 'Email';

    case 'Terms':
      return 'Password';

    case 'PermissionsIntro':
      return 'Terms';

    case 'NotificationsPermission':
      return 'PermissionsIntro';

    case 'AvatarPicker':
      return 'NotificationsPermission';

    case 'ThemeChoice':
      return 'AvatarPicker';

    case 'Interests':
      return 'ThemeChoice';

    case 'ContactsIntro':
      return 'Interests';

    case 'ContactsPermission':
      return 'ContactsIntro';

    case 'PhoneIntro':
      return 'ContactsPermission';

    case 'PhoneVerification':
      return 'PhoneIntro';

    case 'Success':
      // Check if phone verification was skipped
      if (onboardingData.dateOfBirth) {
        const age = new Date().getFullYear() - onboardingData.dateOfBirth.getFullYear();
        if (age < 16) {
          return 'ContactsPermission';
        }
      }
      return 'PhoneVerification';

    case 'HomeHandoff':
      return null; // Don't allow going back from final screen

    default:
      return null;
  }
};

// Check if a step should be skipped
export const shouldSkipStep = async (
  route: keyof OnboardingStackParamList,
  onboardingData: OnboardingData
): Promise<boolean> => {
  
  switch (route) {
    case 'NotificationsPermission':
      // Skip if notifications are already granted system-wide
      const permissions = await checkDevicePermissions();
      return permissions.notifications;

    case 'ContactsPermission':
      // Skip if contacts are already granted system-wide
      const contactPermissions = await checkDevicePermissions();
      return contactPermissions.contacts;

    case 'PhoneIntro':
    case 'PhoneVerification':
      // Skip phone verification for users under 16
      if (onboardingData.dateOfBirth) {
        const age = new Date().getFullYear() - onboardingData.dateOfBirth.getFullYear();
        return age < 16;
      }
      return false;

    case 'AvatarPicker':
      // Skip if camera permission is not available (rare case)
      if (Platform.OS === 'web') {
        return true; // Skip avatar picker on web
      }
      return false;

    default:
      return false;
  }
};

// Get conditional routing based on user choices
export const getConditionalRoute = (
  currentRoute: keyof OnboardingStackParamList,
  userChoice: string,
  onboardingData: OnboardingData
): RouteDecision => {
  
  switch (currentRoute) {
    case 'PermissionsIntro':
      if (userChoice === 'not_now') {
        // Skip all permission screens and go to avatar picker
        return { 
          nextRoute: 'AvatarPicker',
          skipReason: 'User chose to skip permissions'
        };
      }
      return { nextRoute: 'NotificationsPermission' };

    case 'NotificationsPermission':
      if (userChoice === 'not_now') {
        // Continue to next step but mark notifications as disabled
        return { nextRoute: 'AvatarPicker' };
      }
      return { nextRoute: 'AvatarPicker' };

    case 'ContactsIntro':
      if (userChoice === 'skip') {
        // Skip contacts permission and go to phone intro (if age appropriate)
        if (onboardingData.dateOfBirth) {
          const age = new Date().getFullYear() - onboardingData.dateOfBirth.getFullYear();
          if (age < 16) {
            return { nextRoute: 'Success' };
          }
        }
        return { nextRoute: 'PhoneIntro' };
      }
      return { nextRoute: 'ContactsPermission' };

    case 'ContactsPermission':
      if (userChoice === 'not_now') {
        // Continue without contacts permission
        if (onboardingData.dateOfBirth) {
          const age = new Date().getFullYear() - onboardingData.dateOfBirth.getFullYear();
          if (age < 16) {
            return { nextRoute: 'Success' };
          }
        }
        return { nextRoute: 'PhoneIntro' };
      }
      return { nextRoute: 'PhoneIntro' };

    case 'AvatarPicker':
      if (userChoice === 'skip') {
        return { nextRoute: 'ThemeChoice' };
      }
      return { nextRoute: 'ThemeChoice' };

    default:
      // Default routing
      return { nextRoute: 'Welcome' };
  }
};

// Validate route transition
export const canNavigateToRoute = (
  targetRoute: keyof OnboardingStackParamList,
  currentRoute: keyof OnboardingStackParamList,
  completedSteps: number[]
): boolean => {
  
  // Define step numbers for each route
  const routeSteps: Record<keyof OnboardingStackParamList, number> = {
    Welcome: 1,
    AgeGate: 2,
    Username: 3,
    Email: 4,
    Password: 5,
    Terms: 6,
    PermissionsIntro: 7,
    NotificationsPermission: 8,
    AvatarPicker: 9,
    ThemeChoice: 10,
    Interests: 11,
    ContactsIntro: 12,
    ContactsPermission: 13,
    PhoneIntro: 14,
    PhoneVerification: 15,
    Success: 16,
    HomeHandoff: 17,
  };

  const targetStep = routeSteps[targetRoute];
  const currentStep = routeSteps[currentRoute];

  // Allow navigation to previous steps
  if (targetStep < currentStep) {
    return true;
  }

  // Allow navigation to next step if current step is completed
  if (targetStep === currentStep + 1) {
    return completedSteps.includes(currentStep);
  }

  // Don't allow skipping steps
  return false;
};

// Get route title for header
export const getRouteTitle = (route: keyof OnboardingStackParamList): string => {
  const titles: Record<keyof OnboardingStackParamList, string> = {
    Welcome: '',
    AgeGate: 'Age Verification',
    Username: 'Choose Username',
    Email: 'Email Address',
    Password: 'Create Password',
    Terms: 'Terms & Privacy',
    PermissionsIntro: 'Permissions',
    NotificationsPermission: 'Notifications',
    AvatarPicker: 'Profile Picture',
    ThemeChoice: 'Choose Theme',
    Interests: 'Your Interests',
    ContactsIntro: 'Find Friends',
    ContactsPermission: 'Contacts',
    PhoneIntro: 'Phone Number',
    PhoneVerification: 'Verify Phone',
    Success: 'Welcome!',
    HomeHandoff: '',
  };

  return titles[route] || '';
};
