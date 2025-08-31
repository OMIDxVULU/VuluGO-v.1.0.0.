import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewAuthScreen from '../src/screens/auth/NewAuthScreen';
import { OnboardingProvider } from '../src/context/OnboardingContext';

// Lazy load OnboardingNavigator to prevent AuthColors import issues during app startup
const OnboardingNavigator = lazy(() => import('../src/navigation/OnboardingNavigator'));

export default function Auth() {
  const { user, loading, isGuest } = useAuth();
  const router = useRouter();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check onboarding completion status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem('@onboarding_completed');
        setOnboardingCompleted(completed === 'true');
      } catch (error) {
        // Handle AsyncStorage errors gracefully in development environment
        console.warn('AsyncStorage unavailable in development environment, defaulting to incomplete onboarding');
        // Default to false (onboarding not completed) so the flow continues normally
        setOnboardingCompleted(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && !checkingOnboarding && user) {
      // CRITICAL FIX: Handle guest users differently - they don't need onboarding
      if (isGuest) {
        // Guest users should go back to main app, not through onboarding
        console.log('🎭 Guest user in auth screen, redirecting to main app');
        router.replace('/(main)');
        return;
      }

      if (onboardingCompleted) {
        router.replace('/(main)');
      }
      // If onboarding not completed for regular users, stay in auth flow to show onboarding
    }
  }, [user, loading, checkingOnboarding, onboardingCompleted, isGuest, router]);

  // Show loading screen while checking authentication or onboarding
  if (loading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1117' }}>
        <ActivityIndicator size="large" color="#5865F2" />
      </View>
    );
  }

  // If user is authenticated and onboarding is complete, show loading while redirecting
  if (user && onboardingCompleted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1117' }}>
        <ActivityIndicator size="large" color="#5865F2" />
      </View>
    );
  }

  // If user is authenticated but onboarding not complete, show onboarding
  if (user && !onboardingCompleted) {
    return (
      <OnboardingProvider>
        <Suspense fallback={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1117' }}>
            <ActivityIndicator size="large" color="#5865F2" />
          </View>
        }>
          <OnboardingNavigator />
        </Suspense>
      </OnboardingProvider>
    );
  }

  // Show new authentication screen for non-authenticated users
  return <NewAuthScreen />;
}