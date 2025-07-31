import { useAuth } from '../context/AuthContext';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export const useGuestRestrictions = () => {
  const { isGuest, signOut } = useAuth();
  const router = useRouter();

  const forceSignOutAndNavigate = async () => {
    try {
      // Clear guest state immediately
      await signOut();
      // Navigate to auth screen
      router.push('/auth');
    } catch (error) {
      console.error('Error signing out guest:', error);
      // Even if signOut fails, navigate to auth
      router.push('/auth');
    }
  };

  const handleGuestRestriction = (feature: string) => {
    Alert.alert(
      'Guest Mode Restriction',
      `This feature requires a full account. You'll be signed out of guest mode to sign in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign In', 
          style: 'default',
          onPress: forceSignOutAndNavigate
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
    getGuestGoldLimit,
    getGuestGemsLimit,
    isAtGoldLimit,
    isAtGemsLimit,
    handleGuestRestriction,
  };
}; 