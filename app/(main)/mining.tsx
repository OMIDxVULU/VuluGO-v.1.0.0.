import React from 'react';
import { View, StyleSheet } from 'react-native';
import MiningScreen from '../../src/screens/MiningScreen';

export default function Mining() {
  return (
    <View style={styles.container}>
      <MiningScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 