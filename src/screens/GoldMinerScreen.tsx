import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const GoldMinerScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="hardware" size={32} color="#FFD700" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Gold Miner</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.placeholderContainer}>
          <MaterialIcons name="hardware" size={80} color="#FFD700" style={styles.placeholderIcon} />
          <Text style={styles.placeholderTitle}>Gold Miner Game</Text>
          <Text style={styles.placeholderSubtitle}>Coming Soon</Text>
          <Text style={styles.placeholderDescription}>
            Mine for gold, upgrade your equipment, and compete with friends in this exciting mining adventure.
          </Text>
        </View>
      </View>
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderContainer: {
    alignItems: 'center',
    maxWidth: 300,
  },
  placeholderIcon: {
    marginBottom: 24,
    opacity: 0.8,
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 18,
    color: '#FFD700',
    marginBottom: 16,
    textAlign: 'center',
  },
  placeholderDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default GoldMinerScreen; 