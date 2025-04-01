import React from 'react';
import { View, StyleSheet } from 'react-native';
import LiveScreen from '../../src/screens/LiveScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Live() {
  return (
    <View style={styles.container}>
      <LiveScreen />
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