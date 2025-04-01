import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, Pressable, Modal } from 'react-native';
import { Text, Avatar, Button, Badge, ProgressBar } from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

interface Stream {
  id: number;
  title: string;
  host: string;
  avatar: string;
  boost: number;
  views: number;
  rank: number;
  participants: number;
}

const LiveScreen = () => {
  const router = useRouter();
  const [spotlightModalVisible, setSpotlightModalVisible] = useState(false);
  const [inSpotlightQueue, setInSpotlightQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(2);
  
  // Timer state for the spotlight countdown
  const [remainingTime, setRemainingTime] = useState(261); // 4:21 in seconds
  const [percentage, setPercentage] = useState(65);
  const initialTime = useRef(261); // 4:21 in seconds (initial value)
  const timer = useRef<NodeJS.Timeout | null>(null);

  // Start the countdown animation when component mounts
  useEffect(() => {
    // Start the timer
    timer.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer.current!);
          return 0;
        }
        // Calculate new percentage based on remaining time
        const newPercentage = ((prev - 1) / initialTime.current) * 100;
        setPercentage(newPercentage);
        return prev - 1;
      });
    }, 1000);

    // Cleanup timer on unmount
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, []);
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Circular progress component for spotlight
  const CircularProgress = ({ percentage }: { percentage: number }) => {
    const size = 90; // Larger to accommodate thicker outline
    const strokeWidth = 4; // Thicker stroke
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <Svg width={size} height={size} style={styles.circularProgress}>
        <Circle
          stroke="#34C759" // Green color
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
        />
      </Svg>
    );
  };
  
  const renderSpotlightModal = () => {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={spotlightModalVisible}
        onRequestClose={() => setSpotlightModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Spotlight Duration</Text>
            <Text style={styles.modalSubtitle}>Choose how long to spotlight your profile</Text>
            
            <TouchableOpacity 
              style={styles.durationOption} 
              onPress={() => {
                setInSpotlightQueue(true);
                setSpotlightModalVisible(false);
              }}
            >
              <Text style={styles.durationOptionTime}>2 minutes</Text>
              <Text style={styles.durationOptionCoins}>Cost: 100 coins</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.durationOption}
              onPress={() => {
                setInSpotlightQueue(true);
                setSpotlightModalVisible(false);
              }}
            >
              <Text style={styles.durationOptionTime}>5 minutes</Text>
              <Text style={styles.durationOptionCoins}>Cost: 200 coins</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.durationOption}
              onPress={() => {
                setInSpotlightQueue(true);
                setSpotlightModalVisible(false);
              }}
            >
              <Text style={styles.durationOptionTime}>10 minutes</Text>
              <Text style={styles.durationOptionCoins}>Cost: 350 coins</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setSpotlightModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderSpotlightSection = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Spotlight</Text>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.spotlightScroll}
        >
          {/* Your profile - with popup options */}
          <View style={styles.spotlightUserContainer}>
            <TouchableOpacity 
              style={styles.spotlightStatusContainer}
              onPress={() => setSpotlightModalVisible(true)}
            >
              <View style={[styles.spotlightAvatarBorder, styles.statusYou]}>
                <View style={styles.spotlightAvatarInner}>
                  <Image 
                    source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
                    style={styles.spotlightAvatarImage} 
                  />
                </View>
              </View>
              {inSpotlightQueue && (
                <View style={styles.queuePosition}>
                  <Text style={styles.queuePositionText}>{queuePosition}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.spotlightUsername}>You</Text>
            {inSpotlightQueue && (
              <View style={styles.queueLabel}>
                <Text style={styles.queueLabelText}>Queue Position</Text>
              </View>
            )}
          </View>
          
          {/* Spotlighted user with circular progress */}
          <View style={styles.spotlightUserContainer}>
            <View style={styles.spotlightStatusContainer}>
              <CircularProgress percentage={percentage} />
              <View style={[styles.spotlightAvatarBorder, styles.statusSpotlight]}>
                <View style={styles.spotlightAvatarInner}>
                  <Image 
                    source={{ uri: 'https://randomuser.me/api/portraits/women/32.jpg' }} 
                    style={styles.spotlightAvatarImage} 
                  />
                </View>
              </View>
            </View>
            <Text style={styles.spotlightUsername}>Sophia</Text>
            <View style={styles.timeRemaining}>
              <Text style={styles.timeRemainingText}>{formatTime(remainingTime)}</Text>
            </View>
          </View>
          
          {/* Friend who is hosting - Red outline */}
          <View style={styles.spotlightUserContainer}>
            <View style={styles.spotlightStatusContainer}>
              <View style={[styles.spotlightAvatarBorder, styles.statusHosting]}>
                <View style={styles.spotlightAvatarInner}>
                  <Image 
                    source={{ uri: 'https://randomuser.me/api/portraits/men/43.jpg' }} 
                    style={styles.spotlightAvatarImage} 
                  />
                </View>
              </View>
            </View>
            <Text style={styles.spotlightUsername}>James</Text>
            <Text style={styles.spotlightStatus}>Hosting</Text>
          </View>
          
          {/* Friend who is watching - Blue outline */}
          <View style={styles.spotlightUserContainer}>
            <View style={styles.spotlightStatusContainer}>
              <View style={[styles.spotlightAvatarBorder, styles.statusWatching]}>
                <View style={styles.spotlightAvatarInner}>
                  <Image 
                    source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }} 
                    style={styles.spotlightAvatarImage} 
                  />
                </View>
              </View>
            </View>
            <Text style={styles.spotlightUsername}>Ella</Text>
            <Text style={styles.spotlightStatus}>Watching</Text>
          </View>
          
          {/* Another Friend who is watching - Blue outline */}
          <View style={styles.spotlightUserContainer}>
            <View style={styles.spotlightStatusContainer}>
              <View style={[styles.spotlightAvatarBorder, styles.statusWatching]}>
                <View style={styles.spotlightAvatarInner}>
                  <Image 
                    source={{ uri: 'https://randomuser.me/api/portraits/women/22.jpg' }} 
                    style={styles.spotlightAvatarImage} 
                  />
                </View>
              </View>
            </View>
            <Text style={styles.spotlightUsername}>Emma</Text>
            <Text style={styles.spotlightStatus}>Watching</Text>
          </View>
        </ScrollView>
        
        {renderSpotlightModal()}
      </View>
    );
  };

  const renderTournamentSection = () => {
    return (
      <View style={styles.section}>
        <View style={styles.tournamentContainer}>
          <LinearGradient
            colors={['#7A5C00', '#FFD700']}
            style={styles.tournamentContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.tournamentHeader}>
              <View style={styles.tournamentTitleContainer}>
                <MaterialIcons name="emoji-events" size={24} color="#FFFFFF" style={styles.tournamentIcon} />
                <Text style={styles.tournamentTitleText}>
                  Weekly Tournament 🏆
                </Text>
                <View style={[styles.tournamentStatus, styles.liveBadge]}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.tournamentInfo}>
              <View style={styles.tournamentInfoItem}>
                <Text style={styles.tournamentInfoLabel}>TIME REMAINING</Text>
                <Text style={styles.tournamentInfoValue}>03:24:15</Text>
              </View>
              
              <View style={styles.tournamentInfoItem}>
                <Text style={styles.tournamentInfoLabel}>PRIZE POOL</Text>
                <View style={styles.prizePoolContainer}>
                  <MaterialIcons name="monetization-on" size={18} color="#FFFFFF" />
                  <Text style={styles.prizePoolValue}>25,750</Text>
                </View>
              </View>
              
              <View style={styles.tournamentInfoItem}>
                <Text style={styles.tournamentInfoLabel}>PARTICIPANTS</Text>
                <Text style={styles.tournamentInfoValue}>307</Text>
              </View>
            </View>
            
            <ProgressBar 
              progress={0.65} 
              color="#FFFFFF" 
              style={styles.tournamentProgress} 
            />
            
            <View style={styles.tournamentFooter}>
              <View style={styles.entryFeeContainer}>
                <Text style={styles.entryFeeLabel}>Entry Fee:</Text>
                <Text style={styles.entryFeeAmount}>500</Text>
              </View>
              
              <TouchableOpacity style={styles.joinTournamentButton}>
                <Text style={styles.joinTournamentText}>Join Tournament</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const renderGlobalChatSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Text Channels</Text>
        <Pressable 
          style={styles.globalChatButton} 
          onPress={() => router.push('/chat')}
        >
          <View style={styles.chatButtonContent}>
            <MaterialIcons name="chat" size={24} color="#FFFFFF" style={styles.chatIcon} />
            <Text style={styles.chatButtonText}>Global chat</Text>
          </View>
          <View style={styles.chatNotificationBadge}>
            <Text style={styles.notificationText}>2</Text>
          </View>
        </Pressable>
      </View>
    );
  };

  const renderLivesSection = () => {
    const liveStreams: Stream[] = [
      {
        id: 1,
        title: 'Epic gameplay session! Join now!',
        host: 'ProGamer',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        boost: 600,
        views: 1500,
        rank: 1,
        participants: 120
      },
      {
        id: 2,
        title: 'Late night stream with friends',
        host: 'NightOwl',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        boost: 500,
        views: 1250,
        rank: 2,
        participants: 85
      },
      {
        id: 3,
        title: 'Competitive matchmaking!',
        host: 'ChampPlayer',
        avatar: 'https://randomuser.me/api/portraits/men/28.jpg',
        boost: 400,
        views: 1000,
        rank: 3,
        participants: 64
      },
      {
        id: 4,
        title: 'Casual gaming & chill vibes',
        host: 'RelaxedGamer',
        avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
        boost: 300,
        views: 750,
        rank: 4,
        participants: 42
      }
    ];
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lives</Text>
          <View style={styles.livesCounter}>
            <Text style={styles.livesCountText}>{liveStreams.length} streams</Text>
          </View>
        </View>
        
        <ScrollView>
          {liveStreams.map(stream => (
            <View key={stream.id} style={styles.streamCard}>
              <View style={styles.streamThumbnailContainer}>
                <View style={[
                  styles.rankBadge, 
                  stream.rank === 1 ? styles.firstRank : 
                  stream.rank === 2 ? styles.secondRank : 
                  stream.rank === 3 ? styles.thirdRank : null
                ]}>
                  <Text style={styles.rankText}>
                    {stream.rank === 1 ? '1st' : 
                     stream.rank === 2 ? '2nd' : 
                     stream.rank === 3 ? '3rd' : 
                     `${stream.rank}th`}
                  </Text>
                </View>
                
                <View style={styles.streamStatsOverlay}>
                  <View style={styles.streamStatRow}>
                    <MaterialIcons name="bolt" size={16} color="#FFD700" />
                    <Text style={styles.streamStatText}>{stream.boost}</Text>
                  </View>
                  
                  <View style={styles.streamStatRow}>
                    <MaterialIcons name="visibility" size={16} color="#FFFFFF" />
                    <Text style={styles.streamStatText}>{stream.views}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.streamInfoContainer}>
                <Text style={styles.streamTitle}>{stream.title}</Text>
                
                <View style={styles.streamHostContainer}>
                  <Image source={{ uri: stream.avatar }} style={styles.hostAvatar} />
                  <Text style={styles.hostName}>{stream.host}</Text>
                </View>
                
                <View style={styles.participantsContainer}>
                  {[...Array(3)].map((_, i) => (
                    <View key={i} style={styles.participantDot} />
                  ))}
                  <View style={styles.moreParticipants}>
                    <Text style={styles.moreParticipantsText}>+{stream.participants - 3}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#0F0F17', '#151522']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <MaterialIcons name="live-tv" size={24} color="#f25899" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Live</Text>
          </View>
          <TouchableOpacity>
            <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scrollView}>
          {renderSpotlightSection()}
          {renderTournamentSection()}
          {renderGlobalChatSection()}
          {renderLivesSection()}
        </ScrollView>
        
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.goLiveButton}>
            <LinearGradient
              colors={['#6E56F7', '#f25899']}
              style={styles.goLiveGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.goLiveText}>Go Live</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
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
  headerContent: {
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
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  
  // Spotlight Section
  spotlightScroll: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  spotlightUserContainer: {
    marginRight: 16,
    alignItems: 'center',
  },
  spotlightStatusContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  spotlightAvatarBorder: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  spotlightAvatarInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#1C1D23',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spotlightAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  spotlightBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(28, 29, 35, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSpotlight: {
    borderColor: '#34C759',
    borderWidth: 4,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  statusHosting: {
    borderColor: '#F23535',
    borderWidth: 4,
    shadowColor: '#F23535',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  statusWatching: {
    borderColor: '#0070FF',
    borderWidth: 4,
    shadowColor: '#0070FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  statusRegular: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
  },
  spotlightUsername: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
  timeRemaining: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timeRemainingText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  getSpotlightButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  getSpotlightGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Tournament Section
  tournamentContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  tournamentContent: {
    padding: 16,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tournamentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tournamentIcon: {
    marginRight: 8,
  },
  tournamentTitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  tournamentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  liveBadge: {
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tournamentInfo: {
    marginBottom: 16,
  },
  tournamentInfoItem: {
    marginBottom: 8,
  },
  tournamentInfoLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  tournamentInfoValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  prizePoolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prizePoolValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  tournamentProgress: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  tournamentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryFeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryFeeLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginRight: 4,
  },
  entryFeeAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  joinTournamentButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinTournamentText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Global Chat Section
  globalChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  chatButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatIcon: {
    marginRight: 12,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatNotificationBadge: {
    backgroundColor: '#F23535',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Lives Section
  livesCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  livesCountText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  streamCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  streamThumbnailContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#1C1D23',
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1,
  },
  firstRank: {
    backgroundColor: '#FFD700',
  },
  secondRank: {
    backgroundColor: '#A078F5',
  },
  thirdRank: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  streamStatsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  streamStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  streamStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  streamInfoContainer: {
    flex: 1,
    padding: 12,
  },
  streamTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  streamHostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  hostName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  moreParticipants: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  moreParticipantsText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  
  // Bottom Bar
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  goLiveButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  goLiveGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goLiveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  durationOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  durationOptionTime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  durationOptionCoins: {
    color: '#FFD700',
    fontSize: 14,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  
  // Circular progress
  circularProgress: {
    position: 'absolute',
    top: -4,
    left: -4,
    zIndex: 1,
  },
  
  // Additional Spotlight styles
  statusYou: {
    borderColor: '#34C759',
    borderWidth: 4,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  spotlightStatus: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Queue styles
  queuePosition: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queuePositionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  queueLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  queueLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default LiveScreen; 