import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import ChatScreen from '../../src/screens/ChatScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Chat() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';
  const name = typeof params.name === 'string' ? params.name : '';
  const avatar = typeof params.avatar === 'string' ? params.avatar : '';

  // Simple handler for back navigation
  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Basic Stack.Screen config with minimal options */}
      <Stack.Screen 
        options={{
          headerShown: false,
          // Enable gesture navigation with simple configuration
          gestureEnabled: true
        }} 
      />
      <ChatScreen 
        userId={userId}
        name={name}
        avatar={avatar}
        goBack={handleGoBack}
      />
      {/* Use empty callback to avoid re-renders */}
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