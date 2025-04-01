import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, FlatList } from 'react-native';
import { Text, Avatar, ProgressBar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScrollableContentContainer from '../components/ScrollableContentContainer';

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: string;
}

const MusicScreen = () => {
  const router = useRouter();

  const recentPlaylists = [
    { id: '1', name: 'Workout Mix', cover: 'https://picsum.photos/id/1025/300/300', songs: 12 },
    { id: '2', name: 'Chill Vibes', cover: 'https://picsum.photos/id/1019/300/300', songs: 18 },
    { id: '3', name: 'Road Trip', cover: 'https://picsum.photos/id/1039/300/300', songs: 24 },
  ];

  const songs: Song[] = [
    { id: '1', title: 'Midnight Dreams', artist: 'Luna Nova', cover: 'https://picsum.photos/id/1062/300/300', duration: '3:45' },
    { id: '2', title: 'Oceans Away', artist: 'Sky Collective', cover: 'https://picsum.photos/id/1060/300/300', duration: '4:12' },
    { id: '3', title: 'Electric Pulse', artist: 'Neon Wave', cover: 'https://picsum.photos/id/1069/300/300', duration: '3:28' },
    { id: '4', title: 'Desert Wind', artist: 'Mirage', cover: 'https://picsum.photos/id/1082/300/300', duration: '5:01' },
  ];

  const renderPlaylist = ({ item }: { item: { id: string; name: string; cover: string; songs: number } }) => (
    <TouchableOpacity style={styles.playlistCard}>
      <Image source={{ uri: item.cover }} style={styles.playlistCover} />
      <Text style={styles.playlistName}>{item.name}</Text>
      <Text style={styles.playlistSongs}>{item.songs} songs</Text>
    </TouchableOpacity>
  );

  const renderSong = ({ item }: { item: Song }) => (
    <TouchableOpacity style={styles.songRow}>
      <Image source={{ uri: item.cover }} style={styles.songCover} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>{item.title}</Text>
        <Text style={styles.songArtist}>{item.artist}</Text>
      </View>
      <Text style={styles.songDuration}>{item.duration}</Text>
      <MaterialIcons name="more-vert" size={24} color="#8E8E93" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="music-note" size={24} color="#38B6FF" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Music</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollableContentContainer style={styles.content}>
        {/* Now Playing */}
        <View style={styles.nowPlayingContainer}>
          <View style={styles.nowPlayingContent}>
            <Image 
              source={{ uri: 'https://picsum.photos/id/1082/300/300' }}
              style={styles.nowPlayingCover} 
            />
            <View style={styles.playbackInfo}>
              <View style={styles.trackInfo}>
                <Text style={styles.nowPlayingTitle}>Desert Wind</Text>
                <Text style={styles.nowPlayingArtist}>Mirage</Text>
              </View>
              <View style={styles.playbackControls}>
                <TouchableOpacity>
                  <MaterialIcons name="skip-previous" size={30} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.playButton}>
                  <MaterialIcons name="pause" size={30} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <MaterialIcons name="skip-next" size={30} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <ProgressBar progress={0.7} color="#38B6FF" style={styles.progressBar} />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>3:30</Text>
              <Text style={styles.timeText}>5:01</Text>
            </View>
          </View>
        </View>

        {/* Recent Playlists */}
        <Text style={styles.sectionTitle}>Your Playlists</Text>
        <FlatList
          data={recentPlaylists}
          renderItem={renderPlaylist}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.playlistList}
        />

        {/* Recent Songs */}
        <Text style={styles.sectionTitle}>Recently Played</Text>
        <FlatList
          data={songs}
          renderItem={renderSong}
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
  nowPlayingContainer: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  nowPlayingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nowPlayingCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  playbackInfo: {
    flex: 1,
    marginLeft: 16,
  },
  trackInfo: {
    marginBottom: 12,
  },
  nowPlayingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nowPlayingArtist: {
    fontSize: 14,
    color: '#8E8E93',
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#38B6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  playlistList: {
    paddingBottom: 16,
  },
  playlistCard: {
    width: 140,
    marginRight: 16,
  },
  playlistCover: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginBottom: 8,
  },
  playlistName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  playlistSongs: {
    fontSize: 12,
    color: '#8E8E93',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#1C1D23',
    borderRadius: 12,
  },
  songCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
    marginLeft: 16,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#8E8E93',
  },
  songDuration: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 12,
  },
});

export default MusicScreen; 