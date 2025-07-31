import { useAuth } from '../context/AuthContext';
import { Alert } from 'react-native';

export const useGuestRestrictions = () => {
  const { isGuest, user } = useAuth();

  const showGuestRestrictionAlert = (feature: string) => {
    Alert.alert(
      'Guest Mode Restriction',
      `This feature is not available in guest mode. Sign up for a free account to access ${feature}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Up', style: 'default' }
      ]
    );
  };

  const canSendMessages = () => {
    if (isGuest) {
      showGuestRestrictionAlert('messaging');
      return false;
    }
    return true;
  };

  const canCreateContent = () => {
    if (isGuest) {
      showGuestRestrictionAlert('content creation');
      return false;
    }
    return true;
  };

  const canMakePurchases = () => {
    if (isGuest) {
      showGuestRestrictionAlert('purchases');
      return false;
    }
    return true;
  };

  const canAddFriends = () => {
    if (isGuest) {
      showGuestRestrictionAlert('adding friends');
      return false;
    }
    return true;
  };

  const canAccessPremiumFeatures = () => {
    if (isGuest) {
      showGuestRestrictionAlert('premium features');
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
    getGuestGoldLimit,
    getGuestGemsLimit,
    isAtGoldLimit,
    isAtGemsLimit,
    showGuestRestrictionAlert,
  };
}; 