import { useAuth } from '../context/AuthContext';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export const useGuestRestrictions = () => {
  const { isGuest, signOut } = useAuth();
  const router = useRouter();

  const navigateToAuthSelection = () => {
    console.log('🔄 Guest user navigating to auth selection screen');
    router.push('/auth/selection');
  };

  const handleGuestRestriction = (feature: string) => {
    Alert.alert(
      'Account Required',
      `Guest users can browse but need a full account to access ${feature}. Choose how you'd like to continue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Account Option',
          style: 'default',
          onPress: navigateToAuthSelection
        }
      ]
    );
  };

  const canSendMessages = () => {
    if (isGuest) {
      handleGuestRestriction('messaging');
      return false;
    }
    return true;
  };

  const canCreateContent = () => {
    if (isGuest) {
      handleGuestRestriction('content creation');
      return false;
    }
    return true;
  };

  const canMakePurchases = () => {
    if (isGuest) {
      handleGuestRestriction('purchases');
      return false;
    }
    return true;
  };

  const canAddFriends = () => {
    if (isGuest) {
      handleGuestRestriction('adding friends');
      return false;
    }
    return true;
  };

  const canAccessPremiumFeatures = () => {
    if (isGuest) {
      handleGuestRestriction('premium features');
      return false;
    }
    return true;
  };

  const canSaveData = () => {
    if (isGuest) {
      // Guest data is temporary and not saved
      return false;
    }
    return true;
  };

  const canEditProfile = () => {
    if (isGuest) {
      handleGuestRestriction('profile editing');
      return false;
    }
    return true;
  };

  const canManagePhotos = () => {
    if (isGuest) {
      handleGuestRestriction('photo management');
      return false;
    }
    return true;
  };

  const canChangeStatus = () => {
    if (isGuest) {
      handleGuestRestriction('status changes');
      return false;
    }
    return true;
  };

  const canUseSpotlight = () => {
    if (isGuest) {
      handleGuestRestriction('spotlight features');
      return false;
    }
    return true;
  };

  const canBoostOthers = () => {
    if (isGuest) {
      handleGuestRestriction('boosting other users');
      return false;
    }
    return true;
  };

  const canViewFriends = () => {
    if (isGuest) {
      handleGuestRestriction('viewing friends');
      return false;
    }
    return true;
  };

  const canViewActiveStatus = () => {
    if (isGuest) {
      handleGuestRestriction('viewing active status');
      return false;
    }
    return true;
  };

  const getGuestGoldLimit = () => 500;
  const getGuestGemsLimit = () => 10;

  const isAtGoldLimit = (currentGold: number) => {
    return isGuest && currentGold >= getGuestGoldLimit();
  };

  const isAtGemsLimit = (currentGems: number) => {
    return isGuest && currentGems >= getGuestGemsLimit();
  };

  return {
    isGuest,
    canSendMessages,
    canCreateContent,
    canMakePurchases,
    canAddFriends,
    canAccessPremiumFeatures,
    canSaveData,
    canEditProfile,
    canManagePhotos,
    canChangeStatus,
    canUseSpotlight,
    canBoostOthers,
    canViewFriends,
    canViewActiveStatus,
    getGuestGoldLimit,
    getGuestGemsLimit,
    isAtGoldLimit,
    isAtGemsLimit,
    handleGuestRestriction,
  };
}; 