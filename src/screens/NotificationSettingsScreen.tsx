import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // For back button

interface NotificationSetting {
  id: string;
  title: string;
  enabled: boolean;
}

interface NotificationSection {
  title: string;
  settings: NotificationSetting[];
}

const NotificationSettingsScreen = () => {
  const router = useRouter();
  
  // State for app notification settings
  const [appNotifications, setAppNotifications] = useState<NotificationSetting[]>([
    { id: 'friend_requests', title: 'Friend Requests', enabled: true },
    { id: 'direct_messages', title: 'Direct Messages', enabled: true },
    { id: 'mentions', title: 'Mentions', enabled: true },
    { id: 'friend_live', title: 'Friend Goes Live', enabled: true },
    { id: 'earnings', title: 'Earnings & Withdrawals', enabled: true },
    { id: 'events', title: 'Events & Announcements', enabled: true },
    { id: 'daily_streak', title: 'Daily & Streak Reminders', enabled: true },
  ]);
  
  // State for system notification settings
  const [systemNotifications, setSystemNotifications] = useState<NotificationSetting[]>([
    { id: 'external_notifications', title: 'Get notifications outside of Vulu.', enabled: true },
  ]);

  // Toggle handler for notification settings
  const toggleNotification = (id: string, isAppNotification: boolean) => {
    if (isAppNotification) {
      setAppNotifications(prev => 
        prev.map(setting => 
          setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
        )
      );
    } else {
      setSystemNotifications(prev => 
        prev.map(setting => 
          setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
        )
      );
    }
  };

  // Render a notification setting item with toggle
  const renderSettingItem = (item: NotificationSetting, isAppNotification: boolean) => (
    <View key={item.id} style={styles.settingItem}>
      <Text style={styles.settingTitle}>{item.title}</Text>
      <Switch
        trackColor={{ false: '#3C3D45', true: '#B768FB' }}
        thumbColor={item.enabled ? '#FFFFFF' : '#F4F3F4'}
        ios_backgroundColor="#3C3D45"
        onValueChange={() => toggleNotification(item.id, isAppNotification)}
        value={item.enabled}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 24 }} />{/* Spacer */}
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* In-app Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In-app notifications</Text>
          <View style={styles.sectionContent}>
            {appNotifications.map(item => renderSettingItem(item, true))}
          </View>
        </View>
        
        {/* System Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System notifications</Text>
          <View style={styles.sectionContent}>
            {systemNotifications.map(item => renderSettingItem(item, false))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1D23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderText: {
    color: '#8F8F8F',
    fontSize: 16,
  },

  // Add new styles:
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#8F8F8F',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#2C2D35',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingTitle: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 8,
  },
});

export default NotificationSettingsScreen; 