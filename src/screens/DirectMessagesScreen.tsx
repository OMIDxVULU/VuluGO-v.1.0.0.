import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
  Dimensions,
  StatusBar,
  TextInput,
  Animated,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CommonHeader from '../components/CommonHeader';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useGuestRestrictions } from '../hooks/useGuestRestrictions';
import { LoadingState, ErrorState, EmptyState } from '../components/ErrorHandling';
import { Conversation } from '../services/types';
import { FirebaseErrorHandler } from '../utils/firebaseErrorHandler';

const { width, height } = Dimensions.get('window');

// Enhanced ChatPreview to include status, level, and unread messages
interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  level?: number;
  isSelected?: boolean;
  unreadCount?: number; // Number of unread messages
  isTyping?: boolean; // Whether the user is typing
  isPinned?: boolean; // Whether the chat is pinned
  isMuted?: boolean; // Whether the chat is muted
  isCloseFriend?: boolean; // Whether the user is a close friend
}

// Helper function to format timestamp
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  if (diffDays < 365) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper function to get other participant info
const getOtherParticipantInfo = (conversation: Conversation, currentUserId: string) => {
  const otherParticipantId = conversation.participants.find(id => id !== currentUserId);
  if (!otherParticipantId) return null;

  return {
    id: otherParticipantId,
    name: conversation.participantNames?.[otherParticipantId] || 'Unknown',
    avatar: conversation.participantAvatars?.[otherParticipantId] || 'https://randomuser.me/api/portraits/lego/1.jpg',
  };
};

// Helper function to convert Conversation to ChatPreview
const conversationToChatPreview = (conversation: Conversation, currentUserId: string): ChatPreview | null => {
  const otherParticipant = getOtherParticipantInfo(conversation, currentUserId);
  if (!otherParticipant) return null;

  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount?.[currentUserId] || 0;

  return {
    id: conversation.id,
    name: otherParticipant.name,
    lastMessage: lastMessage?.text || 'No messages yet',
    timestamp: formatTimestamp(conversation.lastMessageTime),
    avatar: otherParticipant.avatar,
    status: 'online', // TODO: Get real user status
    unreadCount: unreadCount,
    isCloseFriend: false, // TODO: Implement close friends logic
    isMuted: false, // TODO: Implement mute logic
    isPinned: false, // TODO: Implement pin logic
  };
};

// Active users will be loaded from real friends data
// Removed dummy ACTIVE_USERS array - now using real Firebase data

// Enhanced Status Indicator Component
const StatusIndicator = ({ status, size = 'normal' }: { status: ChatPreview['status'], size?: 'small' | 'normal' | 'large' }) => {
  const baseSize = size === 'small' ? 8 : size === 'large' ? 14 : 12;
  const borderWidth = size === 'small' ? 1.5 : 2;
  
  const getStatusStyles = () => {
    const baseStyle = {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: baseSize,
      height: baseSize,
      borderRadius: baseSize / 2,
      borderWidth,
      borderColor: '#1D1E26',
    } as const;
    
    switch (status) {
      case 'online':
        return {
          ...baseStyle,
          backgroundColor: '#4CAF50', // Green
        };
      case 'busy':
        return {
          ...baseStyle,
          backgroundColor: '#FF4B4B', // Red
        };
      case 'idle':
        return {
          ...baseStyle,
          backgroundColor: '#FFCB0E', // Yellow
        };
      case 'offline':
        return {
          ...baseStyle,
          backgroundColor: '#9BA1A6', // Grey
        };
      default:
        return baseStyle;
    }
  };

  return <View style={getStatusStyles()} />;
};

const DirectMessagesScreen = () => {
  const { user: currentUser } = useAuth();
  const { canAddFriends } = useGuestRestrictions();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [activeFriends, setActiveFriends] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuestUser, setIsGuestUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load conversations from Firebase with real-time updates
  useEffect(() => {
    const loadConversations = async () => {
      if (!currentUser) {
        setIsLoading(false);
        setError('Please sign in to view your messages.');
        return;
      }

      // Check if user is a guest user - prevent Firestore operations entirely
      if (FirebaseErrorHandler.isGuestUser(currentUser)) {
        setIsLoading(false);
        setIsGuestUser(true);
        setError(null); // Clear any existing errors
        return;
      }

      // Verify user authentication state
      if (!currentUser.uid) {
        setIsLoading(false);
        setError('Authentication required. Please sign in again.');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Set up a timeout to handle cases where no data is returned
        loadingTimeoutRef.current = setTimeout(() => {
          if (isLoading) {
            setIsLoading(false);
            // Don't set error here - let the empty state handle it
          }
        }, 5000); // 5 second timeout

        // Set up real-time listener for conversations with error handling
        unsubscribeRef.current = firestoreService.onUserConversations(
          currentUser.uid,
          (updatedConversations) => {
            // Clear the loading timeout since we got data
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
              loadingTimeoutRef.current = null;
            }

            setConversations(updatedConversations);

            // Convert conversations to chat previews
            const chatPreviews = updatedConversations
              .map(conversation => conversationToChatPreview(conversation, currentUser.uid))
              .filter((chat): chat is ChatPreview => chat !== null);

            setChats(chatPreviews);

            // Extract active friends (online friends) for the "Active Now" section
            const onlineFriends = chatPreviews.filter(chat =>
              chat.status === 'online' || chat.status === 'busy'
            );
            setActiveFriends(onlineFriends);

            setIsLoading(false);
          },
          (error) => {
            // Clear the loading timeout since we got an error
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
              loadingTimeoutRef.current = null;
            }

            console.error('Error in conversations listener:', error);

            // Handle Firebase permission errors specifically
            const errorInfo = FirebaseErrorHandler.handleError(error);

            if (FirebaseErrorHandler.isPermissionError(error)) {
              setError('Unable to access your messages. Please sign in again or check your account permissions.');
              // Optionally, you could trigger a re-authentication flow here
              // router.push('/auth');
            } else if (FirebaseErrorHandler.isNetworkError(error)) {
              setError('Network connection issue. Please check your internet connection and try again.');
            } else {
              setError(errorInfo.userFriendlyMessage);
            }

            setIsLoading(false);
            FirebaseErrorHandler.logError('DirectMessagesScreen.onUserConversations', error, { userId: currentUser.uid });
          }
        );

      } catch (error: any) {
        console.error('Error loading conversations:', error);
        setError('Failed to load conversations');
        setIsLoading(false);

        // Clear timeout on error
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    };

    loadConversations();

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [currentUser]);

  // Animate search bar
  const toggleSearch = (active: boolean) => {
    setIsSearchActive(active);
    Animated.timing(searchAnimation, {
      toValue: active ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };
  
  // Search bar width animation
  const searchBarWidth = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [60, width - 32],
  });
  
  // Filter chats based on search query
  const getFilteredChats = () => {
    if (!searchQuery.trim()) return chats;

    return chats.filter(chat =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleAddFriend = () => {
    if (!canAddFriends()) {
      return; // Guest restriction will be handled by the hook
    }
    // Navigate to Add Friends screen
    router.push('/(main)/add-friends');
  };

  const handleCreateGroup = () => {
    // TODO: Implement navigation or modal for creating group chat
    console.log("Group Chat Pressed");
    // For now, show a simple alert to indicate the button is working
    // In a real implementation, this would open a group creation modal
    alert("Group chat feature coming soon!");
  };
  
  // Navigate to chat screen
  const navigateToChat = (item: ChatPreview) => {
    router.push({
      pathname: '/(main)/chat',
      params: {
        userId: item.id,
        name: item.name,
        avatar: item.avatar
      }
    });
  };
  
  // Render active user item in horizontal scroll
  const renderActiveUser = ({ item }: { item: ChatPreview }) => {
    return (
      <TouchableOpacity
        key={`active-user-${item.id}`}
        style={styles.activeUserContainer}
        onPress={() => navigateToChat(item)}
        activeOpacity={0.8}
      >
        <View style={styles.activeAvatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.activeAvatar} />
          <StatusIndicator status={item.status} size="small" />
        </View>
        <Text style={styles.activeUserName} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  // Enhanced renderChatItem based on new design
  const renderChatItem = ({ item }: { item: ChatPreview }) => {
    return (
      <TouchableOpacity
        style={styles.chatItemContainer}
        onPress={() => navigateToChat(item)}
        activeOpacity={0.7}
      >
        {/* Avatar with status */}
        <View style={styles.chatItemAvatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.chatItemAvatar} />
          <StatusIndicator status={item.status} />
        </View>

        {/* Chat Info */}
        <View style={styles.chatItemInfo}>
          <View style={styles.chatItemNameRow}>
            <Text style={styles.chatItemName}>{item.name}</Text>
            {item.isCloseFriend && (
              <AntDesign name="star" size={14} color="#FFD700" style={styles.starIcon} />
            )}
            {item.level && (
              <View style={styles.chatItemLevelContainer}>
                <MaterialIcons name="local-fire-department" size={14} color="#FF9500" />
                <Text style={styles.chatItemLevel}>{item.level}</Text>
              </View>
            )}
          </View>
          
          {item.isTyping ? (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>typing</Text>
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, styles.typingDot1]} />
                <View style={[styles.typingDot, styles.typingDot2]} />
                <View style={[styles.typingDot, styles.typingDot3]} />
              </View>
            </View>
          ) : (
            <Text style={styles.chatItemLastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          )}
        </View>

        {/* Time and Indicators */}
        <View style={styles.chatItemMetaContainer}>
          <Text style={styles.chatItemTimestamp}>{item.timestamp}</Text>
          
          <View style={styles.chatItemBadgesContainer}>
            {item.unreadCount ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
            
            {item.isPinned && (
              <View style={styles.pinnedIndicator}>
                <MaterialIcons name="push-pin" size={12} color="#9BA1A6" />
              </View>
            )}
            
            {item.isMuted && (
              <View style={styles.mutedIndicator}>
                <MaterialIcons name="volume-off" size={14} color="#9BA1A6" />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#131318', '#1C1D23']}
        style={styles.container}
      >
        {/* Header with Search */}
        <View style={styles.headerContainer}>
          <CommonHeader 
            title={isSearchActive ? "" : "Messages"}
            rightIcons={[
              {
                name: "settings",
                onPress: () => console.log("Settings pressed"),
                color: "#FFFFFF"
              }
            ]}
          />
          
          <Animated.View style={[styles.searchContainer, { width: searchBarWidth }]}>
            {isSearchActive && (
              <MaterialIcons name="search" size={20} color="#9BA1A6" style={styles.searchIcon} />
            )}
            
            <TextInput
              style={styles.searchInput}
              placeholder={isSearchActive ? "Search messages..." : ""}
              placeholderTextColor="#9BA1A6"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => toggleSearch(true)}
              onBlur={() => searchQuery === "" && toggleSearch(false)}
            />
            
            {!isSearchActive && (
              <TouchableOpacity 
                onPress={() => toggleSearch(true)}
                style={styles.searchIconButton}
              >
                <MaterialIcons name="search" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            
            {isSearchActive && searchQuery !== "" && (
              <TouchableOpacity 
                onPress={() => setSearchQuery("")}
                style={styles.clearSearchButton}
              >
                <MaterialIcons name="close" size={20} color="#9BA1A6" />
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
        
        {/* Active Users Horizontal Scroll - Only show if there are active friends */}
        {!isGuestUser && activeFriends.length > 0 && (
          <View style={styles.activeUsersSection}>
            <Text style={styles.sectionTitle}>Active Now</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeUsersScrollContent}
              data={activeFriends}
              keyExtractor={(item) => `active-user-${item.id}`}
              renderItem={renderActiveUser}
            />
          </View>
        )}
        
        {/* Recent Chats Header */}
        <View style={styles.messagesHeaderContainer}>
          <Text style={styles.sectionTitle}>Recent Chats</Text>
          {!isGuestUser && (
            <TouchableOpacity
              style={styles.addFriendsButton}
              onPress={handleAddFriend}
            >
              <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.addFriendsText}>Add Friends</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Messages List with Loading, Error, Guest, and Empty States */}
        {isGuestUser ? (
          <EmptyState
            message="Sign in to view your messages"
            actionText="Sign In"
            onAction={() => {
              // Navigate to auth screen
              router.push('/auth');
            }}
          />
        ) : isLoading ? (
          <LoadingState message="Loading your messages..." />
        ) : error ? (
          <ErrorState
            error={error}
            onRetry={() => {
              setError(null);
              setIsLoading(true);
              // For permission errors, we need to restart the entire loading process
              // which includes authentication verification
              if (currentUser) {
                // Restart the useEffect logic by clearing and reloading
                if (unsubscribeRef.current) {
                  unsubscribeRef.current();
                  unsubscribeRef.current = null;
                }
                // The useEffect will handle the reload automatically
                // since we're clearing the error and setting loading to true
              } else {
                setError('Please sign in to view your messages.');
                setIsLoading(false);
              }
            }}
          />
        ) : getFilteredChats().length === 0 ? (
          <EmptyState
            message={searchQuery.trim() ? "No messages found matching your search" : "You don't have any messages yet"}
            actionText={searchQuery.trim() || isGuestUser ? undefined : "Start a conversation"}
            onAction={searchQuery.trim() || isGuestUser ? undefined : handleAddFriend}
          />
        ) : (
          <FlatList
            data={getFilteredChats()}
            renderItem={renderChatItem}
            keyExtractor={(item) => `chat-item-${item.id}`}
            showsVerticalScrollIndicator={false}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
          />
        )}

        {/* Group Chat Floating Button */}
        <TouchableOpacity
          style={styles.groupChatButton}
          onPress={handleCreateGroup}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#6E69F4', '#B768FB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.groupChatGradient}
          >
            <MaterialIcons name="group-add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
};

// Modern styles based on the app's design language
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#131318',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  searchContainer: {
    height: 40,
    backgroundColor: '#2D2E38',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    position: 'absolute',
    right: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#FFFFFF',
    fontSize: 16,
  },
  searchIconButton: {
    padding: 8,
  },
  clearSearchButton: {
    padding: 8,
  },
  activeUsersSection: {
    marginTop: 16,
    paddingLeft: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  activeUsersScrollContent: {
    paddingRight: 16,
  },
  activeUserContainer: {
    alignItems: 'center',
    marginRight: 20,
    width: 72,
  },
  activeAvatarContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  activeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(110, 105, 244, 0.3)',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    transform: [{ translateX: -16 }],
    backgroundColor: '#FF4B4B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: '#1D1E26',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  activeUserName: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  messagesHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(110, 105, 244, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addFriendsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 16,
    paddingBottom: 200, // Increased space for floating button positioned above tab bar
  },
  chatItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  chatItemAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  chatItemAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  chatItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  chatItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  chatItemLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chatItemLevel: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  chatItemLastMessage: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    color: '#B768FB',
    marginRight: 4,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#B768FB',
    marginHorizontal: 1,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  chatItemMetaContainer: {
    alignItems: 'flex-end',
  },
  chatItemTimestamp: {
    fontSize: 12,
    color: '#9BA1A6',
    marginBottom: 4,
  },
  chatItemBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#6E69F4',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pinnedIndicator: {
    marginLeft: 8,
  },
  mutedIndicator: {
    marginLeft: 8,
  },
  groupChatButton: {
    position: 'absolute',
    right: 16,
    bottom: 130, // Positioned above tab bar (100px height + 20px padding + 10px margin)
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8, // Increased elevation for better visibility
    shadowColor: '#6E69F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, // Increased shadow opacity
    shadowRadius: 10, // Increased shadow radius
    zIndex: 1000, // Ensure button is above other elements
  },
  groupChatGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    marginLeft: 6,
  },
});

export default DirectMessagesScreen; 