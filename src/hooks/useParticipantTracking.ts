/**
 * React Hook for Participant Tracking
 * Provides easy integration with participant tracking service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import participantTrackingService from '../services/participantTrackingService';
import { StreamParticipant } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

export interface UseParticipantTrackingOptions {
  streamId: string;
  autoStart?: boolean;
  onParticipantJoined?: (participant: StreamParticipant) => void;
  onParticipantLeft?: (participantId: string) => void;
  onViewerCountChanged?: (count: number) => void;
  onConnectionQualityChanged?: (userId: string, quality: string) => void;
}

export interface ParticipantTrackingState {
  participants: StreamParticipant[];
  viewerCount: number;
  isTracking: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  error: string | null;
}

export function useParticipantTracking(options: UseParticipantTrackingOptions) {
  const { streamId, autoStart = true } = options;
  const { user } = useAuth();
  
  const [state, setState] = useState<ParticipantTrackingState>({
    participants: [],
    viewerCount: 0,
    isTracking: false,
    connectionQuality: 'good',
    error: null
  });

  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Start tracking
  const startTracking = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isTracking: true, error: null }));
      
      await participantTrackingService.startTracking(streamId, {
        onParticipantJoined: (participant) => {
          setState(prev => ({
            ...prev,
            participants: [...prev.participants.filter(p => p.id !== participant.id), participant]
          }));
          callbacksRef.current.onParticipantJoined?.(participant);
        },
        
        onParticipantLeft: (participantId) => {
          setState(prev => ({
            ...prev,
            participants: prev.participants.filter(p => p.id !== participantId)
          }));
          callbacksRef.current.onParticipantLeft?.(participantId);
        },
        
        onViewerCountChanged: (count) => {
          setState(prev => ({ ...prev, viewerCount: count }));
          callbacksRef.current.onViewerCountChanged?.(count);
        },
        
        onConnectionQualityChanged: (userId, quality) => {
          if (userId === user?.uid) {
            setState(prev => ({ 
              ...prev, 
              connectionQuality: quality as any 
            }));
          }
          callbacksRef.current.onConnectionQualityChanged?.(userId, quality);
        }
      });
      
      console.log(`✅ Started participant tracking for stream: ${streamId}`);
    } catch (error: any) {
      console.error('Failed to start participant tracking:', error);
      setState(prev => ({ 
        ...prev, 
        isTracking: false, 
        error: error.message 
      }));
    }
  }, [streamId, user?.uid]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    participantTrackingService.stopTracking(streamId);
    setState(prev => ({ 
      ...prev, 
      isTracking: false, 
      participants: [],
      viewerCount: 0 
    }));
    console.log(`🛑 Stopped participant tracking for stream: ${streamId}`);
  }, [streamId]);

  // Update connection quality
  const updateConnectionQuality = useCallback(async (
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected'
  ) => {
    if (!user?.uid) return;
    
    try {
      await participantTrackingService.updateConnectionQuality(streamId, user.uid, quality);
      setState(prev => ({ ...prev, connectionQuality: quality }));
    } catch (error: any) {
      console.error('Failed to update connection quality:', error);
    }
  }, [streamId, user?.uid]);

  // Get participant by ID
  const getParticipant = useCallback((participantId: string): StreamParticipant | undefined => {
    return state.participants.find(p => p.id === participantId);
  }, [state.participants]);

  // Check if user is host
  const isHost = useCallback((userId?: string): boolean => {
    const targetUserId = userId || user?.uid;
    if (!targetUserId) return false;
    
    const participant = state.participants.find(p => p.id === targetUserId);
    return participant?.role === 'host';
  }, [state.participants, user?.uid]);

  // Check if user is moderator
  const isModerator = useCallback((userId?: string): boolean => {
    const targetUserId = userId || user?.uid;
    if (!targetUserId) return false;
    
    const participant = state.participants.find(p => p.id === targetUserId);
    return participant?.role === 'moderator' || participant?.role === 'host';
  }, [state.participants, user?.uid]);

  // Get active participants only
  const activeParticipants = useCallback((): StreamParticipant[] => {
    return state.participants.filter(p => p.isActive);
  }, [state.participants]);

  // Get participants by role
  const getParticipantsByRole = useCallback((role: 'host' | 'moderator' | 'viewer'): StreamParticipant[] => {
    return state.participants.filter(p => p.role === role && p.isActive);
  }, [state.participants]);

  // Auto-start tracking when component mounts
  useEffect(() => {
    if (autoStart && streamId) {
      startTracking();
    }

    // Cleanup on unmount
    return () => {
      if (state.isTracking) {
        stopTracking();
      }
    };
  }, [streamId, autoStart]); // Only depend on streamId and autoStart

  // Monitor connection quality based on network conditions
  useEffect(() => {
    if (!state.isTracking || !user?.uid) return;

    // Simple connection quality monitoring
    const checkConnectionQuality = () => {
      // In a real implementation, this would check actual network conditions
      // For now, we'll simulate based on navigator.connection if available
      const connection = (navigator as any).connection;
      
      if (connection) {
        const { effectiveType, downlink } = connection;
        
        let quality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected' = 'good';
        
        if (effectiveType === '4g' && downlink > 10) {
          quality = 'excellent';
        } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 2)) {
          quality = 'good';
        } else if (effectiveType === '3g' || effectiveType === '2g') {
          quality = 'fair';
        } else {
          quality = 'poor';
        }
        
        if (quality !== state.connectionQuality) {
          updateConnectionQuality(quality);
        }
      }
    };

    // Check connection quality every 30 seconds
    const interval = setInterval(checkConnectionQuality, 30000);
    
    // Initial check
    checkConnectionQuality();

    return () => clearInterval(interval);
  }, [state.isTracking, state.connectionQuality, user?.uid, updateConnectionQuality]);

  return {
    // State
    participants: state.participants,
    viewerCount: state.viewerCount,
    isTracking: state.isTracking,
    connectionQuality: state.connectionQuality,
    error: state.error,
    
    // Actions
    startTracking,
    stopTracking,
    updateConnectionQuality,
    
    // Helpers
    getParticipant,
    isHost,
    isModerator,
    activeParticipants,
    getParticipantsByRole,
    
    // Computed values
    hostCount: getParticipantsByRole('host').length,
    moderatorCount: getParticipantsByRole('moderator').length,
    viewerOnlyCount: getParticipantsByRole('viewer').length,
    totalActiveCount: activeParticipants().length
  };
}

export default useParticipantTracking;
