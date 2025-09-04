/**
 * Firebase Functions for Participant Management
 * Server-side participant tracking, cleanup, and stream management
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Scheduled function to clean up stale participants
 * Runs every 2 minutes to remove inactive participants
 */
export const cleanupStaleParticipants = functions.pubsub
  .schedule('every 2 minutes')
  .onRun(async (context) => {
    console.log('🧹 Starting stale participant cleanup...');
    
    try {
      const now = admin.firestore.Timestamp.now();
      const staleThreshold = new admin.firestore.Timestamp(
        now.seconds - 120, // 2 minutes ago
        now.nanoseconds
      );

      // Get all active streams
      const activeStreamsSnapshot = await db
        .collection('streams')
        .where('isActive', '==', true)
        .get();

      let totalCleaned = 0;

      for (const streamDoc of activeStreamsSnapshot.docs) {
        const streamId = streamDoc.id;
        const streamData = streamDoc.data();
        
        // Get stale participants from detailed tracking
        const staleParticipantsSnapshot = await db
          .collection(`streams/${streamId}/participants`)
          .where('isActive', '==', true)
          .where('lastSeen', '<', staleThreshold)
          .get();

        if (staleParticipantsSnapshot.empty) {
          continue;
        }

        console.log(`🧹 Found ${staleParticipantsSnapshot.size} stale participants in stream ${streamId}`);

        // Use transaction to update stream and participant data
        await db.runTransaction(async (transaction) => {
          const streamRef = db.collection('streams').doc(streamId);
          const streamSnapshot = await transaction.get(streamRef);
          
          if (!streamSnapshot.exists) {
            return;
          }

          const currentStreamData = streamSnapshot.data()!;
          const staleUserIds = staleParticipantsSnapshot.docs.map(doc => doc.id);
          
          // Remove stale participants from main stream document
          const updatedParticipants = currentStreamData.participants.filter(
            (p: any) => !staleUserIds.includes(p.id) || p.role === 'host'
          );
          
          const newViewerCount = updatedParticipants.filter((p: any) => p.isActive).length;
          
          // Update stream document
          transaction.update(streamRef, {
            participants: updatedParticipants,
            viewerCount: newViewerCount,
            lastActivity: admin.firestore.FieldValue.serverTimestamp()
          });

          // Mark participants as inactive in detailed tracking
          staleParticipantsSnapshot.docs.forEach(participantDoc => {
            const participantRef = db
              .collection(`streams/${streamId}/participants`)
              .doc(participantDoc.id);
            
            transaction.update(participantRef, {
              isActive: false,
              leftAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          });

          totalCleaned += staleParticipantsSnapshot.size;
        });

        // Check if stream should be ended (no active participants except host)
        const remainingParticipants = streamData.participants.filter(
          (p: any) => p.isActive && !staleParticipantsSnapshot.docs.some(doc => doc.id === p.id)
        );

        if (remainingParticipants.length === 0 || 
            (remainingParticipants.length === 1 && remainingParticipants[0].role === 'host')) {
          console.log(`🔚 Stream ${streamId} has no active viewers, scheduling for auto-end`);
          
          // Schedule stream to end in 5 minutes if still no viewers
          await scheduleStreamAutoEnd(streamId);
        }
      }

      console.log(`✅ Cleanup completed. Removed ${totalCleaned} stale participants`);
      return { cleanedParticipants: totalCleaned };
      
    } catch (error) {
      console.error('❌ Error during participant cleanup:', error);
      throw error;
    }
  });

/**
 * Schedule a stream to auto-end if no viewers join within 5 minutes
 */
async function scheduleStreamAutoEnd(streamId: string): Promise<void> {
  try {
    // Create a scheduled task to check and potentially end the stream
    const scheduledTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    await db.collection('scheduledTasks').add({
      type: 'auto_end_stream',
      streamId: streamId,
      scheduledFor: admin.firestore.Timestamp.fromDate(scheduledTime),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`⏰ Scheduled auto-end check for stream ${streamId} at ${scheduledTime}`);
  } catch (error) {
    console.error('Failed to schedule stream auto-end:', error);
  }
}

/**
 * Process scheduled tasks (like auto-ending streams)
 */
export const processScheduledTasks = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Get tasks that are due
      const dueTasks = await db
        .collection('scheduledTasks')
        .where('scheduledFor', '<=', now)
        .get();

      if (dueTasks.empty) {
        return { processedTasks: 0 };
      }

      console.log(`⏰ Processing ${dueTasks.size} scheduled tasks`);

      for (const taskDoc of dueTasks.docs) {
        const task = taskDoc.data();
        
        if (task.type === 'auto_end_stream') {
          await processAutoEndStream(task.streamId);
        }
        
        // Delete processed task
        await taskDoc.ref.delete();
      }

      return { processedTasks: dueTasks.size };
    } catch (error) {
      console.error('Error processing scheduled tasks:', error);
      throw error;
    }
  });

/**
 * Process auto-end stream task
 */
async function processAutoEndStream(streamId: string): Promise<void> {
  try {
    const streamRef = db.collection('streams').doc(streamId);
    const streamDoc = await streamRef.get();
    
    if (!streamDoc.exists) {
      console.log(`Stream ${streamId} no longer exists`);
      return;
    }

    const streamData = streamDoc.data()!;
    
    if (!streamData.isActive) {
      console.log(`Stream ${streamId} is already inactive`);
      return;
    }

    // Check if stream still has no viewers (only host)
    const activeViewers = streamData.participants.filter(
      (p: any) => p.isActive && p.role !== 'host'
    );

    if (activeViewers.length === 0) {
      console.log(`🔚 Auto-ending stream ${streamId} due to no viewers`);
      
      await streamRef.update({
        isActive: false,
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Notify host about auto-end (could send push notification here)
      console.log(`✅ Stream ${streamId} auto-ended successfully`);
    } else {
      console.log(`Stream ${streamId} now has ${activeViewers.length} viewers, keeping active`);
    }
  } catch (error) {
    console.error(`Error auto-ending stream ${streamId}:`, error);
  }
}

/**
 * Firestore trigger when a participant joins a stream
 */
export const onParticipantJoin = functions.firestore
  .document('streams/{streamId}/participants/{userId}')
  .onCreate(async (snap, context) => {
    const { streamId, userId } = context.params;
    const participantData = snap.data();
    
    console.log(`👋 Participant ${userId} joined stream ${streamId}`);
    
    try {
      // Update stream analytics
      await db.collection('streamAnalytics').doc(streamId).set({
        totalUniqueViewers: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      // Could trigger notifications to followers here
      console.log(`✅ Analytics updated for participant join in stream ${streamId}`);
      
    } catch (error) {
      console.error('Error processing participant join:', error);
    }
  });

/**
 * Firestore trigger when a participant leaves a stream
 */
export const onParticipantLeave = functions.firestore
  .document('streams/{streamId}/participants/{userId}')
  .onUpdate(async (change, context) => {
    const { streamId, userId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Check if participant became inactive
    if (beforeData.isActive && !afterData.isActive) {
      console.log(`👋 Participant ${userId} left stream ${streamId}`);
      
      try {
        // Calculate watch duration
        const joinTime = beforeData.joinedAt.toDate();
        const leaveTime = afterData.leftAt?.toDate() || new Date();
        const duration = Math.floor((leaveTime.getTime() - joinTime.getTime()) / 1000);
        
        // Update participant record with duration
        await change.after.ref.update({
          duration: duration
        });
        
        // Update stream analytics
        await db.collection('streamAnalytics').doc(streamId).set({
          totalWatchTime: admin.firestore.FieldValue.increment(duration),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`✅ Participant ${userId} watch duration: ${duration} seconds`);
        
      } catch (error) {
        console.error('Error processing participant leave:', error);
      }
    }
  });
