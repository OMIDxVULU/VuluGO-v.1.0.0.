import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PersonGroupIcon from './PersonGroupIcon';

const PersonGroupIconExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Person Group Icon Examples</Text>
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Text style={styles.label}>Default</Text>
          <PersonGroupIcon />
        </View>
        
        <View style={styles.iconContainer}>
          <Text style={styles.label}>Custom Size</Text>
          <PersonGroupIcon 
            size={45}
          />
        </View>
        
        <View style={styles.iconContainer}>
          <Text style={styles.label}>Custom Colors</Text>
          <PersonGroupIcon 
            primaryColor="#FF5722"
            secondaryColor="#FF9800"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 10,
  }
});

export default PersonGroupIconExample; 