import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PersonGroupIcon from './PersonGroupIcon';

interface ViewerCountProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  iconColor?: string;
  textColor?: string;
}

const ViewerCount: React.FC<ViewerCountProps> = ({
  count,
  size = 'medium',
  showText = true,
  iconColor = '#E358F2',
  textColor = '#FFFFFF',
}) => {
  // Format count for display (e.g., 1.2k for 1200)
  const formatCount = (value: number): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  };

  // Size mappings
  const sizeMap = {
    small: { container: 16, icon: 14, text: 12 },
    medium: { container: 24, icon: 20, text: 14 },
    large: { container: 32, icon: 26, text: 16 },
  };

  const selectedSize = sizeMap[size];

  return (
    <View style={[styles.container, { height: selectedSize.container }]}>
      <View style={[styles.iconContainer, { width: selectedSize.icon, height: selectedSize.icon }]}>
        <PersonGroupIcon 
          size={selectedSize.icon} 
          primaryColor={iconColor} 
          secondaryColor={iconColor === '#E358F2' ? '#5865F2' : '#E358F2'}
        />
      </View>
      
      {showText && (
        <Text style={[styles.countText, { color: textColor, fontSize: selectedSize.text }]}>
          {formatCount(count)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconContainer: {
    marginRight: 4,
  },
  countText: {
    fontWeight: '600',
  },
});

export default ViewerCount; 