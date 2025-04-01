import React from 'react';
import { View, StyleSheet } from 'react-native';
import MusicScreen from '../../src/screens/MusicScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Music() {
  return (
    <View style={styles.container}>
      <MusicScreen />
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