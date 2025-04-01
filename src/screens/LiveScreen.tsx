import React from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { Text, Chip, Avatar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScrollableContentContainer from '../components/ScrollableContentContainer';

interface LiveStream {
  id: string;
  title: string;
  creator: string;
  viewers: number;
  thumbnail: string;
  avatar: string;
  tags: string[];
}

const LiveScreen = () => {
  const router = useRouter();

  const liveStreams: LiveStream[] = [
    {
      id: '1',
      title: 'Gaming with Friends',
      creator: 'Alex Johnson',
      viewers: 1245,
      thumbnail: 'https://picsum.photos/id/237/400/200',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      tags: ['Gaming', 'Multiplayer']
    },
    {
      id: '2',
      title: 'Music Jam Session',
      creator: 'Sarah Williams',
      viewers: 876,
      thumbnail: 'https://picsum.photos/id/96/400/200',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      tags: ['Music', 'Live']
    },
    {
      id: '3',
      title: 'Cooking Masterclass',
      creator: 'Michael Chen',
      viewers: 532,
      thumbnail: 'https://picsum.photos/id/292/400/200',
      avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
      tags: ['Food', 'Cooking']
    },
  ];

  const renderItem = ({ item }: { item: LiveStream }) => (
    <TouchableOpacity style={styles.streamCard}>
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewersContainer}>
          <MaterialIcons name="visibility" size={14} color="#FFFFFF" />
          <Text style={styles.viewersText}>{item.viewers}</Text>
        </View>
      </View>
      <View style={styles.streamDetails}>
        <View style={styles.creatorInfo}>
          <Avatar.Image source={{ uri: item.avatar }} size={40} />
          <View style={styles.creatorTextContainer}>
            <Text style={styles.streamTitle}>{item.title}</Text>
            <Text style={styles.creatorName}>{item.creator}</Text>
          </View>
        </View>
        <View style={styles.tagContainer}>
          {item.tags.map((tag: string, index: number) => (
            <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
              {tag}
            </Chip>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="live-tv" size={24} color="#FF5C8D" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Live Streams</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollableContentContainer style={styles.content}>
        <Text style={styles.sectionTitle}>Trending Now</Text>
        <FlatList
          data={liveStreams}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          scrollEnabled={false}
        />
      </ScrollableContentContainer>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  streamCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    height: 180,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  liveIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF5C8D',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    marginRight: 4,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewersContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewersText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  streamDetails: {
    padding: 16,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorTextContainer: {
    marginLeft: 12,
  },
  streamTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#2C2D35',
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});

export default LiveScreen; 