import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  TextInput,
  StatusBar,
  Platform,
  Dimensions,
  Animated,
  Modal,
  Alert,
  ScrollView,
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Feather, FontAwesome, AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BackButton from '../components/BackButton';
import MenuButton from '../components/MenuButton';
import ScrollableContentContainer from '../components/ScrollableContentContainer';
import { useUserProfile } from '../context/UserProfileContext';
import ProfileViewersSection from '../components/ProfileViewers';

const { width } = Dimensions.get('window');

// Define available status types
const STATUS_TYPES = {
  // Basic status types
  ONLINE: 'online',
  BUSY: 'busy',
  OFFLINE: 'offline',
  
  // Mood status types
  HAPPY: 'happy',
  SAD: 'sad',
  ANGRY: 'angry',
  HUNGRY: 'hungry',
  SLEEPY: 'sleepy',
  EXCITED: 'excited',
  BORED: 'bored',
  LOVE: 'love',
};

// Status category grouping
const STATUS_CATEGORIES = {
  DEFAULT: 'Default',
  MOOD: 'Mood'
};

const ProfileScreen = () => {
  const router = useRouter();
  const { 
    profileImage, 
    setProfileImage, 
    userStatus, 
    setUserStatus, 
    statusColor, 
    setStatusColor,
    totalViews,
    dailyViews,
    resetDailyViews,
    incrementViews,
    hasGemPlus,
    setHasGemPlus
  } = useUserProfile();
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [statusCategory, setStatusCategory] = useState(STATUS_CATEGORIES.DEFAULT);
  const [closefriendsOnly, setClosefriendsOnly] = useState(false);
  const [showProfileViewers, setShowProfileViewers] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [previewCurrentPage, setPreviewCurrentPage] = useState(0);
  const [previewTotalPages, setPreviewTotalPages] = useState(3); // 2 images + 1 bio page
  
  const statusSelectorAnim = useRef(new Animated.Value(0)).current;
  const profileScaleAnim = useRef(new Animated.Value(1)).current;
  const headerOpacityAnim = useRef(new Animated.Value(1)).current;
  
  // Improve the PanResponder implementation to ensure all elements are draggable
  const panY = useRef(new Animated.Value(0)).current;
  const [isDismissing, setIsDismissing] = useState(false);
  
  // Add new state for the photo selection modal
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  
  // Add animation ref for photo options modal
  const photoOptionsAnim = useRef(new Animated.Value(0)).current;
  
  // Add new state for friends modal and mock friends data
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friends, setFriends] = useState([
    {
      id: '1',
      name: 'Emma Wilson',
      username: '@emmaw',
      avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
      online: true,
      status: 'online'
    },
    {
      id: '2',
      name: 'Jack Reynolds',
      username: '@jackr',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      online: true,
      status: 'busy'
    },
    {
      id: '3',
      name: 'Sophie Turner',
      username: '@sophiet',
      avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
      online: false,
      status: 'offline'
    },
    {
      id: '4',
      name: 'Liam Chen',
      username: '@liamc',
      avatar: 'https://randomuser.me/api/portraits/men/44.jpg',
      online: true,
      status: 'happy'
    },
    {
      id: '5',
      name: 'Olivia Baker',
      username: '@oliviab',
      avatar: 'https://randomuser.me/api/portraits/women/15.jpg',
      online: true,
      status: 'online'
    },
    {
      id: '6',
      name: 'Noah Garcia',
      username: '@noahg',
      avatar: 'https://randomuser.me/api/portraits/men/23.jpg',
      online: false,
      status: 'offline'
    },
    {
      id: '7',
      name: 'Ava Martinez',
      username: '@avam',
      avatar: 'https://randomuser.me/api/portraits/women/19.jpg',
      online: true,
      status: 'excited'
    },
    {
      id: '8',
      name: 'James Johnson',
      username: '@jamesj',
      avatar: 'https://randomuser.me/api/portraits/men/12.jpg',
      online: true,
      status: 'busy'
    }
  ]);
  
  // Add state for filtered friends and search query
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [filteredFriends, setFilteredFriends] = useState(friends);
  
  // Add useEffect to filter friends when search query changes
  useEffect(() => {
    if (!friendSearchQuery.trim()) {
      setFilteredFriends(friends);
      return;
    }
    
    const query = friendSearchQuery.toLowerCase().trim();
    const results = friends.filter(friend => 
      friend.name.toLowerCase().includes(query) || 
      friend.username.toLowerCase().includes(query)
    );
    
    setFilteredFriends(results);
  }, [friendSearchQuery, friends]);
  
  // Add search input handler
  const handleFriendSearch = (text: string) => {
    setFriendSearchQuery(text);
  };
  
  // Increment views when the profile is opened
  useEffect(() => {
    incrementViews();
    
    // Simulate periodic views coming in (every 10-30 seconds)
    const viewsInterval = setInterval(() => {
      // Random chance to get a view (30% chance)
      if (Math.random() < 0.3) {
        incrementViews();
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(viewsInterval);
  }, []);

  const navigateToAccount = () => {
    router.push('/(main)/account');
  };

  // Update function to show photo options with animation
  const handleAddPhoto = () => {
    setShowPhotoOptions(true);
    Animated.timing(photoOptionsAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Function to hide photo options with animation
  const hidePhotoOptions = () => {
    Animated.timing(photoOptionsAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowPhotoOptions(false);
    });
  };

  // Update the take photo/upload photo handlers to use the hide function
  const handleTakePhoto = () => {
    // In a real app, this would open the camera
    Alert.alert('Camera', 'Opening camera for selfie...');
    
    hidePhotoOptions();
    
    // For demo purposes, simulate taking a photo with a delay
    setTimeout(() => {
      const newPhotoId = Math.floor(Math.random() * 70) + 1;
      const newProfileImage = `https://randomuser.me/api/portraits/women/${newPhotoId}.jpg`;
      setProfileImage(newProfileImage);
      
      // Show success message
      Alert.alert('Success', 'Your new selfie has been added to your profile!');
    }, 1500);
  };

  const handleUploadPhoto = () => {
    // In a real app, this would open the photo gallery
    Alert.alert('Photo Gallery', 'Opening photo gallery...');
    
    hidePhotoOptions();
    
    // For demo purposes, simulate selecting a photo with a delay
    setTimeout(() => {
      const newPhotoId = Math.floor(Math.random() * 70) + 1;
      const newProfileImage = `https://randomuser.me/api/portraits/women/${newPhotoId}.jpg`;
      setProfileImage(newProfileImage);
      
      // Show success message
      Alert.alert('Success', 'Your selected photo has been added to your profile!');
    }, 1500);
  };

  // Calculate photo options animations
  const photoOptionsTranslateY = photoOptionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const photoOptionsOpacity = photoOptionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Function to show status selector with animation
  const showStatusMenu = () => {
    setShowStatusSelector(true);
    Animated.timing(statusSelectorAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Function to hide status selector with animation
  const hideStatusMenu = () => {
    Animated.timing(statusSelectorAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowStatusSelector(false);
    });
  };

  // Function to change status and close menu
  const changeStatus = (newStatus: string) => {
    setUserStatus(newStatus);
    
    // Update status color based on the new status
    const statusData = getStatusData(newStatus);
    setStatusColor(statusData.color);
    
    hideStatusMenu();
  };

  // Get status data based on current status
  const getStatusData = (status: string = userStatus) => {
    switch(status) {
      // Default statuses
      case STATUS_TYPES.ONLINE:
        return {
          color: '#7ADA72', // Green
          text: 'Online',
          subtext: 'Active Now',
          glowColor: 'rgba(122, 218, 114, 0.3)',
          icon: null
        };
      case STATUS_TYPES.BUSY:
        return {
          color: '#E57373', // Red
          text: 'Busy',
          subtext: 'Do Not Disturb',
          glowColor: 'rgba(229, 115, 115, 0.3)',
          icon: <Feather name="slash" size={18} color="#FFFFFF" />
        };
      case STATUS_TYPES.OFFLINE:
        return {
          color: '#35383F', // Dark gray/black
          text: 'Offline',
          subtext: 'Invisible to Others',
          glowColor: 'rgba(53, 56, 63, 0.3)',
          icon: <Feather name="eye-off" size={16} color="#FFFFFF" />
        };
        
      // Mood statuses
      case STATUS_TYPES.HAPPY:
        return {
          color: '#FFD700', // Gold
          text: 'Happy',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(255, 215, 0, 0.3)',
          icon: <MaterialCommunityIcons name="emoticon-happy-outline" size={18} color="#FFFFFF" />
        };
      case STATUS_TYPES.SAD:
        return {
          color: '#5C9ACE', // Blue
          text: 'Sad',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(92, 154, 206, 0.3)',
          icon: <MaterialCommunityIcons name="emoticon-sad-outline" size={18} color="#FFFFFF" />
        };
      case STATUS_TYPES.ANGRY:
        return {
          color: '#FF6B3D', // Orange Red
          text: 'Angry',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(255, 107, 61, 0.3)',
          icon: <MaterialCommunityIcons name="emoticon-angry-outline" size={18} color="#FFFFFF" />
        };
      case STATUS_TYPES.HUNGRY:
        return {
          color: '#FF9966', // Orange
          text: 'Hungry',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(255, 153, 102, 0.3)',
          icon: <MaterialCommunityIcons name="food-fork-drink" size={18} color="#FFFFFF" />
        };
      case STATUS_TYPES.SLEEPY:
        return {
          color: '#8E77B5', // Purple
          text: 'Sleepy',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(142, 119, 181, 0.3)',
          icon: <MaterialCommunityIcons name="sleep" size={18} color="#FFFFFF" />
        };
      case STATUS_TYPES.EXCITED:
        return {
          color: '#FF5CAD', // Pink
          text: 'Excited',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(255, 92, 173, 0.3)',
          icon: <MaterialCommunityIcons name="emoticon-excited-outline" size={18} color="#FFFFFF" />
        };
      case STATUS_TYPES.BORED:
        return {
          color: '#9E9E9E', // Gray
          text: 'Bored',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(158, 158, 158, 0.3)',
          icon: <MaterialCommunityIcons name="emoticon-neutral-outline" size={18} color="#FFFFFF" />
        };
      case STATUS_TYPES.LOVE:
        return {
          color: '#F06292', // Pink
          text: 'In Love',
          subtext: closefriendsOnly ? 'Visible to Close Friends' : 'Visible to Everyone',
          glowColor: 'rgba(240, 98, 146, 0.3)',
          icon: <MaterialCommunityIcons name="heart-outline" size={18} color="#FFFFFF" />
        };
      default:
        return {
          color: '#7ADA72',
          text: 'Online',
          subtext: 'Active Now',
          glowColor: 'rgba(122, 218, 114, 0.3)',
          icon: null
        };
    }
  };

  const statusData = getStatusData();

  // Status selector animation calculations
  const statusSelectorTranslateY = statusSelectorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const statusSelectorOpacity = statusSelectorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleMenuPress = () => {
    Alert.alert('Menu', 'Menu options will be displayed here');
  };

  // Toggle Gem+ status for demo purposes
  const toggleGemPlus = () => {
    setHasGemPlus(!hasGemPlus);
  };

  // Function to open ProfileViewers and reset daily counter
  const openProfileViewers = () => {
    resetDailyViews();
    setShowProfileViewers(true);
  };

  // Function to handle preview navigation
  const navigatePreview = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      if (previewCurrentPage < previewTotalPages - 1) {
        setPreviewCurrentPage(previewCurrentPage + 1);
      } else {
        // If on last page and going forward, circle back to first page
        setPreviewCurrentPage(0);
      }
    } else {
      if (previewCurrentPage > 0) {
        setPreviewCurrentPage(previewCurrentPage - 1);
      } else {
        // If on first page and going back, circle to last page
        setPreviewCurrentPage(previewTotalPages - 1);
      }
    }
  };

  // Function to reset preview when opening
  const openPreview = () => {
    panY.setValue(0);
    setPreviewCurrentPage(0);
    setShowProfilePreview(true);
  };

  // Add scroll handler for animations
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: new Animated.Value(0) } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollY = event.nativeEvent.contentOffset.y;
        // Scale profile image down slightly when scrolling
        if (scrollY > 0) {
          Animated.spring(profileScaleAnim, {
            toValue: 0.95,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }).start();
          // Fade header
          Animated.timing(headerOpacityAnim, {
            toValue: 0.8,
            duration: 150,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(profileScaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }).start();
          // Restore header
          Animated.timing(headerOpacityAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start();
        }
      },
    }
  );

  // Update dismiss function to prevent flash
  const dismissPreview = () => {
    if (isDismissing) return; // Prevent multiple calls
    
    setIsDismissing(true);
    
    // Run animation
    Animated.timing(panY, {
      toValue: -1500,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      // Only hide the modal after animation completes
      setShowProfilePreview(false);
      // Reset state after hiding
      setTimeout(() => {
        panY.setValue(0);
        setIsDismissing(false);
      }, 200);
    });
  };

  // Update PanResponder to use the new dismiss function
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panY.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 50) {
          panY.setValue(50);
        } else {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        
        if (gestureState.dy < -60 || gestureState.vy < -0.5) {
          dismissPreview();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        panY.flattenOffset();
        Animated.spring(panY, {
          toValue: 0,
          tension: 40,
          friction: 5,
          useNativeDriver: true,
        }).start();
      }
    })
  ).current;

  // Function to get status color based on friend's status
  const getFriendStatusColor = (status: string): string => {
    switch(status) {
      case 'online': return '#7ADA72';
      case 'busy': return '#E57373';
      case 'offline': return '#35383F';
      case 'happy': return '#FFD700';
      case 'excited': return '#FF5CAD';
      default: return '#7ADA72';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Header with title */}
      <Animated.View style={[
        styles.header,
        { opacity: headerOpacityAnim }
      ]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </Animated.View>
      
      {/* Game-style currency top bar - moved under the header */}
      <View style={styles.gameTopBar}>
        {/* Diamonds currency */}
        <View style={styles.currencyContainer}>
          <LinearGradient
            colors={['#7872F4', '#5865F2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.currencyPill}
          >
            <View style={styles.diamondIconContainer}>
              <LinearGradient
                colors={['#9C84EF', '#F47FFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.diamondIcon}
              >
                <MaterialCommunityIcons name="diamond-stone" size={18} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.currencyAmount}>200,012</Text>
          </LinearGradient>
        </View>
        
        {/* Gold currency */}
        <View style={styles.currencyContainer}>
          <LinearGradient
            colors={['#8B7000', '#614C00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.currencyPill}
          >
            <View style={styles.goldIconContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.goldIcon}
              >
                <FontAwesome name="circle" size={16} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.currencyAmount}>43,978</Text>
          </LinearGradient>
        </View>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Status Section */}
        <View style={styles.statusSection}>
          <TouchableOpacity 
            style={styles.onlineStatus}
            onPress={showStatusMenu}
            activeOpacity={0.7}
          >
            <View style={styles.onlineStatusIconContainer}>
              <View 
                style={[
                  styles.onlineStatusIconOuterGlow,
                  { backgroundColor: statusData.glowColor }
                ]} 
              />
              <View 
                style={[
                  styles.onlineStatusIcon,
                  { backgroundColor: statusData.color }
                ]}
              >
                {statusData.icon}
              </View>
            </View>
            <View>
              <Text style={styles.onlineText}>{statusData.text}</Text>
              <Text style={styles.onlineSubtext}>{statusData.subtext}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={navigateToAccount}
          >
            <View style={styles.actionCircle}>
              <Feather name="settings" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Account</Text>
          </TouchableOpacity>
        </View>
        
        {/* Enhanced Profile Info Card */}
        <View style={styles.profileInfoCard}>
          <LinearGradient
            colors={['#6E69F4', '#C549BC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileInfoCardGradient}
          >
            <Animated.View style={[
              styles.profileInfoContainer,
              { transform: [{ scale: profileScaleAnim }] }
            ]}>
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={openPreview}
                style={styles.profileImageTouchable}
              >
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.profileImage} 
                />
                <View style={styles.profileImageOverlay}>
                  <Feather name="eye" size={24} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfoTextContainer}>
                <Text style={styles.profileName}>Sophia Jack</Text>
                <Text style={styles.profileUsername}>@Sophia93</Text>
              </View>
            </Animated.View>
          </LinearGradient>
        </View>
        
        {/* Profile Views Counter - Single Clean Component */}
        <TouchableOpacity 
          style={styles.viewsCounterContainer}
          onPress={openProfileViewers}
        >
          <LinearGradient
            colors={['#6E69F4', '#5865F2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.viewsCounter}
          >
            <View style={styles.viewsIconBox}>
              <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.viewsTextContainer}>
              <Text style={styles.viewsLabel}>Today's Profile Views</Text>
              <Text style={styles.viewsValue}>{dailyViews}</Text>
            </View>
            <View style={styles.viewersArrowContainer}>
              <Feather name="chevron-right" size={20} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Photos Section */}
        <View style={styles.photoSection}>
          {/* Photos Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Photos (3)</Text>
            <TouchableOpacity onPress={openPreview}>
              <LinearGradient
                colors={['#7872F4', '#5865F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.previewButton}
              >
                <Text style={styles.previewButtonText}>Preview</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {/* Photos Grid */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.photosContainer}
            contentContainerStyle={styles.photosContent}
          >
            {/* Add Photo Button - First photo becomes your profile picture */}
            <TouchableOpacity onPress={handleAddPhoto}>
              <LinearGradient
                colors={['#6E69F4', '#9C84EF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addPhotoButton}
              >
                <View style={styles.addPhotoIconContainer}>
                  <AntDesign name="plus" size={32} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Profile Photo Display - Shows same image as profile square */}
            <TouchableOpacity style={styles.photoItemContainer}>
              <View style={[styles.profilePhotoContainer, { borderColor: statusData.color }]}>
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.profilePhotoItem}
                  resizeMode="cover"
                />
              </View>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.photoGradient}
              />
            </TouchableOpacity>
            
            {/* Other photos */}
            {[34, 32].map((id) => (
              <TouchableOpacity key={id} style={styles.photoItemContainer}>
                <Image 
                  source={{ uri: `https://randomuser.me/api/portraits/women/${id}.jpg` }} 
                  style={styles.photoItem}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.photoGradient}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Gem+ Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.gemSection}>
            <LinearGradient
              colors={['rgba(110, 105, 244, 0.15)', 'rgba(196, 73, 188, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gemIconContainer}
            >
              <LinearGradient
                colors={['#9C84EF', '#F47FFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gemIcon}
              >
                <MaterialCommunityIcons name="diamond-stone" size={24} color="#FFFFFF" />
              </LinearGradient>
            </LinearGradient>
            
            <View style={styles.gemInfoContainer}>
              <View style={styles.gemLabelContainer}>
                <Text style={styles.gemLabel}>Gem+</Text>
                <View style={styles.inactiveButton}>
                  <Text style={styles.inactiveText}>Inactive</Text>
                </View>
              </View>
              
              <TouchableOpacity>
                <LinearGradient
                  colors={['#6E69F4', '#5865F2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buyButton}
                >
                  <Text style={styles.buyText}>Buy</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Friends Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setShowFriendsModal(true)}
          >
            <LinearGradient
              colors={['rgba(110, 105, 244, 0.15)', 'rgba(88, 101, 242, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.friendsSection}
            >
              <View style={styles.friendsSectionLeft}>
                <Feather name="users" size={20} color="#FFFFFF" style={styles.friendsIcon} />
                <Text style={styles.friendsText}>Your Friends</Text>
                <View style={styles.friendsCountBadge}>
                  <Text style={styles.friendsCountText}>{friends.length}</Text>
                </View>
              </View>
              <View style={styles.friendsArrowContainer}>
                <Feather name="chevron-right" size={16} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Spacing for bottom of screen */}
        <View style={{ height: 70 }} />
      </ScrollView>

      {/* Status Selector Modal */}
      <Modal
        visible={showStatusSelector}
        transparent
        animationType="none"
        onRequestClose={hideStatusMenu}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={hideStatusMenu}
          />
          
          <Animated.View 
            style={[
              styles.statusSelectorContainer,
              {
                transform: [{ translateY: statusSelectorTranslateY }],
                opacity: statusSelectorOpacity,
              }
            ]}
          >
            <View style={styles.statusSelectorHandle} />
            <Text style={styles.statusSelectorTitle}>Set Status</Text>
            
            {/* Category Selector */}
            <View style={styles.categorySelector}>
              <TouchableOpacity 
                style={[
                  styles.categoryButton, 
                  statusCategory === STATUS_CATEGORIES.DEFAULT && styles.categoryButtonActive
                ]}
                onPress={() => setStatusCategory(STATUS_CATEGORIES.DEFAULT)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  statusCategory === STATUS_CATEGORIES.DEFAULT && styles.categoryButtonTextActive
                ]}>Default</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.categoryButton, 
                  statusCategory === STATUS_CATEGORIES.MOOD && styles.categoryButtonActive
                ]}
                onPress={() => setStatusCategory(STATUS_CATEGORIES.MOOD)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  statusCategory === STATUS_CATEGORIES.MOOD && styles.categoryButtonTextActive
                ]}>Mood</Text>
              </TouchableOpacity>
            </View>
            
            {/* Toggle for Close Friends Only - Only shown for Mood statuses */}
            {statusCategory === STATUS_CATEGORIES.MOOD && (
              <View style={styles.closeFriendsSection}>
                <View style={styles.closeFriendsToggle}>
                  <Text style={styles.closeFriendsText}>Visible to close friends only</Text>
                  <TouchableOpacity 
                    style={[
                      styles.toggleButton,
                      closefriendsOnly && styles.toggleButtonActive
                    ]}
                    onPress={() => setClosefriendsOnly(!closefriendsOnly)}
                  >
                    <View style={[
                      styles.toggleCircle,
                      closefriendsOnly && styles.toggleCircleActive
                    ]} />
                  </TouchableOpacity>
                </View>
                
                {/* Manage Close Friends Button */}
                <TouchableOpacity 
                  style={styles.manageFriendsButton}
                  onPress={() => {
                    console.log("Navigating to Close Friends screen");
                    hideStatusMenu();
                    router.push({
                      pathname: '/(main)/close-friends',
                      params: { source: '/(main)/profile' }
                    });
                  }}
                >
                  <Text style={styles.manageFriendsText}>Manage Close Friends</Text>
                  <Feather name="chevron-right" size={16} color="#6E69F4" />
                </TouchableOpacity>
              </View>
            )}
            
            {/* Default Status Options */}
            {statusCategory === STATUS_CATEGORIES.DEFAULT && (
              <>
                <TouchableOpacity 
                  style={styles.statusOption}
                  onPress={() => changeStatus(STATUS_TYPES.ONLINE)}
                >
                  <View style={[styles.statusOptionIcon, { backgroundColor: '#7ADA72' }]}>
                    <View style={styles.statusOptionIconInner} />
                  </View>
                  <View style={styles.statusOptionTextContainer}>
                    <Text style={styles.statusOptionTitle}>Online</Text>
                    <Text style={styles.statusOptionSubtitle}>Active Now</Text>
                  </View>
                  {userStatus === STATUS_TYPES.ONLINE && (
                    <View style={styles.statusOptionSelected}>
                      <AntDesign name="check" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statusOption}
                  onPress={() => changeStatus(STATUS_TYPES.BUSY)}
                >
                  <View style={[styles.statusOptionIcon, { backgroundColor: '#E57373' }]}>
                    <Feather name="slash" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.statusOptionTextContainer}>
                    <Text style={styles.statusOptionTitle}>Busy</Text>
                    <Text style={styles.statusOptionSubtitle}>Do Not Disturb</Text>
                  </View>
                  {userStatus === STATUS_TYPES.BUSY && (
                    <View style={styles.statusOptionSelected}>
                      <AntDesign name="check" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statusOption}
                  onPress={() => changeStatus(STATUS_TYPES.OFFLINE)}
                >
                  <View style={[styles.statusOptionIcon, { backgroundColor: '#35383F' }]}>
                    <Feather name="eye-off" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.statusOptionTextContainer}>
                    <Text style={styles.statusOptionTitle}>Offline</Text>
                    <Text style={styles.statusOptionSubtitle}>Invisible to Others</Text>
                  </View>
                  {userStatus === STATUS_TYPES.OFFLINE && (
                    <View style={styles.statusOptionSelected}>
                      <AntDesign name="check" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}
            
            {/* Mood Status Options in a Grid Layout */}
            {statusCategory === STATUS_CATEGORIES.MOOD && (
              <View style={styles.moodGrid}>
                <TouchableOpacity 
                  style={styles.moodItem}
                  onPress={() => changeStatus(STATUS_TYPES.HAPPY)}
                >
                  <View style={[styles.moodIcon, { backgroundColor: '#FFD700' }]}>
                    <MaterialCommunityIcons name="emoticon-happy-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.moodText}>Happy</Text>
                  {userStatus === STATUS_TYPES.HAPPY && (
                    <View style={styles.moodSelected}>
                      <AntDesign name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.moodItem}
                  onPress={() => changeStatus(STATUS_TYPES.SAD)}
                >
                  <View style={[styles.moodIcon, { backgroundColor: '#5C9ACE' }]}>
                    <MaterialCommunityIcons name="emoticon-sad-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.moodText}>Sad</Text>
                  {userStatus === STATUS_TYPES.SAD && (
                    <View style={styles.moodSelected}>
                      <AntDesign name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.moodItem}
                  onPress={() => changeStatus(STATUS_TYPES.ANGRY)}
                >
                  <View style={[styles.moodIcon, { backgroundColor: '#FF6B3D' }]}>
                    <MaterialCommunityIcons name="emoticon-angry-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.moodText}>Angry</Text>
                  {userStatus === STATUS_TYPES.ANGRY && (
                    <View style={styles.moodSelected}>
                      <AntDesign name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.moodItem}
                  onPress={() => changeStatus(STATUS_TYPES.HUNGRY)}
                >
                  <View style={[styles.moodIcon, { backgroundColor: '#FF9966' }]}>
                    <MaterialCommunityIcons name="food-fork-drink" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.moodText}>Hungry</Text>
                  {userStatus === STATUS_TYPES.HUNGRY && (
                    <View style={styles.moodSelected}>
                      <AntDesign name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.moodItem}
                  onPress={() => changeStatus(STATUS_TYPES.SLEEPY)}
                >
                  <View style={[styles.moodIcon, { backgroundColor: '#8E77B5' }]}>
                    <MaterialCommunityIcons name="sleep" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.moodText}>Sleepy</Text>
                  {userStatus === STATUS_TYPES.SLEEPY && (
                    <View style={styles.moodSelected}>
                      <AntDesign name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.moodItem}
                  onPress={() => changeStatus(STATUS_TYPES.EXCITED)}
                >
                  <View style={[styles.moodIcon, { backgroundColor: '#FF5CAD' }]}>
                    <MaterialCommunityIcons name="emoticon-excited-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.moodText}>Excited</Text>
                  {userStatus === STATUS_TYPES.EXCITED && (
                    <View style={styles.moodSelected}>
                      <AntDesign name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.moodItem}
                  onPress={() => changeStatus(STATUS_TYPES.BORED)}
                >
                  <View style={[styles.moodIcon, { backgroundColor: '#9E9E9E' }]}>
                    <MaterialCommunityIcons name="emoticon-neutral-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.moodText}>Bored</Text>
                  {userStatus === STATUS_TYPES.BORED && (
                    <View style={styles.moodSelected}>
                      <AntDesign name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.moodItem}
                  onPress={() => changeStatus(STATUS_TYPES.LOVE)}
                >
                  <View style={[styles.moodIcon, { backgroundColor: '#F06292' }]}>
                    <MaterialCommunityIcons name="heart-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.moodText}>In Love</Text>
                  {userStatus === STATUS_TYPES.LOVE && (
                    <View style={styles.moodSelected}>
                      <AntDesign name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
      
      {/* Profile Viewers Modal */}
      <Modal
        visible={showProfileViewers}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowProfileViewers(false);
        }}
      >
        <ProfileViewersSection 
          title="Profile Viewers" 
          subtitle="See who's viewing your profile"
          onClose={() => {
            setShowProfileViewers(false);
          }} 
        />
      </Modal>
      
      {/* Profile Preview Modal */}
      <Modal
        visible={showProfilePreview}
        transparent
        animationType="none"
        onRequestClose={dismissPreview}
      >
        <Animated.View style={[
          styles.previewOverlay,
          { 
            opacity: panY.interpolate({
              inputRange: [-300, 0],
              outputRange: [0, 1],
              extrapolate: 'clamp'
            }) 
          }
        ]}>
          <TouchableOpacity 
            style={styles.previewOverlayTouchable}
            activeOpacity={1}
            onPress={dismissPreview}
          />
          
          <Animated.View 
            style={[
              styles.previewCard,
              { 
                transform: [{ translateY: panY }],
                opacity: panY.interpolate({
                  inputRange: [-200, -100, 0, 50],
                  outputRange: [0, 0.5, 1, 1],
                  extrapolate: 'clamp'
                })
              }
            ]}
            {...panResponder.panHandlers}
          >
            {/* Improved swipe indicator line */}
            <View style={styles.swipeIndicatorContainer}>
              <View style={styles.swipeIndicator} />
              <Text style={styles.swipeHintText}>@Sophia93</Text>
            </View>
            
            {/* Pagination dots */}
            <View style={styles.paginationContainer}>
              <View style={styles.paginationDots}>
                {Array.from({ length: previewTotalPages }).map((_, index) => (
                  <View 
                    key={`dot-${index}`}
                    style={[
                      styles.paginationDot, 
                      previewCurrentPage === index && styles.paginationDotActive
                    ]} 
                  />
                ))}
              </View>
            </View>
            
            {/* Content (images or bio) */}
            {previewCurrentPage === previewTotalPages - 1 ? (
              // Bio page - improved styling
              <View style={styles.previewBioContainer}>
                {/* Left side click area for previous */}
                <TouchableOpacity
                  style={styles.previewNavigationLeft}
                  activeOpacity={0.8}
                  onPress={() => navigatePreview('prev')}
                />
                
                {/* Right side click area for next */}
                <TouchableOpacity
                  style={styles.previewNavigationRight}
                  activeOpacity={0.8}
                  onPress={() => navigatePreview('next')}
                />
                
                <Text style={styles.previewDisplayNameBio}>Sophia Jack</Text>
                <View style={styles.bioSeparator} />
                
                <Text style={styles.previewBioTitle}>About Me</Text>
                <Text style={styles.previewBioText}>
                  Hey there! I'm Sophia. I love photography, music, and exploring new places.
                  Feel free to message me anytime! 💫
                </Text>
              </View>
            ) : (
              // Image pages - with top and bottom gradients
              <View style={styles.previewImageContainer}>
                {/* Left side click area for previous */}
                <TouchableOpacity
                  style={styles.previewNavigationLeft}
                  activeOpacity={0.8}
                  onPress={() => navigatePreview('prev')}
                />
                
                {/* Right side click area for next */}
                <TouchableOpacity
                  style={styles.previewNavigationRight}
                  activeOpacity={0.8}
                  onPress={() => navigatePreview('next')}
                />
                
                <Image 
                  source={{ uri: previewCurrentPage === 0 
                    ? profileImage 
                    : `https://randomuser.me/api/portraits/women/${30 + previewCurrentPage}.jpg` 
                  }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                
                {/* Top info overlay with gradient for header */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.5)', 'transparent']}
                  style={styles.previewImageTopOverlay}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <TouchableOpacity 
                    style={styles.previewBackButton}
                    onPress={dismissPreview}
                  >
                    <Feather name="chevron-left" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  
                  <View style={styles.previewNameContainer}>
                    <Text style={styles.previewDisplayNameImage}>Sophia Jack</Text>
                    <View style={styles.previewUsernameWrapper}>
                      <Text style={styles.previewUsername}>@Sophia93</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity style={styles.previewMoreButton}>
                    <Feather name="more-vertical" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </LinearGradient>
                
                {/* Bottom info overlay with gradient */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.previewImageBottomOverlay}
                >
                  <Text style={styles.previewImageDimensions}>1000×1800</Text>
                </LinearGradient>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
      
      {/* Photo Options Modal */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="none"
        onRequestClose={hidePhotoOptions}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={hidePhotoOptions}
          />
          
          <Animated.View
            style={[
              styles.photoOptionsContainer,
              {
                transform: [{ translateY: photoOptionsTranslateY }],
                opacity: photoOptionsOpacity,
              }
            ]}
          >
            <View style={styles.photoOptionsHandle} />
            <Text style={styles.photoOptionsTitle}>Add Photo</Text>
            
            <TouchableOpacity 
              style={styles.photoOptionButton}
              activeOpacity={0.8}
              onPress={handleTakePhoto}
            >
              <LinearGradient
                colors={['#6E69F4', '#8C67D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.photoOptionIconContainer}
              >
                <Ionicons name="camera" size={24} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.photoOptionTextContainer}>
                <Text style={styles.photoOptionTitle}>Take Selfie</Text>
                <Text style={styles.photoOptionSubtitle}>Open camera to take a new photo</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.photoOptionButton}
              activeOpacity={0.8}
              onPress={handleUploadPhoto}
            >
              <LinearGradient
                colors={['#6E69F4', '#8C67D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.photoOptionIconContainer}
              >
                <Ionicons name="images" size={24} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.photoOptionTextContainer}>
                <Text style={styles.photoOptionTitle}>Upload from Gallery</Text>
                <Text style={styles.photoOptionSubtitle}>Choose a photo from your device</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              activeOpacity={0.7}
              onPress={hidePhotoOptions}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Friends Modal */}
      <Modal
        visible={showFriendsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <View style={styles.friendsModalContainer}>
          <View style={styles.friendsModalHeader}>
            <TouchableOpacity 
              style={styles.friendsModalBackButton}
              onPress={() => setShowFriendsModal(false)}
            >
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.friendsModalTitle}>Your Friends</Text>
            <TouchableOpacity style={styles.friendsModalAction}>
              <Feather name="user-plus" size={22} color="#6E69F4" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.friendsSearchContainer}>
            <View style={styles.friendsSearchBar}>
              <Feather name="search" size={18} color="#A8B3BD" />
              <TextInput
                style={styles.friendsSearchInput}
                placeholder="Search friends..."
                placeholderTextColor="#A8B3BD"
                value={friendSearchQuery}
                onChangeText={handleFriendSearch}
                autoCapitalize="none"
              />
            </View>
          </View>
          
          <ScrollView style={styles.friendsListContainer}>
            {filteredFriends.length > 0 ? (
              filteredFriends.map(friend => (
                <TouchableOpacity key={friend.id} style={styles.friendItem}>
                  <View style={styles.friendAvatarContainer}>
                    <Image
                      source={{ uri: friend.avatar }}
                      style={styles.friendAvatar}
                    />
                    <View 
                      style={[
                        styles.friendStatusDot,
                        { backgroundColor: getFriendStatusColor(friend.status) }
                      ]} 
                    />
                  </View>
                  
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                    <Text style={styles.friendUsername}>{friend.username}</Text>
                  </View>
                  
                  <View style={styles.friendActions}>
                    <TouchableOpacity style={styles.friendActionButton}>
                      <Feather name="message-circle" size={22} color="#6E69F4" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResultsContainer}>
                <Feather name="search" size={52} color="#535864" />
                <Text style={styles.noResultsText}>No friends found</Text>
                <Text style={styles.noResultsSubText}>Try a different search term</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#131318',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineStatusIconContainer: {
    position: 'relative',
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineStatusIconOuterGlow: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  onlineStatusIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#15151A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineText: {
    marginLeft: 15,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  onlineSubtext: {
    marginLeft: 15,
    color: '#A8B3BD',
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 55,
  },
  actionCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(54, 57, 63, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  profileInfoCard: {
    margin: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileInfoCardGradient: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  profileInfoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  profileImageTouchable: {
    position: 'relative',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'rgba(156, 132, 239, 1)',
  },
  profileImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  profileInfoTextContainer: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileUsername: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '400',
  },
  viewsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewsCount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  photoSection: {
    paddingTop: 15,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: '#1C1D23',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '600',
  },
  previewButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  photosContainer: {
    backgroundColor: '#1C1D23',
    paddingVertical: 14,
  },
  photosContent: {
    paddingHorizontal: 12,
    gap: 15,
  },
  addPhotoButton: {
    width: 83,
    height: 126,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoItemContainer: {
    width: 83,
    height: 126,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoItem: {
    width: 83,
    height: 126,
    borderRadius: 12,
  },
  photoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  sectionContainer: {
    marginHorizontal: 12,
    marginTop: 15,
  },
  gemSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    gap: 16,
  },
  gemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gemIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  gemInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gemLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gemLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  inactiveButton: {
    backgroundColor: '#535864',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  inactiveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  buyButton: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  buyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  friendsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 18,
  },
  friendsSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendsIcon: {
    marginRight: 12,
  },
  friendsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  friendsCountBadge: {
    backgroundColor: 'rgba(110, 105, 244, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
  },
  friendsCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  friendsArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusSelectorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1D23',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20, // Extra padding for iPhone
  },
  statusSelectorHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3E4148',
    alignSelf: 'center',
    marginBottom: 20,
  },
  statusSelectorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statusOptionIconInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  statusOptionTextContainer: {
    flex: 1,
  },
  statusOptionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusOptionSubtitle: {
    color: '#A8B3BD',
    fontSize: 12,
    marginTop: 2,
  },
  statusOptionSelected: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySelector: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#292B31',
    padding: 4,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#6E69F4',
  },
  categoryButtonText: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  closeFriendsSection: {
    marginBottom: 15,
  },
  closeFriendsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#292B31',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  closeFriendsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleButton: {
    width: 44,
    height: 24,
    backgroundColor: '#3E4148',
    borderRadius: 12,
    padding: 2,
  },
  toggleButtonActive: {
    backgroundColor: '#6E69F4',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleCircleActive: {
    marginLeft: 'auto',
  },
  manageFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#292B31',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
  },
  manageFriendsText: {
    color: '#6E69F4',
    fontSize: 14,
    fontWeight: '500',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodItem: {
    width: '31%', // approx 3 items per row with spacing
    backgroundColor: '#292B31',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  moodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  moodSelected: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6E69F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoContainer: {
    width: 83,
    height: 126,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#1E1F25',
    borderWidth: 2,
    borderColor: '#7ADA72', // Default value, will be overridden
  },
  profilePhotoItem: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  gameTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#15151C',
  },
  currencyContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 6,
    paddingRight: 12,
    paddingLeft: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  diamondIconContainer: {
    marginRight: 6,
  },
  diamondIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldIconContainer: {
    marginRight: 6,
  },
  goldIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  viewersArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewsCounterContainer: {
    marginHorizontal: 12,
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  viewsCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 16,
  },
  viewsIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  viewsTextContainer: {
    flex: 1,
  },
  viewsLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  viewsValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  previewCard: {
    width: '90%',
    height: '80%',
    backgroundColor: '#1A1A20',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  swipeIndicatorContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 5,
  },
  swipeIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 5,
  },
  paginationContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewImageContainer: {
    flex: 1,
    position: 'relative',
    margin: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0D0D12',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E74C3C',
  },
  previewImageTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  previewNameContainer: {
    flex: 1,
    alignItems: 'center',
  },
  previewDisplayNameImage: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  previewUsernameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewUsername: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  previewMoreButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImageBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    alignItems: 'flex-end',
  },
  previewImageDimensions: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  previewBioContainer: {
    flex: 1,
    padding: 22,
    backgroundColor: '#1C1D23',
    margin: 10,
    borderRadius: 16,
    position: 'relative',
  },
  previewDisplayNameBio: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bioSeparator: {
    height: 2,
    backgroundColor: 'rgba(110, 105, 244, 0.5)',
    width: 60,
    marginVertical: 12,
    borderRadius: 1,
  },
  previewBioTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 12,
  },
  previewBioText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  previewNavigationLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '40%',
    zIndex: 10,
  },
  previewNavigationRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    zIndex: 10,
  },
  previewBackButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOptionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1D23',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20, // Extra padding for iPhone
  },
  photoOptionsHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3E4148',
    alignSelf: 'center',
    marginBottom: 20,
  },
  photoOptionsTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  photoOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#292B31',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoOptionIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  photoOptionTextContainer: {
    flex: 1,
  },
  photoOptionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  photoOptionSubtitle: {
    color: '#A8B3BD',
    fontSize: 12,
    marginTop: 4,
  },
  cancelButton: {
    backgroundColor: '#35383F',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  friendsModalContainer: {
    flex: 1,
    backgroundColor: '#131318',
  },
  friendsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendsModalBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsModalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  friendsModalAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsSearchContainer: {
    padding: 16,
  },
  friendsSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1D23',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  friendsSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
    paddingVertical: 8,
  },
  friendsListContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  friendAvatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  friendStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#131318',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendUsername: {
    color: '#A8B3BD',
    fontSize: 14,
  },
  friendActions: {
    flexDirection: 'row',
  },
  friendActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginLeft: 5,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  noResultsSubText: {
    color: '#A8B3BD',
    fontSize: 14,
    marginTop: 4,
  },
});

export default ProfileScreen; 
