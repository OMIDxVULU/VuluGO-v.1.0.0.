import React, { useState, useRef } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CommonHeader from '../components/CommonHeader';

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
}

// Updated Sample data based on Figma structure
const DUMMY_CHATS: ChatPreview[] = [
  {
    id: '1',
    name: 'Sophia',
    lastMessage: 'Luna: Help me!',
    timestamp: '44m',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    status: 'online',
    level: 48,
    unreadCount: 3,
    isPinned: true,
  },
  {
    id: '2',
    name: 'David',
    lastMessage: 'I\'m going live in 5 minutes!',
    timestamp: '1h',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    status: 'busy',
    level: 22,
    isTyping: true,
  },
  {
    id: '3',
    name: 'Jessica',
    lastMessage: 'Thanks for the help yesterday!',
    timestamp: '2h',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    status: 'idle',
    level: 74,
  },
  {
    id: '4',
    name: 'Michael',
    lastMessage: 'Let me know when you\'re free',
    timestamp: '6h',
    avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    status: 'offline',
    level: 31,
    unreadCount: 1,
    isMuted: true,
  },
  {
    id: '5',
    name: 'Gaming Group',
    lastMessage: 'Alex: Are we playing tonight?',
    timestamp: 'Yesterday',
    avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    status: 'online',
    isPinned: true,
  },
  {
    id: '6',
    name: 'Emma',
    lastMessage: 'I sent you the files',
    timestamp: 'Yesterday',
    avatar: 'https://randomuser.me/api/portraits/women/6.jpg',
    status: 'online',
    level: 18,
  },
  {
    id: '7',
    name: 'John',
    lastMessage: 'See you tomorrow!',
    timestamp: 'Tuesday',
    avatar: 'https://randomuser.me/api/portraits/men/7.jpg',
    status: 'offline',
    level: 65,
  },
  {
    id: '8',
    name: 'Sarah',
    lastMessage: 'Check out this music',
    timestamp: 'Monday',
    avatar: 'https://randomuser.me/api/portraits/women/8.jpg',
    status: 'idle',
    level: 42,
  },
  {
    id: '9',
    name: 'James',
    lastMessage: 'How did the meeting go?',
    timestamp: 'Last week',
    avatar: 'https://randomuser.me/api/portraits/men/9.jpg',
    status: 'busy',
    level: 55,
  },
  {
    id: '10',
    name: 'Rebecca',
    lastMessage: 'Happy birthday!',
    timestamp: 'Last week',
    avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
    status: 'offline',
    level: 29,
  },
];

// Active users for the horizontal scroll
const ACTIVE_USERS = [
  {
    id: 'user_1',
    name: 'David',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    status: 'busy',
    isLive: true,
  },
  {
    id: 'user_2',
    name: 'Sophia',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    status: 'online',
  },
  {
    id: 'user_3',
    name: 'Michael',
    avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    status: 'online',
  },
  {
    id: 'user_4',
    name: 'Jessica',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    status: 'idle',
  },
  {
    id: 'user_5',
    name: 'Emma',
    avatar: 'https://randomuser.me/api/portraits/women/6.jpg',
    status: 'online',
  },
  {
    id: 'user_6',
    name: 'John',
    avatar: 'https://randomuser.me/api/portraits/men/7.jpg',
    status: 'online',
  },
  {
    id: 'user_7',
    name: 'Sarah',
    avatar: 'https://randomuser.me/api/portraits/women/8.jpg',
    status: 'idle',
  },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchAnimation = useRef(new Animated.Value(0)).current;
  
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
    if (!searchQuery.trim()) return DUMMY_CHATS;
    
    return DUMMY_CHATS.filter(chat => 
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleAddFriend = () => {
    // TODO: Implement navigation or modal for adding friends
    console.log("Add Friends Pressed");
  };

  const handleCreateGroup = () => {
    // TODO: Implement navigation or modal for creating group chat
    console.log("Group Chat Pressed");
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
  const renderActiveUser = ({ item }: { item: typeof ACTIVE_USERS[0] }) => {
    return (
      <TouchableOpacity 
        key={`active-user-${item.id}`}
        style={styles.activeUserContainer} 
        onPress={() => navigateToChat(item as unknown as ChatPreview)}
        activeOpacity={0.8}
      >
        <View style={styles.activeAvatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.activeAvatar} />
          <StatusIndicator status={item.status as 'online' | 'offline' | 'busy' | 'idle'} size="small" />
          {item.isLive && (
            <View style={styles.liveIndicator}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
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
        
        {/* Active Users Horizontal Scroll */}
        <View style={styles.activeUsersSection}>
          <Text style={styles.sectionTitle}>Active Now</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeUsersScrollContent}
            data={ACTIVE_USERS}
            keyExtractor={(item) => `active-user-${item.id}`} 
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.activeUserContainer} 
                onPress={() => navigateToChat(item as unknown as ChatPreview)}
                activeOpacity={0.8}
              >
                <View style={styles.activeAvatarContainer}>
                  <Image source={{ uri: item.avatar }} style={styles.activeAvatar} />
                  <StatusIndicator status={item.status as 'online' | 'offline' | 'busy' | 'idle'} size="small" />
                  {item.isLive && (
                    <View style={styles.liveIndicator}>
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.activeUserName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
        
        {/* Messages Header */}
        <View style={styles.messagesHeaderContainer}>
          <Text style={styles.sectionTitle}>Messages</Text>
          <TouchableOpacity 
            style={styles.addFriendsButton} 
            onPress={handleAddFriend}
          >
            <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
            <Text style={styles.addFriendsText}>Add Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <FlatList
          data={getFilteredChats()}
          renderItem={renderChatItem}
          keyExtractor={(item) => `chat-item-${item.id}`}
          showsVerticalScrollIndicator={false}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
        />

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
    paddingBottom: 80, // Space for floating button
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
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#6E69F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  groupChatGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DirectMessagesScreen; 