import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
  increment,
  runTransaction,
  getDoc
} from 'firebase/firestore';
import { db, auth, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';

// Notification types
export interface BaseNotification {
  id: string;
  userId: string;
  type: 'friend_request' | 'profile_view' | 'announcement' | 'system' | 'activity' | 'stream_started' | 'gift_received' | 'chat_mention' | 'new_follower';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  data?: any; // Additional data specific to notification type
}

export interface NotificationPreferences {
  userId: string;
  streamStarts: boolean;
  friendGoesLive: boolean;
  newFollower: boolean;
  giftReceived: boolean;
  chatMention: boolean;
  streamEnded: boolean;
  systemUpdates: boolean;
  marketingMessages: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationToken {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
}

export interface FriendRequestNotification extends BaseNotification {
  type: 'friend_request';
  data: {
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar?: string;
    mutualFriends: number;
    status: 'pending' | 'accepted' | 'declined';
  };
}

export interface ProfileViewNotification extends BaseNotification {
  type: 'profile_view';
  data: {
    viewerId: string;
    viewerName: string;
    viewerAvatar?: string;
    isGhostMode: boolean;
    isPremiumViewer: boolean;
    visitCount: number;
  };
}

export interface AnnouncementNotification extends BaseNotification {
  type: 'announcement';
  data: {
    adminId: string;
    adminName: string;
    adminAvatar?: string;
    targetRoute?: string;
    targetParams?: any;
  };
}

export interface ActivityNotification extends BaseNotification {
  type: 'activity';
  data: {
    activityType: 'live_stream' | 'music_listening' | 'gaming' | 'status_update';
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar?: string;
    activityData: any;
  };
}

export type NotificationData = FriendRequestNotification | ProfileViewNotification | AnnouncementNotification | ActivityNotification;

export interface NotificationCounts {
  total: number;
  unread: number;
  friendRequests: number;
  profileViews: number;
  announcements: number;
  activities: number;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  constructor() {
    this.initializePushNotifications();
  }

  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  /**
   * Initialize push notification system
   */
  async initializePushNotifications(): Promise<void> {
    try {
      // Configure notification behavior
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions and register for push notifications
      await this.requestPermissions();
      await this.registerForPushNotifications();
      this.setupNotificationListeners();

      console.log('✅ Push notifications initialized');
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const projectId =
        (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
        (Constants as any)?.expoConfig?.extra?.projectId ||
        (Constants as any)?.manifest?.extra?.eas?.projectId ||
        (Constants as any)?.manifest?.extra?.projectId ||
        process.env.EXPO_PROJECT_ID;

      const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined as any
      );

      this.expoPushToken = token.data;

      // Save token to Firestore
      if (auth.currentUser && this.expoPushToken) {
        await this.saveNotificationToken(this.expoPushToken);
      }

      console.log('✅ Push token registered:', this.expoPushToken);
      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Save notification token to Firestore
   */
  async saveNotificationToken(token: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const userId = auth.currentUser.uid;
      const deviceId = await this.getDeviceId();

      const tokenData = {
        userId,
        token,
        platform: Platform.OS as 'ios' | 'android',
        deviceId,
        isActive: true,
        lastUsed: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      // Check if token already exists
      const existingTokenQuery = query(
        collection(db, 'notificationTokens'),
        where('userId', '==', userId),
        where('deviceId', '==', deviceId)
      );

      const existingTokens = await getDocs(existingTokenQuery);

      if (existingTokens.empty) {
        // Create new token
        await addDoc(collection(db, 'notificationTokens'), tokenData);
      } else {
        // Update existing token
        const tokenDoc = existingTokens.docs[0];
        await updateDoc(tokenDoc.ref, {
          token,
          isActive: true,
          lastUsed: serverTimestamp()
        });
      }

      console.log('✅ Notification token saved');
    } catch (error) {
      console.error('Failed to save notification token:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification received
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    // Custom handling based on notification type
    const notificationType = notification.request.content.data?.type;

    switch (notificationType) {
      case 'stream_started':
        // Could show in-app banner or update UI
        break;
      case 'gift_received':
        // Could play special sound or animation
        break;
      default:
        break;
    }
  }

  /**
   * Handle notification response (user tapped)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    // Navigate based on notification data
    const data = response.notification.request.content.data;

    if (data?.streamId) {
      // Navigate to stream
      console.log('Navigate to stream:', data.streamId);
    } else if (data?.userId) {
      // Navigate to user profile
      console.log('Navigate to user:', data.userId);
    }
  }

  /**
   * Get device ID
   */
  private _cachedDeviceId: string | null = null;
  private async getDeviceId(): Promise<string> {
    if (this._cachedDeviceId) return this._cachedDeviceId;
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const key = 'notification_device_id';
      let deviceId = await AsyncStorage.getItem(key);
      if (!deviceId) {
        const rand = Math.random().toString(36).slice(2);
        deviceId = `device_${Platform.OS}_${Date.now()}_${rand}`;
        await AsyncStorage.setItem(key, deviceId);
      }
      this._cachedDeviceId = deviceId;
      return deviceId;
    } catch {
      // Fallback to session-scoped id
      this._cachedDeviceId = `device_${Platform.OS}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      return this._cachedDeviceId;
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: Omit<NotificationData, 'id' | 'timestamp'>): Promise<string> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required to create notifications');
      }

      // Validate required fields
      if (!notification.userId || notification.userId.trim() === '') {
        throw new Error('userId is required and cannot be empty');
      }

      if (!notification.title || notification.title.trim() === '') {
        throw new Error('title is required and cannot be empty');
      }

      if (!notification.message || notification.message.trim() === '') {
        throw new Error('message is required and cannot be empty');
      }

      const validTypes = ['info', 'warning', 'error', 'success', 'friend_request', 'profile_view', 'activity', 'announcement'];
      if (!notification.type || !validTypes.includes(notification.type)) {
        throw new Error(`type must be one of: ${validTypes.join(', ')}`);
      }

      const notificationData = {
        ...notification,
        timestamp: serverTimestamp(),
        read: false
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);

      // Update notification counts
      await this.updateNotificationCounts(notification.userId);

      return docRef.id;
    } catch (error: any) {
      FirebaseErrorHandler.logError('createNotification', error);
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Get notifications for current user
   */
  async getUserNotifications(userId: string, limitCount: number = 50): Promise<NotificationData[]> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const notifications: NotificationData[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as NotificationData);
      });

      return notifications;
    } catch (error: any) {
      FirebaseErrorHandler.logError('getUserNotifications', error);
      throw new Error(`Failed to get notifications: ${error.message}`);
    }
  }

  /**
   * Listen to real-time notifications
   */
  onNotifications(userId: string, callback: (notifications: NotificationData[]) => void): () => void {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      return onSnapshot(q, (querySnapshot) => {
        const notifications: NotificationData[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          notifications.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          } as NotificationData);
        });

        callback(notifications);
      }, (error) => {
        // Handle permission errors gracefully for guest users
        if (FirebaseErrorHandler.isPermissionError(error)) {
          console.warn('Permission denied for onNotifications - returning empty array for guest user');
          callback([]);
          return;
        }

        console.error('Notifications listener error:', error);
        FirebaseErrorHandler.logError('onNotifications', error);
        callback([]);
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('onNotifications', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('markAsRead', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
      
      // Update notification counts
      await this.updateNotificationCounts(userId);
    } catch (error: any) {
      FirebaseErrorHandler.logError('markAllAsRead', error);
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        // Get the notification to find the userId
        const notificationRef = doc(db, 'notifications', notificationId);
        const notificationDoc = await transaction.get(notificationRef);

        if (!notificationDoc.exists()) {
          throw new Error('Notification not found');
        }

        const notificationData = notificationDoc.data();

        // Delete the notification
        transaction.delete(notificationRef);

        // Update notification counts if the notification was unread
        if (!notificationData.read) {
          const userRef = doc(db, 'users', notificationData.userId);
          transaction.update(userRef, {
            'notificationCounts.total': increment(-1),
            [`notificationCounts.${this.getCountFieldForType(notificationData.type)}`]: increment(-1),
            'notificationCounts.lastUpdated': serverTimestamp()
          });
        }
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('deleteNotification', error);
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  private getCountFieldForType(type: string): string {
    switch (type) {
      case 'announcement': return 'announcements';
      case 'friend_request': return 'friendRequests';
      case 'profile_view': return 'profileViews';
      case 'activity': return 'activities';
      default: return 'activities';
    }
  }

  /**
   * Get notification counts
   */
  async getNotificationCounts(userId: string): Promise<NotificationCounts> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const counts: NotificationCounts = {
        total: 0,
        unread: 0,
        friendRequests: 0,
        profileViews: 0,
        announcements: 0,
        activities: 0
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        counts.total++;
        
        if (!data.read) {
          counts.unread++;
        }

        switch (data.type) {
          case 'friend_request':
            counts.friendRequests++;
            break;
          case 'profile_view':
            counts.profileViews++;
            break;
          case 'announcement':
            counts.announcements++;
            break;
          case 'activity':
            counts.activities++;
            break;
        }
      });

      return counts;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getNotificationCounts - returning zero counts for guest user');
        return {
          total: 0,
          unread: 0,
          friendRequests: 0,
          profileViews: 0,
          announcements: 0,
          activities: 0
        };
      }

      FirebaseErrorHandler.logError('getNotificationCounts', error);
      throw new Error(`Failed to get notification counts: ${error.message}`);
    }
  }

  /**
   * Update notification counts in user profile
   */
  private async updateNotificationCounts(userId: string): Promise<void> {
    try {
      const counts = await this.getNotificationCounts(userId);
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        notificationCounts: counts,
        lastNotificationUpdate: serverTimestamp()
      });
    } catch (error: any) {
      // Don't throw error for count updates to avoid blocking main operations
      console.warn('Failed to update notification counts:', error);
    }
  }

  /**
   * Create friend request notification
   */
  async createFriendRequestNotification(
    toUserId: string, 
    fromUserId: string, 
    fromUserName: string, 
    fromUserAvatar?: string,
    mutualFriends: number = 0
  ): Promise<string> {
    const notification: Omit<FriendRequestNotification, 'id' | 'timestamp'> = {
      userId: toUserId,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${fromUserName} sent you a friend request`,
      read: false,
      data: {
        fromUserId,
        fromUserName,
        fromUserAvatar,
        mutualFriends,
        status: 'pending'
      }
    };

    return this.createNotification(notification);
  }

  /**
   * Create profile view notification
   */
  async createProfileViewNotification(
    profileOwnerId: string,
    viewerId: string,
    viewerName: string,
    viewerAvatar?: string,
    isGhostMode: boolean = false,
    isPremiumViewer: boolean = false,
    visitCount: number = 1
  ): Promise<string> {
    const notification: Omit<ProfileViewNotification, 'id' | 'timestamp'> = {
      userId: profileOwnerId,
      type: 'profile_view',
      title: isGhostMode ? 'Anonymous Profile View' : 'Profile View',
      message: isGhostMode ? 'Someone viewed your profile anonymously' : `${viewerName} viewed your profile`,
      read: false,
      data: {
        viewerId,
        viewerName,
        viewerAvatar,
        isGhostMode,
        isPremiumViewer,
        visitCount
      }
    };

    return this.createNotification(notification);
  }

  /**
   * Create announcement notification
   */
  async createAnnouncementNotification(
    userId: string,
    adminId: string,
    adminName: string,
    message: string,
    adminAvatar?: string,
    targetRoute?: string,
    targetParams?: any
  ): Promise<string> {
    const notification: Omit<AnnouncementNotification, 'id' | 'timestamp'> = {
      userId,
      type: 'announcement',
      title: 'New Announcement',
      message,
      read: false,
      data: {
        adminId,
        adminName,
        adminAvatar,
        targetRoute,
        targetParams
      }
    };

    return this.createNotification(notification);
  }

  /**
   * Send push notification to user
   */
  async sendPushNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    data: any = {}
  ): Promise<string | null> {
    try {
      const sendNotification = httpsCallable(functions, 'sendPushNotification');

      const result = await sendNotification({
        userId,
        type,
        title,
        body,
        data
      });

      const { notificationId } = result.data as any;
      console.log(`✅ Push notification sent: ${notificationId}`);

      return notificationId;
    } catch (error: any) {
      console.error('Failed to send push notification:', error);
      return null;
    }
  }

  /**
   * Streaming-specific notification methods
   */
  async notifyStreamStarted(streamId: string, hostName: string, followers: string[]): Promise<void> {
    try {
      // Create in-app notifications
      const notifications = followers.map(followerId => ({
        userId: followerId,
        type: 'stream_started' as const,
        title: `${hostName} is now live!`,
        message: 'Join the stream now',
        read: false,
        data: { streamId, hostName }
      }));

      // Batch create notifications
      const batch = writeBatch(db);
      notifications.forEach(notification => {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          ...notification,
          timestamp: serverTimestamp()
        });
      });
      await batch.commit();

      // Send push notifications
      await this.sendBulkPushNotifications(
        followers,
        'stream_started',
        `${hostName} is now live!`,
        'Join the stream now',
        { streamId, hostName }
      );

      console.log(`✅ Stream start notifications sent to ${followers.length} followers`);
    } catch (error) {
      console.error('Failed to notify stream started:', error);
    }
  }

  async notifyNewFollower(userId: string, followerName: string, followerId: string): Promise<void> {
    try {
      // Create in-app notification
      await this.createNotification({
        userId,
        type: 'new_follower',
        title: 'New Follower!',
        message: `${followerName} started following you`,
        read: false,
        data: { followerName, followerId }
      });

      // Send push notification
      await this.sendPushNotification(
        userId,
        'new_follower',
        'New Follower!',
        `${followerName} started following you`,
        { followerName, followerId }
      );

      console.log(`✅ New follower notification sent to ${userId}`);
    } catch (error) {
      console.error('Failed to notify new follower:', error);
    }
  }

  async notifyGiftReceived(
    userId: string,
    giftName: string,
    senderName: string,
    value: number,
    streamId?: string
  ): Promise<void> {
    try {
      // Create in-app notification
      await this.createNotification({
        userId,
        type: 'gift_received',
        title: 'Gift Received!',
        message: `${senderName} sent you ${giftName} worth ${value} gold`,
        read: false,
        data: { giftName, senderName, value, streamId }
      });

      // Send push notification
      await this.sendPushNotification(
        userId,
        'gift_received',
        'Gift Received!',
        `${senderName} sent you ${giftName} worth ${value} gold`,
        { giftName, senderName, value, streamId }
      );

      console.log(`✅ Gift received notification sent to ${userId}`);
    } catch (error) {
      console.error('Failed to notify gift received:', error);
    }
  }

  async notifyChatMention(
    userId: string,
    mentionerName: string,
    streamId: string,
    messagePreview: string
  ): Promise<void> {
    try {
      // Create in-app notification
      await this.createNotification({
        userId,
        type: 'chat_mention',
        title: 'You were mentioned!',
        message: `${mentionerName} mentioned you: "${messagePreview}"`,
        read: false,
        data: { mentionerName, streamId, messagePreview }
      });

      // Send push notification
      await this.sendPushNotification(
        userId,
        'chat_mention',
        'You were mentioned!',
        `${mentionerName} mentioned you in chat`,
        { mentionerName, streamId, messagePreview }
      );

      console.log(`✅ Chat mention notification sent to ${userId}`);
    } catch (error) {
      console.error('Failed to notify chat mention:', error);
    }
  }

  /**
   * Send bulk push notifications
   */
  async sendBulkPushNotifications(
    userIds: string[],
    type: string,
    title: string,
    body: string,
    data: any = {}
  ): Promise<string[]> {
    try {
      const sendBulkNotifications = httpsCallable(functions, 'sendBulkNotifications');

      const result = await sendBulkNotifications({
        userIds,
        type,
        title,
        body,
        data
      });

      const { notificationIds } = result.data as any;
      console.log(`✅ Bulk push notifications sent: ${notificationIds.length}`);

      return notificationIds;
    } catch (error: any) {
      console.error('Failed to send bulk push notifications:', error);
      return [];
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(userId?: string): Promise<NotificationPreferences | null> {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) {
        throw new Error('User not authenticated');
      }

      const prefsDoc = await getDoc(doc(db, 'notificationPreferences', targetUserId));

      if (!prefsDoc.exists()) {
        // Create default preferences
        return await this.createDefaultPreferences(targetUserId);
      }

      const data = prefsDoc.data();
      return {
        userId: targetUserId,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as NotificationPreferences;
    } catch (error: any) {
      console.error('Failed to get notification preferences:', error);
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const userId = auth.currentUser.uid;

      await updateDoc(doc(db, 'notificationPreferences', userId), {
        ...preferences,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Notification preferences updated');
    } catch (error: any) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Create default notification preferences
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const defaultPrefs = {
        userId,
        streamStarts: true,
        friendGoesLive: true,
        newFollower: true,
        giftReceived: true,
        chatMention: true,
        streamEnded: false,
        systemUpdates: true,
        marketingMessages: false,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'notificationPreferences', userId), defaultPrefs);

      return {
        ...defaultPrefs,
        createdAt: new Date(),
        updatedAt: new Date()
      } as NotificationPreferences;
    } catch (error: any) {
      console.error('Failed to create default preferences:', error);
      throw error;
    }
  }

  /**
   * Clear notification badge
   */
  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.warn('Failed to clear badge:', error);
    }
  }

  /**
   * Get current push token
   */
  getCurrentPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Cleanup notification listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }

    this.expoPushToken = null;
    console.log('🧹 Notification Service cleaned up');
  }
}

export const notificationService = new NotificationService();
export default notificationService;
