import React from 'react';
import { View, StyleSheet } from 'react-native';
import DirectMessagesScreen from '../../src/screens/DirectMessagesScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function DirectMessages() {
  return (
    <View style={styles.container}>
      <DirectMessagesScreen />
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