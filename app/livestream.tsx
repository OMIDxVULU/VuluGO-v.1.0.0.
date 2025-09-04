import React from 'react';
import { StyleSheet, View } from 'react-native';
import LiveStreamViewSimple from '../src/screens/LiveStreamViewSimple';

export default function LiveStream() {
  return (
    <View style={styles.container}>
      <LiveStreamViewSimple />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 