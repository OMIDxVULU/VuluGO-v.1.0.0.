import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  PanResponder,
  Pressable,
  Alert,
  ImageStyle
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5, Entypo, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text as PaperText, Avatar, Button } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useUserProfile } from '../context/UserProfileContext';
import { useLoopProtection } from '../FixInfiniteLoop';
import { useLiveStreams, LiveStream, StreamHost } from '../context/LiveStreamContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Add dynamic sizing constants
const BASE_ITEM_SIZE = 52; // Increased from 48
const GRID_GAP = 8; // Keep the same gap
const OUTER_PADDING = 16; // Increased from 14
const MIN_WIDGET_SIZE = 120; // Increased from 110
const MAX_WIDGET_SIZE = 280; // Increased from 260
const MAX_HOSTS_TO_DISPLAY = 9; // Maximum number of hosts to display (3x3 grid)

// Mock cat placeholder image URL
const CAT_PLACEHOLDER = 'https://img.icons8.com/ios-filled/100/FFFFFF/cat-profile.png'; // Simple white cat icon

// Mock data for participants (matching Figma layout)
const MOCK_PARTICIPANTS = [
  { id: '1', name: 'Riddaboy98', avatar: 'https://randomuser.me/api/portraits/women/43.jpg', isHost: true, isSpeaking: true, placeholder: false },
  { id: '2', name: 'CoolCat22', avatar: CAT_PLACEHOLDER, isHost: true, isSpeaking: false, placeholder: true },
  { id: '3', name: 'GamerPro', avatar: CAT_PLACEHOLDER, isHost: true, isSpeaking: false, placeholder: true },
  { id: '4', name: 'StreamQueen', avatar: 'https://randomuser.me/api/portraits/women/43.jpg', isHost: true, isSpeaking: false, placeholder: false },
  { id: '5', name: 'NightOwl', avatar: CAT_PLACEHOLDER, isHost: true, isSpeaking: false, placeholder: true },
  { id: '6', name: 'PixelArtist', avatar: CAT_PLACEHOLDER, isHost: true, isSpeaking: false, placeholder: true },
  { id: '7', name: 'MusicLover', avatar: 'https://randomuser.me/api/portraits/women/43.jpg', isHost: true, isSpeaking: false, placeholder: false }, 
  { id: '8', name: 'CoffeeAddict', avatar: CAT_PLACEHOLDER, isHost: true, isSpeaking: false, placeholder: true },
  { id: '9', name: 'TechGuru', avatar: CAT_PLACEHOLDER, isHost: true, isSpeaking: false, placeholder: true },
];

// Simplify ChatMessage interface
interface ChatMessage {
  id: string;
  user: {
    name: string;
    avatar: string;
    isAdmin?: boolean;
  };
  message: string;
  timestamp: number;
  replyTo?: {
    id: string;
    userName: string;
    message: string;
  }
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

// Update mock messages with a message from the user
const MOCK_CHAT_MESSAGES = [
  { 
    id: '1', 
    user: { name: 'Anim', avatar: 'https://randomuser.me/api/portraits/lego/1.jpg', isAdmin: true }, 
    message: 'Welcome to the stream! 👋', 
    timestamp: Date.now() - 360000
  },
  { 
    id: '2', 
    user: { name: 'Sophia', avatar: 'https://randomuser.me/api/portraits/women/56.jpg' }, 
    message: 'Hello everyone! Excited to be here.', 
    timestamp: Date.now() - 300000
  },
  { 
    id: '3', 
    user: { name: 'Your Name', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' }, 
    message: 'Thanks for having me! This looks great.', 
    timestamp: Date.now() - 240000
  },
  { 
    id: '4', 
    user: { name: 'Jack', avatar: 'https://randomuser.me/api/portraits/men/45.jpg' }, 
    message: 'The game looks awesome today!', 
    timestamp: Date.now() - 180000
  },
  { 
    id: '5', 
    user: { name: 'Anim', avatar: 'https://randomuser.me/api/portraits/lego/1.jpg', isAdmin: true }, 
    message: 'Thanks for joining us!', 
    timestamp: Date.now() - 120000
  },
  { 
    id: '6', 
    user: { name: 'Emma', avatar: 'https://randomuser.me/api/portraits/women/22.jpg' }, 
    message: 'First time watching, this is great', 
    timestamp: Date.now() - 60000
  }
];

// Room stats (matching Figma)
const ROOM_STATS = {
  boosts: 164,
  rank: 1,
  viewers: 105,
  participants: 105,
  progress: 70 // Progress bar percentage (approx from Figma)
};

interface Participant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isSpeaking: boolean;
  placeholder: boolean;
}

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

// Update the props interface for ChatMessageItem
type ChatMessageItemProps = {
  message: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onScrollToMessage: (messageId: string) => void;
  isHighlighted?: boolean;
};

// Update the message rendering to highlight mentions
const MessageText = ({ text }: { text: string }) => {
  // Parse message to identify mentions
  const parts = parseMessage(text);
  
  return (
    <Text style={styles.messageText}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <Text 
              key={index} 
              style={styles.mentionText}
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

// Update the ChatMessageItem component to use MessageText
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
        style={styles.replyPreview}
        onPress={() => onScrollToMessage(message.replyTo!.id)}
      >
        <View style={styles.replyPreviewLine} />
        <View style={styles.replyPreviewContent}>
          <Text style={styles.replyPreviewName}>
            {message.replyTo.userName}
          </Text>
          <Text style={styles.replyPreviewMessage} numberOfLines={1}>
            {message.replyTo.message}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.messageContainer}>
      {/* Show avatar for all messages */}
      <View style={styles.avatarContainer}>
        <Image source={{ uri: message.user.avatar }} style={styles.avatarImage} />
      </View>
      
      <View style={styles.messageContentContainer}>
        {/* Show name for all messages */}
        <Text style={styles.messageSender}>{message.user.name}</Text>
        
        {/* Reply preview if this is a reply */}
        {message.replyTo && renderReplyPreview()}
        
        {/* Message bubble - with long press for reply */}
        <TouchableOpacity 
          style={[
            styles.messageBubble,
            isHighlighted && styles.highlightedBubble
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

// Memoized participant component to prevent re-renders
const ParticipantItem = React.memo(({ 
  participant, 
  animationRef 
}: { 
  participant: Participant, 
  animationRef: Animated.Value 
}) => {
  return (
    <View style={styles.participantItem}>
      {/* Speaking animation */}
      {participant.isSpeaking && (
        <Animated.View 
          style={[
            styles.participantSpeakingAnimation,
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
      
      <View style={styles.participantImageWrapper}>
        {participant.placeholder ? (
          <LinearGradient
            colors={['#FF6CAA', '#FF3C8C']} 
            style={styles.participantGradient}
          >
            <Image
              source={{ uri: participant.avatar }}
              style={styles.participantCatIcon} 
              resizeMode="contain"
            />
          </LinearGradient>
        ) : (
          <Image
            source={{ uri: participant.avatar }}
            style={styles.participantImg}
          />
        )}
      </View>
      <Text style={styles.participantLabel}>
        {participant.name}
      </Text>
    </View>
  );
});

const LiveStreamView = () => {
  // Add loop protection
  useLoopProtection();
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profileImage } = useUserProfile();
  const { getStreamById, streams, currentlyWatching, isMinimized: contextIsMinimized, setStreamMinimized } = useLiveStreams();
  
  // Use streamId from params to fetch the actual stream data from context
  const streamId = params.streamId as string;
  const stream = getStreamById(streamId);
  
  // Default values if stream not found, otherwise use stream data
  const streamTitle = stream ? stream.title : (params.title as string || 'Live Audio Room');
  const hostName = stream?.hosts[0]?.name || (params.hostName as string || 'Host');
  const hostAvatar = stream?.hosts[0]?.avatar || (params.hostAvatar as string || 'https://randomuser.me/api/portraits/women/43.jpg');
  const viewCount = stream?.views.toString() || (params.viewCount as string || '0');
  const formatViewCount = (count: string | number) => {
    const num = typeof count === 'string' ? parseInt(count) : count;
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };
  const displayViewCount = formatViewCount(stream?.views || viewCount);
  const boosts = stream?.boost || ROOM_STATS.boosts;
  const rank = stream?.rank || ROOM_STATS.rank;
  
  // Mock profile views (this would come from the user profile in a real app)
  // Using the host count as profile views for demonstration
  const hostCount = stream?.hosts.length || parseInt(params.hostCount as string || '0');
  
  // In a real app this would come from a user profile context
  // For demo, using a fixed high number or a value from the URL parameters
  const profileViews = params.profileViews ? parseInt(params.profileViews as string) : 1400;
  
  const userProfileImage = profileImage || 'https://randomuser.me/api/portraits/men/32.jpg';
  
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
    // Fallback to mock participants
    return MOCK_PARTICIPANTS;
  };
  
  // State variables
  const [participants, setParticipants] = useState<Participant[]>(initializeParticipants());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [messageText, setMessageText] = useState('');
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  // Add reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  // Animation refs
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const [currentSlideValue, setCurrentSlideValue] = useState<number>(screenWidth);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const chatListRef = useRef<ScrollView>(null);
  
  // Speaking animation refs
  const speakingAnimationRefs = useRef<Animated.Value[]>(MOCK_PARTICIPANTS.map(() => new Animated.Value(0)));
  
  // Add new state variables for mention suggestions
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [filteredMentions, setFilteredMentions] = useState<Participant[]>([]);
  
  // Add mention animation ref
  const mentionAnimRef = useRef(new Animated.Value(0)).current;
  
  // Add new state variables for minimized widget
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const minimizeAnim = useRef(new Animated.Value(1)).current;
  const widgetPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  
  // Set up a speaking animation that doesn't cause re-renders
  const animateSpeaking = useCallback(() => {
    MOCK_PARTICIPANTS.forEach((participant, index) => {
      if (participant.isSpeaking) {
        // Create pulse animation
        Animated.sequence([
          Animated.timing(speakingAnimationRefs.current[index], {
            toValue: 1,
            duration: 800,
            useNativeDriver: false
          }),
          Animated.timing(speakingAnimationRefs.current[index], {
            toValue: 0,
            duration: 800,
            useNativeDriver: false
          })
        ]).start(() => {
          // Only continue animation if component is still mounted
          if (speakingAnimationRefs.current) {
            animateSpeaking();
          }
        });
      }
    });
  }, []);
  
  // Run animation once on mount
  useEffect(() => {
    animateSpeaking();
    
    return () => {
      // Clean up animations
      speakingAnimationRefs.current.forEach(anim => anim.stopAnimation());
    };
  }, [animateSpeaking]);
  
  // Track slideAnim value using useState instead of useRef
  useEffect(() => {
    const id = slideAnim.addListener(({ value }) => {
      setCurrentSlideValue(value);
    });
    return () => slideAnim.removeListener(id);
  }, [slideAnim]);
  
  // Toggle info panel visibility (Define it here)
  const toggleInfoPanel = useCallback(() => {
    const toValue = isInfoPanelVisible ? screenWidth : 0;
    setIsInfoPanelVisible(!isInfoPanelVisible);
    Animated.timing(slideAnim, {
      toValue,
      duration: 250,
      useNativeDriver: false, 
    }).start();
  }, [isInfoPanelVisible, slideAnim, screenWidth]);

  // Update toggleMinimize to handle animation correctly
  const toggleMinimize = useCallback(() => {
    const minimizing = !isMinimized;
    setIsMinimized(minimizing);
    setIsHidden(false); 
    
    if (minimizing) {
      const { x, y } = calculateWidgetSize(participants.filter(p => p.isHost).length);
      widgetPan.setValue({ x, y });
      
      // Set the stream as minimized in the context
      setStreamMinimized(streamId, true);
      
      // Navigate back to the main live screen with params
      setTimeout(() => {
        router.push({
          pathname: '/(main)/live',
          params: {
            minimized: 'true',
            streamId: streamId,
          }
        });
      }, 100);
    } else {
      // Set the stream as not minimized in the context
      setStreamMinimized(streamId, false);
    }
    
    // Animate to final scale
    Animated.spring(minimizeAnim, {
      toValue: minimizing ? 1 : 1,
      friction: 7,
      tension: 40,
      useNativeDriver: true, 
    }).start();
    
    // Use fadeAnim for actual hide/show of the full view
    Animated.timing(fadeAnim, { 
      toValue: minimizing ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (minimizing && isInfoPanelVisible) {
      toggleInfoPanel(); 
    }
    
    // Haptic feedback
    if (Platform.OS === 'ios' && require('expo-haptics')) {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('Haptics not available');
      }
    }
  }, [isMinimized, minimizeAnim, fadeAnim, widgetPan, isInfoPanelVisible, toggleInfoPanel, participants, router, streamId, setStreamMinimized]);

  // Pan responder for the main view (minimize and info panel)
  const mainPanResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        const isHorizontalSwipe = 
          (!isInfoPanelVisible && evt.nativeEvent.pageX > screenWidth - 40 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5) ||
          (isInfoPanelVisible && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5);
        const isVerticalSwipe = 
          !isMinimized && gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
        return isHorizontalSwipe || isVerticalSwipe;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
         const isHorizontalSwipe = 
          (!isInfoPanelVisible && evt.nativeEvent.pageX > screenWidth - 40 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5) ||
          (isInfoPanelVisible && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5);
        const isVerticalSwipe = 
          !isMinimized && gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
        return isHorizontalSwipe || isVerticalSwipe;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Horizontal movement for info panel
        if ((!isInfoPanelVisible && gestureState.dx < 0 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5) || 
            (isInfoPanelVisible && gestureState.dx > 0 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5)) {
          slideAnim.setValue(isInfoPanelVisible ? gestureState.dx : screenWidth + gestureState.dx);
        }
        // Add vertical move handling for visual feedback during swipe down
        else if (!isMinimized && gestureState.dy > 0 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5) {
          // Scale down based on swipe distance, but don't let it go below a certain threshold (e.g., 0.7)
          const scale = Math.max(0.7, 1 - (gestureState.dy / screenHeight) * 0.8); // Adjust multiplier (0.8) for sensitivity
          minimizeAnim.setValue(scale);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeThresholdHorizontal = screenWidth * 0.25; 
        const swipeThresholdVertical = 80; // Increased threshold slightly
        let minimizeAction = 'none'; // 'minimize', 'snap_back', 'none'

        // Check for horizontal swipe completion (info panel)
        if ((!isInfoPanelVisible && gestureState.dx < -swipeThresholdHorizontal && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5) || 
            (isInfoPanelVisible && gestureState.dx > swipeThresholdHorizontal && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5)) {
          toggleInfoPanel();
          // Haptic feedback
          if (Platform.OS === 'ios') { /* ... Haptics ... */ }
        } 
        // Check for vertical swipe completion (minimize)
        else if (!isMinimized && gestureState.dy > swipeThresholdVertical && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5) {
          toggleMinimize(); // This will handle the final animation state
          minimizeAction = 'minimize';
        }
        // Snap back logic
        else {
           // Snap back info panel if it was a horizontal attempt
           if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) { 
               Animated.spring(slideAnim, {
                   toValue: isInfoPanelVisible ? 0 : screenWidth,
                   useNativeDriver: false,
               }).start();
           } 
           // Snap back minimize animation if swipe down didn't meet threshold
           else if (Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && minimizeAction !== 'minimize') { 
               minimizeAction = 'snap_back';
               Animated.spring(minimizeAnim, {
                   toValue: 1, // Snap back to full scale
                   useNativeDriver: true, // Scale can use native driver
               }).start();
           }
        }
        
        // Ensure info panel snaps back if moved but not enough to toggle
        if (minimizeAction === 'none' || minimizeAction === 'snap_back') {
           Animated.spring(slideAnim, {
               toValue: isInfoPanelVisible ? 0 : screenWidth,
               useNativeDriver: false,
           }).start();
        }
      },
    }),
  [isInfoPanelVisible, slideAnim, isMinimized, minimizeAnim, toggleMinimize, toggleInfoPanel, screenWidth, screenHeight]); // Added minimizeAnim, screen dimensions

  // Function to calculate dynamic widget size and position
  const calculateWidgetSize = useCallback((numHosts: number) => {
    // Determine grid dimensions based on host count
    let columns = 1;
    let rows = 1;
    
    if (numHosts <= 1) {
      columns = rows = 1;
    } else if (numHosts <= 4) {
      columns = rows = 2;
    } else {
      columns = rows = 3;
    }
    
    // Calculate required size based on grid dimensions
    const widgetWidth = (BASE_ITEM_SIZE * columns) + (GRID_GAP * (columns - 1)) + (OUTER_PADDING * 2);
    const widgetHeight = (BASE_ITEM_SIZE * rows) + (GRID_GAP * (rows - 1)) + (OUTER_PADDING * 2);
    
    // Use the larger dimension to ensure a square widget
    let size = Math.max(widgetWidth, widgetHeight);
    
    // Add a bit of extra buffer space
    size += 10;
    
    // Clamp between min and max sizes
    size = Math.max(MIN_WIDGET_SIZE, Math.min(size, MAX_WIDGET_SIZE));
    
    // Position in bottom right with proper spacing
    return {
      size,
      x: screenWidth - size - 20,
      y: screenHeight - size - 120, // Increased space from bottom to avoid navigation bar
    };
  }, [screenWidth, screenHeight]);

  // Add ref for double tap detection
  const lastTapTime = useRef(0);

  // Pan responder for dragging the minimized widget
  const widgetPanResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Extract offset to keep current position as the base
        widgetPan.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [ null, { dx: widgetPan.x, dy: widgetPan.y } ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        widgetPan.flattenOffset();
        
        // Get current position using type assertion to avoid TypeScript errors
        const currentX = (widgetPan.x as any)._value;
        const currentY = (widgetPan.y as any)._value;
        
        // Get widget size
        const { size } = calculateWidgetSize(participants.filter(p => p.isHost).length);
        
        // Calculate bounds to keep widget on screen
        const minX = 0;
        const maxX = screenWidth - size;
        const minY = 0;
        const maxY = screenHeight - size - 80; // Ensure it stays above navigation bar
        
        // Calculate new position that keeps widget in bounds
        const newX = Math.min(Math.max(currentX, minX), maxX);
        const newY = Math.min(Math.max(currentY, minY), maxY);
        
        // Animate to bounded position if needed
        if (newX !== currentX || newY !== currentY) {
          Animated.spring(widgetPan, {
            toValue: { x: newX, y: newY },
            useNativeDriver: false,
            friction: 5,
            tension: 50
          }).start();
        }
        
        // Double tap to maximize
        const now = Date.now();
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          if (now - lastTapTime.current < 300) {
            toggleMinimize();
          }
          lastTapTime.current = now;
        }
      },
    }),
  [widgetPan, calculateWidgetSize, participants, screenWidth, screenHeight, toggleMinimize]);

  // Define closeWidget before renderMinimizedView uses it
  const closeWidget = useCallback(() => {
    // Animate out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Then toggle the minimized state
      setIsMinimized(false);
      setIsHidden(true);
      
      // After a brief delay, show the full view again
      setTimeout(() => {
        setIsHidden(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }, 50);
    });
    
    // Provide haptic feedback
    if (Platform.OS === 'ios' && require('expo-haptics')) {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('Haptics not available');
      }
    }
  }, [fadeAnim]);

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

  const handleSendMessage = () => {
    if (messageText.trim() === '') return;
    const newMessage: ChatMessage = {
      id: generateId(),
      user: { name: 'Your Name', avatar: userProfileImage },
      message: messageText,
      timestamp: Date.now(),
      ...(replyingTo && { replyTo: { id: replyingTo.id, userName: replyingTo.user.name, message: replyingTo.message.substring(0,30) } })
    };
    setChatMessages(prev => [...prev, newMessage]);
    setMessageText('');
    setReplyingTo(null);
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
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
      const { x: initialX, y: initialY } = calculateWidgetSize(numHosts);
      
      if (!widgetPan.x.hasListeners()) {
        widgetPan.setValue({ x: initialX, y: initialY });
      }
    }
  }, [isMinimized, participants, widgetPan, calculateWidgetSize]);

  // Render the minimized draggable widget with dynamic sizing
  const renderMinimizedView = () => {
    const hosts = participants.filter(p => p.isHost).slice(0, MAX_HOSTS_TO_DISPLAY);
    const numHosts = hosts.length;
    
    // Calculate widget dimensions
    const { size: widgetSize, x: initialX, y: initialY } = calculateWidgetSize(numHosts);
    
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
      <Animated.View 
        style={[
          styles.minimizedContainer, 
          { 
            width: widgetSize,
            height: widgetSize,
            transform: [{ translateX: widgetPan.x }, { translateY: widgetPan.y }],
            opacity: isMinimized ? 1 : 0,
          }
        ]}
        {...widgetPanResponder.panHandlers}
      >
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
      </Animated.View>
    );
  };

  // The main renderChat function definition should remain here
  const renderChat = () => {
    return (
       <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.chatListContainer}>
          {/* Shadow overlay at the top of chat */}
          <LinearGradient
            colors={['rgba(26, 27, 34, 0.9)', 'rgba(26, 27, 34, 0)']}
            style={styles.chatTopShadow}
            pointerEvents="none"
          />
          
          <ScrollView
            ref={chatListRef}
            style={styles.chatList}
            contentContainerStyle={styles.chatContent}
          >
            {chatMessages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                onReply={handleReplyToMessage}
                onScrollToMessage={scrollToMessage}
                isHighlighted={message.id === replyingTo?.id}
              />
            ))}
          </ScrollView>
        </View>

        {/* Chat input with reply UI */}
        <View style={styles.chatInputContainer}>
          {/* Show reply preview when replying */}
          {replyingTo && (
            <View style={styles.replyingContainer}>
              <View style={styles.replyingContent}>
                <Text style={styles.replyingText}>
                  Replying to <Text style={styles.replyingName}>{replyingTo.user.name}</Text>
                </Text>
                <Text style={styles.replyingMessage} numberOfLines={1}>
                  {replyingTo.message.length > 40 
                    ? replyingTo.message.substring(0, 40) + '...' 
                    : replyingTo.message}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.replyingCancel} 
                onPress={cancelReply}
                hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
              >
                <View style={styles.cancelButtonCircle}>
                  <MaterialIcons name="close" size={16} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Mention suggestions popup */}
          {mentionQuery && filteredMentions.length > 0 && renderMentionSuggestions()}
          
          {/* Input field with send button */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={messageText}
              onChangeText={handleMessageChange}
            />
            <TouchableOpacity
              style={[styles.sendButton, messageText.trim() ? styles.sendButtonActive : {}]}
              onPress={handleSendMessage}
              disabled={messageText.trim() === ''}
            >
              <MaterialIcons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // --- Render Functions --- 

  const renderTopBar = () => {
    return (
      <View style={styles.topBarOuterContainer}>
        <View style={styles.topBarContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
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
          {/* Profile Views */}
          <View style={styles.statBadge}>
            <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
            <Text style={styles.statText}>{formatViewCount(profileViews)}</Text>
          </View>
          
          {/* Live Views - updated to show group of people */}
          <TouchableOpacity 
            style={styles.infoStatBadge}
            onPress={toggleInfoPanel}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={18} color="#FFFFFF" />
            <Text style={styles.statText}>{displayViewCount}</Text>
            {/* Information icon removed */}
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderParticipantsGrid = useCallback(() => (
    <View style={styles.gridContainer}>
      {participants.map((participant, index) => (
        <ParticipantItem 
          key={participant.id}
          participant={participant}
          animationRef={speakingAnimationRefs.current[index]} 
        />
      ))}
    </View>
  ), [participants]);

  // Update the renderChat function to add a fading shadow at the top
  const renderInfoPanel = () => {
    return (
      <Animated.View style={[styles.infoPanel, { transform: [{ translateX: slideAnim }] }] }>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.infoPanelHeader}>
            <Text style={styles.infoPanelTitle}>Stream Details</Text>
            <TouchableOpacity onPress={toggleInfoPanel}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.tabBar}>
            {['Info', 'Participants', 'Report'].map(tab => (
              <TouchableOpacity 
                key={tab}
                style={[styles.tab, activeTab === tab.toLowerCase() && styles.activeTab]}
                onPress={() => setActiveTab(tab.toLowerCase())}
              >
                <Text style={styles.tabText}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView style={styles.tabContent}>
            {activeTab === 'info' && (
              <View>
                <Text style={styles.infoSectionTitle}>{streamTitle}</Text>
                
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={18} color="#AAAAAA" />
                  <Text style={styles.infoText}>Started {stream?.startedAt ? timeAgo(stream.startedAt) : '1 hour ago'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <MaterialIcons name="bolt" size={18} color="#FFD700" />
                  <Text style={styles.infoText}>Total Boost: {boosts}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="eye-outline" size={18} color="#AAAAAA" />
                  <Text style={styles.infoText}>Live Viewers: {displayViewCount}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={18} color="#AAAAAA" />
                  <Text style={styles.infoText}>Profile Views: {formatViewCount(profileViews)}</Text>
                </View>
              </View>
            )}
            {activeTab === 'participants' && (
              <View>
                <Text style={styles.infoSectionHeader}>Hosts</Text>
                {participants.filter(p => p.isHost).map(host => (
                  <View key={host.id} style={styles.participantRow}>
                    <Image source={{ uri: host.avatar }} style={styles.participantAvatar} />
                    <Text style={styles.participantRowName}>{host.name}</Text>
                  </View>
                ))}
                <Text style={styles.infoSectionHeader}>Viewers</Text>
                {participants.filter(p => !p.isHost).map(viewer => (
                  <View key={viewer.id} style={styles.participantRow}>
                    <Image source={{ uri: viewer.avatar }} style={styles.participantAvatar} />
                    <Text style={styles.participantRowName}>{viewer.name}</Text>
                  </View>
                ))}
              </View>
            )}
            {activeTab === 'report' && (
              <View>
                <Text style={styles.reportText}>Report inappropriate content or behavior in this stream.</Text>
                <TouchableOpacity style={styles.reportButton}>
                  <Text style={styles.reportButtonText}>Report Stream</Text>
                </TouchableOpacity>
              </View>
            )}
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

  // Add a function to render the swipe indicator
  const renderSwipeIndicator = () => {
    // Remove early return
    return (
      <View style={styles.swipeIndicatorContainer}>
        <View style={styles.swipeIndicator} />
      </View>
    );
  };

  // --- Main Return --- 

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}> 
      <StatusBar style="light" />
      
      {/* Full screen content - Use fadeAnim for visibility */} 
      {!isHidden && (
        <Animated.View 
          style={[styles.content, { opacity: fadeAnim, transform: [{ scale: minimizeAnim }] }]}
          {...(isMinimized ? {} : mainPanResponder.panHandlers)} // Only allow main pan when not minimized 
        >
          {/* Render full content only if not minimized? */} 
          {renderTopBar()} 
          {renderStatsBar()}
          {renderParticipantsGrid()}
          {renderChat()}
        </Animated.View>
      )}

      {/* Minimized Widget - Rendered separately, but only if not hidden */} 
      {!isHidden && isMinimized && renderMinimizedView()} 

      {/* Info Panel & Swipe Indicator - Only shown when not minimized/hidden */} 
      {!isMinimized && !isHidden && (!isInfoPanelVisible ? null : renderInfoPanel())}
      {!isMinimized && !isHidden && !isInfoPanelVisible && renderSwipeIndicator()}

    </SafeAreaView>
  );
};

// Add static options (kept)
LiveStreamView.options = {
  gestureEnabled: false,
};

// --- Styles --- 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B22',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  
  // Top Bar
  topBarOuterContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 10,
  },
  topBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8, 
    marginRight: 6,
    backgroundColor: 'rgba(38, 39, 48, 0.8)',
    borderRadius: 20,
  },
  progressBarContainer: {
    flex: 1,
    height: 28,
    backgroundColor: '#3A3B45',
    borderRadius: 14,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rocketIcon: {
    marginLeft: 6,
    marginRight: 4,
  },
  arrowsContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
    marginRight: 6,
  },
  arrowIcon: {
    marginLeft: -9,
  },
  
  // Stats Bar
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 15,
  },
  boostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262730',
    borderRadius: 20,
    overflow: 'hidden',
    height: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  rankBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  rankText: {
    color: '#1A1B22',
    fontSize: 15,
    fontWeight: 'bold',
  },
  boostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
  },
  boostCount: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  rightStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262730',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  
  // Participant Grid styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 15, 
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: 'rgba(38, 39, 48, 0.4)',
    borderRadius: 12,
    marginHorizontal: 15,
  },
  participantItem: {
    width: '30%', 
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  participantImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#3A3B45',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 0,
    zIndex: 1,
  },
  participantImg: {
    width: '100%',
    height: '100%',
  },
  participantGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantCatIcon: {
    width: '60%', 
    height: '60%', 
    tintColor: '#FFFFFF',
  },
  participantLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  participantSpeakingAnimation: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: 'rgba(138, 125, 246, 0.4)',
    alignSelf: 'center',
    top: -6,
    zIndex: 0,
  },

  // Chat container
  chatContainer: {
    flex: 1,
    backgroundColor: '#1A1B22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  
  // Add container for chat list for positioning the shadow
  chatListContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Add shadow gradient at the top
  chatTopShadow: {
    position: 'absolute', 
    top: 0,
    left: -5,
    right: -5,
    height: 40,
    zIndex: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  
  // Chat list
  chatList: {
    flex: 1,
    padding: 10,
  },
  chatContent: {
    paddingVertical: 5,
    paddingBottom: 15,
  },
  
  // Message styles - updated for consistency
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    maxWidth: '100%',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  messageContentContainer: {
    flex: 1,
    maxWidth: '85%',
  },
  messageSender: {
    color: '#9DA3B4',
    fontSize: 13,
    marginBottom: 2,
    fontWeight: '500',
    marginLeft: 2,
  },
  messageBubble: {
    backgroundColor: '#262730',
    borderRadius: 12,
    padding: 12,
    paddingVertical: 8,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  
  // Reply preview styles
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    marginLeft: 2,
  },
  replyPreviewLine: {
    width: 2,
    alignSelf: 'stretch',
    backgroundColor: '#8A7DF6',
    marginRight: 8,
  },
  replyPreviewContent: {
    flexDirection: 'column',
    backgroundColor: '#1D1E26',
    borderRadius: 12,
    padding: 8,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  replyPreviewName: {
    color: '#8A7DF6',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  replyPreviewMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    paddingHorizontal: 2,
  },
  highlightedBubble: {
    backgroundColor: '#464775',
  },
  
  // Input styles
  chatInputContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A2A35',
    backgroundColor: '#1A1B22',
  },
  inputRow: {
    flexDirection: 'row',
    backgroundColor: '#262730',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    padding: 0,
  },
  sendButton: {
    backgroundColor: '#33344A',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#464775',
  },
  
  // Replying UI styles
  replyingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    paddingVertical: 10,
    backgroundColor: '#1D1E26',
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8A7DF6',
  },
  replyingContent: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  replyingText: {
    color: '#9DA3B4',
    fontSize: 12,
  },
  replyingName: {
    color: '#8A7DF6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  replyingMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  replyingCancel: {
    padding: 2,
    alignSelf: 'center',
  },
  cancelButtonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#464775',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  
  // Info Panel
  infoPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#1A1B22',
    zIndex: 1000,
    borderLeftWidth: 1,
    borderLeftColor: '#2D2E38',
    elevation: 10, 
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2E38',
  },
  infoPanelTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2E38',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8A7DF6',
  },
  tabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  infoSectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoSectionHeader: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    color: '#E0E0E0',
    fontSize: 14,
    marginLeft: 10,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: 12,
  },
  participantRowName: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  reportText: {
    color: '#E0E0E0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  reportButton: {
    backgroundColor: '#E63946',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Mention suggestion styles
  mentionSuggestionsContainer: {
    position: 'absolute',
    bottom: 65,
    left: 10,
    right: 10,
    backgroundColor: '#262730',
    borderRadius: 12,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#3A3B45',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  mentionSuggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(58, 59, 69, 0.5)',
  },
  mentionSuggestionsTitle: {
    color: '#9DA3B4',
    fontSize: 12,
    fontWeight: '500',
  },
  mentionQueryText: {
    color: '#8A7DF6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noMentionsContainer: {
    padding: 12,
    alignItems: 'center',
  },
  noMentionsText: {
    color: '#9DA3B4',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  mentionSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(58, 59, 69, 0.2)',
  },
  mentionSuggestionFirst: {
    paddingTop: 12,
  },
  mentionSuggestionLast: {
    borderBottomWidth: 0,
    paddingBottom: 12,
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  mentionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mentionName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  mentionHighlight: {
    color: '#8A7DF6',
    fontWeight: 'bold',
  },
  mentionText: {
    color: '#8A7DF6',
    fontWeight: 'bold',
  },
  hostBadge: {
    backgroundColor: 'rgba(138, 125, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(138, 125, 246, 0.4)',
  },
  hostText: {
    color: '#8A7DF6',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(38, 39, 48, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,  // Slightly increased for visual feedback
    shadowRadius: 3,
    elevation: 3,         // Slightly increased for visual feedback
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', // Subtle border to indicate interaction
  },
  infoIcon: {
    marginLeft: 4,
  },
  // Swipe indicator styles
  swipeIndicatorContainer: {
    position: 'absolute',
    top: '50%',
    right: 0,
    width: 20,
    height: 80,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: -40, // Half of height to center vertically
    zIndex: 900,
  },
  swipeIndicator: {
    width: 5,
    height: 60,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    backgroundColor: 'rgba(138, 125, 246, 0.5)',
  },
  minimizedContainer: {
    position: 'absolute',
    borderRadius: 20,
    backgroundColor: 'rgba(26, 27, 34, 0.98)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostGridContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignContent: 'space-between',
  },
  hostGridItem: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  hostGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  hostGridPlaceholderIcon: {
    width: '50%',
    height: '50%',
    alignSelf: 'center',
    tintColor: '#FFFFFF',
  },
  miniSpeakingIndicator: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: '#1A1B22',
  },
  miniCloseButton: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF3C8C',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
});

export default LiveStreamView; 