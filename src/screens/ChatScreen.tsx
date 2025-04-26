import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
  Dimensions,
  Keyboard,
  EmitterSubscription,
  KeyboardEvent,
  Modal,
  TouchableWithoutFeedback,
  Vibration,
  PanResponder,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconFallback } from '../../app/_layout';
import SVGIcon from '../components/SVGIcon';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Message from '../components/Message';
import ChatHeader from '../components/ChatHeader';
import ChatFooter from '../components/ChatFooter';

const { width, height } = Dimensions.get('window');

interface ChatScreenProps {
  userId: string;
  name: string;
  avatar: string;
  goBack: () => void;
  goToDMs?: () => void; // Optional dedicated function to navigate to DMs list
  source?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isLive?: boolean;
  edited?: boolean;
  attachments?: Array<{
    id: string;
    type: 'image' | 'file' | 'gif';
    url: string;
    filename?: string;
    width?: number;
    height?: number;
  }>;
  mentions?: Array<{
    id: string;
    name: string;
    startIndex: number;
    endIndex: number;
  }>;
  replyTo?: {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    userIds: string[];
  }>;
  measure?: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void;
}

interface Reply {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
}

// Live chat preview component with improved styling
const LiveChatPreview = () => {
  return (
    <View style={styles.liveChatContainer}>
      <View style={styles.liveChatContent}>
        <View style={styles.liveChatHeader}>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <Text style={styles.liveTime}>Started 45 min ago</Text>
        </View>
        
        <Text style={styles.liveChatTitle}>Feature Showcase: New UI Components</Text>
        
        <View style={styles.liveChatImageRow}>
          <Image 
            source={{ uri: 'https://randomuser.me/api/portraits/women/1.jpg' }}
            style={styles.liveChatImage}
          />
          <Image 
            source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }}
            style={[styles.liveChatImage, { marginLeft: -15 }]}
          />
          <Image 
            source={{ uri: 'https://randomuser.me/api/portraits/women/2.jpg' }}
            style={[styles.liveChatImage, { marginLeft: -15 }]}
          />
          <View style={styles.viewerCountContainer}>
            <Text style={styles.viewerCountText}>2.5K</Text>
          </View>
        </View>
        
        <View style={styles.liveChatTextContainer}>
          <Text style={styles.liveChatMessage} numberOfLines={2}>
            Join me as I showcase the latest UI components we've been working on. I'll demonstrate how they work and answer any questions.
          </Text>
          <View style={styles.liveStatsContainer}>
            <View style={styles.liveStatItem}>
              <SVGIcon name="visibility" size={14} color="#8E8E93" />
              <Text style={styles.liveStatText}>2.5K watching</Text>
            </View>
            <View style={styles.liveStatItem}>
              <SVGIcon name="chat" size={14} color="#8E8E93" />
              <Text style={styles.liveStatText}>142 comments</Text>
            </View>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.joinLiveButton}>
        <Text style={styles.joinLiveText}>Join Stream</Text>
        <SVGIcon name="arrow-back" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

// Placeholder for current user info
const CURRENT_USER_ID = 'currentUser';
const CURRENT_USER_NAME = 'You';
const CURRENT_USER_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg';

// 2. Update Dummy Data with Discord-like features
const DUMMY_MESSAGES: Message[] = [
  {
    id: '1',
    senderId: 'otherUser1',
    senderName: 'Sophia', 
    senderAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    text: "Hey! How are you?",
    timestamp: '2:30 PM',
  },
  {
    id: '2',
    senderId: CURRENT_USER_ID,
    senderName: CURRENT_USER_NAME,
    senderAvatar: CURRENT_USER_AVATAR,
    text: "I'm doing great! Just finished working on the new feature.",
    timestamp: '2:31 PM',
  },
  {
    id: '3',
    senderId: 'otherUser1', 
    senderName: 'Sophia',
    senderAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    text: "That's awesome! Can't wait to see it 😊",
    timestamp: '2:32 PM',
    reactions: [
      { emoji: '👍', count: 1, userIds: [CURRENT_USER_ID] },
      { emoji: '🎉', count: 1, userIds: [CURRENT_USER_ID] }
    ]
  },
  {
    id: '3.1',
    senderId: 'otherUser1', 
    senderName: 'Sophia',
    senderAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    text: "How did the testing go?",
    timestamp: '2:33 PM',
  },
  {
    id: '4',
    senderId: CURRENT_USER_ID,
    senderName: CURRENT_USER_NAME,
    senderAvatar: CURRENT_USER_AVATAR,
    text: "I'll send you a demo soon. Here's a screenshot of what I've been working on:",
    timestamp: '2:35 PM',
    attachments: [
      {
        id: 'att1',
        type: 'image',
        url: 'https://picsum.photos/400/300',
        width: 400,
        height: 300
      }
    ]
  },
  {
    id: '5',
    senderId: 'otherUser1',
    senderName: 'Sophia',
    senderAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    text: "Wow, that looks great! When can we test it?",
    timestamp: '2:36 PM',
    replyTo: {
      id: '4',
      senderId: CURRENT_USER_ID,
      senderName: CURRENT_USER_NAME,
      text: "I'll send you a demo soon. Here's a screenshot of what I've been working on:"
    }
  },
  {
    id: '6',
    senderId: CURRENT_USER_ID,
    senderName: CURRENT_USER_NAME,
    senderAvatar: CURRENT_USER_AVATAR,
    text: "Hey @Sophia, I'm planning to start a live stream to showcase the features in about 10 minutes. Would you join?",
    timestamp: '2:37 PM',
    mentions: [
      {
        id: 'otherUser1',
        name: 'Sophia',
        startIndex: 4,
        endIndex: 11
      }
    ]
  },
  {
    id: '7',
    senderId: 'otherUser1',
    senderName: 'Sophia',
    senderAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    text: "Sure! I'll be there.",
    timestamp: '2:38 PM',
  },
  {
    id: '8',
    senderId: CURRENT_USER_ID,
    senderName: CURRENT_USER_NAME,
    senderAvatar: CURRENT_USER_AVATAR,
    text: "Great! Here's a link to the room:",
    timestamp: '2:39 PM',
    isLive: true, // Keep isLive for the preview component
  },
];

// Configure haptic feedback patterns based on device capabilities
const triggerHapticFeedback = (type?: 'selection' | 'longPress' | 'error' | 'reaction' | 'light' | 'medium' | 'warning') => {
  if (Platform.OS === 'ios') {
    switch (type) {
      case 'selection':
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'longPress':
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'error':
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'reaction':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      default:
        Haptics.selectionAsync();
    }
  } else {
    // For Android, use Vibration API
    switch (type) {
      case 'selection':
      case 'light':
        Vibration.vibrate(10);
        break;
      case 'longPress':
      case 'medium':
        Vibration.vibrate(15);
        break;
      case 'error':
      case 'warning':
        Vibration.vibrate([0, 30, 30, 30]);
        break;
      case 'reaction':
        Vibration.vibrate(10);
        break;
      default:
        Vibration.vibrate(10);
    }
  }
};

// Define the ChatMessage type locally since we don't have access to the types module
interface ChatMessage {
  id: number;
  text: string;
  time: string;
  type: 'sent' | 'received';
  status: 'sent' | 'delivered' | 'read';
  reactions: any[];
  attachments: any[];
  isLive?: boolean;
}

// Function to generate random messages for testing
const generateRandomMessages = (userId: string): ChatMessage[] => {
  const messages: ChatMessage[] = [];
  const messageCount = 10 + Math.floor(Math.random() * 20);
  
  for (let i = 0; i < messageCount; i++) {
    const isSent = Math.random() > 0.5;
    messages.push({
      id: i,
      text: `This is message ${i + 1} in the conversation with ${userId}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: isSent ? 'sent' : 'received',
      status: isSent ? 'delivered' : 'read',
      reactions: [],
      attachments: [],
      isLive: i === messageCount - 1 && Math.random() > 0.8, // Last message might be live
    });
  }
  
  return messages;
};

// Simple hook to scroll to bottom
const useScrollToBottom = (ref: React.RefObject<FlatList>) => {
  const scrollToBottom = () => {
    if (ref.current) {
      ref.current.scrollToEnd({ animated: true });
    }
  };
  
  return { scrollToBottom };
};

const ChatScreenInternal = ({ userId, name, avatar, goBack, goToDMs, source }: ChatScreenProps) => {
  // Use the imported router
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [renderError, setRenderError] = useState(false);
  const [isCloseFriend, setIsCloseFriend] = useState(false);
  
  // Create animations for the swipe back gesture
  const [backgroundOpacity] = useState(new Animated.Value(0));
  const [screenTranslate] = useState(new Animated.Value(0));
  
  // Create transforms for the swipe gesture
  const screenTransform = {
    transform: [
      { translateX: screenTranslate },
    ]
  };
  
  // Cleanup animations and state when unmounting
  useEffect(() => {
    return () => {
      // Reset animation values
      backgroundOpacity.setValue(0);
      screenTranslate.setValue(0);
    };
  }, [backgroundOpacity, screenTranslate]);
  
  // Create the PanResponder for swipe back gesture
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return gestureState.dx > 10 && gestureState.dx > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        const dragDistance = Math.max(0, gestureState.dx);
        screenTranslate.setValue(dragDistance);
        backgroundOpacity.setValue(dragDistance / 100);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > width * 0.3) {
          // Swipe right completes, navigate back
          Animated.timing(screenTranslate, {
            toValue: width,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            goBack();
          });
        } else {
          // Return to original position
          Animated.parallel([
            Animated.timing(screenTranslate, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;
  
  // Load messages
  useEffect(() => {
    // Reset error state on mount
    setRenderError(false);
    
    try {
      const generatedMessages = generateRandomMessages(userId);
      setMessages(generatedMessages);
    } catch (error) {
      console.error("Error generating messages:", error);
      setRenderError(true);
    }
    
    // Return cleanup function
    return () => {
      // Clear messages when unmounting
      setMessages([]);
    };
  }, [userId]);

  // Chat functionality references and handlers
  const flatListRef = useRef<FlatList>(null);
  const { scrollToBottom } = useScrollToBottom(flatListRef);
  
  // Navigation handler that respects the source parameter
  const handleNavigation = useCallback(() => {
    if (source === 'notifications') {
      router.push('/(main)/notifications');
    } else if (goToDMs) {
      goToDMs();
    } else {
      goBack();
    }
  }, [source, goBack, goToDMs, router]);

  const keyExtractor = (item: ChatMessage) => item.id.toString();

  const getItemLayout = (data: any, index: number) => ({
    length: 80,
    offset: 80 * index,
    index,
  });

  const renderMessageItem = useCallback(({ item, index }: { item: ChatMessage, index: number }) => {
    // Check if the previous message is from the same sender
    const isGroupedMessage = index > 0 && 
      messages[index - 1] && 
      ((messages[index - 1].type === 'sent' && item.type === 'sent') ||
       (messages[index - 1].type === 'received' && item.type === 'received'));
    
    // Set user info based on message type
    const userName = item.type === 'sent' ? 'You' : name;
    const userAvatar = item.type === 'sent' 
      ? 'https://randomuser.me/api/portraits/lego/1.jpg' 
      : avatar || 'https://randomuser.me/api/portraits/women/2.jpg';
    
    return (
      <View style={{ marginTop: isGroupedMessage ? -8 : 8 }}>
        <Message
          id={item.id}
          text={item.text}
          time={item.time}
          type={item.type}
          status={item.status}
          reactions={item.reactions}
          attachments={item.attachments}
          showAvatar={!isGroupedMessage} // Only show avatar for first message in group
          showName={!isGroupedMessage}   // Only show name for first message in group
          userName={userName}
          userAvatar={userAvatar}
        />
      </View>
    );
  }, [messages, name, avatar]);

  const renderDateSeparator = (date: string) => {
    return (
      <View style={styles.dateSeparator}>
        <View style={styles.dateLine} />
        <Text style={styles.dateText}>{date}</Text>
        <View style={styles.dateLine} />
      </View>
    );
  };

  // Try to safely render the message list
  const safeRenderMessages = () => {
    try {
    return (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={keyExtractor}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContentContainer}
          showsVerticalScrollIndicator={false}
          inverted={false}
          getItemLayout={getItemLayout}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={21}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              {renderDateSeparator('Today')}
          </View>
          )}
        />
      );
      } catch (error) {
      console.error("Error rendering message list:", error);
      setRenderError(true);
    return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Could not load messages</Text>
          <TouchableOpacity onPress={handleNavigation} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
    }
  };

  // Handle sending a new message
  const handleSendMessage = (text: string) => {
    const newMessage: ChatMessage = {
      id: Date.now(),
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'sent',
      status: 'delivered',
      reactions: [],
      attachments: [],
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
          setTimeout(() => {
      scrollToBottom();
    }, 100);
  };

  // Toggle close friend status
  const handleToggleCloseFriend = () => {
    setIsCloseFriend(prev => !prev);
    // Here you would typically update this in your backend or local storage
    // For now, we'll just toggle the state
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1D1E26" />
      
      {/* Background for swipe gesture */}
      <Animated.View
        style={[
          styles.navigationBackground,
          { opacity: backgroundOpacity }
        ]}
      >
        <MaterialIcons name="arrow-back" size={30} color="#FFF" style={styles.backIcon} />
      </Animated.View>
      
      {/* Swipeable Screen Content */}
      <Animated.View 
        style={[styles.screenContent, screenTransform]} 
        {...panResponder.panHandlers}
      >
        {/* Custom Chat Header */}
        <ChatHeader
          name={name}
          avatar={avatar}
          status="online"
          isCloseFriend={isCloseFriend}
          onBack={handleNavigation}
          onProfile={() => {}}
          onOptions={() => {}}
          onToggleCloseFriend={handleToggleCloseFriend}
        />
        
        {/* Live Chat Preview - if needed */}
        {messages.some(msg => msg.isLive) && (
          <LiveChatPreview />
        )}
        
        {/* Messages List with error handling */}
        {renderError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Something went wrong</Text>
            <TouchableOpacity onPress={handleNavigation} style={styles.errorButton}>
              <Text style={styles.errorButtonText}>Return to Messages</Text>
            </TouchableOpacity>
          </View>
        ) : (
          safeRenderMessages()
        )}
        
        {/* Message Input Bar */}
        <ChatFooter onSendMessage={handleSendMessage} />
      </Animated.View>
    </View>
  );
};

// New wrapper component to handle route props
const ChatScreen = (props: any) => {
  // Extract params from route - might need adjustment depending on navigator version
  const { userId, name, avatar, goBack, goToDMs, source } = props.route?.params || {};

  // Basic validation or default values
  if (!userId || !name || !goBack) {
    // Handle missing required props - maybe show an error or return null
    console.error("ChatScreen received invalid props:", props.route?.params);
    // You might want a more user-friendly error display here
    return <View><Text>Error loading chat.</Text></View>; 
  }

  return (
    <ChatScreenInternal 
      userId={userId}
      name={name}
      avatar={avatar || defaultAvatarUrl} // Provide a default avatar if needed
      goBack={goBack}
      goToDMs={goToDMs}
      source={source}
    />
  );
};

// Need to define defaultAvatarUrl or remove if not needed
const defaultAvatarUrl = 'https://randomuser.me/api/portraits/lego/1.jpg';

// Update the styles to match our modern design
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  navigationBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1D1E26',
    justifyContent: 'center',
    paddingLeft: 20,
  },
  backIcon: {
    opacity: 0.8,
  },
  screenContent: {
    flex: 1,
    backgroundColor: '#131318',
  },
  messagesList: {
    flex: 1,
  },
  messagesContentContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  listHeader: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 8,
  },
  
  // Keep other necessary styles from original file
  liveChatContainer: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#1D1E26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  liveChatContent: {
    padding: 16,
  },
  liveChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveBadge: {
    backgroundColor: '#FF4B4B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  liveTime: {
    marginLeft: 8,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  liveChatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  liveChatImageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  liveChatImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1D1E26',
  },
  viewerCountContainer: {
    height: 32,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    marginLeft: 8,
  },
  viewerCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  liveChatTextContainer: {
    marginBottom: 8,
  },
  liveChatMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 8,
  },
  liveStatsContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  liveStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  liveStatText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  joinLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6E69F4',
    padding: 12,
  },
  joinLiveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: '#6E69F4',
    padding: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default ChatScreen;