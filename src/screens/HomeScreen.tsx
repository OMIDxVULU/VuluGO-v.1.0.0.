import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, Animated, Platform, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent, Modal, TouchableWithoutFeedback, PanResponder, StatusBar, TextInput, Alert } from 'react-native';
import { Text, Card, Avatar } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ScrollableContentContainer from '../components/ScrollableContentContainer';
import CommonHeader from '../components/CommonHeader';
import GoldBalanceDisplay from '../components/GoldBalanceDisplay';
import ActivityModal from '../components/ActivityModal';
import PersonGroupIcon from '../components/PersonGroupIcon';
import { useLiveStreams } from '../context/LiveStreamContext';
import { useUserProfile } from '../context/UserProfileContext';
import SpotlightProgressBar from '../components/SpotlightProgressBar';
import LiveStreamGrid from '../components/LiveStreamGrid';
import { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withRepeat, 
  cancelAnimation, 
  Easing 
} from 'react-native-reanimated';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import FirebaseTest from '../components/FirebaseTest';
import GuestModeIndicator from '../components/GuestModeIndicator';

// Import debug utilities for testing
import '../utils/debugStreamTest';
import { firestoreService, GlobalChatMessage } from '../services/firestoreService';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';
import { useGuestRestrictions } from '../hooks/useGuestRestrictions';
import DataValidator from '../utils/dataValidation';
import friendActivityService, { FriendActivity } from '../services/friendActivityService';
import virtualCurrencyService, { CurrencyBalance } from '../services/virtualCurrencyService';
import { useMusic } from '../context/MusicContext';
import { useGaming } from '../context/GamingContext';
import { useShop } from '../context/ShopContext';

const defaultSpotlightAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';

// Use the router for navigation
const HomeScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Week');
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Get live stream data from context
  const { friendStreams } = useLiveStreams();
  const { profileImage } = useUserProfile();
  const { counts, updateAllNotificationsCount } = useNotifications();

  // Get music data from context
  const { friendsActivities: friendsMusicActivities, isLoadingActivity: isLoadingMusic } = useMusic();

  // Get gaming data from context
  const {
    isMining,
    miningStats,
    slotsStats,
    goldMinerStats,
    userGameProfile,
    isLoadingMining,
    isLoadingSlots,
    isLoadingGoldMiner
  } = useGaming();

  // Get shop data from context
  const {
    featuredProducts,
    activePromotions,
    userInventory,
    isLoadingProducts,
    isLoadingPromotions
  } = useShop();
  
  // Activity Modal states
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState({
    type: 'watching' as 'watching' | 'hosting' | 'listening' | 'tournament',
    title: '',
    subtitle: '',
    hostName: '',
    hostAvatar: '',
    viewerCount: 0,
    avatars: [] as string[],
    friendName: '',
    friendAvatar: '',
    streamId: '1', // Default stream ID
  });
  
  // Separate timers for you and the boosted user
  const [yourSpotlightTimeLeft, setYourSpotlightTimeLeft] = useState<number>(120); 
  const [otherSpotlightTimeLeft, setOtherSpotlightTimeLeft] = useState<number>(180);
  
  // Remove pulsing animation but keep fade effect for transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [spotlightModalVisible, setSpotlightModalVisible] = useState(false);
  const [spotlightQueuePosition, setSpotlightQueuePosition] = useState<number>(0);
  // State for Virtual Currency (moved up to be available early)
  const [currencyBalances, setCurrencyBalances] = useState<CurrencyBalance>({
    gold: 0,
    gems: 0,
    tokens: 0,
    lastUpdated: new Date()
  });
  const [isLoadingCurrency, setIsLoadingCurrency] = useState(false);

  // Get user data from Firebase
  const { userProfile } = useAuth();
  // Gold balance now comes from currencyBalances state (loaded from Firebase)
  const goldBalance = currencyBalances.gold;
  const [eventEntryCost, setEventEntryCost] = useState(100); // Fixed entry cost of 100 gold
  const [eventEntries, setEventEntries] = useState(0); // Number of entries, starting at 0
  const [eventTimeLeft, setEventTimeLeft] = useState(180); // 3 minutes for demonstration (would be 3 hours in production)
  const [eventCycleCount, setEventCycleCount] = useState(0); // Track event cycles for uniqueness
  const [wonEventCycle, setWonEventCycle] = useState(-1); // Track which event cycle the user won in
  const [hasEnteredEvent, setHasEnteredEvent] = useState(false); // Track if user has entered the current event
  const [hasWonEvent, setHasWonEvent] = useState(false); // Track if user has won but not claimed
  const [viewersCount, setViewersCount] = useState<number>(35);
  const [showYourPill, setShowYourPill] = useState<boolean>(true);
  const [showOtherPill, setShowOtherPill] = useState<boolean>(true);
  // Add record of entries for each event cycle
  const [eventEntriesRecord, setEventEntriesRecord] = useState<{[key: number]: number}>({});
  
  // Add state for the new minimal gems widget
  const [isMinimalGemsExpanded, setIsMinimalGemsExpanded] = useState(false);
  // Add states to track if the tutorials have been shown for gems widget
  const [showGemsExpandTutorial, setShowGemsExpandTutorial] = useState(true);
  const [showGemsMinimizeTutorial, setShowGemsMinimizeTutorial] = useState(true);
  
  // --- Animation Setup for Your Spotlight Shadow ---
  const yourShadowOpacity = useSharedValue(0.7); // Initial opacity

  // Effect to control the pulsing animation based on timer
  useEffect(() => {
    if (yourSpotlightTimeLeft > 0) {
      // Start pulsing animation
      yourShadowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 800, easing: Easing.inOut(Easing.ease) }), // Pulse brighter
          withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) })  // Pulse dimmer
        ),
        -1, // Loop indefinitely
        true // Reverse the animation direction each time
      );
    } else {
      // Stop animation and reset opacity when timer ends
      cancelAnimation(yourShadowOpacity);
      yourShadowOpacity.value = 0; // Fade out completely when inactive
    }

    // Cleanup function to cancel animation on unmount
    return () => cancelAnimation(yourShadowOpacity);
  }, [yourSpotlightTimeLeft, yourShadowOpacity]);

  // Animated style for your shadow opacity
  const yourAnimatedShadowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: yourShadowOpacity.value,
    };
  }, []); // Add empty dependency array to prevent reading during render
  // --- End Your Animation Setup ---

  // --- Animation Setup for Other Spotlight Shadow ---
  const otherShadowOpacity = useSharedValue(0.7); // Initial opacity

  // Effect to control the pulsing animation based on timer
  useEffect(() => {
    if (otherSpotlightTimeLeft > 0) {
      // Start pulsing animation
      otherShadowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 800, easing: Easing.inOut(Easing.ease) }), // Pulse brighter
          withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) })  // Pulse dimmer
        ),
        -1, // Loop indefinitely
        true // Reverse the animation direction each time
      );
    } else {
      // Stop animation and reset opacity when timer ends
      cancelAnimation(otherShadowOpacity);
      otherShadowOpacity.value = 0; // Fade out completely when inactive
    }

    // Cleanup function to cancel animation on unmount
    return () => cancelAnimation(otherShadowOpacity);
  }, [otherSpotlightTimeLeft, otherShadowOpacity]);

  // Animated style for other shadow opacity
  const otherAnimatedShadowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: otherShadowOpacity.value,
    };
  }, []); // Add empty dependency array to prevent reading during render
  // --- End Other Animation Setup ---
  
  // Random user spotlight candidate
  const [otherSpotlightCandidate, setOtherSpotlightCandidate] = useState<{ name: string; avatar: string }>({ name: 'Alex', avatar: 'https://randomuser.me/api/portraits/men/45.jpg' });
  
  // Pick a random friend from watching streams
  useEffect(() => {
    // pick a random friend from watching streams, or fallback
    const friends = friendStreams.watching[0]?.friends || [];
    if (friends.length > 0) {
      setOtherSpotlightCandidate(friends[Math.floor(Math.random() * friends.length)]);
    } // else keep existing fallback
  }, [friendStreams]);
  
  // Your spotlight timer effect
  useEffect(() => {
    if (yourSpotlightTimeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setYourSpotlightTimeLeft(prev => {
        const newValue = Math.max(prev - 1, 0);
        return newValue;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [yourSpotlightTimeLeft]);
  
  // Boosted user spotlight timer effect
  useEffect(() => {
    if (otherSpotlightTimeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setOtherSpotlightTimeLeft(prev => {
        const newValue = Math.max(prev - 1, 0);
        if (newValue === 0) {
          // Fade out and hide the pill when timer reaches zero
          setShowOtherPill(false);
        }
        return newValue;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [otherSpotlightTimeLeft]);
  
  // Utility to format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  
  // Function to handle container width measurement
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  // Function to handle content width measurement
  const handleContentLayout = useCallback((width: number) => {
    setContentWidth(width);
  }, []);

  // Placeholder for handleScrollContentSizeChange - will be defined after actualChildrenCount
  
  // Simplified scroll handler without haptics or rubber band effects
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  // Handle pressing on an activity widget
  const handleActivityPress = (
    type: 'watching' | 'hosting' | 'listening' | 'tournament',
    data: {
      streamId: string;
      title?: string;
      subtitle?: string;
      hostName?: string;
      hostAvatar?: string;
      viewerCount?: number;
      avatars?: string[];
      friendName?: string;
      friendAvatar?: string;
    }
  ) => {
    // Set selected activity data
    setSelectedActivity({
      type,
      title: data.title || '',
      subtitle: data.subtitle || '',
      hostName: data.hostName || '',
      hostAvatar: data.hostAvatar || '',
      viewerCount: data.viewerCount || 0,
      avatars: data.avatars || [],
      friendName: data.friendName || '',
      friendAvatar: data.friendAvatar || '',
      streamId: data.streamId, // Using the stream ID from the data
    });
    
    // Show modal
    setActivityModalVisible(true);
  };

  // Close the activity modal
  const closeActivityModal = () => {
    setActivityModalVisible(false);
  };

  const renderFriendWatchingLive = () => {
    // Use the first watching stream from the context or fallback to default
    const stream = friendStreams.watching[0];
    
    if (!stream) {
      return null; // No watching activity to display
    }
    
    // Get the host and friend details
    const host = stream.hosts[0];
    const friend = stream.friends?.[0];
    
    if (!friend) {
      return null; // No friend watching this stream
    }
    
    return (
      <TouchableOpacity 
        style={styles.liveStreamContainer}
        onPress={() => handleActivityPress('watching', {
          streamId: stream.id,
          title: stream.title,
          hostName: host.name,
          hostAvatar: host.avatar,
          viewerCount: stream.views,
          avatars: stream.hosts.map(h => h.avatar),
          friendName: friend.name,
          friendAvatar: friend.avatar,
        })}
      >
        {/* Left section with 4 avatars in a grid - hosts should be red */}
        <View style={styles.avatarGrid}>
          {stream.hosts.slice(0, 3).map((host, index) => (
            <View key={`${stream.id}-host-${host.name || index}`} style={styles.avatarWrapperRed}>
              <Image
                source={{ uri: host.avatar }}
                style={styles.gridAvatar}
              />
            </View>
          ))}
          {stream.hosts.length > 3 && (
            <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
              <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+{stream.hosts.length - 3}</Text>
            </View>
          )}
        </View>
        
        {/* Center section with stream title and viewers */}
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            {stream.title}
          </Text>
          <Text style={styles.viewersText}>{stream.views} Viewers watching</Text>
        </View>
        
        {/* Right section with broadcaster avatar - friend watching (blue) */}
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainer}>
            <Image 
              source={{ uri: friend.avatar }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.liveIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendHostingLive = () => {
    // Use the first hosting stream from the context or fallback to default
    const stream = friendStreams.hosting[0];
    
    if (!stream) {
      return null; // No hosting activity to display
    }
    
    // Find the friend who is hosting
    const friendHost = stream.hosts.find(host => 
      host.name === 'Michael' || host.name === 'James'
    );
    
    if (!friendHost) {
      return null; // Friend not hosting this stream
    }
    
    return (
      <TouchableOpacity 
        style={styles.liveStreamContainer}
        onPress={() => handleActivityPress('hosting', {
          streamId: stream.id,
          title: stream.title,
          hostName: friendHost.name,
          hostAvatar: friendHost.avatar,
          viewerCount: stream.views,
          avatars: stream.hosts.map(h => h.avatar),
          friendName: friendHost.name,
          friendAvatar: friendHost.avatar,
        })}
      >
        {/* Left section with 4 avatars in a grid - hosts should be red */}
        <View style={styles.avatarGrid}>
          {stream.hosts.slice(0, 3).map((host, index) => (
            <View key={`${stream.id}-host-${host.name || index}`} style={styles.avatarWrapperRed}>
              <Image
                source={{ uri: host.avatar }}
                style={styles.gridAvatar}
              />
            </View>
          ))}
          {stream.hosts.length > 3 && (
            <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
              <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+{stream.hosts.length - 3}</Text>
            </View>
          )}
        </View>
        
        {/* Center section with stream title and viewers */}
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            {stream.title}
          </Text>
          <Text style={styles.viewersText}>{stream.views} Viewers watching</Text>
        </View>
        
        {/* Right section with broadcaster avatar */}
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterAvatarContainer}>
            <Image 
              source={{ uri: friendHost.avatar }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.liveIndicatorRed}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendListeningMusic = () => {
    // Return real Firebase music activities instead of mock data
    if (isLoadingMusic || friendsMusicActivities.length === 0) {
      return null;
    }

    // Get the most recent music activity
    const recentMusicActivity = friendsMusicActivities[0];
    if (!recentMusicActivity) return null;

    const track = recentMusicActivity.track;
    const activityData = {
      title: track.title,
      subtitle: `${track.artist} • ${recentMusicActivity.platform}`,
      friendName: recentMusicActivity.userName,
      friendAvatar: recentMusicActivity.userAvatar || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=U',
      avatars: [recentMusicActivity.userAvatar || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=U'],
      streamId: recentMusicActivity.id,
      musicData: {
        songTitle: track.title,
        artist: track.artist,
        albumArt: track.albumArt,
        platform: recentMusicActivity.platform
      }
    };

    return (
      <TouchableOpacity
        style={styles.musicStreamContainer}
        onPress={() => handleActivityPress('listening', activityData)}
      >
        {/* Left section with album/playlist art */}
        <View style={styles.musicContentContainer}>
          <View style={styles.albumArtContainer}>
            <Image
              source={{ uri: track.albumArt || 'https://via.placeholder.com/60/6E69F4/FFFFFF?text=♪' }}
              style={styles.albumArt}
            />
          </View>
          <View style={styles.songInfoContainer}>
            <Text style={styles.songTitle} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.artistName} numberOfLines={1}>{track.artist} • {recentMusicActivity.platform}</Text>
          </View>
        </View>

        {/* Right section with friend avatar */}
        <View style={styles.musicFriendContainer}>
          <View style={styles.musicAvatarContainer}>
            <Image
              source={{ uri: recentMusicActivity.userAvatar || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=U' }}
              style={styles.musicAvatar}
            />
            <View style={styles.musicIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Friend activity widgets based on real Firebase data
  const renderFriendActivityWidgets = () => {
    if (isLoadingActivities || friendActivities.length === 0) {
      return [];
    }

    const activityWidgets: JSX.Element[] = [];

    // Render different types of activities
    friendActivities.slice(0, 5).forEach((activity, index) => {
      switch (activity.activityType) {
        case 'live_stream':
          const liveStreamWidget = renderLiveStreamActivityWidget(activity, index);
          if (liveStreamWidget) activityWidgets.push(liveStreamWidget);
          break;
        case 'music_listening':
          const musicWidget = renderMusicActivityWidget(activity, index);
          if (musicWidget) activityWidgets.push(musicWidget);
          break;
        case 'gaming':
          const gamingWidget = renderGamingActivityWidget(activity, index);
          if (gamingWidget) activityWidgets.push(gamingWidget);
          break;
        default:
          const genericWidget = renderGenericActivityWidget(activity, index);
          if (genericWidget) activityWidgets.push(genericWidget);
          break;
      }
    });

    return activityWidgets;
  };

  // Render live stream activity widget
  const renderLiveStreamActivityWidget = (activity: FriendActivity, index: number) => {
    const streamData = activity.data;
    if (!streamData) return null;

    return (
      <TouchableOpacity
        key={`activity-${activity.id}-${index}`}
        style={styles.liveStreamContainer}
        onPress={() => handleActivityPress('watching', {
          streamId: streamData.streamId,
          title: streamData.streamTitle || activity.title,
          hostName: activity.userName,
          hostAvatar: activity.userAvatar,
          viewerCount: streamData.viewerCount || 0
        })}
      >
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image
              source={{ uri: activity.userAvatar || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=U' }}
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>LIVE</Text>
          </View>
        </View>

        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            {streamData.streamTitle || activity.title}
          </Text>
          <Text style={styles.viewersText}>{streamData.viewerCount || 0} Viewers watching</Text>
        </View>

        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainer}>
            <Image
              source={{ uri: activity.userAvatar || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=U' }}
              style={styles.broadcasterAvatar}
            />
            <View style={styles.liveIndicatorRed}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render music activity widget
  const renderMusicActivityWidget = (activity: FriendActivity, index: number) => {
    const musicData = activity.data;
    if (!musicData) return null;

    return (
      <TouchableOpacity key={`activity-${activity.id}-${index}`} style={styles.musicStreamContainer}>
        <View style={styles.musicContentContainer}>
          <View style={styles.albumArtContainer}>
            <Image
              source={{ uri: musicData.albumArt || 'https://via.placeholder.com/60/6E69F4/FFFFFF?text=♪' }}
              style={styles.albumArt}
            />
          </View>
          <View style={styles.songInfoContainer}>
            <Text style={styles.songTitle} numberOfLines={1}>{musicData.songTitle}</Text>
            <Text style={styles.artistName} numberOfLines={1}>{musicData.artist}</Text>
          </View>
        </View>

        <View style={styles.musicFriendContainer}>
          <View style={styles.musicAvatarContainer}>
            <Image
              source={{ uri: activity.userAvatar || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=U' }}
              style={styles.musicAvatar}
            />
            <View style={styles.musicIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render gaming activity widget
  const renderGamingActivityWidget = (activity: FriendActivity, index: number) => {
    const gamingData = activity.data;
    if (!gamingData) return null;

    return (
      <TouchableOpacity key={`activity-${activity.id}-${index}`} style={styles.liveStreamContainer}>
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image
              source={{ uri: gamingData.gameIcon || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=🎮' }}
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image
              source={{ uri: activity.userAvatar || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=U' }}
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>🎮</Text>
          </View>
        </View>

        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            {activity.userName} playing {gamingData.gameName}
          </Text>
          <Text style={styles.viewersText}>
            {gamingData.level ? `Level ${gamingData.level}` : 'Gaming'}
          </Text>
        </View>

        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainer}>
            <Image
              source={{ uri: activity.userAvatar || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=U' }}
              style={styles.broadcasterAvatar}
            />
            <View style={styles.liveIndicatorRed}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render generic activity widget
  const renderGenericActivityWidget = (activity: FriendActivity, index: number) => {
    return (
      <TouchableOpacity key={`activity-${activity.id}-${index}`} style={styles.liveStreamContainer}>
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image
              source={{ uri: activity.userAvatar || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=U' }}
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>•</Text>
          </View>
        </View>

        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            {activity.title}
          </Text>
          <Text style={styles.viewersText}>{activity.description}</Text>
        </View>

        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainer}>
            <Image
              source={{ uri: activity.userAvatar || 'https://via.placeholder.com/40/6E69F4/FFFFFF?text=U' }}
              style={styles.broadcasterAvatar}
            />
            <View style={styles.liveIndicatorRed}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Gaming status widget showing user's current gaming activities
  const renderGamingStatusWidget = () => {
    if (isLoadingMining && isLoadingSlots && isLoadingGoldMiner) {
      return null;
    }

    // Show mining status if user is currently mining
    if (isMining && miningStats) {
      return (
        <TouchableOpacity style={styles.liveStreamContainer}>
          <View style={styles.avatarGrid}>
            <View style={styles.avatarWrapperRed}>
              <Text style={styles.gridAvatar}>⛏️</Text>
            </View>
            <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
              <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>MINING</Text>
            </View>
          </View>

          <View style={styles.streamInfoContainer}>
            <Text style={styles.streamTitle} numberOfLines={2}>
              You are mining
            </Text>
            <Text style={styles.viewersText}>Level {miningStats.miningLevel} • {miningStats.totalResourcesCollected.gold} gold collected</Text>
          </View>

          <View style={styles.broadcasterContainerWrapper}>
            <View style={styles.broadcasterContainer}>
              <Text style={styles.broadcasterAvatar}>⛏️</Text>
              <View style={styles.liveIndicatorRed}></View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Show recent gaming stats if available
    if (userGameProfile && userGameProfile.totalGamesPlayed > 0) {
      return (
        <TouchableOpacity style={styles.liveStreamContainer}>
          <View style={styles.avatarGrid}>
            <View style={styles.avatarWrapperRed}>
              <Text style={styles.gridAvatar}>🎮</Text>
            </View>
            <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
              <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>GAMER</Text>
            </View>
          </View>

          <View style={styles.streamInfoContainer}>
            <Text style={styles.streamTitle} numberOfLines={2}>
              Gaming Profile
            </Text>
            <Text style={styles.viewersText}>Level {userGameProfile.level} • {userGameProfile.totalGamesPlayed} games played</Text>
          </View>

          <View style={styles.broadcasterContainerWrapper}>
            <View style={styles.broadcasterContainer}>
              <Text style={styles.broadcasterAvatar}>🎮</Text>
              <View style={styles.liveIndicatorRed}></View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return null;
  };

  // Shop widget showing featured products or promotions
  const renderShopWidget = () => {
    if (isLoadingProducts && isLoadingPromotions) {
      return null;
    }

    // Show active promotions if available
    if (activePromotions && activePromotions.length > 0) {
      const promotion = activePromotions[0];
      return (
        <TouchableOpacity style={styles.liveStreamContainer}>
          <View style={styles.avatarGrid}>
            <View style={styles.avatarWrapperRed}>
              <Text style={styles.gridAvatar}>🛍️</Text>
            </View>
            <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
              <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>SALE</Text>
            </View>
          </View>

          <View style={styles.streamInfoContainer}>
            <Text style={styles.streamTitle} numberOfLines={2}>
              {promotion.name}
            </Text>
            <Text style={styles.viewersText}>{promotion.discountPercentage}% OFF • Limited Time</Text>
          </View>

          <View style={styles.broadcasterContainerWrapper}>
            <View style={styles.broadcasterContainer}>
              <Text style={styles.broadcasterAvatar}>🛍️</Text>
              <View style={styles.liveIndicatorRed}></View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Show featured products if available
    if (featuredProducts && featuredProducts.length > 0) {
      const product = featuredProducts[0];
      return (
        <TouchableOpacity style={styles.liveStreamContainer}>
          <View style={styles.avatarGrid}>
            <View style={styles.avatarWrapperRed}>
              <Text style={styles.gridAvatar}>⭐</Text>
            </View>
            <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
              <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>{product.rarity.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.streamInfoContainer}>
            <Text style={styles.streamTitle} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.viewersText}>
              {product.price.gold ? `${product.price.gold} Gold` : ''}
              {product.price.gems ? ` • ${product.price.gems} Gems` : ''}
            </Text>
          </View>

          <View style={styles.broadcasterContainerWrapper}>
            <View style={styles.broadcasterContainer}>
              <Text style={styles.broadcasterAvatar}>⭐</Text>
              <View style={styles.liveIndicatorRed}></View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return null;
  };

  // Function to render friend activity widgets - now uses real stream data
  const renderRandomFriendWidgets = () => {
    // Return real friend activities instead of mock data
    return renderFriendActivityWidgets();
  };

  // Add new state for event expansion

  // Add new state for event expansion
  const [isEventExpanded, setIsEventExpanded] = useState(false);

  // Add a new animation value for smooth transitions
  const eventExpandAnim = useSharedValue(0);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(eventExpandAnim);
    };
  }, [eventExpandAnim]);

  // Add animated styles for the event widget
  const eventAnimatedStyle = useAnimatedStyle(() => {
    const minHeight = 60; // Just enough height for title and progress bar
    const maxHeight = 200; // Full expanded height

    return {
      height: withTiming(
        isEventExpanded ? maxHeight : minHeight,
        { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      ),
      overflow: 'hidden'
    };
  }, [isEventExpanded]); // Add dependency array

  // Add animated styles for the event content
  const eventContentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(
        isEventExpanded ? 1 : 0,
        { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      ),
      transform: [{
        translateY: withTiming(
          isEventExpanded ? 0 : 10,
          { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
        )
      }]
    };
  }, [isEventExpanded]); // Add dependency array

  /* First declaration of renderMinimalEventWidget removed */
  const openSpotlightModal = () => setSpotlightModalVisible(true);
  const closeSpotlightModal = () => setSpotlightModalVisible(false);
  const purchaseSpotlight = async (minutes: number, cost: number) => {
    if (goldBalance < cost) {
      // Handle insufficient balance
      Alert.alert('Insufficient Balance', `You need ${cost} gold to purchase ${minutes} minutes of spotlight.`);
      return;
    }

    if (!user || isGuest) {
      handleGuestRestriction('spotlight purchase');
      return;
    }

    try {
      // Deduct cost using virtual currency service
      await virtualCurrencyService.spendCurrency(
        user.uid,
        'gold',
        cost,
        `Spotlight purchase: ${minutes} minutes`,
        {
          type: 'spotlight_purchase',
          duration: minutes,
          timestamp: new Date().toISOString()
        }
      );

      // Set timer and show spotlight
      setYourSpotlightTimeLeft(minutes * 60);
      setShowYourPill(true);
      setSpotlightQueuePosition(1); // placeholder for queue logic

      // Simulate other viewers seeing your spotlight
      setViewersCount(Math.floor(Math.random() * 50) + 20);

      closeSpotlightModal();

      Alert.alert('Success!', `You've purchased ${minutes} minutes of spotlight time!`);
    } catch (error: any) {
      console.error('Failed to purchase spotlight:', error);
      Alert.alert('Purchase Failed', error.message || 'Failed to purchase spotlight. Please try again.');
    }
  };

  // Add a isActive state/prop check for determining widget display mode
  const [isActive, setIsActive] = useState<boolean>(false); // For demo purposes, can hook to real activity later
  
  // Add a state for the new minimal event widget
  const [isMinimalEventExpanded, setIsMinimalEventExpanded] = useState(false);
  // Add states to track if the tutorials have been shown
  const [showExpandTutorial, setShowExpandTutorial] = useState(true);
  const [showMinimizeTutorial, setShowMinimizeTutorial] = useState(true);

  // Add logging to track state changes
  useEffect(() => {
    // Hide appropriate tutorial after user has interacted with the widget
    if (isMinimalEventExpanded) {
      setShowExpandTutorial(false);
    } else if (!isMinimalEventExpanded && !showExpandTutorial) {
      // User has minimized after expanding, so hide minimize tutorial
      setShowMinimizeTutorial(false);
    }
  }, [isMinimalEventExpanded, showExpandTutorial]);

  // Add animated styles for the minimal event content
  const minimalEventAnimatedStyle = useAnimatedStyle(() => {
    const minHeight = 50; // Just enough for title and progress bar
    const maxHeight = 200; // Full expanded height
    
    return {
      height: withTiming(
        isMinimalEventExpanded ? maxHeight : minHeight, 
        { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      ),
      overflow: 'hidden'
    };
  });

  // Add animated styles for the expanded content
  const minimalEventContentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(
        isMinimalEventExpanded ? 1 : 0, 
        { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      ),
      transform: [{ 
        translateY: withTiming(
          isMinimalEventExpanded ? 0 : 10, 
          { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
        ) 
      }]
    };
  });
  
  // Render a simple minimal event widget with just a title and progress bar
  const renderMinimalEventWidget = () => {
    // Progress percent (0-100) representing time elapsed
    // When timer is at max, bar is at 0%. When timer is at 0, bar is at 100%
    const progressPercent = eventTimeLeft > 0
      ? 100 - (eventTimeLeft / 180 * 100) // Based on 180 seconds (3 min) cycle
      : 100;
    
    const toggleExpanded = () => {
      setIsMinimalEventExpanded(!isMinimalEventExpanded);
    };
    
    // Calculate prize pool based on number of entries
    const prizePool = eventEntries === 0 ? 0 : eventEntries === 1 ? 
      eventEntryCost : // Show full refund amount for 1 entry
      Math.floor(eventEntries * eventEntryCost * 0.7); // 70% of all entries for 2+ entries
    
    return (
      <View style={{position: 'relative', marginBottom: 16}}>
        {/* Expand tutorial bubble for new users (when collapsed) */}
        {showExpandTutorial && !isMinimalEventExpanded && (
          <View style={styles.tutorialBubble}>
            <Text style={styles.tutorialText}>
              Tap to expand event details
            </Text>
            <View style={styles.tutorialArrow} />
          </View>
        )}
        
        {/* Minimize tutorial bubble (when expanded) */}
        {showMinimizeTutorial && isMinimalEventExpanded && (
          <View style={[styles.tutorialBubble, styles.minimizeBubble]}>
            <Text style={styles.tutorialText}>
              Tap again to minimize
            </Text>
            <View style={styles.tutorialArrow} />
          </View>
        )}
        
        <TouchableOpacity 
          onPress={toggleExpanded}
          activeOpacity={0.7}
          style={[
            styles.minimalEventContainer,
            // Add glow effect if user has won but not claimed
            hasWonEvent && styles.eventContainerGlow
          ]}
        >
          <View style={{width: '100%'}}>
            <View style={styles.minimalEventHeader}>
              <Text style={styles.eventTitle}>Event</Text>
            </View>
            
            <View style={styles.minimalProgressContainer}>
              <View style={styles.minimalProgressTrack}>
                <View 
                  style={[
                    styles.minimalProgressFill, 
                    { width: `${progressPercent}%` }
                  ]} 
                />
              </View>
            </View>
            
            {/* Content that shows/hides based on expanded state */}
            {isMinimalEventExpanded && (
              <View style={styles.minimalEventContent}>
                <View style={styles.eventInfoGrid}>
                  <View style={styles.eventInfoBox}>
                    <Text style={styles.eventInfoValue}>
                      {eventTimeLeft > 0 
                        ? `${Math.floor(eventTimeLeft / 60)}:${(eventTimeLeft % 60).toString().padStart(2, '0')}` 
                        : "Time's up!"}
                    </Text>
                    <Text style={styles.eventInfoLabel}>Time Left</Text>
                  </View>
                  
                  <View style={styles.eventInfoBox}>
                    <View style={styles.prizeContainer}>
                      <View style={styles.eventCoinIcon} />
                      <Text style={styles.eventInfoValue}>{prizePool}</Text>
                    </View>
                    <Text style={styles.eventInfoLabel}>Prize Pool</Text>
                  </View>
                  
                  <View style={styles.eventInfoBox}>
                    <Text style={styles.eventInfoValue}>{eventEntries}</Text>
                    <Text style={styles.eventInfoLabel}>Entries</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.enterButton, 
                    // Change button color based on state
                    hasWonEvent ? styles.claimButton : styles.enterButton,
                    // Disable button styling if needed
                    (!hasWonEvent && hasEnteredEvent) && styles.enteredButton,
                    (!hasWonEvent && !hasEnteredEvent && goldBalance < eventEntryCost) && styles.disabledButton
                  ]} 
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEventEntry();
                  }}
                  // Only disable if:
                  // 1. User has entered but not won yet
                  // 2. User doesn't have enough gold to enter
                  disabled={
                    (!hasWonEvent && hasEnteredEvent) || 
                    (!hasWonEvent && !hasEnteredEvent && goldBalance < eventEntryCost)
                  }
                >
                  <View style={styles.buttonContent}>
                    {/* Show cost info if not entered yet */}
                    {!hasWonEvent && !hasEnteredEvent && (
                      <View style={styles.costContainer}>
                        <View style={styles.eventCoinIcon} />
                        <Text style={styles.costText}>{eventEntryCost}</Text>
                      </View>
                    )}
                    <Text style={styles.enterButtonText}>
                      {hasWonEvent 
                        ? 'Claim Reward' 
                        : hasEnteredEvent 
                          ? 'Entered' 
                          : 'Enter'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Render dynamic Spotlight widget
  const renderSpotlightWidget = () => {
    if (yourSpotlightTimeLeft <= 0) return null;
    
    // Calculate progress for animation (1 to 0)
    const initialYourSpotlightDuration = 300; // 5 minutes in seconds (you can adjust this or make it a state variable)
    const yourProgressAnim = Math.min(1, yourSpotlightTimeLeft / initialYourSpotlightDuration);
    
    return (
      // New wrapper view
      <View style={styles.spotlightWrapper}>
        {/* Loading bar animation - now outside the content container */}
        <SpotlightProgressBar 
          width={320} 
          height={110} 
          borderRadius={16}
          progress={yourProgressAnim}
          color="#34C759" // NEO_GREEN
          strokeWidth={3}
          glowIntensity={3}
        />
        {/* Content container - slightly padded */}
        <TouchableOpacity
          style={[styles.spotlightContainer, { padding: 5 }]} // Add padding
          onPress={openSpotlightModal}
          activeOpacity={0.9} // Maintain high opacity
        >
          {/* Content is now directly inside TouchableOpacity */}
        <View style={styles.spotlightAvatarWrapper}>
          <Image source={{ uri: profileImage || defaultSpotlightAvatar }} style={styles.spotlightAvatar} />
          <View style={styles.spotlightIndicator} />
        </View>
        <View style={styles.spotlightInfo}>
          <Text style={styles.spotlightTitle}>Friday Night Live Stream</Text>
          <Text style={styles.viewersText}>{viewersCount} Viewers watching</Text>
          <Text style={styles.spotlightTimer}>{formatTime(yourSpotlightTimeLeft)}</Text>
        </View>
      </TouchableOpacity>
      </View>
    );
  };

  // Render random user Spotlight widget
  const renderOtherSpotlightWidget = () => {
    if (!otherSpotlightCandidate || otherSpotlightTimeLeft <= 0) return null;
    
    // Calculate progress for animation (1 to 0)
    const initialOtherSpotlightDuration = 300; // 5 minutes in seconds (you can adjust this or make it a state variable)
    const otherProgressAnim = Math.min(1, otherSpotlightTimeLeft / initialOtherSpotlightDuration);
    
    return (
      // New wrapper view
      <View style={[styles.spotlightWrapper, { marginRight: 12 }]}> 
        {/* Loading bar animation - outside the content container */}
        <SpotlightProgressBar 
          width={320} 
          height={110} 
          borderRadius={16}
          progress={otherProgressAnim}
          color="#FFC107" // Match border color
          strokeWidth={3}
          glowIntensity={3}
        />
        {/* Content container - slightly padded */}
        <TouchableOpacity
          style={[styles.spotlightContainer, { borderColor: '#FFC107', padding: 5 }]} // Add padding
          onPress={openSpotlightModal}
          activeOpacity={0.9} // Maintain high opacity
        >
           {/* Content is now directly inside TouchableOpacity */}
        <View style={[styles.spotlightAvatarWrapper, { borderColor: '#FFC107', borderWidth: 2 }]}>  
          <Image source={{ uri: otherSpotlightCandidate.avatar }} style={styles.spotlightAvatar} />
          <View style={[styles.spotlightIndicator, { backgroundColor: '#FFC107' }]} />
        </View>
        <View style={styles.spotlightInfo}>
          <Text style={styles.spotlightTitle}>Weekend Gaming Session</Text>
          <Text style={styles.viewersText}>{Math.floor(viewersCount * 0.8)} Viewers watching</Text>
          <Text style={styles.spotlightTimer}>{formatTime(otherSpotlightTimeLeft)}</Text>
        </View>
      </TouchableOpacity>
      </View>
    );
  };

  // Add animated styles for the expanded content
  const minimalGemsContentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(
        isMinimalGemsExpanded ? 1 : 0, 
        { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      ),
      transform: [{ 
        translateY: withTiming(
          isMinimalGemsExpanded ? 0 : 10, 
          { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
        ) 
      }]
    };
  });

  // Add logging to track gems state changes
  useEffect(() => {
    // Hide appropriate tutorial after user has interacted with the widget
    if (isMinimalGemsExpanded) {
      setShowGemsExpandTutorial(false);
    } else if (!isMinimalGemsExpanded && !showGemsExpandTutorial) {
      // User has minimized after expanding, so hide minimize tutorial
      setShowGemsMinimizeTutorial(false);
    }
  }, [isMinimalGemsExpanded, showGemsExpandTutorial]);

  // Add animated styles for the minimal gems content
  const minimalGemsAnimatedStyle = useAnimatedStyle(() => {
    const minHeight = 50; // Just enough for title and basic info
    const maxHeight = 200; // Full expanded height
    
    return {
      height: withTiming(
        isMinimalGemsExpanded ? maxHeight : minHeight, 
        { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      ),
      overflow: 'hidden'
    };
  });

  // Render a minimal Gems+ widget with expand/minimize functionality
  const renderMinimalGemsWidget = () => {
    // Use the shared state variable instead of hardcoded values
    const dailyGems = 200; // For demo, could be a state variable
    const daysUntilRenewal = 3; // For demo, could be a state variable
    
    const toggleExpanded = () => {
      setIsMinimalGemsExpanded(!isMinimalGemsExpanded);
    };
    
    return (
      <View style={{position: 'relative', marginBottom: 16}}>
        {/* Expand tutorial bubble for new users (when collapsed) */}
        {showGemsExpandTutorial && !isMinimalGemsExpanded && (
          <View style={styles.tutorialBubble}>
            <Text style={styles.tutorialText}>
              Tap to expand Gem+ details
            </Text>
            <View style={styles.tutorialArrow} />
          </View>
        )}
        
        {/* Minimize tutorial bubble (when expanded) */}
        {showGemsMinimizeTutorial && isMinimalGemsExpanded && (
          <View style={[styles.tutorialBubble, styles.minimizeBubble]}>
            <Text style={styles.tutorialText}>
              Tap again to minimize
            </Text>
            <View style={styles.tutorialArrow} />
          </View>
        )}
        
        <TouchableOpacity 
          onPress={toggleExpanded}
          activeOpacity={0.7}
          style={[styles.minimalEventContainer, {
            backgroundColor: '#1C1D23',
            paddingVertical: 14,
            paddingHorizontal: 16
          }]}
        >
          {/* Collapsed state */}
          {!isMinimalGemsExpanded && (
            <View style={{
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%'
            }}>
              {/* Left side - Title and badge */}
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialCommunityIcons 
                  name="diamond-stone" 
                  size={20} 
                  color="#B768FB" 
                  style={{marginRight: 8}}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginRight: 8
                }}>Gem+</Text>
                <View style={{
                  backgroundColor: '#B768FB',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10
                }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}>ACTIVE</Text>
                </View>
              </View>
              
              {/* Right side - Balance info */}
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={{alignItems: 'flex-end', marginRight: 10}}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{
                      color: '#FFFFFF', 
                      fontWeight: 'bold', 
                      fontSize: 18
                    }}>{gemBalance}</Text>
                    <MaterialCommunityIcons 
                      name="diamond-stone" 
                      size={14} 
                      color="rgba(183, 104, 251, 0.7)" 
                      style={{marginLeft: 4}}
                    />
                  </View>
                  <Text style={{
                    color: 'rgba(255, 255, 255, 0.5)', 
                    fontSize: 10
                  }}>
                    {dailyGems}/day
                  </Text>
                </View>
                <View style={{
                  backgroundColor: 'rgba(183, 104, 251, 0.15)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6
                }}>
                  <Text style={{
                    color: '#B768FB', 
                    fontSize: 10, 
                    fontWeight: '500'
                  }}>
                    {daysUntilRenewal}d
                  </Text>
                </View>
              </View>
            </View>
          )}
            
          {/* Expanded state */}
          {isMinimalGemsExpanded && (
            <View>
              {/* Header section with Gem+ title and badge */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16
              }}>
                <MaterialCommunityIcons 
                  name="diamond-stone" 
                  size={20} 
                  color="#B768FB" 
                  style={{marginRight: 8}}
                />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginRight: 8
                }}>Gem+</Text>
                <View style={{
                  backgroundColor: '#B768FB',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10
                }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}>ACTIVE</Text>
                </View>
              </View>
              
              {/* Daily gems section */}
              <View style={{
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                marginBottom: 16
              }}>
                <View>
                  <Text style={{
                    color: 'rgba(255, 255, 255, 0.6)', 
                    fontSize: 12,
                    marginBottom: 4
                  }}>Daily Gems</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{
                      color: 'rgba(255, 255, 255, 0.9)', 
                      fontWeight: 'bold', 
                      fontSize: 16
                    }}>{dailyGems}</Text>
                    <MaterialCommunityIcons 
                      name="diamond-stone" 
                      size={14} 
                      color="rgba(183, 104, 251, 0.7)" 
                      style={{marginLeft: 4}}
                    />
                  </View>
                </View>
                
                <View style={{
                  backgroundColor: 'rgba(183, 104, 251, 0.15)',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10
                }}>
                  <Text style={{
                    color: '#B768FB', 
                    fontSize: 11, 
                    fontWeight: '500'
                  }}>
                    Renews in {daysUntilRenewal} days
                  </Text>
                </View>
              </View>
              
              {/* Available balance section */}
              <LinearGradient
                colors={['rgba(183, 104, 251, 0.1)', 'rgba(110, 105, 244, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 16
                }}
              >
                <Text style={{
                  color: '#B768FB', 
                  fontSize: 12, 
                  fontWeight: '600', 
                  marginBottom: 8,
                  textAlign: 'center'
                }}>
                  YOUR AVAILABLE BALANCE
                </Text>
                <View style={{
                  flexDirection: 'row', 
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Text style={{
                    fontSize: 28, 
                    fontWeight: 'bold', 
                    color: '#FFFFFF', 
                    marginRight: 12
                  }}>
                    {gemBalance}
                  </Text>
                  <LinearGradient
                    colors={['#B768FB', '#6E69F4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="diamond-stone" 
                      size={18}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                </View>
              </LinearGradient>
              
              {/* Buy button */}
              <TouchableOpacity 
                style={{
                  backgroundColor: '#6E69F4',
                  borderRadius: 100,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  Alert.alert(
                    'Purchase Gems',
                    'Gem purchasing will be available soon! Stay tuned for updates.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={{
                  color: '#FFFFFF', 
                  fontWeight: 'bold', 
                  fontSize: 14
                }}>Buy More</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Gem balance now comes from currencyBalances state (loaded from Firebase)
  const gemBalance = currencyBalances.gems;

  // Handle gem to gold conversion
  const handleConvertGemToGold = async (gems: number) => {
    if (!user || isGuest) {
      handleGuestRestriction('gem conversion');
      return;
    }

    if (currencyBalances.gems < gems) {
      Alert.alert('Insufficient Gems', `You need ${gems} gems to make this conversion.`);
      return;
    }

    const conversionRate = 5; // 1 gem = 5 gold
    const goldToAdd = gems * conversionRate;

    try {
      // Spend gems
      await virtualCurrencyService.spendCurrency(
        user.uid,
        'gems',
        gems,
        `Gem to gold conversion: ${gems} gems → ${goldToAdd} gold`,
        {
          type: 'gem_conversion',
          gemsSpent: gems,
          goldReceived: goldToAdd,
          conversionRate,
          timestamp: new Date().toISOString()
        }
      );

      // Add gold
      await virtualCurrencyService.addCurrency(
        user.uid,
        'gold',
        goldToAdd,
        `Gem to gold conversion: ${gems} gems → ${goldToAdd} gold`,
        {
          type: 'gem_conversion',
          gemsSpent: gems,
          goldReceived: goldToAdd,
          conversionRate,
          timestamp: new Date().toISOString()
        }
      );

      Alert.alert('Conversion Successful!', `Converted ${gems} gems to ${goldToAdd} gold!`);
    } catch (error: any) {
      console.error('Failed to convert gems to gold:', error);
      Alert.alert('Conversion Failed', error.message || 'Failed to convert gems. Please try again.');
    }
  };

  // Additional state for gold currency popup
  const [showGoldPopup, setShowGoldPopup] = useState(false);
  const [sliderValue, setSliderValue] = useState(10); // Default gems to convert
  const [sliderActive, setSliderActive] = useState(false);
  
  // Animation values for gold popup
  const goldPopupOpacity = useRef(new Animated.Value(0)).current;
  const goldPopupTranslateY = useRef(new Animated.Value(50)).current;
  const sliderWidth = useRef(new Animated.Value(0)).current;
  const sliderPosition = useRef(new Animated.Value(0)).current;
  const sliderContainerWidth = useRef(0);
  
  // Conversion rate: 1 gem = 36 gold
  const conversionRate = 36;
  
  // Calculate gold to receive based on gems
  const goldToReceive = sliderValue * conversionRate;
  
  // Maximum gems that can be converted (fixed upper limit regardless of balance)
  // Use a constant value for slider range, not dependent on gem balance
  const maxSliderValue = 100; // Set a fixed maximum value for the slider
  
  // Show the gold conversion popup
  const showGoldConversionPopup = () => {
    setShowGoldPopup(true);
    setSliderValue(Math.min(10, maxSliderValue)); // Default to 10 gems
    
    Animated.parallel([
      Animated.timing(goldPopupOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(goldPopupTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  };
  
  // Hide the gold conversion popup
  const hideGoldConversionPopup = () => {
    Animated.parallel([
      Animated.timing(goldPopupOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(goldPopupTranslateY, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setShowGoldPopup(false);
    });
  };
  
  // Convert gems to gold with the current slider value
  const convertGemToGold = async () => {
    if (!user || isGuest) {
      handleGuestRestriction('gem conversion');
      return;
    }

    // Check if the user has enough gems
    if (sliderValue <= gemBalance) {
      try {
        // Use the existing handleConvertGemToGold function
        await handleConvertGemToGold(sliderValue);

        // Hide the popup
        hideGoldConversionPopup();
      } catch (error: any) {
        console.error('Failed to convert gems:', error);
        Alert.alert('Conversion Failed', 'Failed to convert gems. Please try again.');
      }
    } else {
      Alert.alert('Insufficient Gems', `You need ${sliderValue} gems to make this conversion.`);
    }
  };
  
  // Additional ref for tracking current position
  const startPositionRef = useRef(0);

  // Additional refs for tracking the slider position
  const sliderContainerRef = useRef(null);

  // Additional state to track initial touch position
  const [initialTouchX, setInitialTouchX] = useState(0);
  const [sliderContainerX, setSliderContainerX] = useState(0);

  // Set up the slider pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setSliderActive(true);
      },
      onPanResponderMove: (evt) => {
        // Get absolute touch position
        const pageX = evt.nativeEvent.pageX;
        
        // Calculate slider position relative to the container's left edge
        const relativePosition = pageX - sliderContainerX;
        
        // Ensure the position stays within bounds
        const boundedPosition = Math.max(0, Math.min(relativePosition, sliderContainerWidth.current));
        
        // Update both slider position and fill width
        sliderPosition.setValue(boundedPosition);
        sliderWidth.setValue(boundedPosition);
        
        // Calculate corresponding slider value
        const percentage = boundedPosition / sliderContainerWidth.current;
        const newValue = Math.round(percentage * maxSliderValue);
        setSliderValue(Math.max(1, Math.min(newValue, maxSliderValue)));
      },
      onPanResponderRelease: () => {
        setSliderActive(false);
      },
    })
  ).current;
  
  // Measure the slider container width and position
  const measureSliderWidth = (event: LayoutChangeEvent) => {
    const { width, x } = event.nativeEvent.layout;
    sliderContainerWidth.current = width;
    setSliderContainerX(x);
  };
  
  // Update slider position when value changes
  useEffect(() => {
    if (sliderContainerWidth.current > 0) {
      const percentage = sliderValue / maxSliderValue;
      const newPosition = percentage * sliderContainerWidth.current;
      sliderPosition.setValue(newPosition);
      sliderWidth.setValue(newPosition);
    }
  }, [sliderValue, maxSliderValue]);
  
  // Update container position when popup is shown
  useEffect(() => {
    if (showGoldPopup) {
      // Give time for layout to complete
      setTimeout(() => {
        if (sliderContainerWidth.current > 0) {
          // Reset slider value when opening popup
          const percentage = sliderValue / maxSliderValue;
          const newPosition = percentage * sliderContainerWidth.current;
          sliderPosition.setValue(newPosition);
          sliderWidth.setValue(newPosition);
        }
      }, 50);
    }
  }, [showGoldPopup]);
  
  // Update the useEffect for the automatic event timer to properly detect winners
  useEffect(() => {
    // Always run the timer, regardless of user participation
    const timer = setInterval(() => {
      setEventTimeLeft(prev => {
        const newValue = Math.max(prev - 1, 0);

        // When timer reaches zero, determine winners and reset
        if (newValue === 0) {
          // GUARANTEED WIN: If user has entered this cycle and hasn't won yet, they win
          if (hasEnteredEvent && !hasWonEvent) {
            // Use immediate state update instead of setTimeout to prevent memory leaks
            setHasWonEvent(true);
            setWonEventCycle(eventCycleCount); // Track which cycle they won in

            // Add notification
            const winAmount = calculateWinAmount();
            addEventWinNotification(winAmount);
          }

          // Reset for new cycle immediately to prevent multiple setTimeout calls
          setEventTimeLeft(180); // Reset to 3 minutes
          setEventCycleCount(prev => prev + 1); // Increment cycle count
          setEventEntries(0); // Reset event entries for the new cycle

          return 0;
        }

        return newValue;
      });
    }, 1000);

    // Clean up on unmount
    return () => {
      clearInterval(timer);
    };
  }, [hasEnteredEvent, hasWonEvent, eventCycleCount]); // Remove function dependencies to avoid hoisting issues

  // Helper function to calculate win amount
  const calculateWinAmount = () => {
    // Special case: If only one entry, refund the full entry fee
    if (eventEntries === 1) {
      return eventEntryCost; // Full refund of 100 gold
    }
    
    // Otherwise, winner gets the prize pool (70% of all entries)
    // 70% of each 100 gold entry goes to prize pool
    return Math.floor(eventEntries * eventEntryCost * 0.7);
  };

  // Update the handleEventEntry function
  const handleEventEntry = async () => {
    if (hasWonEvent) {
      // If user has won, handle claiming the prize
      await claimEventPrize();
    } else if (!hasEnteredEvent) {
      // Make sure the event isn't expired (timer at 0)
      if (eventTimeLeft <= 0) {
        Alert.alert('Event Expired', 'This event has ended. Please wait for the next one.');
        return;
      }

      if (!user || isGuest) {
        handleGuestRestriction('event entry');
        return;
      }

      // If user hasn't entered current cycle
      if (goldBalance >= eventEntryCost) {
        try {
          // Deduct entry cost using virtual currency service
          await virtualCurrencyService.spendCurrency(
            user.uid,
            'gold',
            eventEntryCost,
            `Event entry fee - Cycle ${eventCycleCount}`,
            {
              type: 'event_entry',
              eventCycle: eventCycleCount,
              entryCost: eventEntryCost,
              timestamp: new Date().toISOString()
            }
          );

          setHasEnteredEvent(true);

          // Increment entries
          const newEntryCount = eventEntries + 1;
          setEventEntries(newEntryCount);

          // Record the entry count for this event cycle
          setEventEntriesRecord(prev => ({
            ...prev,
            [eventCycleCount]: newEntryCount
          }));

          Alert.alert('Entry Successful!', `You've entered the event for ${eventEntryCost} gold!`);
        } catch (error: any) {
          console.error('Failed to enter event:', error);
          Alert.alert('Entry Failed', error.message || 'Failed to enter event. Please try again.');
        }
      } else {
        Alert.alert('Insufficient Gold', `You need ${eventEntryCost} gold to enter this event.`);
      }
    }
  };

  // Update the claimEventPrize function
  const claimEventPrize = async () => {
    if (!user || isGuest) {
      handleGuestRestriction('prize claiming');
      return;
    }

    // Get the stored number of entries from when the user won
    const entriesWhenWon = eventEntriesRecord[wonEventCycle] || 0;

    // Calculate the prize amount
    let prizeAmount = 0;

    if (entriesWhenWon === 1) {
      // Full refund case
      prizeAmount = eventEntryCost;
    } else {
      // Normal prize pool (70% of all entries)
      prizeAmount = Math.floor(entriesWhenWon * eventEntryCost * 0.7);
    }

    try {
      // Add the prize to user's gold balance using virtual currency service
      await virtualCurrencyService.addCurrency(
        user.uid,
        'gold',
        prizeAmount,
        `Event prize - Cycle ${wonEventCycle}`,
        {
          type: 'event_prize',
          eventCycle: wonEventCycle,
          entriesWhenWon,
          prizeAmount,
          timestamp: new Date().toISOString()
        }
      );

      // Reset won status to allow re-entry for next event
      setWonEventCycle(-1);
      setHasWonEvent(false);
      setHasEnteredEvent(false);

      showNotification(`Claimed ${prizeAmount} gold!`);
      Alert.alert('Prize Claimed!', `You've received ${prizeAmount} gold!`);
    } catch (error: any) {
      console.error('Failed to claim event prize:', error);
      Alert.alert('Claim Failed', error.message || 'Failed to claim prize. Please try again.');
    }
  };

  // Function to add a notification when user wins an event
  const addEventWinNotification = (winAmount: number) => {
    
    // Get the current count and increment it
    const newCount = counts.allNotifications + 1;
    
    // Update the notification count in the context
    updateAllNotificationsCount(newCount);
    
    // In a real app with proper state management, you would:
    // 1. Create a function in your NotificationContext to add a new notification
    // 2. Call that function with the notification details
    
    // For demo purposes, this will update the notification badge counter
    // which is what the user will see in the UI
  };

  // Function to show notification
  const showNotification = (message: string) => {
    // In a real app, you would use a notification system
    // For this demo, we'll just log to console
    
    // Increment notification count
    const newCount = counts.allNotifications + 1;
    updateAllNotificationsCount(newCount);
  };

  // State for Global Chat
  const [showGlobalChatModal, setShowGlobalChatModal] = useState(false);
  const [globalChatMessages, setGlobalChatMessages] = useState<GlobalChatMessage[]>([]);
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [isLoadingGlobalChat, setIsLoadingGlobalChat] = useState(false);
  const [globalChatError, setGlobalChatError] = useState<string | null>(null);

  // State for Friend Activities
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Virtual currency state moved up to be available earlier

  // Get auth and guest restrictions
  const { user, isGuest } = useAuth();
  const { canSendMessages, handleGuestRestriction } = useGuestRestrictions();

  // Calculate actual children count for layout
  const actualChildrenCount = useMemo(() => {
    let count = 0;

    // Spotlight pills (only for non-guest users)
    if (!isGuest) {
      count += 1; // Your spotlight pill (always present)
      if (showOtherPill && otherSpotlightTimeLeft > 0) {
        count += 1; // Other user's spotlight pill
      }
    }

    // Friend activity widgets (limited to 5)
    if (!isLoadingActivities && friendActivities.length > 0) {
      count += Math.min(friendActivities.length, 5);
    }

    // Fixed widgets that are always present
    count += 4; // Friend hosting, friend watching, listening music, gaming status, shop, random friends

    return count;
  }, [isGuest, showOtherPill, otherSpotlightTimeLeft, isLoadingActivities, friendActivities.length]);

  // Memoized callback for scroll content size change to prevent infinite re-renders
  const handleScrollContentSizeChange = useCallback((_width: number) => {
    // Use actual children count instead of hardcoded estimate
    handleContentLayout(actualChildrenCount * 320);
  }, [handleContentLayout, actualChildrenCount]);

  // Load virtual currency balances
  useEffect(() => {
    if (!user || isGuest) {
      setCurrencyBalances({
        gold: 0,
        gems: 0,
        tokens: 0,
        lastUpdated: new Date()
      });
      return;
    }

    let unsubscribeCurrency: (() => void) | undefined;

    const loadCurrencyBalances = async () => {
      setIsLoadingCurrency(true);
      try {
        // Get initial currency balances
        const balances = await virtualCurrencyService.getCurrencyBalances(user.uid);
        setCurrencyBalances(balances);

        // Set up real-time listener for currency changes
        unsubscribeCurrency = virtualCurrencyService.onCurrencyBalances(user.uid, (newBalances) => {
          setCurrencyBalances(newBalances);
        });
      } catch (error: any) {
        // Handle Firebase permission errors gracefully
        if (FirebaseErrorHandler.isPermissionError(error)) {
          // For permission errors, set default balances and don't log error
          setCurrencyBalances({
            gold: 1000, // Default guest balance
            gems: 50,   // Default guest balance
            tokens: 0,
            lastUpdated: new Date()
          });
        } else {
          // Log non-permission errors
          console.error('Failed to load currency balances:', error);
          FirebaseErrorHandler.logError('loadCurrencyBalances', error);
        }
      } finally {
        setIsLoadingCurrency(false);
      }
    };

    loadCurrencyBalances();

    return () => {
      if (unsubscribeCurrency) {
        unsubscribeCurrency();
      }
    };
  }, [user, isGuest]);

  // Load friend activities
  useEffect(() => {
    if (!user || isGuest) {
      setFriendActivities([]);
      return;
    }

    let unsubscribeActivities: (() => void) | undefined;

    const loadFriendActivities = async () => {
      setIsLoadingActivities(true);
      try {
        // Get initial friend activities
        const activities = await friendActivityService.getFriendActivities(user.uid);
        setFriendActivities(activities);

        // Set up real-time listener for friend activities
        unsubscribeActivities = friendActivityService.onFriendActivities(user.uid, (newActivities) => {
          setFriendActivities(newActivities);
        });
      } catch (error) {
        console.error('Failed to load friend activities:', error);
      } finally {
        setIsLoadingActivities(false);
      }
    };

    loadFriendActivities();

    return () => {
      if (unsubscribeActivities) {
        unsubscribeActivities();
      }
    };
  }, [user, isGuest]);

  // Set up global chat listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (showGlobalChatModal) {
      setIsLoadingGlobalChat(true);
      setGlobalChatError(null);

      // Only set up listener for authenticated users
      if (user) {
        // Set up real-time listener for global chat messages
        unsubscribe = firestoreService.onGlobalChatMessages((messages) => {
          setGlobalChatMessages(messages);
          setIsLoadingGlobalChat(false);
        });
      } else {
        // For guest users, just show empty state
        setGlobalChatMessages([]);
        setIsLoadingGlobalChat(false);
        setGlobalChatError('Sign in to view and send messages');
      }
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [showGlobalChatModal, user]); // Add user to dependencies

  // Handle sending global chat message
  const handleSendGlobalChatMessage = async () => {
    if (!globalChatInput.trim()) {
      return;
    }

    // Check if user can send messages (guest restriction)
    if (!canSendMessages()) {
      handleGuestRestriction('sending messages');
      return;
    }

    if (!user) {
      setGlobalChatError('You must be signed in to send messages');
      return;
    }

    const messageText = globalChatInput.trim();
    setGlobalChatInput(''); // Clear input immediately for better UX

    try {
      // Debug: Log user state
      console.log('🔐 handleSendGlobalChatMessage - User Debug:', {
        hasUser: !!user,
        isGuest: isGuest,
        userId: user?.uid,
        userEmail: user?.email,
        displayName: user?.displayName,
        photoURL: user?.photoURL
      });

      // Validate user authentication
      const userValidation = DataValidator.validateUserAuth(user);
      if (!userValidation.isValid) {
        console.error('❌ User validation failed:', userValidation.errors);
        throw new Error(userValidation.errors.join(', '));
      }

      // Create message data with safe defaults
      const messageData = {
        senderId: user.uid,
        senderName: DataValidator.createSafeDisplayName(user),
        text: messageText,
        type: 'text' as const,
        senderAvatar: DataValidator.createSafeAvatarUrl(user)
      };

      // Debug: Log message data before validation
      console.log('📝 handleSendGlobalChatMessage - Message Data:', messageData);

      // Validate the complete message data
      const messageValidation = DataValidator.validateGlobalChatMessage(messageData);
      if (!messageValidation.isValid) {
        console.error('❌ Message validation failed:', messageValidation.errors);
        throw new Error(messageValidation.errors.join(', '));
      }

      // Debug: Log sanitized data
      console.log('✅ handleSendGlobalChatMessage - Sanitized Data:', messageValidation.sanitizedData);

      // Send the sanitized message data
      console.log('🚀 handleSendGlobalChatMessage - Calling firestoreService...');
      await firestoreService.sendGlobalChatMessage(messageValidation.sanitizedData!);
      console.log('✅ handleSendGlobalChatMessage - Message sent successfully!');
      setGlobalChatError(null);
    } catch (error: any) {
      // Restore the input text if sending failed
      setGlobalChatInput(messageText);

      const errorInfo = FirebaseErrorHandler.handleError(error);
      setGlobalChatError(errorInfo.userFriendlyMessage);

      console.error('Failed to send global chat message:', error);
    }
  };

  // Add these lines for handle swipe gesture:
  // Pan responder for swiping down the chat modal
  const chatPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward gestures
        return gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        // If user swiped down more than 50px, close the modal
        if (gestureState.dy > 50) {
          setShowGlobalChatModal(false);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If user swiped down more than 50px, close the modal
        if (gestureState.dy > 50) {
          setShowGlobalChatModal(false);
        }
      },
    })
  ).current;

  // Render the Global Chat button
  const renderGlobalChatButton = () => {
    return (
      <View style={{position: 'relative', marginBottom: 16}}>
        <TouchableOpacity 
          onPress={() => setShowGlobalChatModal(true)}
          activeOpacity={0.7}
          style={[styles.minimalEventContainer, {
            backgroundColor: '#1C1D23',
            paddingVertical: 14,
            paddingHorizontal: 16
          }]}
        >
          <View style={{
            flexDirection: 'row', 
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%'
          }}>
            {/* Left side - Title and icon */}
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons 
                name="chat" 
                size={20} 
                color="#4CAF50" 
                style={{marginRight: 8}}
              />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 'bold',
              }}>Global Chat</Text>
            </View>
            
            {/* Right side */}
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons 
                name="arrow-up" 
                size={20} 
                color="rgba(255,255,255,0.5)" 
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Global Chat Modal
  const renderGlobalChatModal = () => {
    return (
      <Modal
        visible={showGlobalChatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGlobalChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          {/* No touchable overlay to prevent dismissing when tapping outside */}
          <View style={styles.globalChatContainer}>
            {/* Swipeable area that includes both handle and header */}
            <View {...chatPanResponder.panHandlers} style={styles.swipeableArea}>
              {/* Handle for pulling down */}
              <View style={styles.globalChatHandle} />
              
              {/* Chat Header */}
              <View style={styles.globalChatHeader}>
                <Text style={styles.globalChatTitle}>Global Chat</Text>
                <TouchableOpacity onPress={() => setShowGlobalChatModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Chat Messages */}
            <ScrollView
              style={styles.chatMessagesContainer}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingGlobalChat ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
              ) : globalChatMessages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="chat-outline" size={48} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to start the conversation!</Text>
                </View>
              ) : (
                globalChatMessages.map((message) => (
                  <View key={message.id} style={styles.chatMessageContainer}>
                    <View style={[styles.chatAvatarContainer, {backgroundColor: '#6E69F4'}]}>
                      {message.senderAvatar ? (
                        <Image
                          source={{ uri: message.senderAvatar }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <MaterialCommunityIcons name="account" size={24} color="#FFF" />
                      )}
                    </View>
                    <View style={styles.chatMessageContent}>
                      <View style={styles.chatMessageHeader}>
                        <Text style={styles.chatMessageSender}>{message.senderName}</Text>
                        <Text style={styles.chatMessageTime}>
                          {message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Now'}
                        </Text>
                      </View>
                      <Text style={styles.chatMessageText}>{message.text}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            
            {/* Error Message */}
            {globalChatError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{globalChatError}</Text>
                <TouchableOpacity onPress={() => setGlobalChatError(null)}>
                  <MaterialCommunityIcons name="close" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}

            {/* Chat Input */}
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder={isGuest ? "Sign in to send messages" : "Type a message..."}
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={globalChatInput}
                onChangeText={setGlobalChatInput}
                multiline
                maxLength={500}
                editable={!isGuest}
                onSubmitEditing={handleSendGlobalChatMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!globalChatInput.trim() || isGuest) && styles.sendButtonDisabled
                ]}
                onPress={handleSendGlobalChatMessage}
                disabled={!globalChatInput.trim() || isGuest}
              >
                <MaterialCommunityIcons
                  name="send"
                  size={24}
                  color={(!globalChatInput.trim() || isGuest) ? "rgba(76, 175, 80, 0.3)" : "#4CAF50"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <CommonHeader 
          title="Home" 
          rightIcons={[
            {
              name: 'logout',
              color: '#FFFFFF',
              onPress: async () => {
                try {
                  await authService.signOut();
                  router.replace('/auth');
                } catch (error) {
                  console.error('Sign out error:', error);
                }
              }
            }
          ]}
        />
        <TouchableOpacity 
          style={styles.goldBalanceContainer}
          onPress={showGoldConversionPopup}
        >
          <MaterialCommunityIcons name="gold" size={18} color="#FFD700" />
          <Text style={styles.goldBalanceText}>{goldBalance}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Gold Conversion Popup Modal */}
      <Modal
        visible={showGoldPopup}
        transparent
        animationType="none"
        onRequestClose={hideGoldConversionPopup}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={hideGoldConversionPopup}
          />
          
          <Animated.View 
            style={[
              styles.goldPopupContainer,
              {
                transform: [{ translateY: goldPopupTranslateY }],
                opacity: goldPopupOpacity,
              }
            ]}
          >
            <View style={styles.goldPopupHandle} />
            
            <LinearGradient
              colors={['#1C1D23', '#232429']}
              style={styles.goldPopupContent}
            >
              <Text style={styles.goldPopupTitle}>Convert Gems to Gold</Text>
              
              <View style={styles.conversionContainer}>
                <LinearGradient
                  colors={['rgba(16, 17, 28, 0.8)', 'rgba(33, 34, 46, 0.8)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.balanceCardsContainer}
                >
                  <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Gems</Text>
                    <Text style={styles.balanceValue}>{gemBalance}</Text>
                  </View>
                  
                  <View style={styles.balanceSeparator} />
                  
                  <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Gold</Text>
                    <Text style={styles.balanceValue}>{goldBalance}</Text>
                  </View>
                </LinearGradient>
                
                <View style={styles.receiveContainer}>
                  <Text style={styles.receiveLabel}>You'll receive</Text>
                  <Text style={styles.receiveValue}>{goldToReceive}</Text>
                </View>
              </View>

              <View style={styles.sliderSection}>
                <View 
                  ref={sliderContainerRef}
                  style={styles.sliderContainer}
                  onLayout={measureSliderWidth}
                >
                  <View style={styles.sliderBackground} />
                  <Animated.View 
                    style={[
                      styles.sliderFill,
                      { width: sliderWidth }
                    ]}
                  />
                  <Animated.View 
                    style={[
                      styles.sliderHandle,
                      sliderActive && styles.sliderHandleActive,
                      { transform: [{ translateX: sliderPosition }] }
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <View style={styles.handleInner}>
                      <MaterialCommunityIcons 
                        name="diamond-stone" 
                        size={14} 
                        color="#FFFFFF" 
                      />
                    </View>
                  </Animated.View>
                </View>
                
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderMinLabel}>1</Text>
                  <Text style={styles.sliderValueLabel}>{sliderValue}</Text>
                  <Text style={styles.sliderMaxLabel}>{maxSliderValue}</Text>
                </View>
              </View>
              
              <View style={styles.convertButtonContainer}>
                <TouchableOpacity 
                  style={[
                    styles.convertButton,
                    sliderValue > gemBalance && styles.convertButtonDisabled
                  ]}
                  onPress={convertGemToGold}
                  disabled={sliderValue > gemBalance}
                >
                  <LinearGradient
                    colors={sliderValue > gemBalance ? 
                      ['#35383F', '#35383F'] : 
                      ['#6B7CFF', '#8166FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.convertButtonGradient}
                  >
                    <Text style={styles.convertButtonText}>Convert Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      <ScrollableContentContainer
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Guest Mode Indicator */}
        <GuestModeIndicator showUpgradePrompt={true} />

        {/* Combined Spotlight and Live Activity Widgets */}
        <View style={styles.scrollContainer} onLayout={handleContainerLayout}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
            style={styles.horizontalWidgetContainer}
            onContentSizeChange={handleScrollContentSizeChange}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            bounces={true}
            decelerationRate="normal"
          >
            {/* Spotlight pills - Hidden for guest users */}
            {!isGuest && (
              <>
                {/* Your Spotlight pill - always visible */}
                <View style={styles.pillContainer}>
                  <TouchableOpacity
                    style={[
                      styles.squareWidget,
                      yourSpotlightTimeLeft > 0 ? styles.activeWidget : styles.inactiveWidget,
                      yourSpotlightTimeLeft > 0 && styles.activeShadow,
                      yourSpotlightTimeLeft > 0 && yourAnimatedShadowStyle
                    ]}
                    onPress={() => openSpotlightModal()}
                    activeOpacity={0.9}
                  >
                    {/* Progress bar positioned absolutely inside */}
                    {yourSpotlightTimeLeft > 0 && (
                      <SpotlightProgressBar
                        width={80} // Explicitly use squareWidget width
                        height={110} // Explicitly use squareWidget height
                        borderRadius={16} // Explicitly use squareWidget borderRadius
                        progress={Math.min(1, yourSpotlightTimeLeft / 300)} // 5 min default
                        color="#34C759" // NEO_GREEN
                        strokeWidth={2.5} // Slightly smaller for the pill
                        glowIntensity={2}
                      />
                    )}
                    {/* Content with higher zIndex */}
                    <View style={styles.pillContentWrapper}>
                    <View style={[
                      styles.avatarContainer,
                      { borderColor: yourSpotlightTimeLeft > 0 ? '#4CAF50' : 'transparent' }
                    ]}>
                      <Image source={{ uri: profileImage || defaultSpotlightAvatar }} style={styles.gridAvatar} />
                    </View>
                    <Text style={styles.nameLabel}>You</Text>
                    <Text style={yourSpotlightTimeLeft > 0 ? styles.statusLabel : styles.statusLabelInactive}>
                      Spotlight
                    </Text>
                    {yourSpotlightTimeLeft > 0 && (
                      <Text style={styles.timerLabel}>{formatTime(yourSpotlightTimeLeft)}</Text>
                    )}
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {/* Random user boosting pill - Hidden for guest users */}
            {!isGuest && showOtherPill && otherSpotlightTimeLeft > 0 && (
              <View style={styles.pillContainer}>
                <TouchableOpacity
                  style={[
                    styles.squareWidget,
                    styles.activeWidget,
                    otherSpotlightTimeLeft > 0 && styles.otherActiveShadow,
                    otherSpotlightTimeLeft > 0 && otherAnimatedShadowStyle
                  ]}
                  onPress={() => { /* TODO: Implement boost other functionality */ }}
                  activeOpacity={0.9}
                >
                  {/* Progress bar positioned absolutely inside */}
                  <SpotlightProgressBar
                    width={80} // Explicitly use squareWidget width
                    height={110} // Explicitly use squareWidget height
                    borderRadius={16} // Explicitly use squareWidget borderRadius
                    progress={Math.min(1, otherSpotlightTimeLeft / 300)} // 5 min default
                    color="#FFC107" // Yellow to match their theme
                    strokeWidth={2.5} // Slightly smaller for the pill
                    glowIntensity={2}
                  />
                  {/* Content with higher zIndex */}
                  <View style={styles.pillContentWrapper}>
                    <View style={[styles.avatarContainer, { borderColor: '#FFC107' }]}>
                    <Image source={{ uri: otherSpotlightCandidate.avatar }} style={styles.gridAvatar} />
                  </View>
                  <Text style={styles.nameLabel}>{otherSpotlightCandidate.name}</Text>
                  <Text style={styles.statusLabel}>Spotlight</Text>
                  <Text style={styles.timerLabel}>{formatTime(otherSpotlightTimeLeft)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            {/* Friend hosting widget */}
            {renderFriendHostingLive()}
            {/* Friend watching widget */}
            {renderFriendWatchingLive()}
            {/* Listening music widget */}
            {renderFriendListeningMusic()}
            {/* Gaming status widget */}
            {renderGamingStatusWidget()}
            {/* Shop widget */}
            {renderShopWidget()}
            {/* Other random friend widgets */}
            {renderRandomFriendWidgets()}
          </ScrollView>
        </View>
        
        {/* New Minimal Event Widget */}
        {renderMinimalEventWidget()}
        
        {/* New Minimal Gems Widget */}
        {renderMinimalGemsWidget()}
        
        {/* Global Chat Button */}
        {renderGlobalChatButton()}

        {/* LiveStream Grid Section */}
        <LiveStreamGrid />
      </ScrollableContentContainer>
      
      {/* Spotlight management modal */}
      <Modal visible={spotlightModalVisible} transparent animationType="slide">
        <View style={styles.spotlightModalOverlay}>
          <View style={styles.spotlightModalContent}>
            <Text style={styles.spotlightModalTitle}>Manage Your Spotlight</Text>
            <TouchableOpacity 
              style={styles.goldBalanceContainer}
              onPress={showGoldConversionPopup}
            >
              <MaterialCommunityIcons name="gold" size={18} color="#FFD700" />
              <Text style={styles.goldBalanceText}>{goldBalance}</Text>
            </TouchableOpacity>
            <Text style={styles.spotlightModalSubtitle}>Select Duration</Text>
            <TouchableOpacity style={styles.spotlightOption} onPress={() => purchaseSpotlight(2, 5)}>
              <Text style={[styles.spotlightOptionText, goldBalance < 5 && styles.disabledOption]}>
                2 Minutes — 5 Gold
              </Text>
              {goldBalance < 5 && (
                <Text style={styles.insufficientText}>Insufficient Balance</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.spotlightOption} onPress={() => purchaseSpotlight(5, 10)}>
              <Text style={[styles.spotlightOptionText, goldBalance < 10 && styles.disabledOption]}>
                5 Minutes — 10 Gold
              </Text>
              {goldBalance < 10 && (
                <Text style={styles.insufficientText}>Insufficient Balance</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.spotlightOption} onPress={() => purchaseSpotlight(10, 18)}>
              <Text style={[styles.spotlightOptionText, goldBalance < 18 && styles.disabledOption]}>
                10 Minutes — 18 Gold
              </Text>
              {goldBalance < 18 && (
                <Text style={styles.insufficientText}>Insufficient Balance</Text>
              )}
            </TouchableOpacity>
            {spotlightQueuePosition > 0 && (
              <Text style={styles.spotlightQueueText}>Your queue position: {spotlightQueuePosition}</Text>
            )}
            <TouchableOpacity style={styles.spotlightCloseButton} onPress={closeSpotlightModal}>
              <Text style={styles.spotlightCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Activity Modal */}
      <ActivityModal
        visible={activityModalVisible}
        onClose={closeActivityModal}
        activityType={selectedActivity.type}
        streamId={selectedActivity.streamId}
        title={selectedActivity.title}
        subtitle={selectedActivity.subtitle}
        hostName={selectedActivity.hostName}
        hostAvatar={selectedActivity.hostAvatar}
        viewerCount={selectedActivity.viewerCount}
        avatars={selectedActivity.avatars}
        friendName={selectedActivity.friendName}
        friendAvatar={selectedActivity.friendAvatar}
        fuelRequired={15}
        fuelAvailable={20}
      />
      
      {/* Add Global Chat Modal */}
      {renderGlobalChatModal()}
      
      {/* Firebase Connection Test */}
      <FirebaseTest />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  header: {
    position: 'relative',
    width: '100%',
  },
  goldBalanceContainer: {
    position: 'absolute',
    right: 16,
    top: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  goldBalanceText: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 29, 35, 0.8)',
    borderRadius: 25,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  coinIcon: {
    marginRight: 4,
  },
  balanceText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  plusButton: {
    backgroundColor: '#6E69F4',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  content: {
    padding: 16,
  },
  
  // Horizontal Widgets Container
  horizontalWidgetContainer: {
    marginBottom: 16,
    marginRight: -16,
    paddingRight: 16,
    overflow: 'visible',
    paddingVertical: 6,
  },
  
  // Live Stream Widget Styles
  liveStreamContainer: {
    height: 110,
    width: 320,
    backgroundColor: '#1D1E26',
    borderRadius: 16,
    marginRight: 12,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    transform: [
      { perspective: 1000 },
      { translateY: 2 },
    ],
  },
  avatarGrid: {
    width: 96,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'center',
    marginRight: 10,
    height: 90,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4B8BFF',
    overflow: 'hidden',
    marginBottom: 10,
  },
  avatarWrapperRed: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF4B4B',
    overflow: 'hidden',
    margin: 3,
  },
  gridAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  plusMoreContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(67, 71, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4B8BFF',
    margin: 3,
  },
  plusMoreContainerRed: {
    borderColor: '#FF4B4B',
  },
  plusMoreText: {
    color: '#4B8BFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  plusMoreTextRed: {
    color: '#FF4B4B',
  },
  streamInfoContainer: {
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  streamTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  viewersText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  broadcasterContainerWrapper: {
    width: 52,
    height: 52,
    marginLeft: 4,
    justifyContent: 'center',
    overflow: 'visible',
  },
  broadcasterContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    position: 'relative',
    overflow: 'visible',
  },
  broadcasterContainerRed: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF4B4B',
    position: 'relative',
    overflow: 'visible',
  },
  broadcasterAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  broadcasterAvatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF5252',
    position: 'relative',
    overflow: 'visible',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#4CAF50',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1D1E26',
    zIndex: 10,
  },
  liveIndicatorRed: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#FF4B4B',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1D1E26',
    zIndex: 10,
  },
  
  // Music Streaming Widget Styles
  musicStreamContainer: {
    height: 106,
    width: 280,
    backgroundColor: '#1D1E26',
    borderRadius: 16,
    marginRight: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    transform: [
      { perspective: 1000 },
      { translateY: 2 },
    ],
  },
  musicContentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArtContainer: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#2D2E38',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  songInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  artistName: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  musicFriendContainer: {
    marginLeft: 10,
    overflow: 'visible',
  },
  musicAvatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1DB954',
    position: 'relative',
    overflow: 'visible',
  },
  musicAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  musicIndicator: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#1DB954',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1D1E26',
    zIndex: 10,
  },
  musicInfoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  musicFriendName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  musicStatusText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  
  // Event Widget Styles
  tournamentContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1D1E26',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  eventContent: {
    padding: 12,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventProgressTrack: {
    height: 3,
    backgroundColor: '#2D2E38',
    borderRadius: 1.5,
    marginBottom: 14,
    overflow: 'hidden',
  },
  eventProgressFill: {
    height: '100%',
    width: '25%',
    backgroundColor: '#FFD700',
    borderRadius: 1.5,
  },
  eventInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  eventInfoBox: {
    flex: 1,
    backgroundColor: '#2D2E38',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
    minHeight: 60,
  },
  prizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventCoinIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
    marginRight: 3,
  },
  eventInfoValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  eventInfoLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  enterButton: {
    backgroundColor: '#FFD700',
    borderRadius: 100,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterButtonText: {
    color: '#1D1E26',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Completely Redesigned Gems Widget Styles
  gemsCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 0,
  },
  gemsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  gemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 6,
    marginRight: 10,
  },
  activeBadge: {
    backgroundColor: '#B768FB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  buyButton: {
    backgroundColor: '#6E69F4',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  
  // Content area
  gemsContent: {
    padding: 16,
  },
  
  // Daily gems row (more subtle, informational)
  gemsDailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  gemsValueLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  gemsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyGemsValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 4,
  },
  renewalBadge: {
    backgroundColor: 'rgba(183, 104, 251, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  renewalText: {
    color: '#B768FB',
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Available balance (highlighted as most important)
  availableBalanceContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  availableBalanceLabel: {
    fontSize: 12,
    color: '#B768FB',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  availableBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableBalanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 10,
  },
  gemIconBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Existing styles for Announcement and Mentions cards
  announcementCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badgeContainer: {
    backgroundColor: '#F23535',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 8,
  },
  messageAvatar: {
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageTime: {
    color: '#8E8E93',
    fontSize: 12,
  },
  messageUsername: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 4,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  showMoreButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  mentionsCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 24,
    padding: 16,
  },
  // Add offline indicator style
  offlineIndicator: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#666666',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1D1E26',
    zIndex: 10,
  },
  scrollContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'visible',
  },
  // Friend section styles
  friendSectionContainer: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  friendSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  friendSectionScroll: {
    flexDirection: 'row',
  },
  pillContainer: {
    marginRight: 14,
    justifyContent: 'center',
    height: 110,
    display: 'flex',
    alignItems: 'center',
  },
  squareWidget: {
    backgroundColor: "#1D1E26",
    borderRadius: 16,
    width: 80,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    borderWidth: 0,
    position: 'relative',
  },
  activeShadow: {
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 12,
  },
  otherActiveShadow: {
    shadowColor: "#FFC107",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 12,
  },
  pillContentWrapper: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: "#1D1E26",
    borderRadius: 11,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
    textAlign: "center",
  },
  statusLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "500",
    opacity: 0.7,
  },
  statusLabelInactive: {
    color: "#555555",
    fontSize: 10,
    fontWeight: "500",
    opacity: 0.6,
  },
  timerLabel: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "400",
    marginTop: 2,
    opacity: 0.7,
  },
  disabledOption: {
    color: 'rgba(255,255,255,0.4)',
  },
  insufficientText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 2,
  },
  insufficientGemsText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  spotlightWrapper: {
    width: 320,
    height: 110,
    position: 'relative',
    marginRight: 12,
  },
  spotlightContainer: {
    backgroundColor: "#1A1B22",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    position: 'absolute', 
    top: 0, 
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  spotlightAvatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    zIndex: 3,
  },
  spotlightAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  spotlightIndicator: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#FFC107',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1D1E26',
    zIndex: 4,
  },
  spotlightInfo: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 3,
  },
  spotlightTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  spotlightTimer: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
  },
  spotlightModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotlightModalContent: {
    width: '80%',
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  spotlightModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  spotlightModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  spotlightOption: {
    width: '100%',
    paddingVertical: 12,
    marginVertical: 4,
    backgroundColor: '#2D2E38',
    borderRadius: 8,
    alignItems: 'center',
  },
  spotlightOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  spotlightQueueText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
    fontSize: 14,
  },
  spotlightCloseButton: {
    marginTop: 16,
  },
  spotlightCloseText: {
    color: '#FFD700',
    fontSize: 16,
  },
  activeWidget: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.7,
    elevation: 6,
  },
  inactiveWidget: {
    opacity: 0.7,
  },
  actionCircle: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(54, 57, 63, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 10,
  },
  eventHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  minimalEventContainer: {
    backgroundColor: '#1D1E26',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  minimalEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  minimalProgressContainer: {
    width: '100%',
    height: 4,
    marginBottom: 10,
  },
  minimalProgressTrack: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D2E38',
    borderRadius: 2,
    position: 'relative',
  },
  minimalProgressFill: {
    height: '100%',
    backgroundColor: '#FFC107',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  minimalEventContent: {
    paddingTop: 10,
    paddingBottom: 5,
  },
  tutorialBubble: {
    position: 'absolute',
    top: -48,
    left: 16,
    backgroundColor: '#6E69F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 100,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  minimizeBubble: {
    top: 10, // Position the minimize tutorial differently
    right: 16,
    left: 'auto',
  },
  tutorialText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  tutorialArrow: {
    position: 'absolute',
    bottom: -8,
    left: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#6E69F4',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  goldPopupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  goldPopupContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  goldPopupHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 10,
  },
  goldPopupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  conversionContainer: {
    marginBottom: 32,
  },
  balanceCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  balanceCard: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#9BA1A6',
    fontSize: 15,
    marginBottom: 8,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  balanceSeparator: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12,
  },
  receiveContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  receiveLabel: {
    color: '#9BA1A6',
    fontSize: 14,
    marginBottom: 4,
  },
  receiveValue: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: 'bold',
  },
  sliderSection: {
    marginBottom: 36,
  },
  sliderContainer: {
    height: 36,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sliderBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    backgroundColor: '#6E69F4',
    borderRadius: 4,
  },
  sliderHandle: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6E69F4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginLeft: -18,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  handleInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8166FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderHandleActive: {
    transform: [{ scale: 1.1 }],
    borderColor: '#FFFFFF',
  },
  sliderHandleDisabled: {
    backgroundColor: '#6E6E6E',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  handleInnerDisabled: {
    backgroundColor: '#888888',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderMinLabel: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  sliderValueLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sliderMaxLabel: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  convertButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  convertButtonDisabled: {
    opacity: 0.5,
  },
  convertButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  convertButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  convertButtonContainer: {
    marginTop: 16,
  },
  sliderFillDisabled: {
    backgroundColor: '#6E6E6E',
    opacity: 0.6,
  },
  eventContainerGlow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
    borderColor: '#FFD700',
    borderWidth: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  costText: {
    color: '#1D1E26',
    fontSize: 14,
    fontWeight: 'bold',
  },
  claimButton: {
    backgroundColor: '#34C759', // Green for claim button
  },
  enteredButton: {
    backgroundColor: '#999', // Grey when already entered
  },
  disabledButton: {
    backgroundColor: '#555', // Darker grey when disabled
    opacity: 0.7,
  },
  // Global Chat styles
  globalChatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    backgroundColor: '#1A1B22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  globalChatHandle: {
    width: 60,
    height: 5,
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 14,
    // Add shadow to make it more visible
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  globalChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  globalChatTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatMessagesContainer: {
    flex: 1,
    padding: 15,
  },
  chatMessageContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  chatMessageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#6E69F4', // Example color for avatar background
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatMessageContent: {
    flex: 1,
    backgroundColor: '#2D2E38',
    borderRadius: 12,
    padding: 12,
    borderTopLeftRadius: 0,
  },
  chatMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chatMessageSender: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  chatMessageTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  chatMessageText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#2D2E38',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#FFFFFF',
    marginRight: 10,
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeableArea: {
    width: '100%',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    flex: 1,
  },
});

export default HomeScreen; 