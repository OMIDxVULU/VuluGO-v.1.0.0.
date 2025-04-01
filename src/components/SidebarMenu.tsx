import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, PanResponder } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { IconButton, Text } from 'react-native-paper';
// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/MainNavigator';
// Import custom icon components
import MessagesIcon from './icons/MessagesIcon';
import LiveIcon from './icons/LiveIcon';
import MusicIcon from './icons/MusicIcon';
import RanksIcon from './icons/RanksIcon';
import MiningIcon from './icons/MiningIcon';
import ShopIcon from './icons/ShopIcon';

interface SidebarMenuProps {
  onMenuStateChange?: (expanded: boolean) => void;
}

// Define constants for positioning
const { width, height } = Dimensions.get('window');
const SAFE_TOP = 61; // Height of the header/status bar area
const SAFE_BOTTOM = 91; // Height of the tab bar
const BUTTON_SIZE = 50; // Button width/height

// Define six magnetic positions
const MAGNET_POSITIONS = [
  { x: 10, y: SAFE_TOP + 16 },                           // Top Left
  { x: width - BUTTON_SIZE - 10, y: SAFE_TOP + 16 },     // Top Right
  { x: 10, y: Math.floor(height/2 - BUTTON_SIZE/2) },    // Middle Left
  { x: width - BUTTON_SIZE - 10, y: Math.floor(height/2 - BUTTON_SIZE/2) }, // Middle Right
  { x: 10, y: height - SAFE_BOTTOM - BUTTON_SIZE - 10 }, // Bottom Left
  { x: width - BUTTON_SIZE - 10, y: height - SAFE_BOTTOM - BUTTON_SIZE - 10 } // Bottom Right
];

// Create a global context to store the menu button position and expanded state
interface MenuPositionContextType {
  position: {x: number, y: number};
  updatePosition: (position: {x: number, y: number}) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const MenuPositionContext = createContext<MenuPositionContextType>({
  position: MAGNET_POSITIONS[3], // Default to Middle Right
  updatePosition: () => {},
  isExpanded: true,
  setIsExpanded: () => {},
});

// Global provider component that should wrap the entire app
export const MenuPositionProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [position, setPosition] = useState(MAGNET_POSITIONS[3]);
  const [isExpanded, setIsExpanded] = useState(true);
  
  useEffect(() => {
    // Load saved position and state on initial render
    const loadSavedData = async () => {
      try {
        const savedPosition = await AsyncStorage.getItem('menuButtonPosition');
        if (savedPosition) {
          setPosition(JSON.parse(savedPosition));
        }
        
        const savedExpandedState = await AsyncStorage.getItem('menuExpandedState');
        if (savedExpandedState) {
          setIsExpanded(JSON.parse(savedExpandedState));
        }
      } catch (error: unknown) {
        console.log('Error loading menu data:', error);
      }
    };
    
    loadSavedData();
  }, []);
  
  const updatePosition = (newPosition: {x: number, y: number}) => {
    setPosition(newPosition);
    // Save to AsyncStorage
    AsyncStorage.setItem('menuButtonPosition', JSON.stringify(newPosition))
      .catch((error: unknown) => console.log('Error saving menu position:', error));
  };
  
  const updateExpandedState = (expanded: boolean) => {
    setIsExpanded(expanded);
    // Save to AsyncStorage
    AsyncStorage.setItem('menuExpandedState', JSON.stringify(expanded))
      .catch((error: unknown) => console.log('Error saving menu expanded state:', error));
  };
  
  return (
    <MenuPositionContext.Provider value={{ 
      position, 
      updatePosition, 
      isExpanded, 
      setIsExpanded: updateExpandedState 
    }}>
      {children}
    </MenuPositionContext.Provider>
  );
};

// Hook to access the menu position context
export const useMenuPosition = () => useContext(MenuPositionContext);

const SidebarMenu: React.FC<SidebarMenuProps> = ({ onMenuStateChange }) => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Get both position and expanded state from context
  const menuPositionContext = useContext(MenuPositionContext);
  
  // Button position from context
  const buttonPosition = menuPositionContext ? menuPositionContext.position : MAGNET_POSITIONS[3];
  const setButtonPosition = menuPositionContext ? menuPositionContext.updatePosition : 
    (pos: {x: number, y: number}) => {
      AsyncStorage.setItem('menuButtonPosition', JSON.stringify(pos))
        .catch((error: unknown) => console.log('Error saving menu position:', error));
    };
  
  // Menu expanded state from context
  const isExpanded = menuPositionContext ? menuPositionContext.isExpanded : true;
  const setIsExpanded = menuPositionContext ? menuPositionContext.setIsExpanded :
    (expanded: boolean) => {
      AsyncStorage.setItem('menuExpandedState', JSON.stringify(expanded))
        .catch((error: unknown) => console.log('Error saving menu expanded state:', error));
    };
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(isExpanded ? 65 : 0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  const [isDragging, setIsDragging] = useState(false);
  
  // References for drag calculations
  const touchOffset = useRef({ x: 0, y: 0 });
  
  // Menu items with custom icon components
  const menuItems = [
    { 
      id: '1', 
      name: 'Messages', 
      route: 'directmessages', 
      badge: '5',
      description: 'Chat with friends',
      icon: (color: string, active: boolean) => <MessagesIcon color={color} size={24} active={active} />
    },
    { 
      id: '2', 
      name: 'Live', 
      route: 'live', 
      badge: '3',
      description: 'Watch livestreams',
      icon: (color: string, active: boolean) => <LiveIcon color={color} size={24} active={active} />
    },
    { 
      id: '3', 
      name: 'Music', 
      route: 'music',
      description: 'Listen to music',
      icon: (color: string, active: boolean) => <MusicIcon color={color} size={24} active={active} />
    },
    { 
      id: '4', 
      name: 'Ranks', 
      route: 'leaderboard',
      description: 'View leaderboard',
      icon: (color: string, active: boolean) => <RanksIcon color={color} size={24} active={active} />
    },
    { 
      id: '5', 
      name: 'Mining', 
      route: 'mining',
      description: 'Mine gold',
      icon: (color: string, active: boolean) => <MiningIcon color={color} size={24} active={active} />
    },
    { 
      id: '6', 
      name: 'Shop', 
      route: 'shop',
      description: 'Buy items',
      icon: (color: string, active: boolean) => <ShopIcon color={color} size={24} active={active} />
    }
  ];
  
  // Get total notifications
  const getTotalNotifications = () => {
    return menuItems.reduce((total, item) => {
      return total + (item.badge ? parseInt(item.badge) : 0);
    }, 0);
  };
  
  const totalNotifications = getTotalNotifications();

  // Check which menu item is active based on current route
  const getActiveIndex = () => {
    if (!pathname) return -1;
    
    const routeName = pathname.split('/').pop();
    const index = menuItems.findIndex(item => item.route === routeName);
    return index;
  };

  const activeIndex = getActiveIndex();

  // Find the closest magnet position
  const getClosestMagnetPosition = (x: number, y: number) => {
    let closestPosition = MAGNET_POSITIONS[0];
    let minDistance = Number.MAX_VALUE;
    
    MAGNET_POSITIONS.forEach(position => {
      const distance = Math.sqrt(
        Math.pow(position.x - x, 2) + 
        Math.pow(position.y - y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPosition = position;
      }
    });
    
    return closestPosition;
  };
  
  // Keep position within screen boundaries
  const keepWithinBoundaries = (x: number, y: number) => {
    return {
      x: Math.max(0, Math.min(width - BUTTON_SIZE, x)),
      y: Math.max(SAFE_TOP, Math.min(height - SAFE_BOTTOM - BUTTON_SIZE, y))
    };
  };

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: (evt) => {
        // Store where in the button the user touched
        touchOffset.current = {
          x: evt.nativeEvent.locationX || 0,
          y: evt.nativeEvent.locationY || 0
        };
        
        // Scale up the button for visual feedback
        Animated.spring(buttonScale, {
          toValue: 1.15,
          useNativeDriver: true,
          friction: 7
        }).start();
        
        setIsDragging(true);
      },
      
      onPanResponderMove: (evt) => {
        // Calculate position so the touch point remains under the finger
        const newX = evt.nativeEvent.pageX - touchOffset.current.x;
        const newY = evt.nativeEvent.pageY - touchOffset.current.y;
        
        // Apply boundary constraints
        const boundedPosition = keepWithinBoundaries(newX, newY);
        
        // Update button position immediately through context
        setButtonPosition(boundedPosition);
      },
      
      onPanResponderRelease: (evt) => {
        // Get the final position
        const finalX = evt.nativeEvent.pageX - touchOffset.current.x;
        const finalY = evt.nativeEvent.pageY - touchOffset.current.y;
        
        // Apply boundary constraints
        const boundedPosition = keepWithinBoundaries(finalX, finalY);
        
        // Find the closest magnetic position
        const closestPosition = getClosestMagnetPosition(
          boundedPosition.x, 
          boundedPosition.y
        );
        
        // Scale down the button for visual feedback
        Animated.spring(buttonScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5
        }).start();
        
        // Update button position to snap to closest position through context
        setButtonPosition(closestPosition);
        
        setIsDragging(false);
      }
    })
  ).current;

  // Animate sidebar width when isExpanded changes
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isExpanded ? 65 : 0,
      duration: 300,
      useNativeDriver: false, // For width animation
      easing: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    }).start();
    
    // Animate button scale for visual feedback
    Animated.spring(buttonScale, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: true,
      friction: 5,
      tension: 40
    }).start();
    
    // Notify parent if callback exists
    if (onMenuStateChange) {
      onMenuStateChange(isExpanded);
    }
  }, [isExpanded, slideAnim, buttonScale, onMenuStateChange]);

  // Handle expand/collapse toggle
  const toggleExpand = () => {
    if (isDragging) return; // Don't toggle during drag
    
    const newState = !isExpanded;
    setIsExpanded(newState);
  };

  return (
    <View style={styles.sidebarContainer}>
      {/* Sidebar menu */}
      <View style={styles.sidebarWrapper}>
        <Animated.View style={[styles.sidebar, { width: slideAnim }]}>
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
              {menuItems.map((item, index) => {
                const isActive = activeIndex === index;
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.sidebarIcon,
                      isActive && styles.sidebarIconActive
                    ]}
                    onPress={() => {
                      router.push(`/(main)/${item.route}` as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.iconContainer,
                      isActive && styles.iconContainerActive
                    ]}>
                      {item.icon(
                        isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)",
                        isActive
                      )}
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeValue}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    {isActive && (
                      <View style={styles.sidebarItemIndicator} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
      
      {/* Draggable toggle button (only visible when menu is collapsed) */}
      {!isExpanded && (
        <Animated.View
          style={[
            styles.floatingToggleContainer,
            {
              left: buttonPosition.x,
              top: buttonPosition.y,
              transform: [{ scale: buttonScale }]
            }
          ]}
          {...panResponder.panHandlers}
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
    width: '100%', // Full width
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
    marginBottom: 8,
    alignItems: 'center',
  },
  sidebarIconActive: {
    // Active styles are now on the icon container
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
});

export default SidebarMenu; 