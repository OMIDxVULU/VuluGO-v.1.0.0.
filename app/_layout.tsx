import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { MenuPositionProvider } from '../src/components/SidebarMenu';
import { View, ActivityIndicator, Platform, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { UserProfileProvider } from '../src/context/UserProfileContext';
import { UserStatusProvider } from '../src/context/UserStatusContext';
import { LiveStreamProvider } from '../src/context/LiveStreamContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { AuthProvider } from '../src/context/AuthContext';
import ErrorBoundary from '../src/components/ErrorBoundary';

import { analyticsService } from '../src/services/AnalyticsService';

// Create a custom Material theme
const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#6E69F4',
    background: '#131318',
    surface: '#1C1D23',
    surfaceVariant: '#2C2D35',
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#AAAAAB',
  },
};

// Create a custom Navigation theme based on the dark theme
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#6E69F4',
    background: '#131318',
    card: '#1C1D23',
    text: '#FFFFFF',
    border: '#2C2D35',
    notification: '#F23535',
  },
};

// Create a simple context to share font loading status across the app
interface AppContextType {
  fontsLoaded: boolean;
}

export const AppContext = createContext<AppContextType>({ fontsLoaded: false });

export function useAppContext() {
  return useContext(AppContext);
}

// Component to render icon fallbacks when fonts aren't loaded
export const IconFallback = ({ size, color }: { size: number; color: string }) => (
  <View
    style={{
      width: size,
      height: size,
      backgroundColor: color === '#FFFFFF' ? '#666' : '#333',
      borderRadius: size / 2,
    }}
  />
);

// Error handler for the ErrorBoundary
const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
  // Report error to analytics service
  analyticsService.reportError({
    error,
    componentStack: errorInfo.componentStack || '',
    metadata: {
      component: 'RootLayout',
      timestamp: Date.now()
    }
  });
  
  console.error('Error caught by ErrorBoundary:', error, errorInfo);
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  // Always set fontsLoaded to false on iOS simulator to skip font loading completely
  const [fontsLoaded, setFontsLoaded] = useState(false);


  const [loaded] = useFonts({
    // Add any custom fonts here if needed
  });

  useEffect(() => {
    // Just set the app as ready immediately - skip all font loading attempts
    setIsReady(true);
    
    // Initialize analytics service
    analyticsService.initialize().catch(error => {
      console.error('Failed to initialize analytics:', error);
    });
    
    // Cleanup analytics on unmount
    return () => {
      analyticsService.shutdown();
    };
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#131318' }}>
        <ActivityIndicator size="large" color="#6E69F4" />
      </View>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <UserStatusProvider>
            <UserProfileProvider>
              <LiveStreamProvider>
                <NotificationProvider>
                  <AppContext.Provider value={{ fontsLoaded }}>
                    <MenuPositionProvider>
                      <SafeAreaProvider>
                        <PaperProvider theme={paperTheme}>
                          <StatusBar style="light" />
                          <Stack screenOptions={{ 
                            headerShown: false, 
                            gestureEnabled: true, // Explicitly enable swipe gesture
                            contentStyle: { backgroundColor: '#131318' },
                            animation: Platform.OS === 'ios' ? 'default' : 'fade',
                          }}>
                            <Stack.Screen name="index" />
                            <Stack.Screen name="auth" />
                            <Stack.Screen name="(main)" />
                          </Stack>
                          

                        </PaperProvider>
                      </SafeAreaProvider>
                    </MenuPositionProvider>
                  </AppContext.Provider>
                </NotificationProvider>
              </LiveStreamProvider>
            </UserProfileProvider>
          </UserStatusProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
});
