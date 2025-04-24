import React from 'react';
import { SafeAreaView, StyleSheet, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import SpotlightDurationDemo from '../components/SpotlightDurationDemo';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import SpotlightProgressBar from '../components/SpotlightProgressBar';

const SpotlightDurationDemoScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spotlight Duration Demo</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>About Duration Categories</Text>
          <Text style={styles.infoText}>
            The SpotlightProgressBar now adapts its appearance based on the duration selected:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• <Text style={styles.highlight}>Short (2min)</Text>: Faster animation, blue hue</Text>
            <Text style={styles.featureItem}>• <Text style={styles.highlight}>Medium (5min)</Text>: Standard animation, purple hue</Text>
            <Text style={styles.featureItem}>• <Text style={styles.highlight}>Long (10min)</Text>: Slower animation, gold hue</Text>
          </View>
        </View>
        
        <SpotlightDurationDemo />
        
        {/* Direct test component */}
        <View style={{ marginTop: 30 }}>
          <Text style={styles.infoTitle}>Direct Test</Text>
          <View style={{ 
            width: 300, 
            height: 100, 
            backgroundColor: 'rgba(0,0,0,0.3)', 
            borderRadius: 16,
            position: 'relative',
            marginTop: 10,
          }}>
            <SpotlightProgressBar 
              width={300}
              height={100}
              borderRadius={16}
              progress={0.7}
              durationCategory="medium"
            />
            <View style={{ 
              position: 'absolute', 
              top: 0, left: 0, right: 0, bottom: 0,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Test Overlay</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B22',
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  infoContainer: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    margin: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 16,
    lineHeight: 20,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
    lineHeight: 20,
  },
  highlight: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SpotlightDurationDemoScreen; 