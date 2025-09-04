/**
 * Test Helper Utilities
 * Common utilities and helpers for testing
 */

import { act } from '@testing-library/react-native';
import { jest } from '@jest/globals';

// Time utilities
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

export const waitForNextUpdate = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

export const advanceTimersByTime = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

export const runAllTimers = () => {
  act(() => {
    jest.runAllTimers();
  });
};

// Mock data generators
export const generateMockUser = (overrides = {}) => ({
  uid: 'test-user-id',
  displayName: 'Test User',
  email: 'test@example.com',
  photoURL: null,
  emailVerified: true,
  createdAt: new Date(),
  ...overrides
});

export const generateMockStream = (overrides = {}) => ({
  id: 'test-stream-id',
  title: 'Test Stream',
  description: 'Test Description',
  hostId: 'test-user-id',
  hostName: 'Test User',
  status: 'waiting',
  category: 'gaming',
  isPrivate: false,
  viewerCount: 0,
  maxViewers: 100,
  tags: ['test'],
  thumbnail: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const generateMockMessage = (overrides = {}) => ({
  id: 'test-message-id',
  streamId: 'test-stream-id',
  userId: 'test-user-id',
  userName: 'Test User',
  text: 'Test message',
  type: 'text',
  timestamp: new Date(),
  reactions: {},
  isDeleted: false,
  ...overrides
});

export const generateMockNotification = (overrides = {}) => ({
  id: 'test-notification-id',
  userId: 'test-user-id',
  type: 'stream_started',
  title: 'Test Notification',
  message: 'Test notification message',
  read: false,
  timestamp: new Date(),
  data: {},
  ...overrides
});

// Firebase mock helpers
export const mockFirestoreTimestamp = (date = new Date()) => ({
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  toDate: () => date,
  toMillis: () => date.getTime()
});

export const mockFirestoreDoc = (data: any, exists = true) => ({
  exists: () => exists,
  data: () => data,
  id: data?.id || 'mock-doc-id',
  ref: {
    id: data?.id || 'mock-doc-id',
    path: `collection/${data?.id || 'mock-doc-id'}`
  }
});

export const mockFirestoreCollection = (docs: any[]) => ({
  docs: docs.map(doc => mockFirestoreDoc(doc)),
  empty: docs.length === 0,
  size: docs.length,
  forEach: (callback: (doc: any) => void) => docs.forEach(doc => callback(mockFirestoreDoc(doc)))
});

// Error simulation helpers
export const simulateNetworkError = () => {
  const error = new Error('Network request failed');
  (error as any).code = 'network-request-failed';
  return error;
};

export const simulatePermissionError = () => {
  const error = new Error('Permission denied');
  (error as any).code = 'permission-denied';
  return error;
};

export const simulateAuthError = () => {
  const error = new Error('User not authenticated');
  (error as any).code = 'auth/user-not-found';
  return error;
};

// Component testing helpers
export const findByTestId = (component: any, testId: string) => {
  return component.findByProps({ testID: testId });
};

export const findAllByTestId = (component: any, testId: string) => {
  return component.findAllByProps({ testID: testId });
};

export const findByText = (component: any, text: string) => {
  return component.findByProps({ children: text });
};

// Async testing helpers
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (!condition() && Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

export const waitForAsyncUpdate = async () => {
  await act(async () => {
    await flushPromises();
  });
};

// Mock service helpers
export const createMockStreamService = () => ({
  createStream: jest.fn(),
  startStream: jest.fn(),
  joinStream: jest.fn(),
  leaveStream: jest.fn(),
  endStream: jest.fn(),
  getStream: jest.fn(),
  getLiveStreams: jest.fn(),
  searchStreams: jest.fn(),
  subscribeToStream: jest.fn(),
  getCurrentStream: jest.fn(),
  isInStream: jest.fn(),
  isHost: jest.fn(),
  destroy: jest.fn()
});

export const createMockChatService = () => ({
  sendMessage: jest.fn(),
  deleteMessage: jest.fn(),
  getMessages: jest.fn(),
  subscribeToMessages: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
  reportMessage: jest.fn(),
  blockUser: jest.fn(),
  destroy: jest.fn()
});

export const createMockAuthService = () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
  updateProfile: jest.fn(),
  resetPassword: jest.fn(),
  deleteAccount: jest.fn(),
  onAuthStateChanged: jest.fn()
});

export const createMockNotificationService = () => ({
  requestPermissions: jest.fn(),
  getNotifications: jest.fn(),
  markAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  subscribeToNotifications: jest.fn(),
  sendNotification: jest.fn(),
  cleanup: jest.fn()
});

// Performance testing helpers
export const measureRenderTime = async (renderFunction: () => Promise<any>) => {
  const startTime = performance.now();
  await renderFunction();
  const endTime = performance.now();
  return endTime - startTime;
};

export const measureAsyncOperation = async (operation: () => Promise<any>) => {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  return {
    result,
    duration: endTime - startTime
  };
};

// Memory testing helpers
export const createMemoryLeakTest = (createInstance: () => any, destroyInstance: (instance: any) => void) => {
  return async () => {
    const instances = [];
    
    // Create multiple instances
    for (let i = 0; i < 10; i++) {
      instances.push(createInstance());
    }
    
    // Destroy all instances
    instances.forEach(instance => destroyInstance(instance));
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  };
};

// Snapshot testing helpers
export const createSnapshotTest = (component: any, props = {}) => {
  return () => {
    const tree = component(props);
    expect(tree).toMatchSnapshot();
  };
};

// Integration testing helpers
export const setupIntegrationTest = async () => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Setup fake timers
  jest.useFakeTimers();
  
  // Setup mock user
  const mockUser = generateMockUser();
  
  return {
    mockUser,
    cleanup: () => {
      jest.useRealTimers();
      jest.clearAllMocks();
    }
  };
};

// E2E testing helpers
export const setupE2ETest = async () => {
  // Setup test environment
  const testEnv = await setupIntegrationTest();
  
  // Additional E2E setup
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn()
  };
  
  return {
    ...testEnv,
    mockNavigation,
    cleanup: () => {
      testEnv.cleanup();
      jest.clearAllMocks();
    }
  };
};

// Accessibility testing helpers
export const testAccessibility = (component: any) => {
  // Check for accessibility labels
  const accessibilityElements = component.findAllByProps({ accessibilityLabel: expect.any(String) });
  expect(accessibilityElements.length).toBeGreaterThan(0);
  
  // Check for accessibility roles
  const roleElements = component.findAllByProps({ accessibilityRole: expect.any(String) });
  expect(roleElements.length).toBeGreaterThan(0);
};

// Custom matchers
export const customMatchers = {
  toBeValidStream: (received: any) => {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.title === 'string' &&
      typeof received.hostId === 'string' &&
      ['waiting', 'live', 'ended'].includes(received.status);
    
    return {
      message: () => `expected ${received} to be a valid stream object`,
      pass
    };
  },
  
  toBeValidMessage: (received: any) => {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.text === 'string' &&
      typeof received.userId === 'string' &&
      received.timestamp instanceof Date;
    
    return {
      message: () => `expected ${received} to be a valid message object`,
      pass
    };
  }
};

// Export all utilities
export default {
  flushPromises,
  waitForNextUpdate,
  advanceTimersByTime,
  runAllTimers,
  generateMockUser,
  generateMockStream,
  generateMockMessage,
  generateMockNotification,
  mockFirestoreTimestamp,
  mockFirestoreDoc,
  mockFirestoreCollection,
  simulateNetworkError,
  simulatePermissionError,
  simulateAuthError,
  findByTestId,
  findAllByTestId,
  findByText,
  waitForCondition,
  waitForAsyncUpdate,
  createMockStreamService,
  createMockChatService,
  createMockAuthService,
  createMockNotificationService,
  measureRenderTime,
  measureAsyncOperation,
  createMemoryLeakTest,
  createSnapshotTest,
  setupIntegrationTest,
  setupE2ETest,
  testAccessibility,
  customMatchers
};
