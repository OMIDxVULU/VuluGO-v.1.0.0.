/**
 * Mobile-Optimized Streaming Interface
 * Responsive streaming UI with gesture controls and overlay management
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  StatusBar,
  Animated,
  PanGestureHandler,
  TapGestureHandler,
  State
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import StreamVideoView from './StreamVideoView';
import StreamChatOverlay from './StreamChatOverlay';
import StreamReactionOverlay from './StreamReactionOverlay';
import StreamControlsOverlay from './StreamControlsOverlay';
import ViewerListOverlay from './ViewerListOverlay';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Discord-inspired color palette
const colors = {
  background: '#0f1117',
  overlay: 'rgba(0, 0, 0, 0.6)',
  accent: '#5865F2',
  text: '#FFFFFF',
  textMuted: '#B9BBBE',
  success: '#3BA55C',
  error: '#ED4245'
};

interface MobileStreamingInterfaceProps {
  streamId: string;
  isHost: boolean;
  onLeave?: () => void;
  onEndStream?: () => void;
  onToggleCamera?: () => void;
  onToggleMicrophone?: () => void;
  onOpenHostControls?: () => void;
}

export default function MobileStreamingInterface({
  streamId,
  isHost,
  onLeave,
  onEndStream,
  onToggleCamera,
  onToggleMicrophone,
  onOpenHostControls
}: MobileStreamingInterfaceProps) {
  const insets = useSafeAreaInsets();
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showOverlays, setShowOverlays] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showViewerList, setShowViewerList] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const chatSlideAnim = useRef(new Animated.Value(screenWidth)).current;
  const viewerListSlideAnim = useRef(new Animated.Value(-screenWidth)).current;
  const controlsTimeout = useRef<NodeJS.Timeout>();

  // Gesture handlers
  const doubleTapRef = useRef<TapGestureHandler>(null);
  const singleTapRef = useRef<TapGestureHandler>(null);

  // Handle orientation changes
  useEffect(() => {
    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      const { orientationInfo } = event;
      setOrientation(
        orientationInfo.orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
        orientationInfo.orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
          ? 'portrait'
          : 'landscape'
      );
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    if (showOverlays) {
      resetControlsTimeout();
    }
  }, [showOverlays]);

  const resetControlsTimeout = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    
    controlsTimeout.current = setTimeout(() => {
      hideOverlays();
    }, 3000); // Hide after 3 seconds
  };

  const showOverlaysWithTimeout = () => {
    setShowOverlays(true);
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start();
    resetControlsTimeout();
  };

  const hideOverlays = () => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setShowOverlays(false);
    });
  };

  // Handle single tap - toggle controls
  const handleSingleTap = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      if (showOverlays) {
        hideOverlays();
      } else {
        showOverlaysWithTimeout();
      }
    }
  };

  // Handle double tap - send heart reaction
  const handleDoubleTap = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      // Send heart reaction at tap position
      const { x, y } = nativeEvent;
      // This would integrate with the reaction service
      console.log('Double tap reaction at:', { x, y });
    }
  };

  // Handle swipe gestures
  const handlePanGesture = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const { translationX, translationY, velocityX } = nativeEvent;
      
      // Swipe right - open chat
      if (translationX > 100 && Math.abs(velocityX) > 500 && !showChat) {
        openChat();
      }
      // Swipe left - open viewer list
      else if (translationX < -100 && Math.abs(velocityX) > 500 && !showViewerList) {
        openViewerList();
      }
      // Swipe down - minimize/leave (portrait only)
      else if (translationY > 100 && orientation === 'portrait') {
        handleLeave();
      }
    }
  };

  // Chat controls
  const openChat = () => {
    setShowChat(true);
    Animated.timing(chatSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const closeChat = () => {
    Animated.timing(chatSlideAnim, {
      toValue: screenWidth,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setShowChat(false);
    });
  };

  // Viewer list controls
  const openViewerList = () => {
    setShowViewerList(true);
    Animated.timing(viewerListSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const closeViewerList = () => {
    Animated.timing(viewerListSlideAnim, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setShowViewerList(false);
    });
  };

  // Handle camera toggle
  const handleCameraToggle = () => {
    setCameraEnabled(!cameraEnabled);
    onToggleCamera?.();
  };

  // Handle microphone toggle
  const handleMicrophoneToggle = () => {
    setMicrophoneEnabled(!microphoneEnabled);
    onToggleMicrophone?.();
  };

  // Handle leave
  const handleLeave = () => {
    if (isHost) {
      // Show end stream confirmation
      onEndStream?.();
    } else {
      onLeave?.();
    }
  };

  const containerStyle = [
    styles.container,
    orientation === 'landscape' && styles.landscapeContainer
  ];

  const videoContainerStyle = [
    styles.videoContainer,
    orientation === 'landscape' && styles.landscapeVideoContainer
  ];

  return (
    <View style={containerStyle}>
      <StatusBar hidden={orientation === 'landscape'} />
      
      {/* Video Stream */}
      <PanGestureHandler onHandlerStateChange={handlePanGesture}>
        <TapGestureHandler
          ref={singleTapRef}
          onHandlerStateChange={handleSingleTap}
          waitFor={doubleTapRef}
        >
          <TapGestureHandler
            ref={doubleTapRef}
            onHandlerStateChange={handleDoubleTap}
            numberOfTaps={2}
          >
            <Animated.View style={videoContainerStyle}>
              <StreamVideoView
                streamId={streamId}
                style={styles.video}
                aspectRatio={orientation === 'landscape' ? 16/9 : 9/16}
              />
              
              {/* Reaction Overlay */}
              <StreamReactionOverlay
                streamId={streamId}
                style={styles.reactionOverlay}
              />
            </Animated.View>
          </TapGestureHandler>
        </TapGestureHandler>
      </PanGestureHandler>

      {/* Top Overlay */}
      {showOverlays && (
        <Animated.View 
          style={[
            styles.topOverlay,
            { 
              opacity: overlayOpacity,
              paddingTop: orientation === 'portrait' ? insets.top : 8
            }
          ]}
        >
          <TouchableOpacity onPress={handleLeave} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.streamInfo}>
            <Text style={styles.streamTitle} numberOfLines={1}>
              Live Stream
            </Text>
            <View style={styles.viewerCount}>
              <Ionicons name="eye" size={16} color={colors.success} />
              <Text style={styles.viewerCountText}>1.2K</Text>
            </View>
          </View>

          {isHost && (
            <TouchableOpacity onPress={onOpenHostControls} style={styles.hostButton}>
              <Ionicons name="settings" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Bottom Controls */}
      {showOverlays && (
        <Animated.View 
          style={[
            styles.bottomControls,
            { 
              opacity: overlayOpacity,
              paddingBottom: orientation === 'portrait' ? insets.bottom + 16 : 16
            }
          ]}
        >
          {/* Left Controls */}
          <View style={styles.leftControls}>
            <TouchableOpacity onPress={openViewerList} style={styles.controlButton}>
              <Ionicons name="people" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Center Controls (Host only) */}
          {isHost && (
            <View style={styles.centerControls}>
              <TouchableOpacity 
                onPress={handleMicrophoneToggle} 
                style={[
                  styles.controlButton,
                  !microphoneEnabled && styles.controlButtonDisabled
                ]}
              >
                <Ionicons 
                  name={microphoneEnabled ? "mic" : "mic-off"} 
                  size={24} 
                  color={microphoneEnabled ? colors.text : colors.error} 
                />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleCameraToggle} 
                style={[
                  styles.controlButton,
                  !cameraEnabled && styles.controlButtonDisabled
                ]}
              >
                <Ionicons 
                  name={cameraEnabled ? "videocam" : "videocam-off"} 
                  size={24} 
                  color={cameraEnabled ? colors.text : colors.error} 
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Right Controls */}
          <View style={styles.rightControls}>
            <TouchableOpacity onPress={openChat} style={styles.controlButton}>
              <Ionicons name="chatbubble" size={24} color={colors.text} />
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>99+</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Chat Overlay */}
      {showChat && (
        <Animated.View 
          style={[
            styles.chatOverlay,
            { transform: [{ translateX: chatSlideAnim }] }
          ]}
        >
          <StreamChatOverlay
            streamId={streamId}
            onClose={closeChat}
            style={styles.chatContent}
          />
        </Animated.View>
      )}

      {/* Viewer List Overlay */}
      {showViewerList && (
        <Animated.View 
          style={[
            styles.viewerListOverlay,
            { transform: [{ translateX: viewerListSlideAnim }] }
          ]}
        >
          <ViewerListOverlay
            streamId={streamId}
            onClose={closeViewerList}
            style={styles.viewerListContent}
          />
        </Animated.View>
      )}

      {/* Gesture Hints (for first-time users) */}
      <View style={styles.gestureHints}>
        <Text style={styles.hintText}>
          Tap to show/hide controls • Double tap for ❤️ • Swipe for chat
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  landscapeContainer: {
    flexDirection: 'row',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  landscapeVideoContainer: {
    width: '100%',
    height: '100%',
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  reactionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.overlay,
  },
  streamInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  streamTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewerCountText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  hostButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.overlay,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
    zIndex: 10,
  },
  leftControls: {
    flexDirection: 'row',
    gap: 12,
  },
  centerControls: {
    flexDirection: 'row',
    gap: 16,
  },
  rightControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(237, 66, 69, 0.3)',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  chatOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: screenWidth * 0.8,
    backgroundColor: colors.background,
    zIndex: 20,
  },
  chatContent: {
    flex: 1,
  },
  viewerListOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: screenWidth * 0.7,
    backgroundColor: colors.background,
    zIndex: 20,
  },
  viewerListContent: {
    flex: 1,
  },
  gestureHints: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    alignItems: 'center',
    opacity: 0.7,
  },
  hintText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    backgroundColor: colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});
