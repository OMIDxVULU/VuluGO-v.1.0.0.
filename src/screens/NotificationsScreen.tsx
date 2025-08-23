import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ScrollView, Image, Platform, UIManager, LayoutAnimation, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import { useRouter } from 'expo-router';
import CustomModal from '../components/CustomModal';
import { useModal } from '../hooks/useModal';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import notificationService, { NotificationData } from '../services/notificationService';

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animationConfig = {
  duration: 300,
  create: { 
    type: LayoutAnimation.Types.spring, 
    property: LayoutAnimation.Properties.scaleXY, 
    springDamping: 0.7 
  },
  update: { 
    type: LayoutAnimation.Types.spring, 
    springDamping: 0.7 
  },
  delete: { 
    type: LayoutAnimation.Types.spring, 
    property: LayoutAnimation.Properties.scaleXY, 
    springDamping: 0.7 
  },
};

// Firebase-Integrated Notification Widget Component
interface NotificationWidgetProps {
  title: string;
  type: 'announcement' | 'friend_request' | 'profile_view' | 'activity';
  icon: string;
  iconColor: string;
  notifications: NotificationData[];
  isLoading: boolean;
  isMarkingAllRead?: boolean;
  onNotificationPress: (notification: NotificationData) => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
}

const NotificationWidget: React.FC<NotificationWidgetProps> = ({
  title,
  type,
  icon,
  iconColor,
  notifications,
  isLoading,
  isMarkingAllRead = false,
  onNotificationPress,
  onMarkAllRead,
  onRefresh
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleExpand = () => {
    // Disable expansion while marking all as read
    if (isMarkingAllRead) {
      return;
    }

    LayoutAnimation.configureNext(animationConfig);
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      onMarkAllRead();
    } else {
      setVisibleCount(3);
    }
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + 5, notifications.length));
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  };

  const generateAvatar = (name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('');
    return `https://ui-avatars.com/api/?background=${iconColor.replace('#', '')}&color=fff&name=${initials}&size=200`;
  };

  return (
    <TouchableOpacity
      style={[styles.widgetContainer, isMarkingAllRead && styles.disabledWidget]}
      onPress={toggleExpand}
      activeOpacity={isMarkingAllRead ? 1 : 0.9}
      disabled={isMarkingAllRead}
    >
      <View style={styles.widgetHeader}>
        <View style={styles.widgetTitleContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name={icon as any} size={18} color={iconColor} style={{ marginRight: 6 }} />
            <Text style={styles.widgetTitle}>{title}</Text>
            {isMarkingAllRead && (
              <Text style={styles.loadingText}> (marking as read...)</Text>
            )}
          </View>
          {unreadCount > 0 && (
            <View style={styles.widgetCountBadge}>
              <Text style={styles.widgetCountText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View>
          {isMarkingAllRead ? (
            <MaterialIcons name="hourglass-empty" size={24} color="#A0A0A0" />
          ) : (
            <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={24} color="#FFFFFF" />
          )}
        </View>
      </View>

      {isExpanded && (
        <View style={styles.widgetContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : notifications.length > 0 ? (
            <>
              <ScrollView
                style={visibleCount > 3 ? styles.scrollableContent : undefined}
                nestedScrollEnabled={true}
                refreshControl={
                  <RefreshControl
                    refreshing={isLoading}
                    onRefresh={onRefresh}
                    tintColor="#FFFFFF"
                  />
                }
              >
                {notifications.slice(0, visibleCount).map((notification) => {
                  // Get sender name and avatar based on notification type
                  let senderName = 'User';
                  let senderAvatar = '';

                  switch (notification.type) {
                    case 'announcement':
                      senderName = notification.data.adminName || 'Admin';
                      senderAvatar = notification.data.adminAvatar || generateAvatar(senderName);
                      break;
                    case 'friend_request':
                      senderName = notification.data.fromUserName;
                      senderAvatar = notification.data.fromUserAvatar || generateAvatar(senderName);
                      break;
                    case 'profile_view':
                      senderName = notification.data.viewerName;
                      senderAvatar = notification.data.viewerAvatar || generateAvatar(senderName);
                      break;
                    case 'activity':
                      senderName = notification.data.fromUserName;
                      senderAvatar = notification.data.fromUserAvatar || generateAvatar(senderName);
                      break;
                    default:
                      senderAvatar = generateAvatar(senderName);
                  }

                  return (
                    <TouchableOpacity
                      key={notification.id}
                      style={[styles.notificationItem, !notification.read && styles.unreadNotification]}
                      onPress={() => onNotificationPress(notification)}
                      activeOpacity={0.7}
                    >
                      <Image source={{ uri: senderAvatar }} style={styles.notificationAvatar} />
                      <View style={styles.notificationContent}>
                        <Text style={[styles.notificationMessage, !notification.read && styles.unreadText]}>
                          {notification.message}
                        </Text>
                        <Text style={styles.notificationTime}>{formatTime(notification.timestamp)}</Text>
                      </View>
                      {!notification.read && <View style={styles.unreadIndicator} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              
              {visibleCount < notifications.length && (
                <TouchableOpacity 
                  style={styles.moreButton}
                  onPress={handleLoadMore}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreButtonText}>Load More</Text>
                  <MaterialIcons name="expand-more" size={18} color="#A0A0A0" />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialIcons name={icon as any} size={48} color="#8F8F8F" />
              <Text style={styles.emptyStateTitle}>No {title.toLowerCase()}</Text>
              <Text style={styles.emptyStateText}>Check back later for updates</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Main Notifications Screen Component
const NotificationsScreen = () => {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { notifications, counts, isLoading, markNotificationAsRead, refreshNotifications } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState<Set<string>>(new Set());

  // Filter notifications by type
  const announcements = notifications.filter(n => n.type === 'announcement');
  const friendRequests = notifications.filter(n => n.type === 'friend_request');
  const profileViews = notifications.filter(n => n.type === 'profile_view');
  const activities = notifications.filter(n => n.type === 'activity');

  const handleNotificationPress = async (notification: NotificationData) => {
    try {
      // Mark notification as read
      await markNotificationAsRead(notification.id);

      // Navigate based on notification type and data
      switch (notification.type) {
        case 'announcement':
          if (notification.data.targetRoute) {
            router.push({
              pathname: notification.data.targetRoute,
              params: notification.data.targetParams || {}
            });
          }
          break;

        case 'friend_request':
          router.push({
            pathname: '/profile',
            params: { userId: notification.data.fromUserId }
          });
          break;

        case 'profile_view':
          router.push({
            pathname: '/profile',
            params: { userId: notification.data.viewerId }
          });
          break;

        case 'activity':
          router.push({
            pathname: '/profile',
            params: { userId: notification.data.fromUserId }
          });
          break;

        default:
          console.log('No navigation defined for notification type:', notification.type);
      }
    } catch (error) {
      console.error('Failed to handle notification press:', error);
    }
  };

  const handleMarkAllRead = async (type: string) => {
    // Prevent concurrent operations on the same type
    if (markingAllRead.has(type)) {
      return;
    }

    try {
      // Set loading state for this type
      setMarkingAllRead(prev => new Set([...prev, type]));

      const typeNotifications = notifications.filter(n => n.type === type && !n.read);

      if (typeNotifications.length === 0) {
        return;
      }

      // Optimistic UI update - mark notifications as read locally immediately
      // This will be handled by the NotificationContext's real-time listener

      // Send all mark-as-read requests in parallel
      const markReadPromises = typeNotifications.map(notification =>
        markNotificationAsRead(notification.id).catch(error => {
          console.error(`Failed to mark notification ${notification.id} as read:`, error);
          return { error, notificationId: notification.id };
        })
      );

      const results = await Promise.allSettled(markReadPromises);

      // Check for any failures
      const failures = results
        .filter((result): result is PromiseFulfilledResult<{ error: any; notificationId: string }> =>
          result.status === 'fulfilled' && result.value && 'error' in result.value
        )
        .map(result => result.value);

      if (failures.length > 0) {
        console.error(`Failed to mark ${failures.length} notifications as read:`, failures);
        // Note: The real-time listener will automatically sync the correct state from Firebase
        // so we don't need to manually rollback the optimistic update
      }

    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // The real-time listener will ensure the UI reflects the actual Firebase state
    } finally {
      // Clear loading state for this type
      setMarkingAllRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(type);
        return newSet;
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <CommonHeader 
          title="Notifications" 
          rightIcons={[
            {
              name: 'more-vert',
              color: '#FFFFFF',
              onPress: () => router.push('/notification-settings')
            }
          ]}
        />
        <View style={styles.guestContainer}>
          <MaterialIcons name="notifications-off" size={64} color="#8F8F8F" />
          <Text style={styles.guestTitle}>Sign in to view notifications</Text>
          <Text style={styles.guestText}>Create an account or sign in to receive notifications from friends and the community</Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CommonHeader 
        title="Notifications" 
        rightIcons={[
          {
            name: 'more-vert',
            color: '#FFFFFF',
            onPress: () => router.push('/notification-settings')
          }
        ]}
      />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
          />
        }
      > 
        <NotificationWidget
          title="Announcements"
          type="announcement"
          icon="campaign"
          iconColor="#3A7BFD"
          notifications={announcements}
          isLoading={isLoading}
          isMarkingAllRead={markingAllRead.has('announcement')}
          onNotificationPress={handleNotificationPress}
          onMarkAllRead={() => handleMarkAllRead('announcement')}
          onRefresh={handleRefresh}
        />

        <NotificationWidget
          title="Friend Requests"
          type="friend_request"
          icon="person-add"
          iconColor="#FF2D55"
          notifications={friendRequests}
          isLoading={isLoading}
          isMarkingAllRead={markingAllRead.has('friend_request')}
          onNotificationPress={handleNotificationPress}
          onMarkAllRead={() => handleMarkAllRead('friend_request')}
          onRefresh={handleRefresh}
        />

        <NotificationWidget
          title="Profile Views"
          type="profile_view"
          icon="visibility"
          iconColor="#B768FB"
          notifications={profileViews}
          isLoading={isLoading}
          isMarkingAllRead={markingAllRead.has('profile_view')}
          onNotificationPress={handleNotificationPress}
          onMarkAllRead={() => handleMarkAllRead('profile_view')}
          onRefresh={handleRefresh}
        />

        <NotificationWidget
          title="Activities"
          type="activity"
          icon="notifications"
          iconColor="#4CAF50"
          notifications={activities}
          isLoading={isLoading}
          isMarkingAllRead={markingAllRead.has('activity')}
          onNotificationPress={handleNotificationPress}
          onMarkAllRead={() => handleMarkAllRead('activity')}
          onRefresh={handleRefresh}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  guestText: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  signInButton: {
    backgroundColor: '#3A7BFD',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  widgetContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  disabledWidget: {
    opacity: 0.6,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  widgetTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  widgetCountBadge: {
    backgroundColor: '#FF2D55',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  widgetCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  widgetContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#A0A0A0',
    fontSize: 16,
  },
  scrollableContent: {
    maxHeight: 300,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  unreadNotification: {
    backgroundColor: 'rgba(58, 123, 253, 0.1)',
  },
  notificationAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A7BFD',
    marginLeft: 8,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  moreButtonText: {
    color: '#A0A0A0',
    fontSize: 14,
    marginRight: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;
