import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ScrollableContentContainer from '../components/ScrollableContentContainer';

// Use the router for navigation
const HomeScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Week');

  const renderEventWidget = () => {
    return (
      <View style={styles.tournamentContainer}>
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>Event</Text>
          
          <View style={styles.eventProgressTrack}>
            <View style={styles.eventProgressFill} />
          </View>
          
          <View style={styles.eventInfoGrid}>
            <View style={styles.eventInfoBox}>
              <Text style={styles.eventInfoValue}>00:23:06</Text>
              <Text style={styles.eventInfoLabel}>Time Left</Text>
            </View>
            
            <View style={styles.eventInfoBox}>
              <View style={styles.prizeContainer}>
                <View style={styles.eventCoinIcon} />
                <Text style={styles.eventInfoValue}>1350</Text>
              </View>
              <Text style={styles.eventInfoLabel}>Prize Pool</Text>
            </View>
            
            <View style={styles.eventInfoBox}>
              <Text style={styles.eventInfoValue}>7</Text>
              <Text style={styles.eventInfoLabel}>Entries</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.enterButton}>
            <Text style={styles.enterButtonText}>Enter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderGemsWidget = () => {
    return (
      <Card style={styles.gemsCard}>
        {/* Header with Gem+ badge and Buy button */}
        <View style={styles.gemsCardHeader}>
          <View style={styles.gemTitleContainer}>
            <Text style={styles.gemTitle}>Gems</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Gem+ Active</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.buyButton}>
            <Text style={styles.buyButtonText}>Buy</Text>
          </TouchableOpacity>
        </View>
        
        {/* Gems Counter Section */}
        <View style={styles.gemsCounterSection}>
          <View style={styles.dailyGemsContainer}>
            <View style={styles.dailyGemsHeader}>
              <Text style={styles.dailyGemsValue}>200</Text>
              <Text style={styles.dailyGemsLabel}>gems per day</Text>
            </View>
            <View style={styles.renewalContainer}>
              <Text style={styles.renewalLabel}>Renews in 3 days</Text>
            </View>
          </View>
        </View>
        
        {/* Available Balance - Highlighted Section */}
        <LinearGradient
          colors={['#272931', '#1E1F25']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceSection}
        >
          <Text style={styles.balanceSectionTitle}>Available Balance</Text>
          
          <View style={styles.balanceDisplay}>
            <LinearGradient
              colors={['#9C84EF', '#B768FB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gemIconBg}
            >
              <MaterialCommunityIcons name="diamond-stone" size={28} color="#FFFFFF" />
            </LinearGradient>
            
            <Text style={styles.balanceValue}>940</Text>
          </View>
        </LinearGradient>
      </Card>
    );
  };

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
        
        {/* Event Widget */}
        {renderEventWidget()}
        
        {/* Improved Gems Widget */}
        {renderGemsWidget()}
        
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
  // Event Widget Styles from LiveScreen
  tournamentContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1D1E26',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  eventContent: {
    padding: 12,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventProgressTrack: {
    height: 3,
    backgroundColor: '#2D2E38',
    borderRadius: 1.5,
    marginBottom: 14,
    overflow: 'hidden',
  },
  eventProgressFill: {
    height: '100%',
    width: '25%', // Adjust based on progress
    backgroundColor: '#FFD700',
    borderRadius: 1.5,
  },
  eventInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  eventInfoBox: {
    flex: 1,
    backgroundColor: '#2D2E38',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
    minHeight: 60,
  },
  prizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventCoinIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
    marginRight: 3,
  },
  eventInfoValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  eventInfoLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  enterButton: {
    backgroundColor: '#FFD700',
    borderRadius: 100,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterButtonText: {
    color: '#1D1E26',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // NEW Gems Widget Styles
  gemsCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  gemsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  gemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: '#B768FB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
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
  
  // Gems Counter Section
  gemsCounterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dailyGemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyGemsHeader: {
    flexDirection: 'column',
  },
  dailyGemsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dailyGemsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  renewalContainer: {
    backgroundColor: 'rgba(183, 104, 251, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  renewalLabel: {
    fontSize: 12,
    color: '#B768FB',
    fontWeight: 'bold',
  },
  
  // Balance Section (Highlighted)
  balanceSection: {
    padding: 16,
  },
  balanceSectionTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  balanceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gemIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  
  // Existing styles for Announcement and Mentions cards
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