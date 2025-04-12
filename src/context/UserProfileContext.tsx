import React, { createContext, useState, useContext, ReactNode } from 'react';

interface UserProfileContextType {
  profileImage: string;
  setProfileImage: (image: string) => void;
  userStatus: string;
  setUserStatus: (status: string) => void;
  statusColor: string;
  setStatusColor: (color: string) => void;
}

const initialProfileImage = 'https://randomuser.me/api/portraits/women/33.jpg';

const UserProfileContext = createContext<UserProfileContextType>({
  profileImage: initialProfileImage,
  setProfileImage: () => {},
  userStatus: 'online',
  setUserStatus: () => {},
  statusColor: '#7ADA72', // Green - online by default
  setStatusColor: () => {},
});

export const useUserProfile = () => useContext(UserProfileContext);

interface UserProfileProviderProps {
  children: ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const [profileImage, setProfileImage] = useState(initialProfileImage);
  const [userStatus, setUserStatus] = useState('online');
  const [statusColor, setStatusColor] = useState('#7ADA72');

  return (
    <UserProfileContext.Provider value={{
      profileImage,
      setProfileImage,
      userStatus,
      setUserStatus,
      statusColor,
      setStatusColor,
    }}>
      {children}
    </UserProfileContext.Provider>
  );
}; 