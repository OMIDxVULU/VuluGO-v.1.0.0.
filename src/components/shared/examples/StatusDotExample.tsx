import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusDot, StatusType } from '../';

const statuses: StatusType[] = [
  'online', 
  'busy', 
  'idle', 
  'offline', 
  'hosting', 
  'watching', 
  'spotlight'
];

const sizes = ['small', 'normal', 'large'] as const;
const positions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const;

/**
 * Example component demonstrating various usages of StatusDot
 * For development and documentation purposes
 */
const StatusDotExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>StatusDot Examples</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status Types</Text>
        <View style={styles.row}>
          {statuses.map(status => (
            <View key={status} style={styles.example}>
              <View style={styles.dotContainer}>
                <View style={styles.placeholderCircle} />
                <StatusDot status={status} size="normal" />
              </View>
              <Text style={styles.label}>{status}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sizes</Text>
        <View style={styles.row}>
          {sizes.map(size => (
            <View key={size} style={styles.example}>
              <View style={styles.dotContainer}>
                <View style={styles.placeholderCircle} />
                <StatusDot status="online" size={size} />
              </View>
              <Text style={styles.label}>{size}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Positions</Text>
        <View style={styles.row}>
          {positions.map(position => (
            <View key={position} style={styles.example}>
              <View style={styles.dotContainer}>
                <View style={styles.placeholderCircle} />
                <StatusDot status="online" position={position} />
              </View>
              <Text style={styles.label}>{position}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Styling</Text>
        <View style={styles.row}>
          <View style={styles.example}>
            <View style={styles.dotContainer}>
              <View style={styles.placeholderCircle} />
              <StatusDot 
                status="online" 
                size="large"
                borderWidth={4}
                borderColor="#000000"
              />
            </View>
            <Text style={styles.label}>Custom border</Text>
          </View>
          
          <View style={styles.example}>
            <View style={styles.dotContainer}>
              <View style={styles.placeholderCircle} />
              <StatusDot 
                status="busy" 
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                  transform: [{ scale: 1.2 }],
                }}
              />
            </View>
            <Text style={styles.label}>Custom styles</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#131318',
    padding: 16,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  example: {
    marginRight: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  dotContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  placeholderCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2D2E38',
  },
  label: {
    fontSize: 12,
    color: '#9BA1A6',
    marginTop: 4,
  },
});

export default StatusDotExample; 