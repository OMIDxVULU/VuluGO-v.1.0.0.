import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Vibration,
  Easing,
} from 'react-native';
import { LongPressGestureHandler, State, PanGestureHandler } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Feather, FontAwesome, AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BackButton from '../components/BackButton';
import MenuButton from '../components/MenuButton';
import {
  createIsolatedAnimatedValue,
  startIsolatedAnimation,
  createIsolatedTiming,
  createIsolatedSpring,
  createIsolatedParallel,
  createIsolatedSequence,
  createIsolatedLoop,
  createIsolatedScrollEvent,
  stopIsolatedAnimation,
  resetIsolatedAnimatedValue,
} from '../utils/animationUtils';
import ScrollableContentContainer from '../components/ScrollableContentContainer';
import { useUserProfile } from '../context/UserProfileContext';
import { useUserStatus, STATUS_TYPES, StatusType } from '../context/UserStatusContext';
import { useAuth } from '../context/AuthContext';
import { useGuestRestrictions } from '../hooks/useGuestRestrictions';
import firestoreService from '../services/firestoreService';

const { width } = Dimensions.get('window');

// Status category grouping
const STATUS_CATEGORIES = {
  DEFAULT: 'Default',
  MOOD: 'Mood'
};

// Photo interface
interface Photo {
  id: string;
  uri: string;
  isProfile: boolean;
}

const ProfileScreen = () => {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { canManagePhotos, canEditProfile, canChangeStatus } = useGuestRestrictions();
  const {
    profileImage,
    setProfileImage,
    hasGemPlus,
    setHasGemPlus,
    displayName,
    username
  } = useUserProfile();
  
  // Use UserStatusContext instead of local state
  const { 
    userStatus,
    setUserStatus,
    contextStatusData,
    closefriendsOnly,
    setClosefriendsOnly
  } = useUserStatus();
  
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [statusCategory, setStatusCategory] = useState(STATUS_CATEGORIES.DEFAULT);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [previewCurrentPage, setPreviewCurrentPage] = useState(0);
  const [previewTotalPages, setPreviewTotalPages] = useState(3); // 2 images + 1 bio page
  
  // Photo management state
  const [photos, setPhotos] = useState<Photo[]>([
    { id: 'profile', uri: profileImage, isProfile: true },
    { id: 'photo1', uri: 'https://randomuser.me/api/portraits/women/34.jpg', isProfile: false },
    { id: 'photo2', uri: 'https://randomuser.me/api/portraits/women/32.jpg', isProfile: false },
  ]);
  // Enhanced drag and drop state
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [draggedPhotoPosition, setDraggedPhotoPosition] = useState({ x: 0, y: 0 });
  const [photoLayouts, setPhotoLayouts] = useState<{ [key: string]: { x: number, y: number, width: number } }>({});
  const [longPressPhotoId, setLongPressPhotoId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'inactive' | 'preparing' | 'ready' | 'dragging'>('inactive');
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Animation refs for enhanced feedback - using isolated animation values
  const longPressScaleAnim = useRef(createIsolatedAnimatedValue(1)).current;
  const longPressShadowAnim = useRef(createIsolatedAnimatedValue(0)).current;
  const dragReadyPulseAnim = useRef(createIsolatedAnimatedValue(1)).current;

  const dropIndicatorAnim = useRef(createIsolatedAnimatedValue(0)).current;
  
  const statusSelectorAnim = useRef(createIsolatedAnimatedValue(0)).current;
  const profileScaleAnim = useRef(createIsolatedAnimatedValue(1)).current;
  const headerOpacityAnim = useRef(createIsolatedAnimatedValue(1)).current;
  
  // Improve the PanResponder implementation to ensure all elements are draggable
  const panY = useRef(createIsolatedAnimatedValue(0)).current;
  const [isDismissing, setIsDismissing] = useState(false);
  
  // Add new state for the photo selection modal
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  
  // Add animation ref for photo options modal
  const photoOptionsAnim = useRef(createIsolatedAnimatedValue(0)).current;

  // Create isolated scroll tracking value
  const scrollY = useRef(createIsolatedAnimatedValue(0)).current;
  
  // Add new state for friends modal and Firebase friends data
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  
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

  // Load friends data from Firebase
  useEffect(() => {
    if (!user?.uid || isGuest) {
      setFriends([]);
      return;
    }

    const loadFriends = async () => {
      setFriendsLoading(true);
      try {
        const userFriends = await firestoreService.getUserFriends(user.uid);
        setFriends(userFriends);
      } catch (error) {
        // Silently handle friends loading error to avoid console noise
        setFriends([]);
      } finally {
        setFriendsLoading(false);
      }
    };

    loadFriends();

    // Set up real-time listener for friends updates
    const unsubscribe = firestoreService.onUserFriends(user.uid, (updatedFriends) => {
      setFriends(updatedFriends);
    });

    return unsubscribe;
  }, [user?.uid, isGuest]);

  const navigateToAccount = () => {
    router.push('/(main)/account');
  };

  // Photo management functions
  const handleAddPhoto = () => {
    // Check if user is guest and prevent photo editing
    if (!canManagePhotos()) {
      return;
    }
    
    resetIsolatedAnimatedValue(photoOptionsAnim, 0);
    startIsolatedAnimation(
      createIsolatedSpring(photoOptionsAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    );
    setShowPhotoOptions(true);
  };

  const handleDeletePhoto = (photoId: string) => {
    if (!canManagePhotos()) {
      return;
    }

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPhotos(prevPhotos => {
              const newPhotos = prevPhotos.filter(photo => photo.id !== photoId);
              // If we deleted the profile photo, make the first remaining photo the profile
              if (photoId === 'profile' && newPhotos.length > 0) {
                newPhotos[0].isProfile = true;
              }
              return newPhotos;
            });
          }
        }
      ]
    );
  };



  // Refs for cleanup
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Enhanced long press handler with progressive feedback
  const handleLongPressPhoto = useCallback((photoId: string) => {
    try {
      if (!canManagePhotos() || !photoId) {
        return;
      }

      // Clear any existing timeout and animation
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
        pulseAnimationRef.current = null;
      }

      setLongPressPhotoId(photoId);
      setDragMode('preparing');

      // Phase 1: Immediate visual feedback (scale + shadow)
      // Use isolated animations to prevent conflicts with Reanimated
      startIsolatedAnimation(
        createIsolatedTiming(longPressScaleAnim, {
          toValue: 1.05,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );

      startIsolatedAnimation(
        createIsolatedTiming(longPressShadowAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        })
      );

      // Phase 2: After 1 second, trigger "ready to drag" state
      readyTimeoutRef.current = setTimeout(() => {
        try {
          if (longPressPhotoId === photoId && dragMode === 'preparing') {
            setDragMode('ready');

            // Haptic feedback to indicate ready state
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
              // Ignore haptic errors on unsupported devices
            });

            // Pulsing animation to indicate ready state
            pulseAnimationRef.current = createIsolatedLoop(
              createIsolatedSequence([
                createIsolatedTiming(dragReadyPulseAnim, {
                  toValue: 1.1,
                  duration: 600,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                createIsolatedTiming(dragReadyPulseAnim, {
                  toValue: 1.05,
                  duration: 600,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
              ])
            );
            startIsolatedAnimation(pulseAnimationRef.current);
          }
        } catch (error) {
          // Silently handle drag ready state error
        }
      }, 1000);
    } catch (error) {
      // Silently handle long press error
    }
  }, [canManagePhotos, longPressPhotoId, dragMode, longPressScaleAnim, longPressShadowAnim, dragReadyPulseAnim]);

  // Enhanced drag handler with visual feedback
  const handlePhotoDrag = useCallback((photoId: string, event: any) => {
    if (draggedPhotoId !== photoId || dragMode !== 'dragging') return;

    // Safely extract gesture event properties
    const nativeEvent = event.nativeEvent;
    if (!nativeEvent) return;

    const { translationX = 0, translationY = 0, x = 0, y = 0 } = nativeEvent;

    // Update dragged photo position using translation values
    setDraggedPhotoPosition({ x: translationX, y: translationY });

    // Calculate which photo position this should snap to
    const photoWidth = 95; // Photo width (83) + margin (12)
    const containerStartX = 12; // Starting X position of photos container

    // Use translationX for relative positioning
    const relativeX = Math.abs(translationX);
    const targetIndex = Math.max(0, Math.min(photos.length - 1,
      Math.round(relativeX / photoWidth)));

    // Update drop target indicator
    if (targetIndex !== dropTargetIndex) {
      setDropTargetIndex(targetIndex);

      // Animate drop indicator with isolated animations
      startIsolatedAnimation(
        createIsolatedSequence([
          createIsolatedTiming(dropIndicatorAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
          createIsolatedTiming(dropIndicatorAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
        ])
      );
    }
  }, [draggedPhotoId, dragMode, photos, dropTargetIndex, dropIndicatorAnim]);

  // Enhanced drag end handler with photo reordering
  const handlePhotoDragEnd = useCallback(() => {
    if (draggedPhotoId && dropTargetIndex !== null) {
      const currentIndex = photos.findIndex(photo => photo.id === draggedPhotoId);

      if (dropTargetIndex !== currentIndex) {
        // Perform the final reorder
        setPhotos(prevPhotos => {
          const newPhotos = [...prevPhotos];
          const [movedPhoto] = newPhotos.splice(currentIndex, 1);
          newPhotos.splice(dropTargetIndex, 0, movedPhoto);

          // Update profile picture to be the first photo
          newPhotos.forEach((photo, index) => {
            photo.isProfile = index === 0;
          });

          return newPhotos;
        });

        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    // Reset all drag states and animations
    resetDragState();
  }, [draggedPhotoId, dropTargetIndex, photos]);

  // Helper function to reset all drag-related state
  const resetDragState = useCallback(() => {
    // Clean up timers and animations first
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
      pulseAnimationRef.current = null;
    }

    setDraggedPhotoId(null);
    setLongPressPhotoId(null);
    setDragMode('inactive');
    setDropTargetIndex(null);
    setDraggedPhotoPosition({ x: 0, y: 0 });

    // Reset all animations - use isolated animations to prevent conflicts
    // Native driver animations (transform properties)
    startIsolatedAnimation(
      createIsolatedParallel([
        createIsolatedTiming(longPressScaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        createIsolatedTiming(dragReadyPulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        createIsolatedTiming(dropIndicatorAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    );

    // JavaScript driver animation (shadow properties)
    startIsolatedAnimation(
      createIsolatedTiming(longPressShadowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      })
    );
  }, [longPressScaleAnim, longPressShadowAnim, dragReadyPulseAnim, dropIndicatorAnim]);

  // Handle drag start (when user starts dragging after long press)
  const handleDragStart = useCallback((photoId: string) => {
    try {
      if (dragMode === 'ready' && longPressPhotoId === photoId) {
        setDraggedPhotoId(photoId);
        setDragMode('dragging');

        // Phase 3: Dragging visual feedback (handled in styling)

        // Strong haptic feedback for drag start
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
          // Ignore haptic errors on unsupported devices
        });
      }
    } catch (error) {
      // Silently handle drag start error
    }
  }, [dragMode, longPressPhotoId]);

  // Cleanup effect for timers and animations
  useEffect(() => {
    return () => {
      // Clean up on unmount
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
      }
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
      }
    };
  }, []);

  // Update profile image when photos change
  useEffect(() => {
    const profilePhoto = photos.find(photo => photo.isProfile);
    if (profilePhoto) {
      setProfileImage(profilePhoto.uri);
    }
  }, [photos, setProfileImage]);

  // Save photo order to persistent storage
  useEffect(() => {
    if (user?.uid && !isGuest && photos.length > 0) {
      const savePhotoOrder = async () => {
        try {
          const photoOrder = photos.map((photo, index) => ({
            id: photo.id,
            uri: photo.uri,
            isProfile: photo.isProfile,
            order: index,
          }));

          // Save to Firebase (implement this method in firestoreService if needed)
          // await firestoreService.updateUserPhotos(user.uid, photoOrder);
          // Photo order saved successfully (removed console.log to reduce noise)
        } catch (error) {
          console.error('Failed to save photo order:', error);
        }
      };

      // Debounce the save operation to avoid too many writes
      const timeoutId = setTimeout(savePhotoOrder, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [photos, user?.uid, isGuest]);

  const hidePhotoOptions = () => {
    startIsolatedAnimation(
      createIsolatedTiming(photoOptionsAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      () => {
        setShowPhotoOptions(false);
      }
    );
  };

  const handleTakePhoto = () => {
    hidePhotoOptions();
    
    // Change profile image for demo
    const newPhotoId = Math.floor(Math.random() * 50) + 20;
    const newProfileImage = `https://randomuser.me/api/portraits/women/${newPhotoId}.jpg`;
    setProfileImage(newProfileImage);
    
    Alert.alert('Camera', 'Camera would open here to take a new photo.');
  };

  const handleUploadPhoto = () => {
    hidePhotoOptions();
    
    // Change profile image for demo
    const newPhotoId = Math.floor(Math.random() * 50) + 20;
    const newProfileImage = `https://randomuser.me/api/portraits/women/${newPhotoId}.jpg`;
    setProfileImage(newProfileImage);
    
    Alert.alert('Photo Library', 'Photo Library would open here to select a photo.');
  };

  // Function to show status selector with animation
  const showStatusMenu = () => {
    // Check if user is guest and prevent status editing
    if (!canChangeStatus()) {
      return;
    }
    
    setShowStatusSelector(true);
    startIsolatedAnimation(
      createIsolatedTiming(statusSelectorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    );
  };

  // Function to hide status selector with animation
  const hideStatusMenu = () => {
    startIsolatedAnimation(
      createIsolatedTiming(statusSelectorAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      () => {
        setShowStatusSelector(false);
      }
    );
  };

  // Function to change status and close menu
  const changeStatus = (newStatus: StatusType) => {
    setUserStatus(newStatus);
    hideStatusMenu();
  };

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
    resetIsolatedAnimatedValue(panY, 0);
    setPreviewCurrentPage(0);
    setShowProfilePreview(true);
  };

  // Add scroll handler for animations with proper isolation
  const handleScroll = createIsolatedScrollEvent(scrollY, {
    useNativeDriver: false,
    listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollYValue = event.nativeEvent.contentOffset.y;
      // Scale profile image down slightly when scrolling
      if (scrollYValue > 0) {
        startIsolatedAnimation(
          createIsolatedSpring(profileScaleAnim, {
            toValue: 0.95,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          })
        );
        // Fade header
        startIsolatedAnimation(
          createIsolatedTiming(headerOpacityAnim, {
            toValue: 0.8,
            duration: 150,
            useNativeDriver: true,
          })
        );
      } else {
        startIsolatedAnimation(
          createIsolatedSpring(profileScaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          })
        );
        // Restore header
        startIsolatedAnimation(
          createIsolatedTiming(headerOpacityAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          })
        );
      }
    },
  });

  // Update dismiss function to prevent flash
  const dismissPreview = () => {
    if (isDismissing) return; // Prevent multiple calls
    
    setIsDismissing(true);
    
    // Run animation
    startIsolatedAnimation(
      createIsolatedTiming(panY, {
        toValue: -1500,
        duration: 350,
        useNativeDriver: true,
      }),
      () => {
        // Only hide the modal after animation completes
        setShowProfilePreview(false);
        // Reset state after hiding
        setTimeout(() => {
          resetIsolatedAnimatedValue(panY, 0);
          setIsDismissing(false);
        }, 200);
      }
    );
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
          startIsolatedAnimation(
            createIsolatedSpring(panY, {
              toValue: 0,
              tension: 40,
              friction: 8,
              useNativeDriver: true,
            })
          );
        }
      },
      onPanResponderTerminate: () => {
        panY.flattenOffset();
        startIsolatedAnimation(
          createIsolatedSpring(panY, {
            toValue: 0,
            tension: 40,
            friction: 5,
            useNativeDriver: true,
          })
        );
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

  // Photo options animations
  const photoOptionsTranslateY = photoOptionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const photoOptionsOpacity = photoOptionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

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
      
      {/* Removed gem/gold balances at the top */}
      
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
                  { backgroundColor: contextStatusData.glowColor }
                ]} 
              />
              <View 
                style={[
                  styles.onlineStatusIcon,
                  { backgroundColor: contextStatusData.color }
                ]}
              >
                {contextStatusData.icon}
              </View>
            </View>
            <View>
              <Text style={styles.onlineText}>{contextStatusData.text}</Text>
              <Text style={styles.onlineSubtext}>{contextStatusData.subtext}</Text>
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
        
        {/* Profile Info Card with Thin Outline */}
        <View style={styles.profileInfoCard}>
          <Animated.View 
            style={[
              styles.profileInfoContainer,
              { transform: [{ scale: profileScaleAnim }] }
            ]}
          >
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={openPreview}
              style={styles.profileImageTouchable}
            >
              <Image 
                source={{ uri: profileImage }} 
                style={[styles.profileImage, { borderColor: contextStatusData.color }]} 
              />
              <View style={styles.profileImageOverlay}>
                <Feather name="eye" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.profileInfoTextContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                {isGuest && (
                  <View style={styles.guestBadge}>
                    <Text style={styles.guestBadgeText}>GUEST</Text>
                  </View>
                )}
              </View>
              <Text style={styles.profileUsername}>@{username}</Text>
            </View>
          </Animated.View>
        </View>
        
        {/* Photos Section */}
        <View style={styles.photoSection}>
          {/* Photos Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Your Photos ({photos.length})
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
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
            
                        {/* Photos */}
            {photos.map((photo, index) => (
              <View key={photo.id} style={styles.photoWrapper}>
                {/* Drop indicator */}
                {dropTargetIndex === index && draggedPhotoId && draggedPhotoId !== photo.id && (
                  <Animated.View
                    style={[
                      styles.dropIndicator,
                      {
                        opacity: dropIndicatorAnim,
                        transform: [{ scaleY: dropIndicatorAnim }],
                      },
                    ]}
                  />
                )}

                <LongPressGestureHandler
                  onHandlerStateChange={({ nativeEvent }) => {
                    if (nativeEvent.state === State.BEGAN) {
                      handleLongPressPhoto(photo.id);
                    } else if (nativeEvent.state === State.CANCELLED || nativeEvent.state === State.FAILED) {
                      if (dragMode === 'preparing' && longPressPhotoId === photo.id) {
                        resetDragState();
                      }
                    }
                  }}
                  minDurationMs={100}
                  enabled={dragMode === 'inactive'}
                >
                  <PanGestureHandler
                    onHandlerStateChange={({ nativeEvent }) => {
                      if (nativeEvent.state === State.BEGAN) {
                        handleDragStart(photo.id);
                      } else if (nativeEvent.state === State.ACTIVE) {
                        // Handle drag during active state
                        handlePhotoDrag(photo.id, { nativeEvent });
                      } else if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
                        handlePhotoDragEnd();
                      }
                    }}
                    enabled={dragMode === 'ready' && longPressPhotoId === photo.id}
                    activeOffsetX={[-10, 10]}
                    activeOffsetY={[-10, 10]}
                  >
                    <Animated.View
                      style={[
                        styles.photoItemContainer,
                        // Phase 1: Long press feedback
                        longPressPhotoId === photo.id && dragMode === 'preparing' && {
                          transform: [{ scale: longPressScaleAnim }],
                          shadowColor: '#6E69F4',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: longPressShadowAnim,
                          shadowRadius: 8,
                          elevation: 8,
                        },
                        // Phase 2: Ready to drag feedback
                        longPressPhotoId === photo.id && dragMode === 'ready' && {
                          transform: [{ scale: dragReadyPulseAnim }],
                          shadowColor: '#4CAF50',
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.4,
                          shadowRadius: 12,
                          elevation: 12,
                        },
                        // Phase 3: Dragging feedback
                        draggedPhotoId === photo.id && dragMode === 'dragging' && {
                          opacity: 0.3,
                          transform: [{ scale: 1.1 }],
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.4,
                          shadowRadius: 16,
                          elevation: 16,
                        },
                      ]}
                    >
                    <Image 
                      source={{ uri: photo.uri }} 
                      style={styles.photoItem}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.7)']}
                      style={styles.photoGradient}
                    />
                    
                    {/* Delete Button - only show when not in drag mode */}
                    {dragMode === 'inactive' && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeletePhoto(photo.id)}
                      >
                        <MaterialIcons name="close" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}

                    {/* Drag mode indicator */}
                    {longPressPhotoId === photo.id && dragMode === 'ready' && (
                      <View style={styles.dragReadyIndicator}>
                        <MaterialIcons name="drag-indicator" size={20} color="#4CAF50" />
                        <Text style={styles.dragReadyText}>Ready to drag</Text>
                      </View>
                    )}
                  </Animated.View>
                </PanGestureHandler>
              </LongPressGestureHandler>
              </View>
            ))}
          </ScrollView>
        </View>
        
        {/* Gem+ Section */}
        <View style={{position: 'relative', marginBottom: 16, paddingHorizontal: 12}}>
          <TouchableOpacity 
            onPress={() => toggleGemPlus()}
            activeOpacity={0.7}
            style={{
              backgroundColor: '#1C1D23',
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 16
            }}
          >
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
                    }}>50</Text>
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
                    200/day
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
                    3d
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Friends Section - Hidden for guest users */}
        {!isGuest && (
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
        )}
        
        {/* Spacing for bottom of screen */}
        <View style={{ height: 120 }} />
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
                  onPress={() => changeStatus(STATUS_TYPES.ONLINE as StatusType)}
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
                  onPress={() => changeStatus(STATUS_TYPES.BUSY as StatusType)}
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
                  onPress={() => changeStatus(STATUS_TYPES.OFFLINE as StatusType)}
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
                  onPress={() => changeStatus(STATUS_TYPES.HAPPY as StatusType)}
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
                  onPress={() => changeStatus(STATUS_TYPES.SAD as StatusType)}
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
                  onPress={() => changeStatus(STATUS_TYPES.ANGRY as StatusType)}
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
                  onPress={() => changeStatus(STATUS_TYPES.HUNGRY as StatusType)}
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
                  onPress={() => changeStatus(STATUS_TYPES.SLEEPY as StatusType)}
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
                  onPress={() => changeStatus(STATUS_TYPES.EXCITED as StatusType)}
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
                  onPress={() => changeStatus(STATUS_TYPES.BORED as StatusType)}
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
                  onPress={() => changeStatus(STATUS_TYPES.LOVE as StatusType)}
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
                
                <Text style={styles.previewDisplayNameBio}>{displayName}</Text>
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
                    <Text style={styles.previewDisplayNameImage}>{displayName}</Text>
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

      {/* Floating Dragged Photo Overlay */}
      {draggedPhotoId && (
        <Animated.View
          style={[
            styles.floatingPhoto,
            {
              transform: [
                { translateX: draggedPhotoPosition.x - 41.5 }, // Center the photo
                { translateY: draggedPhotoPosition.y - 63 }, // Center the photo
              ],
            },
          ]}
        >
          <Image
            source={{ uri: photos.find(p => p.id === draggedPhotoId)?.uri }}
            style={styles.floatingPhotoImage}
            resizeMode="cover"
          />
        </Animated.View>
      )}
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
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileInfoContainer: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'transparent',
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
    // borderColor will be set dynamically based on status
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guestBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  guestBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  draggingPhoto: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#6E69F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingPhoto: {
    position: 'absolute',
    width: 83,
    height: 126,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
  },
  floatingPhotoImage: {
    width: 83,
    height: 126,
    borderRadius: 12,
  },

  // Enhanced drag and drop styles
  photoWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  dropIndicator: {
    position: 'absolute',
    left: -6,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    zIndex: 10,
  },
  dragReadyIndicator: {
    position: 'absolute',
    top: -30,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  dragReadyText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },

  photoItem: {
    width: 83,
    height: 126,
    borderRadius: 12,
  },
  editingPhotoContainer: {
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
  },
  profileBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#6E69F4',
    borderRadius: 10,
    padding: 4,
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
  // Styles for Gem+ section removed

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
  },
  profilePhotoItem: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  // Styles for currency and gem+ section removed
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
    top: 35,
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
  previewBackButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
  photoActionSheetContainer: {
    backgroundColor: '#1C1D23',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  photoActionSheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3E4148',
    alignSelf: 'center',
    marginBottom: 20,
  },
  photoActionSheetTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },

});

export default ProfileScreen; 
