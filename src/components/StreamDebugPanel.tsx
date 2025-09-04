import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLiveStreams } from '../context/LiveStreamContext';
import { cleanupOldStreams, cleanupAllStreams } from '../utils/cleanupStreams';
import { testStreamManagement } from '../utils/testStreamManagement';

/**
 * Debug panel for stream management - only for development
 * This component helps identify and clean up stale streams
 */
const StreamDebugPanel: React.FC = () => {
  const { streams } = useLiveStreams();
  const [isLoading, setIsLoading] = useState(false);

  const handleCleanupOldStreams = async () => {
    try {
      setIsLoading(true);
      const cleanedCount = await cleanupOldStreams();
      Alert.alert('Cleanup Complete', `Cleaned up ${cleanedCount} stale streams`);
    } catch (error) {
      console.error('Cleanup failed:', error);
      Alert.alert('Cleanup Failed', 'Failed to clean up streams. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanupAllStreams = async () => {
    Alert.alert(
      'Clean All Streams',
      'This will end ALL streams in the database. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const cleanedCount = await cleanupAllStreams();
              Alert.alert('Cleanup Complete', `Cleaned up ${cleanedCount} streams`);
            } catch (error) {
              console.error('Full cleanup failed:', error);
              Alert.alert('Cleanup Failed', 'Failed to clean up all streams. Check console for details.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleShowStreamDetails = () => {
    console.log('🔍 Current streams in context:', streams);

    // Show detailed analysis of each stream
    streams.forEach((stream, index) => {
      console.log(`Stream ${index + 1}:`, {
        id: stream.id,
        title: stream.title,
        hosts: stream.hosts.length,
        viewers: stream.viewers.length,
        totalViews: stream.views,
        isActive: stream.isActive,
        isEmpty: stream.hosts.length === 0 && stream.viewers.length === 0
      });
    });

    const emptyStreams = streams.filter(s => s.hosts.length === 0 && s.viewers.length === 0);

    Alert.alert(
      'Stream Details',
      `Found ${streams.length} streams (${emptyStreams.length} empty). Check console for details.`
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Stream Debug Panel</Text>
      <Text style={styles.info}>Streams in context: {streams.length}</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.infoButton]}
          onPress={handleShowStreamDetails}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Show Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.warningButton]}
          onPress={handleCleanupOldStreams}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Cleaning...' : 'Clean Old Streams'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleCleanupAllStreams}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Cleaning...' : 'Clean ALL Streams'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={() => testStreamManagement.runAllTests()}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Run All Tests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.specificTestButton]}
          onPress={() => testStreamManagement.testEmptyStreamVisibility()}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Empty Streams</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2D2E38',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    color: '#CCC',
    fontSize: 14,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  infoButton: {
    backgroundColor: '#5865F2',
  },
  warningButton: {
    backgroundColor: '#FFA500',
  },
  dangerButton: {
    backgroundColor: '#FF6B6B',
  },
  testButton: {
    backgroundColor: '#9B59B6',
  },
  specificTestButton: {
    backgroundColor: '#E67E22',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default StreamDebugPanel;
