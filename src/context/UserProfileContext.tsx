import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import profileAnalyticsService, { ProfileViewer, ProfileAnalytics } from '../services/profileAnalyticsService';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';

interface UserProfileContextType {
  profileImage: string;
  setProfileImage: (image: string) => void;
  userStatus: string;
  setUserStatus: (status: string) => void;
  statusColor: string;
  setStatusColor: (color: string) => void;
  totalViews: number;
  setTotalViews: (views: number) => void;
  dailyViews: number;
  setDailyViews: (views: number) => void;
  incrementViews: () => void;
  resetDailyViews: () => void;
  recentViewers: ProfileViewer[];
  topViewers: ProfileViewer[];
  hasGemPlus: boolean;
  setHasGemPlus: (hasGemPlus: boolean) => void;
  displayName: string;
  username: string;
  profileAnalytics: ProfileAnalytics | null;
  isLoadingAnalytics: boolean;
  refreshAnalytics: () => Promise<void>;
  recordProfileView: (viewerData: any) => Promise<void>;
}

const initialProfileImage = 'https://randomuser.me/api/portraits/women/33.jpg';

const UserProfileContext = createContext<UserProfileContextType>({
  profileImage: initialProfileImage,
  setProfileImage: () => {},
  userStatus: 'online',
  setUserStatus: () => {},
  statusColor: '#7ADA72', // Green - online by default
  setStatusColor: () => {},
  totalViews: 3456,
  setTotalViews: () => {},
  dailyViews: 0,
  setDailyViews: () => {},
  incrementViews: () => {},
  resetDailyViews: () => {},
  recentViewers: [],
  topViewers: [],
  hasGemPlus: false,
  setHasGemPlus: () => {},
  displayName: 'User',
  username: '@user',
});

export const useUserProfile = () => useContext(UserProfileContext);

interface UserProfileProviderProps {
  children: ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  // Safely get auth context - handle case where AuthProvider isn't ready yet
  let isGuest = false;
  let userProfile = null;

  try {
    const authContext = useAuth();
    isGuest = authContext.isGuest;
    userProfile = authContext.userProfile;
  } catch (error) {
    // AuthProvider not ready yet - use default values
    console.warn('AuthProvider not ready in UserProfileProvider, using defaults');
    isGuest = false;
    userProfile = null;
  }
  
  // Guest profile settings
  const guestProfileImage = 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=G';
  const guestDisplayName = 'Guest';
  const guestUsername = 'guest';
  
  // Regular user profile settings
  const [profileImage, setProfileImage] = useState(initialProfileImage);
  const [userStatus, setUserStatus] = useState('online');
  const [statusColor, setStatusColor] = useState('#7ADA72');
  const [totalViews, setTotalViews] = useState(0);
  const [dailyViews, setDailyViews] = useState(0);
  const [hasGemPlus, setHasGemPlus] = useState(false);
  const [recentViewers, setRecentViewers] = useState<ProfileViewer[]>([]);
  const [topViewers, setTopViewers] = useState<ProfileViewer[]>([]);
  const [profileAnalytics, setProfileAnalytics] = useState<ProfileAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Determine current profile data based on guest status
  const currentProfileImage = isGuest ? guestProfileImage : profileImage;
  const currentDisplayName = isGuest ? guestDisplayName : (userProfile?.displayName || 'User');
  const currentUsername = isGuest ? guestUsername : (userProfile?.username || '@user');

  // Guest-safe setProfileImage function
  const setProfileImageSafe = (image: string) => {
    if (!isGuest) {
      setProfileImage(image);
    } else {
      // Guest users cannot change their profile picture - this will be handled by the restriction hook
      console.warn('Guest users cannot change their profile picture');
    }
  };

  // Load profile analytics from Firebase
  const loadProfileAnalytics = async () => {
    if (!userProfile?.uid || isGuest) {
      // Set default values for guest users
      setProfileAnalytics(null);
      setTotalViews(0);
      setDailyViews(0);
      setRecentViewers([]);
      setTopViewers([]);
      return;
    }

    setIsLoadingAnalytics(true);
    try {
      const analytics = await profileAnalyticsService.getProfileAnalytics(userProfile.uid);
      if (analytics) {
        setProfileAnalytics(analytics);
        setTotalViews(analytics.totalViews);
        setDailyViews(analytics.dailyViews);
      }

      const viewers = await profileAnalyticsService.getProfileViewers(userProfile.uid);
      setRecentViewers(viewers.slice(0, 20));
      setTopViewers(viewers.sort((a, b) => b.viewCount - a.viewCount).slice(0, 10));
    } catch (error: any) {
      // Handle permission errors gracefully
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for loadProfileAnalytics - setting default values for guest user');
        // Set default values for permission errors (guest users)
        setProfileAnalytics(null);
        setTotalViews(0);
        setDailyViews(0);
        setRecentViewers([]);
        setTopViewers([]);
      } else {
        console.error('Failed to load profile analytics:', error);
        FirebaseErrorHandler.logError('loadProfileAnalytics', error);
      }
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Update viewers from real-time view data
  const updateViewersFromViews = async (views: any[]) => {
    if (!userProfile?.uid || isGuest) return;

    try {
      const viewers = await profileAnalyticsService.getProfileViewers(userProfile.uid);
      setRecentViewers(viewers.slice(0, 20));
      setTopViewers(viewers.sort((a, b) => b.viewCount - a.viewCount).slice(0, 10));

      // Update view counts
      const analytics = await profileAnalyticsService.getProfileAnalytics(userProfile.uid);
      if (analytics) {
        setTotalViews(analytics.totalViews);
        setDailyViews(analytics.dailyViews);
        setProfileAnalytics(analytics);
      }
    } catch (error: any) {
      // Handle permission errors gracefully
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for updateViewersFromViews - skipping update for guest user');
      } else {
        console.error('Failed to update viewers:', error);
        FirebaseErrorHandler.logError('updateViewersFromViews', error);
      }
    }
  };

  // Load analytics when user changes
  useEffect(() => {
    if (!userProfile || isGuest) {
      setTotalViews(0);
      setDailyViews(0);
      setRecentViewers([]);
      setTopViewers([]);
      setProfileAnalytics(null);
      return;
    }

    loadProfileAnalytics();

    // Set up real-time listener for profile views
    const unsubscribe = profileAnalyticsService.onProfileViews(userProfile.uid, updateViewersFromViews);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userProfile, isGuest]);

  // Reset daily views when the component mounts (app starts)
  useEffect(() => {
    resetDailyViews();
  }, []);

  const incrementViews = () => {
    setTotalViews(prev => prev + 1);
    setDailyViews(prev => prev + 1);
  };

  const resetDailyViews = () => {
    setDailyViews(0);
  };

  // Refresh analytics data
  const refreshAnalytics = async () => {
    await loadProfileAnalytics();
  };

  // Record a profile view
  const recordProfileView = async (viewerData: any) => {
    if (!userProfile?.uid || isGuest) {
      console.warn('Skipping recordProfileView for guest user');
      return;
    }

    try {
      await profileAnalyticsService.recordProfileView(userProfile.uid, viewerData);
    } catch (error: any) {
      // Handle permission errors gracefully
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for recordProfileView - skipping for guest user');
      } else {
        console.error('Failed to record profile view:', error);
        FirebaseErrorHandler.logError('recordProfileView', error);
      }
    }
  };

  return (
    <UserProfileContext.Provider value={{
      profileImage: currentProfileImage,
      setProfileImage: setProfileImageSafe,
      userStatus,
      setUserStatus,
      statusColor,
      setStatusColor,
      totalViews,
      setTotalViews,
      dailyViews,
      setDailyViews,
      incrementViews,
      resetDailyViews,
      recentViewers,
      topViewers,
      hasGemPlus,
      setHasGemPlus,
      displayName: currentDisplayName,
      username: currentUsername,
      profileAnalytics,
      isLoadingAnalytics,
      refreshAnalytics,
      recordProfileView
    }}>
      {children}
    </UserProfileContext.Provider>
  );
};