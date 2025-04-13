import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useUserStatus, StatusType, getStatusColor } from '../context/UserStatusContext';

interface UserStatusIndicatorProps {
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  pillStyle?: ViewStyle;
  showText?: boolean;
  size?: number;
  status?: StatusType; // Optional override status
  useBorder?: boolean;
  borderColor?: string;
}

/**
 * A consistent status indicator component used throughout the app
 * Automatically pulls from UserStatusContext unless status prop is provided
 */
const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({
  containerStyle,
  textStyle,
  pillStyle,
  showText = true,
  size = 12,
  status: overrideStatus,
  useBorder = true,
  borderColor = '#1D1E26',
}) => {
  // Get the current user status from context
  const { userStatus } = useUserStatus();
  
  // Use provided status if available, otherwise use context
  const status = overrideStatus || userStatus;
  
  // Get status color and label
  const statusColor = getStatusColor(status);
  
  // Helper function to get status display text
  const getStatusDisplayText = (status: StatusType): string => {
    switch(status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'busy': return 'Busy';
      case 'away': return 'Away';
      case 'invisible': return 'Invisible';
      case 'hosting': return 'Hosting';
      case 'watching': return 'Watching';
      case 'spotlight': return 'Spotlight';
      case 'happy': return 'Happy';
      case 'sad': return 'Sad';
      case 'angry': return 'Angry';
      case 'hungry': return 'Hungry';
      case 'sleepy': return 'Sleepy';
      case 'excited': return 'Excited';
      case 'bored': return 'Bored';
      case 'love': return 'In Love';
      default: return 'Offline';
    }
  };

  // Status dot only
  if (!showText) {
    return (
      <View 
        style={[
          styles.statusDot, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: statusColor, 
            borderWidth: useBorder ? 1.5 : 0,
            borderColor: borderColor
          },
          containerStyle
        ]} 
      />
    );
  }

  // Status pill with text
  return (
    <View 
      style={[
        styles.statusPill, 
        { borderColor: statusColor },
        pillStyle
      ]}
    >
      <Text 
        style={[
          styles.statusPillText, 
          { color: statusColor },
          textStyle
        ]}
      >
        {getStatusDisplayText(status)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#1D1E26',
    borderWidth: 1,
    minWidth: 40,
    alignItems: 'center',
  },
  statusPillText: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});

export default UserStatusIndicator; 