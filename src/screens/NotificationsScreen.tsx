import React from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

// Define the notification item type
interface NotificationItem {
  id: string;
  type: 'mention' | 'follow' | 'like' | 'system';
  message: string;
  time: string;
}

const NotificationsScreen = () => {
  // Sample notification data
  const notifications: NotificationItem[] = [
    { id: '1', type: 'mention', message: 'John mentioned you in #music-chat', time: '5m ago' },
    { id: '2', type: 'follow', message: 'Alex started following you', time: '10m ago' },
    { id: '3', type: 'like', message: 'Maria liked your post', time: '35m ago' },
    { id: '4', type: 'system', message: 'Welcome to VULU GO NEW!', time: '1h ago' },
  ];

  // Render each notification item
  const renderItem = ({ item }: { item: NotificationItem }) => (
    <View style={styles.notificationItem}>
      <View style={styles.iconContainer}>
        <MaterialIcons 
          name={
            item.type === 'mention' ? 'alternate-email' : 
            item.type === 'follow' ? 'person-add' :
            item.type === 'like' ? 'favorite' : 'notifications'
          } 
          size={24} 
          color="#FFFFFF" 
        />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Notifications</Text>
      
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <Text style={styles.emptyText}>No notifications yet</Text>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1D23',
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    marginLeft: 4,
  },
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2C2D35',
    borderRadius: 10,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    color: '#8F8F8F',
  },
  emptyText: {
    fontSize: 16,
    color: '#8F8F8F',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default NotificationsScreen; 