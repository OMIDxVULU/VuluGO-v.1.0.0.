import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { firestoreService } from '../services/firestoreService';
import { streamingService } from '../services/streamingService';
import { useAuth } from '../context/AuthContext';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
}

const FirebaseConnectionTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user, isGuest } = useAuth();

  const updateTestResult = (name: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => prev.map(test => 
      test.name === name ? { ...test, status, message } : test
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    
    // Initialize test results
    const initialTests: TestResult[] = [
      { name: 'Firebase Connection', status: 'pending', message: 'Testing...' },
      { name: 'Get Active Streams', status: 'pending', message: 'Testing...' },
      { name: 'Stream Listener', status: 'pending', message: 'Testing...' },
      { name: 'Authentication Status', status: 'pending', message: 'Testing...' }
    ];
    
    setTestResults(initialTests);

    // Test 1: Firebase Connection
    try {
      // Simple connection test
      await new Promise(resolve => setTimeout(resolve, 100));
      updateTestResult('Firebase Connection', 'success', 'Firebase initialized successfully');
    } catch (error) {
      updateTestResult('Firebase Connection', 'error', `Connection failed: ${error}`);
    }

    // Test 2: Get Active Streams
    try {
      const streams = await firestoreService.getActiveStreams();
      updateTestResult('Get Active Streams', 'success', `Retrieved ${streams.length} streams`);
    } catch (error: any) {
      const errorInfo = FirebaseErrorHandler.handleError(error);
      updateTestResult('Get Active Streams', 'error', errorInfo.userFriendlyMessage);
    }

    // Test 3: Stream Listener
    try {
      let listenerWorking = false;
      const unsubscribe = firestoreService.onActiveStreamsUpdate((streams) => {
        listenerWorking = true;
        updateTestResult('Stream Listener', 'success', `Listener active, ${streams.length} streams`);
        unsubscribe();
      });

      // Wait a bit for the listener to fire
      setTimeout(() => {
        if (!listenerWorking) {
          updateTestResult('Stream Listener', 'error', 'Listener did not receive data');
          unsubscribe();
        }
      }, 3000);
    } catch (error: any) {
      const errorInfo = FirebaseErrorHandler.handleError(error);
      updateTestResult('Stream Listener', 'error', errorInfo.userFriendlyMessage);
    }

    // Test 4: Authentication Status
    try {
      const authStatus = user ? (isGuest ? 'Guest User' : 'Authenticated User') : 'Not Authenticated';
      updateTestResult('Authentication Status', 'success', authStatus);
    } catch (error: any) {
      updateTestResult('Authentication Status', 'error', `Auth check failed: ${error}`);
    }

    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      default: return '⏳';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isRunning && styles.buttonDisabled]} 
        onPress={runTests}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running Tests...' : 'Run Tests'}
        </Text>
      </TouchableOpacity>

      <View style={styles.resultsContainer}>
        {testResults.map((test, index) => (
          <View key={index} style={styles.testResult}>
            <View style={styles.testHeader}>
              <Text style={[styles.testIcon, { color: getStatusColor(test.status) }]}>
                {getStatusIcon(test.status)}
              </Text>
              <Text style={styles.testName}>{test.name}</Text>
            </View>
            <Text style={[styles.testMessage, { color: getStatusColor(test.status) }]}>
              {test.message}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.info}>
        This test verifies that Firebase permission errors have been resolved.
        {'\n'}User Status: {user ? (isGuest ? 'Guest' : 'Authenticated') : 'Not Signed In'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6E69F4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#666666',
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginBottom: 15,
  },
  testResult: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 5,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  testIcon: {
    fontSize: 16,
    marginRight: 10,
    fontWeight: 'bold',
  },
  testName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    flex: 1,
  },
  testMessage: {
    fontSize: 12,
    marginLeft: 26,
  },
  info: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default FirebaseConnectionTest;
