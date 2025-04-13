import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusType, getStatusColor } from '../context/UserStatusContext';

interface StatusDotProps {
  status?: StatusType;
  size?: number;
  bordered?: boolean;
  borderWidth?: number;
  borderColor?: string;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
  color?: string; // Optional color override
}

const StatusDot: React.FC<StatusDotProps> = ({
  status = 'offline',
  size = 12,
  bordered = false,
  borderWidth = 2,
  borderColor = '#1D1E26',
  style = {},
  containerStyle = {},
  color,
}) => {
  const dotSize = size;
  
  // Use custom color if provided, otherwise get color based on the actual status
  // This ensures that mood statuses like "love" show with their actual colors
  const statusColor = color || getStatusColor(status);

  // Check if the status is spotlight for gradient
  const isSpotlight = status === 'spotlight';

  // Render the component
  return (
    <View style={[styles.container, containerStyle]}>
      {bordered && (
        <View
          style={[
            styles.border,
            {
              width: dotSize + borderWidth * 2,
              height: dotSize + borderWidth * 2,
              borderRadius: (dotSize + borderWidth * 2) / 2,
              borderWidth,
              borderColor,
            },
          ]}
        />
      )}
      
      {isSpotlight ? (
        <LinearGradient
          colors={['#FF9900', '#FF3434']}
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
            },
            style,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: statusColor,
            },
            style,
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: '100%',
    height: '100%',
  },
  border: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default StatusDot; 