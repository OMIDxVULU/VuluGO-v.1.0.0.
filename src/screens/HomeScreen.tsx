import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, Animated, Platform, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent } from 'react-native';
import { Text, Card, Avatar } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ScrollableContentContainer from '../components/ScrollableContentContainer';
import CommonHeader from '../components/CommonHeader';
import ActivityModal from '../components/ActivityModal';
import PersonGroupIcon from '../components/PersonGroupIcon';

// Use the router for navigation
const HomeScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Week');
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  
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
  
  // Function to handle container width measurement
  const handleContainerLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };
  
  // Function to handle content width measurement
  const handleContentLayout = (width: number) => {
    setContentWidth(width);
  };
  
  // Simplified scroll handler without haptics or rubber band effects
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

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

  const renderFriendWatchingLive = () => {
    const activityData = {
      title: 'Live Stream with Friends',
      hostName: 'Sara',
      hostAvatar: 'https://randomuser.me/api/portraits/women/32.jpg',
      viewerCount: 1500,
      friendName: 'Jessica',
      friendAvatar: 'https://randomuser.me/api/portraits/women/31.jpg',
      avatars: [
        'https://randomuser.me/api/portraits/women/32.jpg',
        'https://randomuser.me/api/portraits/women/33.jpg',
        'https://randomuser.me/api/portraits/women/34.jpg',
        'https://randomuser.me/api/portraits/men/32.jpg',
        'https://randomuser.me/api/portraits/men/33.jpg',
      ],
    };

    return (
      <TouchableOpacity 
        style={styles.liveStreamContainer}
        onPress={() => handleActivityPress('watching', activityData)}
      >
        {/* Left section with 4 avatars in a grid - hosts should be red */}
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/32.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/33.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/34.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+2</Text>
          </View>
        </View>
        
        {/* Center section with stream title and viewers */}
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            Live title, test test test test test 123, .....
          </Text>
          <Text style={styles.viewersText}>2590 Viewers watching</Text>
        </View>
        
        {/* Right section with broadcaster avatar - friend watching (blue) */}
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainer}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.liveIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendHostingLive = () => {
    const activityData = {
      title: 'Friday Night Live Stream',
      hostName: 'Michael',
      hostAvatar: 'https://randomuser.me/api/portraits/men/33.jpg',
      viewerCount: 1240,
      friendName: 'Michael',
      friendAvatar: 'https://randomuser.me/api/portraits/men/33.jpg',
      avatars: [
        'https://randomuser.me/api/portraits/men/33.jpg',
        'https://randomuser.me/api/portraits/women/32.jpg',
        'https://randomuser.me/api/portraits/women/33.jpg',
      ],
    };

    return (
      <TouchableOpacity 
        style={styles.liveStreamContainer}
        onPress={() => handleActivityPress('hosting', activityData)}
      >
        {/* Left section with 4 avatars in a grid - hosts should be red */}
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/33.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/34.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+2</Text>
          </View>
        </View>
        
        {/* Center section with stream title and viewers */}
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            Alex's Live Stream, join now!
          </Text>
          <Text style={styles.viewersText}>1240 Viewers watching</Text>
        </View>
        
        {/* Right section with broadcaster avatar */}
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainerRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.liveIndicatorRed}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendListeningMusic = () => {
    const activityData = {
      title: 'This Is Imagine Dragons',
      subtitle: 'Playlist • Spotify',
      friendName: 'Jamie',
      friendAvatar: 'https://randomuser.me/api/portraits/women/31.jpg',
      avatars: [
        'https://randomuser.me/api/portraits/women/31.jpg',
      ],
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
              source={{ uri: 'https://i.scdn.co/image/ab67616d0000b2732c8a1a947c85d3ee03bb5567' }} 
              style={styles.albumArt}
            />
          </View>
          <View style={styles.songInfoContainer}>
            <Text style={styles.songTitle} numberOfLines={1}>Blinding Lights</Text>
            <Text style={styles.artistName} numberOfLines={1}>The Weeknd</Text>
          </View>
        </View>
        
        {/* Right section with friend avatar */}
        <View style={styles.musicFriendContainer}>
          <View style={styles.musicAvatarContainer}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/35.jpg' }} 
              style={styles.musicAvatar}
            />
            <View style={styles.musicIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Additional random widgets
  const renderRandomFriendWidgets = () => {
    // Create an array to hold random widgets
    const randomWidgets = [];
    
    // Sample data for a random live stream
    const randomLiveData = {
      title: 'Special Event Live',
      hostName: 'David',
      hostAvatar: 'https://randomuser.me/api/portraits/men/34.jpg',
      viewerCount: 875,
      friendName: 'Emma',
      friendAvatar: 'https://randomuser.me/api/portraits/women/35.jpg',
      avatars: [
        'https://randomuser.me/api/portraits/men/34.jpg',
        'https://randomuser.me/api/portraits/women/35.jpg',
        'https://randomuser.me/api/portraits/men/36.jpg',
      ],
    };
    
    // Add a random live stream widget
    randomWidgets.push(
      <TouchableOpacity 
        key="random1" 
        style={styles.liveStreamContainer}
        onPress={() => handleActivityPress('watching', randomLiveData)}
      >
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/34.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/35.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/36.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+3</Text>
          </View>
        </View>
        
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            Special Event Live
          </Text>
          <Text style={styles.viewersText}>875 Viewers watching</Text>
        </View>
        
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainer}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/34.jpg' }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.liveIndicatorRed}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    // Friend hosting with offline fake status
    randomWidgets.push(
      <TouchableOpacity key="random2" style={styles.liveStreamContainer}>
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/52.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/53.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/54.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+5</Text>
          </View>
        </View>
        
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            Friday Night Party Stream
          </Text>
          <Text style={styles.viewersText}>1876 Viewers watching</Text>
        </View>
        
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainerRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/51.jpg' }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.offlineIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    // Friend listening to music with online status
    randomWidgets.push(
      <TouchableOpacity key="random3" style={styles.musicStreamContainer}>
        <View style={styles.musicContentContainer}>
          <View style={styles.albumArtContainer}>
            <Image 
              source={{ uri: 'https://i.scdn.co/image/ab67616d0000b273e8b066f70c206551210d902b' }} 
              style={styles.albumArt}
            />
          </View>
          <View style={styles.songInfoContainer}>
            <Text style={styles.songTitle} numberOfLines={1}>Bohemian Rhapsody</Text>
            <Text style={styles.artistName} numberOfLines={1}>Queen</Text>
          </View>
        </View>
        
        <View style={styles.musicFriendContainer}>
          <View style={styles.musicAvatarContainer}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/65.jpg' }} 
              style={styles.musicAvatar}
            />
            <View style={styles.musicIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    // Friend watching with online status
    randomWidgets.push(
      <TouchableOpacity key="random4" style={styles.liveStreamContainer}>
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/62.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/63.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/64.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+1</Text>
          </View>
        </View>
        
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            Cooking Class Live
          </Text>
          <Text style={styles.viewersText}>942 Viewers watching</Text>
        </View>
        
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainer}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/61.jpg' }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.musicIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    // Friend listening to music with busy status
    randomWidgets.push(
      <TouchableOpacity key="random5" style={styles.musicStreamContainer}>
        <View style={styles.musicContentContainer}>
          <View style={styles.albumArtContainer}>
            <Image 
              source={{ uri: 'https://i.scdn.co/image/ab67616d0000b273fd61ea11e76760c998f5702d' }} 
              style={styles.albumArt}
            />
          </View>
          <View style={styles.songInfoContainer}>
            <Text style={styles.songTitle} numberOfLines={1}>Bad Guy</Text>
            <Text style={styles.artistName} numberOfLines={1}>Billie Eilish</Text>
          </View>
        </View>
        
        <View style={styles.musicFriendContainer}>
          <View style={styles.musicAvatarContainer}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/75.jpg' }} 
              style={styles.musicAvatar}
            />
            <View style={styles.liveIndicatorRed}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    // Friend hosting with busy status
    randomWidgets.push(
      <TouchableOpacity key="random6" style={styles.liveStreamContainer}>
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/72.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/73.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/74.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+4</Text>
          </View>
        </View>
        
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            Art Tutorial Session
          </Text>
          <Text style={styles.viewersText}>753 Viewers watching</Text>
        </View>
        
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainerRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/71.jpg' }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.liveIndicatorRed}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    // Friend watching with offline status
    randomWidgets.push(
      <TouchableOpacity key="random7" style={styles.liveStreamContainer}>
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/82.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/83.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/84.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+7</Text>
          </View>
        </View>
        
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            Tech Talk Live: AI Future
          </Text>
          <Text style={styles.viewersText}>3102 Viewers watching</Text>
        </View>
        
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainer}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/81.jpg' }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.offlineIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    // Friend listening to music with offline status
    randomWidgets.push(
      <TouchableOpacity key="random8" style={styles.musicStreamContainer}>
        <View style={styles.musicContentContainer}>
          <View style={styles.albumArtContainer}>
            <Image 
              source={{ uri: 'https://i.scdn.co/image/ab67616d0000b273abdf6b2a0b15e5af9231940d' }} 
              style={styles.albumArt}
            />
          </View>
          <View style={styles.songInfoContainer}>
            <Text style={styles.songTitle} numberOfLines={1}>Shape of You</Text>
            <Text style={styles.artistName} numberOfLines={1}>Ed Sheeran</Text>
          </View>
        </View>
        
        <View style={styles.musicFriendContainer}>
          <View style={styles.musicAvatarContainer}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/85.jpg' }} 
              style={styles.musicAvatar}
            />
            <View style={styles.offlineIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    // Friend hosting with online status
    randomWidgets.push(
      <TouchableOpacity key="random9" style={styles.liveStreamContainer}>
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/92.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/93.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/94.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+6</Text>
          </View>
        </View>
        
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            Travel Vlog: Paris Edition
          </Text>
          <Text style={styles.viewersText}>1423 Viewers watching</Text>
        </View>
        
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainerRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/91.jpg' }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.musicIndicator}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    // Friend watching with busy status
    randomWidgets.push(
      <TouchableOpacity key="random10" style={styles.liveStreamContainer}>
        <View style={styles.avatarGrid}>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/96.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/97.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={styles.avatarWrapperRed}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/98.jpg' }} 
              style={styles.gridAvatar}
            />
          </View>
          <View style={[styles.plusMoreContainer, styles.plusMoreContainerRed]}>
            <Text style={[styles.plusMoreText, styles.plusMoreTextRed]}>+8</Text>
          </View>
        </View>
        
        <View style={styles.streamInfoContainer}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            Fitness Class: HIIT Workout
          </Text>
          <Text style={styles.viewersText}>876 Viewers watching</Text>
        </View>
        
        <View style={styles.broadcasterContainerWrapper}>
          <View style={styles.broadcasterContainer}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/99.jpg' }} 
              style={styles.broadcasterAvatar}
            />
            <View style={styles.liveIndicatorRed}></View>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    return randomWidgets;
  };

  const renderEventWidget = () => {
    return (
      <View style={styles.tournamentContainer}>
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>Event</Text>
          
          <View style={styles.eventProgressTrack}>
            <View style={styles.eventProgressFill} />
          </View>
          
          <View style={styles.eventInfoGrid}>
            <View style={styles.eventInfoBox}>
              <Text style={styles.eventInfoValue}>00:23:06</Text>
              <Text style={styles.eventInfoLabel}>Time Left</Text>
            </View>
            
            <View style={styles.eventInfoBox}>
              <View style={styles.prizeContainer}>
                <View style={styles.eventCoinIcon} />
                <Text style={styles.eventInfoValue}>1350</Text>
              </View>
              <Text style={styles.eventInfoLabel}>Prize Pool</Text>
            </View>
            
            <View style={styles.eventInfoBox}>
              <Text style={styles.eventInfoValue}>7</Text>
              <Text style={styles.eventInfoLabel}>Entries</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.enterButton}>
            <Text style={styles.enterButtonText}>Enter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderGemsWidget = () => {
    return (
      <Card style={styles.gemsCard}>
        {/* Gem+ Header with Buy button */}
        <View style={styles.gemsCardHeader}>
          <View style={styles.gemTitleContainer}>
            <MaterialCommunityIcons 
              name="diamond-stone" 
              size={20} 
              color="#B768FB" 
            />
            <Text style={styles.gemTitle}>Gem+</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.buyButton}>
            <Text style={styles.buyButtonText}>Buy</Text>
          </TouchableOpacity>
        </View>
        
        {/* Content area */}
        <View style={styles.gemsContent}>
          {/* Upper section - Daily gems (informational) */}
          <View style={styles.gemsDailyRow}>
            <View>
              <Text style={styles.gemsValueLabel}>Daily Subscription</Text>
              <View style={styles.gemsValueContainer}>
                <Text style={styles.dailyGemsValue}>200</Text>
                <MaterialCommunityIcons 
                  name="diamond-stone" 
                  size={14} 
                  color="rgba(183, 104, 251, 0.7)" 
                />
              </View>
            </View>
            <View style={styles.renewalBadge}>
              <Text style={styles.renewalText}>Renews in 3 days</Text>
            </View>
          </View>
          
          {/* Lower section - Available balance (highlighted) */}
          <LinearGradient
            colors={['rgba(183, 104, 251, 0.1)', 'rgba(110, 105, 244, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.availableBalanceContainer}
          >
            <View>
              <Text style={styles.availableBalanceLabel}>YOUR AVAILABLE BALANCE</Text>
              <View style={styles.availableBalanceRow}>
                <Text style={styles.availableBalanceValue}>940</Text>
                <LinearGradient
                  colors={['#B768FB', '#6E69F4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gemIconBackground}
                >
                  <MaterialCommunityIcons 
                    name="diamond-stone" 
                    size={20} 
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CommonHeader 
        title="Home" 
        rightIcons={[
          {
            name: 'attach-money',
            color: '#FFD700',
            onPress: () => console.log('Balance pressed')
          },
          {
            name: 'add',
            color: '#FFFFFF',
            onPress: () => console.log('Add pressed')
          }
        ]}
      />

      <ScrollableContentContainer
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Horizontal scroll for live widgets - simplified without haptics/snap effects */}
        <View style={styles.scrollContainer} onLayout={handleContainerLayout}>
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalWidgetContainer}
            onLayout={(event) => {
              // Measure the content width once the content is rendered
              const children = React.Children.count(renderFriendWatchingLive()) + 
                              React.Children.count(renderFriendHostingLive()) + 
                              React.Children.count(renderFriendListeningMusic()) +
                              React.Children.count(renderRandomFriendWidgets()) + 10; // Buffer
              handleContentLayout(children * 320);
            }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            bounces={true}
            decelerationRate="normal"
          >
            {renderFriendWatchingLive()}
            {renderFriendHostingLive()}
            {renderFriendListeningMusic()}
            {renderRandomFriendWidgets()}
          </ScrollView>
        </View>
        
        {/* Event Widget */}
        {renderEventWidget()}
        
        {/* Improved Gems Widget */}
        {renderGemsWidget()}
        
        {/* Announcements */}
        <Card style={styles.announcementCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Announcement</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </View>
          
          <View style={styles.messageContainer}>
            <Avatar.Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/32.jpg' }} 
              size={40} 
              style={styles.messageAvatar}
            />
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text style={styles.messageSender}>Sophia</Text>
                <Text style={styles.messageTime}>1h</Text>
              </View>
              <Text style={styles.messageUsername}>@Announcement</Text>
              <Text style={styles.messageText}>Please call me, test au...</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.showMoreButton}>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </Card>
        
        {/* Mentions */}
        <Card style={styles.mentionsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>@mentions</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </View>
          
          <View style={styles.messageContainer}>
            <Avatar.Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/32.jpg' }} 
              size={40} 
              style={styles.messageAvatar}
            />
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text style={styles.messageSender}>Sophia</Text>
                <Text style={styles.messageTime}>1h</Text>
              </View>
              <Text style={styles.messageUsername}>@YourUsername</Text>
              <Text style={styles.messageText}>Im bored what are you...</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.showMoreButton}>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </Card>
      </ScrollableContentContainer>
      
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
        fuelRequired={15}
        fuelAvailable={20}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    marginRight: -16, // Negative margin to allow widgets to extend past the screen edge
    paddingRight: 16, // Add padding to maintain spacing while allowing overflow
    overflow: 'visible', // Allow content to overflow container
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
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4B8BFF',
    overflow: 'hidden',
    margin: 3,
  },
  avatarWrapperRed: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF4B4B',
    overflow: 'hidden',
    margin: 3,
  },
  gridAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  plusMoreContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#4CAF50',
    position: 'relative',
    overflow: 'visible',
  },
  broadcasterContainerRed: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FF4B4B',
    position: 'relative',
    overflow: 'visible',
  },
  broadcasterAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
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
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#1DB954',
    position: 'relative',
    overflow: 'visible',
  },
  musicAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
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
});

export default HomeScreen; 