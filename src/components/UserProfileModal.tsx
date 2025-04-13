import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import UserStatusIndicator from './UserStatusIndicator';
import { StatusType, getStatusColor } from '../context/UserStatusContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UserProfileModalProps {
  visible: boolean;
  user: {
    id: string;
    name: string;
    avatar: string;
    status: StatusType;
    level?: number;
    bio?: string;
    badges?: Array<{
      id: string;
      icon: string;
      name: string;
      description?: string;
    }>;
    mutualFriends?: number;
    joinedDate?: string;
    isFriend?: boolean;
    isBlocked?: boolean;
  };
  onClose: () => void;
  onSendMessage?: () => void;
  onAddFriend?: () => void;
  onRemoveFriend?: () => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  onReport?: () => void;
}

const UserProfileModal = ({
  visible,
  user,
  onClose,
  onSendMessage,
  onAddFriend,
  onRemoveFriend,
  onBlock,
  onUnblock,
  onReport,
}: UserProfileModalProps) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
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

  // Get status text based on user's status
  const getStatusText = () => {
    switch (user.status) {
      case 'online':
        return 'Online';
      case 'busy':
        return 'Do Not Disturb';
      case 'away':
        return 'Away';
      case 'invisible':
        return 'Invisible';
      case 'offline':
        return 'Offline';
      case 'hosting':
        return 'Hosting';
      case 'watching':
        return 'Watching';
      case 'spotlight':
        return 'In Spotlight';
      // Mood statuses
      case 'happy':
        return 'Happy';
      case 'sad':
        return 'Sad';
      case 'angry':
        return 'Angry';
      case 'hungry':
        return 'Hungry';
      case 'sleepy':
        return 'Sleepy';
      case 'excited':
        return 'Excited';
      case 'bored':
        return 'Bored';
      case 'love':
        return 'In Love';
      default:
        return 'Offline';
    }
  };

  const getStatusBorderColor = () => {
    const statusColor = getStatusColor(user.status);
    return statusColor;
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: opacity }]}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: translateY }] },
            Platform.OS === 'ios' && styles.iosShadow,
          ]}
        >
          <LinearGradient
            colors={['#272830', '#1D1E26']}
            style={styles.gradientBackground}
          >
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <ScrollView style={styles.scrollContainer}>
              {/* Profile Header */}
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                  <UserStatusIndicator
                    status={user.status}
                    pillStyle={styles.statusPill}
                    textStyle={styles.statusPillText}
                  />
                </View>

                <Text style={styles.userName}>{user.name}</Text>

                {/* Status Badge */}
                <View style={styles.statusBadge}>
                  <UserStatusIndicator 
                    status={user.status}
                    showText={false}
                    size={8}
                    containerStyle={styles.statusDot}
                  />
                  <Text style={[
                    styles.statusBadgeText,
                    { color: getStatusText() === 'Offline' ? '#8E8E93' : undefined }
                  ]}>
                    {getStatusText()}
                  </Text>
                </View>

                {user.level && (
                  <View style={styles.levelContainer}>
                    <MaterialIcons name="local-fire-department" size={18} color="#FF9500" />
                    <Text style={styles.levelText}>Level {user.level}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {user.isFriend ? (
                  <>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={onSendMessage}
                    >
                      <MaterialIcons name="chat" size={20} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={onRemoveFriend}
                    >
                      <MaterialIcons name="person-remove" size={20} color="#FFFFFF" />
                      <Text style={styles.secondaryButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={onAddFriend}
                  >
                    <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Add Friend</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* User Info */}
              {user.bio && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.bioText}>{user.bio}</Text>
                </View>
              )}

              {/* Badges */}
              {user.badges && user.badges.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Badges</Text>
                  <View style={styles.badgesContainer}>
                    {user.badges.map((badge) => (
                      <View key={badge.id} style={styles.badgeItem}>
                        <View style={styles.badgeIcon}>
                          <MaterialIcons name={badge.icon as any} size={24} color="#B768FB" />
                        </View>
                        <Text style={styles.badgeName}>{badge.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Mutual Friends */}
              {user.mutualFriends !== undefined && user.mutualFriends > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Mutual Friends</Text>
                  <Text style={styles.mutualFriendsText}>
                    {user.mutualFriends} {user.mutualFriends === 1 ? 'friend' : 'friends'} in common
                  </Text>
                </View>
              )}

              {/* Joined Date */}
              {user.joinedDate && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Joined</Text>
                  <Text style={styles.joinedDateText}>{user.joinedDate}</Text>
                </View>
              )}

              {/* More Options */}
              <View style={styles.moreOptionsSection}>
                {user.isBlocked ? (
                  <TouchableOpacity style={styles.optionButton} onPress={onUnblock}>
                    <MaterialIcons name="person-add" size={24} color="#4CAF50" />
                    <Text style={[styles.optionText, { color: '#4CAF50' }]}>Unblock User</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.optionButton} onPress={onBlock}>
                    <MaterialIcons name="block" size={24} color="#FF4B4B" />
                    <Text style={[styles.optionText, { color: '#FF4B4B' }]}>Block User</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.optionButton} onPress={onReport}>
                  <MaterialIcons name="report" size={24} color="#FF9500" />
                  <Text style={[styles.optionText, { color: '#FF9500' }]}>Report User</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#272830',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    width: '100%',
    overflow: 'hidden',
  },
  gradientBackground: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  iosShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(110, 105, 244, 0.3)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6E69F4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(183, 104, 251, 0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeName: {
    fontSize: 14,
    color: '#B768FB',
    fontWeight: '500',
  },
  mutualFriendsText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  joinedDateText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  moreOptionsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  optionText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
  statusPill: {
    position: 'absolute',
    bottom: -12,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#1D1E26',
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default UserProfileModal; 