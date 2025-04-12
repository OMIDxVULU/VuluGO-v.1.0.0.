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
  
  const statusSelectorAnim = useRef(new Animated.Value(0)).current;
  
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

  // Function to handle uploading a new photo
  const handleAddPhoto = () => {
    // In a real app, this would open the device's image picker
    // For demo purposes, we'll just simulate adding a new random profile image
    const newPhotoId = Math.floor(Math.random() * 70) + 1;
    const newProfileImage = `https://randomuser.me/api/portraits/women/${newPhotoId}.jpg`;
    
    // The first photo you upload automatically becomes your profile picture
    // This updates both the profile square at the top and the first photo in the gallery
    setProfileImage(newProfileImage);
    
    // Here you would typically upload the image to your backend
    console.log('Profile photo updated');
  };

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
  const translateY = statusSelectorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const opacity = statusSelectorAnim.interpolate({
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with title only - top most element */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      
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
      
      <ScrollableContentContainer
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
        
        {/* Profile Info Card */}
        <View style={styles.profileInfoCard}>
          <LinearGradient
            colors={['#6E69F4', '#C549BC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileInfoCardGradient}
          >
            <View style={styles.profileInfoContainer}>
              <Image 
                source={{ uri: profileImage }} 
                style={styles.profileImage} 
              />
              <View style={styles.profileInfoTextContainer}>
                <Text style={styles.profileName}>Sophia Jack</Text>
                <Text style={styles.profileUsername}>@Sophia93</Text>
              </View>
            </View>
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
            <TouchableOpacity>
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
        <View style={styles.gemSection}>
          <LinearGradient
            colors={['#272931', '#1E1F25']}
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
          
          <LinearGradient
            colors={['#272931', '#1E1F25']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gemInfoContainer}
          >
            <Text style={styles.gemLabel}>Gem+</Text>
            <View style={styles.inactiveButton}>
              <Text style={styles.inactiveText}>Inactive</Text>
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
          </LinearGradient>
        </View>
        
        {/* Friends Section */}
        <TouchableOpacity>
          <LinearGradient
            colors={['#1C1D23', '#15151A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.friendsSection}
          >
            <View style={styles.friendsSectionLeft}>
              <Text style={styles.friendsText}>Your Friends</Text>
              <View style={styles.friendsCountBadge}>
                <Text style={styles.friendsCountText}>48</Text>
              </View>
            </View>
            <View style={styles.friendsArrowContainer}>
              <Feather name="chevron-right" size={16} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Spacing for bottom of screen */}
        <View style={{ height: 70 }} />
      </ScrollableContentContainer>

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
                transform: [{ translateY }],
                opacity,
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
  },
  profileInfoContainer: {
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: 'rgba(156, 132, 239, 1)',
  },
  profileInfoTextContainer: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  profileUsername: {
    color: '#A8B3BD',
    fontSize: 16,
    fontWeight: '400',
    marginRight: 8,
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
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
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
  gemSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#1C1D23',
    gap: 16,
  },
  gemIconContainer: {
    width: 65,
    height: 65,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gemIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gemInfoContainer: {
    flex: 1,
    height: 65,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  gemLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  inactiveButton: {
    backgroundColor: '#535864',
    borderRadius: 20.5,
    paddingVertical: 4,
    paddingHorizontal: 13,
    marginLeft: 10,
  },
  inactiveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  buyButton: {
    borderRadius: 20.5,
    paddingVertical: 5,
    paddingHorizontal: 15,
    marginLeft: 'auto',
  },
  buyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewsCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  viewsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  viewsTapHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
  viewsValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
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
  friendsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 15,
    backgroundColor: 'rgba(21, 21, 26, 0.7)',
    borderRadius: 15,
    padding: 18,
  },
  friendsSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  friendsCountBadge: {
    backgroundColor: 'rgba(156, 132, 239, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  friendsCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  friendsArrowContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusSelectorContainer: {
    backgroundColor: '#1C1D23',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  statusSelectorHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#3E4148',
    borderRadius: 3,
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
});

export default ProfileScreen; 
