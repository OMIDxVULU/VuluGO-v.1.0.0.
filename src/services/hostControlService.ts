/**
 * Host Control Service
 * Handles stream settings, participant management, and moderation tools for hosts
 */

import {
  doc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Stream, StreamParticipant, ChatSettings } from './firestoreService';

export interface StreamSettings {
  title: string;
  description?: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  allowChat: boolean;
  allowReactions: boolean;
  quality: 'low' | 'medium' | 'high' | 'auto';
  maxParticipants?: number;
}

export interface ModerationAction {
  type: 'mute' | 'unmute' | 'kick' | 'ban' | 'unban' | 'promote' | 'demote';
  targetUserId: string;
  reason?: string;
  duration?: number; // For temporary actions, in minutes
}

export interface StreamAnalytics {
  viewerCount: number;
  maxViewers: number;
  totalViewers: number;
  averageViewTime: number;
  chatMessages: number;
  reactions: number;
  gifts: number;
  revenue: number;
  topViewers: { userId: string; name: string; watchTime: number }[];
  engagementRate: number;
}

class HostControlService {
  private static instance: HostControlService;

  private constructor() {}

  static getInstance(): HostControlService {
    if (!HostControlService.instance) {
      HostControlService.instance = new HostControlService();
    }
    return HostControlService.instance;
  }

  /**
   * Update stream settings
   */
  async updateStreamSettings(streamId: string, settings: Partial<StreamSettings>): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      // Verify user is the host
      await this.verifyHostPermission(streamId);

      const updateData: any = {
        ...settings,
        updatedAt: serverTimestamp()
      };

      // Handle chat settings separately if needed
      if (settings.allowChat !== undefined || settings.allowReactions !== undefined) {
        updateData.allowChat = settings.allowChat;
        updateData.allowReactions = settings.allowReactions;
      }

      await updateDoc(doc(db, 'streams', streamId), updateData);

      console.log(`✅ Stream settings updated for ${streamId}:`, settings);

    } catch (error: any) {
      console.error('Failed to update stream settings:', error);
      throw new Error(`Failed to update stream settings: ${error.message}`);
    }
  }

  /**
   * Update chat settings
   */
  async updateChatSettings(streamId: string, chatSettings: Partial<ChatSettings>): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      await this.verifyHostPermission(streamId);

      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      // Update each chat setting individually
      Object.entries(chatSettings).forEach(([key, value]) => {
        updateData[`chatSettings.${key}`] = value;
      });

      await updateDoc(doc(db, 'streams', streamId), updateData);

      console.log(`✅ Chat settings updated for ${streamId}:`, chatSettings);

    } catch (error: any) {
      console.error('Failed to update chat settings:', error);
      throw new Error(`Failed to update chat settings: ${error.message}`);
    }
  }

  /**
   * Perform moderation action on a participant
   */
  async moderateParticipant(
    streamId: string,
    action: ModerationAction
  ): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      await this.verifyHostPermission(streamId);

      const { type, targetUserId, reason, duration } = action;

      await runTransaction(db, async (transaction) => {
        const streamRef = doc(db, 'streams', streamId);
        const streamDoc = await transaction.get(streamRef);

        if (!streamDoc.exists()) {
          throw new Error('Stream not found');
        }

        const streamData = streamDoc.data() as Stream;
        let updatedParticipants = [...streamData.participants];
        let updatedBannedUsers = [...(streamData.bannedUserIds || [])];
        let updatedModerators = [...(streamData.moderatorIds || [])];

        switch (type) {
          case 'mute':
            updatedParticipants = updatedParticipants.map(p =>
              p.id === targetUserId ? { ...p, isMuted: true } : p
            );
            break;

          case 'unmute':
            updatedParticipants = updatedParticipants.map(p =>
              p.id === targetUserId ? { ...p, isMuted: false } : p
            );
            break;

          case 'kick':
            updatedParticipants = updatedParticipants.filter(p => p.id !== targetUserId);
            break;

          case 'ban':
            updatedParticipants = updatedParticipants.filter(p => p.id !== targetUserId);
            if (!updatedBannedUsers.includes(targetUserId)) {
              updatedBannedUsers.push(targetUserId);
            }
            break;

          case 'unban':
            updatedBannedUsers = updatedBannedUsers.filter(id => id !== targetUserId);
            break;

          case 'promote':
            if (!updatedModerators.includes(targetUserId)) {
              updatedModerators.push(targetUserId);
            }
            updatedParticipants = updatedParticipants.map(p =>
              p.id === targetUserId ? { ...p, role: 'moderator' } : p
            );
            break;

          case 'demote':
            updatedModerators = updatedModerators.filter(id => id !== targetUserId);
            updatedParticipants = updatedParticipants.map(p =>
              p.id === targetUserId ? { ...p, role: 'viewer' } : p
            );
            break;
        }

        // Update stream document
        transaction.update(streamRef, {
          participants: updatedParticipants,
          bannedUserIds: updatedBannedUsers,
          moderatorIds: updatedModerators,
          viewerCount: updatedParticipants.filter(p => p.isActive).length,
          lastActivity: serverTimestamp()
        });

        // Log moderation action
        const moderationLogRef = doc(collection(db, 'streamModerationLogs'));
        transaction.set(moderationLogRef, {
          streamId,
          moderatorId: auth.currentUser!.uid,
          moderatorName: auth.currentUser!.displayName || 'Host',
          action: type,
          targetUserId,
          reason: reason || `${type} action`,
          duration,
          timestamp: serverTimestamp()
        });
      });

      console.log(`✅ Moderation action ${type} performed on user ${targetUserId}`);

    } catch (error: any) {
      console.error('Failed to perform moderation action:', error);
      throw new Error(`Failed to perform moderation action: ${error.message}`);
    }
  }

  /**
   * Get stream analytics
   */
  async getStreamAnalytics(streamId: string): Promise<StreamAnalytics> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      await this.verifyHostPermission(streamId);

      // Get stream data
      const streamDoc = await doc(db, 'streams', streamId).get();
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data() as Stream;

      // Get participant analytics
      const participantsQuery = query(
        collection(db, `streams/${streamId}/participants`)
      );
      const participantsSnapshot = await getDocs(participantsQuery);

      let totalWatchTime = 0;
      const topViewers: { userId: string; name: string; watchTime: number }[] = [];

      participantsSnapshot.docs.forEach(doc => {
        const participant = doc.data();
        const watchTime = participant.duration || 0;
        totalWatchTime += watchTime;

        if (participant.role !== 'host') {
          topViewers.push({
            userId: participant.userId,
            name: participant.displayName,
            watchTime
          });
        }
      });

      // Sort top viewers by watch time
      topViewers.sort((a, b) => b.watchTime - a.watchTime);

      // Calculate metrics
      const averageViewTime = streamData.totalViewers > 0 
        ? totalWatchTime / streamData.totalViewers 
        : 0;

      const engagementRate = streamData.totalViewers > 0
        ? ((streamData.totalMessages + streamData.totalReactions) / streamData.totalViewers) * 100
        : 0;

      return {
        viewerCount: streamData.viewerCount,
        maxViewers: streamData.maxViewers,
        totalViewers: streamData.totalViewers,
        averageViewTime,
        chatMessages: streamData.totalMessages,
        reactions: streamData.totalReactions,
        gifts: streamData.totalGifts,
        revenue: streamData.revenue,
        topViewers: topViewers.slice(0, 10),
        engagementRate
      };

    } catch (error: any) {
      console.error('Failed to get stream analytics:', error);
      throw new Error(`Failed to get stream analytics: ${error.message}`);
    }
  }

  /**
   * Get participant list with details
   */
  async getParticipantList(streamId: string): Promise<StreamParticipant[]> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      await this.verifyHostPermission(streamId);

      const streamDoc = await doc(db, 'streams', streamId).get();
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data() as Stream;
      return streamData.participants || [];

    } catch (error: any) {
      console.error('Failed to get participant list:', error);
      throw new Error(`Failed to get participant list: ${error.message}`);
    }
  }

  /**
   * Clear all chat messages
   */
  async clearAllChat(streamId: string, reason: string = 'Chat cleared by host'): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      await this.verifyHostPermission(streamId);

      // Get all chat messages
      const chatQuery = query(
        collection(db, `streams/${streamId}/chat`),
        where('isDeleted', '==', false)
      );
      const chatSnapshot = await getDocs(chatQuery);

      // Batch update all messages as deleted
      const batch = db.batch();
      chatSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isDeleted: true,
          deletedBy: auth.currentUser!.uid,
          deleteReason: reason,
          editedAt: serverTimestamp()
        });
      });

      await batch.commit();

      console.log(`✅ All chat messages cleared for stream ${streamId}`);

    } catch (error: any) {
      console.error('Failed to clear chat:', error);
      throw new Error(`Failed to clear chat: ${error.message}`);
    }
  }

  /**
   * End stream
   */
  async endStream(streamId: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      await this.verifyHostPermission(streamId);

      await updateDoc(doc(db, 'streams', streamId), {
        isActive: false,
        endedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Stream ${streamId} ended by host`);

    } catch (error: any) {
      console.error('Failed to end stream:', error);
      throw new Error(`Failed to end stream: ${error.message}`);
    }
  }

  /**
   * Toggle stream privacy
   */
  async toggleStreamPrivacy(streamId: string): Promise<boolean> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      await this.verifyHostPermission(streamId);

      const streamDoc = await doc(db, 'streams', streamId).get();
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const currentPrivacy = streamDoc.data()?.isPublic || true;
      const newPrivacy = !currentPrivacy;

      await updateDoc(doc(db, 'streams', streamId), {
        isPublic: newPrivacy,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Stream privacy toggled to ${newPrivacy ? 'public' : 'private'}`);
      return newPrivacy;

    } catch (error: any) {
      console.error('Failed to toggle stream privacy:', error);
      throw new Error(`Failed to toggle stream privacy: ${error.message}`);
    }
  }

  /**
   * Update stream quality
   */
  async updateStreamQuality(
    streamId: string, 
    quality: 'low' | 'medium' | 'high' | 'auto'
  ): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      await this.verifyHostPermission(streamId);

      await updateDoc(doc(db, 'streams', streamId), {
        quality,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Stream quality updated to ${quality}`);

    } catch (error: any) {
      console.error('Failed to update stream quality:', error);
      throw new Error(`Failed to update stream quality: ${error.message}`);
    }
  }

  /**
   * Get moderation logs
   */
  async getModerationLogs(streamId: string, limit: number = 50): Promise<any[]> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      await this.verifyHostPermission(streamId);

      const logsQuery = query(
        collection(db, 'streamModerationLogs'),
        where('streamId', '==', streamId),
        // orderBy('timestamp', 'desc'),
        // limit(limit)
      );

      const logsSnapshot = await getDocs(logsQuery);
      return logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error: any) {
      console.error('Failed to get moderation logs:', error);
      throw new Error(`Failed to get moderation logs: ${error.message}`);
    }
  }

  /**
   * Verify user has host permission for stream
   */
  private async verifyHostPermission(streamId: string): Promise<void> {
    const streamDoc = await doc(db, 'streams', streamId).get();
    if (!streamDoc.exists()) {
      throw new Error('Stream not found');
    }

    const streamData = streamDoc.data() as Stream;
    if (streamData.hostId !== auth.currentUser?.uid) {
      throw new Error('Only the host can perform this action');
    }
  }
}

export default HostControlService.getInstance();
