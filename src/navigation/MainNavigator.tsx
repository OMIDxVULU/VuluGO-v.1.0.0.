import React, { useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Import components
import CustomTabBar from '../components/CustomTabBar';
import SidebarMenu from '../components/SidebarMenu';

// Define types for the navigation
export type MainTabParamList = {
  Home: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator = () => {
  // We still track the sidebar state but don't adjust layout based on it
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const handleSidebarStateChange = (expanded: boolean) => {
    setIsSidebarExpanded(expanded);
  };

  return (
    <View style={styles.container}>
      {/* Main content container - full width and not affected by sidebar */}
      <View style={styles.contentContainer}>
        <Tab.Navigator
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1C1D23',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0, // Remove bottom border as screens will handle it
              height: 61, // Match Figma height
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
            },
            tabBarStyle: {
              position: 'absolute',
              backgroundColor: 'transparent',
              elevation: 0,
              borderTopWidth: 0,
              bottom: 0, // Ensure it's at the bottom
              left: 0,
              right: 0,
              height: 80, // Reduced height to remove extra space
            },
            headerShown: false, // Hide the header as we're handling it in screens
          }}
        >
          <Tab.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{
              headerTitle: 'Messages',
            }}
          />
          <Tab.Screen 
            name="Notifications" 
            component={NotificationsScreen} 
            options={{
              tabBarBadge: 9, // Example badge count
            }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileScreen} 
          />
        </Tab.Navigator>
      </View>
      
      {/* Sidebar menu that shows on top but doesn't affect layout */}
      <SidebarMenu onMenuStateChange={handleSidebarStateChange} />
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318', // Match Figma background color
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#131318',
    overflow: 'hidden',
    width: '100%', // Ensure it takes full width regardless of sidebar
  },
});

export default MainNavigator; 