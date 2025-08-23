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
import { db, auth } from './firebase';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';

// Notification types
export interface BaseNotification {
  id: string;
  userId: string;
  type: 'friend_request' | 'profile_view' | 'announcement' | 'system' | 'activity';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  data?: any; // Additional data specific to notification type
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
  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
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
        console.error('Notifications listener error:', error);
        FirebaseErrorHandler.logError('onNotifications', error);
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
}

export const notificationService = new NotificationService();
export default notificationService;
