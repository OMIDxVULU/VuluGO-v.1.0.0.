import React, { createContext, useState, useContext, useEffect } from 'react';

// Define status types
export const STATUS_TYPES = {
  // Basic status types
  ONLINE: 'online',
  BUSY: 'busy',
  OFFLINE: 'offline',
  AWAY: 'away',
  INVISIBLE: 'invisible',
  
  // Activity statuses
  HOSTING: 'hosting',
  WATCHING: 'watching',
  SPOTLIGHT: 'spotlight',
  
  // Mood status types
  HAPPY: 'happy',
  SAD: 'sad',
  ANGRY: 'angry',
  HUNGRY: 'hungry',
  SLEEPY: 'sleepy',
  EXCITED: 'excited',
  BORED: 'bored',
  LOVE: 'love',
};

// Basic status types that can be used in the StatusDot component
export type StatusType = 
  | 'online' 
  | 'busy' 
  | 'offline'
  | 'away'
  | 'invisible'
  | 'hosting' 
  | 'watching' 
  | 'spotlight'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'hungry'
  | 'sleepy'
  | 'excited'
  | 'bored'
  | 'love';

export interface StatusData {
  color: string;
  text: string;
  subtext: string;
  glowColor: string;
  icon: React.ReactNode | null;
}

interface UserStatusContextType {
  userStatus: StatusType;
  setUserStatus: (status: StatusType) => void;
  closefriendsOnly: boolean;
  setClosefriendsOnly: (value: boolean) => void;
  contextStatusData: StatusData;
  syncStatusData: () => void;
}

// Create the context with default values
const UserStatusContext = createContext<UserStatusContextType>({
  userStatus: STATUS_TYPES.OFFLINE as StatusType,
  setUserStatus: () => {},
  closefriendsOnly: false,
  setClosefriendsOnly: () => {},
  contextStatusData: {
    color: '#35383F',
    text: 'Offline',
    subtext: 'Invisible to Others',
    glowColor: 'rgba(53, 56, 63, 0.3)',
    icon: null
  },
  syncStatusData: () => {},
});

// Map status types to basic StatusDot types for visualization
export function mapStatusToBasicType(status: StatusType): 'online' | 'busy' | 'offline' | 'hosting' | 'watching' | 'spotlight' | 'away' | 'invisible' {
  // Basic statuses are directly returned
  if (
    status === 'online' || 
    status === 'busy' || 
    status === 'offline' || 
    status === 'hosting' || 
    status === 'watching' || 
    status === 'spotlight' || 
    status === 'away' || 
    status === 'invisible'
  ) {
    return status;
  }
  
  // Mood statuses map to basic statuses
  switch (status) {
    // Happy-like moods map to online
    case 'happy':
    case 'excited':
    case 'love':
      return 'online';
      
    // Sleepy or bored map to away
    case 'sleepy':
    case 'bored':
      return 'away';
      
    // Negative moods map to busy
    case 'sad':
    case 'angry':
    case 'hungry':
      return 'busy';
      
    // Default to online if unknown
    default:
      return 'online';
  }
}

// Get the status color based on status type
export function getStatusColor(status: StatusType): string {
  switch (status) {
    // Basic statuses
    case 'online':
      return '#4CD964'; // Green
    case 'away':
      return '#FF9500'; // Orange
    case 'busy':
      return '#FF3B30'; // Red
    case 'invisible':
      return '#C7C7CC'; // Gray
    case 'offline':
      return '#8E8E93'; // Dark Gray
    case 'hosting':
      return '#FF4B4B'; // Red
    case 'watching':
      return '#4B8BFF'; // Blue
    case 'spotlight':
      return '#FF9900'; // Amber
      
    // Mood statuses with custom colors
    case 'happy':
      return '#FFD700'; // Gold
    case 'sad':
      return '#5C9ACE'; // Blue
    case 'angry':
      return '#FF6B3D'; // Orange Red
    case 'hungry':
      return '#FF9800'; // Orange
    case 'sleepy':
      return '#9C27B0'; // Purple
    case 'excited':
      return '#FF5CAD'; // Pink
    case 'bored':
      return '#9E9E9E'; // Gray
    case 'love':
      return '#E91E63'; // Pink
      
    // Default to gray if unknown
    default:
      return '#8E8E93';
  }
}

export const UserStatusProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [userStatus, setUserStatus] = useState<StatusType>(STATUS_TYPES.ONLINE as StatusType);
  const [closefriendsOnly, setClosefriendsOnly] = useState(false);
  const [contextStatusData, setContextStatusData] = useState<StatusData>({
    color: '#7ADA72', // Green for online
    text: 'Online',
    subtext: 'Active Now',
    glowColor: 'rgba(122, 218, 114, 0.3)',
    icon: null
  });
  
  // Function to sync status data from the current user status
  const syncStatusData = () => {
    const color = getStatusColor(userStatus);
    let data: StatusData;
    
    switch(userStatus) {
      case STATUS_TYPES.ONLINE:
        data = {
          color: '#7ADA72', // Green
          text: 'Online',
          subtext: 'Active Now',
          glowColor: 'rgba(122, 218, 114, 0.3)',
          icon: null
        };
        break;
      case STATUS_TYPES.BUSY:
        data = {
          color: '#E57373', // Red
          text: 'Busy',
          subtext: 'Do Not Disturb',
          glowColor: 'rgba(229, 115, 115, 0.3)',
          icon: null
        };
        break;
      case STATUS_TYPES.OFFLINE:
        data = {
          color: '#35383F', // Dark gray/black
          text: 'Offline',
          subtext: 'Invisible to Others',
          glowColor: 'rgba(53, 56, 63, 0.3)',
          icon: null
        };
        break;
      case STATUS_TYPES.HAPPY:
        data = {
          color: '#FFD700', // Gold
          text: 'Happy',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(255, 215, 0, 0.3)',
          icon: null
        };
        break;
      case STATUS_TYPES.SAD:
        data = {
          color: '#5C9ACE', // Blue
          text: 'Sad',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(92, 154, 206, 0.3)',
          icon: null
        };
        break;
      case STATUS_TYPES.ANGRY:
        data = {
          color: '#FF6B3D', // Orange Red
          text: 'Angry',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(255, 107, 61, 0.3)',
          icon: null
        };
        break;
      case STATUS_TYPES.HUNGRY:
        data = {
          color: '#FF9800', // Orange
          text: 'Hungry',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(255, 152, 0, 0.3)',
          icon: null
        };
        break;
      case STATUS_TYPES.SLEEPY:
        data = {
          color: '#9C27B0', // Purple
          text: 'Sleepy',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(156, 39, 176, 0.3)',
          icon: null
        };
        break;
      case STATUS_TYPES.EXCITED:
        data = {
          color: '#FF5CAD', // Pink
          text: 'Excited',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(255, 92, 173, 0.3)',
          icon: null
        };
        break;
      case STATUS_TYPES.BORED:
        data = {
          color: '#9E9E9E', // Gray
          text: 'Bored',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(158, 158, 158, 0.3)',
          icon: null
        };
        break;
      case STATUS_TYPES.LOVE:
        data = {
          color: '#E91E63', // Pink
          text: 'In Love',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(233, 30, 99, 0.3)',
          icon: null
        };
        break;
      default:
        data = {
          color: '#7ADA72', // Green
          text: 'Online',
          subtext: 'Active Now',
          glowColor: 'rgba(122, 218, 114, 0.3)',
          icon: null
        };
    }
    
    setContextStatusData(data);
  };
  
  // Update status data whenever user status or visibility changes
  useEffect(() => {
    syncStatusData();
  }, [userStatus, closefriendsOnly]);
  
  return (
    <UserStatusContext.Provider value={{
      userStatus,
      setUserStatus,
      closefriendsOnly,
      setClosefriendsOnly,
      contextStatusData,
      syncStatusData
    }}>
      {children}
    </UserStatusContext.Provider>
  );
};

// Custom hook for using the user status context
export const useUserStatus = () => useContext(UserStatusContext);

export default UserStatusContext; 