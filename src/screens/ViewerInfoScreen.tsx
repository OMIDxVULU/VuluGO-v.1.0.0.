import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import PersonGroupIcon from '../components/PersonGroupIcon';
import CommonHeader from '../components/CommonHeader';
import { useRouter } from 'expo-router';

const ViewerInfoScreen = () => {
  const router = useRouter();
  
  // Sample viewer data
  const viewers = [
    { type: 'active', count: 42, label: 'Active Viewers', description: 'Currently watching your content' },
    { type: 'total', count: 178, label: 'Total Viewers', description: 'Watched your content today' },
    { type: 'new', count: 15, label: 'New Viewers', description: 'First time audience members' },
  ];
  
  const handleGoBack = () => {
    router.back();
  };
  
  const handleManageAudience = () => {
    // Implement audience management functionality
    console.log('Manage audience clicked');
  };
  
  const renderCard = (item: typeof viewers[0], index: number) => {
    let iconColors = {
      primary: '#E358F2',
      secondary: '#E358F2',
    };
    
    // Different color schemes based on viewer type
    if (item.type === 'active') {
      iconColors = {
        primary: '#5865F2',
        secondary: '#5865F2',
      };
    } else if (item.type === 'new') {
      iconColors = {
        primary: '#00C2FF',
        secondary: '#00C2FF',
      };
    }
    
    return (
      <View key={index} style={styles.card}>
        <View style={styles.cardIconContainer}>
          <PersonGroupIcon 
            size={40}
            primaryColor={iconColors.primary}
            secondaryColor={iconColors.secondary}
          />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardCount}>{item.count}</Text>
          <Text style={styles.cardLabel}>{item.label}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };
  
  return (
    <LinearGradient
      colors={['#18191E', '#0C0C0F']}
      style={styles.container}
    >
      <CommonHeader 
        title="Audience Stats"
        leftIcon={{ name: "arrow-back", onPress: handleGoBack }}
        rightIcons={[
          { name: 'insights', onPress: () => console.log('Insights pressed') },
        ]}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.cardsContainer}>
          {viewers.map(renderCard)}
        </View>
        
        <TouchableOpacity style={styles.manageButton} onPress={handleManageAudience}>
          <Text style={styles.manageButtonText}>Manage Audience</Text>
          <MaterialIcons name="people" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18191E',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cardsContainer: {
    marginTop: 16,
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardCount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  manageButton: {
    backgroundColor: 'rgba(88, 101, 242, 0.2)',
    marginTop: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.5)',
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default ViewerInfoScreen; 