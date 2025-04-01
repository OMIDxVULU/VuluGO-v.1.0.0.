import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

interface MenuButtonProps {
  onPress: () => void;
  color?: string;
}

const MenuButton = ({ onPress, color = '#FFFFFF' }: MenuButtonProps) => {
  return (
    <TouchableOpacity style={styles.menuButtonContainer} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name="more-vert" size={24} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  menuButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default MenuButton; 