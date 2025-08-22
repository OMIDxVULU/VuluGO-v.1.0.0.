import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, Feather, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CommonHeader from '../components/CommonHeader';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

// Mock data removed - now using real Firebase data
const DUMMY_FRIENDS: Friend[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    status: 'online',
    isCloseFriend: true,
  },
  {
    id: '2',
    name: 'Sophia Williams',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    status: 'offline',
    isCloseFriend: true,
  },
  {
    id: '3',
    name: 'Michael Thompson',
    avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
    status: 'busy',
    isCloseFriend: true,
  },
  {
    id: '4',
    name: 'Emma Davis',
    avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
    status: 'online',
    isCloseFriend: false,
  },
  {
    id: '5',
    name: 'William Martinez',
    avatar: 'https://randomuser.me/api/portraits/men/64.jpg',
    status: 'offline',
    isCloseFriend: false,
  },
  {
    id: '6',
    name: 'Olivia Rodriguez',
    avatar: 'https://randomuser.me/api/portraits/women/17.jpg',
    status: 'busy',
    isCloseFriend: false,
  },
  {
    id: '7',
    name: 'James Wilson',
    avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
    status: 'online',
    isCloseFriend: false,
  },
];

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  isCloseFriend: boolean;
}

const StatusIndicator = ({ status }: { status: Friend['status'] }) => {
  const getStatusStyles = () => {
    const baseStyle = {
      width: 10,
      height: 10,
      borderRadius: 5,
      position: 'absolute',
      bottom: 0,
      right: 0,
      borderWidth: 1.5,
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

const CloseFriendsScreen = () => {
  console.log("CloseFriendsScreen mounted");
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'close'>('all');
  const [error, setError] = useState<string | null>(null);

  // Load real friends data from Firebase
  useEffect(() => {
    if (!user?.uid) return;

    // Load initial friends data
    const loadFriends = async () => {
      try {
        const userFriends = await firestoreService.getUserFriends(user.uid);
        setFriends(userFriends);
      } catch (error) {
        console.error('Error loading friends:', error);
        setFriends([]);
      }
    };

    loadFriends();

    // Set up real-time listener for friends updates
    const unsubscribe = firestoreService.onUserFriends(user.uid, (updatedFriends) => {
      setFriends(updatedFriends);
    });

    return unsubscribe;
  }, [user?.uid]);

  // Filter friends based on search query and active tab
  const getFilteredFriends = () => {
    let filtered = friends;
    
    // First filter by tab
    if (activeTab === 'close') {
      filtered = filtered.filter(friend => friend.isCloseFriend);
    }
    
    // Then filter by search if there's a query
    if (searchQuery.trim()) {
      filtered = filtered.filter(friend => 
        friend.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Toggle close friend status
  const toggleCloseFriend = async (id: string) => {
    if (!user?.uid) return;

    // Clear any previous errors when starting a new operation
    setError(null);

    try {
      const friend = friends.find(f => f.id === id);
      if (!friend) return;

      if (friend.isCloseFriend) {
        // Remove friend
        await firestoreService.removeFriend(user.uid, id);
      } else {
        // Add friend
        await firestoreService.addFriend(user.uid, id);
      }

      // Clear error on successful completion
      setError(null);
      // The real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error toggling friend status:', error);

      // Set user-friendly error message
      let errorMessage = 'Failed to update friend status. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          errorMessage = 'Permission denied. You may not have access to modify this friendship.';
        } else if (error.message.includes('not-found')) {
          errorMessage = 'User not found. The friend may have been removed.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }

      setError(errorMessage);
    }
  };

  // Handle tab changes
  const handleTabChange = (tab: 'all' | 'close') => {
    setActiveTab(tab);
  };

  // Handle back button press
  const handleBack = () => {
    router.back();
  };

  // Render friend item
  const renderFriendItem = ({ item }: { item: Friend }) => {
    return (
      <View style={styles.friendItem}>
        <View style={styles.friendInfoContainer}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <StatusIndicator status={item.status} />
          </View>
          <Text style={styles.friendName}>{item.name}</Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.starButton,
            item.isCloseFriend && styles.starButtonActive
          ]}
          onPress={() => toggleCloseFriend(item.id)}
        >
          <AntDesign 
            name={item.isCloseFriend ? "star" : "staro"} 
            size={18} 
            color={item.isCloseFriend ? "#FFD700" : "#9BA1A6"} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#131318', '#1C1D23']}
        style={styles.container}
      >
        {/* Header */}
        <CommonHeader 
          title="Close Friends"
          leftIcon={{
            name: "arrow-left",
            onPress: handleBack,
          }}
        />
        
        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Close friends can see your special mood statuses when you set them to "visible to close friends only".
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#9BA1A6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends"
            placeholderTextColor="#9BA1A6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.errorDismissButton}
              onPress={() => setError(null)}
            >
              <AntDesign name="close" size={16} color="#FF4B4B" />
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => handleTabChange('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'close' && styles.tabActive]}
            onPress={() => handleTabChange('close')}
          >
            <Text style={[styles.tabText, activeTab === 'close' && styles.tabTextActive]}>Close Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Friends List */}
        <FlatList
          data={getFilteredFriends()}
          renderItem={renderFriendItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.friendsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={40} color="#9BA1A6" />
              <Text style={styles.emptyText}>
                {activeTab === 'close' 
                  ? "You haven't added any close friends yet" 
                  : "No friends found"}
              </Text>
            </View>
          }
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#131318',
  },
  container: {
    flex: 1,
  },
  descriptionContainer: {
    padding: 16,
    backgroundColor: 'rgba(110, 105, 244, 0.1)',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6E69F4',
  },
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#292B31',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 15,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#292B31',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#6E69F4',
  },
  tabText: {
    color: '#9BA1A6',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  friendsList: {
    paddingHorizontal: 16,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#292B31',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  friendInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  friendName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  starButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#9BA1A6',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4B4B',
  },
  errorText: {
    flex: 1,
    color: '#FF4B4B',
    fontSize: 14,
    lineHeight: 20,
  },
  errorDismissButton: {
    padding: 4,
  },
});

export default CloseFriendsScreen; 