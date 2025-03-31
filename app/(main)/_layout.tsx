import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainNavigator from '../../src/navigation/MainNavigator';

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

export default function MainLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <MainNavigator />
        </View>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 