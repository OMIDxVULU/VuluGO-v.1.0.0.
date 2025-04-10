import React from 'react';
import { View, StyleSheet } from 'react-native';
import LiveScreen from '../../src/screens/LiveScreen';

export default function Live() {
  return (
    <View style={styles.container}>
      <LiveScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 