import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  Image,
  Platform,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import ViewerIcon from './ViewerIcon';
import FuelIcon from './FuelIcon';
import { useLiveStreams } from '../context/LiveStreamContext';

const { height, width } = Dimensions.get('window');

interface ActivityModalProps {
  visible: boolean;
  onClose: () => void;
  activityType: 'watching' | 'hosting' | 'listening' | 'tournament';
  streamId: string; // Now using the streamId directly for consistent referencing
  title?: string; // Optional fallback
  subtitle?: string;
  hostName?: string; // Optional fallback
  hostAvatar?: string; // Optional fallback
  viewerCount?: number; // Optional fallback
  avatars?: string[]; // Optional fallback
  friendName?: string; // Optional fallback
  friendAvatar?: string; // Optional fallback
  // Fuel token props
  fuelRequired?: number;
  fuelAvailable?: number;
}

// Add a new function to generate realistic viewer counts
const getRealisticViewerCount = () => {
  // Generate a more realistic viewer count (between 20 and 95)
  return Math.floor(Math.random() * 75) + 20;
};

// Replace or update the formatNumber function
const formatNumber = (num: number): string => {
  // For small numbers, just return the number
  if (num < 1000) {
    return num.toString();
  }
  
  // For thousands
  if (num < 10000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  
  // For large numbers
  return Math.floor(num / 1000) + 'k';
};

// Add dynamic styles based on activity type
const getFriendAvatarStyle = (activityType: string) => {
  const baseStyle = {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
  };
  
  switch (activityType) {
    case 'watching':
      return [baseStyle, { borderColor: '#4B8BFF' }]; // Blue for watching
    case 'listening':
      return [baseStyle, { borderColor: '#34C759' }]; // Light green for listening
    case 'hosting':
      return [baseStyle, { borderColor: '#FF4B4B' }]; // Red for hosting
    default:
      return [baseStyle, { borderColor: '#6E56F7' }]; // Default purple
  }
};

// Add a function to calculate and format the fuel duration
const formatFuelDuration = (fuelAmount: number): string => {
  const totalSeconds = fuelAmount * 5; // 1 fuel lasts 5 seconds
  
  if (totalSeconds < 60) {
    return `${totalSeconds} seconds`;
  } else {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (seconds === 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes} min ${seconds} sec`;
    }
  }
};

const ActivityModal = ({
  visible,
  onClose,
  activityType,
  streamId,
  title: fallbackTitle,
  subtitle,
  hostName: fallbackHostName,
  hostAvatar: fallbackHostAvatar,
  viewerCount: fallbackViewerCount = getRealisticViewerCount(),
  friendName: fallbackFriendName = "Friend",
  friendAvatar: fallbackFriendAvatar,
  avatars: fallbackAvatars = [],
  // Fuel token props with defaults
  fuelRequired = 10,
  fuelAvailable = 25,
}: ActivityModalProps) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [showFuelModal, setShowFuelModal] = useState(false);
  const router = useRouter();
  
  // Use the LiveStreamContext to get consistent data
  const { getStreamById, joinStream } = useLiveStreams();
  const stream = getStreamById(streamId);
  
  // Fallback to props if stream not found (shouldn't happen if properly implemented)
  const title = stream?.title || fallbackTitle || 'Untitled Stream';
  const hostName = stream?.hosts[0]?.name || fallbackHostName || 'Host';
  const hostAvatar = stream?.hosts[0]?.avatar || fallbackHostAvatar || '';
  const viewerCount = stream?.views || fallbackViewerCount;
  const avatars = stream?.hosts.map(host => host.avatar) || fallbackAvatars;
  
  // For friends, we need to determine based on activity type
  let friendName = fallbackFriendName;
  let friendAvatar = fallbackFriendAvatar;
  
  if (stream?.friends && stream.friends.length > 0 && activityType === 'watching') {
    // We have friend data and it's a watching activity
    friendName = stream.friends[0].name;
    friendAvatar = stream.friends[0].avatar;
  } else if (activityType === 'hosting' && stream?.hosts && stream.hosts.length > 0) {
    // For hosting, the friend is actually the host
    friendName = stream.hosts[0].name;
    friendAvatar = stream.hosts[0].avatar;
  }

  // Configure pan responder for swipe down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Only allow dragging downward
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // If dragged down more than 100px, close the modal
          closeModal();
        } else {
          // Otherwise, snap back to position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(height);
      opacity.setValue(0);
      
      // Animate in when visible changes to true
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const closeModal = () => {
    // Animate out when closing
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Determine action button text based on activity type
  const getActionButtonText = () => {
    switch (activityType) {
      case 'watching':
      case 'hosting':
        return 'Join Live';
      case 'listening':
        return 'Listen Together';
      case 'tournament':
        return 'View Tournament';
      default:
        return 'Join';
    }
  };

  // Check if user has enough fuel
  const hasEnoughFuel = fuelAvailable >= fuelRequired;

  // Handle action button press
  const handleActionPress = () => {
    if (fuelAvailable === 0) {
      // Show insufficient fuel modal
      setShowFuelModal(true);
    } else {
      // Proceed with joining
      console.log('Joining activity, fuel will be consumed at 1 per 5 seconds');
      
      // Use the joinStream function from context to track that we're joining
      joinStream(streamId);
      
      // Navigate to the live stream 
      if (activityType === 'watching' || activityType === 'hosting') {
        // Navigate to stream view with parameters
        router.push({
          pathname: '/livestream',
          params: {
            streamId: streamId,
            title: title,
            hostName: hostName,
            hostAvatar: hostAvatar,
            viewCount: viewerCount.toString(),
            hostCount: avatars.length.toString()
          }
        });
      }
      
      // Close modal after joining
      closeModal();
    }
  };

  // Close fuel modal
  const closeFuelModal = () => {
    setShowFuelModal(false);
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      {/* Backdrop with tap to close */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={closeModal}
      >
        <Animated.View style={[styles.backdropContent, { opacity }]}>
          <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        </Animated.View>
      </TouchableOpacity>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Handle for dragging */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Scrollable Content Container */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Activity Content */}
          <View>
            {/* Friend Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>YOUR FRIEND</Text>
              <View style={styles.friendContainer}>
                {friendAvatar && (
                  <Image source={{ uri: friendAvatar }} style={getFriendAvatarStyle(activityType)} />
                )}
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friendName}</Text>
                  <Text style={styles.activityTypeText}>
                    is {activityType === 'watching' ? 'watching' : 
                        activityType === 'hosting' ? 'hosting' :
                        activityType === 'listening' ? 'listening to' : 
                        'in'} this live
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Divider */}
            <View style={styles.divider} />
            
            {/* Live + Hosts Section (Combined) */}
            <View style={styles.section}>
              <View style={styles.liveTitleContainer}>
                <Text style={styles.sectionLabel}>LIVE</Text>
                
                {/* Enhanced Viewer Count */}
                {viewerCount !== undefined && (
                  <View style={styles.enhancedViewerContainer}>
                    <ViewerIcon width={20} height={20} />
                    <View style={styles.viewerTextContainer}>
                      <Text style={styles.enhancedViewerCount}>
                        {formatNumber(viewerCount)}
                      </Text>
                      <Text style={styles.viewersLabel}>viewers</Text>
                    </View>
                  </View>
                )}
              </View>
              
              {/* Title */}
              <Text style={styles.liveTitle} numberOfLines={2}>{title}</Text>
              
              {/* Subtitle if available */}
              {subtitle && (
                <Text style={styles.subtitle}>{subtitle}</Text>
              )}
              
              {/* Hosts */}
              {(hostAvatar || avatars.length > 0) && (
                <View style={styles.hostsContainer}>
                  <Text style={styles.hostsLabel}>Hosted by:</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hostsList}
                  >
                    {/* Primary host */}
                    {hostAvatar && (
                      <View style={styles.hostItem}>
                        <Image source={{ uri: hostAvatar }} style={styles.hostAvatar} />
                        {hostName && <Text style={styles.hostName}>{hostName}</Text>}
                      </View>
                    )}
                    
                    {/* Additional hosts/participants */}
                    {avatars.slice(0, 5).map((avatar, index) => (
                      hostAvatar && avatar === hostAvatar ? null : (
                        <View key={index} style={styles.hostItem}>
                          <Image source={{ uri: avatar }} style={styles.hostAvatar} />
                        </View>
                      )
                    ))}
                    
                    {/* Show +X more if there are more than 5 hosts */}
                    {avatars.length > 5 && (
                      <View style={styles.moreHostsContainer}>
                        <Text style={styles.moreHostsText}>+{avatars.length - 5}</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
            
            {/* Fuel Section */}
            <View style={styles.fuelSection}>
              <View style={styles.fuelInfoContainer}>
                <Text style={styles.fuelLabel}>FUEL CONSUMPTION</Text>
                <View style={styles.fuelValueContainer}>
                  <FuelIcon width={20} height={20} />
                  <Text style={styles.fuelValue}>{fuelAvailable}</Text>
                </View>
              </View>
              
              <View style={styles.fuelProgressContainer}>
                <View style={styles.fuelBarContainer}>
                  <View style={styles.fuelBarTrack}>
                    <View 
                      style={[
                        styles.fuelBarFill,
                        { width: `${Math.min(100, (fuelAvailable / 100) * 100)}%` },
                        fuelAvailable === 0 && styles.fuelBarInsufficient
                      ]} 
                    />
                    {/* Depletion arrows */}
                    <View style={styles.depletionArrows}>
                      <MaterialIcons name="keyboard-arrow-left" size={16} color="rgba(255,255,255,0.6)" />
                      <MaterialIcons name="keyboard-arrow-left" size={16} color="rgba(255,255,255,0.6)" />
                      <MaterialIcons name="keyboard-arrow-left" size={16} color="rgba(255,255,255,0.6)" />
                    </View>
                  </View>
                  {fuelAvailable === 0 && (
                    <Text style={styles.insufficientText}>No fuel available</Text>
                  )}
                  <Text style={styles.consumptionRateText}>
                    Lasts {formatFuelDuration(fuelAvailable)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
        
        {/* Action Button - Fixed at bottom */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity 
            style={[styles.primaryAction, fuelAvailable === 0 && styles.insufficientAction]}
            onPress={handleActionPress}
          >
            <LinearGradient
              colors={fuelAvailable > 0 ? ['#7B5EFF', '#F358E2'] : ['#666', '#999']}
              style={styles.primaryActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryActionText}>
                {fuelAvailable > 0 ? getActionButtonText() : `Buy More Fuel`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      {/* Insufficient Fuel Modal */}
      <Modal visible={showFuelModal} transparent animationType="fade">
        <View style={styles.fuelModalBackdrop}>
          <View style={styles.fuelModalContainer}>
            <View style={styles.fuelModalHeader}>
              <FuelIcon width={48} height={48} />
              <Text style={styles.fuelModalTitle}>Need More Fuel</Text>
            </View>
            
            <Text style={styles.fuelModalText}>
              You need fuel to join this {activityType}. Fuel is consumed at a rate of 1 unit every 5 seconds while you're in the activity.
            </Text>
            
            <View style={styles.fuelRequiredDisplay}>
              <View style={styles.fuelCount}>
                <Text style={styles.fuelCountValue}>{fuelAvailable}</Text>
                <Text style={styles.fuelCountLabel}>Current</Text>
              </View>
              
              <View style={styles.fuelArrow}>
                <MaterialIcons name="arrow-forward" size={24} color="rgba(255,255,255,0.7)" />
              </View>
              
              <View style={styles.fuelCount}>
                <Text style={styles.fuelCountValue}>{fuelRequired}</Text>
                <Text style={styles.fuelCountLabel}>Required</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.buyFuelButton}>
              <LinearGradient
                colors={['#F2E558', '#F358E2']}
                style={styles.buyFuelGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buyFuelText}>Buy Fuel</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelFuelButton}
              onPress={closeFuelModal}
            >
              <Text style={styles.cancelFuelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdropContent: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E1E25',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: height * 0.3,
    maxHeight: height * 0.85,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90, // Space for fixed button
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  friendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  activityTypeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  viewerContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  viewerCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  viewerLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  liveTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
  },
  hostsContainer: {
    marginTop: 12,
  },
  hostsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  hostsList: {
    paddingVertical: 8,
  },
  hostItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  hostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#FF4B4B',
  },
  hostName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  moreHostsContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  moreHostsText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  primaryAction: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: "#7B5EFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryActionGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  liveTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  enhancedViewerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 33, 42, 0.7)', 
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  viewerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  enhancedViewerCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 5,
  },
  viewersLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  fuelSection: {
    backgroundColor: 'rgba(39, 39, 45, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(123, 94, 255, 0.2)',
  },
  fuelInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  fuelLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  fuelValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 229, 88, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fuelValue: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F2E558',
    textShadowColor: 'rgba(242, 229, 88, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  fuelProgressContainer: {
    marginTop: 0,
  },
  fuelBarContainer: {
    position: 'relative',
  },
  fuelBarTrack: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  fuelBarFill: {
    height: '100%',
    backgroundColor: '#7B5EFF',
    borderRadius: 6,
  },
  depletionArrows: {
    position: 'absolute',
    top: -2,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fuelBarInsufficient: {
    backgroundColor: '#FF6B6B',
    boxShadow: '0 0 8px rgba(255, 107, 107, 0.5)',
  },
  insufficientText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
    textAlign: 'right',
  },
  consumptionRateText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 6,
    textAlign: 'right',
  },
  insufficientAction: {
    opacity: 0.9,
  },
  fuelModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fuelModalContainer: {
    backgroundColor: '#1E1E25',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(242, 229, 88, 0.3)',
  },
  fuelModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  fuelModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    textShadowColor: 'rgba(242, 229, 88, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  fuelModalText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  fuelRequiredDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
  },
  fuelCount: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(39, 39, 45, 0.8)',
    width: 90,
    borderWidth: 1,
    borderColor: 'rgba(242, 229, 88, 0.3)',
  },
  fuelCountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fuelCountLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  fuelArrow: {
    paddingHorizontal: 16,
  },
  buyFuelButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buyFuelGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyFuelText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
  },
  cancelFuelButton: {
    paddingVertical: 12,
  },
  cancelFuelText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
});

export default ActivityModal; 