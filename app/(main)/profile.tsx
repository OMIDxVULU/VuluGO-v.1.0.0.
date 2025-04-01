import React from 'react';
import { View, StyleSheet } from 'react-native';
import ProfileScreen from '../../src/screens/ProfileScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Profile() {
  return (
    <View style={styles.container}>
      <ProfileScreen />
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