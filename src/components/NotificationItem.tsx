import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TouchableOpacity, TouchableWithoutFeedback, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export interface Notification {
  id: string;
  type: 'mention' | 'system' | 'reply' | 'friend_request' | 'announcement' | 'gold_sent' | 'image_reply';
  message: string;
  sender?: { // Optional sender info
    name: string;
    avatar: string; // URL
  };
  time: string;
  seen: boolean;
  targetRoute?: string; // e.g., '/chat?userId=123'
  targetParams?: Record<string, any>; // Params for the route
  customRenderer?: () => React.ReactNode; // Custom renderer for special formatting
  mediaType?: 'image' | 'video' | 'audio'; // Type of media in the notification
  mediaUrl?: string; // URL to the media file
  createdAt?: Date; // Timestamp when notification was created
}

interface NotificationItemProps {
  item: Notification;
  onPress: (item: Notification) => void;
  onDelete: (id: string) => void;
}

// Define valid icon names as a TypeScript type
type IconName = 'alternate-email' | 'reply' | 'monetization-on' | 'person-add' | 'notifications' | 'image' | 'videocam' | 'audio-file';

const NotificationItem: React.FC<NotificationItemProps> = ({ item, onPress, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get the correct icon based on notification type with proper typing
  const getIconName = (type: string): IconName => {
    switch(type) {
      case 'mention':
        return 'alternate-email';
      case 'reply':
        return 'reply';
      case 'gold_sent':
        return 'monetization-on';
      case 'friend_request':
        return 'person-add';
      case 'image_reply':
        return 'image';
      default:
        return 'notifications';
    }
  };
  
  // Get icon background color based on notification type
  const getIconBackground = (type: string): string => {
    switch(type) {
      case 'mention':
        return '#5865F2'; // Discord blue
      case 'reply':
        return '#4CAF50'; // Green
      case 'gold_sent':
        return '#FFC107'; // Gold
      case 'friend_request':
        return '#2196F3'; // Blue
      case 'image_reply':
        return '#E91E63'; // Pink for images
      default:
        return '#9C27B0'; // Purple for unknown types
    }
  };
  
  // Handle long press for deletion
  const handleLongPress = () => {
    setIsDeleting(true);
  };
  
  // Handle deletion
  const confirmDelete = () => {
    onDelete(item.id);
    setIsDeleting(false);
  };
  
  // Cancel deletion
  const cancelDelete = () => {
    setIsDeleting(false);
  };
  
  // Show delete confirmation
  if (isDeleting) {
    return (
      <View style={[styles.notificationItem, styles.deleteConfirm]}>
        <Text style={styles.deleteText}>Delete this notification?</Text>
        <View style={styles.deleteActions}>
          <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={cancelDelete}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <TouchableOpacity 
      style={[
        styles.notificationItem,
        !item.seen && styles.unseenNotification
      ]} 
      onPress={() => onPress(item)}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getIconBackground(item.type) }]}>
        <MaterialIcons name={getIconName(item.type)} size={20} color="#FFFFFF" />
      </View>
      
      {/* Use custom renderer if provided, otherwise render default content */}
      {item.customRenderer ? (
        item.customRenderer()
      ) : (
        <View style={styles.contentContainer}>
          <Text style={[
            styles.message,
            !item.seen && { color: '#FFFFFF', fontWeight: 'bold' }
          ]}>
            {item.message}
          </Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2C2D35',
    borderRadius: 8,
    marginBottom: 6,
    position: 'relative',
  },
  unseenNotification: {
    backgroundColor: '#2A2D3A',
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
  message: {
    fontSize: 14,
    color: '#8F8F8F',
    marginBottom: 1,
  },
  time: {
    fontSize: 12,
    color: '#8F8F8F',
  },
  deleteConfirm: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
  },
  deleteText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  deleteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 12,
    backgroundColor: '#F23535',
    borderRadius: 5,
    marginRight: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  cancelButton: {
    padding: 12,
    backgroundColor: '#8F8F8F',
    borderRadius: 5,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});

export default NotificationItem; 