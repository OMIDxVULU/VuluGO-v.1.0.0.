import notificationService from '../services/notificationService';

/**
 * Test utility to create sample notifications for testing the Firebase integration
 * This should only be used in development/testing environments
 */
export const createTestNotifications = async (userId: string) => {
  try {
    console.log('Creating test notifications for user:', userId);

    // Create test announcement
    await notificationService.createAnnouncementNotification(
      userId,
      'admin_test',
      'Test Admin',
      'Welcome to the new Firebase-powered notification system! All notifications are now real-time.',
      'https://ui-avatars.com/api/?background=3A7BFD&color=fff&name=Admin&size=200',
      '/home',
      {}
    );

    // Create test friend request notification
    await notificationService.createNotification({
      userId,
      type: 'friend_request',
      title: 'New Friend Request',
      message: 'John Doe sent you a friend request',
      read: false,
      data: {
        fromUserId: 'test_user_123',
        fromUserName: 'John Doe',
        fromUserAvatar: 'https://ui-avatars.com/api/?background=FF2D55&color=fff&name=John+Doe&size=200',
        mutualFriends: 3,
        status: 'pending' as const
      }
    });

    // Create test profile view notification
    await notificationService.createNotification({
      userId,
      type: 'profile_view',
      title: 'Profile View',
      message: 'Sarah Smith viewed your profile',
      read: false,
      data: {
        viewerId: 'test_user_456',
        viewerName: 'Sarah Smith',
        viewerAvatar: 'https://ui-avatars.com/api/?background=B768FB&color=fff&name=Sarah+Smith&size=200',
        isGhostMode: false,
        isPremiumViewer: true,
        visitCount: 1
      }
    });

    // Create test activity notification
    await notificationService.createNotification({
      userId,
      type: 'activity',
      title: 'New Activity',
      message: 'Mike Johnson started streaming "Gaming Session"',
      read: false,
      data: {
        activityType: 'live_stream' as const,
        fromUserId: 'test_user_789',
        fromUserName: 'Mike Johnson',
        fromUserAvatar: 'https://ui-avatars.com/api/?background=4CAF50&color=fff&name=Mike+Johnson&size=200',
        activityData: { streamId: 'test_stream_123', title: 'Gaming Session' }
      }
    });

    console.log('✅ Test notifications created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to create test notifications:', error);
    return false;
  }
};

/**
 * Clear all notifications for a user (for testing purposes)
 */
export const clearTestNotifications = async (userId: string) => {
  try {
    console.log('Clearing test notifications for user:', userId);
    
    // Get all notifications for the user
    const notifications = await notificationService.getUserNotifications(userId);
    
    // Delete each notification
    for (const notification of notifications) {
      await notificationService.deleteNotification(notification.id);
    }
    
    console.log(`✅ Cleared ${notifications.length} test notifications`);
    return true;
  } catch (error) {
    console.error('❌ Failed to clear test notifications:', error);
    return false;
  }
};

/**
 * Test notification counts and real-time updates
 */
export const testNotificationCounts = async (userId: string) => {
  try {
    console.log('Testing notification counts for user:', userId);
    
    // Get current counts
    const counts = await notificationService.getNotificationCounts(userId);
    console.log('Current notification counts:', counts);
    
    // Get all notifications
    const notifications = await notificationService.getUserNotifications(userId);
    console.log(`Total notifications: ${notifications.length}`);
    
    // Count unread notifications by type
    const unreadByType = {
      announcements: notifications.filter(n => n.type === 'announcement' && !n.read).length,
      friendRequests: notifications.filter(n => n.type === 'friend_request' && !n.read).length,
      profileViews: notifications.filter(n => n.type === 'profile_view' && !n.read).length,
      activities: notifications.filter(n => n.type === 'activity' && !n.read).length,
    };
    
    console.log('Unread notifications by type:', unreadByType);
    
    return { counts, notifications, unreadByType };
  } catch (error) {
    console.error('❌ Failed to test notification counts:', error);
    return null;
  }
};

// Export for easy testing in development
export default {
  createTestNotifications,
  clearTestNotifications,
  testNotificationCounts
};
