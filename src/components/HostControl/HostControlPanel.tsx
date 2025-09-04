/**
 * Host Control Panel Component
 * Comprehensive host controls for stream management
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useHostControl from '../../hooks/useHostControl';
import { StreamSettings, ModerationAction } from '../../services/hostControlService';
import { ChatSettings } from '../../services/firestoreService';
import StreamAnalyticsCard from './StreamAnalyticsCard';
import ParticipantList from './ParticipantList';
import ModerationPanel from './ModerationPanel';

// Discord-inspired color palette
const colors = {
  background: '#0f1117',
  cardBackground: '#151924',
  accent: '#5865F2',
  accentHover: '#4752C4',
  text: '#FFFFFF',
  textMuted: '#B9BBBE',
  textSecondary: '#72767D',
  border: '#202225',
  success: '#3BA55C',
  warning: '#FAA61A',
  error: '#ED4245',
  online: '#3BA55C',
  idle: '#FAA61A',
  offline: '#747F8D'
};

interface HostControlPanelProps {
  streamId: string;
  isVisible: boolean;
  onClose: () => void;
  onEndStream?: () => void;
}

export default function HostControlPanel({
  streamId,
  isVisible,
  onClose,
  onEndStream
}: HostControlPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'settings' | 'moderation'>('overview');
  const [showEndStreamConfirm, setShowEndStreamConfirm] = useState(false);

  const {
    analytics,
    participants,
    moderationLogs,
    isLoading,
    isUpdating,
    error,
    updateStreamSettings,
    updateChatSettings,
    moderateParticipant,
    clearAllChat,
    endStream,
    toggleStreamPrivacy,
    updateStreamQuality,
    refreshAll,
    clearError,
    currentViewers,
    maxViewers,
    totalMessages,
    totalReactions,
    revenue,
    engagementRate
  } = useHostControl({
    streamId,
    autoLoadAnalytics: true,
    analyticsRefreshInterval: 30000, // Refresh every 30 seconds
    onError: (error) => {
      Alert.alert('Error', error);
    }
  });

  // Handle stream settings update
  const handleSettingsUpdate = async (settings: Partial<StreamSettings>) => {
    try {
      await updateStreamSettings(settings);
      Alert.alert('Success', 'Stream settings updated successfully');
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle chat settings update
  const handleChatSettingsUpdate = async (chatSettings: Partial<ChatSettings>) => {
    try {
      await updateChatSettings(chatSettings);
      Alert.alert('Success', 'Chat settings updated successfully');
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle moderation action
  const handleModerationAction = async (action: ModerationAction) => {
    try {
      await moderateParticipant(action);
      Alert.alert('Success', `${action.type} action completed successfully`);
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle end stream
  const handleEndStream = async () => {
    try {
      await endStream();
      setShowEndStreamConfirm(false);
      onEndStream?.();
      onClose();
      Alert.alert('Success', 'Stream ended successfully');
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle clear chat
  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all chat messages? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllChat('Chat cleared by host');
              Alert.alert('Success', 'Chat cleared successfully');
            } catch (error) {
              // Error handled by hook
            }
          }
        }
      ]
    );
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <StreamAnalyticsCard
              analytics={analytics}
              isLoading={isLoading}
              onRefresh={refreshAll}
            />
            
            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.warningButton]}
                onPress={handleClearChat}
                disabled={isUpdating}
              >
                <Ionicons name="trash" size={20} color={colors.text} />
                <Text style={styles.actionButtonText}>Clear Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={toggleStreamPrivacy}
                disabled={isUpdating}
              >
                <Ionicons name="eye" size={20} color={colors.text} />
                <Text style={styles.actionButtonText}>Toggle Privacy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.errorButton]}
                onPress={() => setShowEndStreamConfirm(true)}
                disabled={isUpdating}
              >
                <Ionicons name="stop" size={20} color={colors.text} />
                <Text style={styles.actionButtonText}>End Stream</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'participants':
        return (
          <ParticipantList
            participants={participants}
            onModerationAction={handleModerationAction}
            isUpdating={isUpdating}
          />
        );

      case 'settings':
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <StreamSettingsPanel
              onSettingsUpdate={handleSettingsUpdate}
              onChatSettingsUpdate={handleChatSettingsUpdate}
              onQualityUpdate={updateStreamQuality}
              isUpdating={isUpdating}
            />
          </ScrollView>
        );

      case 'moderation':
        return (
          <ModerationPanel
            moderationLogs={moderationLogs}
            onModerationAction={handleModerationAction}
            isUpdating={isUpdating}
          />
        );

      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Host Controls</Text>
          <TouchableOpacity onPress={refreshAll} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Ionicons name="people" size={16} color={colors.success} />
            <Text style={styles.statusText}>{currentViewers} viewers</Text>
          </View>
          <View style={styles.statusItem}>
            <Ionicons name="chatbubble" size={16} color={colors.accent} />
            <Text style={styles.statusText}>{totalMessages} messages</Text>
          </View>
          <View style={styles.statusItem}>
            <Ionicons name="heart" size={16} color={colors.error} />
            <Text style={styles.statusText}>{totalReactions} reactions</Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          {[
            { key: 'overview', label: 'Overview', icon: 'analytics' },
            { key: 'participants', label: 'Participants', icon: 'people' },
            { key: 'settings', label: 'Settings', icon: 'settings' },
            { key: 'moderation', label: 'Moderation', icon: 'shield' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.tabButtonActive
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.key ? colors.accent : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === tab.key && styles.tabButtonTextActive
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {renderTabContent()}
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError} style={styles.errorCloseButton}>
              <Ionicons name="close" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* End Stream Confirmation Modal */}
        <Modal
          visible={showEndStreamConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEndStreamConfirm(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmTitle}>End Stream</Text>
              <Text style={styles.confirmMessage}>
                Are you sure you want to end this stream? All viewers will be disconnected.
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.cancelButton]}
                  onPress={() => setShowEndStreamConfirm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.endButton]}
                  onPress={handleEndStream}
                  disabled={isUpdating}
                >
                  <Text style={styles.endButtonText}>End Stream</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

// Placeholder components that would be implemented separately
const StreamSettingsPanel = ({ onSettingsUpdate, onChatSettingsUpdate, onQualityUpdate, isUpdating }: any) => (
  <View style={styles.settingsPanel}>
    <Text style={styles.sectionTitle}>Stream Settings</Text>
    <Text style={styles.placeholderText}>Settings panel would be implemented here</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  refreshButton: {
    padding: 8,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  tabButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: colors.accent,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  quickActions: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  warningButton: {
    backgroundColor: colors.warning,
  },
  errorButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  settingsPanel: {
    padding: 16,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  errorCloseButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    margin: 32,
    minWidth: 280,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  endButton: {
    backgroundColor: colors.error,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
