/**
 * Firebase Functions for Automated Stream Moderation
 * Handles real-time message analysis and automated moderation actions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Analyze chat message for violations when created
 */
export const analyzeChatMessage = functions.firestore
  .document('streams/{streamId}/chat/{messageId}')
  .onCreate(async (snapshot, context) => {
    try {
      const { streamId, messageId } = context.params;
      const messageData = snapshot.data();

      console.log(`Analyzing message ${messageId} in stream ${streamId}`);

      // Skip analysis for deleted or system messages
      if (messageData.isDeleted || messageData.type === 'system') {
        return;
      }

      // Analyze message content
      const analysisResult = await analyzeMessageContent(
        messageData.message,
        messageData.senderId,
        streamId
      );

      // If violation detected, take action
      if (analysisResult.isViolation) {
        await handleModerationViolation(
          streamId,
          messageId,
          messageData.senderId,
          analysisResult
        );
      }

      // Log analysis result
      await db.collection('messageAnalysis').add({
        streamId,
        messageId,
        userId: messageData.senderId,
        message: messageData.message,
        analysisResult,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error('Error analyzing chat message:', error);
    }
  });

/**
 * Process expired timeouts and unmute users
 */
export const processExpiredTimeouts = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Find expired timeouts
      const expiredTimeoutsQuery = await db.collection('streamModerationActions')
        .where('action', '==', 'timeout')
        .where('expiresAt', '<=', now)
        .where('isProcessed', '==', false)
        .get();

      const batch = db.batch();
      let processedCount = 0;

      for (const doc of expiredTimeoutsQuery.docs) {
        const action = doc.data();
        
        // Unmute the user in the stream
        const streamRef = db.doc(`streams/${action.streamId}`);
        const streamDoc = await streamRef.get();
        
        if (streamDoc.exists()) {
          const streamData = streamDoc.data()!;
          const updatedParticipants = streamData.participants.map((p: any) =>
            p.id === action.targetUserId ? { ...p, isMuted: false, isTimedOut: false } : p
          );

          batch.update(streamRef, {
            participants: updatedParticipants,
            lastActivity: admin.firestore.FieldValue.serverTimestamp()
          });

          // Update moderation status
          const statusRef = db.doc(`streams/${action.streamId}/moderationStatus/${action.targetUserId}`);
          batch.update(statusRef, {
            isMuted: false,
            isTimedOut: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Mark timeout as processed
          batch.update(doc.ref, { isProcessed: true });

          processedCount++;
        }
      }

      if (processedCount > 0) {
        await batch.commit();
        console.log(`Processed ${processedCount} expired timeouts`);
      }

      return { processedTimeouts: processedCount };

    } catch (error) {
      console.error('Error processing expired timeouts:', error);
      throw error;
    }
  });

/**
 * Clean up old moderation data
 */
export const cleanupModerationData = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      );

      // Clean up old moderation actions
      const oldActionsQuery = await db.collection('streamModerationActions')
        .where('timestamp', '<', thirtyDaysAgo)
        .limit(500)
        .get();

      const batch = db.batch();
      oldActionsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Clean up old message analysis
      const oldAnalysisQuery = await db.collection('messageAnalysis')
        .where('timestamp', '<', thirtyDaysAgo)
        .limit(500)
        .get();

      oldAnalysisQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`Cleaned up ${oldActionsQuery.size + oldAnalysisQuery.size} old moderation records`);

      return {
        deletedActions: oldActionsQuery.size,
        deletedAnalysis: oldAnalysisQuery.size
      };

    } catch (error) {
      console.error('Error cleaning up moderation data:', error);
      throw error;
    }
  });

/**
 * Generate moderation report for stream
 */
export const generateModerationReport = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { streamId, startDate, endDate } = data;

    if (!streamId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'streamId is required'
      );
    }

    // Verify user has permissions for this stream
    const streamDoc = await db.doc(`streams/${streamId}`).get();
    if (!streamDoc.exists()) {
      throw new functions.https.HttpsError(
        'not-found',
        'Stream not found'
      );
    }

    const streamData = streamDoc.data()!;
    if (streamData.hostId !== context.auth.uid && 
        !streamData.moderatorIds?.includes(context.auth.uid)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Insufficient permissions'
      );
    }

    // Generate report
    const report = await generateReport(streamId, startDate, endDate);

    return report;

  } catch (error) {
    console.error('Error generating moderation report:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate moderation report'
    );
  }
});

/**
 * Analyze message content for violations
 */
async function analyzeMessageContent(
  message: string,
  userId: string,
  streamId: string
): Promise<any> {
  try {
    const violations: string[] = [];
    let severity = 0;
    let suggestedAction = 'none';

    // Get user's moderation history
    const userStatusDoc = await db.doc(`streams/${streamId}/moderationStatus/${userId}`).get();
    const userStatus = userStatusDoc.exists() ? userStatusDoc.data() : null;

    // Check for banned words
    const bannedWords = [
      'spam', 'scam', 'fake', 'bot', 'hack', 'cheat', 'free money',
      'click here', 'subscribe', 'follow me', 'check out', 'promotion'
    ];

    const lowerMessage = message.toLowerCase();
    for (const word of bannedWords) {
      if (lowerMessage.includes(word)) {
        violations.push(`Contains banned word: ${word}`);
        severity += 0.3;
      }
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{4,}/g, // Repeated characters
      /[A-Z]{10,}/g, // Excessive caps
      /(https?:\/\/[^\s]+)/g, // URLs
      /(\b\w+\b)(\s+\1){3,}/g, // Repeated words
      /[!@#$%^&*()]{5,}/g // Excessive special characters
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(message)) {
        violations.push(`Matches spam pattern: ${pattern.source}`);
        severity += 0.2;
      }
    }

    // Check message length
    if (message.length > 500) {
      violations.push('Message too long');
      severity += 0.1;
    }

    // Check for excessive caps
    const capsCount = (message.match(/[A-Z]/g) || []).length;
    const totalLetters = (message.match(/[A-Za-z]/g) || []).length;
    if (totalLetters > 10 && capsCount / totalLetters > 0.7) {
      violations.push('Excessive capital letters');
      severity += 0.2;
    }

    // Factor in user history
    if (userStatus?.warningCount > 2) {
      violations.push('User has multiple previous warnings');
      severity += 0.3;
    }

    // Determine suggested action
    if (severity >= 0.8) {
      suggestedAction = 'ban';
    } else if (severity >= 0.6) {
      suggestedAction = 'timeout';
    } else if (severity >= 0.4) {
      suggestedAction = 'mute';
    } else if (severity >= 0.2) {
      suggestedAction = 'warn';
    }

    return {
      isViolation: severity >= 0.4,
      severity,
      violations,
      suggestedAction,
      confidence: Math.min(severity, 1)
    };

  } catch (error) {
    console.error('Error analyzing message content:', error);
    return {
      isViolation: false,
      severity: 0,
      violations: [],
      suggestedAction: 'none',
      confidence: 0
    };
  }
}

/**
 * Handle moderation violation
 */
async function handleModerationViolation(
  streamId: string,
  messageId: string,
  userId: string,
  analysisResult: any
): Promise<void> {
  try {
    const { suggestedAction, violations, severity } = analysisResult;

    // Create moderation action
    const actionData = {
      streamId,
      moderatorId: 'system',
      moderatorName: 'Auto-Moderator',
      targetUserId: userId,
      targetUserName: 'User', // Would get from user data
      action: suggestedAction,
      reason: `Automated action: ${violations.join(', ')}`,
      messageId,
      isAutomated: true,
      severity,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add duration for timeouts
    if (suggestedAction === 'timeout') {
      actionData.duration = severity >= 0.7 ? 30 : 10; // 30 or 10 minutes
      actionData.expiresAt = admin.firestore.Timestamp.fromMillis(
        Date.now() + actionData.duration * 60 * 1000
      );
    }

    await db.collection('streamModerationActions').add(actionData);

    // Apply the action
    await applyAutomatedAction(streamId, userId, suggestedAction, actionData.duration);

    // Delete the message if severe violation
    if (severity >= 0.6) {
      await db.doc(`streams/${streamId}/chat/${messageId}`).update({
        isDeleted: true,
        deletedBy: 'system',
        deleteReason: 'Automated moderation',
        editedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log(`Applied automated moderation action: ${suggestedAction} for user ${userId}`);

  } catch (error) {
    console.error('Error handling moderation violation:', error);
  }
}

/**
 * Apply automated moderation action
 */
async function applyAutomatedAction(
  streamId: string,
  userId: string,
  action: string,
  duration?: number
): Promise<void> {
  try {
    const streamRef = db.doc(`streams/${streamId}`);
    const streamDoc = await streamRef.get();

    if (!streamDoc.exists()) {
      return;
    }

    const streamData = streamDoc.data()!;
    let updatedParticipants = [...streamData.participants];
    let updatedBannedUsers = [...(streamData.bannedUserIds || [])];

    switch (action) {
      case 'mute':
        updatedParticipants = updatedParticipants.map(p =>
          p.id === userId ? { ...p, isMuted: true } : p
        );
        break;

      case 'timeout':
        updatedParticipants = updatedParticipants.map(p =>
          p.id === userId ? { 
            ...p, 
            isMuted: true,
            isTimedOut: true,
            timeoutExpiresAt: duration ? 
              admin.firestore.Timestamp.fromMillis(Date.now() + duration * 60 * 1000) : 
              undefined
          } : p
        );
        break;

      case 'ban':
        updatedParticipants = updatedParticipants.filter(p => p.id !== userId);
        if (!updatedBannedUsers.includes(userId)) {
          updatedBannedUsers.push(userId);
        }
        break;
    }

    // Update stream
    await streamRef.update({
      participants: updatedParticipants,
      bannedUserIds: updatedBannedUsers,
      lastActivity: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user moderation status
    const statusRef = db.doc(`streams/${streamId}/moderationStatus/${userId}`);
    const statusUpdate: any = {
      userId,
      streamId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      totalViolations: admin.firestore.FieldValue.increment(1)
    };

    switch (action) {
      case 'warn':
        statusUpdate.warningCount = admin.firestore.FieldValue.increment(1);
        statusUpdate.lastWarningAt = admin.firestore.FieldValue.serverTimestamp();
        break;
      case 'mute':
        statusUpdate.isMuted = true;
        break;
      case 'timeout':
        statusUpdate.isMuted = true;
        statusUpdate.isTimedOut = true;
        statusUpdate.timeoutExpiresAt = duration ? 
          admin.firestore.Timestamp.fromMillis(Date.now() + duration * 60 * 1000) : 
          undefined;
        break;
      case 'ban':
        statusUpdate.isBanned = true;
        break;
    }

    await statusRef.set(statusUpdate, { merge: true });

  } catch (error) {
    console.error('Error applying automated action:', error);
  }
}

/**
 * Generate moderation report
 */
async function generateReport(
  streamId: string,
  startDate?: string,
  endDate?: string
): Promise<any> {
  try {
    const start = startDate ? 
      admin.firestore.Timestamp.fromDate(new Date(startDate)) : 
      admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const end = endDate ? 
      admin.firestore.Timestamp.fromDate(new Date(endDate)) : 
      admin.firestore.Timestamp.now();

    // Get moderation actions in date range
    const actionsQuery = await db.collection('streamModerationActions')
      .where('streamId', '==', streamId)
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .get();

    const actions = actionsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Generate statistics
    const stats = {
      totalActions: actions.length,
      warnings: actions.filter(a => a.action === 'warn').length,
      mutes: actions.filter(a => a.action === 'mute').length,
      timeouts: actions.filter(a => a.action === 'timeout').length,
      bans: actions.filter(a => a.action === 'ban').length,
      deletedMessages: actions.filter(a => a.action === 'delete_message').length,
      automatedActions: actions.filter(a => a.isAutomated).length,
      manualActions: actions.filter(a => !a.isAutomated).length,
      uniqueUsers: new Set(actions.map(a => a.targetUserId)).size,
      topModerators: getTopModerators(actions),
      violationTrends: getViolationTrends(actions),
      dateRange: { start: start.toDate(), end: end.toDate() }
    };

    return {
      streamId,
      stats,
      actions: actions.slice(0, 100), // Limit to 100 most recent
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

/**
 * Get top moderators by action count
 */
function getTopModerators(actions: any[]): any[] {
  const moderatorCounts = new Map();
  
  actions.forEach(action => {
    if (!action.isAutomated) {
      const count = moderatorCounts.get(action.moderatorId) || 0;
      moderatorCounts.set(action.moderatorId, count + 1);
    }
  });

  return Array.from(moderatorCounts.entries())
    .map(([id, count]) => ({ moderatorId: id, actionCount: count }))
    .sort((a, b) => b.actionCount - a.actionCount)
    .slice(0, 5);
}

/**
 * Get violation trends over time
 */
function getViolationTrends(actions: any[]): any[] {
  const dailyCounts = new Map();
  
  actions.forEach(action => {
    const date = action.timestamp.toDate().toDateString();
    const count = dailyCounts.get(date) || 0;
    dailyCounts.set(date, count + 1);
  });

  return Array.from(dailyCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
