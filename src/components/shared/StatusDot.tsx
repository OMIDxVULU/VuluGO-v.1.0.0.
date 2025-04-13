import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

export type StatusType = 
  // Basic statuses
  | 'online' 
  | 'busy' 
  | 'idle' 
  | 'offline' 
  // Activity statuses
  | 'hosting' 
  | 'watching' 
  | 'spotlight';

interface StatusDotProps {
  /**
   * Status type that determines the color
   */
  status: StatusType;
  
  /**
   * Size of the status dot
   * - 'small': 8px (for tight spaces)
   * - 'normal': 12px (default)
   * - 'large': 20px (for profile pages)
   */
  size?: 'small' | 'normal' | 'large';
  
  /**
   * Position of the status dot
   * - 'bottom-right': Bottom right (default)
   * - 'bottom-left': Bottom left
   * - 'top-right': Top right
   * - 'top-left': Top left
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  
  /**
   * Border width around the dot
   */
  borderWidth?: number;
  
  /**
   * Border color around the dot
   */
  borderColor?: string;
  
  /**
   * Optional custom color override
   * If provided, this color will be used instead of the default color for the status
   */
  color?: string;
  
  /**
   * Additional styles to apply
   */
  style?: ViewStyle;
}

/**
 * StatusDot - A reusable component displaying user status
 * 
 * Use this component to show a user's status across the app.
 * The component supports different sizes and positions as well as
 * different status types (online, busy, idle, offline, etc.)
 * 
 * Example:
 * ```jsx
 * <View style={styles.avatarContainer}>
 *   <Image source={{ uri: user.avatar }} style={styles.avatar} />
 *   <StatusDot status="online" size="normal" position="bottom-right" />
 * </View>
 * ```
 */
const StatusDot: React.FC<StatusDotProps> = ({
  status,
  size = 'normal',
  position = 'bottom-right',
  borderWidth,
  borderColor = '#1D1E26',
  color,
  style,
}) => {
  // Determine size in pixels based on size prop
  const dotSize = 
    size === 'small' ? 8 : 
    size === 'large' ? 20 : 
    12; // normal
  
  // Calculate border width based on dot size if not explicitly provided
  const calculatedBorderWidth = 
    borderWidth !== undefined ? borderWidth : 
    size === 'small' ? 1.5 : 
    size === 'large' ? 3 : 
    2; // normal
  
  // Get status color (use provided color if available, otherwise use default)
  const backgroundColor = color || getStatusColor(status);
  
  // Set position styles based on position prop
  const positionStyles = getPositionStyles(position);
  
  return (
    <View 
      style={[
        styles.container,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          borderWidth: calculatedBorderWidth,
          borderColor,
          backgroundColor,
          ...positionStyles,
        },
        style,
      ]}
    />
  );
};

/**
 * Get the color for a given status
 */
const getStatusColor = (status: StatusType): string => {
  switch (status) {
    case 'online':
      return '#4CAF50'; // Green
    case 'busy':
      return '#FF4B4B'; // Red
    case 'idle':
      return '#FFCB0E'; // Yellow
    case 'offline':
      return '#9BA1A6'; // Grey
    case 'hosting':
      return '#FF4B4B'; // Red - same as busy
    case 'watching':
      return '#4B8BFF'; // Blue
    case 'spotlight':
      return '#34C759'; // Green - similar to online but specific to spotlight
    default:
      return '#9BA1A6'; // Grey as default
  }
};

/**
 * Get position styles based on the position prop
 */
const getPositionStyles = (position: StatusDotProps['position']): ViewStyle => {
  const baseStyle: ViewStyle = {
    position: 'absolute',
  };
  
  switch (position) {
    case 'bottom-right':
      return {
        ...baseStyle,
        bottom: 0,
        right: 0,
      };
    case 'bottom-left':
      return {
        ...baseStyle,
        bottom: 0,
        left: 0,
      };
    case 'top-right':
      return {
        ...baseStyle,
        top: 0,
        right: 0,
      };
    case 'top-left':
      return {
        ...baseStyle,
        top: 0,
        left: 0,
      };
    default:
      return {
        ...baseStyle,
        bottom: 0,
        right: 0,
      };
  }
};

const styles = StyleSheet.create({
  container: {
    // Base styles are applied dynamically
  },
});

export default StatusDot; 