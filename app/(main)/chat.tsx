import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ChatScreen from '../../src/screens/ChatScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Chat() {
  const params = useLocalSearchParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';
  const name = typeof params.name === 'string' ? params.name : '';
  const avatar = typeof params.avatar === 'string' ? params.avatar : '';

  // Instead of passing route directly, we'll need to modify the ChatScreen to accept props directly
  // For now, we'll render the component and add the SidebarMenu
  
  return (
    <View style={styles.container}>
      <ChatScreen />
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