/**
 * Live Stream Refresh Button
 * Provides manual and automatic refresh functionality for live streams
 * Discord-style design with WCAG AA compliance
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLiveStreamRefresh } from '../hooks/useLiveStreamRefresh';

interface LiveStreamRefreshButtonProps {
  variant?: 'icon' | 'button' | 'compact';
  autoRefreshInterval?: number; // in milliseconds, default 5000 (5 seconds)
  showLabel?: boolean;
  onRefreshStart?: () => void;
  onRefreshComplete?: (success: boolean) => void;
  disabled?: boolean;
}

const LiveStreamRefreshButton: React.FC<LiveStreamRefreshButtonProps> = ({
  variant = 'icon',
  autoRefreshInterval = 5000, // 5 seconds
  showLabel = false,
  onRefreshStart,
  onRefreshComplete,
  disabled = false
}) => {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Use the enhanced refresh hook
  const {
    isRefreshing,
    lastRefreshTime,
    refreshCount,
    manualRefresh,
    toggleAutoRefresh,
    isAutoRefreshEnabled,
    nextRefreshIn
  } = useLiveStreamRefresh({
    autoRefreshInterval,
    enableAutoRefresh: true,
    onRefreshStart,
    onRefreshComplete,
    onRefreshError: (error) => {
      console.error('🔄 [REFRESH_BUTTON] Refresh error:', error);
      Alert.alert(
        'Refresh Failed',
        'Unable to refresh live streams. Please check your connection and try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  });

  // Rotation animation for refresh icon
  const startRotationAnimation = () => {
    rotationAnim.setValue(0);
    Animated.timing(rotationAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  // Scale animation for button press feedback
  const startScaleAnimation = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Safe haptic feedback function
  const triggerHapticFeedback = async () => {
    try {
      // Check if platform supports haptics (not web)
      if (Platform.OS === 'web') {
        console.log('⚠️ [REFRESH] Haptics not supported on web platform');
        return;
      }

      // Check if haptics are available
      if (Haptics && Haptics.impactAsync) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        console.log('✅ [REFRESH] Haptic feedback triggered');
      } else {
        console.log('⚠️ [REFRESH] Haptics not available on this device');
      }
    } catch (error) {
      console.warn('⚠️ [REFRESH] Haptic feedback failed (non-critical):', error);
      // Haptic failure should not prevent refresh functionality
    }
  };

  // Manual refresh handler
  const handleManualRefresh = async () => {
    console.log('🔄 [REFRESH_BUTTON] Button pressed, checking conditions...');
    console.log(`🔄 [REFRESH_BUTTON] isRefreshing: ${isRefreshing}, disabled: ${disabled}`);

    if (isRefreshing || disabled) {
      console.log('🔄 [REFRESH_BUTTON] Refresh blocked - already refreshing or disabled');
      return;
    }

    try {
      console.log('🔄 [REFRESH_BUTTON] Starting manual refresh process...');

      // Safe haptic feedback for manual press
      await triggerHapticFeedback();

      // Visual feedback animations
      startRotationAnimation();
      startScaleAnimation();

      console.log('🔄 [REFRESH_BUTTON] Calling manualRefresh function...');

      // Use the hook's manual refresh function
      await manualRefresh();

      console.log('✅ [REFRESH_BUTTON] Manual refresh completed successfully');

    } catch (error) {
      console.error('❌ [REFRESH_BUTTON] Manual refresh failed:', error);
      // Error handling is done in the hook
    }
  };



  // Rotation interpolation
  const rotationInterpolate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Render different variants
  const renderContent = () => {
    const iconColor = disabled ? '#4a4a4a' : '#ffffff';
    const iconSize = variant === 'compact' ? 18 : 20;

    switch (variant) {
      case 'button':
        return (
          <View style={styles.buttonContent}>
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [
                    { rotate: isRefreshing ? rotationInterpolate : '0deg' },
                    { scale: scaleAnim }
                  ]
                }
              ]}
            >
              <Ionicons
                name="refresh"
                size={iconSize}
                color={iconColor}
              />
            </Animated.View>
            {showLabel && (
              <Text style={[styles.buttonLabel, disabled && styles.disabledText]}>
                Refresh {isAutoRefreshEnabled && nextRefreshIn > 0 && `(${nextRefreshIn}s)`}
              </Text>
            )}
          </View>
        );

      case 'compact':
        return (
          <View style={styles.compactWrapper}>
            <Animated.View
              style={[
                styles.compactIconContainer,
                {
                  transform: [
                    { rotate: isRefreshing ? rotationInterpolate : '0deg' },
                    { scale: scaleAnim }
                  ]
                }
              ]}
            >
              <Ionicons
                name="refresh"
                size={iconSize}
                color={iconColor}
              />
            </Animated.View>
            {/* Optional countdown indicator for compact variant */}
            {isAutoRefreshEnabled && nextRefreshIn > 0 && nextRefreshIn <= 3 && (
              <View style={styles.countdownIndicator}>
                <Text style={styles.countdownText}>{nextRefreshIn}</Text>
              </View>
            )}
          </View>
        );

      default: // 'icon'
        return (
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { rotate: isRefreshing ? rotationInterpolate : '0deg' },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <Ionicons
              name="refresh"
              size={iconSize}
              color={iconColor}
            />
          </Animated.View>
        );
    }
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'button':
        return [
          styles.buttonContainer,
          disabled && styles.disabledContainer
        ];
      case 'compact':
        return [
          styles.compactContainer,
          disabled && styles.disabledContainer
        ];
      default:
        return [
          styles.iconOnlyContainer,
          disabled && styles.disabledContainer
        ];
    }
  };

  return (
    <TouchableOpacity
      style={getContainerStyle()}
      onPress={handleManualRefresh}
      disabled={isRefreshing || disabled}
      activeOpacity={0.7}
      accessibilityLabel="Refresh live streams"
      accessibilityHint="Manually refresh the live streams list to get the latest updates"
      accessibilityRole="button"
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Button variant styles
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5865F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Icon only variant styles
  iconOnlyContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.3)',
  },

  // Compact variant styles
  compactContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#5865F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0f1117',
  },
  countdownText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Common styles
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Disabled styles
  disabledContainer: {
    opacity: 0.5,
    backgroundColor: '#2c2f33',
  },
  disabledText: {
    color: '#72767d',
  },
});

export default LiveStreamRefreshButton;
