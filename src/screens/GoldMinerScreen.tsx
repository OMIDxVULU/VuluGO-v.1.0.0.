import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScrollableContentContainer from '../components/ScrollableContentContainer';

const GoldMinerScreen = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="hardware" size={24} color="#FFD700" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Gold Miner</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollableContentContainer style={styles.content}>
        <View style={styles.gameContainer}>
          <Image 
            source={{ uri: 'https://picsum.photos/id/1015/800/400' }}
            style={styles.gameImage}
            resizeMode="cover"
          />
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialIcons name="monetization-on" size={24} color="#FFD700" />
              <Text style={styles.statValue}>3,450</Text>
              <Text style={styles.statLabel}>Gold</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={24} color="#FFD700" />
              <Text style={styles.statValue}>Level 7</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="trending-up" size={24} color="#FFD700" />
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Games Won</Text>
            </View>
          </View>
          
          <Button 
            mode="contained" 
            style={styles.playButton}
            labelStyle={styles.playButtonLabel}
            onPress={() => console.log('Play game')}
          >
            PLAY NOW
          </Button>
          
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <MaterialIcons name="monetization-on" size={20} color="#FFD700" style={styles.activityIcon} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>Gold Mine Discovery!</Text>
                <Text style={styles.activityDetails}>You collected 250 gold</Text>
              </View>
              <Text style={styles.activityTime}>2h ago</Text>
            </View>
            
            <View style={styles.activityItem}>
              <MaterialIcons name="star" size={20} color="#FFD700" style={styles.activityIcon} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>Level Up!</Text>
                <Text style={styles.activityDetails}>You reached level 7</Text>
              </View>
              <Text style={styles.activityTime}>Yesterday</Text>
            </View>
            
            <View style={styles.activityItem}>
              <MaterialIcons name="diamond" size={20} color="#1E90FF" style={styles.activityIcon} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>Rare Item Found</Text>
                <Text style={styles.activityDetails}>You discovered a blue diamond</Text>
              </View>
              <Text style={styles.activityTime}>3 days ago</Text>
            </View>
          </View>
        </View>
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
  gameContainer: {
    flex: 1,
  },
  gameImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#1C1D23',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  playButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    marginBottom: 24,
    paddingVertical: 6,
  },
  playButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  activityList: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityIcon: {
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  activityDetails: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
});

export default GoldMinerScreen; 