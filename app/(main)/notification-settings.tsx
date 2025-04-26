import React from 'react';
import { View, StyleSheet } from 'react-native';
import NotificationSettingsScreen from '../../src/screens/NotificationSettingsScreen';

export default function NotificationSettings() {
  return (
    <View style={styles.container}>
      <NotificationSettingsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 