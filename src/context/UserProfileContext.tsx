import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Type for profile viewer data
interface ProfileViewer {
  id: string;
  name: string;
  username: string;
  profileImage: string;
  viewCount: number;
  lastViewed: Date;
}

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
}

const initialProfileImage = 'https://randomuser.me/api/portraits/women/33.jpg';

// Mock data for recent viewers
const generateMockViewers = (): ProfileViewer[] => {
  return Array.from({ length: 20 }, (_, i) => {
    const gender = Math.random() > 0.5 ? 'women' : 'men';
    const id = Math.floor(Math.random() * 99) + 1;
    const viewCount = Math.floor(Math.random() * 50) + 1;
    const daysAgo = Math.floor(Math.random() * 14);
    const names = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn', 'Avery', 'Dakota'];
    const name = names[Math.floor(Math.random() * names.length)];
    
    return {
      id: `user-${i}`,
      name: `${name} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      username: `@${name.toLowerCase()}${Math.floor(Math.random() * 999)}`,
      profileImage: `https://randomuser.me/api/portraits/${gender}/${id}.jpg`,
      viewCount,
      lastViewed: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    };
  });
};

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
  const { isGuest, userProfile } = useAuth();
  
  // Guest profile settings
  const guestProfileImage = 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=G';
  const guestDisplayName = 'Guest';
  const guestUsername = 'guest';
  
  // Regular user profile settings
  const [profileImage, setProfileImage] = useState(initialProfileImage);
  const [userStatus, setUserStatus] = useState('online');
  const [statusColor, setStatusColor] = useState('#7ADA72');
  const [totalViews, setTotalViews] = useState(3456);
  const [dailyViews, setDailyViews] = useState(135);
  const [hasGemPlus, setHasGemPlus] = useState(false);
  const [allViewers, setAllViewers] = useState<ProfileViewer[]>([]);
  
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
  
  // Generate mock viewers data when the component mounts
  useEffect(() => {
    setAllViewers(generateMockViewers());
  }, []);
  
  // Get recent viewers (sorted by lastViewed date)
  const recentViewers = [...allViewers].sort((a, b) => 
    b.lastViewed.getTime() - a.lastViewed.getTime()
  ).slice(0, 20);
  
  // Get top viewers (sorted by viewCount)
  const topViewers = [...allViewers].sort((a, b) => 
    b.viewCount - a.viewCount
  ).slice(0, 10);

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
    }}>
      {children}
    </UserProfileContext.Provider>
  );
}; 