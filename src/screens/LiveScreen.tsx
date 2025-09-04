import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useLiveStreams } from '../context/LiveStreamContext';
import { useAuth } from '../context/AuthContext';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';

const LiveScreen: React.FC = () => {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const {
    streams,
    friendStreams,
    joinStream,
    currentlyWatching,
    leaveStreamWithConfirmation
  } = useLiveStreams();
  
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Streams are automatically loaded by the context
    // Set loading to false after a brief delay to show initial load state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // The context automatically updates streams via real-time listeners
      // Just wait a moment to simulate refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to refresh streams:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoinStream = async (streamId: string, streamTitle: string, hostName: string, hostAvatar: string, viewCount: number) => {
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
      await joinStream(streamId);
      router.push({
        pathname: '/livestream',
        params: {
          streamId,
          title: streamTitle,
          hostName,
          hostAvatar,
          viewCount: viewCount.toString()
        }
      });
    } catch (error: any) {
      console.error('Failed to join stream:', error);
      // Don't show error if user just cancelled the confirmation
      if (error && error.message !== 'User cancelled stream join') {
        Alert.alert('Error', 'Failed to join stream. Please try again.');
      }
    }
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  const renderStreamCard = (stream: any, isFriend: boolean = false) => (
    <TouchableOpacity
      key={stream.id}
      style={[styles.streamCard, isFriend && styles.friendStreamCard]}
      onPress={() => handleJoinStream(
        stream.id,
        stream.title,
        stream.hosts[0]?.name || 'Host',
        stream.hosts[0]?.avatar || 'https://via.placeholder.com/150',
        stream.views
      )}
    >
      <View style={styles.streamHeader}>
        <Image
          source={{ uri: stream.hosts[0]?.avatar || 'https://via.placeholder.com/150' }}
          style={styles.hostAvatar}
        />
        <View style={styles.streamInfo}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            {stream.title}
          </Text>
          <Text style={styles.hostName}>
            {stream.hosts[0]?.name || 'Host'}
          </Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      
      <View style={styles.streamFooter}>
        <View style={styles.viewCount}>
          <MaterialIcons name="visibility" size={16} color="#9AA3B2" />
          <Text style={styles.viewCountText}>
            {formatViewCount(stream.views)} watching
          </Text>
        </View>
        {isFriend && (
          <View style={styles.friendBadge}>
            <MaterialIcons name="person" size={14} color="#5865F2" />
            <Text style={styles.friendBadgeText}>Friend</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5865F2" />
          <Text style={styles.loadingText}>Loading live streams...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Streams</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <MaterialIcons 
            name="refresh" 
            size={24} 
            color={refreshing ? "#666" : "#5865F2"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#5865F2"
            colors={["#5865F2"]}
          />
        }
      >
        {/* Friends' Streams Section */}
        {(friendStreams.hosting.length > 0 || friendStreams.watching.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friends Live</Text>
            {friendStreams.hosting.map(stream => renderStreamCard(stream, true))}
            {friendStreams.watching.map(stream => renderStreamCard(stream, true))}
          </View>
        )}

        {/* All Streams Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {(friendStreams.hosting.length > 0 || friendStreams.watching.length > 0) ? 'Discover' : 'Live Now'}
          </Text>
          {streams.length > 0 ? (
            streams.map(stream => renderStreamCard(stream))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="live-tv" size={64} color="#666" />
              <Text style={styles.emptyStateTitle}>No Live Streams</Text>
              <Text style={styles.emptyStateText}>
                Check back later for live content from the community
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1117',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252A3A',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9AA3B2',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  streamCard: {
    backgroundColor: '#151924',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252A3A',
  },
  friendStreamCard: {
    borderColor: '#5865F2',
    backgroundColor: '#1a1d2e',
  },
  streamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  streamInfo: {
    flex: 1,
  },
  streamTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  hostName: {
    fontSize: 14,
    color: '#9AA3B2',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  streamFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCountText: {
    fontSize: 14,
    color: '#9AA3B2',
    marginLeft: 4,
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5865F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  friendBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9AA3B2',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LiveScreen;
