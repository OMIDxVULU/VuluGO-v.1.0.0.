import React from 'react';
import { View, StyleSheet } from 'react-native';
import MusicScreen from '../../src/screens/MusicScreen';

export default function Music() {
  return (
    <View style={styles.container}>
      <MusicScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 