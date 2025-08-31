import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

// CRITICAL FIX: Authentication-first routing component
function AuthenticationRouter() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Don't navigate while still loading authentication state
    if (loading) {
      console.log('🔄 Authentication still loading...');
      return;
    }

    console.log('🔍 Authentication check:', {
      hasUser: !!user,
      userType: user ? (user.isGuest ? 'guest' : 'authenticated') : 'none'
    });

    if (user) {
      // User is authenticated (either regular user or guest) - go to main app
      console.log('✅ User authenticated, navigating to main app');
      router.replace('/(main)');
    } else {
      // No user - show authentication selection screen
      console.log('🚫 No user found, showing authentication selection');
      router.replace('/auth');
    }
  }, [user, loading, router]);

  // Show loading screen while determining authentication state
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#131318' }}>
      <ActivityIndicator size="large" color="#6E69F4" />
      <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16 }}>
        {loading ? 'Checking authentication...' : 'Loading VuluGO...'}
      </Text>
    </View>
  );
}

export default function Index() {
  return <AuthenticationRouter />;
}