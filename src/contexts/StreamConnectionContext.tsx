/**
 * Stream Connection Context
 * Manages stream connection state with automatic reconnection and error recovery
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import agoraService from '../services/agoraService';
import firestoreService from '../services/firestoreService';
import participantTrackingService from '../services/participantTrackingService';

// Connection states
export type ConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'reconnecting' 
  | 'failed'
  | 'ending';

// Stream roles
export type StreamRole = 'host' | 'viewer';

// Connection quality levels
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

export interface StreamConnectionState {
  // Connection status
  connectionState: ConnectionState;
  connectionQuality: ConnectionQuality;
  isConnected: boolean;
  
  // Stream information
  streamId: string | null;
  streamTitle: string | null;
  role: StreamRole | null;
  
  // Participant information
  viewerCount: number;
  participants: any[];
  
  // Error handling
  error: string | null;
  lastError: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // Network information
  networkLatency: number;
  networkStrength: number;
  
  // Timestamps
  connectedAt: Date | null;
  lastReconnectAt: Date | null;
}

type StreamConnectionAction =
  | { type: 'SET_CONNECTING'; streamId: string; role: StreamRole }
  | { type: 'SET_CONNECTED'; streamId: string; streamTitle: string }
  | { type: 'SET_RECONNECTING' }
  | { type: 'SET_DISCONNECTED' }
  | { type: 'SET_FAILED'; error: string }
  | { type: 'SET_ENDING' }
  | { type: 'UPDATE_PARTICIPANTS'; participants: any[]; viewerCount: number }
  | { type: 'UPDATE_CONNECTION_QUALITY'; quality: ConnectionQuality }
  | { type: 'UPDATE_NETWORK_INFO'; latency: number; strength: number }
  | { type: 'INCREMENT_RECONNECT_ATTEMPTS' }
  | { type: 'RESET_RECONNECT_ATTEMPTS' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

const initialState: StreamConnectionState = {
  connectionState: 'disconnected',
  connectionQuality: 'good',
  isConnected: false,
  streamId: null,
  streamTitle: null,
  role: null,
  viewerCount: 0,
  participants: [],
  error: null,
  lastError: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  networkLatency: 0,
  networkStrength: 100,
  connectedAt: null,
  lastReconnectAt: null
};

function streamConnectionReducer(
  state: StreamConnectionState, 
  action: StreamConnectionAction
): StreamConnectionState {
  switch (action.type) {
    case 'SET_CONNECTING':
      return {
        ...state,
        connectionState: 'connecting',
        isConnected: false,
        streamId: action.streamId,
        role: action.role,
        error: null
      };
      
    case 'SET_CONNECTED':
      return {
        ...state,
        connectionState: 'connected',
        isConnected: true,
        streamId: action.streamId,
        streamTitle: action.streamTitle,
        connectedAt: new Date(),
        reconnectAttempts: 0,
        error: null
      };
      
    case 'SET_RECONNECTING':
      return {
        ...state,
        connectionState: 'reconnecting',
        isConnected: false,
        lastReconnectAt: new Date()
      };
      
    case 'SET_DISCONNECTED':
      return {
        ...state,
        connectionState: 'disconnected',
        isConnected: false,
        streamId: null,
        streamTitle: null,
        role: null,
        viewerCount: 0,
        participants: [],
        connectedAt: null,
        reconnectAttempts: 0
      };
      
    case 'SET_FAILED':
      return {
        ...state,
        connectionState: 'failed',
        isConnected: false,
        error: action.error,
        lastError: action.error
      };
      
    case 'SET_ENDING':
      return {
        ...state,
        connectionState: 'ending',
        isConnected: false
      };
      
    case 'UPDATE_PARTICIPANTS':
      return {
        ...state,
        participants: action.participants,
        viewerCount: action.viewerCount
      };
      
    case 'UPDATE_CONNECTION_QUALITY':
      return {
        ...state,
        connectionQuality: action.quality
      };
      
    case 'UPDATE_NETWORK_INFO':
      return {
        ...state,
        networkLatency: action.latency,
        networkStrength: action.strength
      };
      
    case 'INCREMENT_RECONNECT_ATTEMPTS':
      return {
        ...state,
        reconnectAttempts: state.reconnectAttempts + 1
      };
      
    case 'RESET_RECONNECT_ATTEMPTS':
      return {
        ...state,
        reconnectAttempts: 0
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        lastError: action.error
      };
      
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
      
    default:
      return state;
  }
}

interface StreamConnectionContextType {
  state: StreamConnectionState;
  
  // Connection actions
  connectToStream: (streamId: string, role: StreamRole) => Promise<void>;
  disconnectFromStream: () => Promise<void>;
  reconnectToStream: () => Promise<void>;
  
  // Stream actions
  createAndJoinStream: (streamData: any) => Promise<string>;
  endStream: () => Promise<void>;
  
  // Utility functions
  clearError: () => void;
  updateConnectionQuality: (quality: ConnectionQuality) => void;
  
  // Connection info
  getConnectionDuration: () => number;
  isReconnecting: () => boolean;
  canReconnect: () => boolean;
}

const StreamConnectionContext = createContext<StreamConnectionContextType | undefined>(undefined);

export function StreamConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(streamConnectionReducer, initialState);
  const { user } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const networkMonitorRef = useRef<NodeJS.Timeout>();

  // Exponential backoff for reconnection
  const getReconnectDelay = useCallback((attempt: number): number => {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  }, []);

  // Connect to stream
  const connectToStream = useCallback(async (streamId: string, role: StreamRole) => {
    try {
      dispatch({ type: 'SET_CONNECTING', streamId, role });
      
      // Initialize Agora service
      await agoraService.initialize();
      
      // Join stream based on role
      if (role === 'host') {
        await agoraService.joinChannel(streamId, 'host');
      } else {
        await agoraService.joinChannel(streamId, 'viewer');
        await firestoreService.joinStream(streamId);
      }
      
      // Start participant tracking
      await participantTrackingService.startTracking(streamId, {
        onViewerCountChanged: (count) => {
          // Get updated participants from service
          // This would need to be implemented in the participant service
          dispatch({ 
            type: 'UPDATE_PARTICIPANTS', 
            participants: [], // Would get actual participants
            viewerCount: count 
          });
        }
      });
      
      // Get stream info
      const streamDoc = await firestoreService.getDocument('streams', streamId);
      const streamTitle = streamDoc?.title || 'Live Stream';
      
      dispatch({ type: 'SET_CONNECTED', streamId, streamTitle });
      
      console.log(`✅ Connected to stream ${streamId} as ${role}`);
      
    } catch (error: any) {
      console.error('Failed to connect to stream:', error);
      dispatch({ type: 'SET_FAILED', error: error.message });
      
      // Attempt reconnection if not at max attempts
      if (state.reconnectAttempts < state.maxReconnectAttempts) {
        setTimeout(() => {
          reconnectToStream();
        }, getReconnectDelay(state.reconnectAttempts));
      }
    }
  }, [state.reconnectAttempts, state.maxReconnectAttempts, getReconnectDelay]);

  // Disconnect from stream
  const disconnectFromStream = useCallback(async () => {
    try {
      dispatch({ type: 'SET_ENDING' });
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Stop participant tracking
      if (state.streamId) {
        participantTrackingService.stopTracking(state.streamId);
        
        // Leave stream if viewer
        if (state.role === 'viewer') {
          await firestoreService.leaveStream(state.streamId);
        }
      }
      
      // Leave Agora channel
      await agoraService.leaveChannel();
      
      dispatch({ type: 'SET_DISCONNECTED' });
      
      console.log('✅ Disconnected from stream');
      
    } catch (error: any) {
      console.error('Error disconnecting from stream:', error);
      dispatch({ type: 'SET_ERROR', error: error.message });
    }
  }, [state.streamId, state.role]);

  // Reconnect to stream
  const reconnectToStream = useCallback(async () => {
    if (!state.streamId || !state.role || state.reconnectAttempts >= state.maxReconnectAttempts) {
      return;
    }
    
    try {
      dispatch({ type: 'SET_RECONNECTING' });
      dispatch({ type: 'INCREMENT_RECONNECT_ATTEMPTS' });
      
      console.log(`🔄 Reconnecting to stream (attempt ${state.reconnectAttempts + 1}/${state.maxReconnectAttempts})`);
      
      // Wait for reconnect delay
      await new Promise(resolve => 
        setTimeout(resolve, getReconnectDelay(state.reconnectAttempts))
      );
      
      // Attempt to reconnect
      await connectToStream(state.streamId, state.role);
      
    } catch (error: any) {
      console.error('Reconnection failed:', error);
      
      // Schedule next reconnect attempt
      if (state.reconnectAttempts < state.maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectToStream();
        }, getReconnectDelay(state.reconnectAttempts));
      } else {
        dispatch({ type: 'SET_FAILED', error: 'Max reconnection attempts reached' });
      }
    }
  }, [state.streamId, state.role, state.reconnectAttempts, state.maxReconnectAttempts, connectToStream, getReconnectDelay]);

  // Create and join stream (for hosts)
  const createAndJoinStream = useCallback(async (streamData: any): Promise<string> => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const streamId = `stream_${user.uid}_${Date.now()}`;
      
      // Create stream in Firestore
      await firestoreService.createStream(streamId, {
        ...streamData,
        hostId: user.uid,
        hostName: user.displayName || 'Host'
      });
      
      // Connect as host
      await connectToStream(streamId, 'host');
      
      return streamId;
      
    } catch (error: any) {
      console.error('Failed to create and join stream:', error);
      throw error;
    }
  }, [user, connectToStream]);

  // End stream (for hosts)
  const endStream = useCallback(async () => {
    try {
      if (!state.streamId || state.role !== 'host') {
        throw new Error('Only hosts can end streams');
      }
      
      // Update stream as ended in Firestore
      await firestoreService.updateDocument('streams', state.streamId, {
        isActive: false,
        endedAt: new Date()
      });
      
      // Disconnect from stream
      await disconnectFromStream();
      
      console.log(`✅ Stream ${state.streamId} ended`);
      
    } catch (error: any) {
      console.error('Failed to end stream:', error);
      throw error;
    }
  }, [state.streamId, state.role, disconnectFromStream]);

  // Utility functions
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const updateConnectionQuality = useCallback((quality: ConnectionQuality) => {
    dispatch({ type: 'UPDATE_CONNECTION_QUALITY', quality });
  }, []);

  const getConnectionDuration = useCallback((): number => {
    if (!state.connectedAt) return 0;
    return Date.now() - state.connectedAt.getTime();
  }, [state.connectedAt]);

  const isReconnecting = useCallback((): boolean => {
    return state.connectionState === 'reconnecting';
  }, [state.connectionState]);

  const canReconnect = useCallback((): boolean => {
    return state.reconnectAttempts < state.maxReconnectAttempts && 
           state.connectionState === 'failed';
  }, [state.reconnectAttempts, state.maxReconnectAttempts, state.connectionState]);

  // Network monitoring
  useEffect(() => {
    if (state.isConnected) {
      networkMonitorRef.current = setInterval(() => {
        // Monitor network conditions
        const connection = (navigator as any).connection;
        if (connection) {
          const latency = connection.rtt || 0;
          const strength = Math.min(100, (connection.downlink || 1) * 10);
          
          dispatch({ 
            type: 'UPDATE_NETWORK_INFO', 
            latency, 
            strength 
          });
          
          // Update connection quality based on network conditions
          let quality: ConnectionQuality = 'good';
          if (latency > 500 || strength < 20) {
            quality = 'poor';
          } else if (latency > 200 || strength < 50) {
            quality = 'fair';
          } else if (latency < 50 && strength > 80) {
            quality = 'excellent';
          }
          
          if (quality !== state.connectionQuality) {
            updateConnectionQuality(quality);
          }
        }
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (networkMonitorRef.current) {
        clearInterval(networkMonitorRef.current);
      }
    };
  }, [state.isConnected, state.connectionQuality, updateConnectionQuality]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (networkMonitorRef.current) {
        clearInterval(networkMonitorRef.current);
      }
    };
  }, []);

  const contextValue: StreamConnectionContextType = {
    state,
    connectToStream,
    disconnectFromStream,
    reconnectToStream,
    createAndJoinStream,
    endStream,
    clearError,
    updateConnectionQuality,
    getConnectionDuration,
    isReconnecting,
    canReconnect
  };

  return (
    <StreamConnectionContext.Provider value={contextValue}>
      {children}
    </StreamConnectionContext.Provider>
  );
}

export function useStreamConnection() {
  const context = useContext(StreamConnectionContext);
  if (context === undefined) {
    throw new Error('useStreamConnection must be used within a StreamConnectionProvider');
  }
  return context;
}

export default StreamConnectionContext;

// Connection Recovery Service
export class ConnectionRecoveryService {
  private static instance: ConnectionRecoveryService;
  private recoveryStrategies: Map<string, () => Promise<void>> = new Map();

  static getInstance(): ConnectionRecoveryService {
    if (!ConnectionRecoveryService.instance) {
      ConnectionRecoveryService.instance = new ConnectionRecoveryService();
    }
    return ConnectionRecoveryService.instance;
  }

  // Register recovery strategy for specific error types
  registerRecoveryStrategy(errorType: string, strategy: () => Promise<void>): void {
    this.recoveryStrategies.set(errorType, strategy);
  }

  // Attempt recovery based on error type
  async attemptRecovery(error: string): Promise<boolean> {
    try {
      // Determine error type
      const errorType = this.categorizeError(error);
      const strategy = this.recoveryStrategies.get(errorType);

      if (strategy) {
        await strategy();
        return true;
      }

      // Default recovery strategies
      switch (errorType) {
        case 'network':
          return await this.handleNetworkError();
        case 'permission':
          return await this.handlePermissionError();
        case 'agora':
          return await this.handleAgoraError();
        default:
          return false;
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      return false;
    }
  }

  private categorizeError(error: string): string {
    if (error.includes('network') || error.includes('connection')) {
      return 'network';
    }
    if (error.includes('permission') || error.includes('denied')) {
      return 'permission';
    }
    if (error.includes('agora') || error.includes('token')) {
      return 'agora';
    }
    return 'unknown';
  }

  private async handleNetworkError(): Promise<boolean> {
    // Wait for network to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if network is available
    if (navigator.onLine) {
      return true;
    }

    return false;
  }

  private async handlePermissionError(): Promise<boolean> {
    // Request permissions again
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch {
      return false;
    }
  }

  private async handleAgoraError(): Promise<boolean> {
    // Reinitialize Agora service
    try {
      await agoraService.initialize();
      return true;
    } catch {
      return false;
    }
  }
}
