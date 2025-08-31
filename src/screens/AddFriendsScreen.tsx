import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CommonHeader from '../components/CommonHeader';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { LoadingState, ErrorState, EmptyState } from '../components/ErrorHandling';

interface User {
  id: string;
  displayName: string;
  username?: string;
  email?: string;
  photoURL?: string;
  isFriend?: boolean;
  requestSent?: boolean;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: Date;
  mutualFriends?: number;
}

const AddFriendsScreen = () => {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'requests'>('search');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  // Load friend requests on component mount
  useEffect(() => {
    if (!currentUser?.uid) return;

    loadFriendRequests();
  }, [currentUser?.uid]);

  const loadFriendRequests = async () => {
    if (!currentUser?.uid) return;

    setIsLoadingRequests(true);
    try {
      // TODO: Implement friend requests loading from Firebase
      // For now, using empty array
      setFriendRequests([]);
    } catch (error: any) {
      console.error('Error loading friend requests:', error);
      setError('Failed to load friend requests');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Debounced search function for real-time autocomplete
  const debouncedSearch = useCallback(
    (query: string) => {
      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for debounced search
      const timeout = setTimeout(() => {
        performSearch(query);
      }, 150); // 150ms debounce delay

      searchTimeoutRef.current = timeout;
    },
    [] // Empty dependency array to prevent stale closures
  );

  const performSearch = async (query: string) => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery || !currentUser?.uid) {
      setSearchResults([]);
      setIsSearching(false);
      setLastSearchQuery('');
      return;
    }

    // Skip search if query hasn't changed
    if (trimmedQuery === lastSearchQuery) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    setLastSearchQuery(trimmedQuery);

    try {
      // Search users by username only with progressive matching
      const users = await firestoreService.searchUsersByUsername(trimmedQuery, currentUser.uid);

      // Get current user's friends to check friendship status
      const currentUserFriends = await firestoreService.getUserFriends(currentUser.uid);
      const friendIds = new Set(currentUserFriends.map(friend => friend.id));

      setSearchResults(users.map(user => ({
        id: user.uid,
        displayName: user.displayName || 'Unknown User',
        username: user.username || '',
        email: user.email,
        photoURL: user.photoURL,
        isFriend: friendIds.has(user.uid),
        requestSent: false // TODO: Check if request already sent
      })));
    } catch (error: any) {
      console.error('Error searching users:', error);
      setError('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input changes with real-time search
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (text.trim()) {
      setIsSearching(true);
      debouncedSearch(text);
    } else {
      // Clear results immediately if search is empty
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array - cleanup only on unmount

  const sendFriendRequest = async (targetUser: User) => {
    if (!currentUser?.uid) return;

    try {
      // Add friend directly for now (simplified)
      await firestoreService.addFriend(currentUser.uid, targetUser.id);
      
      // Send notification
      await notificationService.createFriendRequestNotification(
        targetUser.id,
        currentUser.uid,
        currentUser.displayName || 'Someone',
        currentUser.photoURL || undefined
      );

      // Update search results to show request sent
      setSearchResults(prev => 
        prev.map(user => 
          user.id === targetUser.id 
            ? { ...user, requestSent: true }
            : user
        )
      );

      Alert.alert('Success', `Friend request sent to ${targetUser.displayName}`);
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  const handleFriendRequest = async (request: FriendRequest, action: 'accept' | 'decline') => {
    if (!currentUser?.uid) return;

    try {
      if (action === 'accept') {
        await firestoreService.addFriend(currentUser.uid, request.fromUserId);
        Alert.alert('Success', `You are now friends with ${request.fromUserName}`);
      }

      // Remove request from list
      setFriendRequests(prev => prev.filter(req => req.id !== request.id));
    } catch (error: any) {
      console.error(`Error ${action}ing friend request:`, error);
      Alert.alert('Error', `Failed to ${action} friend request. Please try again.`);
    }
  };

  const renderSearchResult = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <Image
        source={{ uri: item.photoURL || 'https://randomuser.me/api/portraits/lego/1.jpg' }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>@{item.username}</Text>
        {item.displayName && item.displayName !== item.username && (
          <Text style={styles.userDisplayName}>{item.displayName}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.actionButton,
          (item.isFriend || item.requestSent) && styles.actionButtonDisabled
        ]}
        onPress={() => sendFriendRequest(item)}
        disabled={item.isFriend || item.requestSent}
      >
        <Text style={[
          styles.actionButtonText,
          (item.isFriend || item.requestSent) && styles.actionButtonTextDisabled
        ]}>
          {item.isFriend ? 'Friends' : item.requestSent ? 'Sent' : 'Add Friend'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestItem}>
      <Image 
        source={{ uri: item.fromUserAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
        style={styles.avatar} 
      />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{item.fromUserName}</Text>
        <Text style={styles.requestTime}>
          {item.timestamp.toLocaleDateString()}
        </Text>
        {item.mutualFriends && item.mutualFriends > 0 && (
          <Text style={styles.mutualFriends}>
            {item.mutualFriends} mutual friend{item.mutualFriends > 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleFriendRequest(item, 'accept')}
        >
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => handleFriendRequest(item, 'decline')}
        >
          <Text style={[styles.actionButtonText, styles.declineButtonText]}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#131318', '#1C1D23']}
        style={styles.gradient}
      >
        {/* Header */}
        <CommonHeader 
          title="Add Friends"
          leftIcon={{
            name: "arrow-back",
            onPress: () => router.back(),
            color: "#FFFFFF"
          }}
        />

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.activeTab]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
              Search Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Friend Requests
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'search' ? (
          <View style={styles.searchContainer}>
            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <MaterialIcons name="search" size={20} color="#9BA1A6" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username..."
                placeholderTextColor="#9BA1A6"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />
              {isSearching && searchQuery.trim() && (
                <ActivityIndicator size="small" color="#6E69F4" style={styles.searchLoader} />
              )}
            </View>

            {/* Search Results */}
            {isSearching ? (
              <LoadingState message="Searching usernames..." />
            ) : error ? (
              <ErrorState error={error} onRetry={() => handleSearchChange(searchQuery)} />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                style={styles.resultsList}
                showsVerticalScrollIndicator={false}
              />
            ) : searchQuery.trim() ? (
              <EmptyState message="No usernames found matching your search" />
            ) : (
              <EmptyState message="Start typing a username to search" />
            )}
          </View>
        ) : (
          <View style={styles.requestsContainer}>
            {isLoadingRequests ? (
              <LoadingState message="Loading friend requests..." />
            ) : friendRequests.length > 0 ? (
              <FlatList
                data={friendRequests}
                renderItem={renderFriendRequest}
                keyExtractor={(item) => item.id}
                style={styles.resultsList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <EmptyState message="No pending friend requests" />
            )}
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  gradient: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#6E69F4',
  },
  tabText: {
    color: '#9BA1A6',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  requestsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  searchLoader: {
    marginLeft: 8,
  },
  resultsList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  requestInfo: {
    flex: 1,
  },
  userName: {
    color: '#6E69F4',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userDisplayName: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 2,
  },
  requestName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userHandle: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  requestTime: {
    color: '#9BA1A6',
    fontSize: 12,
    marginBottom: 2,
  },
  mutualFriends: {
    color: '#6E69F4',
    fontSize: 12,
  },
  actionButton: {
    backgroundColor: '#6E69F4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  actionButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextDisabled: {
    color: '#9BA1A6',
  },
  requestActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  declineButtonText: {
    color: '#FF6B6B',
  },
});

export default AddFriendsScreen;
