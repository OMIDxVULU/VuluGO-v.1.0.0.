/**
 * Host Controls Component
 * Provides host-only controls for managing stream participants
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AgoraParticipant } from '../../services/agoraService';
import { hostControlsService } from '../../services/hostControlsService';

interface HostControlsProps {
  streamId: string;
  hostId: string;
  participants: AgoraParticipant[];
  isVisible: boolean;
  onClose: () => void;
  onParticipantUpdate?: () => void;
}

interface ActionModalProps {
  isVisible: boolean;
  participant: AgoraParticipant | null;
  action: 'mute' | 'kick' | 'ban' | null;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

const ActionModal: React.FC<ActionModalProps> = ({
  isVisible,
  participant,
  action,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');

  const getActionText = () => {
    switch (action) {
      case 'mute': return 'mute';
      case 'kick': return 'kick';
      case 'ban': return 'ban';
      default: return '';
    }
  };

  const getActionColor = () => {
    switch (action) {
      case 'mute': return '#FF9500';
      case 'kick': return '#FF6B6B';
      case 'ban': return '#DC3545';
      default: return '#6E56F7';
    }
  };

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason('');
  };

  const handleCancel = () => {
    onCancel();
    setReason('');
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <MaterialIcons
              name={action === 'mute' ? 'mic-off' : action === 'kick' ? 'exit-to-app' : 'block'}
              size={24}
              color={getActionColor()}
            />
            <Text style={styles.modalTitle}>
              {getActionText().charAt(0).toUpperCase() + getActionText().slice(1)} Participant
            </Text>
          </View>

          <Text style={styles.modalMessage}>
            Are you sure you want to {getActionText()} {participant?.name}?
          </Text>

          {(action === 'kick' || action === 'ban') && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Reason (optional):</Text>
              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={setReason}
                placeholder="Enter reason..."
                placeholderTextColor="#8E8E93"
                multiline
                maxLength={200}
              />
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: getActionColor() }]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>
                {getActionText().charAt(0).toUpperCase() + getActionText().slice(1)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const HostControls: React.FC<HostControlsProps> = ({
  streamId,
  hostId,
  participants,
  isVisible,
  onClose,
  onParticipantUpdate,
}) => {
  const [selectedParticipant, setSelectedParticipant] = useState<AgoraParticipant | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState<'mute' | 'kick' | 'ban' | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter out hosts from participants list
  const regularParticipants = participants.filter(p => !p.isHost);

  const showActionModal = (participant: AgoraParticipant, action: 'mute' | 'kick' | 'ban') => {
    setSelectedParticipant(participant);
    setCurrentAction(action);
    setActionModalVisible(true);
  };

  const handleAction = async (reason?: string) => {
    if (!selectedParticipant || !currentAction) return;

    setLoading(true);
    setActionModalVisible(false);

    try {
      let success = false;

      switch (currentAction) {
        case 'mute':
          if (selectedParticipant.isMuted) {
            success = await hostControlsService.unmuteParticipant(
              streamId,
              selectedParticipant.userId,
              selectedParticipant.uid,
              hostId
            );
          } else {
            success = await hostControlsService.muteParticipant(
              streamId,
              selectedParticipant.userId,
              selectedParticipant.uid,
              hostId,
              reason
            );
          }
          break;

        case 'kick':
          success = await hostControlsService.kickParticipant(
            streamId,
            selectedParticipant.userId,
            selectedParticipant.uid,
            hostId,
            reason
          );
          break;

        case 'ban':
          success = await hostControlsService.banParticipant(
            streamId,
            selectedParticipant.userId,
            selectedParticipant.uid,
            hostId,
            reason
          );
          break;
      }

      if (success) {
        onParticipantUpdate?.();
        Alert.alert(
          'Success',
          `Successfully ${currentAction}${currentAction === 'ban' ? 'ned' : currentAction === 'kick' ? 'ed' : 'd'} ${selectedParticipant.name}`
        );
      } else {
        Alert.alert('Error', `Failed to ${currentAction} participant`);
      }

    } catch (error) {
      console.error(`Failed to ${currentAction} participant:`, error);
      Alert.alert('Error', `Failed to ${currentAction} participant`);
    } finally {
      setLoading(false);
      setSelectedParticipant(null);
      setCurrentAction(null);
    }
  };

  const renderParticipant = ({ item }: { item: AgoraParticipant }) => (
    <View style={styles.participantItem}>
      <View style={styles.participantInfo}>
        <View style={styles.participantAvatar}>
          <Text style={styles.participantInitial}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.participantDetails}>
          <Text style={styles.participantName}>{item.name}</Text>
          <View style={styles.participantStatus}>
            {item.isMuted && (
              <View style={styles.statusBadge}>
                <MaterialIcons name="mic-off" size={12} color="#FF9500" />
                <Text style={styles.statusText}>Muted</Text>
              </View>
            )}
            {item.isSpeaking && (
              <View style={[styles.statusBadge, styles.speakingBadge]}>
                <MaterialIcons name="mic" size={12} color="#4CAF50" />
                <Text style={styles.statusText}>Speaking</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.participantActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.muteButton]}
          onPress={() => showActionModal(item, 'mute')}
          disabled={loading}
        >
          <MaterialIcons
            name={item.isMuted ? 'mic' : 'mic-off'}
            size={16}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.kickButton]}
          onPress={() => showActionModal(item, 'kick')}
          disabled={loading}
        >
          <MaterialIcons name="exit-to-app" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.banButton]}
          onPress={() => showActionModal(item, 'ban')}
          disabled={loading}
        >
          <MaterialIcons name="block" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Host Controls</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {regularParticipants.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="people-outline" size={48} color="#8E8E93" />
                <Text style={styles.emptyStateText}>No participants to manage</Text>
              </View>
            ) : (
              <FlatList
                data={regularParticipants}
                keyExtractor={(item) => item.uid.toString()}
                renderItem={renderParticipant}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.participantsList}
              />
            )}
          </View>
        </View>
      </Modal>

      <ActionModal
        isVisible={actionModalVisible}
        participant={selectedParticipant}
        action={currentAction}
        onConfirm={handleAction}
        onCancel={() => {
          setActionModalVisible(false);
          setSelectedParticipant(null);
          setCurrentAction(null);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#8E8E93',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  participantsList: {
    paddingBottom: 20,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6E56F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  participantStatus: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,149,0,0.2)',
    borderRadius: 12,
    gap: 4,
  },
  speakingBadge: {
    backgroundColor: 'rgba(76,175,80,0.2)',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  participantActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    backgroundColor: '#FF9500',
  },
  kickButton: {
    backgroundColor: '#FF6B6B',
  },
  banButton: {
    backgroundColor: '#DC3545',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1A1B23',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    minWidth: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  reasonContainer: {
    marginBottom: 20,
  },
  reasonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
