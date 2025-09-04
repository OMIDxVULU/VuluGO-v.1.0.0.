/**
 * Reaction Animation Component
 * Handles floating reaction animations with smooth transitions
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet
} from 'react-native';
import { StreamReaction } from '../../services/viewerInteractionService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ReactionAnimationProps {
  reaction: StreamReaction;
  onAnimationComplete?: () => void;
  style?: any;
}

export default function ReactionAnimation({
  reaction,
  onAnimationComplete,
  style
}: ReactionAnimationProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start position (bottom of screen or specified position)
    const startX = reaction.position?.x || Math.random() * (screenWidth - 60);
    const startY = reaction.position?.y || screenHeight - 100;

    // End position (float upward with slight horizontal drift)
    const endX = startX + (Math.random() - 0.5) * 100; // Random horizontal drift
    const endY = startY - 300 - Math.random() * 200; // Float upward

    // Set initial position
    translateX.setValue(startX);
    translateY.setValue(startY);

    // Animation sequence
    const animations = [
      // Scale in
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true
      }),
      
      // Float up with rotation and fade out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: endY,
          duration: 3000,
          useNativeDriver: true
        }),
        Animated.timing(translateX, {
          toValue: endX,
          duration: 3000,
          useNativeDriver: true
        }),
        Animated.timing(rotate, {
          toValue: (Math.random() - 0.5) * 360, // Random rotation
          duration: 3000,
          useNativeDriver: true
        }),
        Animated.sequence([
          Animated.delay(2000), // Stay visible for 2 seconds
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      ])
    ];

    // Run animations
    Animated.sequence(animations).start(() => {
      onAnimationComplete?.();
    });
  }, [reaction]);

  const animatedStyle = {
    transform: [
      { translateX },
      { translateY },
      { scale },
      { 
        rotate: rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg']
        })
      }
    ],
    opacity
  };

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <View style={styles.reactionContainer}>
        <Text style={styles.emoji}>{reaction.emoji}</Text>
        {reaction.type === 'gift' && reaction.value && (
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>+{reaction.value}</Text>
          </View>
        )}
      </View>
      {reaction.userName && (
        <Text style={styles.userName}>{reaction.userName}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1000,
  },
  reactionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  valueContainer: {
    backgroundColor: 'rgba(88, 101, 242, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  valueText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userName: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 80,
  },
});

// Applause Animation Component
interface ApplauseAnimationProps {
  intensity: number;
  onAnimationComplete?: () => void;
  style?: any;
}

export function ApplauseAnimation({
  intensity,
  onAnimationComplete,
  style
}: ApplauseAnimationProps) {
  const animations = useRef<Animated.Value[]>([]).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create multiple clap emojis based on intensity
    const clapCount = Math.min(intensity * 2, 10);
    
    // Clear previous animations
    animations.length = 0;

    // Create animations for each clap
    for (let i = 0; i < clapCount; i++) {
      animations.push(new Animated.Value(0));
    }

    // Fade in container
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start();

    // Animate each clap with staggered timing
    const clapAnimations = animations.map((anim, index) => {
      return Animated.sequence([
        Animated.delay(index * 100), // Stagger each clap
        Animated.spring(anim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        })
      ]);
    });

    // Run all clap animations
    Animated.parallel(clapAnimations).start(() => {
      // Fade out container
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start(() => {
        onAnimationComplete?.();
      });
    });
  }, [intensity]);

  return (
    <Animated.View style={[styles.applauseContainer, { opacity: containerOpacity }, style]}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.clapEmoji,
            {
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.2]
                  })
                },
                {
                  translateX: (Math.random() - 0.5) * 100
                },
                {
                  translateY: (Math.random() - 0.5) * 100
                }
              ],
              opacity: anim
            }
          ]}
        >
          <Text style={styles.clapText}>👏</Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const applauseStyles = StyleSheet.create({
  applauseContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 200,
    height: 200,
    marginLeft: -100,
    marginTop: -100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
  clapEmoji: {
    position: 'absolute',
  },
  clapText: {
    fontSize: 24,
  },
});

// Combine styles
Object.assign(styles, applauseStyles);

// Screen-wide Effect Animation
interface ScreenEffectAnimationProps {
  type: 'hearts' | 'stars' | 'confetti';
  duration?: number;
  onAnimationComplete?: () => void;
}

export function ScreenEffectAnimation({
  type,
  duration = 3000,
  onAnimationComplete
}: ScreenEffectAnimationProps) {
  const particles = useRef<Animated.Value[]>([]).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Create particles
    const particleCount = 20;
    particles.length = 0;

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Animated.Value(0));
    }

    // Animate particles
    const particleAnimations = particles.map((particle, index) => {
      return Animated.sequence([
        Animated.delay(index * 50), // Stagger particles
        Animated.timing(particle, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true
        })
      ]);
    });

    Animated.parallel(particleAnimations).start(() => {
      // Fade out
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      }).start(() => {
        onAnimationComplete?.();
      });
    });
  }, [type, duration]);

  const getParticleEmoji = () => {
    switch (type) {
      case 'hearts': return '❤️';
      case 'stars': return '⭐';
      case 'confetti': return '🎉';
      default: return '✨';
    }
  };

  return (
    <Animated.View style={[styles.screenEffect, { opacity: containerOpacity }]}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: Math.random() * screenWidth,
              top: Math.random() * screenHeight,
              transform: [
                {
                  translateY: particle.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -200]
                  })
                },
                {
                  scale: particle.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1.2, 0]
                  })
                }
              ],
              opacity: particle.interpolate({
                inputRange: [0, 0.2, 0.8, 1],
                outputRange: [0, 1, 1, 0]
              })
            }
          ]}
        >
          <Text style={styles.particleText}>{getParticleEmoji()}</Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const effectStyles = StyleSheet.create({
  screenEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
  },
  particleText: {
    fontSize: 20,
  },
});

Object.assign(styles, effectStyles);
