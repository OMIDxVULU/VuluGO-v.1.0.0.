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
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
              <MaterialIcons name="visibility" size={14} color="#8E8E93" />
              <Text style={styles.liveStatText}>2.5K watching</Text>
            </View>
            <View style={styles.liveStatItem}>
              <MaterialIcons name="chat" size={14} color="#8E8E93" />
              <Text style={styles.liveStatText}>142 comments</Text>
            </View>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.joinLiveButton}>
        <Text style={styles.joinLiveText}>Join Stream</Text>
        <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" style={{marginLeft: 8}} />
      </TouchableOpacity>
    </View>
  );
};

// Placeholder for current user info
const CURRENT_USER_ID = 'currentUser';
const CURRENT_USER_NAME = 'You';
const CURRENT_USER_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg';

// 2. Update Dummy Data
const DUMMY_MESSAGES: Message[] = [
  {
    id: '1',
    senderId: 'otherUser1',
    senderName: 'Sophia', 
    senderAvatar: 'https://randomuser.me/api/portraits/women/2.jpg', // Use the chat partner's avatar passed in props
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
    senderAvatar: 'https://randomuser.me/api/portraits/women/2.jpg', // Use the chat partner's avatar passed in props
    text: "That's awesome! Can't wait to see it 😊",
    timestamp: '2:32 PM',
  },
   {
    id: '3.1', // Added consecutive message from same user
    senderId: 'otherUser1', 
    senderName: 'Sophia',
    senderAvatar: 'https://randomuser.me/api/portraits/women/2.jpg', // Use the chat partner's avatar passed in props
    text: "How did the testing go?",
    timestamp: '2:33 PM',
  },
  {
    id: '4',
    senderId: CURRENT_USER_ID,
    senderName: CURRENT_USER_NAME,
    senderAvatar: CURRENT_USER_AVATAR,
    text: "I'll send you a demo soon. By the way, I'm planning to start a live stream to showcase the features. Would you join?",
    timestamp: '2:35 PM',
  },
  {
    id: '5',
    senderId: 'otherUser1',
    senderName: 'Sophia',
    senderAvatar: 'https://randomuser.me/api/portraits/women/2.jpg', // Use the chat partner's avatar passed in props
    text: "Sure! When is it?",
    timestamp: '2:36 PM',
  },
  {
    id: '6',
    senderId: CURRENT_USER_ID,
    senderName: CURRENT_USER_NAME,
    senderAvatar: CURRENT_USER_AVATAR,
    text: "Great! I'll start in about 10 minutes. Here's a link to the room:",
    timestamp: '2:37 PM',
    isLive: true, // Keep isLive for the preview component
  },
];

const ChatScreen = ({ userId, name, avatar, goBack }: ChatScreenProps) => {
  const [message, setMessage] = useState('');
  // Update initial state type
  const [messages, setMessages] = useState<Message[]>(() => 
    // Use chat partner details for initial non-currentUser messages
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

  useEffect(() => {
    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  // Focus input when component mounts
  useEffect(() => {
    // Immediate input focus on mount
    textInputRef.current?.focus();
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: CURRENT_USER_ID,
        senderName: CURRENT_USER_NAME,
        senderAvatar: CURRENT_USER_AVATAR,
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setMessage('');
      
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    textInputRef.current?.focus();
  };
  
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

  // Keyboard handling setup with platform-specific offset for optimal visibility
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 90 : 80;

  const renderMessage = ({ item, index }: { item: Message, index: number }) => {
    if (item.isLive) {
      return <LiveChatPreview />;
    }
    
    // Grouping Logic
    const previousMessage = index > 0 ? messages[index - 1] : null;
    // Group if previous message exists and is from the same sender
    const isGrouped = previousMessage?.senderId === item.senderId;
    // Check if messages are within 5 minutes of each other
    const isWithinTimeWindow = (prev: string, current: string) => {
      const prevTime = new Date(`1/1/2023 ${prev}`);
      const currTime = new Date(`1/1/2023 ${current}`);
      return (currTime.getTime() - prevTime.getTime()) < 5 * 60 * 1000; // 5 minutes in milliseconds
    };

    // Only group if messages are from same sender AND within time window
    const shouldGroup = isGrouped && 
      (!previousMessage?.timestamp || isWithinTimeWindow(previousMessage.timestamp, item.timestamp));

    const showHeader = !shouldGroup;
    const isCurrentUser = item.senderId === CURRENT_USER_ID;

    return (
      <View style={[
        styles.discordMessageContainer,
        showHeader && styles.discordMessageGroupStart,
        isCurrentUser && styles.currentUserMessage
      ]}>
        {showHeader ? (
          <Image 
            source={{ uri: item.senderAvatar }}
            style={styles.discordAvatar}
          />
        ) : (
          <View style={styles.discordAvatarPlaceholder} />
        )}
        <View style={[styles.discordMessageContent, isCurrentUser && styles.currentUserMessageContent]}>
          {showHeader && (
            <View style={styles.discordMessageHeader}>
              <Text style={[styles.discordUsername, isCurrentUser && styles.currentUserName]}>
                {item.senderName}
              </Text>
              <Text style={styles.discordTimestamp}>{item.timestamp}</Text>
            </View>
          )}
          <View style={[
            styles.messageBubble,
            isCurrentUser && styles.currentUserBubble,
            !showHeader && styles.groupedMessageBubble
          ]}>
            <Text style={[
              styles.discordMessageText,
              isCurrentUser && styles.currentUserMessageText
            ]}>
              {item.text}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={goBack}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{name}</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="call" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="videocam" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="more-vert" size={24} color="#FFFFFF" />
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
              <MaterialIcons name="share" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.shareOptionText}>Share/Invite</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <View style={[styles.shareIconContainer, { backgroundColor: '#4299E1' }]}>
              <MaterialIcons name="link" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.shareOptionText}>Copy Link</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <View style={[styles.shareIconContainer, { backgroundColor: '#9F7AEA' }]}>
              <MaterialIcons name="message" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.shareOptionText}>Messages</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <View style={[styles.shareIconContainer, { backgroundColor: '#38B2AC' }]}>
              <MaterialIcons name="email" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.shareOptionText}>Email</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <View style={[styles.shareIconContainer, { backgroundColor: '#4299E1' }]}>
              <MaterialIcons name="facebook" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.shareOptionText}>Messenger</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareOption}>
            <View style={[styles.shareIconContainer, { backgroundColor: '#48BB78' }]}>
              <MaterialIcons name="send" size={20} color="#FFFFFF" />
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
                <MaterialIcons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.keyboardContainer}
        enabled
      >
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />
          
          {/* Input container with improved positioning and visibility */}
          <View style={styles.inputContainerWrapper} ref={inputContainerRef}>
            <View style={styles.inputContainer}>
              {/* Image upload button with improved touch area */}
              <TouchableOpacity 
                style={[styles.iconButton, isImagePickerVisible && styles.iconButtonActive]}
                activeOpacity={0.7}
                onPress={handleImagePress}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              >
                <MaterialIcons name="image" size={24} color="#2F80ED" />
              </TouchableOpacity>
              
              {/* Text input area with improved visibility */}
              <TouchableOpacity 
                activeOpacity={0.9} 
                style={[styles.textInputArea, isInputFocused && styles.textInputAreaFocused]}
                onPress={handleInputPress}
              >
                <TextInput
                  ref={textInputRef}
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor="#888"
                  value={message}
                  onChangeText={setMessage}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
                  multiline
                  numberOfLines={Platform.OS === 'ios' ? 1 : undefined}
                  textAlignVertical="center"
                />
              </TouchableOpacity>
              
              {/* Send button with improved touch area */}
              <TouchableOpacity
                style={[styles.iconButton, message.trim() && styles.iconButtonActive]}
                onPress={sendMessage}
                disabled={!message.trim()}
                activeOpacity={0.7}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              >
                <Ionicons
                  name="send"
                  size={24}
                  color={message.trim() ? '#2F80ED' : '#888'}
                />
              </TouchableOpacity>
            </View>
            
            {/* Optional image picker UI with improved visibility */}
            {isImagePickerVisible && (
              <View style={styles.imagePickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity style={styles.imagePickerOption}>
                    <MaterialIcons name="camera-alt" size={24} color="#FFFFFF" />
                    <Text style={styles.imagePickerText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imagePickerOption}>
                    <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
                    <Text style={styles.imagePickerText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imagePickerOption}>
                    <MaterialIcons name="gif" size={24} color="#FFFFFF" />
                    <Text style={styles.imagePickerText}>GIF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imagePickerOption}>
                    <MaterialIcons name="file-present" size={24} color="#FFFFFF" />
                    <Text style={styles.imagePickerText}>File</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  keyboardContainer: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    position: 'relative',
  },
  messagesContainer: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100, // Adjusted space for input container
  },
  inputContainerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    zIndex: 999, // Higher z-index to ensure it's above all other elements
    elevation: Platform.OS === 'android' ? 10 : 0, // Android elevation
    paddingBottom: Platform.OS === 'ios' ? 30 : 16, // Adjusted padding for better keyboard interaction
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#25272E',
  },
  iconButtonActive: {
    backgroundColor: '#2F80ED40',
  },
  textInputArea: {
    flex: 1,
    backgroundColor: '#40444B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginRight: 8,
    minHeight: 44, // Adjusted height for better visibility
    maxHeight: 100,
  },
  textInputAreaFocused: {
    borderWidth: 2,
    borderColor: '#2F80ED',
    backgroundColor: '#4C5058', // Slightly lighter background when focused for better visibility
  },
  input: {
    color: '#FFFFFF', // Brighter text color for better visibility
    fontSize: 16,
    paddingTop: Platform.OS === 'ios' ? 4 : 2,
    paddingBottom: Platform.OS === 'ios' ? 4 : 2,
    minHeight: 28, // Adjusted height for better visibility
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#1C1D23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#16181C',
    borderBottomWidth: 1,
    borderBottomColor: '#373941',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
    flexDirection: 'row',
    paddingVertical: 4,
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  discordMessageGroupStart: {
    marginTop: 16,
  },
  discordAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    marginTop: 2,
    borderWidth: 0.5,
    borderColor: '#2C2D31',
  },
  discordAvatarPlaceholder: {
    width: 40,
    marginRight: 12,
  },
  discordMessageContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  currentUserMessageContent: {
    alignItems: 'flex-end',
  },
  discordMessageHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  discordUsername: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  currentUserName: {
    color: '#5865F2', // Discord blue for current user
  },
  discordTimestamp: {
    color: '#6E7377',
    fontSize: 12, 
  },
  messageBubble: {
    backgroundColor: '#36393F',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  currentUserBubble: {
    backgroundColor: '#5865F2', // Discord blue
    alignSelf: 'flex-end',
  },
  groupedMessageBubble: {
    marginTop: 2,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
  },
  discordMessageText: {
    color: '#DCDDDE',
    fontSize: 15,
    lineHeight: 22,
  },
  currentUserMessageText: {
    color: '#FFFFFF',
  },
  discordGroupedMessageText: {
    marginLeft: 0,
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
    backgroundColor: '#5865F2', // Discord blue
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
});

export default ChatScreen;