import React from 'react';
import { StyleSheet, View } from 'react-native';
import LiveStreamSetupScreen from '../src/screens/LiveStreamSetupScreen';

export default function LiveStreamSetup() {
  return (
    <View style={styles.container}>
      <LiveStreamSetupScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
