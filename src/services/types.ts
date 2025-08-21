import { Timestamp } from 'firebase/firestore';

// Unified message interface for both ChatScreen and DiscordChatScreen
export interface UnifiedMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Timestamp | string; // Support both Firebase Timestamp and string format
  type: 'text' | 'image' | 'file' | 'system';
  isLive?: boolean;
  edited?: boolean;
  attachments?: Array<{
    id: string;
    type: 'image' | 'file' | 'gif';
    url: string;
    filename?: string;
    width?: number;
    height?: number;
  }>;
  mentions?: Array<{
    id: string;
    name: string;
    startIndex: number;
    endIndex: number;
  }>;
  replyTo?: {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    userIds: string[];
  }>;
  // Additional properties for UI rendering
  measure?: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void;
}

// Conversation interface for direct messages
export interface Conversation {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantAvatars: { [userId: string]: string };
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: Timestamp;
  };
  lastMessageTime: Timestamp;
  unreadCount: { [userId: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// User interface (unified)
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  gold: number;
  gems: number;
  level: number;
  createdAt: Timestamp;
  lastSeen: Timestamp;
  isGuest?: boolean;
}

// Chat preview for DirectMessagesScreen
export interface ChatPreview {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  isTyping?: boolean;
  status: 'online' | 'offline' | 'busy' | 'idle';
  isCloseFriend?: boolean;
  level?: number;
  isLive?: boolean;
}

// Utility types for API responses
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  lastDoc?: any;
}

// Conversion utilities
export class MessageConverter {
  // Convert DirectMessage (from Firestore) to UnifiedMessage
  static fromDirectMessage(dm: any): UnifiedMessage {
    return {
      id: dm.id,
      senderId: dm.senderId,
      senderName: dm.senderName,
      senderAvatar: dm.senderAvatar,
      text: dm.text,
      timestamp: dm.timestamp,
      type: dm.type || 'text',
      isLive: dm.isLive,
      edited: dm.edited,
      attachments: dm.attachments,
      mentions: dm.mentions,
      replyTo: dm.replyTo,
      reactions: dm.reactions
    };
  }

  // Convert ChatScreen Message to UnifiedMessage
  static fromChatScreenMessage(msg: any): UnifiedMessage {
    return {
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      text: msg.text,
      timestamp: msg.timestamp,
      type: 'text',
      isLive: msg.isLive,
      edited: msg.edited,
      attachments: msg.attachments,
      mentions: msg.mentions,
      replyTo: msg.replyTo,
      reactions: msg.reactions,
      measure: msg.measure
    };
  }

  // Convert UnifiedMessage to format expected by Message component
  static toMessageComponentFormat(msg: UnifiedMessage, currentUserId?: string) {
    return {
      id: msg.id,
      text: msg.text,
      time: msg.timestamp instanceof Timestamp
        ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : typeof msg.timestamp === 'string' ? msg.timestamp : 'Now',
      type: msg.senderId === currentUserId ? 'sent' : 'received',
      status: 'delivered' as const,
      reactions: msg.reactions?.map(r => ({
        emoji: r.emoji,
        count: r.count,
        userIds: r.userIds
      })) || [],
      attachments: msg.attachments?.map(a => ({
        id: a.id,
        type: a.type,
        url: a.url,
        filename: a.filename,
        width: a.width,
        height: a.height
      })) || [],
      showAvatar: true,
      showName: true,
      userName: msg.senderName,
      userAvatar: msg.senderAvatar
    };
  }
}
