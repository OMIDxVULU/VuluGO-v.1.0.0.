/**
 * Debug Panel for Live Stream Refresh System
 * Shows refresh status, stream counts, and provides manual controls
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLiveStreams } from '../context/LiveStreamContext';
import { useLiveStreamRefresh } from '../hooks/useLiveStreamRefresh';

const RefreshDebugPanel: React.FC = () => {
  const { streams, isRefreshing: contextIsRefreshing, lastRefreshTime } = useLiveStreams();
  
  const {
    isRefreshing: hookIsRefreshing,
    refreshCount,
    manualRefresh,
    isAutoRefreshEnabled,
    nextRefreshIn,
    toggleAutoRefresh
  } = useLiveStreamRefresh({
    autoRefreshInterval: 5000,
    enableAutoRefresh: true,
    onRefreshStart: () => console.log('🔄 [DEBUG] Refresh started'),
    onRefreshComplete: (success) => console.log(`✅ [DEBUG] Refresh ${success ? 'completed' : 'failed'}`),
    onRefreshError: (error) => console.error('❌ [DEBUG] Refresh error:', error)
  });

  const handleManualRefresh = async () => {
    console.log('🔄 [DEBUG] Manual refresh button pressed');
    try {
      await manualRefresh();
    } catch (error) {
      console.error('❌ [DEBUG] Manual refresh failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔄 Refresh Debug Panel</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stream Status</Text>
        <Text style={styles.text}>Active Streams: {streams.length}</Text>
        <Text style={styles.text}>Context Refreshing: {contextIsRefreshing ? 'Yes' : 'No'}</Text>
        <Text style={styles.text}>Hook Refreshing: {hookIsRefreshing ? 'Yes' : 'No'}</Text>
        <Text style={styles.text}>Last Refresh: {lastRefreshTime ? lastRefreshTime.toLocaleTimeString() : 'Never'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auto-Refresh Status</Text>
        <Text style={styles.text}>Auto-Refresh: {isAutoRefreshEnabled ? 'Enabled' : 'Disabled'}</Text>
        <Text style={styles.text}>Next Refresh In: {nextRefreshIn}s</Text>
        <Text style={styles.text}>Refresh Count: {refreshCount}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.refreshButton]}
          onPress={handleManualRefresh}
          disabled={hookIsRefreshing}
        >
          <Text style={styles.buttonText}>
            {hookIsRefreshing ? 'Refreshing...' : 'Manual Refresh'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.toggleButton]}
          onPress={toggleAutoRefresh}
        >
          <Text style={styles.buttonText}>
            {isAutoRefreshEnabled ? 'Disable Auto' : 'Enable Auto'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stream List</Text>
        {streams.length === 0 ? (
          <Text style={styles.text}>No active streams</Text>
        ) : (
          streams.slice(0, 3).map((stream, index) => (
            <Text key={stream.id} style={styles.streamText}>
              {index + 1}. {stream.title} ({stream.views} viewers)
            </Text>
          ))
        )}
        {streams.length > 3 && (
          <Text style={styles.text}>... and {streams.length - 3} more</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#5865F2',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 4,
  },
  streamText: {
    color: '#b3b3b3',
    fontSize: 11,
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#5865F2',
  },
  toggleButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default RefreshDebugPanel;
