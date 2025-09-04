/**
 * Firebase Functions for Push Notifications
 * Handles sending push notifications via Firebase Cloud Messaging and Expo
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const db = admin.firestore();
const expo = new Expo();

/**
 * Send push notification to a single user
 */
export const sendPushNotification = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { userId, type, title, body, data: notificationData } = data;

    if (!userId || !type || !title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userId, type, title, and body are required'
      );
    }

    // Get user's notification preferences
    const preferences = await getUserNotificationPreferences(userId);
    if (!shouldSendNotification(type, preferences)) {
      console.log(`Notification blocked by user preferences: ${type} for user ${userId}`);
      return { success: true, blocked: true };
    }

    // Get user's push tokens
    const tokens = await getUserPushTokens(userId);
    if (tokens.length === 0) {
      console.log(`No push tokens found for user ${userId}`);
      return { success: true, noTokens: true };
    }

    // Create notification record
    const notificationRef = await db.collection('notificationHistory').add({
      userId,
      type,
      title,
      body,
      data: notificationData || {},
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      tokens: tokens.map(t => t.token)
    });

    // Send push notifications
    const results = await sendExpoPushNotifications(tokens, {
      title,
      body,
      data: {
        ...notificationData,
        notificationId: notificationRef.id,
        type
      }
    });

    // Update notification record with results
    await notificationRef.update({
      pushResults: results,
      deliveredCount: results.filter(r => r.status === 'ok').length,
      failedCount: results.filter(r => r.status === 'error').length
    });

    console.log(`Push notification sent to user ${userId}: ${results.length} tokens processed`);

    return {
      success: true,
      notificationId: notificationRef.id,
      tokensProcessed: results.length,
      delivered: results.filter(r => r.status === 'ok').length,
      failed: results.filter(r => r.status === 'error').length
    };

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send push notification'
    );
  }
});

/**
 * Send bulk push notifications to multiple users
 */
export const sendBulkNotifications = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { userIds, type, title, body, data: notificationData } = data;

    if (!userIds || !Array.isArray(userIds) || !type || !title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userIds (array), type, title, and body are required'
      );
    }

    if (userIds.length > 1000) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Maximum 1000 users per bulk notification'
      );
    }

    const results = [];
    const batchSize = 100; // Process in batches to avoid timeouts

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(userId => processBulkNotificationForUser(userId, type, title, body, notificationData))
      );
      results.push(...batchResults);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    console.log(`Bulk notifications processed: ${successful} successful, ${failed} failed`);

    return {
      success: true,
      totalUsers: userIds.length,
      successful,
      failed,
      notificationIds: results.filter(r => r.success).map(r => r.notificationId)
    };

  } catch (error: any) {
    console.error('Error sending bulk notifications:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send bulk notifications'
    );
  }
});

/**
 * Process notification receipts from Expo
 */
export const processNotificationReceipts = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    try {
      // Get pending notification receipts
      const pendingQuery = await db.collection('notificationHistory')
        .where('status', '==', 'sent')
        .where('sentAt', '>', admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        .limit(100)
        .get();

      if (pendingQuery.empty) {
        console.log('No pending notification receipts to process');
        return { processed: 0 };
      }

      let processedCount = 0;

      for (const doc of pendingQuery.docs) {
        const notification = doc.data();
        
        if (notification.pushResults && notification.pushResults.length > 0) {
          const ticketIds = notification.pushResults
            .filter((result: any) => result.status === 'ok' && result.id)
            .map((result: any) => result.id);

          if (ticketIds.length > 0) {
            try {
              const receipts = await expo.getPushNotificationReceiptsAsync(ticketIds);
              
              let deliveredCount = 0;
              let errorCount = 0;
              const errors: any[] = [];

              for (const [ticketId, receipt] of Object.entries(receipts)) {
                if ((receipt as any).status === 'ok') {
                  deliveredCount++;
                } else if ((receipt as any).status === 'error') {
                  errorCount++;
                  errors.push({
                    ticketId,
                    error: (receipt as any).message,
                    details: (receipt as any).details
                  });
                }
              }

              // Update notification record
              await doc.ref.update({
                status: errorCount > 0 ? 'partial' : 'delivered',
                deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
                finalDeliveredCount: deliveredCount,
                finalErrorCount: errorCount,
                deliveryErrors: errors
              });

              processedCount++;
            } catch (receiptError) {
              console.error(`Error processing receipts for notification ${doc.id}:`, receiptError);
            }
          }
        }
      }

      console.log(`Processed ${processedCount} notification receipts`);
      return { processed: processedCount };

    } catch (error) {
      console.error('Error processing notification receipts:', error);
      throw error;
    }
  });

/**
 * Clean up old notification data
 */
export const cleanupNotificationData = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      );

      // Clean up old notification history
      const oldNotificationsQuery = await db.collection('notificationHistory')
        .where('sentAt', '<', thirtyDaysAgo)
        .limit(500)
        .get();

      const batch = db.batch();
      oldNotificationsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Clean up inactive notification tokens
      const inactiveTokensQuery = await db.collection('notificationTokens')
        .where('lastUsed', '<', thirtyDaysAgo)
        .where('isActive', '==', false)
        .limit(500)
        .get();

      inactiveTokensQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`Cleaned up ${oldNotificationsQuery.size + inactiveTokensQuery.size} old notification records`);

      return {
        deletedNotifications: oldNotificationsQuery.size,
        deletedTokens: inactiveTokensQuery.size
      };

    } catch (error) {
      console.error('Error cleaning up notification data:', error);
      throw error;
    }
  });

/**
 * Helper function to get user's notification preferences
 */
async function getUserNotificationPreferences(userId: string): Promise<any> {
  try {
    const prefsDoc = await db.doc(`notificationPreferences/${userId}`).get();
    
    if (!prefsDoc.exists()) {
      // Return default preferences
      return {
        streamStarts: true,
        friendGoesLive: true,
        newFollower: true,
        giftReceived: true,
        chatMention: true,
        streamEnded: false,
        systemUpdates: true,
        marketingMessages: false
      };
    }

    return prefsDoc.data();
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {}; // Return empty object to allow notifications
  }
}

/**
 * Helper function to check if notification should be sent based on preferences
 */
function shouldSendNotification(type: string, preferences: any): boolean {
  switch (type) {
    case 'stream_started':
      return preferences.streamStarts !== false;
    case 'friend_live':
      return preferences.friendGoesLive !== false;
    case 'new_follower':
      return preferences.newFollower !== false;
    case 'gift_received':
      return preferences.giftReceived !== false;
    case 'chat_mention':
      return preferences.chatMention !== false;
    case 'stream_ended':
      return preferences.streamEnded === true;
    case 'system_update':
      return preferences.systemUpdates !== false;
    case 'marketing':
      return preferences.marketingMessages === true;
    default:
      return true; // Allow unknown types by default
  }
}

/**
 * Helper function to get user's push tokens
 */
async function getUserPushTokens(userId: string): Promise<any[]> {
  try {
    const tokensQuery = await db.collection('notificationTokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    return tokensQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user push tokens:', error);
    return [];
  }
}

/**
 * Helper function to send Expo push notifications
 */
async function sendExpoPushNotifications(
  tokens: any[],
  notification: { title: string; body: string; data?: any }
): Promise<ExpoPushTicket[]> {
  try {
    const messages: ExpoPushMessage[] = tokens
      .filter(tokenData => Expo.isExpoPushToken(tokenData.token))
      .map(tokenData => ({
        to: tokenData.token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {}
      }));

    if (messages.length === 0) {
      return [];
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
        // Add error tickets for failed chunk
        tickets.push(...chunk.map(() => ({ status: 'error', message: 'Failed to send' } as ExpoPushTicket)));
      }
    }

    return tickets;
  } catch (error) {
    console.error('Error in sendExpoPushNotifications:', error);
    return [];
  }
}

/**
 * Helper function to process bulk notification for a single user
 */
async function processBulkNotificationForUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  notificationData: any
): Promise<any> {
  try {
    // Check user preferences
    const preferences = await getUserNotificationPreferences(userId);
    if (!shouldSendNotification(type, preferences)) {
      return { success: true, blocked: true, userId };
    }

    // Get user tokens
    const tokens = await getUserPushTokens(userId);
    if (tokens.length === 0) {
      return { success: true, noTokens: true, userId };
    }

    // Create notification record
    const notificationRef = await db.collection('notificationHistory').add({
      userId,
      type,
      title,
      body,
      data: notificationData || {},
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      tokens: tokens.map(t => t.token),
      isBulk: true
    });

    // Send push notifications
    const results = await sendExpoPushNotifications(tokens, {
      title,
      body,
      data: {
        ...notificationData,
        notificationId: notificationRef.id,
        type
      }
    });

    // Update notification record
    await notificationRef.update({
      pushResults: results,
      deliveredCount: results.filter(r => r.status === 'ok').length,
      failedCount: results.filter(r => r.status === 'error').length
    });

    return {
      success: true,
      userId,
      notificationId: notificationRef.id,
      tokensProcessed: results.length
    };

  } catch (error) {
    console.error(`Error processing bulk notification for user ${userId}:`, error);
    return { success: false, userId, error: error.message };
  }
}
