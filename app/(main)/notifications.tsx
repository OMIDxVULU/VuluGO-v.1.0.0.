import React from 'react';
import { View, StyleSheet } from 'react-native';
import NotificationsScreen from '../../src/screens/NotificationsScreen';

export default function Notifications() {
  return (
    <View style={styles.container}>
      <NotificationsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 