import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, Pressable, Modal, Platform, FlatList } from 'react-native';
import { Text, Avatar, Button, Badge, ProgressBar } from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import * as Sensors from 'expo-sensors';
import CommonHeader from '../components/CommonHeader';
import ActivityModal from '../components/ActivityModal';
import UserStatusIndicator from '../components/UserStatusIndicator';
import { useUserStatus, StatusType, getStatusColor } from '../context/UserStatusContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useLiveStreams, LiveStream } from '../context/LiveStreamContext';

const LiveScreen = () => {
  const router = useRouter();
  const [spotlightModalVisible, setSpotlightModalVisible] = useState(false);
  const [inSpotlightQueue, setInSpotlightQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(2);
  const [showSpotlightedUser, setShowSpotlightedUser] = useState(true); // Show spotlighted user initially
  
  // Get user status from context
  const { userStatus } = useUserStatus();
  // Get profile information from UserProfileContext
  const { profileImage } = useUserProfile();
  // Get LiveStream context data
  const { streams, featuredStreams, friendStreams, joinStream } = useLiveStreams();

  // Use profile image from context instead of hardcoded one
  const userProfileImage = profileImage || 'https://randomuser.me/api/portraits/men/32.jpg';
  
  // New spotlight queue state
  const [spotlightQueue, setSpotlightQueue] = useState<{name: string, avatar: string, duration: number}[]>([
    { name: 'Michael', avatar: 'https://randomuser.me/api/portraits/men/75.jpg', duration: 180 },
    { name: 'Jessica', avatar: 'https://randomuser.me/api/portraits/women/85.jpg', duration: 120 }
  ]);
  
  // Current spotlighted user
  const [currentSpotlight, setCurrentSpotlight] = useState({
    name: 'Sophia',
    avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
    duration: 261 // 4:21 in seconds
  });
  
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
    streamId: '',
    livestreamData: {
      streamId: '1',
      title: 'Untitled Stream',
      hostName: 'Host',
      hostAvatar: '',
      viewCount: '0',
      hostCount: '1'
    },
  });
  
  // Timer state for the spotlight countdown
  const [remainingTime, setRemainingTime] = useState(currentSpotlight.duration);
  const [percentage, setPercentage] = useState(100);
  const initialTime = useRef(currentSpotlight.duration);
  const timer = useRef<NodeJS.Timeout | null>(null);
  
  // Continuous animation phase refs (moved outside the component to persist)
  const animationPhaseRef = useRef({
    phase1: 0,
    phase2: Math.PI / 4,
    phase3: Math.PI * 1.5,
    lastTimestamp: 0
  });

  // Move to next spotlighted user
  const moveToNextSpotlightUser = useCallback(() => {
    // If there are users in queue, move to next one
    if (spotlightQueue.length > 0) {
      // Get the next user in queue
      const nextUser = spotlightQueue[0];
      
      // Update current spotlight
      setCurrentSpotlight(nextUser);
      
      // Reset timer
      initialTime.current = nextUser.duration;
      setRemainingTime(nextUser.duration);
      setPercentage(100);
      
      // Remove user from queue
      setSpotlightQueue(prev => prev.slice(1));
      
      // Update queue positions for users in spotlight queue
      if (inSpotlightQueue) {
        setQueuePosition(prev => Math.max(1, prev - 1));
      }
    } else {
      // No users in queue, hide spotlight
      setShowSpotlightedUser(false);
    }
  }, [spotlightQueue, inSpotlightQueue]);

  // Start the countdown animation when component mounts or when currentSpotlight changes
  useEffect(() => {
    // Clear existing timer if it exists
    if (timer.current) {
      clearInterval(timer.current);
    }
    
    // Start the timer
    timer.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer.current!);
          
          // Move to next user in queue
          moveToNextSpotlightUser();
          return 0;
        }
        
        // Calculate new percentage based on remaining time
        const newPercentage = (prev - 1) / initialTime.current * 100;
        setPercentage(newPercentage);
        return prev - 1;
      });
    }, 1000);

    // Cleanup timer on unmount
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, [currentSpotlight, moveToNextSpotlightUser]);
  
  // Join spotlight queue function
  const joinSpotlightQueue = (duration: number) => {
    // Add current user to queue with proper information
    const yourSpotlight = {
      name: 'Your Profile',
      avatar: userProfileImage, // Use the current profile image from context
      duration
    };
    
    // Add user to queue
    setSpotlightQueue(prev => [...prev, yourSpotlight]);
    setInSpotlightQueue(true);
    setQueuePosition(spotlightQueue.length + 1);
    setSpotlightModalVisible(false);
  };
  
  // Check if the current spotlighted user is you
  const isCurrentUserSpotlighted = currentSpotlight.name === 'Your Profile';
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle pressing on an activity widget
  const handleActivityPress = (
    type: 'watching' | 'hosting' | 'listening' | 'tournament',
    data: {
      title: string;
      subtitle?: string;
      hostName?: string;
      hostAvatar?: string;
      viewerCount?: number;
      avatars?: string[];
      friendName?: string;
      friendAvatar?: string;
      streamId?: string;
    }
  ) => {
    // Set selected activity data
    setSelectedActivity({
      type,
      title: data.title,
      subtitle: data.subtitle || '',
      hostName: data.hostName || '',
      hostAvatar: data.hostAvatar || '',
      viewerCount: data.viewerCount || 0,
      avatars: data.avatars || [],
      friendName: data.friendName || '',
      friendAvatar: data.friendAvatar || '',
      streamId: data.streamId || '',
      livestreamData: {
        streamId: data.streamId || '1',
        title: data.title || 'Untitled Stream',
        hostName: data.hostName || 'Host',
        hostAvatar: data.hostAvatar || '',
        viewCount: (data.viewerCount || 0).toString(),
        hostCount: (data.avatars?.length || 1).toString()
      }
    });
    
    // Show modal
    setActivityModalVisible(true);
  };

  // Navigate to live stream view screen
  const navigateToLiveStreamView = (stream: LiveStream) => {
    // Provide haptic feedback if available
    if (Platform.OS === 'ios' && require('expo-haptics')) {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('Haptics not available');
      }
    }
    
    // Join the stream in the LiveStreamContext
    joinStream(stream.id);
    
    // Mock profile views - in a real app this would come from the profile context
    const mockProfileViews = Math.floor(Math.random() * 2000) + 500; // Random number between 500-2500
    
    // Navigate to stream view with parameters
    router.push({
      pathname: '/livestream',
      params: {
        streamId: stream.id,
        title: stream.title || 'Untitled Stream',
        hostName: stream.hosts[0].name,
        hostAvatar: stream.hosts[0].avatar,
        viewCount: stream.views.toString(),
        hostCount: stream.hosts.length.toString(),
        profileViews: mockProfileViews.toString(),
      }
    });
  };

  // Close the activity modal
  const closeActivityModal = () => {
    setActivityModalVisible(false);
  };
  
  // Circular progress component for spotlight
  const CircularProgress = ({ percentage }: { percentage: number }) => {
    const size = 56; // Size for circular progress around avatar
    const strokeWidth = 3; // Slightly thinner stroke for smaller design
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <Svg width={size} height={size} style={styles.circularProgress}>
        <Circle
          stroke="#34C759" // Green color
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
        />
      </Svg>
    );
  };
  
  // Water animation component with pure imperative animation (no React state updates)
  const WaterFlowAnimation = ({ 
    progress, 
    colors = ['#34C759', '#206E3E'] 
  }: { 
    progress: number;
    colors?: string[];
  }) => {
    // Create refs for SVG paths that will be directly manipulated (using correct types)
    const path1Ref = useRef<any>(null);
    const path2Ref = useRef<any>(null);
    const path3Ref = useRef<any>(null);
    
    // Create animation frame ref
    const animFrameRef = useRef<number | null>(null);
    
    // Use the external animation phase ref to maintain continuous animation
    const phaseRef = animationPhaseRef.current;
    
    // Create wave path using pure JS (not React state)
    const createWavePath = useCallback((phase: number, baseHeight: number, amplitude: number, frequency: number): string => {
      const width = 100;
      const height = baseHeight;
      
      // Start the path below the view to avoid visible gaps
      let path = `M -5 105`;
      
      // Create the wave effect with lots of points for ultra-smooth curve
      for (let x = -5; x <= width + 5; x += 0.2) { // More points for smoother curve
        const y = 100 - height + Math.sin(x / frequency + phase) * amplitude;
        path += ` L ${x} ${y}`;
      }
      
      // Close the path by extending beyond the visible area
      path += ` L ${width + 5} 105 L -5 105 Z`;
      return path;
    }, []);
    
    // This effect sets up the animation loop and directly manipulates the DOM
    useEffect(() => {
      // Initial animation timestamp reference
      let lastTimestamp = 0;
      
      // Animation function that updates SVG paths directly without React re-renders
      const animate = (timestamp: number) => {
        if (!lastTimestamp) {
          lastTimestamp = timestamp;
        }
        
        // Calculate time delta (smoother animation)
        const deltaTime = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        
        // Update phases with continuous movement (never resetting)
        // Use very small increments for smooth movement
        phaseRef.phase1 = (phaseRef.phase1 + deltaTime * 0.3) % (2 * Math.PI);
        phaseRef.phase2 = (phaseRef.phase2 + deltaTime * 0.2) % (2 * Math.PI);
        phaseRef.phase3 = (phaseRef.phase3 + deltaTime * 0.25) % (2 * Math.PI);
        
        // Directly update the SVG path attributes without React state
        // Using setNativeProps for direct DOM manipulation without re-renders
        if (path1Ref.current) {
          path1Ref.current.setNativeProps({
            d: createWavePath(phaseRef.phase1, progress, 3, 12)
          });
        }
        if (path2Ref.current) {
          path2Ref.current.setNativeProps({
            d: createWavePath(phaseRef.phase2, Math.max(0, progress - 5), 2.5, 8)
          });
        }
        if (path3Ref.current) {
          path3Ref.current.setNativeProps({
            d: createWavePath(phaseRef.phase3, Math.max(0, progress - 2), 1, 6)
          });
        }
        
        // Continue animation loop
        animFrameRef.current = requestAnimationFrame(animate);
      };
      
      // Start animation
      animFrameRef.current = requestAnimationFrame(animate);
      
      // Cleanup animation frame on unmount
      return () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    }, [progress, createWavePath]);

    return (
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 14 }]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors[0]} stopOpacity="0.9" />
              <Stop offset="1" stopColor={colors[1]} stopOpacity="0.95" />
            </SvgLinearGradient>
            <SvgLinearGradient id="waterGradient2" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors[0]} stopOpacity="0.7" />
              <Stop offset="1" stopColor={colors[1]} stopOpacity="0.8" />
            </SvgLinearGradient>
            <SvgLinearGradient id="waterGradient3" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors[0]} stopOpacity="0.5" />
              <Stop offset="1" stopColor={colors[1]} stopOpacity="0.6" />
            </SvgLinearGradient>
          </Defs>
          
          {/* Main wave layer - with direct setNativeProps for manipulation */}
          <Path
            ref={path1Ref}
            d="M -5 105 L 100 105 L -5 105 Z" // Initial empty path
            fill="url(#waterGradient)"
          />
          
          {/* Second wave layer - with direct setNativeProps for manipulation */}
          <Path
            ref={path2Ref}
            d="M -5 105 L 100 105 L -5 105 Z" // Initial empty path
            fill="url(#waterGradient2)"
          />
          
          {/* Third wave layer - with direct setNativeProps for manipulation */}
          <Path
            ref={path3Ref}
            d="M -5 105 L 100 105 L -5 105 Z" // Initial empty path 
            fill="url(#waterGradient3)"
          />
        </Svg>
      </View>
    );
  };
  
  // Demo data for showcasing the animation
  const demoSpotlights = [
    {
      name: 'Sophia',
      avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
      progress: 65,
      time: '03:12',
      isUser: false
    },
    {
      name: 'Your Profile',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      progress: 40,
      time: '01:45',
      isUser: true
    },
    {
      name: 'Michael',
      avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
      progress: 85,
      time: '04:30',
      isUser: false
    }
  ];

  const renderSpotlightModal = () => {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={spotlightModalVisible}
        onRequestClose={() => setSpotlightModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Spotlight Duration</Text>
            <Text style={styles.modalSubtitle}>Choose how long to spotlight your profile</Text>
            
            {inSpotlightQueue && (
              <View style={styles.queueInfoContainer}>
                <Text style={styles.queueInfoText}>
                  You are in queue position <Text style={styles.queueInfoHighlight}>{queuePosition}</Text>
                </Text>
                <Text style={styles.queueInfoDescription}>
                  You will be featured after {queuePosition === 1 ? 'the current' : 'other'} spotlight{queuePosition > 1 ? 's' : ''}.
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.durationOption} 
              onPress={() => joinSpotlightQueue(120)} // 2 minutes
            >
              <Text style={styles.durationOptionTime}>2 minutes</Text>
              <Text style={styles.durationOptionCoins}>Cost: 100 coins</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.durationOption}
              onPress={() => joinSpotlightQueue(300)} // 5 minutes
            >
              <Text style={styles.durationOptionTime}>5 minutes</Text>
              <Text style={styles.durationOptionCoins}>Cost: 200 coins</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.durationOption}
              onPress={() => joinSpotlightQueue(600)} // 10 minutes
            >
              <Text style={styles.durationOptionTime}>10 minutes</Text>
              <Text style={styles.durationOptionCoins}>Cost: 350 coins</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setSpotlightModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderSpotlightSection = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.headerWithIndicator}>
            <Text style={[styles.sectionTitle, {marginBottom: 0}]}>{"Friends"}</Text>
            <View style={styles.spotlightCounter}>
              <Ionicons name="people" size={12} color="#FFFFFF" style={{marginRight: 4}} />
              <Text style={styles.spotlightCountText}>4 online</Text>
            </View>
          </View>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spotlightScroll}
          style={styles.horizontalScroll}
        >
          {/* Your profile with manager - now with animation when spotlighted */}
          <TouchableOpacity 
            style={[
              styles.spotlightContainer,
              { overflow: 'hidden' }
            ]}
            onPress={() => setSpotlightModalVisible(true)}
          >
            {/* Fluid water animation - only shown when user is spotlighted */}
            {isCurrentUserSpotlighted && (
              <WaterFlowAnimation 
                progress={percentage} 
                colors={['#34C759', '#206E3E']} 
              />
            )}
            
            <View style={[styles.spotlightAvatarWrapper, { zIndex: 2 }]}>
              <View style={[
                isCurrentUserSpotlighted ? 
                  styles.spotlightAvatarGreen : 
                  { 
                    width: 62,
                    height: 62,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: getStatusColor(userStatus),
                    overflow: 'hidden',
                    position: 'relative',
                  }
              ]}>
                <Image 
                  source={{ uri: userProfileImage }}
                  style={styles.spotlightAvatar}
                />
              </View>
            </View>
            <View style={[styles.spotlightInfoWrapper, { zIndex: 2 }]}>
              <Text style={[
                styles.spotlightName, 
                isCurrentUserSpotlighted ? { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 } : {}
              ]}>
                {"You"}
              </Text>
              <Text style={[
                styles.spotlightStatus, 
                isCurrentUserSpotlighted ? { fontWeight: 'bold', color: '#FFFFFF' } : {}
              ]}>
                {isCurrentUserSpotlighted ? formatTime(remainingTime) : inSpotlightQueue ? `Queue: ${queuePosition}` : 'Spotlight'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Spotlighted user with countdown and fluid animation - only shown if not current user */}
          {showSpotlightedUser && !isCurrentUserSpotlighted && (
            <TouchableOpacity 
              style={[
                styles.spotlightContainer,
                { overflow: 'hidden' }
              ]}
            >
              {/* Fluid water animation */}
              <WaterFlowAnimation 
                progress={percentage} 
                colors={['#34C759', '#206E3E']} 
              />
              
              <View style={[styles.spotlightAvatarWrapper, { zIndex: 2 }]}>
                <View style={styles.spotlightAvatarGreen}>
                  <Image 
                    source={{ uri: currentSpotlight.avatar }} 
                    style={styles.spotlightAvatar}
                  />
                </View>
              </View>
              <View style={[styles.spotlightInfoWrapper, { zIndex: 2 }]}>
                <Text style={[styles.spotlightName, { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>
                  {currentSpotlight.name}
                </Text>
                <Text style={[styles.spotlightStatus, { fontWeight: 'bold', color: '#FFFFFF' }]}>
                  {formatTime(remainingTime)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Friend who is hosting with hosting status */}
          <TouchableOpacity 
            style={styles.spotlightContainer}
            onPress={() => handleActivityPress('hosting', {
              title: 'Live Stream with Friends',
              hostName: 'James',
              hostAvatar: 'https://randomuser.me/api/portraits/men/43.jpg',
              viewerCount: 1350,
              friendName: 'James',
              friendAvatar: 'https://randomuser.me/api/portraits/men/43.jpg',
              avatars: [
                'https://randomuser.me/api/portraits/men/43.jpg',
                'https://randomuser.me/api/portraits/women/43.jpg',
                'https://randomuser.me/api/portraits/men/44.jpg',
              ],
              streamId: '201', // Unique stream ID
            })}
          >
            <View style={styles.spotlightAvatarWrapper}>
              <View style={styles.spotlightAvatarRed}>
                <Image 
                  source={{ uri: 'https://randomuser.me/api/portraits/men/43.jpg' }} 
                  style={styles.spotlightAvatar}
                />
              </View>
            </View>
            <View style={styles.spotlightInfoWrapper}>
              <Text style={styles.spotlightName}>James</Text>
              <Text style={styles.spotlightStatus}>Hosting</Text>
            </View>
          </TouchableOpacity>
          
          {/* Friend who is watching with watching status */}
          <TouchableOpacity 
            style={styles.spotlightContainer}
            onPress={() => handleActivityPress('watching', {
              title: 'Live Stream with Friends',
              hostName: 'Sara',
              hostAvatar: 'https://randomuser.me/api/portraits/women/32.jpg',
              viewerCount: 1420,
              friendName: 'Ella',
              friendAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
              avatars: [
                'https://randomuser.me/api/portraits/women/32.jpg',
                'https://randomuser.me/api/portraits/women/33.jpg',
                'https://randomuser.me/api/portraits/women/34.jpg',
                'https://randomuser.me/api/portraits/men/32.jpg',
              ],
              streamId: '202', // Unique stream ID
            })}
          >
            <View style={styles.spotlightAvatarWrapper}>
              <View style={styles.spotlightAvatarBlue}>
                <Image 
                  source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }} 
                  style={styles.spotlightAvatar}
                />
              </View>
            </View>
            <View style={styles.spotlightInfoWrapper}>
              <Text style={styles.spotlightName}>Ella</Text>
              <Text style={styles.spotlightStatus}>Watching</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
        
        {renderSpotlightModal()}
      </View>
    );
  };

  const renderTournamentSection = () => {
    return (
      <View style={styles.section}>
        <View style={styles.tournamentContainer}>
          <View style={styles.eventContent}>
            <Text style={styles.eventTitle}>Event</Text>
            
            <View style={styles.eventProgressTrack}>
              <View style={styles.eventProgressFill} />
            </View>
            
            <View style={styles.eventInfoGrid}>
              <View style={styles.eventInfoBox}>
                <Text style={styles.eventInfoValue}>02:17:36</Text>
                <Text style={styles.eventInfoLabel}>Next Event</Text>
              </View>
              
              <View style={styles.eventInfoBox}>
                <View style={styles.prizeContainer}>
                  <View style={styles.coinIcon} />
                  <Text style={styles.eventInfoValue}>420</Text>
                </View>
                <Text style={styles.eventInfoLabel}>Prize Pool</Text>
              </View>
              
              <View style={styles.eventInfoBox}>
                <Text style={styles.eventInfoValue}>7</Text>
                <Text style={styles.eventInfoLabel}>Entries</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.enterButton}>
              <Text style={styles.enterButtonText}>Enter • 100</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderGlobalChatSection = () => {
    return (
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.globalChatButton} 
          onPress={() => router.push({
            pathname: '/chat',
            params: {
              source: 'live' // Add source parameter to track where user came from
            }
          })}
        >
          <LinearGradient
            colors={['#1D1E26', '#2A2B38']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.globalChatGradient}
          >
            <View style={styles.chatButtonContent}>
              <View style={styles.chatIconContainer}>
                <LinearGradient
                  colors={['#3D3E48', '#2D2E38']}
                  style={styles.chatIconGradient}
                >
                  <MaterialIcons name="chat" size={18} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={styles.chatButtonText}>Global chat</Text>
            </View>
            <View style={styles.chatNotificationBadge}>
              <Text style={styles.notificationText}>2</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLivesSection = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lives</Text>
          <View style={styles.livesCounter}>
            <Text style={styles.livesCountText}>{streams.length} streams</Text>
          </View>
        </View>
        
        {/* Featured streams section */}
        {featuredStreams.length > 0 && (
          <>
            <View style={styles.featuredHeader}>
              <Text style={styles.featuredSubtitle}>Featured</Text>
            </View>
            <View style={styles.streamsRow}>
              {featuredStreams.slice(0, 2).map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </View>
          </>
        )}
        
        {/* Friends hosting streams */}
        {friendStreams.hosting.length > 0 && (
          <>
            <View style={styles.featuredHeader}>
              <Text style={styles.featuredSubtitle}>Friends Hosting</Text>
            </View>
            <View style={styles.streamsRow}>
              {friendStreams.hosting.slice(0, 2).map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </View>
          </>
        )}
        
        {/* Friends watching streams */}
        {friendStreams.watching.length > 0 && (
          <>
            <View style={styles.featuredHeader}>
              <Text style={styles.featuredSubtitle}>Friends Watching</Text>
            </View>
            <View style={styles.streamsRow}>
              {friendStreams.watching.slice(0, 2).map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </View>
          </>
        )}
        
        {/* Display all other streams */}
        <View style={styles.streamsRow}>
          {streams
            .filter(stream => 
              !featuredStreams.includes(stream) && 
              !friendStreams.hosting.includes(stream) && 
              !friendStreams.watching.includes(stream))
            .slice(0, 2)
            .map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
        </View>
        
        <View style={styles.streamsRow}>
          {streams
            .filter(stream => 
              !featuredStreams.includes(stream) && 
              !friendStreams.hosting.includes(stream) && 
              !friendStreams.watching.includes(stream))
            .slice(2, 4)
            .map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
        </View>
      </View>
    );
  };
  
  // Separate component for stream cards to simplify layout
  const StreamCard = ({ stream }: { stream: LiveStream }) => {
    // Check if stream has minimal content (no title, no rank, no friends)
    const hasMinimalContent = !stream.title && !stream.rank && (!stream.friends || stream.friends.length === 0);
    // Check if it's a 4-host grid with minimal content (special case that needs more adjustment)
    const isFourHostMinimal = hasMinimalContent && stream.hosts.length === 4;
    
    // Render hosts with adaptive layout based on count
    const renderHostGrid = () => {
      const hostCount = stream.hosts.length;
      
      // Single host - one large image
      if (hostCount === 1) {
        return (
          <View style={[styles.singleHostGrid, hasMinimalContent && styles.expandedHostGrid]}>
            <Image 
              source={{ uri: stream.hosts[0].avatar }} 
              style={styles.singleHostImage} 
              resizeMode="cover"
            />
          </View>
        );
      }
      
      // Two hosts - side by side
      if (hostCount === 2) {
        return (
          <View style={[styles.dualHostGrid, hasMinimalContent && styles.expandedHostGrid]}>
            {stream.hosts.map((host, idx) => (
              <View key={`host-${stream.id}-${idx}`} style={styles.dualHostItem}>
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
      
      // Three hosts - side by side
      if (hostCount === 3) {
        return (
          <View style={[styles.tripleHostGrid, hasMinimalContent && styles.expandedHostGrid]}>
            <View style={styles.tripleHostRow}>
              {stream.hosts.map((host, idx) => (
                <View key={`host-${stream.id}-${idx}`} style={styles.tripleHostItem}>
                  <Image 
                    source={{ uri: host.avatar }} 
                    style={styles.hostImage} 
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          </View>
        );
      }
      
      // Four hosts - 2x2 grid - Special handling for this case
      if (hostCount === 4) {
        return (
          <View style={[
            styles.standardGrid, 
            hasMinimalContent && styles.expandedHostGrid
          ]}>
            {stream.hosts.map((host, idx) => (
              <View 
                key={`host-${stream.id}-${idx}`} 
                style={styles.gridItemFourth}
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
      }
      
      // Six hosts - 3x2 grid
      if (hostCount === 6) {
        return (
          <View style={[styles.standardGrid, hasMinimalContent && styles.expandedHostGrid]}>
            {stream.hosts.map((host, idx) => (
              <View key={`host-${stream.id}-${idx}`} style={styles.gridItemSixth}>
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
      
      // 5, 7, 8, 9+ hosts - standard 3x3 grid (only show up to 9)
      return (
        <View style={[styles.standardGrid, hasMinimalContent && styles.expandedHostGrid]}>
          {stream.hosts.slice(0, 9).map((host, idx) => (
            <View key={`host-${stream.id}-${idx}`} style={styles.gridItemStandard}>
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
    
    // Render friends watching with stacked effect
    const renderFriendsWatching = () => {
      if (!stream.friends || stream.friends.length === 0) {
        return (
          <View style={styles.friendsWatchingContainer}>
            {/* Empty container to maintain consistent layout */}
          </View>
        );
      }
      
      return (
        <View style={styles.friendsWatchingContainer}>
          {stream.friends.slice(0, 3).map((friend, idx) => (
            <View 
              key={`friend-${stream.id}-${idx}`} 
              style={[
                styles.friendAvatarContainer,
                { zIndex: 10 - idx } // Higher z-index for first friends
              ]}
            >
              <Image 
                source={{ uri: friend.avatar }} 
                style={styles.friendAvatar} 
                resizeMode="cover"
              />
            </View>
          ))}
          {stream.friends.length > 3 && (
            <View style={styles.friendsCountBadge}>
              <Text style={styles.friendsCountBadgeText}>+{stream.friends.length - 3}</Text>
            </View>
          )}
        </View>
      );
    };
    
    return (
      <TouchableOpacity
        style={[
          styles.streamGridCard, 
          hasMinimalContent && styles.streamGridCardMinimal,
          isFourHostMinimal && styles.fourHostMinimalCard
        ]}
        onPress={() => navigateToLiveStreamView(stream)}
      >
        {/* Add a placeholder space with the same height as the title row when no title/rank */}
        {!stream.title && !stream.rank && (
          <View style={styles.placeholderTopRow} />
        )}
        
        {/* Top row with title and rank - only if there's a title */}
        {stream.title && (
          <View style={styles.topRow}>
            {stream.rank ? (
              <View style={[styles.rankBadge, 
                stream.rank === 1 ? styles.firstRank : 
                stream.rank === 2 ? styles.secondRank : 
                stream.rank === 3 ? styles.thirdRank : null
              ]}>
                <Text style={styles.streamRankText}>
                  {stream.rank === 1 ? '1st' : 
                  stream.rank === 2 ? '2nd' : 
                  stream.rank === 3 ? '3rd' : 
                  `${stream.rank}th`}
                </Text>
              </View>
            ) : null}
            <Text 
              style={styles.streamTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {stream.title}
            </Text>
          </View>
        )}
      
        {/* Grid of hosts */}
        <View style={[
          styles.hostGrid, 
          hasMinimalContent && styles.expandedHostGridContainer,
          isFourHostMinimal && styles.fourHostMinimalContainer
        ]}>
          {/* Grid layout for hosts */}
          <View style={[
            styles.hostGridLayout, 
            hasMinimalContent && styles.expandedHostGridLayout,
            isFourHostMinimal && styles.fourHostMinimalLayout
          ]}>
            {renderHostGrid()}
          </View>
        </View>
      
        {/* Bottom row with viewer count and friends - always consistent */}
        <View style={[
          styles.bottomRow,
          isFourHostMinimal && styles.fourHostMinimalBottomRow
        ]}>
          {/* Enhanced viewer count at bottom left */}
          <View style={styles.viewerCountBottom}>
            <Ionicons name="people" size={14} color="#FFFFFF" style={styles.viewerIcon} />
            <Text style={styles.viewerCountNumber}>{stream.views}</Text>
            <Text style={styles.viewerCountLabel}>views</Text>
          </View>
        
          {/* Friends watching at bottom right */}
          {renderFriendsWatching()}
        </View>
      </TouchableOpacity>
    );
  };

  // Add this function to navigate to profile screen
  const navigateToProfile = () => {
    router.push('/profile');
  };

  return (
    <LinearGradient colors={['#121212', '#121212']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <CommonHeader 
          title="Live"
          leftIcon={{
            name: "live-tv",
            onPress: () => {}
          }}
          rightIcons={[
            {
              name: "search",
              onPress: () => console.log('Search Pressed')
            },
            {
              name: "person-add",
              onPress: () => console.log('Add Friends Pressed')
            }
          ]}
        />
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderSpotlightSection()}
          {renderTournamentSection()}
          {renderGlobalChatSection()}
          {renderLivesSection()}
          {/* Add extra padding at the bottom to ensure all content is visible */}
          <View style={{ height: 20 }} />
        </ScrollView>
        
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.goLiveButton}>
            <LinearGradient
              colors={['#6E56F7', '#f25899']}
              style={styles.goLiveGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.goLiveText}>Go Live</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      
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
      
      {/* Spotlight Modal */}
      {renderSpotlightModal()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  
  // Spotlight Section
  spotlightScroll: {
    paddingVertical: 12,
    paddingRight: 16,
  },
  
  horizontalScroll: {
    marginRight: -16,
    paddingRight: 16,
    overflow: 'visible',
  },
  
  spotlightContainer: {
    height: 120,
    width: 100,
    backgroundColor: '#1D1E26',
    borderRadius: 16,
    marginRight: 12,
    padding: 8,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(45, 46, 56, 0.8)',
  },
  
  spotlightAvatarWrapper: {
    width: 70,
    height: 70,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  
  spotlightAvatarBlue: {
    width: 62,
    height: 62,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4B8BFF',
    overflow: 'hidden',
    position: 'relative',
  },
  
  spotlightAvatarRed: {
    width: 62,
    height: 62,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FF4B4B',
    overflow: 'hidden',
    position: 'relative',
  },
  
  spotlightAvatarGreen: {
    width: 62,
    height: 62,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#34C759',
    overflow: 'hidden',
    position: 'relative',
  },
  
  spotlightAvatarPurple: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6E56F7',
    overflow: 'hidden',
    position: 'relative',
  },
  
  spotlightAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  
  spotlightInfoWrapper: {
    alignItems: 'center',
    marginTop: 2,
  },
  
  spotlightName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  
  spotlightStatus: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    textAlign: 'center',
  },
  
  // New status indicator style that replaces the dot
  statusPill: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#1D1E26',
    borderWidth: 1,
    minWidth: 46,
    alignItems: 'center',
    zIndex: 10,
  },
  
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  spotlightCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  spotlightCountText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  
  circularProgress: {
    position: 'absolute',
    top: -3,
    left: -3,
    zIndex: 1,
  },
  
  // Tournament Section
  tournamentContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1D1E26',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 0,
    marginVertical: -6,
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
    width: '25%', // Adjust based on progress
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
  coinIcon: {
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
  
  // Global Chat Section
  globalChatButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(45, 46, 56, 0.8)',
  },
  globalChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  chatButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(70, 71, 82, 0.4)',
  },
  chatIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  chatNotificationBadge: {
    backgroundColor: '#F23535',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: 'rgba(242, 53, 53, 0.3)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Lives Section
  livesCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  livesCountText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  streamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  streamGridCard: {
    backgroundColor: '#1D1E26',
    borderRadius: 24,
    overflow: 'hidden',
    width: '48%',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  streamGridTouchable: {
    width: '100%',
    height: '100%',
    padding: 12,
  },
  streamGridCardLeft: {
    marginRight: 4,
  },
  streamGridCardRight: {
    marginLeft: 4,
  },
  streamStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  streamBoostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamBoostText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  streamRankBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  firstRank: {
    backgroundColor: '#FFD700',
  },
  secondRank: {
    backgroundColor: '#A078F5',
  },
  thirdRank: {
    backgroundColor: '#CD7F32',
  },
  streamRankText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  streamViewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamViewsText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  streamGridTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 4,
    marginLeft: 36, // Add margin to allow space for rank badge
  },
  hostGrid: {
    position: 'relative',
    width: '100%',
    marginBottom: 12,
  },
  viewerCountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  hostGridLayout: {
    width: '100%',
    aspectRatio: 1, // Keep a square grid regardless of content
    backgroundColor: '#121212',
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Dynamic host grid layouts based on count
  singleHostGrid: {
    width: '100%',
    height: '100%',
  },
  singleHostImage: {
    width: '100%',
    height: '100%',
  },
  dualHostGrid: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  dualHostItem: {
    width: '50%',
    height: '100%',
  },
  tripleHostGrid: {
    width: '100%',
    height: '100%',
  },
  tripleHostRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  tripleHostItem: {
    width: '33.33%',
    height: '100%',
  },
  standardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
  },
  gridItemStandard: {
    width: '33.33%',
    height: '33.33%',
    padding: 0,
  },
  gridItemFourth: {
    width: '50%', 
    height: '50%',
    padding: 0,
  },
  gridItemSixth: {
    width: '33.33%',
    height: '50%',
    padding: 0,
  },
  hostImage: {
    width: '100%',
    height: '100%',
  },
  
  // Bottom Bar
  bottomBar: {
    padding: 4,
    paddingVertical: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 2,
  },
  goLiveButton: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  goLiveGradient: {
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goLiveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  durationOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  durationOptionTime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  durationOptionCoins: {
    color: '#FFD700',
    fontSize: 14,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  
  // Additional Spotlight styles
  statusYou: {
    borderColor: '#34C759',
    borderWidth: 4,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Queue styles
  queueInfoContainer: {
    marginBottom: 20,
  },
  queueInfoText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  queueInfoHighlight: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  queueInfoDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  queueInfo: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  spotlightStatusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  
  loadingBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 14,
    opacity: 0.6,
    zIndex: 1,
  },
  
  spotlightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightActionButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  spotlightActionButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  headerWithIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  singleHostContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  
  threeHostsContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  
  threeHostsTopRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
  },
  
  threeHostsBottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  
  fiveHostsContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  
  fiveHostsTopRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
  },
  
  fiveHostsBottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  
  multipleHostsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  
  // Top header with rank and title
  rankBadgeTop: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Layout for bottom row with views and friends
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  expandedHostGridContainer: {
    flex: 1, // Take up more space when minimal content
    marginVertical: 10, // More margin to expand
  },
  expandedHostGridLayout: {
    aspectRatio: 0.9, // Slightly taller to fill empty space
    height: 'auto',
  },
  expandedHostGrid: {
    height: '100%', 
    width: '100%',
  },
  streamGridCardMinimal: {
    paddingTop: 8, // Keep some padding to match other cards
    paddingBottom: 8,
  },
  // Special styles for the 4-host minimal content case
  placeholderTopRow: {
    height: 12, // Height to match the margin used in topRow
  },
  fourHostMinimalCard: {
    padding: 12, // Same padding as other cards for consistency
  },
  fourHostMinimalContainer: {
    flex: 1,
    marginVertical: 8, // Consistent margin
  },
  fourHostMinimalLayout: {
    aspectRatio: 1, // Same aspect ratio as other cards
    height: 'auto',
  },
  fourHostMinimalBottomRow: {
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1, // Keep the border for consistency
  },
  emptyFriendsContainer: {
    height: 30, // Match the height of the friends container
    width: 30, // Give it some width
  },
  // Top row with title and rank
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
  },
  streamTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  // Enhanced viewer count at bottom left
  viewerCountBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewerIcon: {
    marginRight: 4,
  },
  viewerCountNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewerCountLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginLeft: 3,
  },
  // Enhanced friends watching section
  friendsWatchingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  friendAvatarContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -8, // Overlap for stacked effect
    borderWidth: 2,
    borderColor: '#4B8BFF', // Blue border for friends
    overflow: 'hidden',
  },
  friendAvatar: {
    width: '100%',
    height: '100%',
  },
  friendsCountBadge: {
    backgroundColor: '#4B8BFF',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
  },
  friendsCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Add the missing style properties for the new section headers
  featuredHeader: {
    marginVertical: 8,
    marginLeft: 4,
  },
  featuredSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    opacity: 0.8,
  },
});

export default LiveScreen; 


