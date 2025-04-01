import React from 'react';
import { View, StyleSheet } from 'react-native';
import MiningScreen from '../../src/screens/MiningScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Mining() {
  return (
    <View style={styles.container}>
      <MiningScreen />
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