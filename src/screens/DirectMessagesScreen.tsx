import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/MainNavigator';
import { router } from 'expo-router';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatar: string;
  isOnline: boolean;
  isGroup?: boolean;
  participants?: { avatar: string }[];
}

// Sample data
const DUMMY_CHATS: ChatPreview[] = [
  {
    id: '1',
    name: 'Live title, test test',
    lastMessage: 'test test test 123, test test test',
    timestamp: '2:30 PM',
    unreadCount: 0,
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    isOnline: true,
    isGroup: true,
    participants: [
      { avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
      { avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
      { avatar: 'https://randomuser.me/api/portraits/women/3.jpg' },
      { avatar: 'https://randomuser.me/api/portraits/men/4.jpg' },
    ]
  },
  {
    id: '2',
    name: 'Sophia',
    lastMessage: 'Luna: Help me!',
    timestamp: '4:44 PM',
    unreadCount: 0,
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    isOnline: true,
  },
  {
    id: '3',
    name: 'Sophia',
    lastMessage: 'Luna: Help me!',
    timestamp: '4:44 PM',
    unreadCount: 0,
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    isOnline: true,
  },
  {
    id: '4',
    name: 'Sophia',
    lastMessage: 'Luna: Help me!',
    timestamp: '4:44 PM',
    unreadCount: 0,
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    isOnline: true,
  },
  {
    id: '5',
    name: 'Sophia',
    lastMessage: 'Luna: Help me!',
    timestamp: '4:44 PM',
    unreadCount: 0,
    avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    isOnline: true,
  },
];

// Search history
const SEARCH_HISTORY = [
  {
    id: '1',
    name: 'sapper',
    username: 'sapper@sapper',
    avatar: 'https://randomuser.me/api/portraits/men/10.jpg',
  },
  {
    id: '2',
    name: 'sapper',
    username: 'sapper@sapper',
    avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
  },
  {
    id: '3',
    name: 'sapper',
    username: 'sapper@sapper',
    avatar: 'https://randomuser.me/api/portraits/men/12.jpg',
  },
];

const DirectMessagesScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 for Messages, 1 for Search
  const navigation = useNavigation<NavigationProp>();
  const searchInputRef = useRef<TextInput>(null);
  
  const slideAnimation = useRef(new Animated.Value(0)).current;

  const activateSearch = () => {
    setIsSearchFocused(true);
    setActiveTab(1);
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const deactivateSearch = () => {
    setIsSearchFocused(false);
    setActiveTab(0);
    setSearchQuery('');
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleAddFriend = () => {
    // Navigate to Add Friends screen
    // This would be implemented in a real app
  };

  const handleCreateGroup = () => {
    // Navigate to Create Group screen
    // This would be implemented in a real app
  };
  
  const renderSearchHistoryItem = ({ item }: { item: any }) => (
    <View style={styles.searchHistoryItem}>
      <Image source={{ uri: item.avatar }} style={styles.searchHistoryAvatar} />
      <View style={styles.searchHistoryInfo}>
        <Text style={styles.searchHistoryName}>{item.name}</Text>
        <Text style={styles.searchHistoryUsername}>{item.username}</Text>
      </View>
      <TouchableOpacity style={styles.clearSearchButton}>
        <MaterialIcons name="close" size={18} color="#8E8E93" />
      </TouchableOpacity>
    </View>
  );

  const renderGroupAvatar = (participants: { avatar: string }[]) => {
    return (
      <View style={styles.groupAvatarContainer}>
        {participants.slice(0, 4).map((participant, index) => (
          <Image 
            key={index}
            source={{ uri: participant.avatar }} 
            style={[
              styles.groupAvatar, 
              {
                top: index < 2 ? 0 : 15,
                left: index % 2 === 0 ? 0 : 15,
              }
            ]} 
          />
        ))}
      </View>
    );
  };

  const renderChatItem = ({ item }: { item: ChatPreview }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => router.push({
        pathname: '/(main)/chat',
        params: {
          userId: item.id,
          name: item.name,
          avatar: item.avatar
        }
      })}
    >
      <View style={styles.avatarContainer}>
        {item.isGroup && item.participants ? (
          renderGroupAvatar(item.participants)
        ) : (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        )}
        {item.isOnline && !item.isGroup && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        
        <View style={styles.lastMessageContainer}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {!isSearchFocused ? (
          // Default header
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Messages</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={activateSearch}
              >
                <MaterialIcons name="search" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleAddFriend}
              >
                <MaterialIcons name="person-add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Search active header
          <View style={styles.searchHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={deactivateSearch}
            >
              <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.searchInputContainer}>
              <MaterialIcons name="search" size={18} color="#8E8E93" />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery !== '' && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <MaterialIcons name="close" size={16} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {renderHeader()}
        
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              transform: [
                {
                  translateX: slideAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -width]
                  })
                }
              ]
            }
          ]}
        >
          {/* Main messages list */}
          <View style={styles.tabContent}>
            <View style={styles.addFriendsButton}>
              <View style={styles.addFriendsIconContainer}>
                <MaterialIcons name="group-add" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.addFriendsText}>Add Friends</Text>
            </View>
            
            <FlatList
              data={DUMMY_CHATS}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.chatList}
            />
          </View>
          
          {/* Search view */}
          <View style={[styles.tabContent, { width }]}>
            <View style={styles.searchHistoryHeader}>
              <Text style={styles.searchHistoryTitle}>Search History</Text>
              <TouchableOpacity>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={SEARCH_HISTORY}
              renderItem={renderSearchHistoryItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.searchHistoryList}
            />
          </View>
        </Animated.View>
        
        {/* New chat floating button */}
        <TouchableOpacity 
          style={styles.newChatButton}
          onPress={handleCreateGroup}
        >
          <MaterialIcons name="chat" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121214',
  },
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  headerContainer: {
    backgroundColor: '#121214',
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    width: width * 2,
  },
  tabContent: {
    width,
    flex: 1,
  },
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addFriendsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addFriendsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatList: {
    paddingHorizontal: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2E',
  },
  avatarContainer: {
    position: 'relative',
    width: 50,
    height: 50,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  groupAvatarContainer: {
    width: 50,
    height: 50,
    position: 'relative',
  },
  groupAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#121214',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: '#121214',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 10,
  },
  unreadBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  newChatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  searchHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearAllText: {
    fontSize: 14,
    color: '#6C5CE7',
  },
  searchHistoryList: {
    paddingHorizontal: 16,
  },
  searchHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2E',
  },
  searchHistoryAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchHistoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchHistoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchHistoryUsername: {
    fontSize: 14,
    color: '#8E8E93',
  },
  clearSearchButton: {
    padding: 6,
  },
});

export default DirectMessagesScreen; 