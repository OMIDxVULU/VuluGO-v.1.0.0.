import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ChatScreen from '../../src/screens/ChatScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Chat() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';
  const name = typeof params.name === 'string' ? params.name : '';
  const avatar = typeof params.avatar === 'string' ? params.avatar : '';

  // Use the standard back button in the ChatScreen component

  // Pass the params directly to the ChatScreen component
  return (
    <View style={styles.container}>
      <ChatScreen 
        userId={userId}
        name={name}
        avatar={avatar}
        goBack={() => router.back()}
      />
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