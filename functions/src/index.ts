import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

// Initialize Firebase Admin
admin.initializeApp();

// Import enhanced token management functions
import {
  generateAgoraToken as enhancedGenerateAgoraToken,
  renewAgoraToken,
  validateAgoraToken,
  cleanupExpiredTokens
} from './agoraTokenManagement';

// Import participant management functions
import {
  cleanupStaleParticipants,
  processScheduledTasks,
  onParticipantJoin,
  onParticipantLeave
} from './participantManagement';

// Import moderation functions
import {
  analyzeChatMessage,
  processExpiredTimeouts,
  cleanupModerationData,
  generateModerationReport
} from './moderationFunctions';

// Import recording functions
import {
  startCloudRecording,
  stopCloudRecording,
  processRecording,
  processRecordingHighlight,
  cleanupOldRecordings
} from './recordingFunctions';

// Import payment functions
import {
  purchaseGems,
  handleStripeWebhook,
  processRevenueSharing,
  generateFinancialReport
} from './paymentFunctions';

// Import notification functions
import {
  sendPushNotification,
  sendBulkNotifications,
  processNotificationReceipts,
  cleanupNotificationData
} from './notificationFunctions';

// Import performance functions
import {
  generateStreamQualityReport,
  processPerformanceAlerts,
  aggregatePerformanceStats,
  cleanupPerformanceData
} from './performanceFunctions';

// Export enhanced functions
export {
  renewAgoraToken,
  validateAgoraToken,
  cleanupExpiredTokens,
  cleanupStaleParticipants,
  processScheduledTasks,
  onParticipantJoin,
  onParticipantLeave,
  analyzeChatMessage,
  processExpiredTimeouts,
  cleanupModerationData,
  generateModerationReport,
  startCloudRecording,
  stopCloudRecording,
  processRecording,
  processRecordingHighlight,
  cleanupOldRecordings,
  purchaseGems,
  handleStripeWebhook,
  processRevenueSharing,
  generateFinancialReport,
  sendPushNotification,
  sendBulkNotifications,
  processNotificationReceipts,
  cleanupNotificationData,
  generateStreamQualityReport,
  processPerformanceAlerts,
  aggregatePerformanceStats,
  cleanupPerformanceData
};

// Use enhanced token generation function
export const generateAgoraToken = enhancedGenerateAgoraToken;

/**
 * Validate Stream Access Cloud Function
 * Validates if a user can join a specific stream
 */
export const validateStreamAccess = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { streamId } = data;

    if (!streamId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'streamId is required'
      );
    }

    // Get stream document from Firestore
    const streamDoc = await admin.firestore()
      .collection('streams')
      .doc(streamId)
      .get();

    if (!streamDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Stream not found'
      );
    }

    const streamData = streamDoc.data();
    const userId = context.auth.uid;

    // Check if stream is active
    if (!streamData?.isActive) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Stream is not active'
      );
    }

    // Check if user is banned from this stream
    if (streamData.bannedUsers && streamData.bannedUsers.includes(userId)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User is banned from this stream'
      );
    }

    // Check if stream has reached maximum capacity
    const maxParticipants = streamData.maxParticipants || 50;
    const currentParticipants = streamData.participants?.length || 0;
    
    if (currentParticipants >= maxParticipants) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Stream has reached maximum capacity'
      );
    }

    return {
      canJoin: true,
      streamData: {
        id: streamId,
        title: streamData.title,
        hostId: streamData.hostId,
        hostName: streamData.hostName,
        isActive: streamData.isActive,
        participantCount: currentParticipants,
        maxParticipants
      }
    };

  } catch (error) {
    console.error('Error validating stream access:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to validate stream access'
    );
  }
});

/**
 * Stream Cleanup Cloud Function
 * Automatically cleans up inactive streams
 */
export const cleanupInactiveStreams = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - (5 * 60 * 1000)
      );

      // Find streams that haven't been updated in 5 minutes
      const inactiveStreamsQuery = await admin.firestore()
        .collection('streams')
        .where('isActive', '==', true)
        .where('lastActivity', '<', fiveMinutesAgo)
        .get();

      const batch = admin.firestore().batch();
      let cleanupCount = 0;

      inactiveStreamsQuery.forEach((doc) => {
        batch.update(doc.ref, {
          isActive: false,
          endedAt: now,
          endReason: 'inactive_timeout'
        });
        cleanupCount++;
      });

      if (cleanupCount > 0) {
        await batch.commit();
        console.log(`Cleaned up ${cleanupCount} inactive streams`);
      }

      return { cleanedUp: cleanupCount };

    } catch (error) {
      console.error('Error cleaning up inactive streams:', error);
      throw error;
    }
  });
