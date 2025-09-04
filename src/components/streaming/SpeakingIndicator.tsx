/**
 * Speaking Indicator Component
 * Shows real-time speaking indicators for live stream participants
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AgoraParticipant } from '../../services/agoraService';

interface SpeakingIndicatorProps {
  participants: AgoraParticipant[];
  currentUserId: string;
  position?: 'top' | 'bottom';
  maxVisible?: number;
}

interface SpeakerItemProps {
  participant: AgoraParticipant;
  isCurrentUser: boolean;
  index: number;
}

const SpeakerItem: React.FC<SpeakerItemProps> = ({
  participant,
  isCurrentUser,
  index,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing animation for speaking
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  const audioLevelHeight = Math.min((participant.audioLevel || 0) / 100 * 20, 20);

  return (
    <Animated.View
      style={[
        styles.speakerItem,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      <View style={styles.speakerAvatar}>
        <Text style={styles.speakerInitial}>
          {participant.name.charAt(0).toUpperCase()}
        </Text>
        
        {/* Animated speaking ring */}
        <Animated.View
          style={[
            styles.speakingRing,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      </View>

      <View style={styles.speakerInfo}>
        <Text style={styles.speakerName} numberOfLines={1}>
          {isCurrentUser ? 'You' : participant.name}
        </Text>
        
        {/* Audio level bars */}
        <View style={styles.audioLevelContainer}>
          {[...Array(5)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.audioLevelBar,
                {
                  height: Math.max(
                    2,
                    (audioLevelHeight * (i + 1)) / 5
                  ),
                  backgroundColor: audioLevelHeight > (i * 4) ? '#4CAF50' : 'rgba(255,255,255,0.2)',
                },
              ]}
            />
          ))}
        </View>
      </View>

      <MaterialIcons name="mic" size={16} color="#4CAF50" />
    </Animated.View>
  );
};

export const SpeakingIndicator: React.FC<SpeakingIndicatorProps> = ({
  participants,
  currentUserId,
  position = 'bottom',
  maxVisible = 3,
}) => {
  const containerAnim = useRef(new Animated.Value(0)).current;

  // Filter speaking participants
  const speakingParticipants = participants
    .filter(p => p.isSpeaking)
    .sort((a, b) => {
      // Current user first, then by audio level
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      return (b.audioLevel || 0) - (a.audioLevel || 0);
    })
    .slice(0, maxVisible);

  useEffect(() => {
    Animated.timing(containerAnim, {
      toValue: speakingParticipants.length > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [speakingParticipants.length]);

  if (speakingParticipants.length === 0) {
    return null;
  }

  const containerStyle = [
    styles.container,
    position === 'top' ? styles.containerTop : styles.containerBottom,
    {
      opacity: containerAnim,
      transform: [
        {
          translateY: containerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [position === 'top' ? -50 : 50, 0],
          }),
        },
      ],
    },
  ];

  return (
    <Animated.View style={containerStyle}>
      <View style={styles.header}>
        <MaterialIcons name="record-voice-over" size={16} color="#4CAF50" />
        <Text style={styles.headerText}>
          {speakingParticipants.length === 1 
            ? 'Speaking' 
            : `${speakingParticipants.length} Speaking`
          }
        </Text>
      </View>

      <View style={styles.speakersList}>
        {speakingParticipants.map((participant, index) => (
          <SpeakerItem
            key={participant.uid}
            participant={participant}
            isCurrentUser={participant.userId === currentUserId}
            index={index}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 12,
    maxWidth: Dimensions.get('window').width - 32,
  },
  containerTop: {
    top: 60,
  },
  containerBottom: {
    bottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  headerText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  speakersList: {
    gap: 8,
  },
  speakerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    gap: 10,
  },
  speakerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6E56F7',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  speakerInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  speakingRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  speakerInfo: {
    flex: 1,
    gap: 4,
  },
  speakerName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  audioLevelContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    height: 12,
  },
  audioLevelBar: {
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
    minHeight: 2,
  },
});
