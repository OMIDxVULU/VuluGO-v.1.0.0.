import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FeatherIconName = 'bell' | 'log-in' | 'alert-triangle' | 'lock' | 'fingerprint' | 'settings' | 'refresh-ccw' | 'info';

interface SecurityPreferences {
  enableSecurityNotifications: boolean;
  enableLoginAlerts: boolean;
  enableSuspiciousActivityAlerts: boolean;
  autoLockEnabled: boolean;
  requireBiometricForSensitiveActions: boolean;
}

interface SecuritySettingsProps {
  onPreferencesChange?: (preferences: SecurityPreferences) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  onPreferencesChange,
}) => {
  const [preferences, setPreferences] = useState<SecurityPreferences>({
    enableSecurityNotifications: true,
    enableLoginAlerts: true,
    enableSuspiciousActivityAlerts: true,
    autoLockEnabled: true,
    requireBiometricForSensitiveActions: false,
  });
  const [loading, setLoading] = useState(false);

  const SECURITY_PREFERENCES_KEY = '@vulugo_security_preferences';

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(SECURITY_PREFERENCES_KEY);
      if (stored) {
        const loadedPreferences = JSON.parse(stored);
        setPreferences(loadedPreferences);
      }
    } catch (error) {
      console.warn('Error loading security preferences:', error);
    }
  };

  const savePreferences = async (newPreferences: SecurityPreferences) => {
    try {
      await AsyncStorage.setItem(SECURITY_PREFERENCES_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
      
      if (onPreferencesChange) {
        onPreferencesChange(newPreferences);
      }
    } catch (error) {
      console.warn('Error saving security preferences:', error);
      Alert.alert('Error', 'Failed to save security preferences.');
    }
  };

  const togglePreference = async (key: keyof SecurityPreferences) => {
    if (loading) return;

    setLoading(true);
    try {
      const newPreferences = {
        ...preferences,
        [key]: !preferences[key],
      };
      await savePreferences(newPreferences);
    } catch (error) {
      console.warn('Error toggling preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    if (loading) return;

    Alert.alert(
      'Reset Security Settings',
      'This will reset all security settings to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const defaultPreferences: SecurityPreferences = {
                enableSecurityNotifications: true,
                enableLoginAlerts: true,
                enableSuspiciousActivityAlerts: true,
                autoLockEnabled: true,
                requireBiometricForSensitiveActions: false,
              };
              await savePreferences(defaultPreferences);
            } catch (error) {
              console.warn('Error resetting preferences:', error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const SecurityToggleItem: React.FC<{
    title: string;
    subtitle: string;
    value: boolean;
    onToggle: () => void;
    icon: FeatherIconName;
    iconColor?: string;
  }> = ({ title, subtitle, value, onToggle, icon, iconColor = '#6E69F4' }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#6E69F4' }}
        thumbColor={value ? '#FFFFFF' : '#9BA1A6'}
        ios_backgroundColor="rgba(255, 255, 255, 0.2)"
      />
    </View>
  );

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
            <Feather name="settings" size={20} color="#6E69F4" />
            <Text style={styles.title}>Security Settings</Text>
          </View>
        </View>

        <View style={styles.settingsContainer}>
          <SecurityToggleItem
            title="Security Notifications"
            subtitle="Get notified about security events"
            value={preferences.enableSecurityNotifications}
            onToggle={() => togglePreference('enableSecurityNotifications')}
            icon="bell"
          />

          <SecurityToggleItem
            title="Login Alerts"
            subtitle="Alert when someone signs into your account"
            value={preferences.enableLoginAlerts}
            onToggle={() => togglePreference('enableLoginAlerts')}
            icon="log-in"
          />

          <SecurityToggleItem
            title="Suspicious Activity Alerts"
            subtitle="Alert for unusual account activity"
            value={preferences.enableSuspiciousActivityAlerts}
            onToggle={() => togglePreference('enableSuspiciousActivityAlerts')}
            icon="alert-triangle"
            iconColor="#FF9500"
          />

          <SecurityToggleItem
            title="Auto-Lock Account"
            subtitle="Automatically lock account after failed attempts"
            value={preferences.autoLockEnabled}
            onToggle={() => togglePreference('autoLockEnabled')}
            icon="lock"
          />

          <SecurityToggleItem
            title="Biometric for Sensitive Actions"
            subtitle="Require biometric auth for account changes"
            value={preferences.requireBiometricForSensitiveActions}
            onToggle={() => togglePreference('requireBiometricForSensitiveActions')}
            icon="fingerprint"
          />
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={resetToDefaults}
            disabled={loading}
          >
            <Feather name="refresh-ccw" size={16} color="#FF9500" />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoIcon}>
            <Feather name="info" size={14} color="#9BA1A6" />
          </View>
          <Text style={styles.infoText}>
            These settings help protect your account from unauthorized access and suspicious activity.
          </Text>
        </View>
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
    marginBottom: 20,
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
  settingsContainer: {
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(110, 105, 244, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: '#9BA1A6',
    fontSize: 14,
    lineHeight: 18,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  resetButtonText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    color: '#9BA1A6',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
});

export default SecuritySettings;
