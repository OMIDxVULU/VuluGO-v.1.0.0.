import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { securityService, SecurityEvent } from '../../services/securityService';
import { useAuth } from '../../context/AuthContext';

interface AccountLockInfo {
  isLocked: boolean;
  lockUntil?: number;
  attemptCount: number;
  lastAttempt: number;
  lockReason?: string;
}

interface SecurityMonitorProps {
  userEmail?: string;
  showDetails?: boolean;
}

export const SecurityMonitor: React.FC<SecurityMonitorProps> = ({
  userEmail,
  showDetails = false,
}) => {
  const { user, userProfile } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountLockInfo, setAccountLockInfo] = useState<AccountLockInfo | null>(null);

  useEffect(() => {
    if (userEmail || user?.email) {
      loadSecurityData();
    }
  }, [userEmail, user]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const email = userEmail || user?.email || userProfile?.email;
      if (!email) return;

      const userIdentifier = email.toLowerCase().trim();
      
      // Load recent security events
      const recentEvents = await securityService.getSecurityEvents(userIdentifier);
      setEvents(recentEvents.slice(-10)); // Show last 10 events

      // Check account lock status
      const lockInfo = await securityService.isAccountLocked(userIdentifier);
      setAccountLockInfo(lockInfo);
    } catch (error) {
      console.warn('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventType = (type: string): string => {
    switch (type) {
      case 'login_attempt': return 'Login Attempt';
      case 'login_success': return 'Successful Login';
      case 'login_failure': return 'Failed Login';
      case 'signup_attempt': return 'Signup Attempt';
      case 'password_reset': return 'Password Reset';
      case 'account_locked': return 'Account Locked';
      case 'suspicious_activity': return 'Suspicious Activity';
      default: return type;
    }
  };

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'login_success': return 'check-circle';
      case 'login_failure': return 'x-circle';
      case 'account_locked': return 'lock';
      case 'suspicious_activity': return 'alert-triangle';
      default: return 'activity';
    }
  };

  const getEventColor = (type: string): string => {
    switch (type) {
      case 'login_success': return '#34C759';
      case 'login_failure': return '#FF3B30';
      case 'account_locked': return '#FF9500';
      case 'suspicious_activity': return '#FF3B30';
      default: return '#6E69F4';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleCleanupSecurity = async () => {
    Alert.alert(
      'Clean Security Data',
      'This will remove old security events and clear expired locks. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Up',
          onPress: async () => {
            try {
              await securityService.cleanup();
              await loadSecurityData();
              Alert.alert('Success', 'Security data cleaned up successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clean up security data.');
            }
          },
        },
      ]
    );
  };

  if (!showDetails) {
    // Simple status indicator
    return (
      <View style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <Feather name="shield" size={16} color="#6E69F4" />
          <Text style={styles.statusTitle}>Security Status</Text>
        </View>
        
        {accountLockInfo?.isLocked ? (
          <View style={styles.warningStatus}>
            <Feather name="lock" size={14} color="#FF9500" />
            <Text style={styles.warningText}>Account Locked</Text>
          </View>
        ) : (
          <View style={styles.normalStatus}>
            <Feather name="check" size={14} color="#34C759" />
            <Text style={styles.normalText}>Secure</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#272931', '#1E1F25']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Feather name="shield" size={20} color="#6E69F4" />
            <Text style={styles.title}>Security Monitor</Text>
          </View>
          
          <TouchableOpacity onPress={loadSecurityData} disabled={loading}>
            <Feather name="refresh-cw" size={18} color="#9BA1A6" />
          </TouchableOpacity>
        </View>

        {accountLockInfo && (
          <View style={styles.lockInfoContainer}>
            <View style={styles.lockInfo}>
              <Feather 
                name={accountLockInfo.isLocked ? "lock" : "unlock"} 
                size={16} 
                color={accountLockInfo.isLocked ? "#FF9500" : "#34C759"} 
              />
              <Text style={styles.lockInfoText}>
                {accountLockInfo.isLocked
                  ? (typeof accountLockInfo.lockUntil === 'number' && Number.isFinite(accountLockInfo.lockUntil)
                      ? `Account locked until ${new Date(accountLockInfo.lockUntil).toLocaleTimeString()}`
                      : 'Account locked')
                  : `${accountLockInfo.attemptCount} failed attempts`
                }
              </Text>
            </View>
          </View>
        )}

        <View style={styles.eventsContainer}>
          <Text style={styles.eventsTitle}>Recent Activity</Text>
          
          {events.length === 0 ? (
            <Text style={styles.noEvents}>No recent security events</Text>
          ) : (
            <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
              {events.map((event, index) => (
                <View key={index} style={styles.eventItem}>
                  <View style={styles.eventIcon}>
                    <Feather 
                      name={getEventIcon(event.type) as any} 
                      size={14} 
                      color={getEventColor(event.type)} 
                    />
                  </View>
                  
                  <View style={styles.eventContent}>
                    <Text style={styles.eventType}>
                      {formatEventType(event.type)}
                    </Text>
                    <Text style={styles.eventTime}>
                      {formatTimestamp(event.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <TouchableOpacity 
          style={styles.cleanupButton} 
          onPress={handleCleanupSecurity}
        >
          <Text style={styles.cleanupButtonText}>Clean Up Security Data</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  normalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  normalText: {
    color: '#34C759',
    fontSize: 12,
    marginLeft: 4,
  },
  warningStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    color: '#FF9500',
    fontSize: 12,
    marginLeft: 4,
  },
  lockInfoContainer: {
    marginBottom: 16,
  },
  lockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  lockInfoText: {
    color: '#FF9500',
    fontSize: 14,
    marginLeft: 8,
  },
  eventsContainer: {
    marginBottom: 16,
  },
  eventsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  noEvents: {
    color: '#9BA1A6',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  eventsList: {
    maxHeight: 200,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventType: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  eventTime: {
    color: '#9BA1A6',
    fontSize: 12,
    marginTop: 2,
  },
  cleanupButton: {
    backgroundColor: 'rgba(110, 105, 244, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cleanupButtonText: {
    color: '#6E69F4',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SecurityMonitor;
