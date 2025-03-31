import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={styles.container}>
      <View style={styles.bottomBarContent}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = 
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title || route.name;
          const isFocused = state.index === index;
          
          // Get badge count if specified in options
          const badge = options.tabBarBadge ? options.tabBarBadge : null;
          
          let iconComponent;
          if (route.name === 'Home') {
            iconComponent = (
              <View style={styles.tabItemContainer}>
                <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                  <MaterialIcons name="home" size={26} color={isFocused ? "#FFFFFF" : "rgba(211, 210, 210, 0.6)"} />
                </View>
                <Text style={[styles.tabBarLabel, isFocused ? styles.tabBarLabelActive : styles.tabBarLabelInactive]}>
                  {label}
                </Text>
                {isFocused && <View style={styles.activeIndicator} />}
              </View>
            );
          } else if (route.name === 'Notifications') {
            iconComponent = (
              <View style={styles.tabItemContainer}>
                <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                  <MaterialIcons name="notifications" size={26} color={isFocused ? "#FFFFFF" : "rgba(211, 210, 210, 0.6)"} />
                  {badge && (
                    <View style={styles.notificationsBadge}>
                      <Text style={styles.notificationsBadgeValue}>{badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabBarLabel, isFocused ? styles.tabBarLabelActive : styles.tabBarLabelInactive]}>
                  {label}
                </Text>
                {isFocused && <View style={styles.activeIndicator} />}
              </View>
            );
          } else if (route.name === 'Profile') {
            iconComponent = (
              <View style={styles.tabItemContainer}>
                <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                  <View style={styles.profileImage}>
                    <MaterialIcons name="person" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.profileStatus} />
                </View>
                <Text style={[styles.tabBarLabel, isFocused ? styles.tabBarLabelActive : styles.tabBarLabelInactive]}>
                  {label}
                </Text>
                {isFocused && <View style={styles.activeIndicator} />}
              </View>
            );
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, { merge: true });
            }
          };

          return (
            <TouchableOpacity
              key={index}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              {iconComponent}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.homeIndicatorContainer}>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 5,
    width: '100%',
    backgroundColor: '#1C1D23',
    borderTopWidth: 1,
    borderTopColor: 'rgba(44, 45, 53, 0.5)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
    width: 80,
    height: 60,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
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
  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6E69F4',
    position: 'absolute',
    bottom: 0,
  },
  // Tab labels
  tabBarLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  tabBarLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabBarLabelInactive: {
    color: '#8F8F8F',
  },
  // Profile styles
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  // Notification styles
  notificationsBadge: {
    position: 'absolute',
    width: 18,
    height: 18,
    right: 4,
    top: 4,
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
  // Home indicator
  homeIndicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    width: '100%',
    backgroundColor: '#1C1D23',
  },
  homeIndicator: {
    width: 134,
    height: 5,
    backgroundColor: 'rgba(44, 45, 53, 0.8)',
    borderRadius: 100,
  },
});

export default CustomTabBar; 