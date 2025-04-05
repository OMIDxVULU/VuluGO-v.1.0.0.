import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconFallback } from '../../app/_layout';
import SVGIcon from '../components/SVGIcon';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface ChatScreenProps {
  userId: string;
  name: string;
  avatar: string;
  goBack: () => void;
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

const ChatScreen = ({ userId, name, avatar, goBack }: ChatScreenProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => 
    DUMMY_MESSAGES.map(msg => 
      msg.senderId !== CURRENT_USER_ID ? { ...msg, senderName: name, senderAvatar: avatar } : msg
    )
  );
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isImagePickerVisible, setIsImagePickerVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const inputContainerRef = useRef<View>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Add new state for message actions
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [messageActionsVisible, setMessageActionsVisible] = useState(false);
  const actionSheetAnim = useRef(new Animated.Value(0)).current;
  
  // Add PanResponder for dragging down the action sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        if (gestureState.dy > 0) {
          // Only allow dragging down, not up
          actionSheetAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy > 50) {
          // If dragged more than 50px down, close the action sheet
          closeMessageActions();
        } else {
          // Otherwise, snap back to original position
          Animated.spring(actionSheetAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Show message actions method
  const showMessageActions = (message: Message) => {
    setSelectedMessage(message);
    setMessageActionsVisible(true);
    
    // Reset animation value first
    actionSheetAnim.setValue(0);
    
    // Animate action sheet sliding up
    Animated.timing(actionSheetAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Provide haptic feedback
    triggerHapticFeedback('longPress');
  };
  
  // Close message actions method
  const closeMessageActions = () => {
    // Animate action sheet sliding down
    Animated.timing(actionSheetAnim, {
      toValue: 500, // Fully off screen
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setMessageActionsVisible(false);
      setSelectedMessage(null);
    });
  };
  
  // Add state for message highlight animation
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messageAnimations = React.useRef(new Map());

  // Function to get or create animation value for a message
  const getMessageAnimation = (messageId: string) => {
    if (!messageAnimations.current.has(messageId)) {
      messageAnimations.current.set(messageId, new Animated.Value(0));
    }
    return messageAnimations.current.get(messageId);
  };

  // Function to animate message highlight
  const animateMessage = (messageId: string) => {
    setHighlightedMessageId(messageId);
    const animation = getMessageAnimation(messageId);
    
    // Reset animation value
    animation.setValue(0);
    
    // Sequence of animations: grow slightly, then shrink back
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 0.5,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Keep a subtle highlight after animation completes
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 500);
    });
  };

  // Function to handle long press on messages
  const handleLongPress = (message: Message) => {
    // Provide haptic feedback
    triggerHapticFeedback('longPress');
    
    // Animate the message
    animateMessage(message.id);
    
    // Show action sheet
    setTimeout(() => {
      showMessageActions(message);
    }, 50);
  };

  // Function to handle tap on messages
  const handleMessagePress = (message: Message) => {
    // Animate the message with a light tap animation
    animateMessage(message.id);
    
    // Provide subtle feedback
    triggerHapticFeedback('selection');
  };

  // Reply handler from action sheet
  const handleReplyFromActions = () => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
      closeMessageActions();
      // Add subtle feedback when initiating a reply
      triggerHapticFeedback('selection');
    }
  };
  
  // Edit handler (for own messages only)
  const handleEditMessage = () => {
    if (selectedMessage && selectedMessage.senderId === CURRENT_USER_ID) {
      // Set message text to the selected message
      setMessage(selectedMessage.text);
      
      // Enter edit mode
      setIsEditingMode(true);
      setEditingMessageId(selectedMessage.id);
      
      // Close the action sheet and focus the input
      closeMessageActions();
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
      
      // Add subtle feedback when editing
      triggerHapticFeedback('selection');
    }
  };
  
  // Delete handler (for own messages only)
  const handleDeleteMessage = () => {
    if (selectedMessage) {
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== selectedMessage.id)
      );
      closeMessageActions();
      // Add error-type feedback for destructive action
      triggerHapticFeedback('error');
    }
  };
  
  // Copy text handler
  const handleCopyText = () => {
    if (selectedMessage) {
      // In a real app, you would use Clipboard.setString
      // For this example we'll just close the action sheet
      closeMessageActions();
    }
  };

  // Function to detect mentions in the message
  const detectMentions = (text: string): Array<{id: string, name: string, startIndex: number, endIndex: number}> => {
    const mentions = [];
    // Simple regex to find @username patterns
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const name = match[1];
      // In a real app, you would look up the user ID based on the username
      // For this example, we'll assume the other user is always Sophia
      if (name.toLowerCase() === 'sophia') {
        mentions.push({
          id: 'otherUser1',
          name: 'Sophia',
          startIndex: match.index,
          endIndex: match.index + match[0].length - 1
        });
      }
    }
    
    return mentions;
  };
  
  // Fix edited message handling without using window references
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const handleSendMessage = () => {
    if (isEditingMode && editingMessageId && message.trim()) {
      // Update the existing message with the new text and mark as edited
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === editingMessageId 
            ? { ...msg, text: message, edited: true } 
            : msg
        )
      );
      
      // Clear input and exit edit mode
      setMessage('');
      setIsEditingMode(false);
      setEditingMessageId(null);
      // Add subtle feedback when editing
      triggerHapticFeedback('selection');
    } else if (message.trim()) {
      // Regular send message behavior
      const mentions = detectMentions(message);
      
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: CURRENT_USER_ID,
        senderName: CURRENT_USER_NAME,
        senderAvatar: CURRENT_USER_AVATAR,
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...(mentions.length > 0 && { mentions }),
        ...(replyingTo && { 
          replyTo: {
            id: replyingTo.id,
            senderId: replyingTo.senderId,
            senderName: replyingTo.senderName,
            text: replyingTo.text
          } 
        })
      };
      
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setMessage('');
      setReplyingTo(null);
      
      // Add subtle feedback when sending a message
      triggerHapticFeedback('selection');
      
      // Reliable scrolling to end after sending a message
      const scrollAttempts = [10, 50, 100, 300];
      scrollAttempts.forEach(delay => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, delay);
      });
    }
  };
  
  // Enhanced input focus handler with auto-scrolling removed
  const handleInputFocus = () => {
    setIsInputFocused(true);
  };
  
  // Enhanced reply handler with auto-scrolling removed
  const handleReply = (message: Message) => {
    setReplyingTo(message);
    
    // Focus the input after a short delay
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };
  
  // Function to add a reaction to a message
  const handleAddReaction = (messageId: string, emoji: string) => {
    // Trigger a subtle reaction haptic
    triggerHapticFeedback('reaction');
    
    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.id === messageId) {
          const existingReactions = msg.reactions || [];
          const existingReactionIndex = existingReactions.findIndex(r => r.emoji === emoji);
          
          if (existingReactionIndex >= 0) {
            // User already reacted with this emoji, toggle it off
            if (existingReactions[existingReactionIndex].userIds.includes(CURRENT_USER_ID)) {
              const updatedUserIds = existingReactions[existingReactionIndex].userIds.filter(id => id !== CURRENT_USER_ID);
              
              if (updatedUserIds.length === 0) {
                // Remove the reaction entirely if no users left
                return {
                  ...msg,
                  reactions: existingReactions.filter(r => r.emoji !== emoji)
                };
              }
              
              // Update the reaction with reduced count
              return {
                ...msg,
                reactions: existingReactions.map(r => 
                  r.emoji === emoji 
                    ? { ...r, count: r.count - 1, userIds: updatedUserIds }
                    : r
                )
              };
            } else {
              // Add current user to existing reaction
              return {
                ...msg,
                reactions: existingReactions.map(r => 
                  r.emoji === emoji 
                    ? { ...r, count: r.count + 1, userIds: [...r.userIds, CURRENT_USER_ID] }
                    : r
                )
              };
            }
          } else {
            // Add new reaction
            return {
              ...msg,
              reactions: [...existingReactions, { emoji, count: 1, userIds: [CURRENT_USER_ID] }]
            };
          }
        }
        return msg;
      })
    );
  };

  // Updated input focus handler
  const handleInputBlur = () => {
    setIsInputFocused(false);
  };
  
  const handleInputPress = () => {
    // This function handles tapping on the input area
    textInputRef.current?.focus();
    setIsInputFocused(true);
  };
  
  const handleImagePress = () => {
    // Toggle the image picker visibility
    setIsImagePickerVisible(!isImagePickerVisible);
    
    // If we're closing the picker, make sure to focus the input again
    if (isImagePickerVisible) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  };

  // Adjust keyboard offset to ensure proper spacing
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 10 : 0;

  // Helper function to render message text with mentions highlighted
  const renderMessageWithMentions = (text: string, mentions?: Array<{id: string, name: string, startIndex: number, endIndex: number}>) => {
    if (!mentions || mentions.length === 0) {
      return <Text style={styles.messageText}>{text}</Text>;
    }

    // Sort mentions by startIndex to process them in order
    const sortedMentions = [...mentions].sort((a, b) => a.startIndex - b.startIndex);
    
    const textParts = [];
    let lastIndex = 0;
    
    sortedMentions.forEach((mention, index) => {
      // Add text before the mention
      if (mention.startIndex > lastIndex) {
        textParts.push(
          <Text key={`text-${index}`} style={styles.messageText}>
            {text.substring(lastIndex, mention.startIndex)}
          </Text>
        );
      }
      
      // Add the mention with highlight styling
      textParts.push(
        <Text key={`mention-${index}`} style={styles.mentionText}>
          {text.substring(mention.startIndex, mention.endIndex + 1)}
        </Text>
      );
      
      lastIndex = mention.endIndex + 1;
    });
    
    // Add any remaining text after the last mention
    if (lastIndex < text.length) {
      textParts.push(
        <Text key={`text-last`} style={styles.messageText}>
          {text.substring(lastIndex)}
        </Text>
      );
    }
    
    return <Text style={styles.messageTextContainer}>{textParts}</Text>;
  };

  // Helper function to render message reactions
  const renderReactions = (reactions?: Array<{emoji: string, count: number, userIds: string[]}>) => {
    if (!reactions || reactions.length === 0) return null;
    
    return (
      <View style={styles.reactionsContainer}>
        {reactions.map((reaction, index) => (
          <TouchableOpacity 
            key={`${reaction.emoji}-${index}`} 
            style={[styles.reactionBubble, reaction.userIds.includes(CURRENT_USER_ID) && styles.reactionBubbleSelected]}
          >
            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            <Text style={[styles.reactionCount, reaction.userIds.includes(CURRENT_USER_ID) && styles.reactionCountSelected]}>
              {reaction.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Helper function to render message attachments
  const renderAttachments = (attachments?: Array<{id: string, type: string, url: string, width?: number, height?: number}>) => {
    if (!attachments || attachments.length === 0) return null;
    
    return (
      <View style={styles.attachmentsContainer}>
        {attachments.map((attachment) => {
          if (attachment.type === 'image') {
            return (
              <TouchableOpacity key={attachment.id} style={styles.imageAttachmentContainer}>
                <Image 
                  source={{ uri: attachment.url }} 
                  style={[styles.imageAttachment, attachment.width && attachment.height ? 
                    { aspectRatio: attachment.width / attachment.height } : null]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            );
          }
          return null; // Handle other attachment types if needed
        })}
      </View>
    );
  };

  // Helper function to render reply reference
  const renderReplyReference = (replyTo?: {id: string, senderId: string, senderName: string, text: string}) => {
    if (!replyTo) return null;
    
    const isReplyToCurrentUser = replyTo.senderId === CURRENT_USER_ID;
    
    return (
      <View style={styles.replyContainer}>
        <View style={styles.replyBar} />
        <View style={styles.replyContent}>
          <Text style={[
            styles.replyUsername,
            isReplyToCurrentUser && { color: '#00b0f4' }
          ]}>
            {replyTo.senderName}
          </Text>
          <Text style={styles.replyText} numberOfLines={1}>
            {replyTo.text}
          </Text>
        </View>
      </View>
    );
  };

  // Add at the component level:
  // Message animation values
  const [messageScaleValues, setMessageScaleValues] = useState<Record<string, Animated.Value>>({});
  
  // Initialize animation value for new messages
  useEffect(() => {
    const newScaleValues: Record<string, Animated.Value> = {};
    messages.forEach(msg => {
      if (!messageScaleValues[msg.id]) {
        newScaleValues[msg.id] = new Animated.Value(1);
      }
    });
    
    if (Object.keys(newScaleValues).length > 0) {
      setMessageScaleValues(prev => ({...prev, ...newScaleValues}));
    }
  }, [messages]);

  // Render message in Discord style without hooks inside
  const renderMessage = (message: Message, index: number) => {
    const isOwnMessage = message.senderId === CURRENT_USER_ID;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showSenderInfo = !previousMessage || previousMessage.senderId !== message.senderId || 
      (new Date(message.timestamp).getTime() - new Date(previousMessage.timestamp).getTime() > 5 * 60 * 1000);
    
    // Get animation scale value from component state
    const scaleValue = messageScaleValues[message.id] || new Animated.Value(1);
    
    // Message press handler
    const onMessagePress = () => {
      triggerHapticFeedback('light');
      animateMessagePress(message.id);
    };
    
    // Message long press handler
    const onMessageLongPress = () => {
      triggerHapticFeedback('medium');
      setSelectedMessage(message);
      setMessageActionsVisible(true);
      showActionSheet();
      setHighlightedMessageId(message.id);
      animateMessageLongPress(message.id);
    };
    
    return (
      <Animated.View
        key={message.id}
        style={[
          styles.discordMessageContainer,
          highlightedMessageId === message.id && styles.highlightedMessage,
          { transform: [{ scale: scaleValue }] }
        ]}
      >
        {/* User Avatar - Always show left, but can be empty space if continuing same user */}
        {showSenderInfo ? (
          <View style={styles.discordAvatar}>
            <Image
              source={
                isOwnMessage 
                ? require('../../assets/images/react-logo.png')
                : message.senderAvatar 
                  ? { uri: message.senderAvatar } 
                  : require('../../assets/images/splash-icon.png')
              }
              style={styles.avatarImage}
            />
          </View>
        ) : (
          <View style={styles.discordAvatarPlaceholder} />
        )}
        
        {/* Message Content */}
        <View style={styles.discordMessageContent}>
          {showSenderInfo && (
            <View style={styles.discordMessageHeader}>
              <Text style={[
                styles.discordUsername,
                isOwnMessage && { color: '#00b0f4' } // Blue for own name
              ]}>
                {isOwnMessage ? 'You' : message.senderName || 'User'}
              </Text>
              <Text style={styles.discordTimestamp}>
                {formatTimestamp(message.timestamp)}
              </Text>
            </View>
          )}
          
          <TouchableWithoutFeedback
            onPress={onMessagePress}
            onLongPress={onMessageLongPress}
            delayLongPress={300}
          >
            <View style={styles.messageBubble}>
              {message.replyTo && (
                <View style={styles.replyPreview}>
                  <Text style={styles.replyPreviewText}>
                    Replying to{' '}
                    <Text style={styles.replyPreviewName}>
                      {message.replyTo.senderName}
                    </Text>
                  </Text>
                  <Text style={styles.replyPreviewContent} numberOfLines={1}>
                    {message.replyTo.text}
                  </Text>
                </View>
              )}
              
              {renderMessageWithMentions(message.text, message.mentions)}
              {message.edited && (
                <Text style={styles.editedLabel}>(edited)</Text>
              )}
              
              {message.attachments && message.attachments.length > 0 && (
                <View style={styles.attachmentsContainer}>
                  {message.attachments.map((attachment) => (
                    <TouchableOpacity 
                      key={attachment.id}
                      style={styles.imageAttachmentContainer}
                      onPress={() => {
                        // Handle image press
                      }}
                    >
                      <Image 
                        source={{ uri: attachment.url }}
                        style={styles.imageAttachment}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {message.reactions && message.reactions.length > 0 && (
                <View style={styles.reactionsContainer}>
                  {message.reactions.map((reaction, i) => (
                    <TouchableOpacity 
                      key={`${reaction.emoji}-${i}`}
                      style={[
                        styles.reactionBubble,
                        reaction.userIds.includes(CURRENT_USER_ID) && styles.reactionBubbleSelected
                      ]}
                      onPress={() => handleToggleReaction(message.id, reaction.emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                      <Text style={styles.reactionCount}>{reaction.count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Animated.View>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={goBack}
        >
          {renderIcon('arrow-back', 24, '#FFFFFF')}
        </TouchableOpacity>
        
        <View style={styles.headerProfileContainer}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: avatar }} 
              style={styles.headerAvatar} 
            />
            <View style={[
              styles.onlineStatusIndicator, 
              { backgroundColor: '#43b581' } // Green for online
            ]} />
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>{name}</Text>
            <Text style={styles.headerSubtitle}>Online</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            {renderIcon('more-vert', 24, '#FFFFFF')}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAddFriendBar = () => {
    return (
      <View style={styles.addFriendBar}>
        <View style={styles.shareOptionsRow}>
          <TouchableOpacity style={styles.shareOption}>
            <View style={styles.shareIconContainer}>
              {renderIcon('share', 20, '#FFFFFF')}
            </View>
            <Text style={styles.shareOptionText}>Share/Invite</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <View style={[styles.shareIconContainer, { backgroundColor: '#4299E1' }]}>
              {renderIcon('link', 20, '#FFFFFF')}
            </View>
            <Text style={styles.shareOptionText}>Copy Link</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <View style={[styles.shareIconContainer, { backgroundColor: '#9F7AEA' }]}>
              {renderIcon('message', 20, '#FFFFFF')}
            </View>
            <Text style={styles.shareOptionText}>Messages</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <View style={[styles.shareIconContainer, { backgroundColor: '#38B2AC' }]}>
              {renderIcon('email', 20, '#FFFFFF')}
            </View>
            <Text style={styles.shareOptionText}>Email</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <View style={[styles.shareIconContainer, { backgroundColor: '#4299E1' }]}>
              {renderIcon('facebook', 20, '#FFFFFF')}
            </View>
            <Text style={styles.shareOptionText}>Messenger</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <View style={[styles.shareIconContainer, { backgroundColor: '#48BB78' }]}>
              {renderIcon('send', 20, '#FFFFFF')}
            </View>
            <Text style={styles.shareOptionText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.addByUsernameContainer}>
          <Text style={styles.addByUsernameTitle}>Add by username</Text>
          <Text style={styles.addByUsernameSubtitle}>Who would you like to add as a friend?</Text>
          
          <View style={styles.usernameInputContainer}>
            <TextInput
              style={styles.usernameInput}
              placeholder="Enter your username"
              placeholderTextColor="#8E8E93"
              multiline
              autoFocus
            />
          </View>
          
          <Text style={styles.byTheWayText}>By the way, your username is <Text style={styles.usernameHighlight}>@amidulu</Text></Text>
          
          <TouchableOpacity style={styles.sendFriendRequestButton}>
            <Text style={styles.sendFriendRequestText}>Send Friend Request</Text>
          </TouchableOpacity>
          
          <View style={styles.friendRequestsContainer}>
            <View style={styles.friendRequestHeader}>
              <Text style={styles.friendRequestTitle}>Friend Request sent</Text>
            </View>
            
            <View style={styles.friendRequestItem}>
              <Image 
                source={{ uri: 'https://randomuser.me/api/portraits/women/5.jpg' }}
                style={styles.friendAvatar}
              />
              <Text style={styles.friendName}>Sophia</Text>
              <Text style={styles.friendUsername}>@sophia2000</Text>
              <TouchableOpacity style={styles.cancelButton}>
                {renderIcon('close', 16, '#FFFFFF')}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Replace LiveChatPreview to use the renderIcon helper
  const renderLiveChatPreview = () => {
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
          {renderIcon('arrow-back', 18, '#FFFFFF')}
        </TouchableOpacity>
      </View>
    );
  };

  // Updated to use SVGIcon instead of various icon libraries
  const renderIcon = (iconName: string, size: number, color: string) => {
    // Map commonly used icons to SVGIcon names
    const iconMap: {[key: string]: string} = {
      'arrow-back': 'arrow-back',
      'chevron-left': 'arrow-back',
      'send': 'send',
      'camera': 'camera',
      'image': 'image',
      'emoji-emotions': 'emoji-emotions',
      'photo-library': 'photo-library',
      'mic': 'mic',
      'gif': 'gif',
      'visibility': 'visibility',
      'chat': 'chat',
      'more-vert': 'more-vert',
      'close': 'close',
      'reply': 'reply',
      'content-copy': 'content-copy',
      'edit': 'edit',
      'delete': 'delete',
      'forward': 'forward',
      'check': 'check',
    };

    const mappedName = iconMap[iconName] || iconName;
    
    try {
      // Try to use our SVGIcon if we have the icon
      return <SVGIcon name={mappedName as any} size={size} color={color} />;
    } catch (error) {
      // Fallback to a placeholder for missing icons
      console.log(`Icon not found: ${iconName}, mapped to ${mappedName}`);
      return (
        <View 
          style={{
            width: size,
            height: size,
            backgroundColor: color === '#FFFFFF' ? '#666' : '#333',
            borderRadius: size / 2
          }}
        />
      );
    }
  };

  // Simple keyboard listener to scroll when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        // Use a sequence of attempts to ensure scrolling works
        [50, 200, 350].forEach(delay => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, delay);
        });
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  // Update container styles for absolute minimal space
  const container: {
    flex: 1,
    backgroundColor: '#36393f',
  } = {
    flex: 1,
    backgroundColor: '#36393f',
  };
  
  // Message action sheet component
  const renderMessageActionSheet = () => {
    const isOwnMessage = selectedMessage?.senderId === CURRENT_USER_ID;
    
    return (
      <Modal
        visible={messageActionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMessageActions}
      >
        <TouchableWithoutFeedback onPress={closeMessageActions}>
          <View style={styles.modalBackground}>
            <Animated.View
              style={[
                styles.actionSheetContainer,
                {
                  transform: [{ 
                    translateY: actionSheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 500]
                    }) 
                  }],
                },
              ]}
            >
              <View {...panResponder.panHandlers}>
                <View style={styles.actionSheetHandle} />
                
                <View style={styles.actionSheetReactions}>
                  <TouchableOpacity 
                    style={styles.reactionButton}
                    onPress={() => {
                      if (selectedMessage) {
                        handleAddReaction(selectedMessage.id, '❤️');
                        triggerHapticFeedback('reaction');
                        closeMessageActions();
                      }
                    }}
                  >
                    <Text style={styles.actionSheetReactionEmoji}>❤️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.reactionButton}
                    onPress={() => {
                      if (selectedMessage) {
                        handleAddReaction(selectedMessage.id, '😂');
                        triggerHapticFeedback('reaction');
                        closeMessageActions();
                      }
                    }}
                  >
                    <Text style={styles.actionSheetReactionEmoji}>😂</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.reactionButton}
                    onPress={() => {
                      if (selectedMessage) {
                        handleAddReaction(selectedMessage.id, '👍');
                        triggerHapticFeedback('reaction');
                        closeMessageActions();
                      }
                    }}
                  >
                    <Text style={styles.actionSheetReactionEmoji}>👍</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.reactionButton}
                    onPress={() => {
                      if (selectedMessage) {
                        handleAddReaction(selectedMessage.id, '🙊');
                        triggerHapticFeedback('reaction');
                        closeMessageActions();
                      }
                    }}
                  >
                    <Text style={styles.actionSheetReactionEmoji}>🙊</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.reactionButton}
                    onPress={() => {
                      if (selectedMessage) {
                        handleAddReaction(selectedMessage.id, '🐸');
                        triggerHapticFeedback('reaction');
                        closeMessageActions();
                      }
                    }}
                  >
                    <Text style={styles.actionSheetReactionEmoji}>🐸</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.reactionButton}
                    onPress={() => {
                      if (selectedMessage) {
                        handleAddReaction(selectedMessage.id, '😊');
                        triggerHapticFeedback('reaction');
                        closeMessageActions();
                      }
                    }}
                  >
                    <Text style={styles.actionSheetReactionEmoji}>😊</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.actionDivider} />
                
                {/* Common actions for all messages */}
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => {
                    handleReplyFromActions();
                    triggerHapticFeedback('light');
                  }}
                >
                  {renderIcon('reply', 24, '#B9BBBE')}
                  <Text style={styles.actionText}>Reply</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => {
                    handleCopyText();
                    triggerHapticFeedback('light');
                  }}
                >
                  {renderIcon('content-copy', 24, '#B9BBBE')}
                  <Text style={styles.actionText}>Copy Text</Text>
                </TouchableOpacity>
                
                {/* Actions only for own messages */}
                {isOwnMessage && (
                  <>
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={() => {
                        handleEditMessage();
                        triggerHapticFeedback('light');
                      }}
                    >
                      {renderIcon('edit', 24, '#B9BBBE')}
                      <Text style={styles.actionText}>Edit Message</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={() => {
                        handleDeleteMessage();
                        triggerHapticFeedback('warning');
                      }}
                    >
                      {renderIcon('delete', 24, '#ED4245')}
                      <Text style={[styles.actionText, { color: '#ED4245' }]}>Delete Message</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // Format timestamp to Discord style
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Animation helpers
  const animateMessagePress = (messageId: string) => {
    const animation = messageScaleValues[messageId];
    if (animation) {
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(animation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true
        })
      ]).start();
    }
  };

  const animateMessageLongPress = (messageId: string) => {
    const animation = messageScaleValues[messageId];
    if (animation) {
      Animated.timing(animation, {
        toValue: 1.03,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  };

  // Show action sheet with animation
  const showActionSheet = () => {
    Animated.timing(actionSheetAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  // Helper function to toggle reaction on a message
  const handleToggleReaction = (messageId: string, emoji: string) => {
    // Implementation depends on your app's state management
    triggerHapticFeedback('selection');
    console.log(`Toggled reaction ${emoji} on message ${messageId}`);
  };

  // Adapt renderMessage to work with FlatList's renderItem
  const renderItem = ({ item, index }: { item: Message, index: number }) => {
    if (item.isLive) {
      return renderLiveChatPreview();
    }
    return renderMessage(item, index);
  };

  return (
    <SafeAreaView style={container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.chatContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={messages.length}
            />
            
            {/* Input container - NOT absolutely positioned */}
            <View style={styles.inputWrapper}>
              <View style={[styles.inputContainerWrapper, { 
                borderTopWidth: 1,
                borderTopColor: '#202225',
              }]}>
                {/* Reply interface */}
                {replyingTo && (
                  <View style={styles.replyingContainer}>
                    <View style={styles.replyingContent}>
                      <View style={styles.replyingBar} />
                      <View style={styles.replyingTextContainer}>
                        <Text style={styles.replyingToText}>Replying to </Text>
                        <Text style={styles.replyingToName}>{replyingTo.senderName}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.closeReplyButton} onPress={() => setReplyingTo(null)}>
                      {renderIcon('close', 16, '#B9BBBE')}
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Discord-style input area */}
                <View style={styles.discordInputContainer}>
                  {/* Input field with emoji button inside */}
                  <View style={[styles.discordInputFieldContainer, { flex: 1 }]}>
                    <View style={styles.inputWithEmojiContainer}>
                      <TextInput
                        ref={textInputRef}
                        style={[styles.discordInputField, { flex: 1 }]}
                        placeholder={`Message ${name}`}
                        placeholderTextColor="#72767D"
                        value={message}
                        onChangeText={setMessage}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        autoCapitalize="none"
                        spellCheck={false}
                        keyboardAppearance="dark"
                        multiline
                        numberOfLines={Platform.OS === 'ios' ? undefined : 1}
                        textAlignVertical="center"
                      />
                      {/* Emoji button inside text field */}
                      <TouchableOpacity 
                        style={styles.inlineEmojiButton}
                        onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        {renderIcon('emoji-emotions', 22, '#B9BBBE')}
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* Right side - only image and send buttons */}
                  <View style={styles.discordInputRightButtons}>
                    <TouchableOpacity 
                      style={styles.discordInputButton}
                      onPress={handleImagePress}
                    >
                      {renderIcon('image', 24, '#B9BBBE')}
                    </TouchableOpacity>
                    
                    {message.trim() ? (
                      <TouchableOpacity
                        style={[styles.discordInputButton, styles.sendButton]}
                        onPress={handleSendMessage}
                      >
                        {renderIcon(isEditingMode ? 'check' : 'send', 24, '#FFFFFF')}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                
                {/* Image picker UI */}
                {isImagePickerVisible && (
                  <View style={styles.discordAttachmentPicker}>
                    <TouchableOpacity style={styles.attachmentOption}>
                      <View style={styles.attachmentIconContainer}>
                        {renderIcon('camera', 24, '#FFFFFF')}
                      </View>
                      <Text style={styles.attachmentText}>Camera</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.attachmentOption}>
                      <View style={[styles.attachmentIconContainer, {backgroundColor: '#5865F2'}]}>
                        {renderIcon('photo-library', 24, '#FFFFFF')}
                      </View>
                      <Text style={styles.attachmentText}>Gallery</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.attachmentOption}>
                      <View style={[styles.attachmentIconContainer, {backgroundColor: '#43B581'}]}>
                        {renderIcon('file', 24, '#FFFFFF')}
                      </View>
                      <Text style={styles.attachmentText}>File</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Emoji picker UI */}
                {showEmojiPicker && (
                  <View style={styles.discordEmojiPicker}>
                    <View style={styles.emojiPickerHeader}>
                      <Text style={styles.emojiPickerTitle}>Frequently Used</Text>
                    </View>
                    <View style={styles.emojiGrid}>
                      {['😊', '👍', '❤️', '🔥', '😂', '🎉', '🙌', '👏', '🤔', '😍', '😎', '🙏', '👀', '💯', '🤣'].map(emoji => (
                        <TouchableOpacity 
                          key={emoji} 
                          style={styles.emojiItem}
                          onPress={() => {
                            setMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                        >
                          <Text style={styles.emojiText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
      
      {/* Render the message action sheet */}
      {renderMessageActionSheet()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#36393f',
  },
  keyboardContainer: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    position: 'relative',
  },
  messagesContainer: {
    paddingTop: 10,
    paddingBottom: 88, // Give some space at the bottom for the input container
  },
  inputWrapper: {
    backgroundColor: '#36393F',
    borderTopWidth: 1,
    borderTopColor: '#202225',
    width: '100%',
  },
  inputContainerWrapper: {
    backgroundColor: '#36393F',
    borderTopWidth: 1,
    borderTopColor: '#202225',
    width: '100%',
    padding: 0,
    margin: 0,
  },
  discordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#36393F',
    minHeight: 52,
    margin: 0,
  },
  discordInputLeftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discordInputRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discordInputButton: {
    width: 36, // Medium size (between 34 and 38)
    height: 36, // Medium size (between 34 and 38)
    borderRadius: 18, // Half of width/height
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
  },
  discordInputFieldContainer: {
    flex: 1,
    backgroundColor: '#40444B',
    borderRadius: 8,
    marginHorizontal: 6,
    paddingHorizontal: 12,
    minHeight: 44,
    maxHeight: 100,
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  discordInputField: {
    color: '#DCDDDE',
    fontSize: 18,
    padding: Platform.OS === 'ios' ? 12 : 8,
    margin: 0,
    lineHeight: 24,
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: '#5865F2',
  },
  discordAttachmentPicker: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#2F3136',
    borderTopWidth: 1,
    borderTopColor: '#202225',
  },
  attachmentOption: {
    alignItems: 'center',
    marginRight: 20,
  },
  attachmentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentText: {
    color: '#B9BBBE',
    fontSize: 12,
  },
  discordEmojiPicker: {
    backgroundColor: '#2F3136',
    borderTopWidth: 1,
    borderTopColor: '#202225',
    padding: 16,
    maxHeight: 250,
  },
  emojiPickerHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#202225',
    paddingBottom: 8,
    marginBottom: 8,
  },
  emojiPickerTitle: {
    color: '#B9BBBE',
    fontSize: 14,
    fontWeight: '600',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emojiItem: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  emojiText: {
    fontSize: 24,
  },
  messageText: {
    fontSize: 16,
    color: '#dcddde',
    lineHeight: 22,
  },
  mentionText: {
    fontSize: 16,
    backgroundColor: 'rgba(88, 101, 242, 0.3)',
    color: '#00aff4',
    borderRadius: 3,
    overflow: 'hidden',
    fontWeight: '500',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingLeft: 8,
  },
  replyBar: {
    width: 2,
    height: '100%',
    backgroundColor: '#4F545C',
    marginRight: 8,
    borderRadius: 1,
  },
  replyContent: {
    flex: 1,
  },
  replyUsername: {
    color: '#B9BBBE',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  replyText: {
    color: '#72767D',
    fontSize: 12,
  },
  attachmentsContainer: {
    marginTop: 8,
  },
  imageAttachmentContainer: {
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  imageAttachment: {
    width: '100%',
    height: 200,
    borderRadius: 3,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2F3136',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#4F545C',
  },
  reactionBubbleSelected: {
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
    borderColor: '#5865F2',
  },
  reactionEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  reactionCount: {
    color: '#B9BBBE',
    fontSize: 12,
    fontWeight: '500',
  },
  reactionCountSelected: {
    color: '#5865F2',
  },
  messageActionsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    right: 0,
    top: -30,
    backgroundColor: '#36393F',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#202225',
    paddingVertical: 4,
    paddingHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageAction: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  replyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2F3136',
    borderTopWidth: 1,
    borderTopColor: '#202225',
  },
  replyingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  replyingBar: {
    width: 4,
    height: 20,
    backgroundColor: '#5865F2',
    borderRadius: 2,
    marginRight: 8,
  },
  replyingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyingToText: {
    color: '#B9BBBE',
    fontSize: 14,
  },
  replyingToName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  closeReplyButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F545C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#1C1D23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2f33',
    backgroundColor: '#36393f',
  },
  backButton: {
    marginRight: 8,
  },
  headerProfileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
  onlineStatusIndicator: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#43b581', // Green for online
    borderWidth: 2,
    borderColor: '#36393f',
    bottom: -1,
    right: -1,
    zIndex: 1,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#b9bbbe',
    fontSize: 12,
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  flatListStyle: {
    flex: 1,
  },
  discordMessageContainer: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 2,
    alignItems: 'flex-start',
  },
  discordMessageGroupStart: {
    marginTop: 16,
  },
  discordAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  discordAvatarPlaceholder: {
    width: 40,
    marginRight: 10,
  },
  discordMessageContent: {
    flex: 1,
    flexDirection: 'column',
    maxWidth: '90%',
  },
  discordMessageHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  discordUsername: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 6,
  },
  discordTimestamp: {
    color: '#72767d',
    fontSize: 12,
  },
  replyPreview: {
    padding: 8,
    backgroundColor: 'rgba(64, 68, 75, 0.3)',
    borderRadius: 5,
    marginBottom: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#43b581',
  },
  replyPreviewText: {
    color: '#b9bbbe',
    fontSize: 12,
  },
  replyPreviewName: {
    color: '#00b0f4',
    fontWeight: '500',
  },
  replyPreviewContent: {
    color: '#dcddde',
    fontSize: 14,
    marginTop: 2,
  },
  highlightedMessage: {
    backgroundColor: 'rgba(79, 84, 92, 0.16)',
  },
  inputContainerFigma: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  iconButtonFigma: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  textInputAreaFigma: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25272E',
    borderRadius: 22,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    minHeight: 44,
  },
  inputFigma: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    fontSize: 16,
    color: '#C7C8CE',
  },
  emojiButtonFigma: {
    paddingLeft: 4,
    alignSelf: 'center',
  },
  liveChatContainer: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  liveChatContent: {
    padding: 16,
  },
  liveChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  liveTime: {
    color: '#8E8E93',
    fontSize: 12,
  },
  liveChatImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  liveChatImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  viewerCountContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  viewerCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  liveChatTextContainer: {
    marginBottom: 12,
  },
  liveChatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  liveChatMessage: {
    fontSize: 14,
    color: '#D1D1D6',
    marginBottom: 8,
    lineHeight: 20,
  },
  liveStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#5865F2',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  joinLiveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addFriendBar: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    padding: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  shareOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  shareOption: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 16,
  },
  shareIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shareOptionText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  addByUsernameContainer: {
    marginTop: 8,
  },
  addByUsernameTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  addByUsernameSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  usernameInputContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  usernameInput: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  byTheWayText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  usernameHighlight: {
    color: '#6C5CE7',
    fontWeight: '600',
  },
  sendFriendRequestButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sendFriendRequestText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  friendRequestsContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  friendRequestHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  friendRequestTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  friendRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  friendName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  friendUsername: {
    color: '#8E8E93',
    fontSize: 12,
    flex: 1,
    marginLeft: 8,
  },
  cancelButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerContainer: {
    backgroundColor: '#2C2C2E',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3C',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  imagePickerOption: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    width: 60,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#36373D',
    paddingVertical: 10,
  },
  imagePickerText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  inputWithEmojiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inlineEmojiButton: {
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#2f3136',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 30,
  },
  actionSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#72767d',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 10,
  },
  actionSheetReactions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  reactionButton: {
    padding: 8,
    backgroundColor: '#40444b',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  actionSheetReactionEmoji: {
    fontSize: 24,
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#40444b',
    marginVertical: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#dcddde',
    marginLeft: 16,
  },
  messageTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  messageBubble: {
    backgroundColor: 'transparent',
    paddingVertical: 2,
    paddingHorizontal: 0,
    maxWidth: '100%',
    borderRadius: 4,
  },
  editedLabel: {
    fontSize: 12,
    color: '#72767d',
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default ChatScreen;