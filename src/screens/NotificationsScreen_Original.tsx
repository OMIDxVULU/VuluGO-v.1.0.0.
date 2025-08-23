import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ScrollView, Image, GestureResponderEvent, Platform, UIManager, LayoutAnimation, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import CommonHeader from '../components/CommonHeader';
import { useRouter } from 'expo-router';
import NotificationItem, { Notification } from '../components/NotificationItem';
import CustomModal from '../components/CustomModal';
import { useModal } from '../hooks/useModal';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import notificationService, { NotificationData } from '../services/notificationService';

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Enhanced animation config for more noticeable effect
const animationConfig = {
  duration: 300,
  create: { 
    type: LayoutAnimation.Types.spring, 
    property: LayoutAnimation.Properties.scaleXY, 
    springDamping: 0.7 
  },
  update: { 
    type: LayoutAnimation.Types.spring, 
    springDamping: 0.7 
  },
  delete: { 
    type: LayoutAnimation.Types.spring, 
    property: LayoutAnimation.Properties.scaleXY, 
    springDamping: 0.7 
  },
};

// --- Firebase-Integrated Announcement Widget ---
const AnnouncementWidget = () => {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(2);
  const [announcements, setAnnouncements] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { counts, markNotificationAsRead } = useNotifications();

  // Load announcements from Firebase
  useEffect(() => {
    if (!user || isGuest) {
      setAnnouncements([]);
      return;
    }

    const loadAnnouncements = async () => {
      setIsLoading(true);
      try {
        const notifications = await notificationService.getUserNotifications(user.uid, 50);
        const announcementNotifications = notifications.filter(n => n.type === 'announcement');
        setAnnouncements(announcementNotifications);
      } catch (error) {
        console.error('Failed to load announcements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncements();

    // Set up real-time listener for announcements
    const unsubscribe = notificationService.onNotifications(user.uid, (notifications) => {
      const announcementNotifications = notifications.filter(n => n.type === 'announcement');
      setAnnouncements(announcementNotifications);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, isGuest]);

  // Generate avatar URL for admin
  const generateAdminAvatar = (name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('');
    return `https://ui-avatars.com/api/?background=3A7BFD&color=fff&name=${initials}&size=200`;
  };

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  };

  const handleAnnouncementPress = async (item: NotificationData) => {
    try {
      // Mark notification as read
      await markNotificationAsRead(item.id);

      // Navigate to target route if available
      if (item.data?.targetRoute) {
        router.push({
          pathname: item.data.targetRoute,
          params: item.data.targetParams || {}
        });
      }
    } catch (error) {
      console.error('Failed to handle announcement press:', error);
    }
  };

  // Handle "More" button press - show additional announcements
  const handleLoadMore = (e: GestureResponderEvent) => {
    e.stopPropagation();
    setVisibleCount(prev => Math.min(prev + 5, announcements.length));
  };

  const toggleExpand = () => {
    LayoutAnimation.configureNext(animationConfig);
    const expanding = !isExpanded;
    setIsExpanded(expanding);

    // Mark all announcements as read when expanding
    if (expanding) {
      announcements.forEach(async (announcement) => {
        if (!announcement.read) {
          try {
            await markNotificationAsRead(announcement.id);
          } catch (error) {
            console.error('Failed to mark announcement as read:', error);
          }
        }
      });
    } else {
      setVisibleCount(2);
    }
  };

  return (
    <TouchableOpacity
      style={styles.widgetContainer}
      onPress={toggleExpand}
      activeOpacity={0.9}
    >
      <View style={styles.widgetHeader}>
        <View style={styles.widgetTitleContainer}>
          <Text style={styles.widgetTitle}>Announcements</Text>
          {/* Render count badge if count > 0 */}
          {counts.announcements > 0 && (
            <View style={styles.widgetCountBadge}>
              <Text style={styles.widgetCountText}>{counts.announcements}</Text>
            </View>
          )}
        </View>
        <View>
          <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={24} color="#FFFFFF" />
        </View>
      </View>
      {isExpanded && (
        <View style={styles.widgetContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading announcements...</Text>
            </View>
          ) : announcements.length > 0 ? (
            <>
              <ScrollView
                style={visibleCount > 2 ? styles.scrollableAnnouncements : undefined}
                nestedScrollEnabled={true}
              >
                {announcements.slice(0, visibleCount).map((item) => {
                  const adminName = item.data?.adminName || 'Admin';
                  const adminAvatar = item.data?.adminAvatar || generateAdminAvatar(adminName);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.announcementItem, !item.read && styles.unreadAnnouncement]}
                      onPress={() => handleAnnouncementPress(item)}
                      activeOpacity={0.7}
                    >
                      <Image source={{ uri: adminAvatar }} style={styles.announcementAvatarImg} />
                      <View style={styles.announcementTextContainer}>
                        <Text style={styles.announcementMessage}>
                          <Text style={styles.announcementTag}>@Announcement</Text>
                          {' '}
                          <Text>{item.message}</Text>
                        </Text>
                        <Text style={styles.announcementTime}>{formatTime(item.timestamp)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* "More" button - only show if there are more announcements to load */}
              {visibleCount < announcements.length && (
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={handleLoadMore}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreButtonText}>More</Text>
                  <MaterialIcons name="expand-more" size={18} color="#A0A0A0" />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialIcons name="campaign" size={48} color="#8F8F8F" />
              <Text style={styles.emptyStateTitle}>No announcements</Text>
              <Text style={styles.emptyStateText}>Check back later for updates from the team</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// --- Firebase-Integrated Friend Request Widget ---
const FriendRequestWidget = () => {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(2);
  const [friendRequests, setFriendRequests] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { counts, markNotificationAsRead } = useNotifications();

  // Load friend requests from Firebase
  useEffect(() => {
    if (!user || isGuest) {
      setFriendRequests([]);
      return;
    }

    const loadFriendRequests = async () => {
      setIsLoading(true);
      try {
        const notifications = await notificationService.getUserNotifications(user.uid, 50);
        const friendRequestNotifications = notifications.filter(n => n.type === 'friend_request');
        setFriendRequests(friendRequestNotifications);
      } catch (error) {
        console.error('Failed to load friend requests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFriendRequests();

    // Set up real-time listener for friend requests
    const unsubscribe = notificationService.onNotifications(user.uid, (notifications) => {
      const friendRequestNotifications = notifications.filter(n => n.type === 'friend_request');
      setFriendRequests(friendRequestNotifications);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, isGuest]);

  // Generate avatar URL with consistent styling
  const generateAvatar = (name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('');
    return `https://ui-avatars.com/api/?background=FF2D55&color=fff&name=${initials}&size=200`;
  };

  // Create aliases for backward compatibility with existing template code
  const requests = friendRequests;
  const setRequests = setFriendRequests;
  const requestCount = friendRequests.filter(req => !req.read).length;
  const setRequestCount = () => {}; // This will be handled by Firebase real-time updates

  const handleAccept = async (id: string) => {
    try {
      // Mark the notification as read (accepted)
      await markNotificationAsRead(id);

      // Here you would typically also call a friend service to accept the friend request
      // await friendService.acceptFriendRequest(id);

      console.log('Friend request accepted:', id);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  }

  const handleDecline = async (id: string) => {
    try {
      // Mark the notification as read (declined)
      await markNotificationAsRead(id);

      // Here you would typically also call a friend service to decline the friend request
      // await friendService.declineFriendRequest(id);

      console.log('Friend request declined:', id);
    } catch (error) {
      console.error('Failed to decline friend request:', error);
    }
  }

  const handleProfilePress = (userId: string) => {
    // Navigate to profile even after accept/decline
    router.push({ pathname: '/profile', params: { userId: userId } });
  };

  // Handle "More" button press
  const handleLoadMore = (e: GestureResponderEvent) => {
    e.stopPropagation(); // Prevent the widget from collapsing when clicking More
    // Increase visible count by 5 each time, or show all remaining
    setVisibleCount(prev => Math.min(prev + 5, requests.length));
  };

  // Expanding doesn't clear friend request count
  const toggleExpand = () => {
      LayoutAnimation.configureNext(animationConfig);
      const expanding = !isExpanded;
      setIsExpanded(expanding);
      
      // Clear the count when expanding
      if (expanding) {
        setRequestCount(0);
        clearNotificationsByType('friendRequests');
      } else {
        // Reset visibleCount when collapsing
        setVisibleCount(2);
      }
  }

  // Update notification count whenever pending requests change
  useEffect(() => {
    const pendingRequests = requests.filter(req => req.status === 'pending');
    updateFriendRequestCount(pendingRequests.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]); // Re-run when requests changes

  return (
    <TouchableOpacity
      style={styles.widgetContainer}
      onPress={toggleExpand}
      activeOpacity={0.9}
    >
      <View style={styles.widgetHeader}>
        <View style={styles.widgetTitleContainer}>
          <Text style={styles.widgetTitle}>Friend Requests</Text>
          {/* Render count badge based on pending requests */}
          {requestCount > 0 && (
            <View style={styles.widgetCountBadge}>
              <Text style={styles.widgetCountText}>{requestCount}</Text>
            </View>
          )}
        </View>
        <View>
          <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={24} color="#FFFFFF" />
        </View>
      </View>
      {isExpanded && (
        <View style={styles.widgetContent}>
          {/* Render requests with pagination */}
          <ScrollView
            style={visibleCount > 2 ? styles.scrollableRequests : undefined}
            nestedScrollEnabled={true}
          >
            {requests.slice(0, visibleCount).map((req) => (
              <View 
                key={req.id} 
                style={styles.requestItem}
              > 
                {/* Wrap avatar/info in Touchable for profile navigation */}
                <TouchableOpacity onPress={() => handleProfilePress(req.userId)} style={styles.requestProfileTouchable}> 
                  <Image source={{ uri: req.avatar }} style={styles.requestAvatarImg} />
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{req.name}</Text>
                    {req.mutual > 0 && (
                      <Text style={styles.requestMutual}>{req.mutual} mutual friend{req.mutual > 1 ? 's' : ''}</Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Conditionally render buttons only if status is pending */}
                {req.status === 'pending' && (
                    <View style={styles.requestActions} onStartShouldSetResponder={() => true}> 
                      <TouchableOpacity style={[styles.requestButton, styles.acceptButton]} onPress={() => handleAccept(req.id)}>
                        <MaterialIcons name="check" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.requestButton, styles.declineButton]} onPress={() => handleDecline(req.id)}>
                        <MaterialIcons name="close" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                )}
              </View>
            ))}
          </ScrollView>
          
          {/* "More" button - only show if there are more requests to load */}
          {isExpanded && visibleCount < requests.length && (
            <TouchableOpacity 
              style={styles.moreButton}
              onPress={handleLoadMore}
              activeOpacity={0.7}
            >
              <Text style={styles.moreButtonText}>More</Text>
              <MaterialIcons name="expand-more" size={18} color="#A0A0A0" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// --- ProfileViewWidget (Fixed version with all state variables intact) ---
// The notification system now correctly updates the navbar count when:
// 1. New notifications are added (via useEffect dependencies on the relevant state)
// 2. Notifications are cleared (via clearNotificationsByType in toggleExpand functions)
interface ProfileView {
  id: string;
  viewerId: string;
  viewerName: string;
  viewerAvatar: string | undefined;
  realAvatar?: string; // Add a field for storing the real avatar for ghost users
  timestamp: string;
  dateCreated: Date;
  seen: boolean;
  isPremiumViewer: boolean;
  isRevealed: boolean;
  isGhostMode?: boolean;
  visitCount: number;
}

const ProfileViewWidget = () => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasGemPlus, setHasGemPlus] = useState(true); // Set to true to demo premium features
  const [isAnonymousBrowsing, setIsAnonymousBrowsing] = useState(false); // Privacy toggle for premium users
  const [premiumPreviewsUsed, setPremiumPreviewsUsed] = useState(0); // Track preview usage
  const [premiumPreviewActive, setPremiumPreviewActive] = useState(false); // Track if preview is active
  const [revealedPreviewViews, setRevealedPreviewViews] = useState<string[]>([]); // IDs of views revealed in preview
  const [visibleCount, setVisibleCount] = useState(3); // Initial number of visible views
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Track loading state for infinite scroll
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [showGhostModeInfo, setShowGhostModeInfo] = useState(false); // For Ghost Mode tooltip/info
  const [isGhostMode, setIsGhostMode] = useState(false); // State for anonymous profile browsing
  const ghostModal = useModal();
  const purchaseModal = useModal();
  const { updateProfileViewCount, clearNotificationsByType } = useNotifications();
  
  // Maximum number of views to store
  const MAX_STORED_VIEWS = 100;
  
  // Debug helper
  const debug = (action: string) => {
    console.log(`[VULUGONEW-DEBUG] 🔔 ${action}`);
  };
  
  // Generate a timestamp string based on date
  const getTimeString = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };
  
  // Replace the existing useState for profileViews with empty initializer
  const [profileViews, setProfileViews] = useState<ProfileView[]>([]);

  // Replace the existing generateInitialViews function
  const generateInitialViews = () => {
    // Function now does nothing - no automatic view generation
  };

  // Later in the useEffect that calls this function, ensure it's also not generating views
  useEffect(() => {
    // Leave this empty or remove the call to generateInitialViews
    // generateInitialViews();
  }, []);

  // Apply retention policy - 7 days and enforce maximum views limit
  useEffect(() => {
    // This would normally run on app startup or when fetching profile views
    const applyRetentionPolicy = () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      setProfileViews(currentViews => {
        // First filter by date
        const filteredByDate = currentViews.filter(view => view.dateCreated >= sevenDaysAgo);
        
        // Then limit total number to MAX_STORED_VIEWS by keeping most recent
        if (filteredByDate.length > MAX_STORED_VIEWS) {
          return filteredByDate
            .sort((a, b) => b.dateCreated.getTime() - a.dateCreated.getTime())
            .slice(0, MAX_STORED_VIEWS);
        }
        
        return filteredByDate;
      });
    };
    
    // Apply retention policy
    applyRetentionPolicy();
    
    // This would normally be on a timer or when app opens
    const retentionInterval = setInterval(applyRetentionPolicy, 24 * 60 * 60 * 1000); // Check daily
    
    return () => clearInterval(retentionInterval);
  }, []);

  const totalViewCount = profileViews.length;
  const newViewCount = profileViews.filter(view => !view.seen).length;

  // Handle loading more views - increase by 10 at a time
  const handleLoadMore = (e: GestureResponderEvent) => {
    e.stopPropagation(); // Prevent widget from collapsing
    setVisibleCount(prev => Math.min(prev + 10, profileViews.length));
  };

  const handleViewPress = (view: ProfileView, e?: GestureResponderEvent) => {
    if (e) e.stopPropagation();
    
    // Mark as seen
    setProfileViews(prev => 
      prev.map(v => v.id === view.id ? {...v, seen: true} : v)
    );
    
    // Handle navigation based on subscription and reveal status
    if (view.isGhostMode && !view.isRevealed) {
      promptPurchaseReveal(view);
    } else if (view.viewerId) {
      router.push({ pathname: '/profile', params: { userId: view.viewerId } });
    }
  };
  
  // Prompt for purchase of identity reveal
  const promptPurchaseReveal = (view: ProfileView) => {
    debug(`Profile view selected: ${view.viewerName}`);
    
    // For demo purposes
    const gemCost = 100;
    const currentGemBalance = 1500; // Would come from user state in real app
    
    ghostModal.showPurchaseConfirmation(
      'Reveal Identity?',
      `Spend ${gemCost} Gems to reveal this ghost viewer's identity`,
      gemCost,
      currentGemBalance,
      () => purchaseReveal(view),
      undefined,
      'Reveal Now',
      'Cancel'
    );
  };
  
  // Handle identity reveal purchase
  const purchaseReveal = (view: ProfileView) => {
    // Use custom modal for success message
    ghostModal.showSuccess(
      "🎉 Identity Revealed!",
      "You've successfully revealed this ghost's identity. You can now view their full profile.",
      () => {
        // Navigate to profile after modal is dismissed
        if (view.viewerId) {
          router.push({ pathname: '/profile', params: { userId: view.viewerId } });
        }
      },
      "View Profile"
    );
    
    // For demo purposes, just update the state
    setProfileViews(prev => 
      prev.map(v => v.id === view.id ? {
        ...v, 
        isRevealed: true,
        // Update the viewerAvatar to show the real avatar when revealed
        ...(v.realAvatar && { viewerAvatar: v.realAvatar })
      } : v)
    );
  };

  const handleUpgradePress = () => {
    // Show premium modal instead of direct navigation
    ghostModal.showConfirmation(
      "Upgrade to Gem Plus",
      "Get access to premium features including seeing who viewed your profile and Ghost Mode browsing.",
      () => {
        // TODO: Navigate to subscription screen
        router.push({ pathname: '/gem-plus-subscription' });
      },
      undefined,
      "View Plans",
      "Later",
      { name: "workspace-premium", background: "#B768FB" }
    );
  };
  
  // Preview premium functionality
  const handlePreviewPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    
    if (premiumPreviewsUsed >= 3) {
      ghostModal.showError(
        "Preview Limit Reached",
        "You've used all 3 premium previews for this month. Subscribe to Gem Plus for unlimited access!",
        () => router.push({ pathname: '/gem-plus-subscription' }),
        "Learn More"
      );
      return;
    }
    
    // Store IDs of the first 3 views to keep them revealed
    const viewIdsToReveal = profileViews.slice(0, 3).map(view => view.id);
    setRevealedPreviewViews(viewIdsToReveal);
    
    // Activate premium preview - will show top 3 unblurred, rest still blurred
    setPremiumPreviewActive(true);
    setPremiumPreviewsUsed(prev => prev + 1);
    
    ghostModal.showSuccess(
      "Premium Preview Active",
      `You can now see your 3 most recent profile viewers! Upgrade to see all of them. (${3 - premiumPreviewsUsed} previews remaining this month)`,
    );
  };
  
  // Toggle Ghost Mode info popup
  const toggleGhostModeInfo = (e: GestureResponderEvent) => {
    e.stopPropagation();
    setShowGhostModeInfo(!showGhostModeInfo);
  };
  
  // Toggle anonymous browsing (premium feature)
  const toggleAnonymousBrowsing = () => {
    if (hasGemPlus) {
      setIsAnonymousBrowsing(!isAnonymousBrowsing);
      
      // Show a confirmation toast when toggling
      const newState = !isAnonymousBrowsing;
      if (newState) {
        ghostModal.showSuccess(
          "Ghost Mode Activated",
          "You're now browsing anonymously. Other users won't see when you view their profiles.",
          undefined,
          "Got it"
        );
      } else {
        ghostModal.showSuccess(
          "Ghost Mode Deactivated",
          "Your profile visits will now be visible to other users.",
          undefined,
          "Got it"
        );
      }
    } else {
      // Use custom modal instead of Alert
      ghostModal.showConfirmation(
        "Premium Feature",
        "Ghost Mode is available with Gem Plus subscription. Upgrade to browse profiles without being seen.",
        handleUpgradePress,
        undefined,
        "Upgrade",
        "Later",
        { name: "visibility-off", background: "#8F8F8F" }
      );
    }
  };

  const toggleExpand = () => {
    LayoutAnimation.configureNext(animationConfig);
    const expanding = !isExpanded;
    setIsExpanded(expanding);
    
    // If expanding, mark all as seen
    if (expanding) {
      setProfileViews(currentViews => 
        currentViews.map(view => ({
          ...view,
          seen: true
        }))
      );
      clearNotificationsByType('profileViews');
    } else {
      // Reset visible count when collapsing
      setVisibleCount(3);
    }
  };

  // Update notification count whenever unseen views change
  useEffect(() => {
    const unseenViews = profileViews.filter(view => !view.seen);
    updateProfileViewCount(unseenViews.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileViews]); // Re-run when profileViews changes

  return (
    <>
      <TouchableOpacity
        style={[
          styles.widgetContainer, 
          newViewCount > 0 && styles.glowingWidget, 
          { borderColor: '#B768FB' }
        ]}
        onPress={toggleExpand}
        activeOpacity={0.9}
      >
        <View style={styles.widgetHeader}>
          <View style={styles.widgetTitleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <MaterialIcons name="visibility" size={18} color="#B768FB" style={{ marginRight: 6 }} />
               <Text style={styles.widgetTitle}>Profile Views</Text>
            </View>
            {/* Render count badge if count > 0 */}
            {newViewCount > 0 && (
              <View style={styles.widgetCountBadge}>
                <Text style={styles.widgetCountText}>{newViewCount}</Text>
              </View>
            )}
          </View>
          <View>
            <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={24} color="#FFFFFF" />
          </View>
        </View>
        
        {isExpanded ? (
          <View style={styles.widgetContent}>
            {profileViews.length > 0 ? (
              <>
                <View style={styles.profileViewHeader}>
                  <Text style={styles.totalCountText}>Total Views: {totalViewCount}</Text>
                  
                  <View style={styles.headerRightActions}>
                    {/* Info icon with retention policy message */}
                    <TouchableOpacity 
                      style={styles.infoButton}
                      onPress={() => ghostModal.showConfirmation(
                        'Profile Views',
                        'Profile views are stored for 7 days. After this period, they will automatically be removed.',
                        () => {},
                        undefined,
                        'OK',
                        undefined, // No cancel button needed
                        { name: 'info-outline', background: '#555555' }
                      )}
                    >
                      <MaterialIcons name="info-outline" size={16} color="#8F8F8F" />
                    </TouchableOpacity>
                    
                    {/* Anonymous browsing toggle with info button */}
                    <View style={styles.anonymousToggle}>
                      <Text style={styles.anonymousText}>
                        Ghost Mode
                      </Text>
                      
                      {/* Ghost Mode Info button */}
                      <TouchableOpacity onPress={toggleGhostModeInfo}>
                        <MaterialIcons name="help-outline" size={14} color="#8F8F8F" style={{ marginLeft: 4, marginRight: 8 }} />
                      </TouchableOpacity>
                      
                      {!hasGemPlus && (
                        <MaterialIcons name="lock" size={12} color="#8F8F8F" style={{ marginRight: 8 }} />
                      )}
                      
                      <Switch
                        trackColor={{ false: "#767577", true: "rgba(183, 104, 251, 0.4)" }}
                        thumbColor={isAnonymousBrowsing && hasGemPlus ? "#B768FB" : "#f4f3f4"}
                        ios_backgroundColor="#3e3e3e"
                        onValueChange={() => {
                          if (hasGemPlus) {
                            toggleAnonymousBrowsing();
                          } else {
                            // Use custom modal instead of Alert
                            ghostModal.showConfirmation(
                              "Premium Feature",
                              "Ghost Mode is available with Gem Plus subscription. Upgrade to browse profiles without being seen.",
                              handleUpgradePress,
                              undefined,
                              "Upgrade",
                              "Later",
                              { name: "visibility-off", background: "#8F8F8F" }
                            );
                          }
                        }}
                        value={isAnonymousBrowsing && hasGemPlus}
        />
      </View>
                  </View>
                </View>
                
                {/* Ghost Mode info tooltip */}
                {showGhostModeInfo && (
                  <View style={styles.ghostModeTooltip}>
                    <MaterialIcons name="visibility-off" size={16} color="#B768FB" style={{ marginRight: 8 }} />
                    <Text style={styles.ghostModeTooltipText}>
                      Ghost Mode lets you browse profiles completely anonymously. Your identity (name and avatar) will be hidden from everyone, including Gem Plus users. They must spend Gems to reveal who you are.
                    </Text>
                    <TouchableOpacity style={styles.tooltipCloseButton} onPress={(e) => toggleGhostModeInfo(e)}>
                      <MaterialIcons name="close" size={16} color="#8F8F8F" />
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Scrollable view list with infinite scrolling */}
                <ScrollView
                  style={styles.scrollableViews}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  indicatorStyle="white"
                  contentContainerStyle={{ paddingBottom: 10 }}
                  onScroll={({ nativeEvent }) => {
                    // Check if we're near the bottom of the scroll
                    const isCloseToBottom = ({ 
                      layoutMeasurement, 
                      contentOffset, 
                      contentSize 
                    }: { 
                      layoutMeasurement: { height: number }, 
                      contentOffset: { y: number }, 
                      contentSize: { height: number } 
                    }) => {
                      const paddingToBottom = 20; // Load more when within 20px of bottom
                      return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
                    };
                    
                    if (isCloseToBottom(nativeEvent) && visibleCount < profileViews.length) {
                      // Show loading indicator
                      setIsLoadingMore(true);
                      
                      // Simulate a small loading delay for smoother UX
                      setTimeout(() => {
                        // Load 5 more items when we're close to the bottom
                        setVisibleCount(prev => Math.min(prev + 5, profileViews.length));
                        setIsLoadingMore(false);
                      }, 300);
                    }
                  }}
                  scrollEventThrottle={400} // Limit how often the scroll event fires
                >
                  {profileViews
                    .slice(0, visibleCount) // Show all visible views regardless of preview mode
                    .map((view, index) => (
                      <TouchableOpacity 
                        key={view.id} 
                        style={[
                          styles.viewItem, 
                          !view.seen && styles.newViewItem,
                          // Add a separator except for the first item
                          index !== 0 && styles.viewItemWithBorder
                        ]} 
                        onPress={(e) => handleViewPress(view, e)} 
                        activeOpacity={0.8}
                      >
                        <View style={styles.viewAvatarContainer}>
                          {/* Show the appropriate avatar based on ghost mode and reveal status */}
                          <Image 
                            source={{ uri: view.viewerAvatar || 'https://via.placeholder.com/40/000000/FFFFFF/?text=?' }} 
                            style={styles.viewAvatarImg} 
                          />
                          
                          {/* Apply blur for non-premium users unless this view was part of free preview */}
                          {!hasGemPlus && !(premiumPreviewActive && revealedPreviewViews.includes(view.id)) && (
                            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                          )}
                        </View>
                        
                        <View style={styles.viewInfo}>
                          {/* Handle different name display scenarios */}
                          {view.isGhostMode && !view.isRevealed ? (
                            // Show "Ghost" for all ghost users, regardless of Gem Plus status, unless revealed
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <Text style={styles.viewName}>Ghost</Text>
                              <View style={{marginLeft: 6, backgroundColor: '#8A2BE2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4}}>
                                <Text style={{color: 'white', fontSize: 10, fontWeight: 'bold'}}>GHOST</Text>
                              </View>
                            </View>
                          ) : hasGemPlus || (premiumPreviewActive && revealedPreviewViews.includes(view.id)) ? (
                            // For non-ghost users or revealed ghost users, show real name
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <Text style={styles.viewName}>{view.viewerName}</Text>
                              {view.isGhostMode && view.isRevealed && (
                                <View style={{marginLeft: 6, backgroundColor: '#8A2BE2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4}}>
                                  <Text style={{color: 'white', fontSize: 10, fontWeight: 'bold'}}>GHOST</Text>
                                </View>
                              )}
                            </View>
                          ) : (
                            // Non-premium users see "Ghost" for all users
                            <Text style={styles.viewName}>Ghost</Text>
                          )}
                          
                          {/* Show time and visit count */}
                          <View style={styles.viewMetaContainer}>
                            <Text style={styles.viewTimestamp}>{view.timestamp}</Text>
                            
                            {/* Visit count badge */}
                            {view.visitCount > 1 && (
                              <View style={styles.visitCountContainer}>
                                <MaterialIcons name="visibility" size={12} color="#B768FB" />
                                <Text style={styles.visitCountText}>×{view.visitCount}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        
                        {/* Show appropriate icon based on status - Add gem icon */}
                        {view.isGhostMode && !view.isRevealed ? (
                          <TouchableOpacity
                            style={styles.revealButton}
                            onPress={() => promptPurchaseReveal(view)}
                          >
                            <MaterialIcons name="diamond" size={14} color="#B768FB" style={{ marginRight: 2 }} />
                            <Text style={styles.revealButtonText}>100</Text>
                          </TouchableOpacity>
                        ) : !hasGemPlus && !(premiumPreviewActive && revealedPreviewViews.includes(view.id)) ? (
                          <View>
                            <MaterialIcons name="lock" size={18} color="#8F8F8F" />
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                    
                  {/* Scroll hint shown below third item when there are more to see */}
                  {profileViews.length > 3 && !isLoadingMore && visibleCount < profileViews.length && (
                    <View style={styles.scrollHintContainer}>
                      <MaterialIcons name="keyboard-arrow-down" size={20} color="#A0A0A0" />
                      <Text style={styles.scrollHintText}>Scroll for more</Text>
                    </View>
                  )}
                    
                  {/* Loading indicator shown when scrolling near bottom */}
                  {isLoadingMore && visibleCount < profileViews.length && (
                    <View style={styles.loadingMoreContainer}>
                      <Text style={styles.loadingMoreText}>Loading more...</Text>
                    </View>
                  )}
                  
                  {/* End of list message - shown when all profiles are loaded */}
                  {!isLoadingMore && visibleCount >= profileViews.length && profileViews.length > 3 && (
                    <View style={styles.endOfListContainer}>
                      <Text style={styles.endOfListText}>That's all for now</Text>
                    </View>
                  )}
                </ScrollView>
                
                {/* Show premium features or upgrade options */}
                {!hasGemPlus && (
                  <View style={styles.premiumSection}>
                    <View style={styles.premiumCard}>
                      <MaterialIcons name="workspace-premium" size={22} color="#B768FB" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.premiumCardTitle}>Unlock All Profile Viewers</Text>
                        <Text style={styles.premiumCardDescription}>
                          See who's viewing your profile and browse anonymously with Gem Plus
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.premiumButtonRow}>
                      <TouchableOpacity 
                        style={[styles.upgradeButton, { flex: 1 }]} 
                        onPress={handleUpgradePress}
                      >
                        <Text style={styles.upgradeButtonText}>Upgrade to Gem Plus</Text>
                      </TouchableOpacity>
                      
                      {/* Updated preview button with clearer remaining count */}
                      <TouchableOpacity 
                        style={[
                          styles.upgradeButton, 
                          { 
                            marginLeft: 8, 
                            backgroundColor: 'rgba(90, 120, 230, 0.15)',
                            borderWidth: 1,
                            borderColor: 'rgba(90, 120, 230, 0.5)',
                            paddingHorizontal: 10
                          }
                        ]} 
                        onPress={handlePreviewPress}
                      >
                        <Text style={[
                          styles.upgradeButtonText, 
                          { 
                            fontSize: 13,
                            color: '#A0C0FF' 
                          }
                        ]}>
                          Preview ({3 - premiumPreviewsUsed} left)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : (
              // Empty state UI
              <View style={styles.emptyStateContainer}>
                <MaterialIcons name="visibility-off" size={48} color="#8F8F8F" />
                <Text style={styles.emptyStateTitle}>No profile views yet</Text>
                <Text style={styles.emptyStateText}>
                  Use Spotlight to boost your profile's visibility and attract more viewers
                </Text>
                <TouchableOpacity 
                  style={styles.spotlightButton}
                  onPress={(e: GestureResponderEvent) => { 
                    e.stopPropagation();
                    router.push('/spotlight');
                  }}
                >
                  <MaterialIcons name="highlight" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.spotlightButtonText}>Go to Spotlight</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // Minimized preview with soft glow when new views
          <View style={styles.miniPreview}>
            {profileViews.length > 0 ? (
              <>
                {/* Show a row of mini avatars (blurred for non-premium) with most recent first */}
                <View style={styles.miniAvatarRow}>
                  {/* Get the 3 most recent profile views - they're already sorted by date */}
                  {profileViews.slice(0, Math.min(3, profileViews.length)).map((view, index) => (
                    <View 
                      key={view.id} 
                      style={[
                        styles.miniAvatarContainer,
                        { 
                          marginLeft: index > 0 ? -10 : 0, 
                          zIndex: index + 1 // First has lowest z-index, third has highest
                        }
                      ]}
                    >
                      {/* Use the actual avatar image with the proper background color based on ghost status */}
                      <Image 
                        source={{ uri: view.viewerAvatar }} 
                        style={styles.miniAvatarImg} 
                      />
                      {/* Blur only for non-premium users */}
                      {!hasGemPlus && !(premiumPreviewActive && revealedPreviewViews.includes(view.id)) && (
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                      )}
                    </View>
                  ))}
                  {/* If there are more than 3 views, show the count bubble */}
                  {profileViews.length > 3 && (
                    <View style={[
                      styles.miniAvatarMoreContainer, 
                      { 
                        marginLeft: -10, 
                        zIndex: 4 // Highest z-index to overlap all avatars
                      }
                    ]}>
                      <Text style={styles.miniAvatarMoreText}>+{profileViews.length - 3}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.miniPreviewText}>
                  {newViewCount > 0 
                    ? `${newViewCount} new view${newViewCount > 1 ? 's' : ''} today` 
                    : `${totalViewCount} total view${totalViewCount > 1 ? 's' : ''}`
                  }
                </Text>
                
                {/* Info button in mini view */}
                <TouchableOpacity 
                  style={styles.miniInfoButton}
                  onPress={() => ghostModal.showConfirmation(
                    'Profile Views',
                    'Profile views are stored for 7 days. After this period, they will automatically be removed.',
                    () => {},
                    undefined,
                    'OK',
                    undefined, // No cancel button needed
                    { name: 'info-outline', background: '#555555' }
                  )}
                >
                  <MaterialIcons name="info-outline" size={14} color="#8F8F8F" />
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.miniPreviewText}>No profile views yet</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
      
      {/* Render the custom modal */}
      {ghostModal.config && (
        <CustomModal
          visible={ghostModal.visible}
          title={ghostModal.config.title}
          message={ghostModal.config.message}
          buttons={ghostModal.config.buttons}
          icon={ghostModal.config.icon}
          gemInfo={ghostModal.config.gemInfo}
          onClose={ghostModal.hideModal}
        />
      )}
    </>
  );
};

// --- AllNotificationsWidget ---
const AllNotificationsWidget = () => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const { clearNotificationsByType, updateAllNotificationsCount } = useNotifications();
  const clearModal = useModal();
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  
  // Initialize with an empty array instead of seed data
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Get notification count
  const notificationCount = notifications.filter(n => !n.seen).length;

  // Initialize notification count once on component mount
  useEffect(() => {
    if (!notificationsInitialized) {
      // Only update the global count once
      updateAllNotificationsCount(notificationCount);
      setNotificationsInitialized(true);
    }
  }, [notificationCount, notificationsInitialized, updateAllNotificationsCount]);

  // Remove the auto-generating useEffect completely
  
  // Keep the timestamp update functionality
  useEffect(() => {
    // Skip if no notifications exist yet
    if (!notifications || notifications.length === 0) return;

    const updateTimestamps = () => {
      setNotifications(prevNotifications => 
        prevNotifications.map(notif => {
          // Skip if notification doesn't have createdAt timestamp
          if (!notif.createdAt) return notif;
          
          // Calculate how old the notification is
          const now = new Date();
          const diffMs = now.getTime() - notif.createdAt.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          
          // Update the time display based on age
          let timeDisplay = 'just now';
          if (diffMins === 1) timeDisplay = '1m ago';
          else if (diffMins > 1) timeDisplay = `${diffMins}m ago`;
          
          return {
            ...notif,
            time: timeDisplay
          };
        })
      );
    };
    
    // Update timestamps immediately and then every 60 seconds
    updateTimestamps();
    const intervalId = setInterval(updateTimestamps, 60000);
    
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array to prevent infinite loops

  // Make sure the notification count is updated when toggling expansion
  const toggleExpand = () => {
    LayoutAnimation.configureNext(animationConfig);
    const expanding = !isExpanded;
    setIsExpanded(expanding);
    
    // If expanding, mark all as seen
    if (expanding) {
      setNotifications(prevNotifications => {
        const updatedNotifications = prevNotifications.map(notif => ({
          ...notif,
          seen: true
        }));
        
        // Update global notification count to 0 since all are now seen
        // Move state update outside of render cycle with setTimeout
        setTimeout(() => {
          updateAllNotificationsCount(0);
          clearNotificationsByType('allNotifications');
        }, 0);
        
        return updatedNotifications;
      });
    }
  };

  // Handle notification press
  const handleNotificationPress = (item: Notification) => {
    // Mark this notification as seen
    setNotifications(prevNotifications =>
      prevNotifications.map(notif =>
        notif.id === item.id ? { ...notif, seen: true } : notif
      )
    );

    // If there's a target route, navigate to it
    if (item.targetRoute) {
      router.push({ pathname: item.targetRoute, params: item.targetParams || {} });
    } else {
      console.log('Notification pressed, no route:', item.type);
    }
  };

  // Function to handle deletion
  const handleDeleteNotification = (id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.filter(notif => notif.id !== id)
    );
  };

  // Add helper functions to match NotificationItem
  const getIconName = (type: string): string => {
    switch(type) {
      case 'mention':
        return 'alternate-email';
      case 'reply':
        return 'reply';
      case 'gold_sent':
        return 'monetization-on';
      case 'friend_request':
        return 'person-add';
      default:
        return 'notifications';
    }
  };

  const getIconBackground = (type: string): string => {
    switch(type) {
      case 'mention':
        return '#5865F2'; // Discord blue
      case 'reply':
        return '#4CAF50'; // Green
      case 'gold_sent':
        return '#FFC107'; // Gold
      case 'friend_request':
        return '#2196F3'; // Blue
      default:
        return '#9C27B0'; // Purple for unknown types
    }
  };

  // Update the renderItem function to only show one profile picture per notification
  const renderItem = ({ item, index }: { item: Notification; index: number }) => (
    <View>
      <TouchableOpacity 
        style={[
          styles.notificationItem,
          !item.seen && styles.unseenNotification
        ]} 
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Blue line indicator as an absolute positioned element */}
        {!item.seen && (
          <View style={styles.blueLineIndicator} />
        )}
        
        {/* Content container - directly use the renderNotificationContent which already has profile pictures */}
        {renderNotificationContent({ item })}
      </TouchableOpacity>
      
      {/* Add separator line after each item except the last one */}
      {index < notifications.length - 1 && (
        <View style={styles.notificationSeparator} />
      )}
    </View>
  );

  // Original renderItem function renamed to renderNotificationContent
  const renderNotificationContent = ({ item }: { item: Notification }) => {
    // For mention notifications with @username highlighting
    if (item.type === 'mention' && item.message.includes('<@>')) {
      // Extract parts: before tag, tag content, after tag
      const parts = item.message.split(/<@>|<\/!@>/);
      
      return (
        <NotificationItem
          item={{
            ...item,
            // Override the message renderer with our custom renderer
            customRenderer: () => (
              <View style={styles.contentContainer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.message}>
                    {parts[0]}
                    <Text style={styles.mentionTag}>{parts[1]}</Text>
                    {parts[2]}
                  </Text>
                  {item.mediaType === 'image' && (
                    <View style={styles.mediaIndicator}>
                      <MaterialIcons name="image" size={16} color="#A0A0A0" />
                      <Text style={styles.mediaText}>Image</Text>
                    </View>
                  )}
                </View>
                <Text style={item.seen ? styles.timeRight : styles.unseenTimeRight}>{item.time}</Text>
              </View>
            )
          }}
          onPress={handleNotificationPress}
          onDelete={handleDeleteNotification}
        />
      );
    }
    
    // For reply notifications with images
    if (item.type === 'reply' && item.mediaType === 'image') {
      return (
        <NotificationItem
          item={{
            ...item,
            customRenderer: () => (
              <View style={styles.contentContainer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.message}>{item.message}</Text>
                  <View style={styles.mediaIndicator}>
                    <MaterialIcons name="image" size={16} color="#A0A0A0" />
                    <Text style={styles.mediaText}>Image</Text>
                  </View>
                </View>
                <Text style={item.seen ? styles.timeRight : styles.unseenTimeRight}>{item.time}</Text>
              </View>
            )
          }}
          onPress={handleNotificationPress}
          onDelete={handleDeleteNotification}
        />
      );
    }
    
    // For regular notifications, use the standard renderer but with time right-aligned
    return (
      <NotificationItem
        item={{
          ...item,
          customRenderer: () => (
            <View style={styles.contentContainer}>
              <Text style={[styles.message, { flex: 1 }]}>{item.message}</Text>
              <Text style={item.seen ? styles.timeRight : styles.unseenTimeRight}>{item.time}</Text>
            </View>
          )
        }}
        onPress={handleNotificationPress}
        onDelete={handleDeleteNotification}
      />
    );
  };

  // Handle clear all notifications with confirmation
  const handleClearAll = (e: GestureResponderEvent) => {
    e.stopPropagation(); // Prevent widget from expanding/collapsing
    
    clearModal.showConfirmation(
      "Clear All Notifications?",
      "Are you sure you want to delete all notifications? This action cannot be undone.",
      () => {
        // Clear all notifications when confirmed
        setNotifications([]);
        clearNotificationsByType('allNotifications');
      },
      undefined,
      "Clear All",
      "Cancel",
      { name: "delete", background: "#F23535" }
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.widgetContainer]}
        onPress={toggleExpand}
        activeOpacity={0.9}
      >
        <View style={styles.widgetHeader}>
          <View style={styles.widgetTitleContainer}>
            <Text style={styles.widgetTitle}>All Notifications</Text>
            {/* Render count badge if count > 0 */}
            {notificationCount > 0 && (
              <View style={styles.widgetCountBadge}>
                <Text style={styles.widgetCountText}>{notificationCount}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Clear button - only show if there are notifications */}
            {notifications.length > 0 && (
              <TouchableOpacity 
                onPress={handleClearAll} 
                style={styles.clearButton}
              >
                <MaterialIcons name="delete-sweep" size={14} color="#FFFFFF" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
            <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={24} color="#FFFFFF" />
          </View>
        </View>

        {isExpanded ? (
          <View style={styles.widgetContent}>
            {notifications.length > 0 ? (
              <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                scrollEnabled={false} 
                style={styles.list}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <Text style={styles.emptyText}>No notifications yet</Text>
            )}
          </View>
        ) : (
          <View style={styles.miniPreview}>
            {notifications.length > 0 ? (
              <>
                {/* Show a row of profile pictures or fallback icons */}
                <View style={styles.miniAvatarRow}>
                  {notifications.slice(0, Math.min(3, notifications.length)).map((notif, index) => {
                    // Determine avatar URL or fallback to notification type icon
                    // Mock avatar URLs based on notification type (in a real app, these would come from the notification data)
                    const mockAvatars = {
                      'mention': 'https://randomuser.me/api/portraits/men/32.jpg',
                      'reply': 'https://randomuser.me/api/portraits/women/44.jpg',
                      'gold_sent': 'https://randomuser.me/api/portraits/women/68.jpg'
                    };
                    
                    // Use mock avatar based on notification type 
                    const avatarUrl = mockAvatars[notif.type as keyof typeof mockAvatars];
                    
                    // Fallback icon if no avatar is available
                    let iconName: "notifications" | "alternate-email" | "reply" | "monetization-on" = "notifications";
                    if (notif.type === 'mention') iconName = "alternate-email";
                    if (notif.type === 'reply') iconName = "reply";
                    if (notif.type === 'gold_sent') iconName = "monetization-on";
                    
                    return (
                      <View 
                        key={notif.id} 
                        style={[
                          styles.miniAvatarContainer,
                          { 
                            marginLeft: index > 0 ? -10 : 0, 
                            zIndex: 3 - index // First has highest z-index
                          }
                        ]}
                      >
                        {avatarUrl ? (
                          <Image 
                            source={{ uri: avatarUrl }} 
                            style={{ width: 36, height: 36, borderRadius: 18 }} 
                          />
                        ) : (
                          <View style={[styles.iconContainer, { width: 36, height: 36 }]}>
                            <MaterialIcons name={iconName} size={18} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                  {/* If there are more than 3 notifications, show the count bubble */}
                  {notifications.length > 3 && (
                    <View style={[
                      styles.miniAvatarMoreContainer, 
                      { 
                        marginLeft: -10, 
                        zIndex: 0 // Lowest z-index
                      }
                    ]}>
                      <Text style={styles.miniAvatarMoreText}>+{notifications.length - 3}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.miniPreviewText}>
                  {notificationCount > 0 
                    ? `${notificationCount} new notification${notificationCount > 1 ? 's' : ''}` 
                    : `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`
                  }
                </Text>
              </>
            ) : (
              <Text style={styles.miniPreviewText}>No notifications</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
      
      {/* Render the clear confirmation modal */}
      {clearModal.config && (
        <CustomModal
          visible={clearModal.visible}
          title={clearModal.config.title}
          message={clearModal.config.message}
          buttons={clearModal.config.buttons}
          icon={clearModal.config.icon}
          onClose={clearModal.hideModal}
        />
      )}
    </>
  );
};

const NotificationsScreen = () => {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CommonHeader 
        title="Notifications" 
        rightIcons={[
          {
            name: 'more-vert',
            color: '#FFFFFF',
            onPress: () => router.push('/notification-settings')
          }
        ]}
      />
      
      <ScrollView style={styles.scrollView}> 
        <AnnouncementWidget />
        <FriendRequestWidget />
        <ProfileViewWidget />
        <AllNotificationsWidget />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1D23',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  widgetContainer: {
    backgroundColor: '#2C2D35',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetTitleContainer: { 
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1, 
      marginRight: 8, 
  },
  widgetTitle: { 
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  widgetCountBadge: {
    backgroundColor: '#F23535', // Red background
    borderRadius: 9,
    paddingHorizontal: 5,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  widgetCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  widgetContent: {
    paddingTop: 8,
  },
  placeholderWidgetText: { // Keep for empty state later if needed
    color: '#A0A0A0',
    fontSize: 14,
    paddingVertical: 10, // Add padding if using
  },
  // --- Friend Request Item Styles ---
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  requestItemHandled: { // Optional: Style to dim handled requests slightly
    opacity: 0.7,
  },
  requestProfileTouchable: { // Make profile info touchable
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1, // Take up available space before buttons
      marginRight: 8, // Space before potential buttons
  },
  requestAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  requestInfo: {
    flex: 1, // Allow text to take space within the touchable
  },
  requestName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  requestMutual: {
    color: '#8F8F8F',
    fontSize: 13,
  },
  requestActions: {
    flexDirection: 'row',
  },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50', // Green
  },
  declineButton: {
    backgroundColor: '#F23535', // Red
  },
  // --- End Widget Item Styles ---
  listHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  list: {
    width: '100%',
  },
  listContent: {
    paddingBottom: 100,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2C2D35',
    borderRadius: 8,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden', // Ensure blue line doesn't overflow
  },
  unseenNotification: {
    backgroundColor: '#22232A',
  },
  blueLineIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#5865F2',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  message: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: '#8F8F8F',
  },
  emptyText: {
    fontSize: 16,
    color: '#8F8F8F',
    textAlign: 'center',
    marginTop: 40,
  },
  // --- Profile View Item Styles ---
  viewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    height: 60, // Add fixed height to ensure consistent item size
  },
  viewAvatarContainer: { // Container to apply blur
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden', // Important for BlurView mask
  },
  viewAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  viewInfo: {
    flex: 1,
  },
  nameBubble: {
    backgroundColor: '#3C3D45',
    borderRadius: 12,
    width: 70,
    height: 18,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  bubbleText: {
    color: '#8F8F8F',
    fontSize: 13,
    fontWeight: 'medium',
  },
  viewName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  viewTimestamp: {
    color: '#8F8F8F',
    fontSize: 13,
  },
  upgradeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      paddingVertical: 10,
      backgroundColor: 'rgba(183, 104, 251, 0.15)',
      borderRadius: 8,
  },
  upgradeButtonText: {
      color: '#B768FB',
      fontSize: 14,
      fontWeight: 'bold',
  },
  totalCountText: {
      color: '#A0A0A0',
      fontSize: 13,
      marginBottom: 8,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  showMoreButtonText: {
    color: '#A0A0A0',
    fontSize: 14,
    marginRight: 6,
  },
  // --- Announcement Item Styles (New/Restored) ---
  announcementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  announcementAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  announcementTextContainer: {
      flex: 1,
  },
  announcementMessage: {
    color: '#E0E0E0',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  announcementTag: {
    backgroundColor: 'rgba(88, 101, 242, 0.3)',
    color: '#A7B0F5',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    fontWeight: '500',
  },
  announcementTime: {
    color: '#8F8F8F',
    fontSize: 12,
  },
  scrollableAnnouncements: {
    maxHeight: 300, // Limit height when many announcements are shown
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  moreButtonText: {
    color: '#A0A0A0',
    fontSize: 14,
    marginRight: 6,
  },
  scrollableRequests: {
    maxHeight: 300, // Limit height when many requests are shown
  },
  glowingWidget: {
    borderWidth: 1,
    borderColor: '#B768FB',
    shadowColor: '#B768FB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  newViewItem: {
    backgroundColor: 'rgba(183, 104, 251, 0.08)', // Subtle highlight for unseen views
  },
  profileViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoButton: {
    padding: 4,
    marginRight: 8,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  anonymousText: {
    color: '#8F8F8F',
    fontSize: 12,
    marginRight: 4,
  },
  scrollableViews: {
    height: 200, // Fixed height to show exactly 3 items (3 * 60px height + some padding)
  },
  viewItemWithBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  retentionNotice: {
    color: '#8F8F8F',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#A0A0A0',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  spotlightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5865F2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  spotlightButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  miniPreview: {
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    paddingRight: 4, // Add right padding for more space
  },
  miniAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2C2D35',
  },
  miniAvatar: {
    width: '100%',
    height: '100%',
  },
  miniAvatarMoreContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A4B56',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    zIndex: 0,
    borderWidth: 2,
    borderColor: '#2C2D35',
    paddingHorizontal: 2, // Add padding to prevent text cropping
  },
  miniAvatarMoreText: {
    color: '#FFFFFF',
    fontSize: 12, // Restore original font size
    fontWeight: 'bold',
    textAlign: 'center', // Keep text centered
  },
  miniPreviewText: {
    flex: 1,
    color: '#A0A0A0',
    fontSize: 12,
    marginLeft: 12,
  },
  miniInfoButton: {
    padding: 4,
    marginLeft: 8,
  },
  premiumSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  premiumCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(183, 104, 251, 0.08)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  premiumCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  premiumCardDescription: {
    color: '#B0B0B0',
    fontSize: 12,
  },
  premiumButtonRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  previewButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingMoreContainer: {
    padding: 10,
    alignItems: 'center',
  },
  loadingMoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  scrollHintText: {
    color: '#A0A0A0',
    fontSize: 12,
    marginLeft: 4,
  },
  endOfListContainer: {
    padding: 10,
    alignItems: 'center',
  },
  endOfListText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(183, 104, 251, 0.1)',
    borderRadius: 9,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 8,
  },
  visitCountText: {
    color: '#B768FB',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  revealButton: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: 'rgba(183, 104, 251, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealButtonText: {
    color: '#B768FB',
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 2,
  },
  ghostModeTooltip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(40, 40, 45, 0.95)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#B768FB',
  },
  ghostModeTooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  tooltipCloseButton: {
    marginLeft: 8,
    padding: 4,
  },
  mentionTag: {
    backgroundColor: 'rgba(88, 101, 242, 0.3)',
    color: '#A7B0F5',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    fontWeight: '500',
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(160, 160, 160, 0.1)',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  mediaText: {
    color: '#A0A0A0',
    fontSize: 12,
    marginLeft: 4,
  },
  notificationSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 6,
  },
  
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 53, 53, 0.15)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 12,
  },
  
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  
  timeRight: {
    fontSize: 14,
    color: '#8F8F8F',
    marginLeft: 8,
    textAlign: 'right',
    minWidth: 35, // Ensure consistent width for timestamps
  },
  
  // Add new style for unseen notification time with blue bubble
  unseenTimeRight: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
    textAlign: 'center',
    backgroundColor: '#5865F2', // Blue bubble background
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  
  notificationItemContainer: {
    // Empty object instead of undefined
  },
  
  unreadNotificationContainer: {
    // Empty object instead of undefined
  },
  
  newIndicator: {
    position: 'absolute',
    top: 10,
    right: 100, // Position further left to avoid timestamps
    backgroundColor: '#5865F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 5,
  },
  
  newIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  outerNotificationContainer: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 6,
  },
  
  notificationContentContainer: {
    flex: 1,
    position: 'relative',
  },
  
  unreadIndicator: {
    width: 4,
    backgroundColor: '#5865F2',
    alignSelf: 'stretch',
  },
  
  notificationWrapper: {
    flexDirection: 'row',
    marginBottom: 6,
    borderRadius: 8,
  },
  
  notificationContainer: {
    flex: 1,
  },
  
  notificationMainContent: {
    flex: 1,
    backgroundColor: '#2C2D35',
    borderRadius: 10,
    position: 'relative',
  },

  // Image specific styles that don't include incompatible ViewStyle properties
  announcementAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  requestAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  viewAvatarImg: {
    width: '100%',
    height: '100%',
  },
  miniAvatarImg: {
    width: '100%',
    height: '100%',
  },
});

export default NotificationsScreen; 