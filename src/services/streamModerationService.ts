/**
 * Stream Moderation Service
 * Comprehensive moderation system with automated detection and manual controls
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface ModerationRule {
  id: string;
  type: 'word_filter' | 'spam_detection' | 'link_filter' | 'caps_filter' | 'custom';
  name: string;
  description: string;
  isActive: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'warn' | 'mute' | 'timeout' | 'ban';
  duration?: number; // For timeouts, in minutes
  patterns: string[];
  whitelist?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ModerationAction {
  id: string;
  streamId: string;
  moderatorId: string;
  moderatorName: string;
  targetUserId: string;
  targetUserName: string;
  action: 'warn' | 'mute' | 'unmute' | 'timeout' | 'ban' | 'unban' | 'delete_message';
  reason: string;
  duration?: number;
  messageId?: string;
  ruleId?: string; // If triggered by automated rule
  isAutomated: boolean;
  timestamp: Timestamp;
  expiresAt?: Timestamp;
}

export interface UserModerationStatus {
  userId: string;
  streamId: string;
  isMuted: boolean;
  isBanned: boolean;
  isTimedOut: boolean;
  timeoutExpiresAt?: Timestamp;
  warningCount: number;
  lastWarningAt?: Timestamp;
  totalViolations: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SpamDetectionResult {
  isSpam: boolean;
  confidence: number;
  reasons: string[];
  suggestedAction: 'none' | 'warn' | 'mute' | 'timeout' | 'ban';
}

class StreamModerationService {
  private static instance: StreamModerationService;
  private moderationRules: ModerationRule[] = [];
  private spamPatterns = new Set([
    // Common spam patterns
    /(.)\1{4,}/g, // Repeated characters (5+ times)
    /[A-Z]{10,}/g, // Excessive caps
    /(https?:\/\/[^\s]+)/g, // URLs
    /(\b\w+\b)(\s+\1){3,}/g, // Repeated words
    /[!@#$%^&*()]{5,}/g, // Excessive special characters
  ]);

  private bannedWords = new Set([
    // Basic profanity and spam words - in production, use a comprehensive list
    'spam', 'scam', 'fake', 'bot', 'hack', 'cheat', 'free money', 'click here',
    'subscribe', 'follow me', 'check out', 'promotion', 'discount'
  ]);

  private constructor() {
    this.loadModerationRules();
  }

  static getInstance(): StreamModerationService {
    if (!StreamModerationService.instance) {
      StreamModerationService.instance = new StreamModerationService();
    }
    return StreamModerationService.instance;
  }

  /**
   * Analyze message for potential violations
   */
  async analyzeMessage(
    streamId: string,
    userId: string,
    message: string,
    userHistory?: any
  ): Promise<SpamDetectionResult> {
    try {
      const reasons: string[] = [];
      let confidence = 0;
      let suggestedAction: 'none' | 'warn' | 'mute' | 'timeout' | 'ban' = 'none';

      // Check against banned words
      const lowerMessage = message.toLowerCase();
      for (const word of this.bannedWords) {
        if (lowerMessage.includes(word)) {
          reasons.push(`Contains banned word: ${word}`);
          confidence += 0.3;
        }
      }

      // Check spam patterns
      for (const pattern of this.spamPatterns) {
        if (pattern.test(message)) {
          reasons.push(`Matches spam pattern: ${pattern.source}`);
          confidence += 0.2;
        }
      }

      // Check message length and repetition
      if (message.length > 500) {
        reasons.push('Message too long');
        confidence += 0.1;
      }

      // Check for excessive caps
      const capsCount = (message.match(/[A-Z]/g) || []).length;
      const totalLetters = (message.match(/[A-Za-z]/g) || []).length;
      if (totalLetters > 10 && capsCount / totalLetters > 0.7) {
        reasons.push('Excessive capital letters');
        confidence += 0.2;
      }

      // Check user history for repeat offenses
      if (userHistory?.warningCount > 2) {
        reasons.push('User has multiple previous warnings');
        confidence += 0.3;
      }

      // Determine suggested action based on confidence
      if (confidence >= 0.8) {
        suggestedAction = 'ban';
      } else if (confidence >= 0.6) {
        suggestedAction = 'timeout';
      } else if (confidence >= 0.4) {
        suggestedAction = 'mute';
      } else if (confidence >= 0.2) {
        suggestedAction = 'warn';
      }

      return {
        isSpam: confidence >= 0.4,
        confidence: Math.min(confidence, 1),
        reasons,
        suggestedAction
      };

    } catch (error: any) {
      console.error('Failed to analyze message:', error);
      return {
        isSpam: false,
        confidence: 0,
        reasons: [],
        suggestedAction: 'none'
      };
    }
  }

  /**
   * Execute moderation action
   */
  async executeModerationAction(
    streamId: string,
    targetUserId: string,
    action: ModerationAction['action'],
    reason: string,
    duration?: number,
    messageId?: string,
    ruleId?: string
  ): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const moderatorId = auth.currentUser.uid;
      const moderatorName = auth.currentUser.displayName || 'Moderator';

      // Create moderation action record
      const actionData: Omit<ModerationAction, 'id'> = {
        streamId,
        moderatorId,
        moderatorName,
        targetUserId,
        targetUserName: 'User', // Would get from user data
        action,
        reason,
        duration,
        messageId,
        ruleId,
        isAutomated: !!ruleId,
        timestamp: serverTimestamp() as Timestamp,
        expiresAt: duration ? 
          Timestamp.fromMillis(Date.now() + duration * 60 * 1000) : 
          undefined
      };

      const actionRef = await addDoc(
        collection(db, 'streamModerationActions'),
        actionData
      );

      // Apply the action
      await this.applyModerationAction(streamId, targetUserId, action, duration);

      // Update user moderation status
      await this.updateUserModerationStatus(streamId, targetUserId, action, duration);

      console.log(`✅ Moderation action ${action} applied to user ${targetUserId}`);
      return actionRef.id;

    } catch (error: any) {
      console.error('Failed to execute moderation action:', error);
      throw new Error(`Failed to execute moderation action: ${error.message}`);
    }
  }

  /**
   * Apply moderation action to stream and user
   */
  private async applyModerationAction(
    streamId: string,
    targetUserId: string,
    action: ModerationAction['action'],
    duration?: number
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const streamRef = doc(db, 'streams', streamId);
      const streamDoc = await transaction.get(streamRef);

      if (!streamDoc.exists()) {
        throw new Error('Stream not found');
      }

      const streamData = streamDoc.data();
      let updatedParticipants = [...streamData.participants];
      let updatedBannedUsers = [...(streamData.bannedUserIds || [])];

      switch (action) {
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

        case 'timeout':
          updatedParticipants = updatedParticipants.map(p =>
            p.id === targetUserId ? { 
              ...p, 
              isMuted: true,
              timeoutExpiresAt: duration ? 
                Timestamp.fromMillis(Date.now() + duration * 60 * 1000) : 
                undefined
            } : p
          );
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

        case 'delete_message':
          // Message deletion would be handled separately
          break;
      }

      transaction.update(streamRef, {
        participants: updatedParticipants,
        bannedUserIds: updatedBannedUsers,
        lastActivity: serverTimestamp()
      });
    });
  }

  /**
   * Update user moderation status
   */
  private async updateUserModerationStatus(
    streamId: string,
    userId: string,
    action: ModerationAction['action'],
    duration?: number
  ): Promise<void> {
    try {
      const statusRef = doc(db, `streams/${streamId}/moderationStatus`, userId);
      
      const updateData: any = {
        userId,
        streamId,
        updatedAt: serverTimestamp()
      };

      switch (action) {
        case 'warn':
          updateData.warningCount = 1; // Would increment existing count
          updateData.lastWarningAt = serverTimestamp();
          updateData.totalViolations = 1; // Would increment
          break;

        case 'mute':
          updateData.isMuted = true;
          updateData.totalViolations = 1; // Would increment
          break;

        case 'unmute':
          updateData.isMuted = false;
          break;

        case 'timeout':
          updateData.isMuted = true;
          updateData.isTimedOut = true;
          updateData.timeoutExpiresAt = duration ? 
            Timestamp.fromMillis(Date.now() + duration * 60 * 1000) : 
            undefined;
          updateData.totalViolations = 1; // Would increment
          break;

        case 'ban':
          updateData.isBanned = true;
          updateData.totalViolations = 1; // Would increment
          break;

        case 'unban':
          updateData.isBanned = false;
          break;
      }

      await updateDoc(statusRef, updateData);

    } catch (error) {
      console.warn('Failed to update user moderation status:', error);
    }
  }

  /**
   * Get user moderation status
   */
  async getUserModerationStatus(
    streamId: string,
    userId: string
  ): Promise<UserModerationStatus | null> {
    try {
      const statusDoc = await doc(db, `streams/${streamId}/moderationStatus`, userId).get();
      
      if (!statusDoc.exists()) {
        return null;
      }

      return {
        id: statusDoc.id,
        ...statusDoc.data()
      } as UserModerationStatus;

    } catch (error: any) {
      console.error('Failed to get user moderation status:', error);
      return null;
    }
  }

  /**
   * Get moderation actions for a stream
   */
  async getModerationActions(
    streamId: string,
    limitCount: number = 50
  ): Promise<ModerationAction[]> {
    try {
      const actionsQuery = query(
        collection(db, 'streamModerationActions'),
        where('streamId', '==', streamId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(actionsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ModerationAction[];

    } catch (error: any) {
      console.error('Failed to get moderation actions:', error);
      return [];
    }
  }

  /**
   * Create custom moderation rule
   */
  async createModerationRule(ruleData: Omit<ModerationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const rule: Omit<ModerationRule, 'id'> = {
        ...ruleData,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      const ruleRef = await addDoc(collection(db, 'moderationRules'), rule);
      
      // Reload rules
      await this.loadModerationRules();

      console.log(`✅ Moderation rule created: ${ruleRef.id}`);
      return ruleRef.id;

    } catch (error: any) {
      console.error('Failed to create moderation rule:', error);
      throw new Error(`Failed to create moderation rule: ${error.message}`);
    }
  }

  /**
   * Load moderation rules from Firestore
   */
  private async loadModerationRules(): Promise<void> {
    try {
      const rulesQuery = query(
        collection(db, 'moderationRules'),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(rulesQuery);
      this.moderationRules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ModerationRule[];

      console.log(`✅ Loaded ${this.moderationRules.length} moderation rules`);

    } catch (error) {
      console.error('Failed to load moderation rules:', error);
    }
  }

  /**
   * Check if user has moderation permissions
   */
  async hasModeratorPermissions(streamId: string, userId: string): Promise<boolean> {
    try {
      const streamDoc = await doc(db, 'streams', streamId).get();
      
      if (!streamDoc.exists()) {
        return false;
      }

      const streamData = streamDoc.data();
      
      // Check if user is host
      if (streamData.hostId === userId) {
        return true;
      }

      // Check if user is moderator
      if (streamData.moderatorIds && streamData.moderatorIds.includes(userId)) {
        return true;
      }

      return false;

    } catch (error) {
      console.error('Failed to check moderator permissions:', error);
      return false;
    }
  }

  /**
   * Process expired timeouts
   */
  async processExpiredTimeouts(): Promise<void> {
    try {
      const now = Timestamp.now();
      
      // Get all active timeouts that have expired
      const expiredQuery = query(
        collection(db, 'streamModerationActions'),
        where('action', '==', 'timeout'),
        where('expiresAt', '<=', now)
      );

      const snapshot = await getDocs(expiredQuery);
      
      for (const actionDoc of snapshot.docs) {
        const action = actionDoc.data() as ModerationAction;
        
        // Unmute the user
        await this.executeModerationAction(
          action.streamId,
          action.targetUserId,
          'unmute',
          'Timeout expired',
          undefined,
          undefined,
          'system'
        );
      }

      if (snapshot.size > 0) {
        console.log(`✅ Processed ${snapshot.size} expired timeouts`);
      }

    } catch (error) {
      console.error('Failed to process expired timeouts:', error);
    }
  }

  /**
   * Get moderation statistics for a stream
   */
  async getModerationStats(streamId: string): Promise<any> {
    try {
      const actionsQuery = query(
        collection(db, 'streamModerationActions'),
        where('streamId', '==', streamId)
      );

      const snapshot = await getDocs(actionsQuery);
      const actions = snapshot.docs.map(doc => doc.data() as ModerationAction);

      const stats = {
        totalActions: actions.length,
        warnings: actions.filter(a => a.action === 'warn').length,
        mutes: actions.filter(a => a.action === 'mute').length,
        timeouts: actions.filter(a => a.action === 'timeout').length,
        bans: actions.filter(a => a.action === 'ban').length,
        deletedMessages: actions.filter(a => a.action === 'delete_message').length,
        automatedActions: actions.filter(a => a.isAutomated).length,
        manualActions: actions.filter(a => !a.isAutomated).length
      };

      return stats;

    } catch (error: any) {
      console.error('Failed to get moderation stats:', error);
      return null;
    }
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    this.moderationRules = [];
    this.spamPatterns.clear();
    this.bannedWords.clear();
    console.log('🧹 Stream Moderation Service destroyed');
  }
}

export default StreamModerationService.getInstance();
