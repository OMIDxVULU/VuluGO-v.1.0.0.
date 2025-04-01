import React from 'react';
import { View, StyleSheet } from 'react-native';
import NotificationsScreen from '../../src/screens/NotificationsScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Notifications() {
  return (
    <View style={styles.container}>
      <NotificationsScreen />
      <SidebarMenu onMenuStateChange={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 