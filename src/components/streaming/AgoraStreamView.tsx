/**
 * Agora Stream View Component
 * Handles real-time audio/video streaming UI for VuluGO
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator, AppState } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { RtcLocalView, RtcRemoteView } from './AgoraViewsWrapper';

import { agoraService, AgoraParticipant, AgoraStreamState } from '../../services/agoraService';
import { isAgoraConfigured } from '../../config/agoraConfig';
import { agoraTokenService } from '../../services/agoraTokenService';
import { HostControls } from './HostControls';
import { ParticipantsList } from './ParticipantsList';
import { SpeakingIndicator } from './SpeakingIndicator';
import { useStreamLifecycle } from '../../hooks/useAppLifecycle';
import { useAutoRecovery } from '../../hooks/useStreamRecovery';
import { throttledConnectionLog, throttledNetworkLog } from '../../utils/loggingThrottle';
import { usePerformanceOptimization } from '../../hooks/usePerformanceOptimization';

interface AgoraStreamViewProps {
  streamId: string;
  userId: string;
  isHost: boolean;
  onConnectionStateChange?: (state: 'disconnected' | 'connecting' | 'connected') => void;
  onParticipantUpdate?: (participants: AgoraParticipant[]) => void;
  onError?: (error: string) => void;
  onJoinSuccess?: () => void;
  onLeaveSuccess?: () => void;
}

interface StreamState {
  isConnecting: boolean;
  isConnected: boolean;
  isJoined: boolean;
  error: string | null;
  participants: AgoraParticipant[];
  localControls: {
    isAudioMuted: boolean;
    isVideoEnabled: boolean;
    isSpeaking: boolean;
    audioLevel: number;
  };
}

export const AgoraStreamView: React.FC<AgoraStreamViewProps> = ({
  streamId,
  userId,
  isHost,
  onConnectionStateChange,
  onParticipantUpdate,
  onError,
  onJoinSuccess,
  onLeaveSuccess,
}) => {
  const [streamState, setStreamState] = useState<StreamState>({
    isConnecting: false,
    isConnected: false,
    isJoined: false,
    error: null,
    participants: [],
    localControls: {
      isAudioMuted: false,
      isVideoEnabled: false,
      isSpeaking: false,
      audioLevel: 0,
    },
  });

  const [hostControlsVisible, setHostControlsVisible] = useState(false);
  const [participantsListVisible, setParticipantsListVisible] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // App lifecycle management
  const streamLifecycle = useStreamLifecycle(
    streamId,
    streamState.isJoined,
    async () => {
      // Reconnection logic
      console.log('🔄 [AGORA_VIEW] Attempting to reconnect stream');
      await initializeAndJoin();
    }
  );

  // Automatic error recovery
  const recovery = useAutoRecovery(
    streamId,
    userId,
    (error) => {
      console.error('❌ [AGORA_VIEW] Recovery error:', error);
      setStreamState(prev => ({
        ...prev,
        error: error.message || 'Stream error occurred',
      }));
    }
  );

  // Performance optimization
  const performance = usePerformanceOptimization({
    enableAutoOptimization: true,
    monitoringInterval: 5000,
    onPerformanceAlert: (alert) => {
      console.warn(`⚠️ [AGORA_VIEW] Performance alert: ${alert.message}`);
    },
    onOptimizationApplied: (settings) => {
      console.log('⚡ [AGORA_VIEW] Optimization applied:', settings);

      // Apply video setting
      if (streamState.localControls.isVideoEnabled !== settings.videoEnabled) {
        toggleVideo();
      }
    },
    onPerformanceScoreChange: (score) => {
      console.log(`📊 [AGORA_VIEW] Performance score: ${score}`);
    },
  });

  // Check if Agora is configured
  const isConfigured = isAgoraConfigured();

  // Initialize Agora service and join channel
  const initializeAndJoin = useCallback(async () => {
    if (!isConfigured) {
      setStreamState(prev => ({
        ...prev,
        error: 'Agora service not configured'
      }));
      onError?.('Agora service not configured');
      return;
    }

    try {
      setStreamState(prev => ({
        ...prev,
        isConnecting: true,
        error: null
      }));
      onConnectionStateChange?.('connecting');

      console.log(`🔄 [AGORA_VIEW] Initializing Agora for stream: ${streamId}`);

      // Initialize Agora service
      const initialized = await agoraService.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Agora service');
      }

      // Set up event callbacks
      agoraService.setEventCallbacks({
        onJoinChannelSuccess: (channel, uid, elapsed) => {
          console.log(`✅ [AGORA_VIEW] Joined channel: ${channel} with UID: ${uid}`);
          setStreamState(prev => ({
            ...prev,
            isConnecting: false,
            isConnected: true,
            isJoined: true,
            error: null
          }));
          onConnectionStateChange?.('connected');
          onJoinSuccess?.();
        },

        onLeaveChannel: (stats) => {
          console.log('👋 [AGORA_VIEW] Left channel');
          setStreamState(prev => ({
            ...prev,
            isConnected: false,
            isJoined: false,
            participants: []
          }));
          onConnectionStateChange?.('disconnected');
          onLeaveSuccess?.();
        },

        onUserJoined: (uid, elapsed) => {
          console.log(`👤 [AGORA_VIEW] User joined: ${uid}`);
          updateParticipants();
        },

        onUserOffline: (uid, reason) => {
          console.log(`👤 [AGORA_VIEW] User offline: ${uid}, reason: ${reason}`);
          updateParticipants();
        },

        onAudioVolumeIndication: (speakers) => {
          // Update speaking indicators
          const updatedParticipants = streamState.participants.map(participant => {
            const speaker = speakers.find(s => s.uid === participant.uid);
            if (speaker) {
              return {
                ...participant,
                isSpeaking: speaker.volume > 5,
                audioLevel: speaker.volume
              };
            }
            return { ...participant, isSpeaking: false, audioLevel: 0 };
          });

          setStreamState(prev => ({
            ...prev,
            participants: updatedParticipants
          }));

          // Update local speaking state
          const localSpeaker = speakers.find(s => s.uid === 0); // Local user UID is 0
          if (localSpeaker) {
            setStreamState(prev => ({
              ...prev,
              localControls: {
                ...prev.localControls,
                isSpeaking: localSpeaker.volume > 5,
                audioLevel: localSpeaker.volume
              }
            }));
          }
        },

        onError: (errorCode) => {
          console.error(`❌ [AGORA_VIEW] Agora error: ${errorCode}`);
          const errorMessage = `Agora error: ${errorCode}`;
          const error = new Error(errorMessage);

          setStreamState(prev => ({
            ...prev,
            error: errorMessage,
            isConnecting: false
          }));

          // Trigger automatic recovery
          recovery.handleError(error);
          onError?.(errorMessage);
        },

        onConnectionStateChanged: (state, reason) => {
          // Use throttled logging to prevent spam
          throttledConnectionLog(`🔗 [AGORA_VIEW] Connection state changed: ${state}, reason: ${reason}`);

          const isConnected = state === 3; // Connected state

          setStreamState(prev => ({
            ...prev,
            isConnected
          }));

          // Handle disconnection with recovery
          if (!isConnected && streamState.isJoined) {
            const error = new Error(`Connection lost: state=${state}, reason=${reason}`);
            recovery.handleError(error);
          }

          // Map Agora connection states to UI states
          if (isConnected) {
            onConnectionStateChange?.('connected');
          } else if (state === 2 || state === 4) {
            onConnectionStateChange?.('connecting');
          } else {
            onConnectionStateChange?.('disconnected');
          }
        }
      });

      // Join the channel
      const joined = await agoraService.joinChannel(streamId, userId, isHost);
      if (!joined) {
        throw new Error('Failed to join channel');
      }

    } catch (error: any) {
      console.error('❌ [AGORA_VIEW] Failed to initialize and join:', error);
      const errorMessage = error.message || 'Failed to join stream';

      setStreamState(prev => ({
        ...prev,
        error: errorMessage,
        isConnecting: false,
        isConnected: false
      }));

      // Trigger automatic recovery for initialization failures
      recovery.handleError(error);
      onError?.(errorMessage);
    }
  }, [streamId, userId, isHost, isConfigured, onConnectionStateChange, onError, onJoinSuccess, onLeaveSuccess]);

  // Update participants from Agora service
  const updateParticipants = useCallback(() => {
    const participants = agoraService.getParticipants();
    setStreamState(prev => ({
      ...prev,
      participants
    }));
    onParticipantUpdate?.(participants);
  }, [onParticipantUpdate]);

  // Handle lifecycle events
  useEffect(() => {
    if (streamLifecycle.streamWasInterrupted && !streamState.isConnected) {
      console.log('⚠️ [AGORA_VIEW] Stream was interrupted and not connected');
      setStreamState(prev => ({
        ...prev,
        error: 'Stream was interrupted. Tap to reconnect.',
      }));
    }
  }, [streamLifecycle.streamWasInterrupted, streamState.isConnected]);

  // Handle network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;

      // Use throttled logging to prevent spam
      throttledNetworkLog(`🌐 [AGORA_VIEW] Network state changed: ${isConnected}`);

      streamLifecycle.handleNetworkStateChange(isConnected);

      if (!isConnected && streamState.isJoined) {
        setStreamState(prev => ({
          ...prev,
          error: 'Network connection lost. Reconnecting...',
        }));
      } else if (isConnected && streamState.error?.includes('Network')) {
        // Clear network-related errors when connection is restored
        setStreamState(prev => ({
          ...prev,
          error: null,
        }));

        // Attempt to reconnect if we were previously connected
        if (streamState.isJoined && !streamState.isConnected) {
          console.log('🔄 [AGORA_VIEW] Network restored, attempting reconnect');
          retryConnection();
        }
      }
    });

    return unsubscribe;
  }, [streamState.isJoined, streamState.isConnected, streamState.error, streamLifecycle, retryConnection]);

  // Handle memory warnings
  useEffect(() => {
    const handleMemoryWarning = () => {
      console.warn('⚠️ [AGORA_VIEW] Memory warning - optimizing stream');
      streamLifecycle.handleMemoryWarning();

      // Implement quality reduction
      if (streamState.localControls.isVideoEnabled) {
        console.log('📹 [AGORA_VIEW] Disabling video due to memory pressure');
        toggleVideo();
      }
    };

    // Note: Memory warning handling would need platform-specific implementation
    // This is a placeholder for the concept

    return () => {
      // Cleanup if needed
    };
  }, [streamState.localControls.isVideoEnabled, streamLifecycle, toggleVideo]);

  // Initialize on mount
  useEffect(() => {
    initializeAndJoin();

    // Start performance monitoring
    performance.startMonitoring();

    return () => {
      // Cleanup on unmount
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      if (streamState.isJoined) {
        agoraService.leaveChannel().catch(console.error);
      }

      // Stop performance monitoring
      performance.stopMonitoring();
    };
  }, []); // Only run once on mount

  // Audio control methods
  const toggleMute = useCallback(async () => {
    try {
      const newMutedState = !streamState.localControls.isAudioMuted;
      await agoraService.muteLocalAudio(newMutedState);
      setStreamState(prev => ({
        ...prev,
        localControls: {
          ...prev.localControls,
          isAudioMuted: newMutedState
        }
      }));
    } catch (error) {
      console.error('❌ [AGORA_VIEW] Failed to toggle mute:', error);
    }
  }, [streamState.localControls.isAudioMuted]);

  const toggleVideo = useCallback(async () => {
    try {
      const newVideoState = !streamState.localControls.isVideoEnabled;
      await agoraService.enableLocalVideo(newVideoState);
      setStreamState(prev => ({
        ...prev,
        localControls: {
          ...prev.localControls,
          isVideoEnabled: newVideoState
        }
      }));
    } catch (error) {
      console.error('❌ [AGORA_VIEW] Failed to toggle video:', error);
    }
  }, [streamState.localControls.isVideoEnabled]);

  const switchCamera = useCallback(async () => {
    try {
      await agoraService.switchCamera();
    } catch (error) {
      console.error('❌ [AGORA_VIEW] Failed to switch camera:', error);
    }
  }, []);

  const retryConnection = useCallback(() => {
    setStreamState(prev => ({ ...prev, error: null }));

    // Use recovery service for retry
    if (recovery.hasError && recovery.canRecover) {
      recovery.manualRecover();
    } else {
      initializeAndJoin();
    }
  }, [initializeAndJoin, recovery]);

  // Render methods
  const renderError = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={48} color="#FF6B6B" />
      <Text style={styles.errorText}>{streamState.error}</Text>

      {/* Recovery status */}
      {recovery.isRecovering && (
        <View style={styles.recoveryStatus}>
          <ActivityIndicator size="small" color="#6E56F7" />
          <Text style={styles.recoveryText}>
            Recovering... (Attempt {recovery.recoveryAttempt}/{recovery.maxAttempts})
          </Text>
        </View>
      )}

      {/* Circuit breaker warning */}
      {recovery.isCircuitBreakerOpen && (
        <View style={styles.circuitBreakerWarning}>
          <MaterialIcons name="warning" size={16} color="#FF9500" />
          <Text style={styles.circuitBreakerText}>
            Too many failures. Please wait before retrying.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.retryButton, (!recovery.canRecover) && styles.retryButtonDisabled]}
        onPress={retryConnection}
        disabled={!recovery.canRecover}
      >
        <Text style={styles.retryButtonText}>
          {recovery.isRecovering ? 'Recovering...' : 'Retry'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6E56F7" />
      <Text style={styles.loadingText}>
        {streamState.isConnecting ? 'Connecting to stream...' : 'Initializing...'}
      </Text>
    </View>
  );

  const renderControls = () => {
    if (!isHost) return null;

    return (
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            streamState.localControls.isAudioMuted && styles.controlButtonActive
          ]}
          onPress={toggleMute}
        >
          <MaterialIcons
            name={streamState.localControls.isAudioMuted ? 'mic-off' : 'mic'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            streamState.localControls.isVideoEnabled && styles.controlButtonActive
          ]}
          onPress={toggleVideo}
        >
          <MaterialIcons
            name={streamState.localControls.isVideoEnabled ? 'videocam' : 'videocam-off'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {streamState.localControls.isVideoEnabled && (
          <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
            <MaterialIcons name="flip-camera-ios" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Host Controls Button */}
        <TouchableOpacity
          style={[styles.controlButton, styles.hostControlsButton]}
          onPress={() => setHostControlsVisible(true)}
        >
          <MaterialIcons name="admin-panel-settings" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Participants List Button */}
        <TouchableOpacity
          style={[styles.controlButton, styles.participantsButton]}
          onPress={() => setParticipantsListVisible(true)}
        >
          <MaterialIcons name="people" size={24} color="#FFFFFF" />
          {streamState.participants.length > 0 && (
            <View style={styles.participantsBadge}>
              <Text style={styles.participantsBadgeText}>
                {streamState.participants.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderSpeakingIndicator = () => {
    if (!streamState.localControls.isSpeaking) return null;

    return (
      <View style={styles.speakingIndicator}>
        <MaterialIcons name="mic" size={16} color="#FFFFFF" />
        <Text style={styles.speakingText}>Speaking</Text>
      </View>
    );
  };

  // Main render
  if (!isConfigured) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="settings" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>Agora service not configured</Text>
        <Text style={styles.placeholderSubtext}>
          Please configure Agora credentials in environment variables
        </Text>
      </View>
    );
  }

  if (streamState.error) {
    return renderError();
  }

  if (streamState.isConnecting || !streamState.isConnected) {
    return renderLoading();
  }

  return (
    <View style={styles.container}>
      {/* Local video view (if video enabled) */}
      {streamState.localControls.isVideoEnabled && (
        <View style={styles.localVideoContainer}>
          <RtcLocalView.SurfaceView style={styles.localVideo} />
          <View style={styles.localVideoOverlay}>
            <Text style={styles.localVideoLabel}>You</Text>
          </View>
        </View>
      )}

      {/* Remote video views */}
      {streamState.participants.length > 0 && (
        <View style={styles.remoteVideosContainer}>
          {streamState.participants.map((participant) => (
            <View key={participant.uid} style={styles.remoteVideoContainer}>
              <RtcRemoteView.SurfaceView
                style={styles.remoteVideo}
                uid={participant.uid}
              />
              <View style={styles.remoteVideoOverlay}>
                <Text style={styles.remoteVideoLabel}>
                  {participant.name}
                  {participant.isSpeaking && ' 🎤'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Audio-only mode indicator */}
      {!streamState.localControls.isVideoEnabled && streamState.participants.length === 0 && (
        <View style={styles.audioOnlyContainer}>
          <MaterialIcons name="headset" size={64} color="#6E56F7" />
          <Text style={styles.audioOnlyText}>Audio Stream Active</Text>
          <Text style={styles.audioOnlySubtext}>
            {streamState.participants.length} participant{streamState.participants.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Speaking indicator overlay */}
      <SpeakingIndicator
        participants={streamState.participants}
        currentUserId={userId}
        position="bottom"
        maxVisible={3}
      />

      {/* Performance indicator */}
      {performance.currentMetrics && (
        <View style={styles.performanceIndicator}>
          <View style={[
            styles.performanceScore,
            {
              backgroundColor: performance.isOptimal
                ? 'rgba(76,175,80,0.8)'
                : performance.needsOptimization
                  ? 'rgba(244,67,54,0.8)'
                  : 'rgba(255,193,7,0.8)'
            }
          ]}>
            <Text style={styles.performanceScoreText}>
              {Math.round(performance.performanceScore)}
            </Text>
          </View>
          {performance.hasAlerts && (
            <MaterialIcons name="warning" size={16} color="#FF9500" />
          )}
        </View>
      )}

      {/* Speaking indicator */}
      {renderSpeakingIndicator()}

      {/* Host controls */}
      {renderControls()}

      {/* Host Controls Modal */}
      {isHost && (
        <HostControls
          streamId={streamId}
          hostId={userId}
          participants={streamState.participants}
          isVisible={hostControlsVisible}
          onClose={() => setHostControlsVisible(false)}
          onParticipantUpdate={updateParticipants}
        />
      )}

      {/* Participants List Modal */}
      <ParticipantsList
        participants={streamState.participants}
        currentUserId={userId}
        isHost={isHost}
        onParticipantPress={isHost ? (participant) => {
          setParticipantsListVisible(false);
          // Could open host controls for specific participant
        } : undefined}
        maxVisible={10}
        showSpeakingOnly={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  placeholderSubtext: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  hostControls: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1B23',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#6E56F7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1B23',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  localVideo: {
    flex: 1,
  },
  localVideoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  localVideoLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  remoteVideosContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  remoteVideoContainer: {
    width: '50%',
    aspectRatio: 1,
    padding: 5,
  },
  remoteVideo: {
    flex: 1,
    borderRadius: 12,
  },
  remoteVideoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  remoteVideoLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(110,86,247,0.8)',
  },
  leaveButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  speakingIndicator: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  speakingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  audioOnlyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  audioOnlyText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  audioOnlySubtext: {
    color: '#8E8E93',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  participantsList: {
    marginTop: 24,
    maxHeight: 200,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6E56F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  participantRole: {
    color: '#8E8E93',
    fontSize: 12,
    marginRight: 8,
  },
  participantSpeaking: {
    backgroundColor: 'rgba(76,175,80,0.3)',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  hostControlsButton: {
    backgroundColor: 'rgba(110,86,247,0.8)',
  },
  participantsButton: {
    backgroundColor: 'rgba(52,152,219,0.8)',
    position: 'relative',
  },
  participantsBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantsBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  recoveryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  recoveryText: {
    color: '#6E56F7',
    fontSize: 14,
    fontWeight: '500',
  },
  circuitBreakerWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,149,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
    gap: 6,
  },
  circuitBreakerText: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  retryButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },
  performanceIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  performanceScore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  performanceScoreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
