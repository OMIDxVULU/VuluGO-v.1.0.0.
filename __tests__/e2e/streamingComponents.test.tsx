/**
 * End-to-End Component Tests
 * Testing React components with streaming functionality
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { jest } from '@jest/globals';

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
      select: jest.fn().mockImplementation((options) => options.ios)
    },
    Dimensions: {
      get: jest.fn().mockReturnValue({ width: 375, height: 812 })
    },
    Alert: {
      alert: jest.fn()
    }
  };
});

// Mock Expo modules
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('expo-av', () => ({
  Video: 'Video',
  ResizeMode: {
    CONTAIN: 'contain',
    COVER: 'cover'
  }
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn()
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: { streamId: 'test-stream-id' }
  }),
  useFocusEffect: jest.fn()
}));

// Mock services
import { 
  mockFirestore, 
  mockAuth, 
  setupMockUser,
  setupMockStream,
  resetAllMocks
} from '../__mocks__/firebase';

jest.mock('../../src/services/firebase', () => ({
  db: mockFirestore,
  auth: mockAuth
}));

// Mock hooks (initialized per test in beforeEach)
let mockUseStream: any;
let mockUseChat: any;

jest.mock('../../src/hooks/useStream', () => ({
  __esModule: true,
  default: () => mockUseStream
}));

jest.mock('../../src/hooks/useChat', () => ({
  __esModule: true,
  default: () => mockUseChat
}));

// Import components to test
import StreamDiscoveryScreen from '../../src/screens/StreamDiscoveryScreen';
import LiveStreamScreen from '../../src/screens/LiveStreamScreen';
import CreateStreamScreen from '../../src/screens/CreateStreamScreen';

// Mock context providers
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const MockStreamProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <MockAuthProvider>
      <MockStreamProvider>
        {component}
      </MockStreamProvider>
    </MockAuthProvider>
  );
};

describe('Streaming Components E2E Tests', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    
    setupMockUser({
      uid: 'test-user-id',
      displayName: 'Test User'
    });

    // Fresh mocks each test to avoid bleed
    mockUseStream = {
      currentStream: null,
      isLoading: false,
      error: null,
      liveStreams: [],
      isHost: false,
      createStream: jest.fn(),
      startStream: jest.fn(),
      joinStream: jest.fn(),
      leaveStream: jest.fn(),
      endStream: jest.fn(),
      refreshStreams: jest.fn()
    };

    mockUseChat = {
      messages: [],
      isLoading: false,
      error: null,
      sendMessage: jest.fn(),
      subscribeToMessages: jest.fn()
    };
  });

  describe('Stream Discovery Screen', () => {
    it('should render stream discovery screen with live streams', async () => {
      const mockStreams = [
        setupMockStream({
          id: 'stream-1',
          title: 'Gaming Stream',
          hostName: 'Gamer1',
          viewerCount: 150,
          status: 'live'
        }),
        setupMockStream({
          id: 'stream-2',
          title: 'Music Stream',
          hostName: 'Musician1',
          viewerCount: 75,
          status: 'live'
        })
      ];

      // Mock the useStream hook to return live streams
      mockUseStream.liveStreams = mockStreams;
      mockUseStream.isLoading = false;

      const { getByText, getByTestId } = renderWithProviders(
        <StreamDiscoveryScreen />
      );

      await waitFor(() => {
        expect(getByText('Gaming Stream')).toBeTruthy();
        expect(getByText('Music Stream')).toBeTruthy();
        expect(getByText('150 viewers')).toBeTruthy();
        expect(getByText('75 viewers')).toBeTruthy();
      });
    });

    it('should handle stream selection and navigation', async () => {
      const mockStreams = [
        setupMockStream({
          id: 'stream-1',
          title: 'Test Stream',
          status: 'live'
        })
      ];

      mockUseStream.liveStreams = mockStreams;

      const { getByText } = renderWithProviders(
        <StreamDiscoveryScreen />
      );

      await waitFor(() => {
        const streamCard = getByText('Test Stream');
        fireEvent.press(streamCard);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('LiveStream', {
        streamId: 'stream-1'
      });
    });

    it('should show loading state', () => {
      mockUseStream.isLoading = true;
      mockUseStream.liveStreams = [];

      const { getByTestId } = renderWithProviders(
        <StreamDiscoveryScreen />
      );

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should show error state', () => {
      mockUseStream.isLoading = false;
      mockUseStream.error = 'Failed to load streams';
      mockUseStream.liveStreams = [];

      const { getByText } = renderWithProviders(
        <StreamDiscoveryScreen />
      );

      expect(getByText('Failed to load streams')).toBeTruthy();
    });
  });

  describe('Create Stream Screen', () => {
    it('should render create stream form', () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <CreateStreamScreen />
      );

      expect(getByPlaceholderText('Stream title')).toBeTruthy();
      expect(getByPlaceholderText('Stream description')).toBeTruthy();
      expect(getByText('Create Stream')).toBeTruthy();
    });

    it('should handle stream creation', async () => {
      mockUseStream.createStream.mockResolvedValue('new-stream-id');

      const { getByPlaceholderText, getByText } = renderWithProviders(
        <CreateStreamScreen />
      );

      const titleInput = getByPlaceholderText('Stream title');
      const descriptionInput = getByPlaceholderText('Stream description');
      const createButton = getByText('Create Stream');

      await act(async () => {
        fireEvent.changeText(titleInput, 'My Test Stream');
        fireEvent.changeText(descriptionInput, 'This is a test stream');
        fireEvent.press(createButton);
      });

      await waitFor(() => {
        expect(mockUseStream.createStream).toHaveBeenCalledWith({
          title: 'My Test Stream',
          description: 'This is a test stream',
          category: expect.any(String),
          isPrivate: false
        });
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('LiveStream', {
        streamId: 'new-stream-id'
      });
    });

    it('should validate form inputs', async () => {
      const { getByText } = renderWithProviders(
        <CreateStreamScreen />
      );

      const createButton = getByText('Create Stream');

      await act(async () => {
        fireEvent.press(createButton);
      });

      await waitFor(() => {
        expect(getByText('Title is required')).toBeTruthy();
      });

      expect(mockUseStream.createStream).not.toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      mockUseStream.createStream.mockRejectedValue(new Error('Creation failed'));

      const { getByPlaceholderText, getByText } = renderWithProviders(
        <CreateStreamScreen />
      );

      const titleInput = getByPlaceholderText('Stream title');
      const createButton = getByText('Create Stream');

      await act(async () => {
        fireEvent.changeText(titleInput, 'Test Stream');
        fireEvent.press(createButton);
      });

      await waitFor(() => {
        expect(getByText('Failed to create stream')).toBeTruthy();
      });
    });
  });

  describe('Live Stream Screen', () => {
    it('should render live stream interface for host', async () => {
      const mockStream = setupMockStream({
        id: 'test-stream-id',
        title: 'Live Test Stream',
        hostId: 'test-user-id',
        status: 'live',
        viewerCount: 10
      });

      mockUseStream.currentStream = mockStream;
      mockUseStream.isHost = true;

      const { getByText, getByTestId } = renderWithProviders(
        <LiveStreamScreen />
      );

      await waitFor(() => {
        expect(getByText('Live Test Stream')).toBeTruthy();
        expect(getByText('10 viewers')).toBeTruthy();
        expect(getByTestId('end-stream-button')).toBeTruthy();
      });
    });

    it('should render live stream interface for viewer', async () => {
      const mockStream = setupMockStream({
        id: 'test-stream-id',
        title: 'Live Test Stream',
        hostId: 'other-user-id',
        status: 'live',
        viewerCount: 10
      });

      mockUseStream.currentStream = mockStream;
      mockUseStream.isHost = false;

      const { getByText, getByTestId } = renderWithProviders(
        <LiveStreamScreen />
      );

      await waitFor(() => {
        expect(getByText('Live Test Stream')).toBeTruthy();
        expect(getByTestId('leave-stream-button')).toBeTruthy();
      });
    });

    it('should handle chat messages', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          userId: 'user-1',
          userName: 'User1',
          text: 'Hello everyone!',
          timestamp: new Date()
        },
        {
          id: 'msg-2',
          userId: 'user-2',
          userName: 'User2',
          text: 'Great stream!',
          timestamp: new Date()
        }
      ];

      mockUseChat.messages = mockMessages;

      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LiveStreamScreen />
      );

      await waitFor(() => {
        expect(getByText('Hello everyone!')).toBeTruthy();
        expect(getByText('Great stream!')).toBeTruthy();
      });

      // Test sending a message
      const messageInput = getByPlaceholderText('Type a message...');
      const sendButton = getByText('Send');

      await act(async () => {
        fireEvent.changeText(messageInput, 'My test message');
        fireEvent.press(sendButton);
      });

      expect(mockUseChat.sendMessage).toHaveBeenCalledWith({
        text: 'My test message',
        type: 'text'
      });
    });

    it('should handle stream ending by host', async () => {
      const mockStream = setupMockStream({
        id: 'test-stream-id',
        hostId: 'test-user-id',
        status: 'live'
      });

      mockUseStream.currentStream = mockStream;
      mockUseStream.isHost = true;
      mockUseStream.endStream.mockResolvedValue(undefined);

      const { getByTestId } = renderWithProviders(
        <LiveStreamScreen />
      );

      const endButton = getByTestId('end-stream-button');

      await act(async () => {
        fireEvent.press(endButton);
      });

      // Should show confirmation dialog
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith(
        'End Stream',
        'Are you sure you want to end this stream?',
        expect.any(Array)
      );
    });

    it('should handle viewer leaving stream', async () => {
      const mockStream = setupMockStream({
        id: 'test-stream-id',
        hostId: 'other-user-id',
        status: 'live'
      });

      mockUseStream.currentStream = mockStream;
      mockUseStream.isHost = false;
      mockUseStream.leaveStream.mockResolvedValue(undefined);

      const { getByTestId } = renderWithProviders(
        <LiveStreamScreen />
      );

      const leaveButton = getByTestId('leave-stream-button');

      await act(async () => {
        fireEvent.press(leaveButton);
      });

      expect(mockUseStream.leaveStream).toHaveBeenCalled();
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockUseStream.error = 'Connection failed';

      const { getByText } = renderWithProviders(
        <LiveStreamScreen />
      );

      await waitFor(() => {
        expect(getByText('Connection failed')).toBeTruthy();
      });
    });
  });

  describe('Stream Interactions', () => {
    it('should handle reactions in live stream', async () => {
      const mockStream = setupMockStream({
        id: 'test-stream-id',
        status: 'live'
      });

      mockUseStream.currentStream = mockStream;

      const { getByTestId } = renderWithProviders(
        <LiveStreamScreen />
      );

      const heartReaction = getByTestId('heart-reaction');

      await act(async () => {
        fireEvent.press(heartReaction);
      });

      // Should trigger reaction animation
      expect(getByTestId('reaction-animation')).toBeTruthy();
    });

    it('should handle viewer count updates', async () => {
      const mockStream = setupMockStream({
        id: 'test-stream-id',
        status: 'live',
        viewerCount: 5
      });

      mockUseStream.currentStream = mockStream;

      const { getByText, rerender } = renderWithProviders(
        <LiveStreamScreen />
      );

      expect(getByText('5 viewers')).toBeTruthy();

      // Simulate viewer count update
      mockUseStream.currentStream = {
        ...mockStream,
        viewerCount: 8
      };

      rerender(
        <MockAuthProvider>
          <MockStreamProvider>
            <LiveStreamScreen />
          </MockStreamProvider>
        </MockAuthProvider>
      );

      await waitFor(() => {
        expect(getByText('8 viewers')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error boundary for component crashes', () => {
      // Mock a component that throws an error
      const ThrowError = () => {
        throw new Error('Component crashed');
      };

      const { getByText } = render(
        <ThrowError />
      );

      // Error boundary should catch and display error
      expect(getByText(/Something went wrong/)).toBeTruthy();
    });

    it('should handle network connectivity issues', async () => {
      mockUseStream.error = 'Network error';
      mockUseStream.isLoading = false;

      const { getByText, getByTestId } = renderWithProviders(
        <StreamDiscoveryScreen />
      );

      await waitFor(() => {
        expect(getByText('Network error')).toBeTruthy();
        expect(getByTestId('retry-button')).toBeTruthy();
      });

      // Test retry functionality
      const retryButton = getByTestId('retry-button');
      
      await act(async () => {
        fireEvent.press(retryButton);
      });

      // Should attempt to reload streams
      expect(mockUseStream.refreshStreams).toHaveBeenCalled();
    });
  });
});
