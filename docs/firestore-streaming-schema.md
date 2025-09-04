# VuluGO Live Streaming Firestore Schema

## Overview
Comprehensive Firestore schema design for production-ready live streaming functionality with real-time chat, participant tracking, moderation, and analytics.

## Collections Structure

### 1. streams/{streamId}
**Main stream documents with enhanced metadata**

```typescript
interface Stream {
  // Core identifiers
  id: string;                    // Document ID
  hostId: string;               // User ID of stream host
  hostName: string;             // Display name of host
  hostAvatar?: string;          // Host profile image URL
  
  // Stream metadata
  title: string;                // Stream title (max 100 chars)
  description?: string;         // Stream description (max 500 chars)
  category: StreamCategory;     // gaming, music, talk, education, entertainment
  tags: string[];              // Searchable tags (max 10)
  thumbnailUrl?: string;       // Stream thumbnail image
  
  // Status and timing
  isActive: boolean;           // Currently live
  isPublic: boolean;           // Public vs private stream
  startedAt: Timestamp;        // Stream start time
  endedAt?: Timestamp;         // Stream end time
  scheduledFor?: Timestamp;    // Scheduled stream time
  
  // Participant tracking
  viewerCount: number;         // Current viewer count
  maxViewers: number;          // Peak viewer count
  totalViewers: number;        // Unique viewers count
  participants: StreamParticipant[]; // Current participants array
  
  // Stream settings
  allowChat: boolean;          // Chat enabled/disabled
  allowReactions: boolean;     // Reactions enabled/disabled
  isRecording: boolean;        // Recording status
  quality: StreamQuality;      // low, medium, high, auto
  
  // Moderation
  moderatorIds: string[];      // List of moderator user IDs
  bannedUserIds: string[];     // Banned users
  chatSettings: ChatSettings;  // Chat moderation settings
  
  // Analytics
  totalMessages: number;       // Total chat messages
  totalReactions: number;      // Total reactions received
  totalGifts: number;         // Total gifts received
  revenue: number;            // Total revenue in gold/gems
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivity: Timestamp;    // Last participant activity
}

interface StreamParticipant {
  id: string;                 // User ID
  name: string;              // Display name
  avatar?: string;           // Profile image
  role: 'host' | 'moderator' | 'viewer';
  joinedAt: Timestamp;
  lastSeen: Timestamp;
  isMuted: boolean;          // Audio muted
  isBanned: boolean;         // Temporarily banned
  isActive: boolean;         // Currently connected
}

interface ChatSettings {
  slowMode: number;          // Seconds between messages (0 = disabled)
  subscribersOnly: boolean;  // Only subscribers can chat
  moderatorsOnly: boolean;   // Only moderators can chat
  profanityFilter: boolean;  // Auto-filter profanity
  linkFilter: boolean;       // Block links
  maxMessageLength: number;  // Max chars per message
}

type StreamCategory = 'gaming' | 'music' | 'talk' | 'education' | 'entertainment' | 'other';
type StreamQuality = 'low' | 'medium' | 'high' | 'auto';
```

### 2. streams/{streamId}/chat/{messageId}
**Real-time chat messages with moderation**

```typescript
interface StreamChatMessage {
  id: string;                // Document ID
  streamId: string;          // Parent stream ID
  senderId: string;          // Message sender ID
  senderName: string;        // Sender display name
  senderAvatar?: string;     // Sender profile image
  senderRole: 'host' | 'moderator' | 'viewer';
  
  // Message content
  message: string;           // Message text (max 500 chars)
  type: MessageType;         // text, emoji, system, gift
  mentions: string[];        // Mentioned user IDs (@username)
  
  // Reactions and engagement
  reactions: MessageReaction[]; // Emoji reactions
  reactionCount: number;     // Total reactions
  
  // Moderation
  isDeleted: boolean;        // Soft delete flag
  deletedBy?: string;        // Moderator who deleted
  deleteReason?: string;     // Deletion reason
  isFiltered: boolean;       // Auto-filtered content
  
  // Metadata
  timestamp: Timestamp;
  editedAt?: Timestamp;
  clientTimestamp: number;   // Client-side timestamp for ordering
}

interface MessageReaction {
  emoji: string;             // Emoji unicode
  userIds: string[];         // Users who reacted
  count: number;             // Reaction count
}

type MessageType = 'text' | 'emoji' | 'system' | 'gift' | 'announcement';
```

### 3. streams/{streamId}/participants/{userId}
**Detailed participant tracking with presence**

```typescript
interface StreamParticipantDetail {
  userId: string;            // User ID
  streamId: string;          // Stream ID
  
  // User info
  displayName: string;
  username: string;
  avatar?: string;
  
  // Participation details
  role: ParticipantRole;
  joinedAt: Timestamp;
  leftAt?: Timestamp;
  duration: number;          // Total watch time in seconds
  
  // Status tracking
  isActive: boolean;         // Currently connected
  lastSeen: Timestamp;       // Last activity timestamp
  connectionQuality: ConnectionQuality;
  
  // Engagement metrics
  messagesSent: number;      // Messages sent in this stream
  reactionsGiven: number;    // Reactions given
  giftsGiven: number;        // Gifts sent
  giftValue: number;         // Total gift value in gold
  
  // Moderation status
  isMuted: boolean;          // Chat muted
  isBanned: boolean;         // Banned from stream
  warnings: number;          // Warning count
  
  // Technical details
  userAgent?: string;        // Device/browser info
  ipAddress?: string;        // IP for moderation (hashed)
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type ParticipantRole = 'host' | 'co-host' | 'moderator' | 'subscriber' | 'viewer';
type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
```

### 4. streamAnalytics/{streamId}
**Detailed analytics and metrics**

```typescript
interface StreamAnalytics {
  streamId: string;
  hostId: string;

  // Viewer metrics
  viewerStats: {
    peak: number;              // Peak concurrent viewers
    average: number;           // Average viewers
    total: number;             // Total unique viewers
    retention: number;         // Average watch time percentage
    dropoffPoints: number[];   // Timestamps where viewers left
  };

  // Engagement metrics
  chatStats: {
    totalMessages: number;
    messagesPerMinute: number;
    activeChattters: number;
    topChatters: TopChatter[];
  };

  // Revenue metrics
  monetization: {
    totalRevenue: number;      // In gold/gems
    giftRevenue: number;
    subscriptionRevenue: number;
    topGifters: TopGifter[];
  };

  // Technical metrics
  performance: {
    averageLatency: number;    // ms
    connectionIssues: number;
    qualityDrops: number;
    bufferingEvents: number;
  };

  // Time-series data (hourly buckets)
  hourlyStats: HourlyStats[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TopChatter {
  userId: string;
  name: string;
  messageCount: number;
}

interface TopGifter {
  userId: string;
  name: string;
  giftValue: number;
}

interface HourlyStats {
  hour: Timestamp;
  viewers: number;
  messages: number;
  revenue: number;
  quality: number;           // 0-100 quality score
}
```

### 5. streamModerationLogs/{logId}
**Moderation actions and audit trail**

```typescript
interface ModerationLog {
  id: string;
  streamId: string;
  moderatorId: string;
  moderatorName: string;

  // Action details
  action: ModerationAction;
  targetUserId?: string;
  targetUsername?: string;
  targetMessageId?: string;

  // Context
  reason: string;
  evidence?: string;         // Screenshot URL or message content
  duration?: number;         // Ban/timeout duration in minutes

  // Metadata
  timestamp: Timestamp;
  ipAddress?: string;        // Hashed IP for audit
  userAgent?: string;
}

type ModerationAction =
  | 'ban_user'
  | 'unban_user'
  | 'timeout_user'
  | 'delete_message'
  | 'clear_chat'
  | 'add_moderator'
  | 'remove_moderator'
  | 'update_chat_settings';
```

### 6. streamReports/{reportId}
**User reports and content moderation**

```typescript
interface StreamReport {
  id: string;
  streamId: string;
  reporterId: string;
  reporterName: string;

  // Report details
  type: ReportType;
  targetUserId?: string;
  targetMessageId?: string;
  description: string;
  evidence?: string[];       // Screenshot URLs

  // Status
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  resolution?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type ReportType = 'harassment' | 'spam' | 'inappropriate_content' | 'hate_speech' | 'other';
type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
```
