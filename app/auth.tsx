import React, { useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AuthScreen from '../src/screens/AuthScreen';

export default function Auth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(main)');
    }
  }, [user, loading, router]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#131318' }}>
        <ActivityIndicator size="large" color="#6E69F4" />
      </View>
    );
  }

  // If user is authenticated, show loading while redirecting
  if (user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#131318' }}>
        <ActivityIndicator size="large" color="#6E69F4" />
      </View>
    );
  }

  // Show authentication screen
  return <AuthScreen />;
} 