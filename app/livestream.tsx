import React from 'react';
import { StyleSheet, View } from 'react-native';
import LiveStreamView from '../src/screens/LiveStreamView';
import { LiveStreamProvider } from '../src/context/LiveStreamContext';

export default function LiveStream() {
  return (
    <View style={styles.container}>
      <LiveStreamView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 