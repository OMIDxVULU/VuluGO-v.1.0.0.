import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import SpotlightProgressBar, { DurationCategory } from './SpotlightProgressBar';

const SpotlightDurationDemo = () => {
  const [progress, setProgress] = useState(0.8);

  // Decrease progress on press to demonstrate animation
  const handleProgressDecrease = () => {
    setProgress(prev => Math.max(0, prev - 0.1));
  };

  // Reset progress
  const handleReset = () => {
    setProgress(0.8);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SpotlightProgressBar Duration Categories</Text>
      
      <View style={styles.demoContainer}>
        <Text style={styles.categoryLabel}>Short (2 minutes)</Text>
        <View style={styles.progressContainer}>
          <SpotlightProgressBar
            width={300}
            height={100}
            borderRadius={16}
            progress={progress}
            durationCategory="short"
          />
        </View>
      </View>
      
      <View style={styles.demoContainer}>
        <Text style={styles.categoryLabel}>Medium (5 minutes)</Text>
        <View style={styles.progressContainer}>
          <SpotlightProgressBar
            width={300}
            height={100}
            borderRadius={16}
            progress={progress}
            durationCategory="medium"
          />
        </View>
      </View>
      
      <View style={styles.demoContainer}>
        <Text style={styles.categoryLabel}>Long (10 minutes)</Text>
        <View style={styles.progressContainer}>
          <SpotlightProgressBar
            width={300}
            height={100}
            borderRadius={16}
            progress={progress}
            durationCategory="long"
          />
        </View>
      </View>
      
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.button} onPress={handleProgressDecrease}>
          <Text style={styles.buttonText}>Decrease Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1A1B22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 30,
    textAlign: 'center',
  },
  demoContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  progressContainer: {
    position: 'relative',
    height: 100,
    width: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SpotlightDurationDemo; 