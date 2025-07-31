import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useGuestRestrictions } from '../hooks/useGuestRestrictions';

interface GuestModeIndicatorProps {
  showUpgradePrompt?: boolean;
  onUpgradePress?: () => void;
}

const GuestModeIndicator: React.FC<GuestModeIndicatorProps> = ({ 
  showUpgradePrompt = false,
  onUpgradePress 
}) => {
  const { isGuest } = useAuth();
  const { handleGuestRestriction } = useGuestRestrictions();

  if (!isGuest) return null;

  const handleUpgradePress = () => {
    if (onUpgradePress) {
      onUpgradePress();
    } else {
      handleGuestRestriction('premium features');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.indicator}>
        <MaterialIcons name="person-outline" size={16} color="#FF6B35" />
        <Text style={styles.guestText}>Guest Mode</Text>
      </View>
      
      {showUpgradePrompt && (
        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgradePress}>
          <Text style={styles.upgradeText}>Sign In</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  upgradeButton: {
    backgroundColor: '#6E69F4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  upgradeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default GuestModeIndicator; 