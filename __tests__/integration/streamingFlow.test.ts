/**
 * Streaming Flow Integration Tests
 * End-to-end testing of complete streaming workflows
 */

import { jest } from '@jest/globals';
import streamService from '../../src/services/streamService';
import chatService from '../../src/services/chatService';
import notificationService from '../../src/services/notificationService';
import { 
  mockFirestore, 
  mockAuth, 
  mockFunctions,
  setupMockUser,
  setupMockStream,
  setupMockFirestoreDoc,
  setupMockFirestoreCollection,
  resetAllMocks
} from '../__mocks__/firebase';

// Mock all Firebase services
jest.mock('../../src/services/firebase', () => ({
  db: mockFirestore,
  auth: mockAuth,
  functions: mockFunctions
}));

// Mock Agora SDK
jest.mock('react-native-agora', () => ({
  RtcEngine: {
    create: jest.fn().mockResolvedValue({
      joinChannel: jest.fn().mockResolvedValue(0),
      leaveChannel: jest.fn().mockResolvedValue(0),
      enableVideo: jest.fn().mockResolvedValue(0),
      enableAudio: jest.fn().mockResolvedValue(0),
      startPreview: jest.fn().mockResolvedValue(0),
      stopPreview: jest.fn().mockResolvedValue(0),
      destroy: jest.fn().mockResolvedValue(0),
      addListener: jest.fn(),
      removeAllListeners: jest.fn()
    }),
    destroy: jest.fn()
  },
  ChannelProfileType: { LiveBroadcasting: 1 },
  ClientRoleType: { Broadcaster: 1, Audience: 2 }
}));

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-expo-token' }),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  setBadgeCountAsync: jest.fn()
}));

describe('Streaming Flow Integration Tests', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    // Cleanup services
    streamService.destroy();
    chatService.destroy();
    notificationService.cleanup();
  });

  describe('Complete Stream Lifecycle', () => {
    it('should handle complete stream creation to end flow', async () => {
      // Setup: Host user
      setupMockUser({
        uid: 'host-user-id',
        displayName: 'Host User'
      });

      // Step 1: Create stream
      const streamData = {
        title: 'Integration Test Stream',
        description: 'Testing complete flow',
        category: 'gaming',
        isPrivate: false
      };

      setupMockFirestoreDoc(null); // For initial stream creation
      mockFirestore.collection.mockReturnValue({
        add: jest.fn().mockResolvedValue({ id: 'test-stream-id' })
      });

      const streamId = await streamService.createStream(streamData);
      expect(streamId).toBe('test-stream-id');

      // Step 2: Start stream
      const mockStream = setupMockStream({
        id: 'test-stream-id',
        hostId: 'host-user-id',
        status: 'waiting'
      });

      setupMockFirestoreDoc(mockStream);
      mockFirestore.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockStream
        }),
        update: jest.fn().mockResolvedValue(undefined)
      });

      const streamResult = await streamService.startStream(streamId);
      expect(streamResult.streamId).toBe(streamId);
      expect(streamResult.isHost).toBe(true);

      // Step 3: Simulate viewer joining
      setupMockUser({
        uid: 'viewer-user-id',
        displayName: 'Viewer User'
      });

      const updatedStream = { ...mockStream, status: 'live', viewerCount: 1 };
      setupMockFirestoreDoc(updatedStream);

      const viewerResult = await streamService.joinStream(streamId);
      expect(viewerResult.streamId).toBe(streamId);
      expect(viewerResult.isHost).toBe(false);

      // Step 4: Send chat message
      const messageData = {
        text: 'Hello from integration test!',
        type: 'text' as const
      };

      mockFirestore.collection.mockReturnValue({
        add: jest.fn().mockResolvedValue({ id: 'test-message-id' })
      });

      const messageId = await chatService.sendMessage(streamId, messageData);
      expect(messageId).toBe('test-message-id');

      // Step 5: End stream
      setupMockUser({
        uid: 'host-user-id',
        displayName: 'Host User'
      });

      await streamService.endStream(streamId);
      expect(mockFirestore.doc).toHaveBeenCalledWith(`streams/${streamId}`);
    });

    it('should handle stream with multiple viewers and chat', async () => {
      const streamId = 'multi-viewer-stream';
      
      // Setup stream
      const mockStream = setupMockStream({
        id: streamId,
        hostId: 'host-user-id',
        status: 'live',
        viewerCount: 0
      });

      setupMockFirestoreDoc(mockStream);

      // Simulate multiple viewers joining
      const viewers = ['viewer-1', 'viewer-2', 'viewer-3'];
      
      for (const viewerId of viewers) {
        setupMockUser({
          uid: viewerId,
          displayName: `Viewer ${viewerId}`
        });

        const result = await streamService.joinStream(streamId);
        expect(result.streamId).toBe(streamId);
        expect(result.isHost).toBe(false);
      }

      // Simulate chat messages from different viewers
      const messages = [
        { userId: 'viewer-1', text: 'First message!' },
        { userId: 'viewer-2', text: 'Second message!' },
        { userId: 'viewer-3', text: 'Third message!' }
      ];

      for (const message of messages) {
        setupMockUser({
          uid: message.userId,
          displayName: `User ${message.userId}`
        });

        mockFirestore.collection.mockReturnValue({
          add: jest.fn().mockResolvedValue({ id: `message-${message.userId}` })
        });

        const messageId = await chatService.sendMessage(streamId, {
          text: message.text,
          type: 'text'
        });

        expect(messageId).toBe(`message-${message.userId}`);
      }
    });
  });

  describe('Error Scenarios', () => {
    it('should handle stream creation failure gracefully', async () => {
      setupMockUser();

      // Mock Firestore error
      mockFirestore.collection.mockReturnValue({
        add: jest.fn().mockRejectedValue(new Error('Network error'))
      });

      const streamData = {
        title: 'Test Stream',
        description: 'Test Description',
        category: 'gaming',
        isPrivate: false
      };

      await expect(streamService.createStream(streamData)).rejects.toThrow(
        'Failed to create stream'
      );
    });

    it('should handle Agora connection failure', async () => {
      setupMockUser();

      const mockStream = setupMockStream({
        hostId: 'test-user-id',
        status: 'waiting'
      });

      setupMockFirestoreDoc(mockStream);

      // Mock Agora engine creation failure
      const RtcEngine = require('react-native-agora').RtcEngine;
      RtcEngine.create.mockRejectedValueOnce(new Error('Agora connection failed'));

      await expect(streamService.startStream('test-stream-id')).rejects.toThrow(
        'Failed to initialize Agora engine'
      );
    });

    it('should handle chat service failures', async () => {
      setupMockUser();

      // Mock chat message send failure
      mockFirestore.collection.mockReturnValue({
        add: jest.fn().mockRejectedValue(new Error('Chat service unavailable'))
      });

      const messageData = {
        text: 'Test message',
        type: 'text' as const
      };

      await expect(chatService.sendMessage('test-stream-id', messageData)).rejects.toThrow(
        'Failed to send message'
      );
    });
  });

  describe('Permission and Security', () => {
    it('should enforce stream host permissions', async () => {
      const streamId = 'permission-test-stream';
      
      // Setup stream with different host
      const mockStream = setupMockStream({
        id: streamId,
        hostId: 'other-user-id',
        status: 'waiting'
      });

      setupMockFirestoreDoc(mockStream);

      // Try to start stream as non-host
      setupMockUser({
        uid: 'unauthorized-user-id'
      });

      await expect(streamService.startStream(streamId)).rejects.toThrow(
        'Only the host can start the stream'
      );
    });

    it('should enforce private stream access', async () => {
      const streamId = 'private-stream';
      
      // Setup private stream
      const mockStream = setupMockStream({
        id: streamId,
        hostId: 'host-user-id',
        status: 'live',
        isPrivate: true,
        allowedViewers: ['allowed-user-id']
      });

      setupMockFirestoreDoc(mockStream);

      // Try to join as unauthorized user
      setupMockUser({
        uid: 'unauthorized-user-id'
      });

      await expect(streamService.joinStream(streamId)).rejects.toThrow(
        'You are not allowed to join this private stream'
      );
    });

    it('should handle chat moderation', async () => {
      setupMockUser();

      const streamId = 'moderated-stream';
      
      // Mock spam detection
      const spamMessage = {
        text: 'SPAM SPAM SPAM BUY NOW!!!',
        type: 'text' as const
      };

      // This would trigger spam detection in real implementation
      mockFirestore.collection.mockReturnValue({
        add: jest.fn().mockRejectedValue(new Error('Message blocked by moderation'))
      });

      await expect(chatService.sendMessage(streamId, spamMessage)).rejects.toThrow(
        'Failed to send message'
      );
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time stream updates', async () => {
      const streamId = 'realtime-stream';
      let snapshotCallback: any;

      // Mock Firestore onSnapshot
      mockFirestore.doc.mockReturnValue({
        onSnapshot: jest.fn().mockImplementation((callback) => {
          snapshotCallback = callback;
          return jest.fn(); // Unsubscribe function
        }),
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => setupMockStream({ id: streamId })
        })
      });

      // Start listening to stream updates
      const unsubscribe = streamService.subscribeToStream(streamId, (stream) => {
        expect(stream.id).toBe(streamId);
      });

      // Simulate stream update
      const updatedStream = setupMockStream({
        id: streamId,
        viewerCount: 5,
        status: 'live'
      });

      snapshotCallback({
        exists: () => true,
        data: () => updatedStream,
        id: streamId
      });

      // Cleanup
      unsubscribe();
    });

    it('should handle real-time chat updates', async () => {
      const streamId = 'chat-realtime-stream';
      let snapshotCallback: any;

      // Mock chat collection onSnapshot
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        onSnapshot: jest.fn().mockImplementation((callback) => {
          snapshotCallback = callback;
          return jest.fn(); // Unsubscribe function
        })
      });

      // Start listening to chat messages
      const unsubscribe = chatService.subscribeToMessages(streamId, (messages) => {
        expect(Array.isArray(messages)).toBe(true);
      });

      // Simulate new message
      const newMessage = {
        id: 'new-message-id',
        streamId,
        userId: 'test-user-id',
        text: 'New message!',
        type: 'text',
        timestamp: mockFirestore.Timestamp.now()
      };

      snapshotCallback({
        docs: [{
          id: newMessage.id,
          data: () => newMessage
        }]
      });

      // Cleanup
      unsubscribe();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high message volume', async () => {
      setupMockUser();
      const streamId = 'high-volume-stream';

      // Mock successful message sending
      mockFirestore.collection.mockReturnValue({
        add: jest.fn().mockImplementation(() => 
          Promise.resolve({ id: `message-${Date.now()}` })
        )
      });

      // Send multiple messages rapidly
      const messagePromises = [];
      for (let i = 0; i < 10; i++) {
        messagePromises.push(
          chatService.sendMessage(streamId, {
            text: `Message ${i}`,
            type: 'text'
          })
        );
      }

      const messageIds = await Promise.all(messagePromises);
      expect(messageIds).toHaveLength(10);
      messageIds.forEach(id => expect(id).toBeDefined());
    });

    it('should handle multiple concurrent stream operations', async () => {
      setupMockUser();

      // Mock multiple streams
      const streamIds = ['stream-1', 'stream-2', 'stream-3'];
      
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: streamIds.map(id => ({
            id,
            data: () => setupMockStream({ id, status: 'live' })
          }))
        })
      });

      // Get multiple streams concurrently
      const streamPromises = streamIds.map(id => 
        streamService.getStream(id)
      );

      const streams = await Promise.all(streamPromises);
      expect(streams).toHaveLength(3);
      streams.forEach((stream, index) => {
        expect(stream?.id).toBe(streamIds[index]);
      });
    });
  });
});
