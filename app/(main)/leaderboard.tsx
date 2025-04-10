import React from 'react';
import { View, StyleSheet } from 'react-native';
import LeaderboardScreen from '../../src/screens/LeaderboardScreen';

export default function Leaderboard() {
  return (
    <View style={styles.container}>
      <LeaderboardScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 