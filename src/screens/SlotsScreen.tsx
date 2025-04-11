import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScrollableContentContainer from '../components/ScrollableContentContainer';

const SlotsScreen = () => {
  const router = useRouter();
  const [balance, setBalance] = useState(1500);

  // Sample slot machines
  const slotMachines = [
    { id: '1', name: 'Lucky 7s', image: 'https://picsum.photos/id/1050/400/200', minBet: 10, maxBet: 100 },
    { id: '2', name: 'Fruit Frenzy', image: 'https://picsum.photos/id/1062/400/200', minBet: 5, maxBet: 50 },
    { id: '3', name: 'Diamond Deluxe', image: 'https://picsum.photos/id/1060/400/200', minBet: 20, maxBet: 200 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="casino" size={24} color="#FF5252" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Slots</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollableContentContainer style={styles.content}>
        <View style={styles.balanceContainer}>
          <View style={styles.balanceCard}>
            <MaterialIcons name="account-balance-wallet" size={24} color="#FFD700" />
            <Text style={styles.balanceValue}>{balance}</Text>
            <Text style={styles.balanceLabel}>Coins</Text>
          </View>
          <TouchableOpacity style={styles.addCoinsButton}>
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addCoinsText}>Add Coins</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Featured Slots</Text>
        
        <View style={styles.featuredSlot}>
          <Image 
            source={{ uri: 'https://picsum.photos/id/1029/800/400' }}
            style={styles.featuredImage}
            resizeMode="cover"
          />
          <View style={styles.featuredOverlay}>
            <Text style={styles.featuredTitle}>Mega Jackpot</Text>
            <Text style={styles.featuredSubtitle}>Win up to 100,000 coins!</Text>
            <Button
              mode="contained"
              style={styles.playNowButton}
              labelStyle={styles.playNowButtonLabel}
              onPress={() => console.log('Play featured slot')}
            >
              PLAY NOW
            </Button>
          </View>
        </View>

        <Text style={styles.sectionTitle}>All Slot Machines</Text>
        
        <View style={styles.slotsList}>
          {slotMachines.map((slot) => (
            <Card key={slot.id} style={styles.slotCard}>
              <Card.Cover source={{ uri: slot.image }} style={styles.slotImage} />
              <Card.Content style={styles.slotCardContent}>
                <Text style={styles.slotName}>{slot.name}</Text>
                <Text style={styles.slotBetRange}>Bet: {slot.minBet} - {slot.maxBet}</Text>
                <Button
                  mode="outlined"
                  style={styles.slotPlayButton}
                  labelStyle={styles.slotPlayButtonLabel}
                  onPress={() => console.log(`Play ${slot.name}`)}
                >
                  PLAY
                </Button>
              </Card.Content>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Wins</Text>
        
        <View style={styles.recentWinsList}>
          <View style={styles.recentWinItem}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
              style={styles.winnerAvatar}
            />
            <View style={styles.winnerInfo}>
              <Text style={styles.winnerName}>John D.</Text>
              <Text style={styles.winDetails}>Won 2,500 on Diamond Deluxe</Text>
            </View>
            <Text style={styles.winTime}>5m ago</Text>
          </View>
          
          <View style={styles.recentWinItem}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }}
              style={styles.winnerAvatar}
            />
            <View style={styles.winnerInfo}>
              <Text style={styles.winnerName}>Sarah M.</Text>
              <Text style={styles.winDetails}>Won 10,000 on Mega Jackpot</Text>
            </View>
            <Text style={styles.winTime}>20m ago</Text>
          </View>
          
          <View style={styles.recentWinItem}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/68.jpg' }}
              style={styles.winnerAvatar}
            />
            <View style={styles.winnerInfo}>
              <Text style={styles.winnerName}>Mike T.</Text>
              <Text style={styles.winDetails}>Won 750 on Lucky 7s</Text>
            </View>
            <Text style={styles.winTime}>1h ago</Text>
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
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginHorizontal: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  addCoinsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5252',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addCoinsText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  featuredSlot: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  featuredImage: {
    width: '100%',
    height: 180,
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  featuredSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
  },
  playNowButton: {
    backgroundColor: '#FF5252',
    borderRadius: 8,
    width: 120,
  },
  playNowButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  slotsList: {
    flexDirection: 'column',
    marginBottom: 24,
  },
  slotCard: {
    marginBottom: 16,
    backgroundColor: '#1C1D23',
  },
  slotImage: {
    height: 120,
  },
  slotCardContent: {
    paddingVertical: 16,
  },
  slotName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  slotBetRange: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  slotPlayButton: {
    borderColor: '#FF5252',
    borderWidth: 1,
    width: 100,
    alignSelf: 'flex-start',
  },
  slotPlayButtonLabel: {
    color: '#FF5252',
    fontSize: 14,
  },
  recentWinsList: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 16,
  },
  recentWinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  winnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  winDetails: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  winTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
});

export default SlotsScreen; 