/**
 * Simple Refresh Button - Fallback version without haptics
 * Use this if the main LiveStreamRefreshButton has issues
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLiveStreamRefresh } from '../hooks/useLiveStreamRefresh';

interface SimpleRefreshButtonProps {
  size?: number;
  color?: string;
  disabled?: boolean;
}

const SimpleRefreshButton: React.FC<SimpleRefreshButtonProps> = ({
  size = 20,
  color = '#ffffff',
  disabled = false
}) => {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const rotationAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  const {
    isRefreshing,
    manualRefresh
  } = useLiveStreamRefresh({
    autoRefreshInterval: 5000,
    enableAutoRefresh: true,
    onRefreshError: (error) => {
      console.error('🔄 [SIMPLE_REFRESH] Refresh error:', error);
      Alert.alert(
        'Refresh Failed',
        'Unable to refresh live streams. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  });

  // Continuous rotation animation
  const startRotationAnimation = () => {
    rotationAnim.setValue(0);
    
    // Create a looping animation
    const loopAnimation = Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    rotationAnimationRef.current = loopAnimation;
    loopAnimation.start();
  };

  const stopRotationAnimation = () => {
    if (rotationAnimationRef.current) {
      rotationAnimationRef.current.stop();
      rotationAnimationRef.current = null;
    }
    rotationAnim.setValue(0);
  };

  const handlePress = async () => {
    if (isRefreshing || disabled) return;

    try {
      console.log('🔄 [SIMPLE_REFRESH] Manual refresh triggered');
      startRotationAnimation();
      await manualRefresh();
    } catch (error) {
      console.error('❌ [SIMPLE_REFRESH] Manual refresh failed:', error);
    } finally {
      stopRotationAnimation();
    }
  };

  const rotationInterpolate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={handlePress}
      disabled={isRefreshing || disabled}
      activeOpacity={0.7}
      accessibilityLabel="Refresh live streams"
      accessibilityRole="button"
    >
      <Animated.View
        style={{
          transform: [
            { rotate: isRefreshing ? rotationInterpolate : '0deg' }
          ]
        }}
      >
        <Ionicons
          name="refresh"
          size={size}
          color={disabled ? '#4a4a4a' : color}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.3)',
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#2c2f33',
  },
});

export default SimpleRefreshButton;
