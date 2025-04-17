import React, { useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  Text,
  PanResponder,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLiveStreams } from '../context/LiveStreamContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Widget size constants
const WIDGET_SIZE = 120;
const PADDING = 16;
const GRID_GAP = 8;
const SAFE_BOTTOM = Platform.OS === 'ios' ? 90 : 70;
const SAFE_TOP = Platform.OS === 'ios' ? 47 : 24;

// Define magnetic position type
interface MagneticPosition {
  x: number;
  y: number;
  pullStrength: number;
}

// Define magnetic positions (edges and corners)
const MAGNET_POSITIONS: MagneticPosition[] = [
  { x: 20, y: SAFE_TOP + 20, pullStrength: 0.8 },                           // Top Left
  { x: screenWidth - WIDGET_SIZE - 20, y: SAFE_TOP + 20, pullStrength: 0.8 }, // Top Right
  { x: 20, y: Math.floor(screenHeight/2 - WIDGET_SIZE/2), pullStrength: 0.8 }, // Middle Left
  { x: screenWidth - WIDGET_SIZE - 20, y: Math.floor(screenHeight/2 - WIDGET_SIZE/2), pullStrength: 0.8 }, // Middle Right
  { x: 20, y: screenHeight - SAFE_BOTTOM - WIDGET_SIZE - 20, pullStrength: 0.8 }, // Bottom Left
  { x: screenWidth - WIDGET_SIZE - 20, y: screenHeight - SAFE_BOTTOM - WIDGET_SIZE - 20, pullStrength: 1.0 } // Bottom Right (strongest)
];

// Default position at bottom right
const DEFAULT_POSITION = MAGNET_POSITIONS[5];

interface MinimizedLiveWidgetProps {
  onPress: () => void;
}

const MinimizedLiveWidget: React.FC<MinimizedLiveWidgetProps> = ({ onPress }) => {
  const { currentlyWatching, getStreamById } = useLiveStreams();
  
  // Get the current stream
  const stream = currentlyWatching ? getStreamById(currentlyWatching) : null;
  
  // Get hosts from stream
  const hosts = stream?.hosts || [];
  const numHosts = Math.min(hosts.length, 4); // Show maximum 4 hosts in small widget
  
  // Refs for tracking position and state
  const widgetRef = useRef<View>(null);
  const isDraggingRef = useRef(false);
  const lastTapRef = useRef(Date.now());
  const positionRef = useRef<MagneticPosition>(DEFAULT_POSITION);
  const initialPositionRef = useRef({ x: 0, y: 0, time: 0 });
  
  // State for visual feedback
  const [isDragging, setIsDragging] = useState(false);
  
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
      x: Math.max(0, Math.min(screenWidth - WIDGET_SIZE, x)),
      y: Math.max(SAFE_TOP, Math.min(screenHeight - SAFE_BOTTOM - WIDGET_SIZE, y))
    };
  };
  
  // Create pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to deliberate drags, not taps
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: (evt) => {
        isDraggingRef.current = true;
        setIsDragging(true);
        
        // Store initial touch position
        initialPositionRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
          time: Date.now()
        };
        
        // Apply visual feedback using setNativeProps
        if (widgetRef.current) {
          widgetRef.current.setNativeProps({
            style: {
              transform: [{ scale: 1.05 }],
              borderColor: 'rgba(255, 255, 255, 0.8)',
              shadowOpacity: 0.6,
              shadowRadius: 15,
              elevation: 20,
            }
          });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!widgetRef.current || !isDraggingRef.current) return;
        
        // Get absolute position from gesture
        const touchX = evt.nativeEvent.pageX;
        const touchY = evt.nativeEvent.pageY;
        
        // Calculate widget position (centered on touch)
        const widgetX = touchX - (WIDGET_SIZE / 2);
        const widgetY = touchY - (WIDGET_SIZE / 2);
        
        // Apply boundary constraints
        const bounded = keepWithinBoundaries(widgetX, widgetY);
        
        // Update widget position directly using setNativeProps
        widgetRef.current.setNativeProps({
          style: {
            left: bounded.x,
            top: bounded.y
          }
        });
        
        // Update position ref - we don't need pullStrength for position tracking
        positionRef.current = {
          ...bounded,
          pullStrength: 1.0 // Default pullStrength
        };
        
        // Update tracking position and time for velocity calculation
        initialPositionRef.current = {
          x: touchX,
          y: touchY,
          time: Date.now()
        };
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!widgetRef.current) return;
        
        isDraggingRef.current = false;
        setIsDragging(false);
        
        // Get final position
        const touchX = evt.nativeEvent.pageX;
        const touchY = evt.nativeEvent.pageY;
        
        // Calculate widget position
        const widgetX = touchX - (WIDGET_SIZE / 2);
        const widgetY = touchY - (WIDGET_SIZE / 2);
        
        // Apply boundary constraints
        const bounded = keepWithinBoundaries(widgetX, widgetY);
        
        // Find the best magnetic position based on position and velocity
        const targetPosition = getBestMagnetPosition(
          bounded.x, 
          bounded.y, 
          gestureState.vx, 
          gestureState.vy
        );
        
        // Reset visual feedback
        widgetRef.current.setNativeProps({
          style: {
            transform: [{ scale: 1.0 }],
            borderColor: 'rgba(255, 255, 255, 0.3)',
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 12,
          }
        });
        
        // Animate to the target position using requestAnimationFrame
        const startTime = Date.now();
        const duration = 300;
        
        const animateToTarget = () => {
          if (!widgetRef.current) return;
          
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Ease out cubic function: 1 - (1 - progress)^3
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          
          // Calculate intermediate position
          const x = bounded.x + (targetPosition.x - bounded.x) * easedProgress;
          const y = bounded.y + (targetPosition.y - bounded.y) * easedProgress;
          
          // Update widget position
          widgetRef.current.setNativeProps({
            style: { left: x, top: y }
          });
          
          if (progress < 1) {
            requestAnimationFrame(animateToTarget);
          } else {
            // Final position update
            widgetRef.current.setNativeProps({
              style: {
                left: targetPosition.x,
                top: targetPosition.y
              }
            });
            
            // Update position ref
            positionRef.current = targetPosition;
          }
        };
        
        // Start animation
        requestAnimationFrame(animateToTarget);
        
        // Handle tap detection for maximizing
        const now = Date.now();
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          if (now - lastTapRef.current < 300) {
            // Double tap - maximize
            onPress();
          }
          lastTapRef.current = now;
        }
      }
    })
  ).current;
  
  // Calculate layout for hosts grid
  let columns = 1;
  let rows = 1;
  
  if (numHosts <= 1) {
    columns = rows = 1;
  } else if (numHosts <= 4) {
    columns = rows = 2;
  }
  
  // Calculate item size
  const availableSpace = WIDGET_SIZE - (PADDING * 2) - ((columns - 1) * GRID_GAP);
  const itemSize = Math.floor(availableSpace / columns);
  
  // If no current stream or hosts, don't render
  if (!stream || hosts.length === 0) {
    return null;
  }
  
  return (
    <View 
      ref={widgetRef}
      style={[
        styles.container,
        {
          left: DEFAULT_POSITION.x, 
          top: DEFAULT_POSITION.y
        }
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity 
        style={styles.widgetContent}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.hostGridContainer}>
          {hosts.slice(0, 4).map((host, index) => (
            <View 
              key={index}
              style={[
                styles.hostGridItem, 
                { 
                  width: itemSize, 
                  height: itemSize
                }
              ]}
            >
              <Image 
                source={{ uri: host.avatar }} 
                style={styles.hostImage}
                resizeMode="cover" 
              />
            </View>
          ))}
        </View>
        
        <View style={styles.liveIndicator}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        
        {/* Drag handle indicator */}
        <View style={styles.dragHandle}>
          <MaterialIcons name="drag-indicator" size={20} color="rgba(255,255,255,0.7)" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: WIDGET_SIZE,
    height: WIDGET_SIZE,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 27, 34, 0.98)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 1000,
  },
  widgetContent: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  hostGridContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignContent: 'space-between',
    padding: PADDING,
  },
  hostGridItem: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  hostImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#E63946',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dragHandle: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 2,
  },
});

export default MinimizedLiveWidget; 