import React, { useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useNavigation, useFocusEffect } from 'expo-router';
import ChatScreen from '../../src/screens/ChatScreen';

export default function Chat() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [isValidParams, setIsValidParams] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Extract and validate parameters
  const userId = typeof params.userId === 'string' ? params.userId : '';
  const name = typeof params.name === 'string' ? params.name : '';
  const avatar = typeof params.avatar === 'string' ? params.avatar : '';
  const source = typeof params.source === 'string' ? params.source : '';

  // Force refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // This will force the ChatScreen to remount when the screen comes into focus
      setRefreshKey(Date.now());
      return () => {
        // Any cleanup if needed
      };
    }, [])
  );

  // Validate required parameters
  useEffect(() => {
    // Short timeout to ensure the component is mounted
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Check if we have the minimum required parameters
      if (!userId || !name) {
        console.error('Missing required chat parameters:', { userId, name, avatar });
        setIsValidParams(false);
      } else {
        setIsValidParams(true);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [userId, name, avatar]);

  // Enhanced handler for back navigation that respects the source
  const handleGoBack = () => {
    // Navigate to the direct messages screen instead of home
    if (source === 'live') {
      // Navigate to home screen since live screen has been removed
      router.push('/(main)');
      return true; // Prevent default behavior
    } else if (source === 'notifications') {
      router.push('/(main)/notifications');
      return true;
    } else {
      // Navigate to direct messages screen - use the correct path
      router.push('/(main)/directmessages'); // Use the actual file name
      return true; // Prevent default behavior
    }
  };

  // Navigate directly to direct messages screen with correct route
  const goToDMs = () => {
    router.push('/(main)/directmessages'); // Use the actual file name
    return true;
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

  // Show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6E69F4" />
      </View>
    );
  }

  // Show error state if parameters are invalid
  if (!isValidParams) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Error loading chat</Text>
        <Text style={styles.subErrorText}>Missing required information</Text>
        <View style={styles.buttonContainer}>
          <Text style={styles.backButton} onPress={handleGoBack}>
            Go back to messages
          </Text>
        </View>
      </View>
    );
  }

  // Render chat screen if parameters are valid
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
        key={`chat-${userId}-${refreshKey}`}
        userId={userId}
        name={name}
        avatar={avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'} // Fallback avatar
        goBack={handleGoBack}
        goToDMs={goToDMs}
        source={source}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subErrorText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 24,
  },
  buttonContainer: {
    marginTop: 16,
    padding: 12,
  },
  backButton: {
    color: '#6E69F4',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: 12,
  }
}); 