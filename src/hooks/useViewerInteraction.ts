/**
 * React Hook for Viewer Interactions
 * Provides easy integration with viewer interaction service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import viewerInteractionService, {
  StreamReaction,
  ApplauseEvent,
  ViewerEngagement,
  InteractionCallbacks
} from '../services/viewerInteractionService';
import { useAuth } from '../contexts/AuthContext';

export interface UseViewerInteractionOptions {
  streamId: string;
  autoStart?: boolean;
  enableHaptics?: boolean;
  onReaction?: (reaction: StreamReaction) => void;
  onApplause?: (applause: ApplauseEvent) => void;
  onGift?: (gift: StreamReaction) => void;
  onEngagementUpdate?: (engagement: ViewerEngagement) => void;
}

export interface ViewerInteractionState {
  reactions: StreamReaction[];
  applauseEvents: ApplauseEvent[];
  isListening: boolean;
  availableReactions: string[];
  reactionQueue: StreamReaction[];
  applauseQueue: ApplauseEvent[];
  error: string | null;
  cooldownActive: boolean;
  lastReactionTime: number;
}

export function useViewerInteraction(options: UseViewerInteractionOptions) {
  const { streamId, autoStart = true, enableHaptics = true } = options;
  const { user } = useAuth();

  const [state, setState] = useState<ViewerInteractionState>({
    reactions: [],
    applauseEvents: [],
    isListening: false,
    availableReactions: [],
    reactionQueue: [],
    applauseQueue: [],
    error: null,
    cooldownActive: false,
    lastReactionTime: 0
  });

  const reactionUnsubscribeRef = useRef<(() => void) | null>(null);
  const applauseUnsubscribeRef = useRef<(() => void) | null>(null);
  const animationIntervalRef = useRef<NodeJS.Timeout>();
  const cooldownTimeoutRef = useRef<NodeJS.Timeout>();
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Start listening to interactions
  const startListening = useCallback(() => {
    if (!streamId) return;

    console.log(`✨ Starting interaction listeners for stream: ${streamId}`);

    const callbacks: InteractionCallbacks = {
      onReaction: (reaction) => {
        setState(prev => ({
          ...prev,
          reactions: [reaction, ...prev.reactions.slice(0, 49)] // Keep last 50
        }));
        callbacksRef.current.onReaction?.(reaction);
      },
      onApplause: (applause) => {
        setState(prev => ({
          ...prev,
          applauseEvents: [applause, ...prev.applauseEvents.slice(0, 19)] // Keep last 20
        }));
        callbacksRef.current.onApplause?.(applause);
      },
      onGift: (gift) => {
        setState(prev => ({
          ...prev,
          reactions: [gift, ...prev.reactions.slice(0, 49)]
        }));
        callbacksRef.current.onGift?.(gift);
      },
      onEngagementUpdate: (engagement) => {
        callbacksRef.current.onEngagementUpdate?.(engagement);
      }
    };

    // Start reaction listener
    const reactionUnsubscribe = viewerInteractionService.startReactionListener(
      streamId,
      callbacks
    );

    // Start applause listener
    const applauseUnsubscribe = viewerInteractionService.startApplauseListener(
      streamId,
      callbacks
    );

    reactionUnsubscribeRef.current = reactionUnsubscribe;
    applauseUnsubscribeRef.current = applauseUnsubscribe;

    setState(prev => ({
      ...prev,
      isListening: true,
      availableReactions: viewerInteractionService.getAvailableReactions()
    }));

    // Start animation queue processing
    startAnimationProcessing();

  }, [streamId]);

  // Stop listening to interactions
  const stopListening = useCallback(() => {
    if (reactionUnsubscribeRef.current) {
      reactionUnsubscribeRef.current();
      reactionUnsubscribeRef.current = null;
    }

    if (applauseUnsubscribeRef.current) {
      applauseUnsubscribeRef.current();
      applauseUnsubscribeRef.current = null;
    }

    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
    }

    setState(prev => ({
      ...prev,
      isListening: false,
      reactions: [],
      applauseEvents: [],
      reactionQueue: [],
      applauseQueue: []
    }));

    console.log(`✨ Stopped interaction listeners for stream: ${streamId}`);
  }, [streamId]);

  // Send reaction
  const sendReaction = useCallback(async (
    emoji: string,
    position?: { x: number; y: number }
  ) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (state.cooldownActive) {
        throw new Error('Please wait before sending another reaction');
      }

      await viewerInteractionService.sendReaction(streamId, emoji, position);

      // Set cooldown (1 second)
      setState(prev => ({
        ...prev,
        cooldownActive: true,
        lastReactionTime: Date.now(),
        error: null
      }));

      cooldownTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, cooldownActive: false }));
      }, 1000);

      console.log(`✨ Reaction sent: ${emoji}`);

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message
      }));
      throw error;
    }
  }, [streamId, user, state.cooldownActive]);

  // Send applause
  const sendApplause = useCallback(async (intensity: number = 3) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (state.cooldownActive) {
        throw new Error('Please wait before sending applause');
      }

      await viewerInteractionService.sendApplause(streamId, intensity);

      // Set cooldown (2 seconds for applause)
      setState(prev => ({
        ...prev,
        cooldownActive: true,
        lastReactionTime: Date.now(),
        error: null
      }));

      cooldownTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, cooldownActive: false }));
      }, 2000);

      console.log(`👏 Applause sent: intensity ${intensity}`);

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message
      }));
      throw error;
    }
  }, [streamId, user, state.cooldownActive]);

  // Send gift
  const sendGift = useCallback(async (
    giftType: string,
    value: number,
    position?: { x: number; y: number }
  ) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      await viewerInteractionService.sendGift(streamId, giftType, value, position);

      setState(prev => ({
        ...prev,
        error: null
      }));

      console.log(`🎁 Gift sent: ${giftType} (${value})`);

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message
      }));
      throw error;
    }
  }, [streamId, user]);

  // Start animation processing
  const startAnimationProcessing = useCallback(() => {
    animationIntervalRef.current = setInterval(() => {
      const reactionQueue = viewerInteractionService.getReactionQueue();
      const applauseQueue = viewerInteractionService.getApplauseQueue();

      if (reactionQueue.length > 0 || applauseQueue.length > 0) {
        setState(prev => ({
          ...prev,
          reactionQueue: [...prev.reactionQueue, ...reactionQueue],
          applauseQueue: [...prev.applauseQueue, ...applauseQueue]
        }));
      }
    }, 100); // Check every 100ms
  }, []);

  // Clear animation queues
  const clearAnimationQueues = useCallback(() => {
    setState(prev => ({
      ...prev,
      reactionQueue: [],
      applauseQueue: []
    }));
  }, []);

  // Get recent reactions
  const getRecentReactions = useCallback((count: number = 10): StreamReaction[] => {
    return state.reactions.slice(0, count);
  }, [state.reactions]);

  // Get recent applause
  const getRecentApplause = useCallback((count: number = 5): ApplauseEvent[] => {
    return state.applauseEvents.slice(0, count);
  }, [state.applauseEvents]);

  // Check if user can interact
  const canInteract = useCallback((): boolean => {
    return !!user && state.isListening && !state.cooldownActive;
  }, [user, state.isListening, state.cooldownActive]);

  // Get cooldown remaining time
  const getCooldownRemaining = useCallback((): number => {
    if (!state.cooldownActive) return 0;
    const elapsed = Date.now() - state.lastReactionTime;
    return Math.max(0, 1000 - elapsed); // 1 second cooldown
  }, [state.cooldownActive, state.lastReactionTime]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-start listening
  useEffect(() => {
    if (autoStart && streamId) {
      startListening();
    }

    return () => {
      stopListening();
    };
  }, [streamId, autoStart, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
    };
  }, []);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        clearError();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [state.error, clearError]);

  return {
    // State
    reactions: state.reactions,
    applauseEvents: state.applauseEvents,
    isListening: state.isListening,
    availableReactions: state.availableReactions,
    reactionQueue: state.reactionQueue,
    applauseQueue: state.applauseQueue,
    error: state.error,
    cooldownActive: state.cooldownActive,

    // Actions
    startListening,
    stopListening,
    sendReaction,
    sendApplause,
    sendGift,
    clearAnimationQueues,
    clearError,

    // Helpers
    getRecentReactions,
    getRecentApplause,
    canInteract,
    getCooldownRemaining,

    // Computed values
    reactionCount: state.reactions.length,
    applauseCount: state.applauseEvents.length,
    hasReactions: state.reactions.length > 0,
    hasApplause: state.applauseEvents.length > 0,
    isActive: state.isListening && !state.error,
    
    // Animation data
    pendingAnimations: state.reactionQueue.length + state.applauseQueue.length,
    hasAnimations: state.reactionQueue.length > 0 || state.applauseQueue.length > 0
  };
}

export default useViewerInteraction;
