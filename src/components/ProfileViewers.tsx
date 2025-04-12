import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserProfile } from '../context/UserProfileContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProfileViewersSectionProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
};

const ProfileViewersSection: React.FC<ProfileViewersSectionProps> = ({ 
  title, 
  subtitle,
  onClose 
}) => {
  const { recentViewers, topViewers, totalViews } = useUserProfile();
  const insets = useSafeAreaInsets();
  const fadeAnim = new Animated.Value(0);
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Format the date to show how long ago
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header - Nothing should appear above this line */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <ScrollView 
          style={styles.mainContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Total Views Counter */}
          <View style={styles.totalViewsContainer}>
            <View style={styles.totalViewsCard}>
              <Text style={styles.totalViewsText}>Total Profile Views: {totalViews.toLocaleString()}</Text>
            </View>
          </View>
          
          {/* Top Viewers Section - Horizontal Scroll */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionTitle}>Top Viewers</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{topViewers.length}</Text>
              </View>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.topViewersScrollContent}
            >
              {topViewers.map((viewer, index) => (
                <TouchableOpacity key={viewer.id} activeOpacity={0.7} style={styles.topViewerCardWrapper}>
                  <View style={styles.topViewerCard}>
                    <View style={styles.rankContainer}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    
                    <View style={styles.topViewerImageContainer}>
                      <Image 
                        source={{ uri: viewer.profileImage }} 
                        style={styles.topViewerImage} 
                      />
                    </View>
                    
                    <View style={styles.topViewerInfo}>
                      <Text style={styles.viewerName} numberOfLines={1}>{viewer.name}</Text>
                      <Text style={styles.viewerUsername} numberOfLines={1}>{viewer.username}</Text>
                      
                      <View style={styles.viewCountContainer}>
                        <Text style={styles.viewCount}>{viewer.viewCount}</Text>
                        <Text style={styles.viewCountLabel}>views</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Recent Viewers Section - Vertical List */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionTitle}>Recent Viewers</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{recentViewers.length}</Text>
              </View>
            </View>
            
            <View style={styles.cardsContainer}>
              {recentViewers.map((viewer) => (
                <TouchableOpacity key={viewer.id} activeOpacity={0.7}>
                  <View style={styles.viewerCard}>
                    <View style={styles.viewerImageContainer}>
                      <Image 
                        source={{ uri: viewer.profileImage }} 
                        style={styles.viewerImage} 
                      />
                    </View>
                    
                    <View style={styles.viewerInfo}>
                      <Text style={styles.viewerName}>{viewer.name}</Text>
                      <Text style={styles.viewerUsername}>{viewer.username}</Text>
                    </View>
                    
                    <View style={styles.timeContainer}>
                      <Text style={styles.timeText}>{formatDate(viewer.lastViewed)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Extra space at bottom to ensure content doesn't get cut off */}
          <View style={styles.bottomSpace} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#131318',
  },
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#A8B3BD',
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Total Views section
  totalViewsContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  totalViewsCard: {
    backgroundColor: 'rgba(110, 105, 244, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  totalViewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionBadge: {
    backgroundColor: 'rgba(110, 105, 244, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  sectionBadgeText: {
    color: '#6E69F4',
    fontSize: 12,
    fontWeight: '600',
  },
  cardsContainer: {
    gap: 14,
  },
  // Top viewers horizontal scroll
  topViewersScrollContent: {
    paddingRight: 20,
    paddingLeft: 5,
    paddingBottom: 10,
  },
  topViewerCardWrapper: {
    marginLeft: 15,
    width: 170, 
  },
  topViewerCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    alignItems: 'center',
    position: 'relative',
    marginTop: 14,
  },
  topViewerImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#1E1F25',
  },
  topViewerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  topViewerInfo: {
    width: '100%',
    alignItems: 'center',
  },
  // Recent viewers vertical list
  viewerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  rankContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6E69F4',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -14,
    left: 10,
    zIndex: 20,
    borderWidth: 2,
    borderColor: '#131318',
    elevation: 8,
  },
  rankText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  viewerImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#1E1F25',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },
  viewerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  viewerName: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  viewerUsername: {
    color: '#A8B3BD',
    fontSize: 14,
    marginTop: 3,
  },
  viewCountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(110, 105, 244, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
    width: 'auto',
  },
  viewCount: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  viewCountLabel: {
    color: '#A8B3BD',
    fontSize: 12,
  },
  timeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  timeText: {
    color: '#A8B3BD',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomSpace: {
    height: 30,
  },
});

export default ProfileViewersSection; 