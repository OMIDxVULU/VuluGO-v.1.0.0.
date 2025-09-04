/**
 * Stream Service Unit Tests
 * Comprehensive testing for stream management functionality
 */

import { jest } from '@jest/globals';
import streamService from '../../src/services/streamService';
import { mockFirestore, mockAuth, mockFunctions } from '../__mocks__/firebase';

// Mock Firebase modules
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
  ChannelProfileType: {
    LiveBroadcasting: 1
  },
  ClientRoleType: {
    Broadcaster: 1,
    Audience: 2
  }
}));

describe('StreamService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock authenticated user
    mockAuth.currentUser = {
      uid: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com'
    };
  });

  afterEach(() => {
    // Cleanup any active streams
    streamService.destroy();
  });

  describe('Stream Creation', () => {
    it('should create a new stream successfully', async () => {
      const streamData = {
        title: 'Test Stream',
        description: 'Test Description',
        category: 'gaming',
        isPrivate: false
      };

      mockFirestore.collection.mockReturnValue({
        add: jest.fn().mockResolvedValue({
          id: 'test-stream-id'
        })
      });

      const streamId = await streamService.createStream(streamData);

      expect(streamId).toBe('test-stream-id');
      expect(mockFirestore.collection).toHaveBeenCalledWith('streams');
    });

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null;

      const streamData = {
        title: 'Test Stream',
        description: 'Test Description',
        category: 'gaming',
        isPrivate: false
      };

      await expect(streamService.createStream(streamData)).rejects.toThrow(
        'User not authenticated'
      );
    });

    it('should validate required stream data', async () => {
      const invalidStreamData = {
        description: 'Test Description',
        category: 'gaming',
        isPrivate: false
      };

      await expect(streamService.createStream(invalidStreamData as any)).rejects.toThrow();
    });
  });

  describe('Stream Management', () => {
    it('should start stream successfully', async () => {
      const mockStream = {
        id: 'test-stream-id',
        title: 'Test Stream',
        hostId: 'test-user-id',
        status: 'waiting'
      };

      mockFirestore.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockStream
        }),
        update: jest.fn().mockResolvedValue(undefined)
      });

      mockFunctions.httpsCallable.mockReturnValue(
        jest.fn().mockResolvedValue({
          data: { token: 'test-agora-token' }
        })
      );

      const result = await streamService.startStream('test-stream-id');

      expect(result).toBeDefined();
      expect(result.streamId).toBe('test-stream-id');
    });

    it('should end stream successfully', async () => {
      // First start a stream
      const mockStream = {
        id: 'test-stream-id',
        title: 'Test Stream',
        hostId: 'test-user-id',
        status: 'live'
      };

      mockFirestore.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockStream
        }),
        update: jest.fn().mockResolvedValue(undefined)
      });

      // Set up active stream state
      streamService.setCurrentStream({
        streamId: 'test-stream-id',
        isHost: true,
        engine: {} as any
      });

      await streamService.endStream('test-stream-id');

      expect(mockFirestore.doc).toHaveBeenCalledWith('streams/test-stream-id');
    });

    it('should handle stream not found error', async () => {
      mockFirestore.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: () => false
        })
      });

      await expect(streamService.startStream('non-existent-stream')).rejects.toThrow(
        'Stream not found'
      );
    });
  });

  describe('Stream Discovery', () => {
    it('should get live streams successfully', async () => {
      const mockStreams = [
        {
          id: 'stream-1',
          title: 'Stream 1',
          status: 'live',
          viewerCount: 10
        },
        {
          id: 'stream-2',
          title: 'Stream 2',
          status: 'live',
          viewerCount: 5
        }
      ];

      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: mockStreams.map(stream => ({
            id: stream.id,
            data: () => stream
          }))
        })
      });

      const streams = await streamService.getLiveStreams();

      expect(streams).toHaveLength(2);
      expect(streams[0].id).toBe('stream-1');
      expect(streams[1].id).toBe('stream-2');
    });

    it('should search streams by query', async () => {
      const mockStreams = [
        {
          id: 'stream-1',
          title: 'Gaming Stream',
          category: 'gaming',
          status: 'live'
        }
      ];

      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: mockStreams.map(stream => ({
            id: stream.id,
            data: () => stream
          }))
        })
      });

      const streams = await streamService.searchStreams('gaming');

      expect(streams).toHaveLength(1);
      expect(streams[0].title).toBe('Gaming Stream');
    });
  });

  describe('Stream Participation', () => {
    it('should join stream as viewer successfully', async () => {
      const mockStream = {
        id: 'test-stream-id',
        title: 'Test Stream',
        hostId: 'other-user-id',
        status: 'live'
      };

      mockFirestore.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockStream
        })
      });

      mockFunctions.httpsCallable.mockReturnValue(
        jest.fn().mockResolvedValue({
          data: { token: 'test-viewer-token' }
        })
      );

      const result = await streamService.joinStream('test-stream-id');

      expect(result).toBeDefined();
      expect(result.streamId).toBe('test-stream-id');
      expect(result.isHost).toBe(false);
    });

    it('should leave stream successfully', async () => {
      // Set up active stream state
      streamService.setCurrentStream({
        streamId: 'test-stream-id',
        isHost: false,
        engine: {
          leaveChannel: jest.fn().mockResolvedValue(0),
          destroy: jest.fn().mockResolvedValue(0)
        } as any
      });

      await streamService.leaveStream();

      expect(streamService.getCurrentStream()).toBeNull();
    });
  });

  describe('Stream State Management', () => {
    it('should track current stream state', () => {
      const streamState = {
        streamId: 'test-stream-id',
        isHost: true,
        engine: {} as any
      };

      streamService.setCurrentStream(streamState);

      expect(streamService.getCurrentStream()).toEqual(streamState);
      expect(streamService.isInStream()).toBe(true);
      expect(streamService.isHost()).toBe(true);
    });

    it('should clear stream state on leave', async () => {
      streamService.setCurrentStream({
        streamId: 'test-stream-id',
        isHost: false,
        engine: {
          leaveChannel: jest.fn().mockResolvedValue(0),
          destroy: jest.fn().mockResolvedValue(0)
        } as any
      });

      await streamService.leaveStream();

      expect(streamService.getCurrentStream()).toBeNull();
      expect(streamService.isInStream()).toBe(false);
      expect(streamService.isHost()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle Agora engine creation failure', async () => {
      const RtcEngine = require('react-native-agora').RtcEngine;
      RtcEngine.create.mockRejectedValueOnce(new Error('Agora initialization failed'));

      const mockStream = {
        id: 'test-stream-id',
        title: 'Test Stream',
        hostId: 'test-user-id',
        status: 'waiting'
      };

      mockFirestore.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockStream
        })
      });

      await expect(streamService.startStream('test-stream-id')).rejects.toThrow(
        'Failed to initialize Agora engine'
      );
    });

    it('should handle network errors gracefully', async () => {
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

    it('should handle permission errors', async () => {
      const mockStream = {
        id: 'test-stream-id',
        title: 'Test Stream',
        hostId: 'other-user-id',
        status: 'waiting'
      };

      mockFirestore.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockStream
        })
      });

      await expect(streamService.startStream('test-stream-id')).rejects.toThrow(
        'Only the host can start the stream'
      );
    });
  });

  describe('Stream Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const mockEngine = {
        destroy: jest.fn().mockResolvedValue(0),
        removeAllListeners: jest.fn()
      };

      streamService.setCurrentStream({
        streamId: 'test-stream-id',
        isHost: true,
        engine: mockEngine as any
      });

      streamService.destroy();

      expect(streamService.getCurrentStream()).toBeNull();
    });

    it('should handle cleanup errors gracefully', () => {
      const mockEngine = {
        destroy: jest.fn().mockRejectedValue(new Error('Cleanup failed')),
        removeAllListeners: jest.fn()
      };

      streamService.setCurrentStream({
        streamId: 'test-stream-id',
        isHost: true,
        engine: mockEngine as any
      });

      // Should not throw
      expect(() => streamService.destroy()).not.toThrow();
    });
  });

  describe('Stream Validation', () => {
    it('should validate stream data before creation', async () => {
      const invalidData = [
        { title: '', description: 'Test', category: 'gaming', isPrivate: false },
        { title: 'Test', description: '', category: 'gaming', isPrivate: false },
        { title: 'Test', description: 'Test', category: '', isPrivate: false },
        { title: 'Test', description: 'Test', category: 'invalid-category', isPrivate: false }
      ];

      for (const data of invalidData) {
        await expect(streamService.createStream(data as any)).rejects.toThrow();
      }
    });

    it('should validate stream permissions', async () => {
      const mockStream = {
        id: 'private-stream-id',
        title: 'Private Stream',
        hostId: 'other-user-id',
        status: 'live',
        isPrivate: true,
        allowedViewers: ['allowed-user-id']
      };

      mockFirestore.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockStream
        })
      });

      await expect(streamService.joinStream('private-stream-id')).rejects.toThrow(
        'You are not allowed to join this private stream'
      );
    });
  });
});
