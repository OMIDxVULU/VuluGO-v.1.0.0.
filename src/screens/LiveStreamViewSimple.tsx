import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserProfile } from '../context/UserProfileContext';
import { useLiveStreams } from '../context/LiveStreamContext';
import { useAuth } from '../context/AuthContext';
import { AgoraStreamView } from '../components/streaming/AgoraStreamView';
import { isAgoraConfigured } from '../config/agoraConfig';
import { permissionService } from '../services/permissionService';
import { useMiniPlayer } from '../context/MiniPlayerContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Chat message interface
interface ChatMessage {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  message: string;
  timestamp: number;
}

const LiveStreamViewSimple = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { getStreamById, leaveStream } = useLiveStreams();
  const { showMiniPlayer, hideMiniPlayer, updateMiniPlayer, setOnExitCallback } = useMiniPlayer();

  // Get stream data
  const streamId = params.streamId as string;
  const stream = getStreamById(streamId);

  // Handle empty/missing titles gracefully with fallback
  const rawTitle = stream ? stream.title : (params.title as string);
  const streamTitle = rawTitle && rawTitle.trim() ? rawTitle.trim() : 'Live Stream';

  const viewCount = stream?.views.toString() || (params.viewCount as string || '0');

  // Format view count
  const formatViewCount = (count: string | number) => {
    const num = typeof count === 'string' ? parseInt(count) : count;
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };
  const displayViewCount = formatViewCount(stream?.views || viewCount);

  // State
  const [agoraConnectionState, setAgoraConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [streamingError, setStreamingError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  
  // Refs
  const chatListRef = useRef<FlatList>(null);

  // Agora configuration
  const isAgoraEnabled = isAgoraConfigured();

  // Initialize permissions on component mount
  useEffect(() => {
    console.log('🔄 LiveStreamViewSimple: Permission initialization useEffect triggered');

    const initPermissions = async () => {
      try {
        console.log('🔄 Initializing permissions for live stream...');

        // Initialize permission service
        await permissionService.initializePermissions();

        // Log storage status for debugging
        const storageStatus = permissionService.getStorageStatus();
        console.log('📱 Permission service status:', storageStatus);

        const hasPermissions = permissionService.hasRequiredPermissions();
        console.log('🎤 Current permission state:', { hasPermissions });

        if (!hasPermissions) {
          console.log('🔄 Requesting microphone permissions...');
          const result = await permissionService.requestPermissions();
          setPermissionsGranted(result.microphone);

          console.log('✅ Permission request result:', result);

          if (!result.microphone) {
            console.log('❌ Microphone permission denied');
            Alert.alert(
              'Permission Required',
              permissionService.handlePermissionDenied('microphone'),
              [{ text: 'OK', onPress: () => router.back() }]
            );
          } else {
            console.log('✅ Microphone permission granted');
          }
        } else {
          console.log('✅ Permissions already granted');
          setPermissionsGranted(true);
        }
      } catch (error) {
        console.error('❌ Permission initialization failed:', error);

        // Don't block the user - allow them to continue with limited functionality
        console.log('🔄 Continuing with default permission state...');
        setPermissionsGranted(true); // Allow continuation for development

        // Show a warning but don't block
        Alert.alert(
          'Permission Setup Warning',
          'There was an issue setting up permissions, but you can continue. Some features may be limited.',
          [{ text: 'Continue' }]
        );
      }
    };

    initPermissions();
  }, []); // Empty dependency array - only run once on mount

  // Set up mini player exit callback
  useEffect(() => {
    const handleMiniPlayerExit = async (streamId: string) => {
      console.log('🎵 Mini player exit callback triggered for stream:', streamId);
      try {
        await leaveStream(streamId);
      } catch (error) {
        console.error('❌ Error leaving stream from mini player:', error);
      }
    };

    setOnExitCallback(handleMiniPlayerExit);
  }, [leaveStream, setOnExitCallback]);

  // Update global mini player when stream data changes
  useEffect(() => {
    console.log('🔄 LiveStreamViewSimple: Mini player update useEffect triggered', {
      isMinimized,
      streamTitle,
      displayViewCount,
      agoraConnectionState,
      timestamp: Date.now()
    });

    if (isMinimized) {
      console.log('🔄 Updating mini player with new data:', { streamTitle, displayViewCount, agoraConnectionState });
      updateMiniPlayer(streamTitle, displayViewCount, agoraConnectionState);
    }
  }, [streamTitle, displayViewCount, agoraConnectionState, isMinimized, updateMiniPlayer]);

  // Hide global mini player when component unmounts (only on unmount, not on every render)
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting - cleaning up mini player');
      hideMiniPlayer();
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Pan responder removed - using global mini player instead

  // Participants (simplified)
  const participants = useMemo(() => {
    if (stream && stream.hosts) {
      return stream.hosts.map((host, index) => ({
        id: index.toString(),
        name: host.name,
        avatar: host.avatar,
        isHost: true,
        isSpeaking: index === 0,
      }));
    }
    return [];
  }, [stream]);

  // Handlers
  const handleAgoraConnectionStateChange = useCallback((state: 'disconnected' | 'connecting' | 'connected') => {
    setAgoraConnectionState(state);
  }, []);

  const handleAgoraError = useCallback((error: string) => {
    setStreamingError(error);
  }, []);

  const toggleMinimize = useCallback(() => {
    const wasMinimized = isMinimized;

    if (!wasMinimized) {
      // Minimizing - show global mini player and navigate to home
      console.log('🏠 Live stream minimized - showing global mini player and navigating to home');

      // Show the global mini player
      showMiniPlayer(
        streamId,
        streamTitle,
        displayViewCount,
        agoraConnectionState
      );

      // Navigate to home page while keeping the live stream running
      try {
        router.push('/(tabs)');
      } catch (error) {
        console.warn('⚠️ Failed to navigate to home page, trying alternative route:', error);
        try {
          router.push('/');
        } catch (fallbackError) {
          console.error('❌ Failed to navigate to home page:', fallbackError);
        }
      }
    } else {
      // Expanding - hide global mini player and show full interface
      console.log('🔄 Expanding live stream - hiding global mini player');
      hideMiniPlayer();
      setIsMinimized(false);
    }
  }, [isMinimized, streamId, streamTitle, displayViewCount, agoraConnectionState, showMiniPlayer, router, hideMiniPlayer]);

  const handleSendMessage = useCallback(() => {
    if (newMessage.trim() && user) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        user: {
          name: user.displayName || 'Anonymous',
          avatar: user.photoURL || 'https://randomuser.me/api/portraits/men/32.jpg',
        },
        message: newMessage.trim(),
        timestamp: Date.now(),
      };

      setChatMessages(prev => [...prev, message]);
      setNewMessage('');

      // Scroll to bottom
      setTimeout(() => {
        chatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [newMessage, user]);

  const handleExitStream = useCallback(() => {
    Alert.alert(
      'Exit Live Stream',
      'Are you sure you want to exit the live stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            setIsMinimized(false);
            hideMiniPlayer(); // Also hide the global mini player
            router.back();
          }
        },
      ]
    );
  }, [hideMiniPlayer, router]);

  // Render chat message
  const renderChatMessage = ({ item }: { item: ChatMessage }) => (
    <View style={styles.chatMessage}>
      <Image source={{ uri: item.user.avatar }} style={styles.chatAvatar} />
      <View style={styles.chatMessageContent}>
        <Text style={styles.chatUserName}>{item.user.name}</Text>
        <Text style={styles.chatMessageText}>{item.message}</Text>
      </View>
    </View>
  );

  if (!permissionsGranted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.permissionContainer}>
          <MaterialIcons name="mic" size={64} color="rgba(255, 255, 255, 0.5)" />
          <Text style={styles.permissionText}>Setting up your live stream...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Main Live Stream Interface */}
      {!isMinimized && (
        <View style={styles.content}>
          {/* Minimize Button - Top Left */}
          <TouchableOpacity style={styles.minimizeButton} onPress={toggleMinimize}>
            <MaterialIcons name="remove" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Agora Audio Stream (Background) */}
          {isAgoraEnabled && user && permissionsGranted && (
            <View style={styles.agoraContainer}>
              <AgoraStreamView
                streamId={streamId}
                userId={user.uid}
                isHost={stream?.hosts.some(host => host.name === user.displayName) || false}
                onConnectionStateChange={handleAgoraConnectionStateChange}
                onParticipantUpdate={() => {}}
                onError={handleAgoraError}
              />
            </View>
          )}

          {/* Top Section - Participants Area */}
          <View style={styles.participantsSection}>
            <View style={styles.participantsGrid}>
              {participants.map((participant) => (
                <View key={participant.id} style={styles.participantItem}>
                  <Image
                    source={{ uri: participant.avatar }}
                    style={styles.participantAvatar}
                  />
                  <Text style={styles.participantName} numberOfLines={1}>
                    {participant.name}
                  </Text>
                  {participant.isHost && (
                    <View style={styles.hostIndicator}>
                      <MaterialIcons name="mic" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Subtle Fade Transition */}
          <LinearGradient
            colors={['rgba(26, 26, 26, 0)', 'rgba(26, 26, 26, 0.3)', 'rgba(26, 26, 26, 1)']}
            style={styles.fadeTransition}
          />

          {/* Bottom Section - Chat Area */}
          <KeyboardAvoidingView
            style={styles.chatSection}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Chat Messages */}
            <FlatList
              ref={chatListRef}
              data={chatMessages}
              renderItem={renderChatMessage}
              keyExtractor={(item) => item.id}
              style={styles.chatList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Chat Input */}
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newMessage}
                onChangeText={setNewMessage}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, newMessage.trim() && styles.sendButtonActive]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <MaterialIcons
                  name="send"
                  size={20}
                  color={newMessage.trim() ? "#FFFFFF" : "rgba(255, 255, 255, 0.3)"}
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

          {/* Live Status Indicator */}
          <View style={styles.liveIndicator}>
            <View style={[
              styles.liveDot,
              { backgroundColor: agoraConnectionState === 'connected' ? '#00ff88' : '#ff4757' }
            ]} />
            <Text style={styles.liveText}>
              {agoraConnectionState === 'connected' ? 'LIVE' : 'CONNECTING...'}
            </Text>
          </View>

          {/* Error Message */}
          {streamingError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{streamingError}</Text>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setStreamingError(null)}
              >
                <MaterialIcons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Local mini window removed - using global mini player instead */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  minimizeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  agoraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Top Section - Participants Area
  participantsSection: {
    flex: 0.6, // Takes up 60% of the screen
    paddingTop: 100, // Space for minimize button
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  participantItem: {
    alignItems: 'center',
    marginBottom: 20,
  },
  participantAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  participantName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 80,
  },
  hostIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  // Subtle Fade Transition
  fadeTransition: {
    height: 60,
    zIndex: 10,
  },
  // Bottom Section - Chat Area
  chatSection: {
    flex: 0.4, // Takes up 40% of the screen
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  chatList: {
    flex: 1,
    marginBottom: 16,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  chatMessageContent: {
    flex: 1,
  },
  chatUserName: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  chatMessageText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  chatInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  // Live Status Indicator
  liveIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 100,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Error Container
  errorContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  errorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  // Picture-in-Picture Mini Window
  miniWindow: {
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

export default LiveStreamViewSimple;
