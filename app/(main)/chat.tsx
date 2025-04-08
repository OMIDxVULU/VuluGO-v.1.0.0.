import React, { useEffect } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useNavigation } from 'expo-router';
import ChatScreen from '../../src/screens/ChatScreen';
import SidebarMenu from '../../src/components/SidebarMenu';

export default function Chat() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';
  const name = typeof params.name === 'string' ? params.name : '';
  const avatar = typeof params.avatar === 'string' ? params.avatar : '';
  const source = typeof params.source === 'string' ? params.source : '';

  // Enhanced handler for back navigation that respects the source
  const handleGoBack = () => {
    if (source === 'live') {
      // Navigate directly to live screen if that's where user came from
      router.replace('/live');
      return true; // Prevent default behavior
    } else {
      // Default back behavior for other cases
      router.back();
      return true; // Prevent default behavior
    }
  };

  // Set up hardware back button and gesture handlers
  useEffect(() => {
    // Handle hardware back button (Android)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleGoBack);

    // Handle gesture navigation
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default behavior
      e.preventDefault();
      
      // Use our custom navigation logic
      handleGoBack();
    });

    // Clean up listeners
    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [navigation, source]);

  return (
    <View style={styles.container}>
      {/* Configure Stack.Screen for both button and gesture navigation */}
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: true,
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