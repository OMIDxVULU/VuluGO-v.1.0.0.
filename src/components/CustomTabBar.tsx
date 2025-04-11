import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, NotificationIcon, PersonIcon } from './icons/AppIcons';

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  
  // Get options for the *currently active* route
  const activeRouteKey = state.routes[state.index].key;
  const activeDescriptor = descriptors[activeRouteKey];
  const activeOptions = activeDescriptor.options;

  // If the active route's tabBarStyle is set to display: 'none', hide the tab bar
  if (activeOptions.tabBarStyle && typeof activeOptions.tabBarStyle === 'object' && (activeOptions.tabBarStyle as any).display === 'none') {
    return null;
  }
  
  // Filter routes to only include index, notifications, and profile for display
  const allowedRoutes = ['index', 'notifications', 'profile'];
  const visibleRoutes = state.routes.filter(route => allowedRoutes.includes(route.name));
  const visibleRouteIndices = visibleRoutes.map(route => state.routes.findIndex(r => r.key === route.key));
  
  const getIconComponent = (routeName: string, isFocused: boolean, badge: number | undefined) => {
    const color = isFocused ? "#FFFFFF" : "rgba(211, 210, 210, 0.6)";
    const size = 22;

    switch (routeName) {
      case 'index':
        return (
          <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
            <HomeIcon color={color} size={size} active={isFocused} />
          </View>
        );
      case 'notifications':
        return (
          <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
            <NotificationIcon color={color} size={size} active={isFocused} />
            {badge && (
              <View style={styles.notificationsBadge}>
                <Text style={styles.notificationsBadgeValue}>{badge}</Text>
              </View>
            )}
          </View>
        );
      case 'profile':
        return (
          <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
            <PersonIcon color={color} size={size} active={isFocused} />
            {badge && (
              <View style={styles.notificationsBadge}>
                <Text style={styles.notificationsBadgeValue}>{badge}</Text>
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.bottomBarContent}>
        {visibleRoutes.map((route, idx) => {
          const index = visibleRouteIndices[idx];
          const { options } = descriptors[route.key];
          
          let label = 'Home';
          if (route.name === 'notifications') label = 'Notifications';
          if (route.name === 'profile') label = 'Profile';
          
          const isFocused = state.index === index;
          const badge = typeof options.tabBarBadge === 'number' ? options.tabBarBadge : undefined;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <View style={styles.tabItemContainer}>
                {getIconComponent(route.name, isFocused, badge)}
                <Text 
                  numberOfLines={1} 
                  ellipsizeMode="tail" 
                  style={[styles.tabBarLabel, isFocused ? styles.tabBarLabelActive : styles.tabBarLabelInactive]}
                >
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
    elevation: 10,
    width: '100%',
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 5,
    paddingBottom: 15,
    width: '100%',
    backgroundColor: '#1C1D23',
    borderTopWidth: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    width: '100%',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    position: 'relative',
  },
  activeIconContainer: {
    backgroundColor: '#6E69F4',
    shadowColor: '#6E69F4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  tabBarLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 1,
    maxWidth: 80,
    overflow: 'hidden',
  },
  tabBarLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabBarLabelInactive: {
    color: '#8F8F8F',
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#5865F2',
    borderWidth: 2,
    borderColor: '#1C1D23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileStatus: {
    position: 'absolute',
    width: 12,
    height: 12,
    right: 8,
    bottom: 8,
    backgroundColor: '#7ADA72',
    borderWidth: 2,
    borderColor: '#1C1D23',
    borderRadius: 6,
  },
  notificationsBadge: {
    position: 'absolute',
    width: 18,
    height: 18,
    right: 0,
    top: 0,
    backgroundColor: '#F23535',
    borderWidth: 2,
    borderColor: '#1C1D23',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationsBadgeValue: {
    fontWeight: '700',
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default CustomTabBar; 