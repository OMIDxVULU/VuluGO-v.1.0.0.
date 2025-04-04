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
import { MaterialIcons } from '@expo/vector-icons';
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
  text: string;
  timestamp: string;
  isSent: boolean;
  isLive?: boolean;
}

// New live chat message component
const LiveChatPreview = () => {
  return (
    <View style={styles.liveChatContainer}>
      <View style={styles.liveChatContent}>
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
            <Text style={styles.viewerCountText}>2550</Text>
          </View>
        </View>
        
        <View style={styles.liveChatTextContainer}>
          <Text style={styles.liveChatTitle}>Live title, test test</Text>
          <Text style={styles.liveChatMessage} numberOfLines={2}>
            test test test 123, test test test test test test 123, test
          </Text>
          <Text style={styles.liveChatViewers}>2550 Viewers watching</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.joinLiveButton}>
        <Text style={styles.joinLiveText}>Join The Live Now</Text>
      </TouchableOpacity>
    </View>
  );
};

const DUMMY_MESSAGES: Message[] = [
  {
    id: '1',
    text: "Hey! How are you?",
    timestamp: '2:30 PM',
    isSent: false,
  },
  {
    id: '2',
    text: "I'm doing great! Just finished working on the new feature.",
    timestamp: '2:31 PM',
    isSent: true,
  },
  {
    id: '3',
    text: "That's awesome! Can't wait to see it 😊",
    timestamp: '2:32 PM',
    isSent: false,
  },
  {
    id: '4',
    text: "I'll send you a demo soon. By the way, I'm planning to start a live stream to showcase the features. Would you join?",
    timestamp: '2:35 PM',
    isSent: true,
  },
  {
    id: '5',
    text: "Sure! When is it?",
    timestamp: '2:36 PM',
    isSent: false,
  },
  {
    id: '6',
    text: "Great! I'll start in about 10 minutes. Here's a link to the room:",
    timestamp: '2:37 PM',
    isSent: true,
    isLive: true,
  },
];

const ChatScreen = ({ userId, name, avatar, goBack }: ChatScreenProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(DUMMY_MESSAGES);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSent: true,
      };
      setMessages([...messages, newMessage]);
      setMessage('');
      
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.isLive) {
      return <LiveChatPreview />;
    }
    
    return (
      <Animated.View
        style={[
          styles.messageContainer,
          item.isSent ? styles.sentMessage : styles.receivedMessage,
        ]}
      >
        {!item.isSent && (
          <Image 
            source={{ uri: avatar }}
            style={styles.messageAvatar}
          />
        )}
        
        <View
          style={[
            styles.messageBubble, 
            item.isSent ? styles.sentBubble : styles.receivedBubble
          ]}
        >
          <Text style={[styles.messageText, item.isSent ? styles.sentText : styles.receivedText]}>
            {item.text}
          </Text>
          <Text style={[styles.timestamp, item.isSent ? styles.sentTimestamp : styles.receivedTimestamp]}>
            {item.timestamp}
          </Text>
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
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          inverted={false}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <MaterialIcons name="add" size={24} color="#6C5CE7" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#8E8E93"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, message.trim() ? styles.sendButtonActive : null]}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <MaterialIcons
              name="send"
              size={24}
              color={message.trim() ? '#FFFFFF' : '#8E8E93'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
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
    padding: 16,
    paddingBottom: 115,
  },
  messageContainer: {
    marginVertical: 8,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  sentMessage: {
    alignSelf: 'flex-end',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  sentBubble: {
    backgroundColor: '#6C5CE7',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#2C2C2E',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  sentText: {
    color: '#FFFFFF',
  },
  receivedText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  sentTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  receivedTimestamp: {
    color: '#8E8E93',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#1C1D23',
    height: 100,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#6C5CE7',
  },
  liveChatContainer: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  liveChatContent: {
    padding: 12,
  },
  liveChatImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveChatImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#121214',
  },
  viewerCountContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  viewerCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  liveChatTextContainer: {
    marginBottom: 12,
  },
  liveChatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  liveChatMessage: {
    fontSize: 14,
    color: '#D1D1D6',
    marginBottom: 4,
    lineHeight: 20,
  },
  liveChatViewers: {
    fontSize: 12,
    color: '#8E8E93',
  },
  joinLiveButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
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
});

export default ChatScreen; 