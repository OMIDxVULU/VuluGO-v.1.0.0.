import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

interface ChatItem {
  id: string;
  name: string;
  message: string;
  time: string;
  unread: number;
  avatar?: string;
  online: boolean;
}

const chats: ChatItem[] = [
  {
    id: '1',
    name: 'Emma Wilson',
    message: 'Are you coming to the meeting today?',
    time: '10:32 AM',
    unread: 2,
    online: true
  },
  {
    id: '2',
    name: 'James Rodriguez',
    message: 'The new design looks amazing! 🔥',
    time: '9:14 AM',
    unread: 0,
    online: true
  },
  {
    id: '3',
    name: 'Sophie Turner',
    message: 'Can you send me those files please?',
    time: 'Yesterday',
    unread: 3,
    online: false
  },
  {
    id: '4',
    name: 'Alex Johnson',
    message: "Let me know when you're free",
    time: 'Yesterday',
    unread: 0,
    online: false
  },
  {
    id: '5',
    name: 'VULU Team',
    message: 'Welcome to VULU GO! We hope you enjoy...',
    time: '2 days ago',
    unread: 1,
    online: true
  }
];

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['right', 'top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Messages</Text>
        <TouchableOpacity style={styles.newChat}>
          <MaterialIcons name="edit" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color="#8F8F8F" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Search messages</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Chats</Text>
          
          {chats.map((chat) => (
            <TouchableOpacity key={chat.id} style={styles.chatItem}>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatar, chat.online && styles.avatarOnline]}>
                  <Text style={styles.avatarText}>{chat.name.charAt(0)}</Text>
                  {chat.online && <View style={styles.onlineIndicator} />}
                </View>
              </View>
              
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text style={styles.chatTime}>{chat.time}</Text>
                </View>
                <View style={styles.chatFooter}>
                  <Text style={styles.chatMessage} numberOfLines={1}>
                    {chat.message}
                  </Text>
                  {chat.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chat.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(44, 45, 53, 0.5)',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  newChat: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6E69F4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6E69F4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(44, 45, 53, 0.5)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    color: '#8F8F8F',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(44, 45, 53, 0.5)',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#6E69F4',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarOnline: {
    shadowColor: '#7ADA72',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#7ADA72',
    borderWidth: 2,
    borderColor: '#131318',
    right: 0,
    bottom: 0,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatTime: {
    fontSize: 12,
    color: '#8F8F8F',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessage: {
    fontSize: 14,
    color: '#AAAAAA',
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F23535',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F23535',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default HomeScreen; 