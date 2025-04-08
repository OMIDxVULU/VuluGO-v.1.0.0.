import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
            <MaterialIcons 
              name={leftIcon.name as any} 
              size={24} 
              color={leftIcon.color || "#FFFFFF"} 
            />
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
            <MaterialIcons 
              name={icon.name as any} 
              size={24} 
              color={icon.color || "#FFFFFF"} 
            />
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
  },
  iconButton: {
    marginHorizontal: 8,
  },
});

export default CommonHeader; 