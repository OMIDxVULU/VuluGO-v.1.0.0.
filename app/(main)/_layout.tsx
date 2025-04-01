import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import CustomTabBar from '../../src/components/CustomTabBar';

/**
 * Main Layout
 * 
 * This layout configures the bottom tab bar to show ONLY 3 buttons:
 * 1. Home
 * 2. Notifications
 * 3. Profile
 * 
 * All other screens (directmessages, live, music, etc.) are hidden from the tab bar
 * and can only be accessed via the sidebar menu or buttons on the home screen.
 */
const Layout = () => {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#1C1D23',
            height: 100,
            borderTopWidth: 0,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: -2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 10,
            paddingBottom: 20,
          },
          tabBarHideOnKeyboard: true,
          tabBarShowLabel: true,
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#8F8F8F',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginBottom: 5,
          },
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        {/* ONLY THESE 3 BUTTONS WILL SHOW IN THE NAVBAR */}
        <Tabs.Screen 
          name="index" 
          options={{ 
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            )
          }} 
        />
        <Tabs.Screen 
          name="notifications" 
          options={{ 
            title: 'Notifications',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="notifications" size={size} color={color} />
            ),
            tabBarBadge: 9
          }} 
        />
        <Tabs.Screen 
          name="profile" 
          options={{ 
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="person" size={size} color={color} />
            ),
            tabBarBadge: 3
          }} 
        />
        
        {/* THESE SCREENS ARE HIDDEN FROM THE NAVBAR - Only accessible via the sidebar menu */}
        <Tabs.Screen name="directmessages" options={{ href: null }} />
        <Tabs.Screen name="live" options={{ href: null }} />
        <Tabs.Screen name="music" options={{ href: null }} />
        <Tabs.Screen name="leaderboard" options={{ href: null }} />
        <Tabs.Screen name="mining" options={{ href: null }} />
        <Tabs.Screen name="shop" options={{ href: null }} />
        <Tabs.Screen name="account" options={{ href: null }} />
        <Tabs.Screen name="chat" options={{ href: null }} />
      </Tabs>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
});

export default Layout; 