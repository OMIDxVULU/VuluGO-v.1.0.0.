import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, Pressable, Modal, Platform } from 'react-native';
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

interface Stream {
  id: number;
  title: string;
  host: string;
  avatar: string;
  boost: number;
  views: number;
  rank: number;
  participants: number;
}

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
    }
  ) => {
    // Provide haptic feedback if available
    if (Platform.OS === 'ios' && require('expo-haptics')) {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('Haptics not available');
      }
    }
    
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
    });
    
    // Show modal
    setActivityModalVisible(true);
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
          <TouchableOpacity style={styles.spotlightContainer}>
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
          <TouchableOpacity style={styles.spotlightContainer}>
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
    const liveStreams: Stream[] = [
      {
        id: 1,
        title: 'Epic gameplay session! Join now!',
        host: 'ProGamer',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        boost: 600,
        views: 1500,
        rank: 1,
        participants: 120
      },
      {
        id: 2,
        title: 'Late night stream with friends',
        host: 'NightOwl',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        boost: 500,
        views: 1250,
        rank: 2,
        participants: 85
      },
      {
        id: 3,
        title: 'Competitive matchmaking!',
        host: 'ChampPlayer',
        avatar: 'https://randomuser.me/api/portraits/men/28.jpg',
        boost: 400,
        views: 1000,
        rank: 3,
        participants: 64
      },
      {
        id: 4,
        title: 'Casual gaming & chill vibes',
        host: 'RelaxedGamer',
        avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
        boost: 300,
        views: 750,
        rank: 4,
        participants: 42
      }
    ];
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lives</Text>
          <View style={styles.livesCounter}>
            <Text style={styles.livesCountText}>{liveStreams.length} streams</Text>
          </View>
        </View>
        
        <ScrollView>
          {liveStreams.map(stream => (
            <TouchableOpacity
              key={stream.id}
              style={styles.streamCard}
              onPress={() => handleActivityPress('watching', {
                title: stream.title,
                hostName: stream.host,
                hostAvatar: stream.avatar,
                viewerCount: stream.views,
                friendName: 'Your Friend',
                friendAvatar: 'https://randomuser.me/api/portraits/women/31.jpg',
                avatars: [
                  stream.avatar,
                  // Add some random avatars as additional viewers
                  'https://randomuser.me/api/portraits/women/32.jpg',
                  'https://randomuser.me/api/portraits/men/32.jpg',
                  'https://randomuser.me/api/portraits/women/33.jpg',
                ]
              })}
            >
              <View style={styles.streamThumbnailContainer}>
                <View style={[
                  styles.rankBadge, 
                  stream.rank === 1 ? styles.firstRank : 
                  stream.rank === 2 ? styles.secondRank : 
                  stream.rank === 3 ? styles.thirdRank : null
                ]}>
                  <Text style={styles.rankText}>
                    {stream.rank === 1 ? '1st' : 
                     stream.rank === 2 ? '2nd' : 
                     stream.rank === 3 ? '3rd' : 
                     `${stream.rank}th`}
                  </Text>
                </View>
                
                <View style={styles.streamStatsOverlay}>
                  <View style={styles.streamStatRow}>
                    <MaterialIcons name="bolt" size={16} color="#FFD700" />
                    <Text style={styles.streamStatText}>{stream.boost}</Text>
                  </View>
                  
                  <View style={styles.streamStatRow}>
                    <MaterialIcons name="visibility" size={16} color="#FFFFFF" />
                    <Text style={styles.streamStatText}>{stream.views}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.streamInfoContainer}>
                <Text style={styles.streamTitle}>{stream.title}</Text>
                
                <View style={styles.streamHostContainer}>
                  <Image source={{ uri: stream.avatar }} style={styles.hostAvatar} />
                  <Text style={styles.hostName}>{stream.host}</Text>
                </View>
                
                <View style={styles.participantsContainer}>
                  {[...Array(3)].map((_, i) => (
                    <View key={i} style={styles.participantDot} />
                  ))}
                  <View style={styles.moreParticipants}>
                    <Text style={styles.moreParticipantsText}>+{stream.participants - 3}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
        
        <ScrollView style={styles.scrollView}>
          {renderSpotlightSection()}
          {renderTournamentSection()}
          {renderGlobalChatSection()}
          {renderLivesSection()}
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
        title={selectedActivity.title}
        subtitle={selectedActivity.subtitle}
        hostName={selectedActivity.hostName}
        hostAvatar={selectedActivity.hostAvatar}
        viewerCount={selectedActivity.viewerCount}
        avatars={selectedActivity.avatars}
        friendName={selectedActivity.friendName}
        friendAvatar={selectedActivity.friendAvatar}
        fuelRequired={25} // Higher fuel requirement for live streams
        fuelAvailable={18} // Example where user doesn't have enough fuel
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
  streamCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  streamThumbnailContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#1C1D23',
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1,
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
  rankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  streamStatsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  streamStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  streamStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  streamInfoContainer: {
    flex: 1,
    padding: 12,
  },
  streamTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  streamHostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  hostName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  moreParticipants: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  moreParticipantsText: {
    color: '#FFFFFF',
    fontSize: 10,
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
});

export default LiveScreen; 

