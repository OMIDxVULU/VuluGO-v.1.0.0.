import React from 'react';
import { View, StyleSheet } from 'react-native';
import DirectMessagesScreen from '../../src/screens/DirectMessagesScreen';

export default function DirectMessages() {
  return (
    <View style={styles.container}>
      <DirectMessagesScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  }
}); 