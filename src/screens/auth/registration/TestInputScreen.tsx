import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

const TestInputScreen: React.FC = () => {
  const [testValue, setTestValue] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>INPUT TEST SCREEN</Text>
        
        {/* Test 1: Absolute minimal TextInput */}
        <View style={styles.testSection}>
          <Text style={styles.testLabel}>Test 1: Basic TextInput</Text>
          <TextInput
            style={styles.basicInput}
            value={testValue}
            onChangeText={setTestValue}
            placeholder="Type here to test..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Test 2: TextInput with container */}
        <View style={styles.testSection}>
          <Text style={styles.testLabel}>Test 2: TextInput with Container</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.containerInput}
              value={testValue}
              onChangeText={setTestValue}
              placeholder="Type here to test..."
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Test 3: TouchableOpacity test */}
        <View style={styles.testSection}>
          <Text style={styles.testLabel}>Test 3: TouchableOpacity</Text>
          <TouchableOpacity 
            style={styles.touchableTest}
            onPress={() => console.log('TouchableOpacity pressed!')}
          >
            <Text style={styles.touchableText}>Tap me to test touch events</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.debugText}>
          Current value: "{testValue}"
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1117',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
  },
  testSection: {
    marginBottom: 30,
  },
  testLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 10,
  },
  basicInput: {
    backgroundColor: '#1e2230',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252A3A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 48,
  },
  inputContainer: {
    backgroundColor: '#1e2230',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252A3A',
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  containerInput: {
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 12,
  },
  touchableTest: {
    backgroundColor: '#5865F2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchableText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  debugText: {
    fontSize: 14,
    color: '#9AA3B2',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default TestInputScreen;
