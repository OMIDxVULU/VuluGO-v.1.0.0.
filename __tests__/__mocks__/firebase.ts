/**
 * Firebase Mock Services
 * Mock implementations for Firebase services used in testing
 */

import { jest } from '@jest/globals';

// Mock Firestore
export const mockFirestore = {
  collection: jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      onSnapshot: jest.fn()
    }),
    add: jest.fn(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
    get: jest.fn(),
    onSnapshot: jest.fn()
  }),
  doc: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    onSnapshot: jest.fn(),
    collection: jest.fn().mockReturnValue({
      add: jest.fn(),
      get: jest.fn(),
      onSnapshot: jest.fn()
    })
  }),
  batch: jest.fn().mockReturnValue({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined)
  }),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn().mockReturnValue({ seconds: Date.now() / 1000 }),
  FieldValue: {
    serverTimestamp: jest.fn().mockReturnValue({ seconds: Date.now() / 1000 }),
    increment: jest.fn().mockImplementation((value) => ({ increment: value })),
    arrayUnion: jest.fn().mockImplementation((...values) => ({ arrayUnion: values })),
    arrayRemove: jest.fn().mockImplementation((...values) => ({ arrayRemove: values })),
    delete: jest.fn().mockReturnValue({ delete: true })
  },
  Timestamp: {
    now: jest.fn().mockReturnValue({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    fromDate: jest.fn().mockImplementation((date) => ({ 
      seconds: date.getTime() / 1000, 
      nanoseconds: 0,
      toDate: () => date,
      toMillis: () => date.getTime()
    })),
    fromMillis: jest.fn().mockImplementation((millis) => ({ 
      seconds: millis / 1000, 
      nanoseconds: 0,
      toDate: () => new Date(millis),
      toMillis: () => millis
    }))
  }
};

// Mock Auth
export const mockAuth = {
  currentUser: {
    uid: 'test-user-id',
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: null,
    emailVerified: true
  },
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
  reauthenticateWithCredential: jest.fn()
};

// Mock Functions
export const mockFunctions = {
  httpsCallable: jest.fn().mockImplementation((functionName) => {
    return jest.fn().mockImplementation((data) => {
      // Return different mock responses based on function name
      switch (functionName) {
        case 'generateAgoraToken':
          return Promise.resolve({
            data: {
              token: 'mock-agora-token',
              channelName: data.channelName || 'test-channel',
              uid: data.uid || 0
            }
          });
        
        case 'renewAgoraToken':
          return Promise.resolve({
            data: {
              token: 'renewed-agora-token',
              expiresAt: Date.now() + 3600000
            }
          });
        
        case 'sendPushNotification':
          return Promise.resolve({
            data: {
              notificationId: 'mock-notification-id',
              success: true
            }
          });
        
        case 'purchaseGems':
          return Promise.resolve({
            data: {
              transactionId: 'mock-transaction-id',
              gemsAdded: data.gems || 100
            }
          });
        
        case 'generateStreamQualityReport':
          return Promise.resolve({
            data: {
              streamId: data.streamId,
              averageLatency: 50,
              averageJitter: 10,
              averagePacketLoss: 0.5,
              qualityDistribution: {
                excellent: 60,
                good: 30,
                fair: 8,
                poor: 2
              }
            }
          });
        
        default:
          return Promise.resolve({ data: { success: true } });
      }
    });
  })
};

// Mock Storage
export const mockStorage = {
  ref: jest.fn().mockReturnValue({
    child: jest.fn().mockReturnThis(),
    put: jest.fn().mockResolvedValue({
      ref: {
        getDownloadURL: jest.fn().mockResolvedValue('https://mock-download-url.com/file.jpg')
      }
    }),
    putString: jest.fn().mockResolvedValue({
      ref: {
        getDownloadURL: jest.fn().mockResolvedValue('https://mock-download-url.com/file.jpg')
      }
    }),
    getDownloadURL: jest.fn().mockResolvedValue('https://mock-download-url.com/file.jpg'),
    delete: jest.fn().mockResolvedValue(undefined),
    listAll: jest.fn().mockResolvedValue({
      items: [],
      prefixes: []
    })
  })
};

// Mock Analytics
export const mockAnalytics = {
  logEvent: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
  setCurrentScreen: jest.fn()
};

// Mock Messaging (FCM)
export const mockMessaging = {
  getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
  onMessage: jest.fn(),
  onTokenRefresh: jest.fn(),
  subscribeToTopic: jest.fn(),
  unsubscribeFromTopic: jest.fn(),
  requestPermission: jest.fn().mockResolvedValue('granted')
};

// Mock Crashlytics
export const mockCrashlytics = {
  log: jest.fn(),
  recordError: jest.fn(),
  setUserId: jest.fn(),
  setCustomKey: jest.fn(),
  crash: jest.fn()
};

// Mock Performance
export const mockPerformance = {
  newTrace: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    putAttribute: jest.fn(),
    putMetric: jest.fn(),
    incrementMetric: jest.fn()
  }),
  startTrace: jest.fn().mockResolvedValue({
    stop: jest.fn()
  })
};

// Mock Remote Config
export const mockRemoteConfig = {
  fetchAndActivate: jest.fn().mockResolvedValue(true),
  getValue: jest.fn().mockReturnValue({
    asString: () => 'mock-value',
    asNumber: () => 123,
    asBoolean: () => true
  }),
  getAll: jest.fn().mockReturnValue({}),
  setDefaults: jest.fn()
};

// Helper functions for test setup
export const setupMockUser = (userData = {}) => {
  mockAuth.currentUser = {
    uid: 'test-user-id',
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: null,
    emailVerified: true,
    ...userData
  };
};

export const setupMockStream = (streamData = {}) => {
  const defaultStream = {
    id: 'test-stream-id',
    title: 'Test Stream',
    description: 'Test Description',
    hostId: 'test-user-id',
    status: 'waiting',
    category: 'gaming',
    isPrivate: false,
    viewerCount: 0,
    createdAt: mockFirestore.Timestamp.now(),
    updatedAt: mockFirestore.Timestamp.now()
  };

  return { ...defaultStream, ...streamData };
};

export const setupMockFirestoreDoc = (docData: any) => {
  mockFirestore.doc.mockReturnValue({
    get: jest.fn().mockResolvedValue({
      exists: () => !!docData,
      data: () => docData,
      id: docData?.id || 'mock-doc-id'
    }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    onSnapshot: jest.fn()
  });
};

export const setupMockFirestoreCollection = (collectionData: any[]) => {
  mockFirestore.collection.mockReturnValue({
    get: jest.fn().mockResolvedValue({
      docs: collectionData.map(data => ({
        id: data.id || 'mock-doc-id',
        data: () => data,
        exists: () => true
      })),
      empty: collectionData.length === 0,
      size: collectionData.length
    }),
    add: jest.fn().mockResolvedValue({
      id: 'new-doc-id'
    }),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
    onSnapshot: jest.fn()
  });
};

export const resetAllMocks = () => {
  jest.clearAllMocks();
  
  // Reset auth state
  setupMockUser();
  
  // Reset Firestore mocks
  mockFirestore.collection.mockReturnValue({
    doc: jest.fn().mockReturnValue({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      onSnapshot: jest.fn()
    }),
    add: jest.fn(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
    get: jest.fn(),
    onSnapshot: jest.fn()
  });
  
  mockFirestore.doc.mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    onSnapshot: jest.fn()
  });
};

// Mock error scenarios
export const mockFirestoreError = (errorCode = 'permission-denied', errorMessage = 'Mock error') => {
  const error = new Error(errorMessage);
  (error as any).code = errorCode;
  
  mockFirestore.collection.mockReturnValue({
    get: jest.fn().mockRejectedValue(error),
    add: jest.fn().mockRejectedValue(error),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  });
  
  mockFirestore.doc.mockReturnValue({
    get: jest.fn().mockRejectedValue(error),
    set: jest.fn().mockRejectedValue(error),
    update: jest.fn().mockRejectedValue(error),
    delete: jest.fn().mockRejectedValue(error)
  });
};

export const mockAuthError = (errorCode = 'auth/user-not-found', errorMessage = 'Mock auth error') => {
  const error = new Error(errorMessage);
  (error as any).code = errorCode;
  
  mockAuth.signInWithEmailAndPassword.mockRejectedValue(error);
  mockAuth.createUserWithEmailAndPassword.mockRejectedValue(error);
};

export const mockFunctionsError = (errorCode = 'internal', errorMessage = 'Mock function error') => {
  const error = new Error(errorMessage);
  (error as any).code = errorCode;
  
  mockFunctions.httpsCallable.mockReturnValue(
    jest.fn().mockRejectedValue(error)
  );
};

// Export all mocks as default
export default {
  mockFirestore,
  mockAuth,
  mockFunctions,
  mockStorage,
  mockAnalytics,
  mockMessaging,
  mockCrashlytics,
  mockPerformance,
  mockRemoteConfig,
  setupMockUser,
  setupMockStream,
  setupMockFirestoreDoc,
  setupMockFirestoreCollection,
  resetAllMocks,
  mockFirestoreError,
  mockAuthError,
  mockFunctionsError
};
