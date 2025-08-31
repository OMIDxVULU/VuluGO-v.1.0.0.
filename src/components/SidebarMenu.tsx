import React, { useState, useEffect, useRef, createContext, useContext, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, PanResponder, Easing, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { ChatIcon, MusicIcon, GoldMinerIcon, SlotsIcon, LeaderboardIcon, ShopIcon } from './icons/SidebarIcons';
import { useAuth } from '../context/AuthContext';
import { FirebaseErrorHandler } from '../utils/firebaseErrorHandler';

interface SidebarMenuProps {
  onMenuStateChange?: (expanded: boolean) => void;
}

// Define constants for positioning
const { width, height } = Dimensions.get('window');
const SAFE_TOP = 61; // Height of the header/status bar area
const SAFE_BOTTOM = 91; // Height of the tab bar
const expandedWidth = 70; // Smaller width of expanded sidebar
const collapsedWidth = 0; // Width of collapsed sidebar
const BUTTON_SIZE = 50; // Button width/height

// Define six magnetic positions with different pull strengths
const MAGNET_POSITIONS = [
  { x: 10, y: SAFE_TOP + 16, pullStrength: 0.8 },                           // Top Left
  { x: width - BUTTON_SIZE - 10, y: SAFE_TOP + 16, pullStrength: 0.8 },     // Top Right
  { x: 10, y: Math.floor(height/2 - BUTTON_SIZE/2), pullStrength: 0.8 },    // Middle Left
  { x: width - BUTTON_SIZE - 10, y: Math.floor(height/2 - BUTTON_SIZE/2), pullStrength: 1.0 }, // Middle Right (stronger)
  { x: 10, y: height - SAFE_BOTTOM - BUTTON_SIZE - 10, pullStrength: 0.8 }, // Bottom Left
  { x: width - BUTTON_SIZE - 10, y: height - SAFE_BOTTOM - BUTTON_SIZE - 10, pullStrength: 0.8 } // Bottom Right
];

// Create a global context to store the menu button position and expanded state
interface MenuPositionContextType {
  position: {x: number, y: number};
  updatePosition: (position: {x: number, y: number}) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const DEFAULT_POSITION = MAGNET_POSITIONS[3]; // Middle right is the default

const MenuPositionContext = createContext<MenuPositionContextType | null>(null);

// Global provider component that should wrap the entire app
export const MenuPositionProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Use in-memory state only - no AsyncStorage
  const [position, setPosition] = useState<{x: number, y: number}>(DEFAULT_POSITION);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Simple provider with direct state updates
  return (
    <MenuPositionContext.Provider 
      value={{
        position,
        updatePosition: setPosition,
        isExpanded,
        setIsExpanded
      }}
    >
      {children}
    </MenuPositionContext.Provider>
  );
};

export const useMenuPosition = () => useContext(MenuPositionContext);

const SidebarMenu: React.FC<SidebarMenuProps> = ({ onMenuStateChange }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  
  // Get both position and expanded state from context
  const menuPositionContext = useContext(MenuPositionContext);
  
  // Use simple refs instead of state
  const isExpandedRef = useRef(menuPositionContext?.isExpanded || false);
  
  // Add state for button styling (React Native Web compatible)
  const [buttonStyle, setButtonStyle] = useState({ scale: 1.0 });
  const [buttonPosition, setButtonPosition] = useState(menuPositionContext?.position || DEFAULT_POSITION);
  
  // References
  const slideAnim = useRef(new Animated.Value(0)).current;
  const buttonRef = useRef<View>(null);
  const isDraggingRef = useRef(false);
  
  // Create a ref to store initial position for drag with time information
  const initialPositionRef = useRef<{ x: number; y: number; time?: number }>({ x: 0, y: 0 });
  
  // Set isExpanded from context on mount
  useEffect(() => {
    if (menuPositionContext) {
      isExpandedRef.current = menuPositionContext.isExpanded;
      slideAnim.setValue(menuPositionContext.isExpanded ? 65 : 0);
      setButtonPosition(menuPositionContext.position);
    }
  }, []);

  // Sync button position with context changes
  useEffect(() => {
    if (menuPositionContext?.position) {
      setButtonPosition(menuPositionContext.position);
    }
  }, [menuPositionContext?.position]);
  
  // Define menu items first
  const menuItems = [
    {
      id: 'chat',
      route: 'directmessages',
      icon: (color: string, isActive: boolean) => <ChatIcon color={color} active={isActive} />,
      label: 'Messages',
      // Remove hardcoded badge - use real unread message count if needed
    },
    {
      id: 'music',
      route: 'music',
      icon: (color: string, isActive: boolean) => <MusicIcon color={color} active={isActive} />,
      label: 'Music',
    },
    {
      id: 'goldminer',
      route: 'goldminer',
      icon: (color: string, isActive: boolean) => <GoldMinerIcon color={color} active={isActive} />,
      label: 'Gold Miner',
    },
    {
      id: 'slots',
      route: 'slots',
      icon: (color: string, isActive: boolean) => <SlotsIcon color={color} active={isActive} />,
      label: 'Slots',
    },
    {
      id: 'leaderboard',
      route: 'leaderboard',
      icon: (color: string, isActive: boolean) => <LeaderboardIcon color={color} active={isActive} />,
      label: 'Leaderboard',
    },
    {
      id: 'shop',
      route: 'shop',
      icon: (color: string, isActive: boolean) => <ShopIcon color={color} active={isActive} />,
      label: 'Shop',
      // Remove hardcoded badge - use real shop notification count if needed
    },
  ];

  // Get active index based on current route
  const getActiveIndex = () => {
    if (!pathname) return -1; // Return -1 when no pathname to avoid highlighting any item

    const index = menuItems.findIndex(item => {
      return pathname.includes(item.route);
    });

    // For guest users, don't highlight the Messages button even if on directmessages route
    if (index >= 0 && menuItems[index].route === 'directmessages' && FirebaseErrorHandler.isGuestUser(currentUser)) {
      return -1; // Don't highlight Messages for guest users
    }

    return index >= 0 ? index : -1; // Return -1 instead of 0 when no match found
  };

  // Determine active menu item based on current route - initialize with proper detection
  const [activeIndex, setActiveIndex] = useState(() => getActiveIndex());

  // Calculate total notifications with useMemo instead of state + useEffect
  // Removed dummy badge counts - now using real notification data
  const totalNotifications = useMemo(() => {
    // TODO: Connect to real notification counts for menu items
    return 0;
  }, []);

  // Set active index based on current route
  useEffect(() => {
    const index = getActiveIndex();
    setActiveIndex(index);
  }, [pathname]);
  
  // Find the best magnetic position based on position, velocity and direction
  const getBestMagnetPosition = (x: number, y: number, vx: number, vy: number) => {
    // If velocity is high enough, prefer the magnet in the direction of movement
    const velocity = Math.sqrt(vx * vx + vy * vy);
    const isThrow = velocity > 0.5; // Consider it a "throw" if velocity is above threshold
    
    let bestPosition = MAGNET_POSITIONS[0];
    let minScore = Number.MAX_VALUE;
    
    MAGNET_POSITIONS.forEach(position => {
      // Calculate distance score
      const distance = Math.sqrt(
        Math.pow(position.x - x, 2) + 
        Math.pow(position.y - y, 2)
      );
      
      // Base score is distance
      let score = distance / position.pullStrength;
      
      if (isThrow) {
        // For throws, factor in direction
        // Calculate the dot product to determine if we're moving toward this position
        // (simplified - just check if we're moving in the general direction)
        const dirX = position.x - x;
        const dirY = position.y - y;
        const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
        
        // Normalize direction vector
        const normDirX = dirX / dirLength;
        const normDirY = dirY / dirLength;
        
        // Normalize velocity vector
        const normVx = vx / velocity;
        const normVy = vy / velocity;
        
        // Dot product tells us how aligned the vectors are (-1 to 1)
        // 1 means perfectly aligned, -1 means opposite directions
        const dotProduct = (normDirX * normVx) + (normDirY * normVy);
        
        // Adjust score based on direction alignment
        // If we're moving toward this magnet, reduce score (make it more attractive)
        // If we're moving away, increase score (make it less attractive)
        score = score * (1.0 - dotProduct);
      }
      
      if (score < minScore) {
        minScore = score;
        bestPosition = position;
      }
    });
    
    return bestPosition;
  };
  
  // Keep position within screen boundaries
  const keepWithinBoundaries = (x: number, y: number) => {
    return {
      x: Math.max(0, Math.min(width - BUTTON_SIZE, x)),
      y: Math.max(SAFE_TOP, Math.min(height - SAFE_BOTTOM - BUTTON_SIZE, y))
    };
  };

  // Pan responder for dragging the button
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      // Store initial position and time when drag starts
      onPanResponderGrant: (evt, gestureState) => {
        isDraggingRef.current = true;
        
        // Track last positions and times for velocity calculation
        initialPositionRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
          time: Date.now()
        };
        
        // Scale up the button for visual feedback
        setButtonStyle({ scale: 1.1 });
      },
      
      onPanResponderMove: (evt, gestureState) => {
        if (!buttonRef.current) return;
        
        // Get absolute position from gesture
        const touchX = evt.nativeEvent.pageX;
        const touchY = evt.nativeEvent.pageY;
        
        // Calculate button position (centered on touch)
        const buttonX = touchX - (BUTTON_SIZE / 2);
        const buttonY = touchY - (BUTTON_SIZE / 2);
        
        // Apply boundary constraints
        const bounded = keepWithinBoundaries(buttonX, buttonY);
        
        // Update button position - follow finger exactly during drag
        setButtonPosition(bounded);
        
        // Update position and time for velocity calculation
        initialPositionRef.current = {
          x: touchX,
          y: touchY,
          time: Date.now()
        };
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        if (!buttonRef.current) return;
        
        // Get final touch position
        const touchX = evt.nativeEvent.pageX;
        const touchY = evt.nativeEvent.pageY;
        
        // Calculate button position (centered on touch)
        const buttonX = touchX - (BUTTON_SIZE / 2);
        const buttonY = touchY - (BUTTON_SIZE / 2);
        
        // Apply boundary constraints
        const bounded = keepWithinBoundaries(buttonX, buttonY);
        
        // Calculate velocity for throw physics
        // We'll use gestureState.vx and gestureState.vy which are in points/ms
        
        // Find the best magnetic position based on position, velocity and direction
        const targetPosition = getBestMagnetPosition(
          bounded.x, 
          bounded.y, 
          gestureState.vx, 
          gestureState.vy
        );
        
        // Scale back down
        setButtonStyle({ scale: 1.0 });
        
        // Animate to the target position
        let startTime = Date.now();
        const duration = 300;
        
        const animateToTarget = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Ease out cubic function: 1 - (1 - progress)^3
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          
          // Calculate intermediate position
          const x = bounded.x + (targetPosition.x - bounded.x) * easedProgress;
          const y = bounded.y + (targetPosition.y - bounded.y) * easedProgress;
          
          // Update button position
          setButtonPosition({ x, y });
          
          if (progress < 1) {
            requestAnimationFrame(animateToTarget);
          } else {
            // Final position update
            setButtonPosition(targetPosition);
            
            // Update context with final position
            if (menuPositionContext) {
              menuPositionContext.updatePosition(targetPosition);
            }
            
            isDraggingRef.current = false;
          }
        };
        
        // Start animation
        requestAnimationFrame(animateToTarget);
      }
    })
  ).current;

  // Toggle expand/collapse
  const toggleExpand = () => {
    if (isDraggingRef.current || !menuPositionContext) return;
    
    const newIsExpanded = !isExpandedRef.current;
    isExpandedRef.current = newIsExpanded;
    
    // Update context
    menuPositionContext.setIsExpanded(newIsExpanded);
    
    // Animate sidebar width
    Animated.timing(slideAnim, {
      toValue: newIsExpanded ? 65 : 0,
      duration: 300,
      useNativeDriver: false,
      easing: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    }).start();
    
    // Notify parent if callback exists
    if (onMenuStateChange) {
      onMenuStateChange(newIsExpanded);
    }
  };
  
  // When context isExpanded changes
  useEffect(() => {
    if (menuPositionContext) {
      // Only update the ref and animate if the value has actually changed
      if (isExpandedRef.current !== menuPositionContext.isExpanded) {
        isExpandedRef.current = menuPositionContext.isExpanded;
        
        // Animate sidebar width
        Animated.timing(slideAnim, {
          toValue: menuPositionContext.isExpanded ? 65 : 0,
          duration: 300,
          useNativeDriver: false,
          easing: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
        }).start();
        
        // Notify parent if callback exists
        if (onMenuStateChange) {
          onMenuStateChange(menuPositionContext.isExpanded);
        }
      }
    }
  }, [menuPositionContext?.isExpanded, onMenuStateChange]);

  // Get current expanded state
  const isExpanded = menuPositionContext?.isExpanded || false;

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
                      {/* Removed hardcoded badges - use real notification data if needed */}
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
        <View
          ref={buttonRef}
          style={[
            styles.floatingToggleContainer,
            {
              left: buttonPosition.x,
              top: buttonPosition.y,
              transform: [{ scale: buttonStyle.scale }]
            }
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            onPress={!isDraggingRef.current ? toggleExpand : undefined}
            activeOpacity={0.7}
            style={styles.floatingButtonTouchable}
          >
            <View style={styles.iconButtonWrapper}>
              <IconButton
                icon="chevron-right"
                iconColor="white"
                size={24}
                style={styles.toggleButton}
                mode="contained"
                containerColor="#6E69F4"
              />
            </View>
            {totalNotifications > 0 && (
              <View style={styles.toggleNotificationBadge}>
                <Text style={styles.toggleNotificationText}>{totalNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Calculate height for the menu to avoid overlapping with the navigation bar
const TAB_BAR_HEIGHT = SAFE_BOTTOM; // Match the height of our custom tab bar
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
    // Position in the middle of the screen vertically
    top: Math.floor(height/2 - 240), // Centered vertically with more space for buttons
    // Auto-fit height based on content instead of full screen
    height: 'auto', // Will be sized based on content
    maxHeight: 480, // Increased maximum height for the menu to fit all buttons
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
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 8, // Reduced vertical spacing between items to fit more items
  },
  sidebarIcon: {
    width: 40, // Smaller width
    height: 40, // Smaller height
    position: 'relative',
    marginBottom: 6, // Reduced margin
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
    width: 40, // Smaller width
    height: 40, // Smaller height
    backgroundColor: '#2C2D35',
    borderRadius: 14,
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
    width: 3, // Thinner indicator
    height: 40, // Match the new icon height
    left: -6, // Adjusted position
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
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
    padding: 0,
  },
  iconButtonWrapper: {
    borderRadius: 16,
    overflow: 'visible',
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