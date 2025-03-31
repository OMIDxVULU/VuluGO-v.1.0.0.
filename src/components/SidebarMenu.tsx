import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, PanResponder, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { IconButton, Text } from 'react-native-paper';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SidebarMenuProps {
  onMenuStateChange?: (expanded: boolean) => void;
}

// Define magnet positions
const { width, height } = Dimensions.get('window');
const MAGNET_POSITIONS = [
  { x: 10, y: 77 },             // Top Left
  { x: 10, y: height - 150 },   // Bottom Left
  { x: width - 60, y: 77 },     // Top Right
  { x: width - 60, y: height - 150 } // Bottom Right
];

const BUTTON_SIZE = 50; // Button width/height for more precise dragging

const SidebarMenu: React.FC<SidebarMenuProps> = ({ onMenuStateChange }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeIndex, setActiveIndex] = useState(1); // Voice rooms active by default
  const navigation = useNavigation();
  
  // Use separate Animated values for JS and native drivers
  const slideAnim = useRef(new Animated.Value(isExpanded ? 65 : 0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Position state for the floating button - set default to top-left corner
  const [buttonPosition, setButtonPosition] = useState({ x: MAGNET_POSITIONS[0].x, y: MAGNET_POSITIONS[0].y });
  const [isDragging, setIsDragging] = useState(false);
  
  // Track initial touch position for drag calculations
  const initialTouch = useRef({ x: 0, y: 0 });
  const initialButtonPos = useRef({ x: 0, y: 0 });
  
  // Define menu items first before using them
  const menuItems = [
    { id: '1', icon: 'home', name: 'Home', route: 'Home', badge: '3' },
    { id: '2', icon: 'mic', name: 'Voice Rooms', route: 'Notifications', badge: '5' },
    { id: '3', icon: 'library-music', name: 'Music Library', route: 'Profile' },
    { id: '4', icon: 'monetization-on', name: 'Mine Gold', route: 'Home' },
    { id: '5', icon: 'person', name: 'User', route: 'Profile' },
    { id: '6', icon: 'settings', name: 'Settings', route: 'Home' },
  ];
  
  // Get total notification count
  const getTotalNotifications = () => {
    return menuItems.reduce((total, item) => {
      return total + (item.badge ? parseInt(item.badge) : 0);
    }, 0);
  };
  
  const totalNotifications = getTotalNotifications();

  // Find closest magnet position
  const findClosestMagnetPosition = (x: number, y: number) => {
    let closestPosition = MAGNET_POSITIONS[0];
    let minDistance = Number.MAX_VALUE;
    
    MAGNET_POSITIONS.forEach(position => {
      const dx = position.x - x;
      const dy = position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPosition = position;
      }
    });
    
    return closestPosition;
  };

  // Create simple pan responder for reliable dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Record starting point of touch and current button position
        initialTouch.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY
        };
        
        initialButtonPos.current = {
          x: buttonPosition.x,
          y: buttonPosition.y
        };
        
        // Animate button scale up
        Animated.spring(buttonScale, {
          toValue: 1.15,
          useNativeDriver: true,
          friction: 7
        }).start();
        
        setIsDragging(true);
      },
      
      onPanResponderMove: (evt) => {
        // Calculate drag distance from start point
        const dx = evt.nativeEvent.pageX - initialTouch.current.x;
        const dy = evt.nativeEvent.pageY - initialTouch.current.y;
        
        // Move button to new position, based on initial position
        setButtonPosition({
          x: initialButtonPos.current.x + dx,
          y: initialButtonPos.current.y + dy
        });
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        // Calculate the final position directly from gesture state
        const finalX = initialButtonPos.current.x + gestureState.dx;
        const finalY = initialButtonPos.current.y + gestureState.dy;
        
        console.log("Released at:", finalX, finalY);
        console.log("Magnet positions:", MAGNET_POSITIONS);
        
        // Find the closest magnet position using the final position
        const closestPosition = findClosestMagnetPosition(finalX, finalY);
        
        console.log("Closest position:", closestPosition);
        
        // Animate scale back to normal
        Animated.spring(buttonScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5
        }).start();
        
        // Snap to the closest magnet position
        setButtonPosition({
          x: closestPosition.x,
          y: closestPosition.y
        });
        
        setIsDragging(false);
      }
    })
  ).current;

  // Animate the menu when expanded/collapsed
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isExpanded ? 65 : 0,
      duration: 300,
      useNativeDriver: false, // Must be false for width animations
      // Add easing for smoother animation
      easing: (t) => {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      }
    }).start();
  }, [isExpanded, slideAnim]);

  const toggleExpand = () => {
    if (isDragging) return; // Prevent toggle while dragging
    
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (onMenuStateChange) {
      onMenuStateChange(newState);
    }
  };

  const sidebarWidth = slideAnim;
  
  return (
    <View style={styles.sidebarContainer}>
      {/* Sidebar menu */}
      <View style={styles.sidebarWrapper}>
        <Animated.View style={[styles.sidebar, { width: sidebarWidth }]}>
          {/* Toggle button at the top of the menu */}
          <View style={styles.toggleButtonHeader}>
            <IconButton
              icon={isExpanded ? "chevron-left" : "chevron-right"}
              iconColor="white"
              size={24}
              style={styles.toggleButton}
              onPress={toggleExpand}
              mode="contained"
              containerColor="#6E69F4"
            />
          </View>
          
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sidebarContent}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.sidebarIcon,
                    activeIndex === index && styles.sidebarIconActive
                  ]}
                  onPress={() => {
                    setActiveIndex(index);
                    navigation.navigate(item.route as never);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.iconContainer,
                    activeIndex === index && styles.iconContainerActive
                  ]}>
                    <MaterialIcons 
                      name={item.icon as any} 
                      size={24} 
                      color={activeIndex === index ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)"} 
                    />
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeValue}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  {activeIndex === index && (
                    <View style={styles.sidebarItemIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
      
      {/* Draggable toggle button */}
      {!isExpanded && (
        <View
          style={[
            styles.floatingToggleContainer,
            {
              left: buttonPosition.x,
              top: buttonPosition.y
            }
          ]}
        >
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.scaleContainer,
              {
                transform: [{ scale: buttonScale }]
              }
            ]}
          >
            <TouchableOpacity
              onPress={!isDragging ? toggleExpand : undefined}
              activeOpacity={0.7}
              style={styles.floatingButtonTouchable}
            >
              <IconButton
                icon="chevron-right"
                iconColor="white"
                size={24}
                style={styles.toggleButton}
                mode="contained"
                containerColor="#6E69F4"
              />
              {totalNotifications > 0 && !isDragging && (
                <View style={styles.toggleNotificationBadge}>
                  <Text style={styles.toggleNotificationText}>{totalNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

// Calculate height for the menu to avoid overlapping with the navigation bar
const TAB_BAR_HEIGHT = 91; // Match the height of our custom tab bar
const MENU_HEIGHT = height - TAB_BAR_HEIGHT;

const styles = StyleSheet.create({
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0, // Start from the top of the screen
    height: '100%', // Full height
    width: '100%', // Add width to ensure dragability across screen
    zIndex: 10,
    pointerEvents: 'box-none', // Allow interactions with content behind
  },
  sidebarWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    zIndex: 10,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 61, // Leave space for the header
    height: MENU_HEIGHT - 61, // Subtract header height
    backgroundColor: '#1C1D23', // Slightly lighter than the main background
    zIndex: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(44, 45, 53, 0.5)',
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  toggleButtonHeader: {
    width: '100%',
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
    paddingRight: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(44, 45, 53, 0.5)',
    position: 'relative',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  sidebarContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 16,
    gap: 18,
  },
  sidebarIcon: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  sidebarIconActive: {
    // Properties for active state are now on iconContainerActive
  },
  iconContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    backgroundColor: '#2C2D35',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  iconContainerActive: {
    backgroundColor: '#6E69F4',
    elevation: 5,
    shadowColor: '#6E69F4',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  badge: {
    position: 'absolute',
    width: 20,
    height: 20,
    right: -6,
    top: -6,
    backgroundColor: '#F23535',
    borderWidth: 2,
    borderColor: '#1C1D23',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeValue: {
    fontWeight: '600',
    fontSize: 12,
    color: '#FFFFFF',
  },
  sidebarItemIndicator: {
    position: 'absolute',
    width: 4,
    height: 48,
    left: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  floatingToggleContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(20, 20, 28, 0.8)', // Darker background for better visibility
    borderRadius: 16, 
    padding: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 6,
    shadowOpacity: 0.3,
    elevation: 10,
    overflow: 'visible',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 50,
  },
  floatingButtonTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButton: {
    margin: 0,
  },
  toggleNotificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F23535',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  toggleNotificationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  scaleContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SidebarMenu; 