import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Alert,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserProfile } from '../context/UserProfileContext';
import { useLiveStreams } from '../context/LiveStreamContext';
import { useAuth } from '../context/AuthContext';
import { streamingService } from '../services/streamingService';
import { AgoraStreamView } from '../components/streaming/AgoraStreamView';
import { isAgoraConfigured } from '../config/agoraConfig';
import { permissionService } from '../services/permissionService';

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

// Function to generate unique message IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to format time ago
const timeAgo = (timestamp: number): string => {
  const now = Date.now();
  const secondsAgo = Math.floor((now - timestamp) / 1000);
  
  if (secondsAgo < 60) {
    return `just now`;
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(secondsAgo / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

// Mock chat messages removed - now using real messages from Firebase

interface Participant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isSpeaking: boolean;
  placeholder: boolean;
}

// Shared styles for components outside LiveStreamView
const sharedStyles = StyleSheet.create({
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  mentionText: {
    color: '#6E56F7',
    fontWeight: 'bold',
  },
  replyPreview: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  replyPreviewLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#6E56F7',
    marginRight: 6,
    borderRadius: 1,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6E56F7',
    marginBottom: 2,
  },
  replyPreviewMessage: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageContentContainer: {
    flex: 1,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  messageBubble: {
    backgroundColor: 'rgba(58, 59, 69, 0.5)',
    borderRadius: 12,
    padding: 10,
    maxWidth: '90%',
    alignSelf: 'flex-start',
  },
  highlightedBubble: {
    backgroundColor: 'rgba(110, 86, 247, 0.2)',
  },
  participantItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 12,
    width: BASE_ITEM_SIZE,
  },
  participantSpeakingAnimation: {
    position: 'absolute',
    width: BASE_ITEM_SIZE + 10,
    height: BASE_ITEM_SIZE + 10,
    borderRadius: (BASE_ITEM_SIZE + 10) / 2,
    borderWidth: 2,
    borderColor: '#6E56F7',
    zIndex: -1,
  },
  participantImageWrapper: {
    width: BASE_ITEM_SIZE,
    height: BASE_ITEM_SIZE,
    borderRadius: BASE_ITEM_SIZE / 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  participantGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantCatIcon: {
    width: BASE_ITEM_SIZE * 0.6,
    height: BASE_ITEM_SIZE * 0.6,
  },
  participantImg: {
    width: '100%',
    height: '100%',
  },
  participantLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  speakingIndicatorSmall: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

// Helper to parse mentions and text
const parseMessage = (message: string) => {
  const parts = [];
  let lastIndex = 0;
  const mentionRegex = /(@\w+)/g;
  let match;

  while ((match = mentionRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: message.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'mention', content: match[0] });
    lastIndex = mentionRegex.lastIndex;
  }

  if (lastIndex < message.length) {
    parts.push({ type: 'text', content: message.substring(lastIndex) });
  }

  return parts;
};

// Update the message rendering to highlight mentions
const MessageText = ({ text }: { text: string }) => {
  // Parse message to identify mentions
  const parts = parseMessage(text);
  
  return (
    <Text style={sharedStyles.messageText}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <Text 
              key={index} 
              style={sharedStyles.mentionText}
              onPress={() => {
                // Could add action when a mention is tapped
                console.log('Mention tapped:', part.content);
              }}
            >
              {part.content}
            </Text>
          );
        }
        return <Text key={index}>{part.content}</Text>;
      })}
    </Text>
  );
};

// Update the ChatMessageItem component to use sharedStyles
const ChatMessageItem = React.memo(({
  message,
  onReply,
  onScrollToMessage,
  isHighlighted
}: {
  message: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onScrollToMessage: (messageId: string) => void;
  isHighlighted?: boolean;
}) => {
  // Add long press handler
  const handleLongPress = () => {
    onReply(message);
  };

  // Render reply preview if message is a reply
  const renderReplyPreview = () => {
    if (!message.replyTo) return null;
    
    return (
      <TouchableOpacity 
        style={sharedStyles.replyPreview}
        onPress={() => onScrollToMessage(message.replyTo!.id)}
      >
        <View style={sharedStyles.replyPreviewLine} />
        <View style={sharedStyles.replyPreviewContent}>
          <Text style={sharedStyles.replyPreviewName}>
            {message.replyTo.userName}
          </Text>
          <Text style={sharedStyles.replyPreviewMessage} numberOfLines={1}>
            {message.replyTo.message}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={sharedStyles.messageContainer}>
      {/* Show avatar for all messages */}
      <View style={sharedStyles.avatarContainer}>
        <Image source={{ uri: message.user.avatar }} style={sharedStyles.avatarImage} />
      </View>
      
      <View style={sharedStyles.messageContentContainer}>
        {/* Show name for all messages */}
        <Text style={sharedStyles.messageSender}>{message.user.name}</Text>
        
        {/* Reply preview if this is a reply */}
        {message.replyTo && renderReplyPreview()}
        
        {/* Message bubble - with long press for reply */}
        <TouchableOpacity 
          style={[
            sharedStyles.messageBubble,
            isHighlighted && sharedStyles.highlightedBubble
          ]}
          onLongPress={handleLongPress}
          delayLongPress={200} // Shorter delay for more responsiveness
        >
          <MessageText text={message.message} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Update ParticipantItem component to use sharedStyles
const ParticipantItem = React.memo(({
  participant,
  animationRef,
  onToggleSpeaking
}: {
  participant: Participant,
  animationRef: Animated.Value,
  onToggleSpeaking: (userId: string, isSpeaking: boolean) => void
}) => {
  return (
    <View style={sharedStyles.participantItem}>
      {/* Speaking animation */}
      {participant.isSpeaking && (
        <Animated.View 
          style={[
            sharedStyles.participantSpeakingAnimation,
            {
              opacity: animationRef,
              transform: [
                {
                  scale: animationRef.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2]
                  })
                }
              ]
            }
          ]}
        />
      )}
      
      <View style={sharedStyles.participantImageWrapper}>
        {/* Speaking indicator for hosts */}
        {participant.isHost && (
          <TouchableOpacity
            style={sharedStyles.speakingIndicatorSmall}
            onPress={() => onToggleSpeaking(participant.id, !participant.isSpeaking)}
          >
            <MaterialIcons
              name={participant.isSpeaking ? "mic" : "mic-off"}
              size={12}
              color={participant.isSpeaking ? "#4CAF50" : "#FF5722"}
            />
          </TouchableOpacity>
        )}

        {participant.placeholder ? (
          <LinearGradient
            colors={['#FF6CAA', '#FF3C8C']} 
            style={sharedStyles.participantGradient}
          >
            <Image
              source={{ uri: participant.avatar }}
              style={sharedStyles.participantCatIcon} 
              resizeMode="contain"
            />
          </LinearGradient>
        ) : (
          <Image
            source={{ uri: participant.avatar }}
            style={sharedStyles.participantImg}
          />
        )}
      </View>
      <Text style={sharedStyles.participantLabel}>
        {participant.name}
      </Text>
    </View>
  );
});

// Define MemoizedChatMessages component for optimized rendering
const MemoizedChatMessages = React.memo(({ 
  messages, 
  onReply, 
  onScrollToMessage, 
  highlightedId 
}: { 
  messages: ChatMessage[], 
  onReply: (message: ChatMessage) => void,
  onScrollToMessage: (messageId: string) => void,
  highlightedId?: string
}) => {
  // Memoize the keyExtractor function
  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);
  
  // Memoize the renderItem function
  const renderItem = useCallback(({ item }: { item: ChatMessage }) => (
    <ChatMessageItem
      message={item}
      onReply={onReply}
      onScrollToMessage={onScrollToMessage}
      isHighlighted={item.id === highlightedId}
    />
  ), [onReply, onScrollToMessage, highlightedId]);
  
  return (
    <FlatList
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 16 }}
      initialNumToRender={10}
      maxToRenderPerBatch={5}
      windowSize={10}
      removeClippedSubviews={true} // Important for memory optimization
    />
  );
});

const LiveStreamView = () => {
  // Add loop protection
  useLoopProtection();
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profileImage } = useUserProfile();
  const { getStreamById, streams, currentlyWatching, isMinimized: contextIsMinimized, setStreamMinimized, leaveStreamWithConfirmation, leaveStream } = useLiveStreams();
  const { user } = useAuth();

  // Handle leaving stream with proper confirmation for hosts
  const handleLeaveStream = async () => {
    try {
      const userId = user?.uid || 'guest';
      console.log(`🔍 [LIVESTREAM] User ${userId} attempting to leave stream ${streamId}`);

      // Check if user is host
      const isHost = await streamingService.isUserStreamHost(streamId, userId);
      console.log(`🔍 [LIVESTREAM] User ${userId} is host: ${isHost}`);

      if (!isHost) {
        // Regular viewer - leave immediately and clear state before navigation
        console.log('🔄 [LIVESTREAM] Regular viewer leaving stream, clearing state immediately');
        await leaveStream(streamId);
        router.back();
        return;
      }

      // For hosts, use confirmation dialog (Yubo-style)
      console.log('🔄 [LIVESTREAM] Host leaving stream, showing confirmation dialog');
      await leaveStreamWithConfirmation(streamId);

      // Only navigate back if the user actually left (not cancelled)
      console.log('✅ [LIVESTREAM] Host successfully left stream, navigating back');
      router.back();

    } catch (error: any) {
      // Don't navigate back if user cancelled
      if (error && error.message === 'User cancelled') {
        console.log('🚫 [LIVESTREAM] User cancelled leaving stream, staying on screen');
        return; // Stay on the stream screen
      }

      console.error('❌ [LIVESTREAM] Error leaving stream:', error);
      // Still navigate back on actual error to prevent user from being stuck
      router.back();
    }
  };
  
  // Use streamId from params to fetch the actual stream data from context
  const streamId = params.streamId as string;
  const stream = getStreamById(streamId);
  
  // Get stream data from context or URL params
  const rawTitle = stream ? stream.title : (params.title as string);
  const streamTitle = (rawTitle && rawTitle.trim()) ? rawTitle.trim() : 'Live Stream';
  const hostName = stream?.hosts[0]?.name || (params.hostName as string || 'Host');
  const hostAvatar = stream?.hosts[0]?.avatar || (params.hostAvatar as string || '');
  const viewCount = stream?.views.toString() || (params.viewCount as string || '0');
  const formatViewCount = (count: string | number) => {
    const num = typeof count === 'string' ? parseInt(count) : count;
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };
  const displayViewCount = formatViewCount(stream?.views || viewCount);
  const boosts = stream?.boost || 0;
  const rank = stream?.rank || 0;

  // Get host count from actual stream data
  const hostCount = stream?.hosts.length || 0;

  // TODO: Get profile views from user profile context when implemented
  const profileViews = 0; // Remove hardcoded value

  const userProfileImage = profileImage || '';
  
  // Convert stream hosts to participants
  const initializeParticipants = () => {
    if (stream && stream.hosts) {
      return stream.hosts.map((host, index) => ({
        id: index.toString(),
        name: host.name,
        avatar: host.avatar,
        isHost: true,
        isSpeaking: index === 0, // First host is speaking by default
        placeholder: false
      }));
    }
    // Return empty array - real participants will be loaded from Firebase
    return [];
  };

  // State variables
  const [participants, setParticipants] = useState<Participant[]>(initializeParticipants());
  const [currentStreamSession, setCurrentStreamSession] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Agora streaming state
  const [isAgoraEnabled, setIsAgoraEnabled] = useState(isAgoraConfigured());
  const [agoraConnectionState, setAgoraConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [streamingError, setStreamingError] = useState<string | null>(null);

  // Set up real-time stream updates and chat messages
  useEffect(() => {
    if (!streamId) return;

    let streamUnsubscribe: (() => void) | null = null;
    let chatUnsubscribe: (() => void) | null = null;

    const setupListeners = async () => {
      // Set up real-time listener for stream updates (participants)
      streamUnsubscribe = streamingService.onStreamUpdate(streamId, (session) => {
        setCurrentStreamSession(session);

        // Update participants in real-time
        if (session.participants) {
          const updatedParticipants = session.participants.map((participant: StreamParticipant, index: number) => ({
            id: participant.id,
            name: participant.name,
            avatar: participant.avatar,
            isHost: participant.isHost,
            isSpeaking: participant.isSpeaking,
            placeholder: false
          }));
          setParticipants(updatedParticipants);
        }
      });

      // Load initial chat messages
      try {
        const messages = await firestoreService.getStreamMessages(streamId, 50);
        // Convert Firebase messages to component format
        const formattedMessages = messages.map(msg => ({
          id: msg.id,
          user: {
            name: msg.senderName,
            avatar: msg.senderAvatar || userProfileImage,
            isAdmin: msg.isAdmin || false
          },
          message: msg.text,
          timestamp: msg.timestamp?.toMillis() || Date.now(),
          replyTo: msg.replyTo ? {
            id: msg.replyTo.id,
            userName: msg.replyTo.userName,
            message: msg.replyTo.message
          } : undefined
        }));
        setChatMessages(formattedMessages.reverse()); // Reverse to show oldest first
      } catch (error) {
        console.error('Error loading initial chat messages:', error);
        setChatMessages([]); // Fallback to empty array
      }

      // Set up real-time listener for chat messages
      chatUnsubscribe = firestoreService.onStreamMessages(streamId, (messages) => {
        // Convert Firebase messages to component format
        const formattedMessages = messages.map(msg => ({
          id: msg.id,
          user: {
            name: msg.senderName,
            avatar: msg.senderAvatar || userProfileImage,
            isAdmin: msg.isAdmin || false
          },
          message: msg.text,
          timestamp: msg.timestamp?.toMillis() || Date.now(),
          replyTo: msg.replyTo ? {
            id: msg.replyTo.id,
            userName: msg.replyTo.userName,
            message: msg.replyTo.message
          } : undefined
        }));
        setChatMessages(formattedMessages);
      });
    };

    setupListeners();

    return () => {
      if (streamUnsubscribe) streamUnsubscribe();
      if (chatUnsubscribe) chatUnsubscribe();
    };
  }, [streamId, userProfileImage]);

  // Update participant speaking status in real-time
  const updateParticipantSpeaking = useCallback(async (userId: string, isSpeaking: boolean) => {
    if (!streamId) return;

    try {
      await streamingService.updateParticipantSpeaking(streamId, userId, isSpeaking);
    } catch (error) {
      console.error('Error updating speaking status:', error);
    }
  }, [streamId]);

  // Update speaking animation refs when participants change
  useEffect(() => {
    // Ensure we have the right number of animation refs for current participants
    const currentLength = speakingAnimationRefs.current.length;
    const requiredLength = participants.length;

    if (currentLength < requiredLength) {
      // Add new animation refs for new participants
      const newRefs = Array(requiredLength - currentLength)
        .fill(null)
        .map(() => new Animated.Value(0));
      speakingAnimationRefs.current = [...speakingAnimationRefs.current, ...newRefs];
    } else if (currentLength > requiredLength) {
      // Remove excess animation refs
      speakingAnimationRefs.current = speakingAnimationRefs.current.slice(0, requiredLength);
    }
  }, [participants]);

  const [messageText, setMessageText] = useState('');
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(false);
  
  // Add reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  // Animation refs - ALL using useNativeDriver: false to avoid conflicts
  const infoPanelFadeAnim = useRef(new Animated.Value(0)).current; // Start invisible
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const minimizeAnim = useRef(new Animated.Value(1)).current;
  
  // Speaking animation refs - initialize with empty array, will be updated when participants change
  const speakingAnimationRefs = useRef<Animated.Value[]>([]);
  
  // Add new state variables for mention suggestions
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [filteredMentions, setFilteredMentions] = useState<Participant[]>([]);
  
  // Add reference for chat list
  const chatListRef = useRef<FlatList>(null);
  
  // Add slide value state
  const [currentSlideValue, setCurrentSlideValue] = useState(screenWidth);
  
  // Add mention animation ref
  const mentionAnimRef = useRef(new Animated.Value(0)).current;
  
  // Add new state variables for minimized widget
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const widgetPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  
  // Add the isDragging state
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Add a proper type for the position reference
  type Position = { x: number; y: number };
  
  const currentPanPosition = useRef<Position>({ x: 0, y: 0 });

  // Calculate widget size based on number of hosts
  const calculateWidgetSize = (hostCount: number) => {
    if (hostCount <= 1) {
      return { size: MIN_WIDGET_SIZE, columns: 1, rows: 1 };
    } else if (hostCount <= 4) {
      return { size: MIN_WIDGET_SIZE + 20, columns: 2, rows: 2 };
    } else {
      return { size: MAX_WIDGET_SIZE, columns: 3, rows: 3 };
    }
  };

  // Toggle minimize function
  const toggleMinimize = () => {
    if (isMinimized) {
      // Expand
      setIsMinimized(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(minimizeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Minimize
      setIsMinimized(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(minimizeAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
    setStreamMinimized(streamId, !isMinimized);
  };

  // Toggle info panel
  const toggleInfoPanel = () => {
    console.log('toggleInfoPanel called, current state:', isInfoPanelVisible);
    if (isInfoPanelVisible) {
      console.log('Closing panel...');
      Animated.timing(infoPanelFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setIsInfoPanelVisible(false);
      });
    } else {
      console.log('Opening panel...');
      setIsInfoPanelVisible(true);
      // Small delay to ensure the panel is rendered before animating
      setTimeout(() => {
        Animated.timing(infoPanelFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }, 50);
    }
  };

     // Info panel pan responder - FIXED to use consistent useNativeDriver: false
   const infoPanelPanResponder = useMemo(() => PanResponder.create({
     onStartShouldSetPanResponder: () => true,
     onMoveShouldSetPanResponder: (_, gestureState) => {
       return Math.abs(gestureState.dx) > 10;
     },
     onPanResponderMove: (_, gestureState) => {
       if (isInfoPanelVisible) {
         // When panel is visible, allow dragging to close
         const opacity = Math.max(0, Math.min(1, 1 - (gestureState.dx / 100)));
         infoPanelFadeAnim.setValue(opacity);
       }
     },
     onPanResponderRelease: (_, gestureState) => {
       if (gestureState.dx > 100) {
         // Swipe right - close panel
         Animated.timing(infoPanelFadeAnim, {
           toValue: 0,
           duration: 200,
           useNativeDriver: false,
         }).start(() => {
           setIsInfoPanelVisible(false);
         });
       } else {
         // Snap back
         Animated.spring(infoPanelFadeAnim, {
           toValue: 1,
           useNativeDriver: false,
           friction: 7,
         }).start();
       }
     },
   }), [isInfoPanelVisible, infoPanelFadeAnim]);

     // Widget pan responder for minimized mode - FIXED to use consistent useNativeDriver: false
   const widgetPanResponder = useMemo(() => PanResponder.create({
     onStartShouldSetPanResponder: () => true,
     onPanResponderMove: (_, gestureState) => {
       const currentX = currentPanPosition.current?.x || 0;
       const currentY = currentPanPosition.current?.y || 0;
       
       const newX = currentX + gestureState.dx;
       const newY = currentY + gestureState.dy;
       
       currentPanPosition.current = { x: newX, y: newY };
       
       widgetPan.setValue({
         x: newX,
         y: newY,
       });
     },
     onPanResponderRelease: (_, gestureState) => {
       setIsDragging(false);
       
       const positionX = currentPanPosition.current?.x || 0;
       const positionY = currentPanPosition.current?.y || 0;
       
       const visibleHostCount = Math.min(
         participants.filter(p => p.isHost).length,
         MAX_HOSTS_TO_DISPLAY
       );
       
       const widgetSize = calculateWidgetSize(visibleHostCount);
       const size = widgetSize.size || 0;
       const maxX = Dimensions.get('window').width - size;
       const maxY = Dimensions.get('window').height - size;
       
       const targetX = positionX > maxX / 2 ? maxX : 0;
       const targetY = Math.max(0, Math.min(positionY, maxY));
       
       currentPanPosition.current = { x: targetX, y: targetY };
       
       Animated.spring(widgetPan, {
         toValue: { x: targetX, y: targetY },
         useNativeDriver: false,
         friction: 7,
       }).start();
     },
   }), [participants]);

  // Define closeWidget before renderMinimizedView uses it
  const closeWidget = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start(() => {
      setIsMinimized(false);
      setIsHidden(true);
      setStreamMinimized(streamId, false);
      
      setTimeout(() => {
        setIsHidden(false);
        Animated.parallel([
          Animated.spring(minimizeAnim, {
            toValue: 1,
            useNativeDriver: false,
            friction: 6,
            tension: 50
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          })
        ]).start();
      }, 100);
    });
  }, [streamId, setStreamMinimized]);

  // Define handleReplyToMessage (add basic implementation if missing)
  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyingTo(message);
    // Optional: Add haptic feedback
    if (Platform.OS === 'ios' && require('expo-haptics')) {
        try {
          const Haptics = require('expo-haptics');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (error) {
          console.log('Haptics not available');
        }
    }
  };  

  // Define cancelReply if used in renderChat
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Define scrollToMessage if used in renderChat
  const scrollToMessage = (messageId: string) => {
    // Implementation depends on how chat messages are rendered (e.g., FlatList or ScrollView)
    console.log("Scroll to message:", messageId); // Placeholder
  };
  
  // Define message handling functions before they are used
  const handleMessageChange = (text: string) => {
    setMessageText(text);
    // Add mention detection logic if needed
    const matches = text.match(/@(\w*)$/);
    if (matches) {
        const query = matches[1].toLowerCase();
        setMentionQuery(query);
        const filtered = participants.filter(p => 
            p.name.toLowerCase().includes(query)
        ).slice(0, 5); 
        setFilteredMentions(filtered);
    } else {
        setMentionQuery(null);
        setFilteredMentions([]);
    }
  };

  const handleSendMessage = async () => {
    if (messageText.trim() === '' || !streamId) return;

    // Guard against no authenticated user
    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    try {
      // Use actual authenticated user from auth context
      const currentUser = user;

      // Ensure displayName and photoURL have safe fallbacks
      const displayName = currentUser.displayName || 'Anonymous';
      const photoURL = currentUser.photoURL || userProfileImage;

      const messageData = {
        text: messageText,
        senderId: currentUser.uid,
        senderName: displayName,
        senderAvatar: photoURL,
        isAdmin: false,
        ...(replyingTo && {
          replyTo: {
            id: replyingTo.id,
            userName: replyingTo.user.name,
            message: replyingTo.message.substring(0, 30)
          }
        })
      };

      // Send message to Firebase
      await firestoreService.sendMessage(streamId, messageData);

      // Clear input and reply state
      setMessageText('');
      setReplyingTo(null);

      // Scroll to end will happen automatically due to real-time listener
    } catch (error) {
      console.error('Error sending message:', error);
      // Could show an error message to the user here
    }
  };

  const selectMention = (participant: Participant) => {
    const currentText = messageText;
    const atIndex = currentText.lastIndexOf('@');
    if (atIndex !== -1) {
      const newText = currentText.substring(0, atIndex) + `@${participant.name} `;
      setMessageText(newText);
    }
    setMentionQuery(null);
    setFilteredMentions([]);
    // Add animation/haptics if needed
  };

  // Move the useEffect hook from renderMinimizedView to the component level
  useEffect(() => {
    if (isMinimized) {
      const hosts = participants.filter(p => p.isHost).slice(0, MAX_HOSTS_TO_DISPLAY);
      const numHosts = hosts.length;
      const { size: initialSize } = calculateWidgetSize(numHosts);
      
      if (!widgetPan.x.hasListeners()) {
        widgetPan.setValue({ x: initialSize * 0.5, y: screenHeight - initialSize - 120 }); // Center it
      }
    }
  }, [isMinimized, participants, widgetPan, calculateWidgetSize, screenHeight]);

  // Render the minimized draggable widget with dynamic sizing
  const renderMinimizedView = () => {
    const hosts = participants.filter(p => p.isHost).slice(0, MAX_HOSTS_TO_DISPLAY);
    const numHosts = hosts.length;
    
    // Calculate widget dimensions
    const { size: widgetSize } = calculateWidgetSize(numHosts);
    
    // Determine grid layout
    let columns = 1;
    let rows = 1;
    
    if (numHosts <= 1) {
      columns = rows = 1;
    } else if (numHosts <= 4) {
      columns = rows = 2;
    } else {
      columns = rows = 3;
    }
    
    // Calculate item size based on the final widget size, ensuring there's proper spacing
    const availableSpace = widgetSize - (OUTER_PADDING * 2) - ((columns - 1) * GRID_GAP);
    const itemSize = Math.floor(availableSpace / columns);
    
    return (
      <>
        <View style={[styles.hostGridContainer, { padding: OUTER_PADDING }]}>
          {hosts.map((host) => (
            <View key={host.id} style={[styles.hostGridItem, { 
              width: itemSize, 
              height: itemSize,
              margin: 0, // Remove margin as we're using GRID_GAP between items
             }]}>
              {host.placeholder ? (
                <LinearGradient colors={['#FF6CAA', '#FF3C8C']} style={styles.hostGridImage}>
                  <Image 
                    source={{ uri: host.avatar }} 
                    style={styles.hostGridPlaceholderIcon} 
                    resizeMode="contain" 
                  />
                </LinearGradient>
              ) : (
                <Image 
                  source={{ uri: host.avatar }} 
                  style={styles.hostGridImage} 
                  resizeMode="cover" 
                />
              )}
              {host.isSpeaking && <View style={styles.miniSpeakingIndicator} />} 
            </View>
          ))}
        </View>
        <TouchableOpacity 
          style={styles.miniCloseButton} 
          onPress={closeWidget} 
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <MaterialIcons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </>
    );
  };

  // Update the renderChat function to use the memoized component
  const renderChat = () => {
    return (
      <View style={styles.chatContainer}>
        <View style={styles.chatHeaderContainer}>
          <Text style={styles.chatHeaderText}>Chat</Text>
          {/* ... rest of chat header ... */}
        </View>
        
        <MemoizedChatMessages
          messages={chatMessages}
          onReply={handleReplyToMessage}
          onScrollToMessage={scrollToMessage}
          highlightedId={replyingTo?.id}
        />
        
        {/* ... rest of chat UI ... */}
      </View>
    );
  };

  // --- Render Functions --- 

  const renderTopBar = () => {
    return (
      <View style={styles.topBarOuterContainer}>
        <View style={styles.topBarContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleLeaveStream}
          >
            <MaterialIcons name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={['#6E56F7', '#f25899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBarFill,
                { width: `${stream?.rank ? 100 : ROOM_STATS.progress}%` }
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }} numberOfLines={1} ellipsizeMode="tail">
                {streamTitle}
              </Text>
              <Ionicons name="rocket" size={16} color="#FFFFFF" style={styles.rocketIcon} />
              <View style={styles.arrowsContainer}>
                <MaterialIcons name="arrow-drop-up" size={20} color="#FFFFFF" style={styles.arrowIcon} />
                <MaterialIcons name="arrow-drop-up" size={20} color="#FFFFFF" style={styles.arrowIcon} />
                <MaterialIcons name="arrow-drop-up" size={20} color="#FFFFFF" style={styles.arrowIcon} />
              </View>
            </LinearGradient>
          </View>

          {/* Minimize button */}
          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={toggleMinimize}
          >
            <MaterialIcons name="minimize" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderStatsBar = () => {
    return (
      <View style={styles.statsContainer}>
        <View style={styles.boostContainer}>
          {rank && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`}</Text>
            </View>
          )}
          <View style={styles.boostBadge}>
            <FontAwesome5 name="rocket" size={16} color="#6E56F7" />
            <Text style={styles.boostCount}>{boosts}</Text>
          </View>
        </View>
        
        <View style={styles.rightStatsContainer}>
          {/* Single Viewer Count Button */}
          <TouchableOpacity 
            style={styles.infoStatBadge}
            onPress={() => {
              console.log('Button pressed!');
              toggleInfoPanel();
            }}
            activeOpacity={0.5}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="people-outline" size={18} color="#FFFFFF" />
            <Text style={styles.statText}>{displayViewCount}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Agora event handlers
  const handleAgoraConnectionStateChange = useCallback((connected: boolean) => {
    setAgoraConnectionState(connected ? 'connected' : 'disconnected');
    if (connected) {
      setStreamingError(null);
    }
  }, []);

  const handleAgoraParticipantUpdate = useCallback((agoraParticipants: any[]) => {
    // Update participants with Agora data
    console.log('🔄 Agora participants updated:', agoraParticipants);
  }, []);

  const handleAgoraError = useCallback((error: string) => {
    console.error('❌ Agora error:', error);
    setStreamingError(error);
    setAgoraConnectionState('disconnected');
  }, []);

  const renderParticipantsGrid = useCallback(() => (
    <View style={styles.gridContainer}>
      {participants.map((participant, index) => (
        <ParticipantItem
          key={participant.id}
          participant={participant}
          animationRef={speakingAnimationRefs.current[index]}
          onToggleSpeaking={updateParticipantSpeaking}
        />
      ))}
    </View>
  ), [participants, updateParticipantSpeaking]);

  // COMBINED INFO PANEL - All information in one view, no tabs
  const renderInfoPanel = () => {
    return (
      <Animated.View 
        style={[styles.infoPanel, { opacity: infoPanelFadeAnim }]}
        {...infoPanelPanResponder.panHandlers}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.infoPanelHeader}>
            <Text style={styles.infoPanelTitle}>Stream Details</Text>
            <TouchableOpacity onPress={toggleInfoPanel}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.infoPanelContent} showsVerticalScrollIndicator={false}>
            {/* Stream Information Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>{streamTitle}</Text>
            </View>

            {/* Hosts Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionHeader}>Hosts ({participants.filter(p => p.isHost).length})</Text>
              {participants.filter(p => p.isHost).map(host => (
                <View key={host.id} style={styles.participantRow}>
                  <Image source={{ uri: host.avatar }} style={styles.participantAvatar} />
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantRowName}>{host.name}</Text>
                    {host.isSpeaking && (
                      <View style={styles.speakingIndicatorSmall}>
                        <MaterialIcons name="mic" size={12} color="#4CAF50" />
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Viewers Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionHeader}>Viewers ({participants.filter(p => !p.isHost).length})</Text>
              {participants.filter(p => !p.isHost).map(viewer => (
                <View key={viewer.id} style={styles.participantRow}>
                  <Image source={{ uri: viewer.avatar }} style={styles.participantAvatar} />
                  <Text style={styles.participantRowName}>{viewer.name}</Text>
                </View>
              ))}
            </View>

            {/* Actions Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionHeader}>Actions</Text>
              
              {/* Invite Friends Button */}
              <TouchableOpacity style={styles.actionButton}>
                <View style={styles.actionButtonContent}>
                  <Ionicons name="person-add-outline" size={20} color="#6E56F7" />
                  <Text style={styles.actionButtonText}>Invite Friends</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#AAAAAA" />
              </TouchableOpacity>
              
              {/* Settings Button */}
              <TouchableOpacity style={styles.actionButton}>
                <View style={styles.actionButtonContent}>
                  <Ionicons name="settings-outline" size={20} color="#6E56F7" />
                  <Text style={styles.actionButtonText}>Stream Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#AAAAAA" />
              </TouchableOpacity>
              
              {/* Report Button */}
              <TouchableOpacity style={styles.reportButton}>
                <View style={styles.reportButtonContent}>
                  <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.reportButtonText}>Report Stream</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    );
  };

  // Enhance mention suggestions with animation and hover states
  const renderMentionSuggestions = () => {
    // Remove early return
    return (
      <Animated.View 
        style={[
          styles.mentionSuggestionsContainer,
          {
            transform: [
              {
                translateY: mentionAnimRef.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5]
                })
              }
            ]
          }
        ]}
      >
        <View style={styles.mentionSuggestionsHeader}>
          <Text style={styles.mentionSuggestionsTitle}>Suggestions</Text>
          {mentionQuery && (
            <Text style={styles.mentionQueryText}>@{mentionQuery}</Text>
          )}
        </View>
        
        {filteredMentions.length === 0 && mentionQuery && mentionQuery.length > 0 ? (
          <View style={styles.noMentionsContainer}>
            <Text style={styles.noMentionsText}>No users found matching "@{mentionQuery}"</Text>
          </View>
        ) : (
          filteredMentions.map((participant, index) => (
            <TouchableOpacity 
              key={participant.id} 
              style={[
                styles.mentionSuggestion,
                index === 0 && styles.mentionSuggestionFirst,
                index === filteredMentions.length - 1 && styles.mentionSuggestionLast
              ]}
              onPress={() => selectMention(participant)}
              activeOpacity={0.7}
            >
              <Image 
                source={{ uri: participant.avatar }} 
                style={styles.mentionAvatar} 
              />
              <View style={styles.mentionContent}>
                <Text style={styles.mentionName}>
                  {participant.name.split(new RegExp(`(${mentionQuery})`, 'i')).map((part, i) => 
                    part.toLowerCase() === mentionQuery?.toLowerCase() ? 
                      <Text key={i} style={styles.mentionHighlight}>{part}</Text> : 
                      <Text key={i}>{part}</Text>
                  )}
                </Text>
                {participant.isHost && (
                  <View style={styles.hostBadge}>
                    <Text style={styles.hostText}>HOST</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </Animated.View>
    );
  };

  // --- Simple Render Functions (keeping only what we need) ---



  const renderInteractiveBottomPanel = () => {
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const reactionEmojis = ['❤️', '😍', '🔥', '👏', '😂', '😮', '💯', '🎉'];

    const handleReactionPress = (emoji: string) => {
      // Add floating reaction animation
      const floatingReactionsRef = useRef<any>();
      if (floatingReactionsRef.current) {
        floatingReactionsRef.current.addFloatingReaction(emoji);
      }
      setShowReactionPicker(false);
    };

    return (
      <>
        <BlurView intensity={40} style={styles.interactiveBottomPanel}>
          <TouchableOpacity
            style={[styles.reactionButton, showReactionPicker && styles.activeReactionButton]}
            onPress={() => setShowReactionPicker(!showReactionPicker)}
          >
            <MaterialIcons name="favorite" size={24} color="#FF6B9D" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.giftButton}>
            <MaterialIcons name="card-giftcard" size={24} color="#FFD700" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatToggleButton}
            onPress={() => {/* Toggle chat visibility */}}
          >
            <MaterialIcons name="chat" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreOptionsButton}>
            <MaterialIcons name="more-horiz" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </BlurView>

        {/* Reaction Picker */}
        {showReactionPicker && (
          <BlurView intensity={60} style={styles.reactionPicker}>
            <View style={styles.reactionGrid}>
              {reactionEmojis.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.reactionOption}
                  onPress={() => handleReactionPress(emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
        )}
      </>
    );
  };

  const renderModernChat = () => {
    const [isChatVisible, setIsChatVisible] = useState(true);
    const [newMessage, setNewMessage] = useState('');

    const handleSendMessage = () => {
      if (newMessage.trim() && user) {
        const message: ChatMessage = {
          id: generateId(),
          user: {
            name: user.displayName || 'Anonymous',
            avatar: user.photoURL || 'https://randomuser.me/api/portraits/men/32.jpg',
          },
          message: newMessage.trim(),
          timestamp: Date.now(),
          replyTo: replyingTo ? {
            id: replyingTo.id,
            userName: replyingTo.user.name,
            message: replyingTo.message
          } : undefined
        };

        setChatMessages(prev => [...prev, message]);
        setNewMessage('');
        setReplyingTo(null);
      }
    };

    if (!isChatVisible) return null;

    return (
      <View style={styles.modernChatContainer}>
        <BlurView intensity={30} style={styles.modernChatBlur}>
          <View style={styles.modernChatHeader}>
            <Text style={styles.modernChatTitle}>Live Chat</Text>
            <View style={styles.chatHeaderActions}>
              <TouchableOpacity style={styles.chatActionButton}>
                <MaterialIcons name="emoji-emotions" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chatActionButton}
                onPress={() => setIsChatVisible(false)}
              >
                <MaterialIcons name="keyboard-arrow-down" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modernChatContent}>
            <MemoizedChatMessages
              messages={chatMessages}
              onReply={handleReplyToMessage}
              onScrollToMessage={scrollToMessage}
              highlightedId={replyingTo?.id}
            />
          </View>

          {/* Modern Chat Input */}
          <View style={styles.modernChatInputContainer}>
            {replyingTo && (
              <View style={styles.replyPreviewContainer}>
                <View style={styles.replyPreviewLine} />
                <View style={styles.replyPreviewContent}>
                  <Text style={styles.replyPreviewName}>{replyingTo.user.name}</Text>
                  <Text style={styles.replyPreviewMessage} numberOfLines={1}>
                    {replyingTo.message}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelReplyButton}
                  onPress={() => setReplyingTo(null)}
                >
                  <MaterialIcons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.modernChatInput}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newMessage}
                onChangeText={setNewMessage}
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
                  color={newMessage.trim() ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    );
  };

  const renderHostControls = () => {
    return (
      <BlurView intensity={40} style={styles.hostControlsPanel}>
        <Text style={styles.hostControlsTitle}>Host Controls</Text>
        <View style={styles.hostControlsGrid}>
          <TouchableOpacity style={styles.hostControlButton}>
            <MaterialIcons name="mic-off" size={20} color="#FFFFFF" />
            <Text style={styles.hostControlText}>Mute All</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.hostControlButton}>
            <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
            <Text style={styles.hostControlText}>Invite</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.hostControlButton}>
            <MaterialIcons name="settings" size={20} color="#FFFFFF" />
            <Text style={styles.hostControlText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    );
  };

  const renderModernMinimizedView = () => {
    return (
      <BlurView intensity={60} style={styles.modernMinimizedBlur}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.minimizedGradient}
        >
          <View style={styles.minimizedContent}>
            <Text style={styles.minimizedTitle} numberOfLines={1}>{streamTitle}</Text>
            <Text style={styles.minimizedViewers}>{displayViewCount} viewers</Text>
          </View>
        </LinearGradient>
      </BlurView>
    );
  };

  const renderModernInfoPanel = () => {
    return (
      <Animated.View
        style={[styles.modernInfoPanel, { opacity: infoPanelFadeAnim }]}
        {...infoPanelPanResponder.panHandlers}
      >
        <BlurView intensity={60} style={styles.infoPanelBlur}>
          <View style={styles.modernInfoHeader}>
            <Text style={styles.modernInfoTitle}>Stream Details</Text>
            <TouchableOpacity onPress={toggleInfoPanel}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modernInfoContent} showsVerticalScrollIndicator={false}>
            {/* Modern info content will be added here */}
          </ScrollView>
        </BlurView>
      </Animated.View>
    );
  };

  // --- Main Return ---

  // Create styles with animation values
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#1a1a1a',
    },
    content: {
      flex: 1,
    },
    // Simple Clean Components
    simpleTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    streamInfo: {
      flex: 1,
      marginHorizontal: 16,
    },
    streamTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
    viewerCount: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 14,
      marginTop: 2,
    },
    minimizeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    mainContent: {
      flex: 1,
      padding: 16,
    },
    agoraStreamContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    participantsArea: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 20,
    },
    participantCard: {
      width: (screenWidth - 56) / 3,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    participantAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginBottom: 8,
    },
    participantName: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
    },
    hostBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#ff4757',
      justifyContent: 'center',
      alignItems: 'center',
    },
    liveIndicator: {
      position: 'absolute',
      top: 80,
      left: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    liveText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    errorContainer: {
      position: 'absolute',
      top: 120,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(255, 107, 107, 0.9)',
      padding: 12,
      borderRadius: 8,
    },
    errorText: {
      color: '#FFFFFF',
      fontSize: 12,
      textAlign: 'center',
    },
    minimizedWidget: {
      position: 'absolute',
      width: 120,
      height: 80,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderRadius: 12,
      padding: 12,
      bottom: 100,
      right: 16,
    },
    minimizedContent: {
      flex: 1,
      justifyContent: 'center',
    },
    minimizedTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    minimizedViewers: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 12,
      marginTop: 2,
    },
    modernBackButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    streamTitleContainer: {
      flex: 1,
      marginHorizontal: 16,
    },
    modernStreamTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    hostNameText: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 14,
      fontWeight: '500',
      marginTop: 2,
    },
    topBarActions: {
      flexDirection: 'row',
      gap: 8,
    },
    shareButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modernMinimizeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    streamContentArea: {
      flex: 1,
      marginTop: 100,
    },
    streamInfoOverlay: {
      position: 'absolute',
      top: 120,
      right: 16,
      flexDirection: 'column',
      gap: 8,
      zIndex: 90,
    },
    viewerCountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      gap: 6,
    },
    viewerCountText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    rankBadgeModern: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      gap: 6,
    },
    rankTextModern: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    modernParticipantsContainer: {
      position: 'absolute',
      top: 20,
      left: 16,
      right: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      zIndex: 80,
    },
    modernParticipantCard: {
      width: (screenWidth - 56) / 3,
      aspectRatio: 0.8,
    },
    participantCardBlur: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modernParticipantAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginBottom: 8,
    },
    speakingIndicatorModern: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
      bottom: 8,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    speakingRing: {
      position: 'absolute',
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 3,
      borderColor: '#00ff88',
    },
    modernParticipantName: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    hostBadgeModern: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#ff4757',
      justifyContent: 'center',
      alignItems: 'center',
    },
    floatingReactionsContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 70,
    },
    floatingReaction: {
      position: 'absolute',
    },
    floatingReactionEmoji: {
      fontSize: 32,
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    interactiveBottomPanel: {
      position: 'absolute',
      bottom: 100,
      right: 16,
      flexDirection: 'column',
      gap: 12,
      zIndex: 90,
    },
    reactionButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255, 107, 157, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#FF6B9D',
    },
    activeReactionButton: {
      backgroundColor: 'rgba(255, 107, 157, 0.4)',
      transform: [{ scale: 1.1 }],
    },
    reactionPicker: {
      position: 'absolute',
      bottom: 170,
      right: 16,
      borderRadius: 20,
      padding: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      zIndex: 95,
    },
    reactionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 160,
      gap: 8,
    },
    reactionOption: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    reactionEmoji: {
      fontSize: 20,
    },
    giftButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255, 215, 0, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#FFD700',
    },
    chatToggleButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    moreOptionsButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modernChatContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40%',
      zIndex: 85,
    },
    modernChatBlur: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    modernChatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modernChatTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    chatHeaderActions: {
      flexDirection: 'row',
      gap: 8,
    },
    chatActionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modernChatContent: {
      flex: 1,
      paddingHorizontal: 16,
    },
    modernChatInputContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    replyPreviewContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 8,
      padding: 8,
      marginBottom: 8,
    },
    replyPreviewLine: {
      width: 3,
      height: 30,
      backgroundColor: '#6366f1',
      borderRadius: 2,
      marginRight: 8,
    },
    replyPreviewContent: {
      flex: 1,
    },
    replyPreviewName: {
      color: '#6366f1',
      fontSize: 12,
      fontWeight: '600',
    },
    replyPreviewMessage: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 12,
      marginTop: 2,
    },
    cancelReplyButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    chatInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    modernChatInput: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      color: '#FFFFFF',
      fontSize: 14,
      maxHeight: 100,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonActive: {
      backgroundColor: '#6366f1',
    },
    hostControlsPanel: {
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderRadius: 16,
      padding: 16,
      zIndex: 95,
    },
    hostControlsTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
      textAlign: 'center',
    },
    hostControlsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    hostControlButton: {
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      minWidth: 80,
    },
    hostControlText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    liveStatusContainer: {
      position: 'absolute',
      top: 120,
      left: 16,
      zIndex: 100,
    },
    liveStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    liveStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FFFFFF',
    },
    liveStatusText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    modernMinimizedContainer: {
      position: 'absolute',
      borderRadius: 16,
      overflow: 'hidden',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    modernMinimizedBlur: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
    },
    minimizedGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 12,
    },
    minimizedContent: {
      alignItems: 'center',
    },
    minimizedTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    minimizedViewers: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 12,
      fontWeight: '500',
      marginTop: 2,
    },
    modernInfoPanel: {
      position: 'absolute',
      right: 0,
      top: 0,
      width: '70%',
      height: '100%',
      zIndex: 1000,
    },
    infoPanelBlur: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modernInfoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modernInfoTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
    },
    modernInfoContent: {
      flex: 1,
      paddingHorizontal: 20,
    },
    errorMessageContainer: {
      position: 'absolute',
      top: 120,
      left: 16,
      right: 16,
      borderRadius: 12,
      padding: 16,
      zIndex: 110,
    },
    errorMessageText: {
      color: '#FFFFFF',
      fontSize: 14,
      textAlign: 'center',
      fontWeight: '600',
    },
    infoPanel: {
      position: 'absolute',
      right: 0,
      top: 0,
      width: '50%',
      height: '100%',
      backgroundColor: '#262730',
      zIndex: 1000,
      borderTopLeftRadius: 10,
      borderBottomLeftRadius: 10,
      borderLeftWidth: 1,
      borderLeftColor: '#3A3B45',
      overflow: 'hidden',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      // Panel is always positioned correctly, just fade in/out
    },
    infoPanelContent: {
      flex: 1,
      padding: 12,
    },
    chatHeaderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(58, 59, 69, 0.5)',
    },
    chatHeaderText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    messageText: {
      color: '#FFFFFF',
      fontSize: 14,
      lineHeight: 20,
    },
    mentionText: {
      color: '#6E56F7',
      fontWeight: 'bold',
    },
    replyPreview: {
      flexDirection: 'row',
      marginBottom: 4,
      alignItems: 'flex-start',
    },
    replyPreviewLine: {
      width: 2,
      height: '100%',
      backgroundColor: '#6E56F7',
      marginRight: 6,
      borderRadius: 1,
    },
    replyPreviewContent: {
      flex: 1,
    },
    replyPreviewName: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#6E56F7',
      marginBottom: 2,
    },
    replyPreviewMessage: {
      fontSize: 12,
      color: '#AAAAAA',
    },
    messageContainer: {
      flexDirection: 'row',
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    avatarContainer: {
      marginRight: 8,
    },
    avatarImage: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    messageContentContainer: {
      flex: 1,
    },
    messageSender: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    messageBubble: {
      backgroundColor: 'rgba(58, 59, 69, 0.5)',
      borderRadius: 12,
      padding: 10,
      maxWidth: '90%',
      alignSelf: 'flex-start',
    },
    highlightedBubble: {
      backgroundColor: 'rgba(110, 86, 247, 0.2)',
    },
    participantItem: {
      alignItems: 'center',
      marginHorizontal: 8,
      marginBottom: 12,
      width: BASE_ITEM_SIZE,
    },
    participantSpeakingAnimation: {
      position: 'absolute',
      width: BASE_ITEM_SIZE + 10,
      height: BASE_ITEM_SIZE + 10,
      borderRadius: (BASE_ITEM_SIZE + 10) / 2,
      borderWidth: 2,
      borderColor: '#6E56F7',
      zIndex: -1,
    },
    participantImageWrapper: {
      width: BASE_ITEM_SIZE,
      height: BASE_ITEM_SIZE,
      borderRadius: BASE_ITEM_SIZE / 2,
      overflow: 'hidden',
      marginBottom: 6,
    },
    participantGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    participantCatIcon: {
      width: BASE_ITEM_SIZE * 0.6,
      height: BASE_ITEM_SIZE * 0.6,
    },
    participantImg: {
      width: '100%',
      height: '100%',
    },
    participantLabel: {
      color: '#FFFFFF',
      fontSize: 12,
      textAlign: 'center',
      marginTop: 4,
    },
    hostGridContainer: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: GRID_GAP,
    },
    hostGridItem: {
      position: 'relative',
      borderRadius: 8,
      overflow: 'hidden',
    },
    hostGridImage: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
    },
    hostGridPlaceholderIcon: {
      width: '60%',
      height: '60%',
      alignSelf: 'center',
    },
    miniSpeakingIndicator: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#6E56F7',
    },
    miniCloseButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    chatContainer: {
      flex: 1,
      backgroundColor: 'rgba(18, 18, 20, 0.8)',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      marginTop: 10,
    },
    topBarOuterContainer: {
      paddingTop: 10,
      paddingHorizontal: 16,
      zIndex: 2,
    },
    topBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    backButton: {
      padding: 8,
    },
    progressBarContainer: {
      flex: 1,
      height: 40,
      marginHorizontal: 10,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: 'rgba(58, 59, 69, 0.5)',
    },
    progressBarFill: {
      height: '100%',
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rocketIcon: {
      marginHorizontal: 6,
    },
    arrowsContainer: {
      flexDirection: 'row',
    },
    arrowIcon: {
      marginLeft: -8,
    },
    minimizeButton: {
      padding: 8,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      zIndex: 1,
    },
    boostContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rankBadge: {
      backgroundColor: '#FFD700',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
    },
    rankText: {
      color: '#000000',
      fontWeight: 'bold',
      fontSize: 12,
    },
    boostBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    boostCount: {
      color: '#FFFFFF',
      marginLeft: 4,
      fontWeight: 'bold',
    },
    rightStatsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    statText: {
      color: '#FFFFFF',
      marginLeft: 4,
      fontWeight: 'bold',
    },
    infoStatBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(110, 86, 247, 0.2)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      marginLeft: 8,
      borderWidth: 1,
      borderColor: 'rgba(110, 86, 247, 0.3)',
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      paddingHorizontal: 16,
      marginTop: 10,
    },
    infoPanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(58, 59, 69, 0.5)',
    },
    infoPanelTitle: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 18,
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(58, 59, 69, 0.5)',
    },
    tab: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: '#6E56F7',
    },
    tabText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    tabContent: {
      flex: 1,
      padding: 16,
    },
         infoSection: {
       marginBottom: 16,
       paddingBottom: 8,
     },
    infoSectionTitle: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 20,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    infoText: {
      color: '#AAAAAA',
      marginLeft: 8,
    },
    infoSectionHeader: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
      marginTop: 16,
      marginBottom: 8,
    },
    participantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    participantAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 12,
    },
    participantInfo: {
      flex: 1,
    },
    participantRowName: {
      color: '#FFFFFF',
      fontSize: 14,
    },
    speakingIndicatorSmall: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#4CAF50',
      justifyContent: 'center',
      alignItems: 'center',
    },
    reportText: {
      color: '#AAAAAA',
      marginBottom: 16,
      lineHeight: 20,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 8,
      backgroundColor: 'rgba(110, 86, 247, 0.1)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(110, 86, 247, 0.2)',
    },
    actionButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
      marginLeft: 12,
      fontSize: 14,
    },
    reportButton: {
      backgroundColor: '#F44336',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    reportButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    reportButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      marginLeft: 8,
    },
    mentionSuggestionsContainer: {
      position: 'absolute',
      bottom: 60,
      left: 0,
      right: 0,
      backgroundColor: '#262730',
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      borderWidth: 1,
      borderColor: '#3A3B45',
      maxHeight: 200,
      zIndex: 100,
    },
    mentionSuggestionsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(58, 59, 69, 0.5)',
    },
    mentionSuggestionsTitle: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 14,
    },
    mentionQueryText: {
      color: '#6E56F7',
      fontSize: 14,
    },
    noMentionsContainer: {
      padding: 12,
      alignItems: 'center',
    },
    noMentionsText: {
      color: '#AAAAAA',
      fontStyle: 'italic',
    },
    mentionSuggestion: {
      flexDirection: 'row',
      padding: 12,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(58, 59, 69, 0.3)',
    },
    mentionSuggestionFirst: {
      borderTopWidth: 0,
    },
    mentionSuggestionLast: {
      borderBottomWidth: 0,
    },
    mentionAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 12,
    },
    mentionContent: {
      flex: 1,
    },
    mentionName: {
      color: '#FFFFFF',
      fontSize: 14,
    },
    mentionHighlight: {
      color: '#6E56F7',
      fontWeight: 'bold',
    },
    hostBadge: {
      backgroundColor: 'rgba(110, 86, 247, 0.2)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    hostText: {
      color: '#6E56F7',
      fontSize: 10,
      fontWeight: 'bold',
    },
    minimizedContainer: {
      position: 'absolute',
      backgroundColor: 'rgba(18, 18, 20, 0.9)',
      borderRadius: 16,
      overflow: 'hidden',
      zIndex: 100,
      borderWidth: 1,
      borderColor: '#3A3B45',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    // Agora streaming styles
    agoraStreamContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1, // Behind participants grid
    },
    streamingStatusContainer: {
      position: 'absolute',
      top: 80,
      left: 16,
      zIndex: 10,
    },
    streamingStatusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    streamingStatusText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '600',
      marginLeft: 4,
    },
    errorMessageContainer: {
      position: 'absolute',
      top: 120,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(255, 107, 107, 0.9)',
      padding: 12,
      borderRadius: 8,
      zIndex: 10,
    },
    errorMessageText: {
      color: '#FFFFFF',
      fontSize: 12,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Simple Clean Live Stream Interface */}
      {!isHidden && (
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: minimizeAnim }],
              zIndex: isMinimized ? 0 : 1
            }
          ]}
        >
          {/* Simple Top Bar */}
          <View style={styles.simpleTopBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleLeaveStream}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.streamInfo}>
              <Text style={styles.streamTitle}>{streamTitle}</Text>
              <Text style={styles.viewerCount}>{displayViewCount} viewers</Text>
            </View>

            <TouchableOpacity
              style={styles.minimizeButton}
              onPress={toggleMinimize}
            >
              <MaterialIcons name="remove" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Main Content Area */}
          <View style={styles.mainContent}>
            {/* Agora Audio/Video Stream */}
            {isAgoraEnabled && user && (
              <View style={styles.agoraStreamContainer}>
                <AgoraStreamView
                  streamId={streamId}
                  userId={user.uid}
                  isHost={stream?.hosts.some(host => host.name === user.displayName) || false}
                  onConnectionStateChange={handleAgoraConnectionStateChange}
                  onParticipantUpdate={handleAgoraParticipantUpdate}
                  onError={handleAgoraError}
                />
              </View>
            )}

            {/* Simple Participants Display */}
            <View style={styles.participantsArea}>
              {participants.slice(0, 6).map((participant, index) => (
                <View key={participant.id} style={styles.participantCard}>
                  <Image
                    source={{ uri: participant.avatar }}
                    style={styles.participantAvatar}
                  />
                  <Text style={styles.participantName}>{participant.name}</Text>
                  {participant.isHost && (
                    <View style={styles.hostBadge}>
                      <MaterialIcons name="mic" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Simple Live Indicator */}
          <View style={styles.liveIndicator}>
            <View style={[
              styles.liveDot,
              { backgroundColor: agoraConnectionState === 'connected' ? '#ff4757' : '#747d8c' }
            ]} />
            <Text style={styles.liveText}>
              {agoraConnectionState === 'connected' ? 'LIVE' : 'OFFLINE'}
            </Text>
          </View>

          {/* Error Message */}
          {streamingError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{streamingError}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Simple Minimized Widget */}
      {!isHidden && isMinimized && (
        <Animated.View
          style={[
            styles.minimizedWidget,
            {
              transform: [{ translateX: widgetPan.x }, { translateY: widgetPan.y }],
            }
          ]}
          {...widgetPanResponder.panHandlers}
        >
          <View style={styles.minimizedContent}>
            <Text style={styles.minimizedTitle} numberOfLines={1}>{streamTitle}</Text>
            <Text style={styles.minimizedViewers}>{displayViewCount} viewers</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// Add static options (kept)
LiveStreamView.options = {
  gestureEnabled: false,
};

export default LiveStreamView; 