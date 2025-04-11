import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, AntDesign } from '@expo/vector-icons';

// Define the friend type
interface Friend {
  id: string;
  name: string;
  isCloseFriend: boolean;
}

// Simple mockup of friends data
const MOCK_FRIENDS: Friend[] = [
  { id: '1', name: 'Alex Johnson', isCloseFriend: true },
  { id: '2', name: 'Sophia Williams', isCloseFriend: true },
  { id: '3', name: 'Michael Thompson', isCloseFriend: false },
  { id: '4', name: 'Emma Davis', isCloseFriend: false },
];

export default function CloseFriends() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const source = typeof params.source === 'string' ? params.source : '';
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [activeTab, setActiveTab] = useState<'all' | 'close'>('all');
  
  // Filter friends based on active tab
  const getFilteredFriends = () => {
    if (activeTab === 'close') {
      return friends.filter(friend => friend.isCloseFriend);
    }
    return friends;
  };
  
  // Toggle close friend status
  const toggleCloseFriend = (id: string) => {
    setFriends(prev => prev.map(friend => 
      friend.id === id 
        ? { ...friend, isCloseFriend: !friend.isCloseFriend } 
        : friend
    ));
  };
  
  // Handle back navigation
  const handleBack = () => {
    if (source) {
      router.push(source);
    } else {
      router.back();
    }
  };
  
  // Render a friend item
  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      <Text style={styles.friendName}>{item.name}</Text>
      <TouchableOpacity
        style={[styles.starButton, item.isCloseFriend && styles.starButtonActive]}
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
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Close Friends</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'close' && styles.activeTab]} 
          onPress={() => setActiveTab('close')}
        >
          <Text style={[styles.tabText, activeTab === 'close' && styles.activeTabText]}>Close Friends</Text>
        </TouchableOpacity>
      </View>
      
      {/* Friends List */}
      <FlatList
        data={getFilteredFriends()}
        renderItem={renderFriend}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeTab: {
    backgroundColor: '#6E69F4',
  },
  tabText: {
    color: '#9BA1A6',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  friendName: {
    color: '#FFFFFF',
    fontSize: 16,
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
}); 