import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScrollableContentContainer from '../components/ScrollableContentContainer';

// Use the router for navigation
const HomeScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Week');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
        <View style={styles.balanceContainer}>
          <View style={styles.coinIcon}>
            <MaterialIcons name="attach-money" size={24} color="#FFD700" />
          </View>
          <Text style={styles.balanceText}>10 000 000 000 0...</Text>
          <View style={styles.plusButton}>
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
          </View>
        </View>
      </View>

      <ScrollableContentContainer
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Horizontal Active Chats (Placeholder) */}
        <View style={styles.horizontalScrollPlaceholder}>
          <Text style={styles.placeholderText}>Horizontal Active Chats (TODO)</Text>
        </View>
        
        {/* Timer Section */}
        <Card style={styles.timerCard}>
          <View style={styles.timerContent}>
            <View style={styles.timerSection}>
              <Text style={styles.timerText}>00:23:06</Text>
              <Text style={styles.timerLabel}>Time Left</Text>
            </View>
            
            <View style={styles.prizeSection}>
              <View style={styles.prizeWrapper}>
                <MaterialIcons name="attach-money" size={20} color="#FFD700" />
                <Text style={styles.prizeText}>1350</Text>
              </View>
              <Text style={styles.prizeLabel}>Prize Pool</Text>
            </View>
            
            <View style={styles.entriesSection}>
              <Text style={styles.entriesText}>7</Text>
              <Text style={styles.entriesLabel}>Entries</Text>
            </View>
            
            <TouchableOpacity style={styles.enterButton}>
              <Text style={styles.enterButtonText}>Enter</Text>
            </TouchableOpacity>
          </View>
        </Card>
        
        {/* Gem+ Subscription */}
        <Card style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.subscriptionTitle}>Gem+</Text>
            <View style={styles.activeIndicator}>
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
            <TouchableOpacity style={styles.buyButton}>
              <Text style={styles.buyButtonText}>Buy</Text>
            </TouchableOpacity>
          </View>
        </Card>
        
        {/* Gems per day */}
        <Card style={styles.gemsCard}>
          <View style={styles.gemsPerDayContainer}>
            <Text style={styles.gemsLabel}>Gems per day</Text>
            <View style={styles.gemsValueContainer}>
              <Text style={styles.gemsValue}>171</Text>
              <MaterialIcons name="diamond" size={18} color="#B768FB" />
            </View>
          </View>
        </Card>
        
        {/* Gems collected */}
        <Card style={styles.gemsCollectedCard}>
          <View style={styles.gemsCollectedHeader}>
            <Text style={styles.gemsCollectedTitle}>Gems collected</Text>
            <MaterialIcons name="diamond" size={16} color="#B768FB" />
          </View>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'Week' && styles.activeTab]}
              onPress={() => setActiveTab('Week')}
            >
              <Text style={styles.tabText}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'Month' && styles.activeTab]}
              onPress={() => setActiveTab('Month')}
            >
              <Text style={styles.tabText}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'Year' && styles.activeTab]}
              onPress={() => setActiveTab('Year')}
            >
              <Text style={styles.tabText}>Year</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.gemsStatsContainer}>
            <Text style={styles.gemsStatsText}>This Week: 1197 gems</Text>
            <MaterialIcons name="diamond" size={18} color="#B768FB" />
          </View>
        </Card>
        
        {/* Announcements */}
        <Card style={styles.announcementCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Announcement</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </View>
          
          <View style={styles.messageContainer}>
            <Avatar.Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/32.jpg' }} 
              size={40} 
              style={styles.messageAvatar}
            />
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text style={styles.messageSender}>Sophia</Text>
                <Text style={styles.messageTime}>1h</Text>
              </View>
              <Text style={styles.messageUsername}>@Announcement</Text>
              <Text style={styles.messageText}>Please call me, test au...</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.showMoreButton}>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </Card>
        
        {/* Mentions */}
        <Card style={styles.mentionsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>@mentions</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </View>
          
          <View style={styles.messageContainer}>
            <Avatar.Image 
              source={{ uri: 'https://randomuser.me/api/portraits/women/32.jpg' }} 
              size={40} 
              style={styles.messageAvatar}
            />
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text style={styles.messageSender}>Sophia</Text>
                <Text style={styles.messageTime}>1h</Text>
              </View>
              <Text style={styles.messageUsername}>@YourUsername</Text>
              <Text style={styles.messageText}>Im bored what are you...</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.showMoreButton}>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </Card>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 29, 35, 0.8)',
    borderRadius: 25,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  coinIcon: {
    marginRight: 4,
  },
  balanceText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  plusButton: {
    backgroundColor: '#6E69F4',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  content: {
    padding: 16,
  },
  horizontalScrollPlaceholder: {
    height: 102, // Approximate height from Figma component
    backgroundColor: 'rgba(67, 71, 81, 0.5)', // Semi-transparent version of #434751
    borderRadius: 10,
    marginBottom: 16, // Space before the next section
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#B5BAC1',
    fontSize: 14,
  },
  timerCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 16,
  },
  timerContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerSection: {
    alignItems: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerLabel: {
    color: '#8E8E93',
    fontSize: 12,
  },
  prizeSection: {
    alignItems: 'center',
  },
  prizeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prizeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  prizeLabel: {
    color: '#8E8E93',
    fontSize: 12,
  },
  entriesSection: {
    alignItems: 'center',
  },
  entriesText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  entriesLabel: {
    color: '#8E8E93',
    fontSize: 12,
  },
  enterButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  enterButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  subscriptionCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  activeIndicator: {
    backgroundColor: '#B768FB',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  activeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buyButton: {
    backgroundColor: '#6E69F4',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  gemsCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 16,
  },
  gemsPerDayContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gemsLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gemsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gemsValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
  },
  gemsCollectedCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
  },
  gemsCollectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gemsCollectedTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2C2D36',
    borderRadius: 20,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#1C1D23',
  },
  tabText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  gemsStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemsStatsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  announcementCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badgeContainer: {
    backgroundColor: '#F23535',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 8,
  },
  messageAvatar: {
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageTime: {
    color: '#8E8E93',
    fontSize: 12,
  },
  messageUsername: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 4,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  showMoreButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  mentionsCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 24,
    padding: 16,
  },
});

export default HomeScreen; 