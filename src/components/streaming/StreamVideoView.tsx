/**
 * Stream Video View Component
 * Responsive video container with proper aspect ratios and Agora integration
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  ActivityIndicator
} from 'react-native';
import { RtcLocalView, RtcRemoteView, VideoRenderMode } from './AgoraViewsWrapper';
import { useStreamConnection } from '../../contexts/StreamConnectionContext';
import agoraService from '../../services/agoraService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Discord-inspired colors
const colors = {
  background: '#0f1117',
  text: '#FFFFFF',
  textMuted: '#B9BBBE',
  accent: '#5865F2',
  error: '#ED4245'
};

interface StreamVideoViewProps {
  streamId: string;
  style?: any;
  aspectRatio?: number;
  isHost?: boolean;
  showLocalVideo?: boolean;
  videoQuality?: 'low' | 'medium' | 'high' | 'auto';
}

export default function StreamVideoView({
  streamId,
  style,
  aspectRatio = 16/9,
  isHost = false,
  showLocalVideo = true,
  videoQuality = 'auto'
}: StreamVideoViewProps) {
  const { state: connectionState } = useStreamConnection();
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [isLoading, setIsLoading] = useState(true);

  // Calculate responsive dimensions
  const getVideoDimensions = () => {
    const maxWidth = screenWidth;
    const maxHeight = screenHeight;
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return { width, height };
  };

  const videoDimensions = getVideoDimensions();

  // Initialize Agora listeners
  useEffect(() => {
    const setupAgoraListeners = async () => {
      try {
        // Set up event listeners
        agoraService.engine?.addListener('UserJoined', (uid: number) => {
          console.log('User joined:', uid);
          setRemoteUsers(prev => [...prev.filter(id => id !== uid), uid]);
        });

        agoraService.engine?.addListener('UserOffline', (uid: number) => {
          console.log('User left:', uid);
          setRemoteUsers(prev => prev.filter(id => id !== uid));
        });

        agoraService.engine?.addListener('RemoteVideoStateChanged', (uid: number, state: number) => {
          console.log('Remote video state changed:', uid, state);
        });

        agoraService.engine?.addListener('RemoteAudioStateChanged', (uid: number, state: number) => {
          console.log('Remote audio state changed:', uid, state);
        });

        agoraService.engine?.addListener('NetworkQuality', (uid: number, txQuality: number, rxQuality: number) => {
          // Update connection quality based on network stats
          const quality = txQuality <= 2 ? 'excellent' : 
                         txQuality <= 4 ? 'good' : 
                         txQuality <= 6 ? 'fair' : 'poor';
          setConnectionQuality(quality);
        });

        agoraService.engine?.addListener('ConnectionStateChanged', (state: number) => {
          console.log('Connection state changed:', state);
          setIsLoading(state === 2); // 2 = connecting
        });

        setIsLoading(false);

      } catch (error) {
        console.error('Failed to setup Agora listeners:', error);
        setIsLoading(false);
      }
    };

    if (connectionState.isConnected) {
      setupAgoraListeners();
    }

    return () => {
      // Cleanup listeners
      agoraService.engine?.removeAllListeners();
    };
  }, [connectionState.isConnected]);

  // Handle video quality changes
  useEffect(() => {
    const updateVideoQuality = async () => {
      try {
        let profile;
        switch (videoQuality) {
          case 'low':
            profile = 120; // 160x120, 15fps
            break;
          case 'medium':
            profile = 240; // 320x240, 15fps
            break;
          case 'high':
            profile = 480; // 640x480, 15fps
            break;
          default:
            profile = 360; // 640x360, 15fps (auto)
        }

        await agoraService.engine?.setVideoEncoderConfiguration({
          dimensions: { width: 640, height: 360 },
          frameRate: 15,
          bitrate: 0, // Auto bitrate
          orientationMode: 0
        });

      } catch (error) {
        console.error('Failed to update video quality:', error);
      }
    };

    if (connectionState.isConnected && isHost) {
      updateVideoQuality();
    }
  }, [videoQuality, connectionState.isConnected, isHost]);

  // Render loading state
  if (isLoading || !connectionState.isConnected) {
    return (
      <View style={[styles.container, style, { ...videoDimensions }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>
            {isLoading ? 'Connecting to stream...' : 'Waiting for connection...'}
          </Text>
        </View>
      </View>
    );
  }

  // Render error state
  if (connectionState.connectionState === 'failed') {
    return (
      <View style={[styles.container, style, { ...videoDimensions }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to connect to stream</Text>
          <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
        </View>
      </View>
    );
  }

  // Render local video (host view)
  const renderLocalVideo = () => {
    if (!isHost || !showLocalVideo) return null;

    return (
      <View style={styles.localVideoContainer}>
        <RtcLocalView.SurfaceView
          style={styles.localVideo}
          channelId={streamId}
          renderMode={VideoRenderMode.Hidden}
          zOrderMediaOverlay={true}
        />
        
        {/* Local video controls overlay */}
        <View style={styles.localVideoOverlay}>
          <View style={[
            styles.connectionIndicator,
            { backgroundColor: getConnectionColor(connectionQuality) }
          ]} />
        </View>
      </View>
    );
  };

  // Render remote video (viewer view or host viewing others)
  const renderRemoteVideo = () => {
    if (remoteUsers.length === 0) {
      return (
        <View style={styles.noVideoContainer}>
          <Text style={styles.noVideoText}>
            {isHost ? 'Waiting for viewers...' : 'Stream starting soon...'}
          </Text>
        </View>
      );
    }

    // For now, show the first remote user (host)
    const primaryUser = remoteUsers[0];

    return (
      <RtcRemoteView.SurfaceView
        style={styles.remoteVideo}
        uid={primaryUser}
        channelId={streamId}
        renderMode={VideoRenderMode.Hidden}
        zOrderMediaOverlay={false}
      />
    );
  };

  // Get connection quality color
  const getConnectionColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return '#3BA55C';
      case 'good': return '#FAA61A';
      case 'fair': return '#ED4245';
      case 'poor': return '#747F8D';
      default: return '#FAA61A';
    }
  };

  return (
    <View style={[styles.container, style, { ...videoDimensions }]}>
      {/* Main video view */}
      <View style={styles.videoContainer}>
        {isHost ? renderLocalVideo() : renderRemoteVideo()}
      </View>

      {/* Video overlay information */}
      <View style={styles.videoOverlay}>
        {/* Connection quality indicator */}
        <View style={styles.qualityIndicator}>
          <View style={[
            styles.qualityDot,
            { backgroundColor: getConnectionColor(connectionQuality) }
          ]} />
          <Text style={styles.qualityText}>{connectionQuality}</Text>
        </View>

        {/* Video stats (debug info) */}
        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              {remoteUsers.length} users • {connectionState.connectionState}
            </Text>
          </View>
        )}
      </View>

      {/* Picture-in-picture for host (show remote users) */}
      {isHost && remoteUsers.length > 0 && (
        <View style={styles.pipContainer}>
          <RtcRemoteView.SurfaceView
            style={styles.pipVideo}
            uid={remoteUsers[0]}
            channelId={streamId}
            renderMode={VideoRenderMode.Fit}
            zOrderMediaOverlay={true}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    position: 'relative',
    overflow: 'hidden',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  localVideoContainer: {
    flex: 1,
    position: 'relative',
  },
  localVideo: {
    flex: 1,
  },
  localVideoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  remoteVideo: {
    flex: 1,
  },
  noVideoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  noVideoText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  videoOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  qualityText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  connectionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  debugInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  pipContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  pipVideo: {
    flex: 1,
  },
});
