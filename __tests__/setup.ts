/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

import 'react-native-gesture-handler/jestSetup';
import { jest } from '@jest/globals';

// Mock React Native modules
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn().mockImplementation(component => component),
    Directions: {}
  };
});

// Mock React Native Vector Icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    statusBarHeight: 44,
    deviceName: 'iPhone',
    platform: {
      ios: {
        platform: 'ios'
      }
    }
  }
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  deviceType: 2,
  deviceName: 'iPhone'
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-expo-token' }),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn()
}));

jest.mock('expo-av', () => ({
  Video: 'Video',
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        playAsync: jest.fn(),
        stopAsync: jest.fn(),
        unloadAsync: jest.fn()
      })
    }
  },
  ResizeMode: {
    CONTAIN: 'contain',
    COVER: 'cover',
    STRETCH: 'stretch'
  }
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
  getStringAsync: jest.fn().mockResolvedValue('mock-clipboard-content')
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy'
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error'
  }
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined)
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi'
  }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
  useNetInfo: jest.fn().mockReturnValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi'
  })
}));

// Mock React Native Agora
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
      removeAllListeners: jest.fn(),
      setChannelProfile: jest.fn().mockResolvedValue(0),
      setClientRole: jest.fn().mockResolvedValue(0),
      enableLocalVideo: jest.fn().mockResolvedValue(0),
      enableLocalAudio: jest.fn().mockResolvedValue(0),
      muteLocalVideoStream: jest.fn().mockResolvedValue(0),
      muteLocalAudioStream: jest.fn().mockResolvedValue(0),
      switchCamera: jest.fn().mockResolvedValue(0)
    }),
    destroy: jest.fn()
  },
  RtcLocalView: {
    SurfaceView: 'RtcLocalView.SurfaceView'
  },
  RtcRemoteView: {
    SurfaceView: 'RtcRemoteView.SurfaceView'
  },
  ChannelProfileType: {
    Communication: 0,
    LiveBroadcasting: 1
  },
  ClientRoleType: {
    Broadcaster: 1,
    Audience: 2
  },
  VideoRenderMode: {
    Hidden: 1,
    Fit: 2,
    Adaptive: 3
  }
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn()
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true)
  }),
  useRoute: () => ({
    params: {},
    name: 'MockScreen'
  }),
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn().mockReturnValue(true),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  createNavigationContainerRef: jest.fn()
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn().mockReturnValue({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children
  }),
  TransitionPresets: {
    SlideFromRightIOS: {}
  }
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: jest.fn().mockReturnValue({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children
  })
}));

// Mock React Native Chart Kit
jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
  BarChart: 'BarChart',
  PieChart: 'PieChart',
  ProgressChart: 'ProgressChart',
  ContributionGraph: 'ContributionGraph',
  StackedBarChart: 'StackedBarChart'
}));

// Mock React Native SVG
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Text: 'Text',
  TSpan: 'TSpan',
  TextPath: 'TextPath',
  Path: 'Path',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Line: 'Line',
  Rect: 'Rect',
  Use: 'Use',
  Image: 'Image',
  Symbol: 'Symbol',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  ClipPath: 'ClipPath',
  Pattern: 'Pattern',
  Mask: 'Mask'
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: process.env.VERBOSE_TESTS ? console.log : jest.fn(),
  debug: process.env.VERBOSE_TESTS ? console.debug : jest.fn(),
  info: process.env.VERBOSE_TESTS ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error
};

// Global test timeout
jest.setTimeout(10000);

// Mock timers
jest.useFakeTimers();

// Global beforeEach
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fake timers
  jest.clearAllTimers();
});

// Global afterEach
afterEach(() => {
  // Run pending timers
  jest.runOnlyPendingTimers();
  
  // Clear any remaining timers
  jest.clearAllTimers();
});

// Global afterAll
afterAll(() => {
  // Use real timers after all tests
  jest.useRealTimers();
});

// Suppress specific warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  
  // Suppress known React Native warnings in tests
  if (
    typeof message === 'string' &&
    (message.includes('componentWillReceiveProps') ||
     message.includes('componentWillMount') ||
     message.includes('componentWillUpdate') ||
     message.includes('VirtualizedLists should never be nested'))
  ) {
    return;
  }
  
  originalWarn(...args);
};

// Export test utilities
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

export const waitForNextUpdate = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

export const mockTimestamp = () => ({
  seconds: Math.floor(Date.now() / 1000),
  nanoseconds: 0,
  toDate: () => new Date(),
  toMillis: () => Date.now()
});

console.log('✅ Jest setup complete');
