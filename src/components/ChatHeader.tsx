import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ChatHeaderProps {
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  onBack: () => void;
  onProfile: () => void;
  onOptions: () => void;
}

/**
 * Modern chat header component with user info and actions
 */
const ChatHeader = ({ 
  name, 
  avatar, 
  status, 
  onBack, 
  onProfile, 
  onOptions 
}: ChatHeaderProps) => {
  const insets = useSafeAreaInsets();
  
  // Determine status color and text
  const getStatusColor = () => {
    switch(status) {
      case 'online': return '#4CAF50';
      case 'busy': return '#FF4B4B';
      case 'idle': return '#FFCB0E';
      case 'offline': return '#9BA1A6';
      default: return '#9BA1A6';
    }
  };
  
  const getStatusText = () => {
    switch(status) {
      case 'online': return 'Online';
      case 'busy': return 'Do not disturb';
      case 'idle': return 'Away';
      case 'offline': return 'Offline';
      default: return 'Offline';
    }
  };

  return (
    <LinearGradient
      colors={['#1D1E26', '#131318']}
      style={[
        styles.container,
        { paddingTop: insets.top > 0 ? insets.top : 12 }
      ]}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <LinearGradient
            colors={['#FF2D84', '#9B31FE']}
            style={styles.backButtonGradient}
          >
            <MaterialIcons name="arrow-back" size={22} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={onProfile} 
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: avatar }} 
              style={styles.avatar}
            />
            <View 
              style={[
                styles.statusIndicator, 
                { backgroundColor: getStatusColor() }
              ]} 
            />
          </View>
          
          <View style={styles.nameStatusContainer}>
            <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
            <View style={styles.statusContainer}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: getStatusColor() }
                ]} 
              />
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionsButton} 
          onPress={onOptions}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="more-vert" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.divider} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  backButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1D1E26'
  },
  nameStatusContainer: {
    flex: 1
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)'
  },
  optionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 4
  }
});

export default ChatHeader; 