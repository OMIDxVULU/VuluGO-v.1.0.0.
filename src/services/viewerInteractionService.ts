/**
 * Viewer Interaction Service
 * Handles reactions, applause, viewer engagement, and interactive elements
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import * as Haptics from 'expo-haptics';

export interface StreamReaction {
  id: string;
  streamId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  emoji: string;
  type: 'reaction' | 'applause' | 'gift';
  value?: number; // For gifts
  timestamp: Timestamp;
  position?: { x: number; y: number }; // For animation positioning
}

export interface ApplauseEvent {
  id: string;
  streamId: string;
  userId: string;
  userName: string;
  intensity: number; // 1-5 scale
  timestamp: Timestamp;
}

export interface ViewerEngagement {
  streamId: string;
  userId: string;
  totalReactions: number;
  totalApplause: number;
  totalGifts: number;
  giftValue: number;
  engagementScore: number;
  lastActivity: Timestamp;
}

export interface InteractionCallbacks {
  onReaction?: (reaction: StreamReaction) => void;
  onApplause?: (applause: ApplauseEvent) => void;
  onGift?: (gift: StreamReaction) => void;
  onEngagementUpdate?: (engagement: ViewerEngagement) => void;
}

class ViewerInteractionService {
  private static instance: ViewerInteractionService;
  private reactionListeners = new Map<string, () => void>(); // streamId -> unsubscribe
  private applauseListeners = new Map<string, () => void>(); // streamId -> unsubscribe
  private reactionQueue: StreamReaction[] = [];
  private applauseQueue: ApplauseEvent[] = [];
  private processingInterval?: NodeJS.Timeout;

  // Reaction emojis with haptic feedback types
  private reactionEmojis = {
    '❤️': { haptic: Haptics.ImpactFeedbackStyle.Light, intensity: 1 },
    '👏': { haptic: Haptics.ImpactFeedbackStyle.Medium, intensity: 2 },
    '😂': { haptic: Haptics.ImpactFeedbackStyle.Light, intensity: 1 },
    '😮': { haptic: Haptics.ImpactFeedbackStyle.Light, intensity: 1 },
    '🔥': { haptic: Haptics.ImpactFeedbackStyle.Heavy, intensity: 3 },
    '💎': { haptic: Haptics.ImpactFeedbackStyle.Heavy, intensity: 4 },
    '⭐': { haptic: Haptics.ImpactFeedbackStyle.Medium, intensity: 2 },
    '🎉': { haptic: Haptics.ImpactFeedbackStyle.Heavy, intensity: 3 }
  };

  private constructor() {
    this.startProcessingQueue();
  }

  static getInstance(): ViewerInteractionService {
    if (!ViewerInteractionService.instance) {
      ViewerInteractionService.instance = new ViewerInteractionService();
    }
    return ViewerInteractionService.instance;
  }

  /**
   * Send a reaction to a stream
   */
  async sendReaction(
    streamId: string,
    emoji: string,
    position?: { x: number; y: number }
  ): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;

      // Trigger haptic feedback
      await this.triggerHapticFeedback(emoji);

      // Create reaction object
      const reaction: Omit<StreamReaction, 'id'> = {
        streamId,
        userId: user.uid,
        userName: user.displayName || 'User',
        userAvatar: user.photoURL || undefined,
        emoji,
        type: 'reaction',
        timestamp: serverTimestamp() as Timestamp,
        position
      };

      // Add to Firestore
      const reactionRef = await addDoc(
        collection(db, `streams/${streamId}/reactions`),
        reaction
      );

      // Update stream reaction count
      await updateDoc(doc(db, 'streams', streamId), {
        totalReactions: increment(1),
        lastActivity: serverTimestamp()
      });

      // Update user engagement
      await this.updateUserEngagement(streamId, user.uid, 'reaction');

      console.log(`✨ Reaction sent: ${emoji} to stream ${streamId}`);
      return reactionRef.id;

    } catch (error: any) {
      console.error('Failed to send reaction:', error);
      throw new Error(`Failed to send reaction: ${error.message}`);
    }
  }

  /**
   * Send applause to a stream
   */
  async sendApplause(streamId: string, intensity: number = 3): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;

      // Trigger haptic feedback based on intensity
      await this.triggerApplauseHaptic(intensity);

      // Create applause event
      const applause: Omit<ApplauseEvent, 'id'> = {
        streamId,
        userId: user.uid,
        userName: user.displayName || 'User',
        intensity: Math.max(1, Math.min(5, intensity)), // Clamp between 1-5
        timestamp: serverTimestamp() as Timestamp
      };

      // Add to Firestore
      const applauseRef = await addDoc(
        collection(db, `streams/${streamId}/applause`),
        applause
      );

      // Update stream applause count
      await updateDoc(doc(db, 'streams', streamId), {
        totalReactions: increment(intensity),
        lastActivity: serverTimestamp()
      });

      // Update user engagement
      await this.updateUserEngagement(streamId, user.uid, 'applause', intensity);

      console.log(`👏 Applause sent: intensity ${intensity} to stream ${streamId}`);
      return applauseRef.id;

    } catch (error: any) {
      console.error('Failed to send applause:', error);
      throw new Error(`Failed to send applause: ${error.message}`);
    }
  }

  /**
   * Send a virtual gift
   */
  async sendGift(
    streamId: string,
    giftType: string,
    value: number,
    position?: { x: number; y: number }
  ): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;

      // Trigger special haptic for gifts
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Create gift reaction
      const gift: Omit<StreamReaction, 'id'> = {
        streamId,
        userId: user.uid,
        userName: user.displayName || 'User',
        userAvatar: user.photoURL || undefined,
        emoji: this.getGiftEmoji(giftType),
        type: 'gift',
        value,
        timestamp: serverTimestamp() as Timestamp,
        position
      };

      // Add to Firestore
      const giftRef = await addDoc(
        collection(db, `streams/${streamId}/reactions`),
        gift
      );

      // Update stream gift stats
      await updateDoc(doc(db, 'streams', streamId), {
        totalGifts: increment(1),
        revenue: increment(value),
        lastActivity: serverTimestamp()
      });

      // Update user engagement
      await this.updateUserEngagement(streamId, user.uid, 'gift', value);

      console.log(`🎁 Gift sent: ${giftType} (${value}) to stream ${streamId}`);
      return giftRef.id;

    } catch (error: any) {
      console.error('Failed to send gift:', error);
      throw new Error(`Failed to send gift: ${error.message}`);
    }
  }

  /**
   * Start listening to reactions for a stream
   */
  startReactionListener(
    streamId: string,
    callbacks: InteractionCallbacks
  ): () => void {
    console.log(`✨ Starting reaction listener for stream: ${streamId}`);

    // Stop existing listener
    this.stopReactionListener(streamId);

    const reactionsRef = collection(db, `streams/${streamId}/reactions`);
    const q = query(
      reactionsRef,
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const reaction = {
              id: change.doc.id,
              ...change.doc.data()
            } as StreamReaction;

            // Add to processing queue for animations
            this.reactionQueue.push(reaction);

            // Trigger appropriate callback
            if (reaction.type === 'gift') {
              callbacks.onGift?.(reaction);
            } else {
              callbacks.onReaction?.(reaction);
            }
          }
        });
      },
      (error) => {
        console.error(`Error in reaction listener for ${streamId}:`, error);
      }
    );

    this.reactionListeners.set(streamId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Start listening to applause for a stream
   */
  startApplauseListener(
    streamId: string,
    callbacks: InteractionCallbacks
  ): () => void {
    console.log(`👏 Starting applause listener for stream: ${streamId}`);

    // Stop existing listener
    this.stopApplauseListener(streamId);

    const applauseRef = collection(db, `streams/${streamId}/applause`);
    const q = query(
      applauseRef,
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const applause = {
              id: change.doc.id,
              ...change.doc.data()
            } as ApplauseEvent;

            // Add to processing queue
            this.applauseQueue.push(applause);

            // Trigger callback
            callbacks.onApplause?.(applause);
          }
        });
      },
      (error) => {
        console.error(`Error in applause listener for ${streamId}:`, error);
      }
    );

    this.applauseListeners.set(streamId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Stop reaction listener for a stream
   */
  stopReactionListener(streamId: string): void {
    const unsubscribe = this.reactionListeners.get(streamId);
    if (unsubscribe) {
      unsubscribe();
      this.reactionListeners.delete(streamId);
      console.log(`✨ Stopped reaction listener for stream: ${streamId}`);
    }
  }

  /**
   * Stop applause listener for a stream
   */
  stopApplauseListener(streamId: string): void {
    const unsubscribe = this.applauseListeners.get(streamId);
    if (unsubscribe) {
      unsubscribe();
      this.applauseListeners.delete(streamId);
      console.log(`👏 Stopped applause listener for stream: ${streamId}`);
    }
  }

  /**
   * Get available reaction emojis
   */
  getAvailableReactions(): string[] {
    return Object.keys(this.reactionEmojis);
  }

  /**
   * Get reaction queue for animations
   */
  getReactionQueue(): StreamReaction[] {
    const queue = [...this.reactionQueue];
    this.reactionQueue = [];
    return queue;
  }

  /**
   * Get applause queue for animations
   */
  getApplauseQueue(): ApplauseEvent[] {
    const queue = [...this.applauseQueue];
    this.applauseQueue = [];
    return queue;
  }

  /**
   * Trigger haptic feedback for reaction
   */
  private async triggerHapticFeedback(emoji: string): Promise<void> {
    try {
      const reactionData = this.reactionEmojis[emoji as keyof typeof this.reactionEmojis];
      if (reactionData) {
        await Haptics.impactAsync(reactionData.haptic);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  /**
   * Trigger haptic feedback for applause
   */
  private async triggerApplauseHaptic(intensity: number): Promise<void> {
    try {
      const hapticIntensity = intensity <= 2 
        ? Haptics.ImpactFeedbackStyle.Light
        : intensity <= 4 
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Heavy;

      await Haptics.impactAsync(hapticIntensity);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  /**
   * Get emoji for gift type
   */
  private getGiftEmoji(giftType: string): string {
    const giftEmojis: { [key: string]: string } = {
      'heart': '💖',
      'star': '⭐',
      'diamond': '💎',
      'crown': '👑',
      'rocket': '🚀',
      'fire': '🔥'
    };

    return giftEmojis[giftType] || '🎁';
  }

  /**
   * Update user engagement metrics
   */
  private async updateUserEngagement(
    streamId: string,
    userId: string,
    type: 'reaction' | 'applause' | 'gift',
    value: number = 1
  ): Promise<void> {
    try {
      const engagementRef = doc(db, `streams/${streamId}/engagement`, userId);
      
      const updateData: any = {
        lastActivity: serverTimestamp()
      };

      switch (type) {
        case 'reaction':
          updateData.totalReactions = increment(1);
          updateData.engagementScore = increment(1);
          break;
        case 'applause':
          updateData.totalApplause = increment(1);
          updateData.engagementScore = increment(value);
          break;
        case 'gift':
          updateData.totalGifts = increment(1);
          updateData.giftValue = increment(value);
          updateData.engagementScore = increment(value * 2);
          break;
      }

      await updateDoc(engagementRef, updateData);

    } catch (error) {
      console.warn('Failed to update user engagement:', error);
    }
  }

  /**
   * Start processing animation queues
   */
  private startProcessingQueue(): void {
    this.processingInterval = setInterval(() => {
      // Process reaction queue for animations
      if (this.reactionQueue.length > 0) {
        console.log(`Processing ${this.reactionQueue.length} reactions for animation`);
      }

      // Process applause queue for animations
      if (this.applauseQueue.length > 0) {
        console.log(`Processing ${this.applauseQueue.length} applause events for animation`);
      }
    }, 100); // Process every 100ms for smooth animations
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    // Stop all listeners
    this.reactionListeners.forEach((unsubscribe) => {
      unsubscribe();
    });

    this.applauseListeners.forEach((unsubscribe) => {
      unsubscribe();
    });

    // Clear processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Clear queues and maps
    this.reactionListeners.clear();
    this.applauseListeners.clear();
    this.reactionQueue = [];
    this.applauseQueue = [];

    console.log('✨ Viewer Interaction Service destroyed');
  }
}

export default ViewerInteractionService.getInstance();

// Export service instance for direct access
export const viewerInteractionService = ViewerInteractionService.getInstance();
