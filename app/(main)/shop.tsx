import React from 'react';
import { View, StyleSheet } from 'react-native';
import ShopScreen from '../../src/screens/ShopScreen';

export default function Shop() {
  return (
    <View style={styles.container}>
      <ShopScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 