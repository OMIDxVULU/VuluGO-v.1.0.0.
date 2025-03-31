import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

const ProfileScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          {/* Placeholder for profile image */}
          <View style={styles.profileImage}>
            <MaterialIcons name="person" size={60} color="#AAAAAA" />
          </View>
          <View style={styles.statusIndicator} />
        </View>
        
        <Text style={styles.username}>Username</Text>
        <Text style={styles.memberSince}>VULU MEMBER SINCE FEB 2023</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Gold</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          style={styles.editButton}
          labelStyle={styles.buttonLabel}
          onPress={() => console.log('Edit profile')}
        >
          Edit Profile
        </Button>
      </View>
      
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.emptyState}>
          <MaterialIcons name="history" size={40} color="#5865F2" />
          <Text style={styles.emptyStateText}>No recent activity</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1D23',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2D35',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2C2D35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5865F2',
  },
  statusIndicator: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7ADA72',
    borderWidth: 2,
    borderColor: '#1C1D23',
    bottom: 5,
    right: 5,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: '#9597A3',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#8F8F8F',
  },
  buttonContainer: {
    padding: 20,
  },
  editButton: {
    backgroundColor: '#5865F2',
    paddingVertical: 6,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8F8F8F',
    marginTop: 12,
  },
});

export default ProfileScreen; 