/**
 * Host Controls Service for VuluGO
 * Handles host actions like muting, kicking, and banning participants
 */

import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { agoraService } from './agoraService';

export interface HostAction {
  type: 'mute' | 'unmute' | 'kick' | 'ban' | 'unban';
  targetUserId: string;
  targetUid: number;
  hostId: string;
  timestamp: number;
  reason?: string;
}

export interface ParticipantState {
  userId: string;
  uid: number;
  isMuted: boolean;
  isBanned: boolean;
  mutedBy?: string;
  mutedAt?: number;
  bannedBy?: string;
  bannedAt?: number;
}

class HostControlsService {
  private static instance: HostControlsService;

  private constructor() {}

  static getInstance(): HostControlsService {
    if (!HostControlsService.instance) {
      HostControlsService.instance = new HostControlsService();
    }
    return HostControlsService.instance;
  }

  /**
   * Mute a participant (host only)
   */
  async muteParticipant(
    streamId: string,
    targetUserId: string,
    targetUid: number,
    hostId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      console.log(`🔇 [HOST_CONTROLS] Muting participant ${targetUserId} in stream ${streamId}`);

      // Update Firebase stream document
      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);
      
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data();
      const participants = streamData.participants || [];
      
      // Update participant state
      const updatedParticipants = participants.map((p: any) => {
        if (p.userId === targetUserId) {
          return {
            ...p,
            isMuted: true,
            mutedBy: hostId,
            mutedAt: Date.now()
          };
        }
        return p;
      });

      // Add to host actions log
      const hostAction: HostAction = {
        type: 'mute',
        targetUserId,
        targetUid,
        hostId,
        timestamp: Date.now(),
        reason
      };

      await updateDoc(streamRef, {
        participants: updatedParticipants,
        hostActions: arrayUnion(hostAction),
        lastActivity: new Date()
      });

      // Update local Agora participant state
      agoraService.updateParticipant(targetUid, { isMuted: true });

      console.log(`✅ [HOST_CONTROLS] Successfully muted participant ${targetUserId}`);
      return true;

    } catch (error: any) {
      console.error('❌ [HOST_CONTROLS] Failed to mute participant:', error);
      return false;
    }
  }

  /**
   * Unmute a participant (host only)
   */
  async unmuteParticipant(
    streamId: string,
    targetUserId: string,
    targetUid: number,
    hostId: string
  ): Promise<boolean> {
    try {
      console.log(`🔊 [HOST_CONTROLS] Unmuting participant ${targetUserId} in stream ${streamId}`);

      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);
      
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data();
      const participants = streamData.participants || [];
      
      // Update participant state
      const updatedParticipants = participants.map((p: any) => {
        if (p.userId === targetUserId) {
          const { mutedBy, mutedAt, ...rest } = p;
          return {
            ...rest,
            isMuted: false
          };
        }
        return p;
      });

      // Add to host actions log
      const hostAction: HostAction = {
        type: 'unmute',
        targetUserId,
        targetUid,
        hostId,
        timestamp: Date.now()
      };

      await updateDoc(streamRef, {
        participants: updatedParticipants,
        hostActions: arrayUnion(hostAction),
        lastActivity: new Date()
      });

      // Update local Agora participant state
      agoraService.updateParticipant(targetUid, { isMuted: false });

      console.log(`✅ [HOST_CONTROLS] Successfully unmuted participant ${targetUserId}`);
      return true;

    } catch (error: any) {
      console.error('❌ [HOST_CONTROLS] Failed to unmute participant:', error);
      return false;
    }
  }

  /**
   * Kick a participant from the stream (host only)
   */
  async kickParticipant(
    streamId: string,
    targetUserId: string,
    targetUid: number,
    hostId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      console.log(`👢 [HOST_CONTROLS] Kicking participant ${targetUserId} from stream ${streamId}`);

      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);
      
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data();
      const participants = streamData.participants || [];
      
      // Remove participant from stream
      const updatedParticipants = participants.filter((p: any) => p.userId !== targetUserId);

      // Add to host actions log
      const hostAction: HostAction = {
        type: 'kick',
        targetUserId,
        targetUid,
        hostId,
        timestamp: Date.now(),
        reason
      };

      await updateDoc(streamRef, {
        participants: updatedParticipants,
        hostActions: arrayUnion(hostAction),
        lastActivity: new Date()
      });

      // Remove from local Agora state
      agoraService.removeParticipant(targetUid);

      console.log(`✅ [HOST_CONTROLS] Successfully kicked participant ${targetUserId}`);
      return true;

    } catch (error: any) {
      console.error('❌ [HOST_CONTROLS] Failed to kick participant:', error);
      return false;
    }
  }

  /**
   * Ban a participant from the stream (host only)
   */
  async banParticipant(
    streamId: string,
    targetUserId: string,
    targetUid: number,
    hostId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      console.log(`🚫 [HOST_CONTROLS] Banning participant ${targetUserId} from stream ${streamId}`);

      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);
      
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data();
      const participants = streamData.participants || [];
      const bannedUsers = streamData.bannedUsers || [];
      
      // Remove participant from stream and add to banned list
      const updatedParticipants = participants.filter((p: any) => p.userId !== targetUserId);

      // Add to host actions log
      const hostAction: HostAction = {
        type: 'ban',
        targetUserId,
        targetUid,
        hostId,
        timestamp: Date.now(),
        reason
      };

      await updateDoc(streamRef, {
        participants: updatedParticipants,
        bannedUsers: arrayUnion({
          userId: targetUserId,
          bannedBy: hostId,
          bannedAt: Date.now(),
          reason
        }),
        hostActions: arrayUnion(hostAction),
        lastActivity: new Date()
      });

      // Remove from local Agora state
      agoraService.removeParticipant(targetUid);

      console.log(`✅ [HOST_CONTROLS] Successfully banned participant ${targetUserId}`);
      return true;

    } catch (error: any) {
      console.error('❌ [HOST_CONTROLS] Failed to ban participant:', error);
      return false;
    }
  }

  /**
   * Unban a participant (host only)
   */
  async unbanParticipant(
    streamId: string,
    targetUserId: string,
    hostId: string
  ): Promise<boolean> {
    try {
      console.log(`✅ [HOST_CONTROLS] Unbanning participant ${targetUserId} from stream ${streamId}`);

      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);
      
      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data();
      const bannedUsers = streamData.bannedUsers || [];
      
      // Find and remove the banned user
      const userToUnban = bannedUsers.find((u: any) => u.userId === targetUserId);
      if (!userToUnban) {
        throw new Error('User not found in banned list');
      }

      // Add to host actions log
      const hostAction: HostAction = {
        type: 'unban',
        targetUserId,
        targetUid: 0, // UID not available for banned users
        hostId,
        timestamp: Date.now()
      };

      await updateDoc(streamRef, {
        bannedUsers: arrayRemove(userToUnban),
        hostActions: arrayUnion(hostAction),
        lastActivity: new Date()
      });

      console.log(`✅ [HOST_CONTROLS] Successfully unbanned participant ${targetUserId}`);
      return true;

    } catch (error: any) {
      console.error('❌ [HOST_CONTROLS] Failed to unban participant:', error);
      return false;
    }
  }

  /**
   * Check if user has host permissions for a stream
   */
  async isUserHost(streamId: string, userId: string): Promise<boolean> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);
      
      if (!streamDoc.exists()) {
        return false;
      }

      const streamData = streamDoc.data();
      return streamData.hostId === userId || 
             (streamData.hosts && streamData.hosts.some((h: any) => h.id === userId));

    } catch (error: any) {
      console.error('❌ [HOST_CONTROLS] Failed to check host permissions:', error);
      return false;
    }
  }

  /**
   * Get host actions history for a stream
   */
  async getHostActions(streamId: string): Promise<HostAction[]> {
    try {
      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await getDoc(streamRef);
      
      if (!streamDoc.exists()) {
        return [];
      }

      const streamData = streamDoc.data();
      return streamData.hostActions || [];

    } catch (error: any) {
      console.error('❌ [HOST_CONTROLS] Failed to get host actions:', error);
      return [];
    }
  }
}

export const hostControlsService = HostControlsService.getInstance();
