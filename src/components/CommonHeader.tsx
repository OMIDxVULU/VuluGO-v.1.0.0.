import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BackIcon, MenuIcon, MoreVertIcon } from './icons/AppIcons';

interface CommonHeaderProps {
  title: string;
  leftIcon?: {
    name: string;
    onPress: () => void;
    color?: string;
  };
  rightIcons?: Array<{
    name: string;
    onPress: () => void;
    color?: string;
  }>;
}

const getIconComponent = (name: string, color: string = "#FFFFFF") => {
  switch (name) {
    case 'arrow-back':
      return <BackIcon color={color} size={24} />;
    case 'menu':
      return <MenuIcon color={color} size={24} />;
    case 'more-vert':
      return <MoreVertIcon color={color} size={24} />;
    default:
      return null;
  }
};

/**
 * CommonHeader component for consistent header styling across screens
 */
const CommonHeader = ({ title, leftIcon, rightIcons = [] }: CommonHeaderProps) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {leftIcon && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={leftIcon.onPress}
          >
            {getIconComponent(leftIcon.name, leftIcon.color)}
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      
      <View style={styles.headerRight}>
        {rightIcons.map((icon, index) => (
          <TouchableOpacity 
            key={`icon-${index}`}
            style={styles.iconButton} 
            onPress={icon.onPress}
          >
            {getIconComponent(icon.name, icon.color)}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  iconButton: {
    marginHorizontal: 8,
  },
});

export default CommonHeader; 