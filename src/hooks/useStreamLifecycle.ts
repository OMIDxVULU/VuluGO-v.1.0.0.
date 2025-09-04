/**
 * React Hook for Stream Lifecycle Management
 * Provides easy integration with stream lifecycle service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import streamLifecycleService, { 
  StreamCreationOptions, 
  StreamMonitoringData 
} from '../services/streamLifecycleService';
import { useAuth } from '../contexts/AuthContext';

export interface UseStreamLifecycleOptions {
  autoCleanup?: boolean;
  monitoringEnabled?: boolean;
  onStreamCreated?: (streamId: string) => void;
  onStreamEnded?: (streamId: string) => void;
  onStreamJoined?: (streamId: string) => void;
  onStreamLeft?: (streamId: string) => void;
  onMonitoringUpdate?: (data: StreamMonitoringData) => void;
  onError?: (error: string) => void;
}

export interface StreamLifecycleState {
  currentStreamId: string | null;
  isHost: boolean;
  isInStream: boolean;
  isCreating: boolean;
  isJoining: boolean;
  isEnding: boolean;
  isLeaving: boolean;
  monitoringData: StreamMonitoringData | null;
  error: string | null;
  lastError: string | null;
}

export function useStreamLifecycle(options: UseStreamLifecycleOptions = {}) {
  const { user } = useAuth();
  const {
    autoCleanup = true,
    monitoringEnabled = true,
    onStreamCreated,
    onStreamEnded,
    onStreamJoined,
    onStreamLeft,
    onMonitoringUpdate,
    onError
  } = options;

  const [state, setState] = useState<StreamLifecycleState>({
    currentStreamId: null,
    isHost: false,
    isInStream: false,
    isCreating: false,
    isJoining: false,
    isEnding: false,
    isLeaving: false,
    monitoringData: null,
    error: null,
    lastError: null
  });

  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const monitoringIntervalRef = useRef<NodeJS.Timeout>();

  // Create and start a new stream
  const createStream = useCallback(async (streamOptions: StreamCreationOptions): Promise<string> => {
    try {
      setState(prev => ({ 
        ...prev, 
        isCreating: true, 
        error: null 
      }));

      const streamId = await streamLifecycleService.createStream(streamOptions);

      setState(prev => ({
        ...prev,
        currentStreamId: streamId,
        isHost: true,
        isInStream: true,
        isCreating: false
      }));

      // Start monitoring if enabled
      if (monitoringEnabled) {
        startMonitoring(streamId);
      }

      callbacksRef.current.onStreamCreated?.(streamId);
      console.log(`✅ Stream created successfully: ${streamId}`);

      return streamId;

    } catch (error: any) {
      const errorMessage = `Failed to create stream: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isCreating: false, 
        error: errorMessage,
        lastError: errorMessage 
      }));
      
      callbacksRef.current.onError?.(errorMessage);
      throw error;
    }
  }, [monitoringEnabled]);

  // End the current stream
  const endStream = useCallback(async (): Promise<void> => {
    if (!state.currentStreamId || !state.isHost) {
      throw new Error('No active stream to end or user is not the host');
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isEnding: true, 
        error: null 
      }));

      await streamLifecycleService.endStream(state.currentStreamId);

      // Stop monitoring
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }

      const endedStreamId = state.currentStreamId;
      setState(prev => ({
        ...prev,
        currentStreamId: null,
        isHost: false,
        isInStream: false,
        isEnding: false,
        monitoringData: null
      }));

      callbacksRef.current.onStreamEnded?.(endedStreamId);
      console.log(`✅ Stream ended successfully: ${endedStreamId}`);

    } catch (error: any) {
      const errorMessage = `Failed to end stream: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isEnding: false, 
        error: errorMessage,
        lastError: errorMessage 
      }));
      
      callbacksRef.current.onError?.(errorMessage);
      throw error;
    }
  }, [state.currentStreamId, state.isHost]);

  // Join an existing stream
  const joinStream = useCallback(async (streamId: string): Promise<void> => {
    try {
      setState(prev => ({ 
        ...prev, 
        isJoining: true, 
        error: null 
      }));

      await streamLifecycleService.joinStream(streamId);

      setState(prev => ({
        ...prev,
        currentStreamId: streamId,
        isHost: false,
        isInStream: true,
        isJoining: false
      }));

      // Start monitoring if enabled
      if (monitoringEnabled) {
        startMonitoring(streamId);
      }

      callbacksRef.current.onStreamJoined?.(streamId);
      console.log(`✅ Joined stream successfully: ${streamId}`);

    } catch (error: any) {
      const errorMessage = `Failed to join stream: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isJoining: false, 
        error: errorMessage,
        lastError: errorMessage 
      }));
      
      callbacksRef.current.onError?.(errorMessage);
      throw error;
    }
  }, [monitoringEnabled]);

  // Leave the current stream
  const leaveStream = useCallback(async (): Promise<void> => {
    if (!state.currentStreamId || state.isHost) {
      throw new Error('No stream to leave or user is the host (use endStream instead)');
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isLeaving: true, 
        error: null 
      }));

      await streamLifecycleService.leaveStream(state.currentStreamId);

      // Stop monitoring
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }

      const leftStreamId = state.currentStreamId;
      setState(prev => ({
        ...prev,
        currentStreamId: null,
        isHost: false,
        isInStream: false,
        isLeaving: false,
        monitoringData: null
      }));

      callbacksRef.current.onStreamLeft?.(leftStreamId);
      console.log(`✅ Left stream successfully: ${leftStreamId}`);

    } catch (error: any) {
      const errorMessage = `Failed to leave stream: ${error.message}`;
      setState(prev => ({ 
        ...prev, 
        isLeaving: false, 
        error: errorMessage,
        lastError: errorMessage 
      }));
      
      callbacksRef.current.onError?.(errorMessage);
      throw error;
    }
  }, [state.currentStreamId, state.isHost]);

  // Start monitoring the current stream
  const startMonitoring = useCallback((streamId: string) => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }

    // Poll for monitoring data every 10 seconds
    monitoringIntervalRef.current = setInterval(async () => {
      try {
        const monitoringData = await streamLifecycleService.getStreamMonitoringData(streamId);
        
        if (monitoringData) {
          setState(prev => ({ 
            ...prev, 
            monitoringData 
          }));
          
          callbacksRef.current.onMonitoringUpdate?.(monitoringData);
        }
      } catch (error) {
        console.error('Failed to get monitoring data:', error);
      }
    }, 10000);

    console.log(`📊 Started monitoring for stream: ${streamId}`);
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = undefined;
      console.log('📊 Stopped stream monitoring');
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get stream duration
  const getStreamDuration = useCallback((): number => {
    if (!state.monitoringData) return 0;
    return state.monitoringData.duration;
  }, [state.monitoringData]);

  // Check if user can end stream
  const canEndStream = useCallback((): boolean => {
    return state.isInStream && state.isHost && !state.isEnding;
  }, [state.isInStream, state.isHost, state.isEnding]);

  // Check if user can leave stream
  const canLeaveStream = useCallback((): boolean => {
    return state.isInStream && !state.isHost && !state.isLeaving;
  }, [state.isInStream, state.isHost, state.isLeaving]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCleanup && state.isInStream) {
        console.log('🧹 Auto-cleanup: leaving stream on unmount');
        
        if (state.isHost && state.currentStreamId) {
          streamLifecycleService.endStream(state.currentStreamId).catch(console.error);
        } else if (state.currentStreamId) {
          streamLifecycleService.leaveStream(state.currentStreamId).catch(console.error);
        }
      }
      
      stopMonitoring();
    };
  }, []); // Only run on unmount

  // Stop monitoring when stream ends
  useEffect(() => {
    if (!state.isInStream && monitoringIntervalRef.current) {
      stopMonitoring();
    }
  }, [state.isInStream, stopMonitoring]);

  return {
    // State
    currentStreamId: state.currentStreamId,
    isHost: state.isHost,
    isInStream: state.isInStream,
    isCreating: state.isCreating,
    isJoining: state.isJoining,
    isEnding: state.isEnding,
    isLeaving: state.isLeaving,
    monitoringData: state.monitoringData,
    error: state.error,
    lastError: state.lastError,

    // Actions
    createStream,
    endStream,
    joinStream,
    leaveStream,
    startMonitoring,
    stopMonitoring,
    clearError,

    // Helpers
    getStreamDuration,
    canEndStream,
    canLeaveStream,

    // Computed values
    isActive: state.isInStream,
    isBusy: state.isCreating || state.isJoining || state.isEnding || state.isLeaving,
    streamStatus: state.monitoringData?.status || 'inactive',
    viewerCount: state.monitoringData?.viewerCount || 0,
    connectionQuality: state.monitoringData?.connectionQuality || 'good'
  };
}

export default useStreamLifecycle;
