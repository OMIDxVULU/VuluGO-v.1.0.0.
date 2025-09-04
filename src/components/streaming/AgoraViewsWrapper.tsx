/**
 * Agora Views Wrapper
 * Safely imports Agora view components with fallback for Expo Go
 */

import React from 'react';
import { View, Text } from 'react-native';

// Check if we're in Expo Go environment
const isExpoGo = __DEV__ && typeof global.RNAgora === 'undefined';

// Mock view components for Expo Go
const MockSurfaceView = ({ style, uid, ...props }: any) => (
  <View style={[style, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
    <Text style={{ color: '#666', fontSize: 12, textAlign: 'center' }}>
      {uid ? `Remote Video\nUID: ${uid}` : 'Local Video'}{'\n'}(Mock for Expo Go)
    </Text>
  </View>
);

// Mock view objects that match Agora's structure
const MockLocalView = {
  SurfaceView: MockSurfaceView,
  TextureView: MockSurfaceView
};

const MockRemoteView = {
  SurfaceView: MockSurfaceView,
  TextureView: MockSurfaceView
};

// Mock VideoRenderMode constants
const MockVideoRenderMode = {
  Hidden: 1,
  Fit: 2,
  Adaptive: 3
};

// Safe import function
let RtcLocalView: any = MockLocalView;
let RtcRemoteView: any = MockRemoteView;
let VideoRenderMode: any = MockVideoRenderMode;

if (!isExpoGo) {
  try {
    // Try to import the real Agora views
    const agoraViews = require('react-native-agora');
    RtcLocalView = agoraViews.RtcLocalView || MockLocalView;
    RtcRemoteView = agoraViews.RtcRemoteView || MockRemoteView;
    VideoRenderMode = agoraViews.VideoRenderMode || MockVideoRenderMode;
    console.log('✅ Real Agora views imported successfully');
  } catch (error: any) {
    console.warn('⚠️ Agora views not available, using mock components:', error?.message || error);
    RtcLocalView = MockLocalView;
    RtcRemoteView = MockRemoteView;
    VideoRenderMode = MockVideoRenderMode;
  }
} else {
  console.log('🎭 Using mock Agora views for Expo Go development');
}

// Export the view components
export { RtcLocalView, RtcRemoteView, VideoRenderMode };

// Export utility functions
export const isAgoraViewsAvailable = () => !isExpoGo && RtcLocalView !== MockLocalView;
export const isUsingMockViews = () => isExpoGo || RtcLocalView === MockLocalView;

// Log the current state
console.log(`🔧 Agora Views Wrapper: ${isUsingMockViews() ? 'Using Mock Views' : 'Using Real Views'}`);
