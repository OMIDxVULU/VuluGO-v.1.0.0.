import React from 'react';
import { View, StyleSheet } from 'react-native';
import AccountScreen from '../../src/screens/AccountScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Account() {
  return (
    <View style={styles.container}>
      <AccountScreen />
      <SidebarMenu onMenuStateChange={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 