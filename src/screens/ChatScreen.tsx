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
import { useGuestRestrictions } from '../hooks/useGuestRestrictions';
import { firestoreService } from '../services/firestoreService';
import { UnifiedMessage, MessageConverter } from '../services/types';
import { ChatOperations, chatSubscriptionManager } from '../utils/chatUtils';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState, MessageSkeletonLoader, useErrorHandler } from '../components/ErrorHandling';
import { MessageValidator } from '../utils/chatUtils';

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
  const { canSendMessages } = useGuestRestrictions();
  const { user: currentUser } = useAuth();

  // Real chat state
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Error handling
  const { error, loading: sendingMessage, handleError, clearError, withErrorHandling } = useErrorHandler();

  // Legacy state for backward compatibility
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
  
  // Load conversation and messages
  useEffect(() => {
    let isMounted = true;
    let unsubscribeMessages: (() => void) | null = null;

    const loadConversation = async () => {
      if (!currentUser || !userId) return;

      try {
        setIsLoading(true);
        clearError();

        // Create or get conversation
        const conversation = await firestoreService.getConversationByParticipants([currentUser.uid, userId]);

        if (!isMounted) return;

        if (conversation) {
          setConversationId(conversation.id);

          // Load existing messages
          const existingMessages = await firestoreService.getConversationMessages(conversation.id);
          const unifiedMessages = existingMessages.map(MessageConverter.fromDirectMessage);

          if (isMounted) {
            setMessages(unifiedMessages);
          }

          // Set up real-time listener
          unsubscribeMessages = firestoreService.onConversationMessages(conversation.id, (newMessages) => {
            if (!isMounted) return;
            const unifiedMessages = newMessages.map(MessageConverter.fromDirectMessage);
            setMessages(unifiedMessages);
          });

        } else {
          // Create new conversation
          const newConversationId = await firestoreService.createConversation(
            [currentUser.uid, userId],
            {
              [currentUser.uid]: currentUser.displayName || 'You',
              [userId]: name
            },
            {
              [currentUser.uid]: currentUser.photoURL || 'https://randomuser.me/api/portraits/lego/1.jpg',
              [userId]: avatar || 'https://randomuser.me/api/portraits/women/2.jpg'
            }
          );

          if (isMounted) {
            setConversationId(newConversationId);
          }
        }

      } catch (error: any) {
        console.error('Error loading conversation:', error);
        if (isMounted) {
          handleError('Failed to load conversation');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadConversation();

    // Cleanup function
    return () => {
      isMounted = false;
      if (unsubscribeMessages) {
        // Capture the current conversationId to avoid stale closure
        const currentConversationId = conversationId;
        if (currentConversationId) {
          chatSubscriptionManager.unsubscribe(`conversation-${currentConversationId}`);
        }
        unsubscribeMessages();
      }
    };
  }, [userId, currentUser, name, avatar]);

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

  const keyExtractor = (item: UnifiedMessage) => item.id;

  const getItemLayout = (data: UnifiedMessage[], index: number) => ({
    length: 80,
    offset: 80 * index,
    index,
  });

  const renderMessageItem = useCallback(({ item, index }: { item: UnifiedMessage, index: number }) => {
    // Check if the previous message is from the same sender
    const isGroupedMessage = index > 0 &&
      messages[index - 1] &&
      messages[index - 1].senderId === item.senderId;

    // Convert UnifiedMessage to format expected by Message component
    const messageComponentFormat = MessageConverter.toMessageComponentFormat(
      item,
      currentUser?.uid
    );

    return (
      <View style={{ marginTop: isGroupedMessage ? -8 : 8 }}>
        <Message
          id={messageComponentFormat.id}
          text={messageComponentFormat.text}
          time={messageComponentFormat.time}
          type={messageComponentFormat.type}
          status={messageComponentFormat.status}
          reactions={messageComponentFormat.reactions}
          attachments={messageComponentFormat.attachments}
          showAvatar={!isGroupedMessage}
          showName={!isGroupedMessage}
          userName={messageComponentFormat.userName}
          userAvatar={messageComponentFormat.userAvatar}
        />
      </View>
    );
  }, [messages, name, avatar, currentUser]);

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
          initialNumToRender={15}
          maxToRenderPerBatch={8}
          windowSize={10}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={100}
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
  const handleSendMessage = async (text: string) => {
    // Check if user can send messages (guest restriction)
    if (!canSendMessages()) {
      handleError('You must be logged in to send messages');
      return;
    }

    if (!currentUser || !conversationId) {
      handleError('Cannot send message: conversation not loaded');
      return;
    }

    if (!text.trim()) {
      return;
    }

    // Validate message
    const validation = MessageValidator.validateMessage(text);
    if (!validation.isValid) {
      handleError(validation.error || 'Invalid message');
      return;
    }

    const messageData = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'You',
      senderAvatar: currentUser.photoURL || 'https://randomuser.me/api/portraits/lego/1.jpg',
      recipientId: userId,
      text: text.trim()
    };

    // Use the error handling wrapper
    await withErrorHandling(
      async () => {
        await ChatOperations.sendMessage(conversationId, messageData);
        // Messages will be updated via real-time listener
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      },
      'Failed to send message'
    );
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
        
        {/* Messages List with loading and error states */}
        {isLoading ? (
          <MessageSkeletonLoader />
        ) : error ? (
          <ErrorState
            error={error}
            onRetry={() => {
              clearError();
              // Reload the conversation by resetting the effect
              setIsLoading(true);
              setMessages([]);
              setConversationId(null);
            }}
            onBack={handleNavigation}
          />
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
});export default ChatScreen;

