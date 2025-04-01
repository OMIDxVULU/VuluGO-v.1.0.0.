import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { MenuPositionProvider } from '../src/components/SidebarMenu';

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

export default function RootLayout() {
  return (
    <MenuPositionProvider>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(main)" />
          </Stack>
        </PaperProvider>
      </SafeAreaProvider>
    </MenuPositionProvider>
  );
}
