/**
 * Participants List Component
 * Displays live stream participants with speaking indicators and status
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AgoraParticipant } from '../../services/agoraService';

interface ParticipantsListProps {
  participants: AgoraParticipant[];
  currentUserId: string;
  isHost: boolean;
  onParticipantPress?: (participant: AgoraParticipant) => void;
  maxVisible?: number;
  showSpeakingOnly?: boolean;
}

interface ParticipantItemProps {
  participant: AgoraParticipant;
  isCurrentUser: boolean;
  isHost: boolean;
  onPress?: () => void;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  isCurrentUser,
  isHost,
  onPress,
}) => {
  const speakingAnimation = new Animated.Value(participant.isSpeaking ? 1 : 0);

  useEffect(() => {
    Animated.timing(speakingAnimation, {
      toValue: participant.isSpeaking ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [participant.isSpeaking]);

  const speakingScale = speakingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const speakingOpacity = speakingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const borderColor = speakingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.2)', '#4CAF50'],
  });

  return (
    <TouchableOpacity
      style={styles.participantItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.participantAvatar,
          {
            transform: [{ scale: speakingScale }],
            opacity: speakingOpacity,
            borderColor: borderColor,
            borderWidth: 2,
          },
        ]}
      >
        {participant.avatar ? (
          <Image source={{ uri: participant.avatar }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>
            {participant.name.charAt(0).toUpperCase()}
          </Text>
        )}
        
        {/* Speaking indicator */}
        {participant.isSpeaking && (
          <View style={styles.speakingIndicator}>
            <MaterialIcons name="mic" size={12} color="#FFFFFF" />
          </View>
        )}

        {/* Host badge */}
        {participant.isHost && (
          <View style={styles.hostBadge}>
            <MaterialIcons name="star" size={10} color="#FFD700" />
          </View>
        )}

        {/* Muted indicator */}
        {participant.isMuted && (
          <View style={styles.mutedIndicator}>
            <MaterialIcons name="mic-off" size={10} color="#FF6B6B" />
          </View>
        )}
      </Animated.View>

      <View style={styles.participantInfo}>
        <Text style={styles.participantName} numberOfLines={1}>
          {participant.name}
          {isCurrentUser && ' (You)'}
        </Text>
        
        <View style={styles.participantStatus}>
          {participant.isHost && (
            <Text style={styles.hostLabel}>Host</Text>
          )}
          {participant.isMuted && (
            <Text style={styles.mutedLabel}>Muted</Text>
          )}
          {participant.isSpeaking && (
            <Text style={styles.speakingLabel}>Speaking</Text>
          )}
        </View>
      </View>

      {/* Audio level indicator */}
      {participant.isSpeaking && (
        <View style={styles.audioLevelContainer}>
          <View
            style={[
              styles.audioLevelBar,
              { height: `${Math.min(participant.audioLevel || 0, 100)}%` },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  currentUserId,
  isHost,
  onParticipantPress,
  maxVisible = 10,
  showSpeakingOnly = false,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Filter and sort participants
  const filteredParticipants = participants
    .filter(p => !showSpeakingOnly || p.isSpeaking)
    .sort((a, b) => {
      // Sort by: speaking first, then hosts, then by join time
      if (a.isSpeaking && !b.isSpeaking) return -1;
      if (!a.isSpeaking && b.isSpeaking) return 1;
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
      return a.joinedAt - b.joinedAt;
    });

  const visibleParticipants = showAll 
    ? filteredParticipants 
    : filteredParticipants.slice(0, maxVisible);

  const hiddenCount = filteredParticipants.length - visibleParticipants.length;

  const renderParticipant = ({ item }: { item: AgoraParticipant }) => (
    <ParticipantItem
      participant={item}
      isCurrentUser={item.userId === currentUserId}
      isHost={isHost}
      onPress={onParticipantPress ? () => onParticipantPress(item) : undefined}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>
        Participants ({filteredParticipants.length})
      </Text>
      {showSpeakingOnly && (
        <View style={styles.filterBadge}>
          <MaterialIcons name="mic" size={12} color="#4CAF50" />
          <Text style={styles.filterText}>Speaking</Text>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (hiddenCount <= 0) return null;

    return (
      <TouchableOpacity
        style={styles.showMoreButton}
        onPress={() => setShowAll(!showAll)}
      >
        <Text style={styles.showMoreText}>
          {showAll ? 'Show Less' : `Show ${hiddenCount} More`}
        </Text>
        <MaterialIcons
          name={showAll ? 'expand-less' : 'expand-more'}
          size={16}
          color="#6E56F7"
        />
      </TouchableOpacity>
    );
  };

  if (filteredParticipants.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="people-outline" size={32} color="#8E8E93" />
        <Text style={styles.emptyStateText}>
          {showSpeakingOnly ? 'No one is speaking' : 'No participants'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={visibleParticipants}
        keyExtractor={(item) => item.uid.toString()}
        renderItem={renderParticipant}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    maxHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  filterText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '500',
  },
  listContainer: {
    gap: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    gap: 12,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6E56F7',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  speakingIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedIndicator: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  participantStatus: {
    flexDirection: 'row',
    gap: 6,
  },
  hostLabel: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '500',
  },
  mutedLabel: {
    color: '#FF6B6B',
    fontSize: 10,
    fontWeight: '500',
  },
  speakingLabel: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '500',
  },
  audioLevelContainer: {
    width: 4,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioLevelBar: {
    width: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    alignSelf: 'flex-end',
  },
  showMoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  showMoreText: {
    color: '#6E56F7',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
