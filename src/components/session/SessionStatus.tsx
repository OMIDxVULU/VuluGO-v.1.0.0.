import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { sessionService } from '../../services/sessionService';

interface SessionData {
  lastActiveTime: number;
  sessionStartTime: number;
  backgroundTime?: number;
  isActive: boolean;
}

interface SessionStatusProps {
  showDetails?: boolean;
  onExtendSession?: () => void;
}

export const SessionStatus: React.FC<SessionStatusProps> = ({
  showDetails = false,
  onExtendSession,
}) => {
  const { user, getSessionData, updateActivity } = useAuth();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!user) return;

    const updateSessionInfo = () => {
      const data = getSessionData();
      setSessionData(data);

      if (data) {
        const config = sessionService.getConfig();
        const now = Date.now();
        const timeSinceActivity = now - data.lastActiveTime;
        const timeoutMs = config.inactivityTimeoutMinutes * 60 * 1000;
        const remaining = Math.max(0, timeoutMs - timeSinceActivity);
        
        // Show warning when less than 5 minutes remaining
        const warningThreshold = 5 * 60 * 1000; // 5 minutes
        setShowWarning(remaining < warningThreshold && remaining > 0);
        
        // Format time remaining
        const minutes = Math.floor(remaining / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateSessionInfo();
    const interval = setInterval(updateSessionInfo, 1000);

    return () => clearInterval(interval);
  }, [user, getSessionData]);

  const handleExtendSession = () => {
    updateActivity();
    if (onExtendSession) {
      onExtendSession();
    }
  };

  const showSessionWarning = () => {
    Alert.alert(
      'Session Expiring Soon',
      `Your session will expire in ${timeRemaining}. Would you like to extend it?`,
      [
        {
          text: 'Let it expire',
          style: 'cancel',
        },
        {
          text: 'Extend Session',
          onPress: handleExtendSession,
        },
      ]
    );
  };

  if (!user || !sessionData) return null;

  if (showWarning && !showDetails) {
    return (
      <View style={styles.warningContainer}>
        <LinearGradient
          colors={['rgba(255, 149, 0, 0.9)', 'rgba(255, 107, 61, 0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.warningGradient}
        >
          <Feather name="clock" size={16} color="#FFFFFF" />
          <Text style={styles.warningText}>
            Session expires in {timeRemaining}
          </Text>
          <TouchableOpacity onPress={showSessionWarning} style={styles.extendButton}>
            <Text style={styles.extendButtonText}>Extend</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  if (!showDetails) return null;

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  };

  const sessionDuration = Date.now() - sessionData.sessionStartTime;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#272931', '#1E1F25']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <Feather name="shield" size={20} color="#6E69F4" />
          <Text style={styles.title}>Session Status</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Session Duration:</Text>
          <Text style={styles.value}>{formatDuration(sessionDuration)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Time Until Timeout:</Text>
          <Text style={[styles.value, showWarning && styles.warningValue]}>
            {timeRemaining}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, styles.activeStatus]}>
            {sessionData.isActive ? 'Active' : 'Background'}
          </Text>
        </View>
        
        <TouchableOpacity onPress={handleExtendSession} style={styles.refreshButton}>
          <LinearGradient
            colors={['#6E69F4', '#5865F2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.refreshGradient}
          >
            <Feather name="refresh-cw" size={16} color="#FFFFFF" />
            <Text style={styles.refreshText}>Extend Session</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  warningValue: {
    color: '#FF9500',
  },
  activeStatus: {
    color: '#34C759',
  },
  refreshButton: {
    marginTop: 8,
  },
  refreshGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  warningGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  extendButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  extendButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SessionStatus;
