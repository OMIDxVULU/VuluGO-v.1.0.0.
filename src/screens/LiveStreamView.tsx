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
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text as PaperText, Avatar, Button } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useUserProfile } from '../context/UserProfileContext';
import { useLoopProtection } from '../FixInfiniteLoop';

const { width, height } = Dimensions.get('window');

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
        {renderReplyPreview()}
        
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
    <View style={styles.participantContainer}>
      {/* Speaking animation */}
      {participant.isSpeaking && (
        <Animated.View 
          style={[
            styles.speakingAnimation,
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
      
      <View style={styles.participantImageContainer}>
        {participant.placeholder ? (
          <LinearGradient
            colors={['#FF6CAA', '#FF3C8C']} 
            style={styles.placeholderBackground}
          >
            <Image
              source={{ uri: participant.avatar }}
              style={styles.catIcon} 
              resizeMode="contain"
            />
          </LinearGradient>
        ) : (
          <Image
            source={{ uri: participant.avatar }}
            style={styles.participantImage}
          />
        )}
      </View>
      <Text style={styles.participantName}>
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
  
  const streamTitle = params.title as string || 'Live Audio Room';
  const userProfileImage = profileImage || 'https://randomuser.me/api/portraits/men/32.jpg';
  
  // State variables
  const [participants, setParticipants] = useState<Participant[]>(MOCK_PARTICIPANTS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [messageText, setMessageText] = useState('');
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  // Add reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  // Animation refs
  const slideAnim = useRef<Animated.Value>(new Animated.Value(Dimensions.get('window').width)).current;
  const [currentSlideValue, setCurrentSlideValue] = useState<number>(Dimensions.get('window').width);
  const fadeAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const chatListRef = useRef<ScrollView>(null);
  
  // Speaking animation refs
  const speakingAnimationRefs = useRef<Animated.Value[]>(MOCK_PARTICIPANTS.map(() => new Animated.Value(0)));
  
  // Add new state variables for mention suggestions
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [filteredMentions, setFilteredMentions] = useState<Participant[]>([]);
  
  // Add mention animation ref
  const mentionAnimRef = useRef(new Animated.Value(0)).current;
  
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
  
  // Pan responder for info panel swipe
  const panResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if ((!isInfoPanelVisible && gestureState.dx < -50) || (isInfoPanelVisible && gestureState.dx > 50)) {
          slideAnim.setValue(isInfoPanelVisible ? gestureState.dx : Dimensions.get('window').width + gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if ((!isInfoPanelVisible && gestureState.dx < -100) || (isInfoPanelVisible && gestureState.dx > 100)) {
          toggleInfoPanel();
        } else {
          Animated.spring(slideAnim, {
            toValue: isInfoPanelVisible ? 0 : Dimensions.get('window').width,
            useNativeDriver: false,
          }).start();
        }
      },
    }),
  [isInfoPanelVisible, slideAnim]);
  
  // Toggle info panel visibility
  const toggleInfoPanel = () => {
    const toValue = isInfoPanelVisible ? Dimensions.get('window').width : 0;
    setIsInfoPanelVisible(!isInfoPanelVisible);
    Animated.timing(slideAnim, {
      toValue,
      duration: 250,
      useNativeDriver: false, 
    }).start();
  };
  
  // Function to handle message input changes with mention detection
  const handleMessageChange = (text: string) => {
    setMessageText(text);
    
    // Check for @ symbol to trigger mention suggestions
    const matches = text.match(/@(\w*)$/);
    if (matches) {
      const query = matches[1].toLowerCase();
      setMentionQuery(query);
      
      // Filter participants based on query
      const filtered = participants.filter(p => 
        p.name.toLowerCase().includes(query)
      ).slice(0, 5); // Limit to 5 suggestions
      
      setFilteredMentions(filtered);
    } else {
      // Clear mention state when no @ is being typed
      setMentionQuery(null);
      setFilteredMentions([]);
    }
  };

  // Enhance the selectMention function with animation
  const selectMention = (participant: Participant) => {
    // Replace the @query with the selected username
    const currentText = messageText;
    const atIndex = currentText.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const newText = currentText.substring(0, atIndex) + `@${participant.name} `;
      setMessageText(newText);
    }
    
    // Clear mention suggestions
    setMentionQuery(null);
    setFilteredMentions([]);
    
    // Trigger a small animation to confirm selection
    Animated.sequence([
      Animated.timing(mentionAnimRef, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(mentionAnimRef, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
    
    // Optional: Add haptic feedback on selection
    if (Platform.OS === 'ios' && require('expo-haptics')) {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptics not available');
      }
    }
  };

  // Update handleSendMessage to process mentions
  const handleSendMessage = () => {
    if (messageText.trim() === '') return;
    
    // Process message text to standardize mentions if needed
    const processedMessage = messageText;
    
    // Create new message object with actual user profile
    const newMessage: ChatMessage = {
      id: generateId(),
      user: {
        name: 'Your Name', // Replace with actual username from profile context if available
        avatar: userProfileImage,
      },
      message: processedMessage,
      timestamp: Date.now(),
      // Add reply information if replying to a message
      ...(replyingTo && {
        replyTo: {
          id: replyingTo.id,
          userName: replyingTo.user.name,
          message: replyingTo.message.length > 30 
            ? replyingTo.message.substring(0, 30) + '...' 
            : replyingTo.message
        }
      })
    };
    
    // Add to chat messages
    setChatMessages(prev => [...prev, newMessage]);
    
    // Clear input and reply state
    setMessageText('');
    setReplyingTo(null);
    
    // Scroll to bottom
    setTimeout(() => {
      if (chatListRef.current) {
        chatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };
  
  // Function to handle replying to a message
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
  
  // Function to cancel replying to a message
  const cancelReply = () => {
    setReplyingTo(null);
  };
  
  // Function to scroll to a message
  const scrollToMessage = (messageId: string) => {
    const index = chatMessages.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      // Delay scrolling to ensure UI update has time to happen
      setTimeout(() => {
        if (chatListRef.current) {
          chatListRef.current.scrollTo({
            y: index * 70, // Approximate height of a message
            animated: true
          });
        }
      }, 100);
    }
  };
  
  // --- Render Functions --- 

  const renderTopBar = () => (
    <View style={styles.topBarOuterContainer}>
      <View style={styles.topBarContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="keyboard-arrow-down" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={['#A078F0', '#6C53D8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${ROOM_STATS.progress}%` }]}
          >
            <MaterialIcons name="rocket-launch" size={14} color="#FFFFFF" style={styles.rocketIcon} />
            <View style={styles.arrowsContainer}>
              {[...Array(4)].map((_, i) => (
                <MaterialIcons key={i} name="keyboard-arrow-left" size={14} color="#FFFFFF" style={styles.arrowIcon} />
              ))}
            </View>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
  
  const renderStatsBar = () => (
    <View style={styles.statsContainer}>
      <View style={styles.boostContainer}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>1st</Text>
        </View>
        <View style={styles.boostBadge}>
          <MaterialIcons name="flash-on" size={16} color="#FFFFFF" />
          <Text style={styles.boostCount}>{ROOM_STATS.boosts}</Text>
        </View>
      </View>
      <View style={styles.rightStatsContainer}>
        <View style={styles.statBadge}>
          <MaterialIcons name="visibility" size={14} color="#FFFFFF" />
          <Text style={styles.statText}>{ROOM_STATS.viewers}</Text>
        </View>
        <View style={styles.statBadge}>
          <MaterialIcons name="celebration" size={14} color="#FFFFFF" />
          <Text style={styles.statText}>{ROOM_STATS.participants}</Text>
        </View>
      </View>
    </View>
  );
  
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
          {renderMentionSuggestions()}
          
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
  
  const renderInfoPanel = () => {
    // Use the state value instead of the ref or __getValue
    if (!isInfoPanelVisible && currentSlideValue === Dimensions.get('window').width) {
      return null;
    }
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
                  <Text style={styles.infoText}>Started 1 hour ago</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="bolt" size={18} color="#FFD700" />
                  <Text style={styles.infoText}>Total Boost: {ROOM_STATS.boosts}</Text>
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
    if (!mentionQuery && filteredMentions.length === 0) return null;
    
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

  // --- Main Return --- 

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}> 
      <StatusBar style="light" />
      <Animated.View style={[styles.content, { opacity: fadeAnim }] }>
        {renderTopBar()}
        {renderStatsBar()}
        {renderParticipantsGrid()}
        {renderChat()}
      </Animated.View>
      {renderInfoPanel()}
    </SafeAreaView>
  );
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
  participantContainer: {
    width: '30%', 
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  participantImageContainer: {
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
  participantImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catIcon: {
    width: '60%', 
    height: '60%', 
    tintColor: '#FFFFFF',
  },
  participantName: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  speakingAnimation: {
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
});

export default LiveStreamView; 