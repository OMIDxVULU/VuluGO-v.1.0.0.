/**
 * React Hook for Stream Recording
 * Provides easy integration with stream recording service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import streamRecordingService, {
  StreamRecording,
  RecordingHighlight,
  RecordingPlaybackSession
} from '../services/streamRecordingService';
import { useAuth } from '../contexts/AuthContext';

export interface UseStreamRecordingOptions {
  streamId?: string;
  autoLoadRecordings?: boolean;
  onRecordingStarted?: (recordingId: string) => void;
  onRecordingStopped?: (recordingId: string) => void;
  onRecordingError?: (error: string) => void;
  onPlaybackStarted?: (sessionId: string) => void;
  onPlaybackEnded?: (sessionId: string) => void;
}

export interface StreamRecordingState {
  currentRecording: StreamRecording | null;
  userRecordings: StreamRecording[];
  publicRecordings: StreamRecording[];
  highlights: RecordingHighlight[];
  playbackSession: RecordingPlaybackSession | null;
  isRecording: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  recordingDuration: number;
  playbackPosition: number;
  playbackDuration: number;
}

export function useStreamRecording(options: UseStreamRecordingOptions = {}) {
  const { streamId, autoLoadRecordings = false } = options;
  const { user } = useAuth();

  const [state, setState] = useState<StreamRecordingState>({
    currentRecording: null,
    userRecordings: [],
    publicRecordings: [],
    highlights: [],
    playbackSession: null,
    isRecording: false,
    isLoading: false,
    isProcessing: false,
    error: null,
    recordingDuration: 0,
    playbackPosition: 0,
    playbackDuration: 0
  });

  const durationIntervalRef = useRef<NodeJS.Timeout>();
  const playbackIntervalRef = useRef<NodeJS.Timeout>();
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Start recording
  const startRecording = useCallback(async (
    title: string,
    description?: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    try {
      if (!streamId) {
        throw new Error('Stream ID is required to start recording');
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const recordingId = await streamRecordingService.startRecording(
        streamId,
        title,
        description,
        quality
      );

      const recording = await streamRecordingService.getRecording(recordingId);

      setState(prev => ({
        ...prev,
        currentRecording: recording,
        isRecording: true,
        isLoading: false,
        recordingDuration: 0
      }));

      // Start duration tracking
      startDurationTracking();

      callbacksRef.current.onRecordingStarted?.(recordingId);
      console.log(`✅ Recording started: ${recordingId}`);

      return recordingId;

    } catch (error: any) {
      const errorMessage = `Failed to start recording: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      callbacksRef.current.onRecordingError?.(errorMessage);
      throw error;
    }
  }, [streamId, user]);

  // Stop recording
  const stopRecording = useCallback(async (recordingId?: string) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      await streamRecordingService.stopRecording(recordingId);

      // Stop duration tracking
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      const finalRecordingId = recordingId || state.currentRecording?.id;

      setState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        currentRecording: null
      }));

      callbacksRef.current.onRecordingStopped?.(finalRecordingId || '');
      console.log(`✅ Recording stopped: ${finalRecordingId}`);

    } catch (error: any) {
      const errorMessage = `Failed to stop recording: ${error.message}`;
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));

      callbacksRef.current.onRecordingError?.(errorMessage);
      throw error;
    }
  }, [state.currentRecording]);

  // Load user recordings
  const loadUserRecordings = useCallback(async (userId?: string, limit: number = 20) => {
    try {
      const targetUserId = userId || user?.uid;
      if (!targetUserId) {
        throw new Error('User ID is required');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const recordings = await streamRecordingService.getUserRecordings(targetUserId, limit);

      setState(prev => ({
        ...prev,
        userRecordings: recordings,
        isLoading: false
      }));

      return recordings;

    } catch (error: any) {
      const errorMessage = `Failed to load user recordings: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, [user]);

  // Load public recordings
  const loadPublicRecordings = useCallback(async (limit: number = 20) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const recordings = await streamRecordingService.getPublicRecordings(limit);

      setState(prev => ({
        ...prev,
        publicRecordings: recordings,
        isLoading: false
      }));

      return recordings;

    } catch (error: any) {
      const errorMessage = `Failed to load public recordings: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, []);

  // Create highlight
  const createHighlight = useCallback(async (
    recordingId: string,
    title: string,
    startTime: number,
    endTime: number,
    description?: string
  ) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const highlightId = await streamRecordingService.createHighlight(
        recordingId,
        title,
        startTime,
        endTime,
        description
      );

      setState(prev => ({ ...prev, isProcessing: false }));

      console.log(`✅ Highlight created: ${highlightId}`);
      return highlightId;

    } catch (error: any) {
      const errorMessage = `Failed to create highlight: ${error.message}`;
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));

      throw error;
    }
  }, []);

  // Start playback session
  const startPlayback = useCallback(async (recordingId: string) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const sessionId = await streamRecordingService.startPlaybackSession(recordingId);
      const recording = await streamRecordingService.getRecording(recordingId);

      setState(prev => ({
        ...prev,
        playbackSession: {
          id: sessionId,
          recordingId,
          userId: user.uid,
          startedAt: new Date() as any,
          watchTime: 0,
          lastPosition: 0,
          completed: false
        },
        playbackDuration: recording?.duration || 0,
        playbackPosition: 0
      }));

      // Start playback tracking
      startPlaybackTracking(sessionId);

      callbacksRef.current.onPlaybackStarted?.(sessionId);
      console.log(`✅ Playback started: ${sessionId}`);

      return sessionId;

    } catch (error: any) {
      const errorMessage = `Failed to start playback: ${error.message}`;
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [user]);

  // Update playback position
  const updatePlaybackPosition = useCallback((position: number) => {
    setState(prev => ({
      ...prev,
      playbackPosition: position
    }));
  }, []);

  // End playback session
  const endPlayback = useCallback(async (completed: boolean = false) => {
    try {
      if (!state.playbackSession) {
        return;
      }

      // Stop playback tracking
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }

      await streamRecordingService.endPlaybackSession(
        state.playbackSession.id,
        state.playbackPosition,
        state.playbackSession.watchTime,
        completed
      );

      setState(prev => ({
        ...prev,
        playbackSession: null,
        playbackPosition: 0,
        playbackDuration: 0
      }));

      callbacksRef.current.onPlaybackEnded?.(state.playbackSession.id);
      console.log(`✅ Playback ended: ${state.playbackSession.id}`);

    } catch (error: any) {
      console.error('Failed to end playback session:', error);
    }
  }, [state.playbackSession, state.playbackPosition]);

  // Delete recording
  const deleteRecording = useCallback(async (recordingId: string) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      await streamRecordingService.deleteRecording(recordingId);

      // Remove from local state
      setState(prev => ({
        ...prev,
        userRecordings: prev.userRecordings.filter(r => r.id !== recordingId),
        publicRecordings: prev.publicRecordings.filter(r => r.id !== recordingId),
        isProcessing: false
      }));

      console.log(`✅ Recording deleted: ${recordingId}`);

    } catch (error: any) {
      const errorMessage = `Failed to delete recording: ${error.message}`;
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));

      throw error;
    }
  }, []);

  // Start duration tracking for current recording
  const startDurationTracking = useCallback(() => {
    durationIntervalRef.current = setInterval(() => {
      const duration = streamRecordingService.getCurrentRecordingDuration();
      setState(prev => ({ ...prev, recordingDuration: duration }));
    }, 1000);
  }, []);

  // Start playback tracking
  const startPlaybackTracking = useCallback((sessionId: string) => {
    let watchTime = 0;
    
    playbackIntervalRef.current = setInterval(async () => {
      watchTime += 1;
      
      setState(prev => ({
        ...prev,
        playbackSession: prev.playbackSession ? {
          ...prev.playbackSession,
          watchTime
        } : null
      }));

      // Update server every 10 seconds
      if (watchTime % 10 === 0) {
        try {
          await streamRecordingService.updatePlaybackProgress(
            sessionId,
            state.playbackPosition,
            watchTime
          );
        } catch (error) {
          console.warn('Failed to update playback progress:', error);
        }
      }
    }, 1000);
  }, [state.playbackPosition]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Format duration helper
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Auto-load recordings on mount
  useEffect(() => {
    if (autoLoadRecordings && user) {
      loadUserRecordings();
      loadPublicRecordings();
    }
  }, [autoLoadRecordings, user, loadUserRecordings, loadPublicRecordings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [state.error, clearError]);

  return {
    // State
    currentRecording: state.currentRecording,
    userRecordings: state.userRecordings,
    publicRecordings: state.publicRecordings,
    highlights: state.highlights,
    playbackSession: state.playbackSession,
    isRecording: state.isRecording,
    isLoading: state.isLoading,
    isProcessing: state.isProcessing,
    error: state.error,
    recordingDuration: state.recordingDuration,
    playbackPosition: state.playbackPosition,
    playbackDuration: state.playbackDuration,

    // Actions
    startRecording,
    stopRecording,
    loadUserRecordings,
    loadPublicRecordings,
    createHighlight,
    startPlayback,
    updatePlaybackPosition,
    endPlayback,
    deleteRecording,
    clearError,

    // Helpers
    formatDuration,

    // Computed values
    hasCurrentRecording: !!state.currentRecording,
    hasUserRecordings: state.userRecordings.length > 0,
    hasPublicRecordings: state.publicRecordings.length > 0,
    isPlayingBack: !!state.playbackSession,
    canRecord: !!streamId && !!user && !state.isRecording,
    recordingProgress: state.playbackDuration > 0 ? 
      (state.playbackPosition / state.playbackDuration) * 100 : 0,
    
    // Quick stats
    totalUserRecordings: state.userRecordings.length,
    totalPublicRecordings: state.publicRecordings.length,
    formattedRecordingDuration: formatDuration(state.recordingDuration),
    formattedPlaybackPosition: formatDuration(state.playbackPosition),
    formattedPlaybackDuration: formatDuration(state.playbackDuration)
  };
}

export default useStreamRecording;
