import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, NotificationIcon, PersonIcon } from './icons/AppIcons';
import { useUserStatus, getStatusColor } from '../context/UserStatusContext';
import { useNotifications } from '../context/NotificationContext';

interface CustomTabBarProps extends BottomTabBarProps {
  profileImage?: string;
  userStatus?: string;
  statusColor?: string;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({ 
  state, 
  descriptors, 
  navigation, 
  profileImage,
  userStatus,
  statusColor = '#7ADA72' // Default to online green color
}) => {
  const insets = useSafeAreaInsets();
  // Use the dynamic notification context instead of a fixed value
  const { counts } = useNotifications();
  
  // Get current user status for profile tab indicator
  const { userStatus: currentUserStatus } = useUserStatus();
  
  // Get the current status color for the profile tab indicator
  const profileStatusColor = getStatusColor(currentUserStatus);
  
  // Memoize routes filtering to reduce calculations on re-renders
  const { visibleRoutes, visibleRouteIndices } = useMemo(() => {
    const allowedRoutes = ['index', 'notifications', 'profile'];
    const filtered = state.routes.filter(route => allowedRoutes.includes(route.name));
    const indices = filtered.map(route => state.routes.findIndex(r => r.key === route.key));
    return { visibleRoutes: filtered, visibleRouteIndices: indices };
  }, [state.routes]);

  // Get options for the *currently active* route
  const activeRouteKey = state.routes[state.index].key;
  const activeDescriptor = descriptors[activeRouteKey];
  const activeOptions = activeDescriptor.options;

  // Flatten tabBarStyle to handle objects, arrays, and StyleSheet IDs
  const flattenedTabBarStyle = StyleSheet.flatten(activeOptions.tabBarStyle);

  // If the active route's tabBarStyle is set to display: 'none', hide the tab bar
  if (flattenedTabBarStyle && flattenedTabBarStyle.display === 'none') {
    return null;
  }

  // Memoize the icon component generator to prevent recreating functions on every render
  const getIconComponent = useMemo(() => (routeName: string, isFocused: boolean, badge: number | undefined) => {
    const color = isFocused ? "#FFFFFF" : "rgba(211, 210, 210, 0.6)";
    const size = 22;

    // Use dynamic badge count from the context for notifications tab
    let badgeCount = badge;
    if (routeName === 'notifications') {
      badgeCount = counts.total > 0 ? counts.total : undefined;
    }

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
            {badgeCount && (
              <View style={styles.notificationsBadge}>
                <Text style={styles.notificationsBadgeValue}>{badgeCount}</Text>
              </View>
            )}
          </View>
        );
      case 'profile':
        return (
          <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
            {profileImage ? (
              <View 
                style={[
                  styles.profileImageContainer, 
                  { borderColor: profileStatusColor }
                ]}
              >
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.profileImage} 
                  resizeMode="cover"
                />
              </View>
            ) : (
              <PersonIcon color={color} size={size} active={isFocused} />
            )}
            {badgeCount && (
              <View style={styles.notificationsBadge}>
                <Text style={styles.notificationsBadgeValue}>{badgeCount}</Text>
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  }, [profileImage, profileStatusColor, counts]);

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
  profileImageContainer: {
    width: 30,
    height: 30,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#7ADA72',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
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