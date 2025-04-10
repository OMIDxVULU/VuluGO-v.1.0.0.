import React from 'react';
import { View, StyleSheet } from 'react-native';
import AccountScreen from '../../src/screens/AccountScreen';

export default function Account() {
  return (
    <View style={styles.container}>
      <AccountScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 