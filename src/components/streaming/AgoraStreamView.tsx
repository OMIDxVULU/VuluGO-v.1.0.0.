/**
 * Agora Stream View Component
 * Handles real-time audio/video streaming UI for VuluGO
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
// Temporarily disabled until Agora package is properly installed
// import RtcEngine, { RtcLocalView, RtcRemoteView } from 'agora-react-native-rtc';

import { agoraService } from '../../services/agoraService';
import { isAgoraConfigured } from '../../config/agoraConfig';

interface AgoraStreamViewProps {
  streamId: string;
  userId: string;
  isHost: boolean;
  onConnectionStateChange?: (connected: boolean) => void;
  onParticipantUpdate?: (participants: any[]) => void;
  onError?: (error: string) => void;
}

interface StreamControls {
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
}

export const AgoraStreamView: React.FC<AgoraStreamViewProps> = ({
  streamId,
  userId,
  isHost,
  onConnectionStateChange,
  onParticipantUpdate,
  onError,
}) => {
  // Temporary placeholder until Agora is properly installed
  return (
    <View style={styles.container}>
      <View style={styles.placeholderContainer}>
        <MaterialIcons name="mic" size={48} color="#6E56F7" />
        <Text style={styles.placeholderText}>Audio Streaming Ready</Text>
        <Text style={styles.placeholderSubtext}>
          Stream ID: {streamId}
        </Text>
        <Text style={styles.placeholderSubtext}>
          Role: {isHost ? 'Host' : 'Viewer'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  placeholderSubtext: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  hostControls: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1B23',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#6E56F7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1B23',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  localVideo: {
    flex: 1,
  },
  localVideoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  localVideoLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  remoteVideosContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  remoteVideoContainer: {
    width: '50%',
    aspectRatio: 1,
    padding: 5,
  },
  remoteVideo: {
    flex: 1,
    borderRadius: 12,
  },
  remoteVideoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  remoteVideoLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(110,86,247,0.8)',
  },
  leaveButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  speakingIndicator: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  speakingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
