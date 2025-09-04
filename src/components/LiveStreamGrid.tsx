import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, ScrollView, Dimensions, Animated, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLiveStreams, LiveStream } from '../context/LiveStreamContext';
import { useAuth } from '../context/AuthContext';
import { streamingService } from '../services/streamingService';
import { LinearGradient } from 'expo-linear-gradient';
import { StreamErrorBoundary } from './StreamErrorBoundary';
import LiveStreamRefreshButton from './LiveStreamRefreshButton';

const { width } = Dimensions.get('window');

// Fixed padding values - reduced horizontal padding to use more screen space
const HORIZONTAL_PADDING = 8; // Reduced from 12 to get closer to edges
const ITEM_GAP = 10; // Reduced from 12 for tighter spacing
// Calculate width based on available space - wider items
const STREAM_ITEM_WIDTH = (width - (HORIZONTAL_PADDING * 2 + ITEM_GAP)) / 2;
// Height components - adjust sizes
const RANK_SECTION_HEIGHT = 30; // Reduced from 36 
const IMAGE_HEIGHT = 180; // Increased from 160
const INFO_SECTION_HEIGHT = 50; // Increased from 40
// Total stream item height
const STREAM_ITEM_HEIGHT = RANK_SECTION_HEIGHT + IMAGE_HEIGHT + INFO_SECTION_HEIGHT; // Now 260px total

// Create a context for tutorial visibility
const TutorialContext = React.createContext({ 
  showTutorial: true, 
  hideTutorial: () => {} 
});

interface LiveStreamItemProps {
  stream: LiveStream;
  rank: number;
  onPress: (stream: LiveStream) => void;
  isCurrentlyWatching?: boolean;
}

const LiveStreamItem = ({ stream, rank, onPress, isCurrentlyWatching = false }: LiveStreamItemProps) => {
  const [isPressing, setIsPressing] = useState(false);
  const pressAnimation = useRef(new Animated.Value(0)).current;
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Use the tutorial context
  const { showTutorial, hideTutorial } = React.useContext(TutorialContext);

  // Function to handle press start
  const handlePressIn = () => {
    setIsPressing(true);
    // Reset animation value
    pressAnimation.setValue(0);
    
    // Start animation to grow from 0 to 1 over 150ms (quick feedback)
    Animated.timing(pressAnimation, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();

    // Hide tutorial after first interaction
    hideTutorial();
  };
  
  // Function to handle press cancel
  const handlePressOut = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setIsPressing(false);
    // Stop the animation by resetting
    pressAnimation.setValue(0);
  };
  
  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }
    };
  }, []);

  // Function to get the rank text
  const getRankText = (rank: number) => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  };

  // Function to get rank badge color
  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return styles.firstRank;
    if (rank === 2) return styles.secondRank;
    if (rank === 3) return styles.thirdRank;
    return styles.defaultRank;
  };

  // Check if stream is boosted
  const isBoosted = (stream.boost || 0) > 0;

  // Render hosts grid based on number of hosts
  const renderHostsGrid = () => {
    const hostCount = stream.hosts.length;
    
    // Single host
    if (hostCount === 1) {
      return (
        <View style={styles.singleHostContainer}>
          <Image 
            source={{ uri: stream.hosts[0].avatar }} 
            style={styles.singleHostImage}
            resizeMode="cover"
          />
        </View>
      );
    }
    
    // Two hosts side by side
    if (hostCount === 2) {
      return (
        <View style={styles.dualHostContainer}>
          {stream.hosts.map((host, index) => (
            <View key={`host-${stream.id}-${index}`} style={styles.dualHostItem}>
              <Image 
                source={{ uri: host.avatar }}
                style={styles.hostImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>
      );
    }
    
    // Four hosts in a 2x2 grid
    if (hostCount >= 3 && hostCount <= 4) {
      return (
        <View style={styles.quadHostContainer}>
          {stream.hosts.slice(0, 4).map((host, index) => (
            <View key={`host-${stream.id}-${index}`} style={styles.quadHostItem}>
              <Image 
                source={{ uri: host.avatar }}
                style={styles.hostImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>
      );
    }
    
    // More hosts in a grid
    return (
      <View style={styles.multiHostContainer}>
        {stream.hosts.slice(0, 6).map((host, index) => (
          <View 
            key={`host-${stream.id}-${index}`}
            style={[
              styles.multiHostItem,
              hostCount > 4 ? styles.sixHostItem : styles.quadHostItem
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
    );
  };

  // Format view counts (e.g., 1200 -> 1.2k)
  const formatViewCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace('.0', '')}k`;
    }
    return count.toString();
  };

  return (
    <TouchableOpacity
      style={[
        styles.streamItem,
        isCurrentlyWatching && styles.currentlyWatchingItem
      ]}
      onPress={() => onPress(stream)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
    >
      {/* Rank Section - Above pictures */}
      <View style={styles.rankSection}>
        {isBoosted ? (
          // Combined boost and rank badge for boosted streams
          <View style={[styles.combinedBadge, getRankBadgeStyle(rank)]}>
            <MaterialIcons name="auto-awesome" size={14} color="#FFF" />
            <View style={styles.badgeDivider} />
            <Text style={styles.rankText}>{getRankText(rank)}</Text>
          </View>
        ) : (
          // Regular rank badge for non-boosted streams
          <View style={[styles.rankBadge, getRankBadgeStyle(rank)]}>
            <Text style={styles.rankText}>{getRankText(rank)}</Text>
          </View>
        )}

        {/* Currently Watching Indicator */}
        {isCurrentlyWatching && (
          <View style={styles.watchingIndicator}>
            <MaterialIcons name="visibility" size={16} color="#5865F2" />
            <Text style={styles.watchingText}>WATCHING</Text>
          </View>
        )}
        
        {/* Viewer count bubble */}
        <View style={styles.viewerBubble}>
          <Ionicons name="eye-outline" size={12} color="#FFFFFF" />
          <Text style={styles.viewerBubbleText}>
            {formatViewCount(stream.views)}
          </Text>
        </View>
      </View>
      
      {/* Profile Pictures Section */}
      <View style={styles.profileContainer}>
        {/* Host grid */}
        <View style={styles.hostGrid}>
          {renderHostsGrid()}
        </View>
      </View>
      
      {/* Information Frame - separate from the images */}
      <View style={styles.infoFrame}>
        {/* Stream title */}
        <Text
          style={styles.streamTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {(stream.title && stream.title.trim()) ? stream.title.trim() : 'Live Stream'}
        </Text>
      </View>
      
      {/* Press indicator overlay */}
      {isPressing && (
        <View style={styles.pressIndicatorContainer}>
          <Animated.View 
            style={[
              styles.pressIndicator,
              {
                width: pressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                })
              }
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Section header component
const SectionHeader = ({ title, count }: { title: string, count?: number }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {count !== undefined && (
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count} streams</Text>
      </View>
    )}
  </View>
);

const LiveStreamGrid = () => {
  const router = useRouter();
  const { streams, currentlyWatching, joinStream, leaveStreamWithConfirmation, hasActiveStream, isOperationInProgress } = useLiveStreams();
  const { user, isGuest } = useAuth();
  
  // Create a global state for controlling the tutorial visibility
  const [showTutorialState, setShowTutorialState] = useState(true);
  
  // Create a function to hide the tutorial
  const hideTutorial = () => {
    setShowTutorialState(false);
  };

  // Handle stream selection with confirmation dialog for stream switching
  const handleStreamPress = async (stream: LiveStream) => {
    // Check if user is a guest
    if (isGuest) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to join live streams.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth') }
        ]
      );
      return;
    }

    // The joinStream function now handles active stream checking and confirmation internally
    try {
      await joinStream(stream.id);
      router.push({
        pathname: '/livestream',
        params: {
          streamId: stream.id,
        }
      });
    } catch (error) {
      console.error('Failed to join stream:', error);
      // Don't show error if user just cancelled the confirmation
      if (error && (error as any).message !== 'User cancelled stream join') {
        Alert.alert('Error', 'Failed to join stream. Please try again.');
      }
    }
  };
  
  // Sort streams: first by boost values (descending), then by view count (descending)
  const sortedStreams = streams
    .filter(stream => stream.isActive)
    .sort((a, b) => {
      // First sort by boost (prioritize boosted streams)
      const boostA = a.boost || 0;
      const boostB = b.boost || 0;
      
      if (boostB !== boostA) {
        return boostB - boostA; // Higher boost first
      }
      
      // Then sort by views
      return b.views - a.views; // Higher views first
    })
    .map((stream, index) => ({ ...stream, rank: index + 1 }));
  
  // Handle "Go Live" button press with complete functionality
  const handleGoLive = async () => {
    try {
      console.log('🎥 Go Live button pressed');

      // 1. FIXED: Proper authentication check - handle guest users appropriately
      if (!user) {
        // No user at all - redirect to authentication
        console.log('❌ No user found, redirecting to sign-in');
        Alert.alert(
          'Sign In Required',
          'You need to sign in to start a live stream.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In',
              onPress: () => {
                console.log('🔄 Redirecting to authentication screen');
                router.push('/auth');
              }
            }
          ]
        );
        return;
      }

      // 2. FIXED: Guest user upgrade flow - offer account upgrade instead of blocking
      if (isGuest) {
        console.log('🎭 Guest user wants to go live - offering account upgrade');
        Alert.alert(
          'Account Required',
          'Guest users can view live streams but need a full account to create them. Choose how you\'d like to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Choose Account Option',
              onPress: () => {
                console.log('🔄 Guest user choosing account option');
                router.push('/auth/selection');
              }
            }
          ]
        );
        return;
      }

      console.log('✅ User authenticated, proceeding to live stream setup');
      console.log('👤 User info:', {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL
      });

      // 2. Validate user data before proceeding to setup
      if (!user.uid) {
        throw new Error('User ID is missing. Please sign in again.');
      }

      // 3. Navigate to live stream setup screen
      console.log('🔄 Navigating to live stream setup screen');
      router.push('/livestream-setup');
      console.log('✅ Navigation to setup screen completed successfully');

    } catch (error: any) {
      console.error('❌ Navigation to setup failed:', error);

      // Enhanced error handling with more specific messages
      let errorMessage = 'An unexpected error occurred while opening the live stream setup.';

      if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(
        'Setup Failed',
        `Could not open live stream setup:\n\n${errorMessage}\n\nPlease try again.`,
        [{ text: 'OK' }]
      );
    }
  };

  // Create button to start new stream
  const StartStreamButton = () => (
    <TouchableOpacity
      style={[styles.startStreamButton, isOperationInProgress && styles.disabledButton]}
      onPress={handleGoLive}
      activeOpacity={isOperationInProgress ? 1 : 0.8}
      disabled={isOperationInProgress}
    >
      <LinearGradient
        colors={isOperationInProgress ? ['#666', '#888'] : ['#6E56F7', '#9056F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.buttonGradient}
      >
        {isOperationInProgress ? (
          <>
            <Ionicons name="hourglass" size={18} color="#FFF" />
            <Text style={styles.startStreamText}>Processing...</Text>
          </>
        ) : (
          <>
            <Ionicons name="add-circle" size={18} color="#FFF" />
            <Text style={styles.startStreamText}>Go Live</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  // Helper function to create rows of streams
  const renderStreamRows = () => {
    const rows = [];
    
    for (let i = 0; i < sortedStreams.length; i += 2) {
      const rowStreams = sortedStreams.slice(i, i + 2);
      
      rows.push(
        <View key={`row-${i}`} style={styles.row}>
          {rowStreams.map((stream, index) => (
            <View 
              key={stream.id} 
              style={[
                styles.itemContainer,
                index === 0 && styles.firstItemInRow
              ]}
            >
              <LiveStreamItem
                stream={stream}
                rank={stream.rank}
                onPress={handleStreamPress}
                isCurrentlyWatching={currentlyWatching === stream.id}
              />
            </View>
          ))}
          {/* Add placeholder for odd number of streams */}
          {rowStreams.length === 1 && <View style={styles.itemContainer} />}
        </View>
      );
    }
    
    return rows;
  };

  return (
    <TutorialContext.Provider value={{ showTutorial: showTutorialState, hideTutorial }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <SectionHeader title="Lives" count={sortedStreams.length} />
          <View style={styles.headerActions}>
            <StartStreamButton />
          </View>
        </View>
        
        {/* Global tutorial bubble - positioned at a fixed place in the UI */}
        {showTutorialState && sortedStreams.length > 0 && (
          <View style={styles.globalTutorialContainer}>
            <View style={styles.tutorialBubble}>
              <Text style={styles.tutorialText}>Tap to join a live stream</Text>
              <View style={styles.tutorialArrow} />
            </View>
          </View>
        )}
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStreamRows()}
        </ScrollView>
      </View>
    </TutorialContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 24,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  countText: {
    color: '#FFF',
    fontSize: 12,
  },
  categoryLabel: {
    fontSize: 16,
    color: '#CCC',
    marginBottom: 14,
    marginTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  itemContainer: {
    width: '50%', // Take half the row width
    paddingLeft: ITEM_GAP / 2, // Half the gap as padding
  },
  firstItemInRow: {
    paddingLeft: 0, // No left padding for first item
    paddingRight: ITEM_GAP / 2, // Add right padding instead
  },
  streamItem: {
    width: '100%',
    height: STREAM_ITEM_HEIGHT,
    backgroundColor: '#1D1E26',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 2, // Small margin to make shadow visible
    position: 'relative', // Added for absolute positioning of tutorial
  },
  currentlyWatchingItem: {
    borderWidth: 2,
    borderColor: '#5865F2', // Discord blue for active stream
    shadowColor: '#5865F2',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 20,
    backgroundColor: '#1F2037', // Slightly different background for active stream
  },
  watchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 101, 242, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5865F2',
  },
  watchingText: {
    color: '#5865F2',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  // Global tutorial container - positioned to cover the whole grid area
  globalTutorialContainer: {
    position: 'absolute',
    top: 65, // Place below the header
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999, // Ensure it's above everything
  },
  // Tutorial bubble styles - matching the app's existing tutorial bubbles
  tutorialBubble: {
    backgroundColor: '#6E69F4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    marginBottom: 12,
  },
  tutorialText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tutorialArrow: {
    position: 'absolute',
    bottom: -16,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 16,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#6E69F4',
  },
  rankSection: {
    width: '100%',
    height: RANK_SECTION_HEIGHT,
    backgroundColor: '#2D2E38',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#2D2E38',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  combinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: 10,
    backgroundColor: '#2D2E38',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 6,
  },
  profileContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  hostGrid: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  singleHostContainer: {
    width: '100%',
    height: '100%',
  },
  singleHostImage: {
    width: '100%',
    height: '100%',
  },
  dualHostContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
  },
  dualHostItem: {
    width: '50%',
    height: '100%',
  },
  quadHostContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quadHostItem: {
    width: '50%',
    height: '50%',
  },
  multiHostContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  multiHostItem: {
    overflow: 'hidden',
  },
  sixHostItem: {
    width: '33.33%',
    height: '33.33%',
  },
  hostImage: {
    width: '100%',
    height: '100%',
  },
  infoFrame: {
    width: '100%',
    height: INFO_SECTION_HEIGHT,
    backgroundColor: '#1D1E26',
    padding: 12,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  rankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  firstRank: {
    backgroundColor: '#FFD700', // Gold
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  secondRank: {
    backgroundColor: '#C0C0C0', // Silver
    borderColor: 'rgba(192, 192, 192, 0.3)',
  },
  thirdRank: {
    backgroundColor: '#CD7F32', // Bronze
    borderColor: 'rgba(205, 127, 50, 0.3)',
  },
  defaultRank: {
    backgroundColor: '#2D2E38',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  streamTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  viewerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  viewerBubbleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  startStreamButton: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startStreamText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  pressIndicatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  pressIndicator: {
    height: '100%',
    backgroundColor: 'rgb(110, 86, 247)',
  },
});

// Wrap with error boundary for graceful error handling
const LiveStreamGridWithErrorBoundary = () => (
  <StreamErrorBoundary
    onError={(error, errorInfo) => {
      console.error('🚨 LiveStreamGrid Error:', error);
      console.error('Error Info:', errorInfo);
    }}
  >
    <LiveStreamGrid />
  </StreamErrorBoundary>
);

export default LiveStreamGridWithErrorBoundary;