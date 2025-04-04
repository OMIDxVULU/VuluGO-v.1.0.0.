import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { MenuPositionProvider } from '../src/components/SidebarMenu';
import { View, ActivityIndicator, Platform, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  // Always set fontsLoaded to false on iOS simulator to skip font loading completely
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Just set the app as ready immediately - skip all font loading attempts
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#131318' }}>
        <ActivityIndicator size="large" color="#6E69F4" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContext.Provider value={{ fontsLoaded }}>
        <MenuPositionProvider>
          <SafeAreaProvider>
            <PaperProvider theme={paperTheme}>
              <StatusBar style="light" />
              <Stack screenOptions={{ 
                headerShown: false, 
                gestureEnabled: true // Explicitly enable swipe gesture
              }}>
                <Stack.Screen name="(main)" />
              </Stack>
            </PaperProvider>
          </SafeAreaProvider>
        </MenuPositionProvider>
      </AppContext.Provider>
    </GestureHandlerRootView>
  );
}
