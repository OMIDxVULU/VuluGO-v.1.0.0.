import React from 'react';
import { View, StyleSheet } from 'react-native';
import LeaderboardScreen from '../../src/screens/LeaderboardScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Leaderboard() {
  return (
    <View style={styles.container}>
      <LeaderboardScreen />
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