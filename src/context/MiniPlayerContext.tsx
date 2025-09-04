import React, { createContext, useContext, useState, useRef, ReactNode, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MiniPlayerState {
  isVisible: boolean;
  streamId: string | null;
  streamTitle: string;
  viewerCount: string;
  connectionState: 'disconnected' | 'connecting' | 'connected';
}

interface MiniPlayerContextType {
  showMiniPlayer: (streamId: string, title: string, viewerCount: string, connectionState: 'disconnected' | 'connecting' | 'connected') => void;
  hideMiniPlayer: () => void;
  updateMiniPlayer: (title?: string, viewerCount?: string, connectionState?: 'disconnected' | 'connecting' | 'connected') => void;
  setOnExitCallback: (callback: (streamId: string) => Promise<void>) => void;
  isVisible: boolean;
  streamId: string | null;
}

const MiniPlayerContext = createContext<MiniPlayerContextType | undefined>(undefined);

export const useMiniPlayer = () => {
  const context = useContext(MiniPlayerContext);
  if (!context) {
    throw new Error('useMiniPlayer must be used within a MiniPlayerProvider');
  }
  return context;
};

interface MiniPlayerProviderProps {
  children: ReactNode;
}

export const MiniPlayerProvider: React.FC<MiniPlayerProviderProps> = ({ children }) => {
  const router = useRouter();
  const [miniPlayerState, setMiniPlayerState] = useState<MiniPlayerState>({
    isVisible: false,
    streamId: null,
    streamTitle: '',
    viewerCount: '0',
    connectionState: 'disconnected',
  });

  // Callback for handling stream exit
  const onExitCallbackRef = useRef<((streamId: string) => Promise<void>) | null>(null);

  // Animation values for the mini player
  const widgetPan = useRef(new Animated.ValueXY()).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animation cleanup refs
  const fadeInAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const fadeOutAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const snapAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 MiniPlayerProvider unmounting - stopping all animations');

      // Stop all running animations
      if (fadeInAnimationRef.current) {
        fadeInAnimationRef.current.stop();
      }
      if (fadeOutAnimationRef.current) {
        fadeOutAnimationRef.current.stop();
      }
      if (snapAnimationRef.current) {
        snapAnimationRef.current.stop();
      }
    };
  }, []);

  // Pan responder for draggable mini window
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        widgetPan.setOffset({
          x: (widgetPan.x as any)._value,
          y: (widgetPan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: widgetPan.x, dy: widgetPan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        widgetPan.flattenOffset();
        
        // Snap to corners
        let snapX = (widgetPan.x as any)._value;
        let snapY = (widgetPan.y as any)._value;

        // Snap to left or right edge
        if (snapX < screenWidth / 2) {
          snapX = 20; // Left edge
        } else {
          snapX = screenWidth - 160; // Right edge (160 is widget width + margin)
        }

        // Keep within vertical bounds
        if (snapY < 100) snapY = 100;
        if (snapY > screenHeight - 200) snapY = screenHeight - 200;

        // Store animation reference for cleanup
        snapAnimationRef.current = Animated.spring(widgetPan, {
          toValue: { x: snapX, y: snapY },
          useNativeDriver: false,
        });
        snapAnimationRef.current.start();
      },
    })
  ).current;

  const showMiniPlayer = useCallback((streamId: string, title: string, viewerCount: string, connectionState: 'disconnected' | 'connecting' | 'connected') => {
    console.log('🎵 Showing global mini player:', { streamId, title, viewerCount, connectionState });

    setMiniPlayerState({
      isVisible: true,
      streamId,
      streamTitle: title,
      viewerCount,
      connectionState,
    });

    // Set initial position
    widgetPan.setValue({ x: screenWidth - 160, y: screenHeight - 300 });

    // Fade in animation
    fadeInAnimationRef.current = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false, // Must match PanResponder setting
    });
    fadeInAnimationRef.current.start();
  }, [widgetPan, fadeAnim]);

  const hideMiniPlayer = useCallback(() => {
    console.log('🎵 Hiding global mini player');

    fadeOutAnimationRef.current = Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false, // Must match PanResponder setting
    });
    fadeOutAnimationRef.current.start(() => {
      // Use setTimeout to avoid scheduling updates during render
      setTimeout(() => {
        setMiniPlayerState(prev => ({ ...prev, isVisible: false, streamId: null }));
      }, 0);
    });
  }, [fadeAnim]);

  const updateMiniPlayer = useCallback((title?: string, viewerCount?: string, connectionState?: 'disconnected' | 'connecting' | 'connected') => {
    setMiniPlayerState(prev => ({
      ...prev,
      ...(title !== undefined && { streamTitle: title }),
      ...(viewerCount !== undefined && { viewerCount }),
      ...(connectionState !== undefined && { connectionState }),
    }));
  }, []);

  const setOnExitCallback = useCallback((callback: (streamId: string) => Promise<void>) => {
    onExitCallbackRef.current = callback;
  }, []);

  const handleMiniPlayerPress = useCallback(() => {
    if (miniPlayerState.streamId) {
      console.log('🎵 Mini player pressed - returning to live stream');
      router.push({
        pathname: '/livestream',
        params: {
          streamId: miniPlayerState.streamId,
          title: miniPlayerState.streamTitle,
          viewCount: miniPlayerState.viewerCount,
        }
      });
    }
  }, [miniPlayerState.streamId, miniPlayerState.streamTitle, miniPlayerState.viewerCount, router]);

  const handleExitStream = useCallback(async () => {
    console.log('🎵 Exiting live stream from mini player');
    
    // Call the exit callback if available
    if (miniPlayerState.streamId && onExitCallbackRef.current) {
      try {
        console.log('🎵 Calling stream leave callback for mini player exit...');
        await onExitCallbackRef.current(miniPlayerState.streamId);
      } catch (error) {
        console.error('❌ Error during mini player stream exit callback:', error);
      }
    }
    
    // Hide the mini player UI
    hideMiniPlayer();
  }, [hideMiniPlayer, miniPlayerState.streamId]);

  const contextValue: MiniPlayerContextType = {
    showMiniPlayer,
    hideMiniPlayer,
    updateMiniPlayer,
    setOnExitCallback,
    isVisible: miniPlayerState.isVisible,
    streamId: miniPlayerState.streamId,
  };

  return (
    <MiniPlayerContext.Provider value={contextValue}>
      {children}
      
      {/* Global Mini Player Overlay */}
      {miniPlayerState.isVisible && (
        <Animated.View 
          style={[
            styles.miniPlayerOverlay,
            { 
              opacity: fadeAnim,
              transform: [{ translateX: widgetPan.x }, { translateY: widgetPan.y }] 
            }
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity 
            style={styles.miniContent}
            onPress={handleMiniPlayerPress}
            activeOpacity={0.8}
          >
            <Text style={styles.miniTitle} numberOfLines={1}>
              {miniPlayerState.streamTitle}
            </Text>
            <Text style={styles.miniViewers}>
              {miniPlayerState.viewerCount} viewers
            </Text>
            <View style={styles.miniLiveIndicator}>
              <View style={[
                styles.miniLiveDot,
                { backgroundColor: miniPlayerState.connectionState === 'connected' ? '#00ff88' : '#ff4757' }
              ]} />
            </View>
          </TouchableOpacity>
          
          {/* Exit Button */}
          <TouchableOpacity 
            style={styles.miniExitButton}
            onPress={handleExitStream}
          >
            <MaterialIcons name="close" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </MiniPlayerContext.Provider>
  );
};

const styles = StyleSheet.create({
  miniPlayerOverlay: {
    position: 'absolute',
    width: 140,
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 9999, // Ensure it's above all other content
  },
  miniContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  miniTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  miniViewers: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  miniLiveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  miniLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniExitButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
