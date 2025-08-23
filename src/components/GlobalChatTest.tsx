import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { firestoreService, GlobalChatMessage } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
}

const GlobalChatTest: React.FC = () => {
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
      { name: 'Get Global Chat Messages', status: 'pending', message: 'Testing...' },
      { name: 'Real-time Listener', status: 'pending', message: 'Testing...' },
      { name: 'Send Message (Auth Required)', status: 'pending', message: 'Testing...' },
      { name: 'Authentication Status', status: 'pending', message: 'Testing...' }
    ];
    
    setTestResults(initialTests);

    // Test 1: Get Global Chat Messages
    try {
      const messages = await firestoreService.getGlobalChatMessages(10);
      updateTestResult('Get Global Chat Messages', 'success', `Retrieved ${messages.length} messages`);
    } catch (error: any) {
      const errorInfo = FirebaseErrorHandler.handleError(error);
      updateTestResult('Get Global Chat Messages', 'error', errorInfo.userFriendlyMessage);
    }

    // Test 2: Real-time Listener
    try {
      // Only test listener for authenticated users to avoid permission errors
      if (!user || isGuest) {
        updateTestResult('Real-time Listener', 'error', 'Authentication required - test skipped for guest users');
      } else {
        let listenerWorking = false;
        const unsubscribe = firestoreService.onGlobalChatMessages((messages) => {
          listenerWorking = true;
          updateTestResult('Real-time Listener', 'success', `Listener active, ${messages.length} messages`);
          unsubscribe();
        });

        // Wait a bit for the listener to fire
        setTimeout(() => {
          if (!listenerWorking) {
            updateTestResult('Real-time Listener', 'error', 'Listener did not receive data');
            unsubscribe();
          }
        }, 3000);
      }
    } catch (error: any) {
      const errorInfo = FirebaseErrorHandler.handleError(error);
      updateTestResult('Real-time Listener', 'error', errorInfo.userFriendlyMessage);
    }

    // Test 3: Send Message (Auth Required)
    try {
      if (!user || isGuest) {
        updateTestResult('Send Message (Auth Required)', 'error', 'Authentication required - test skipped');
      } else {
        const testMessage = {
          senderId: user.uid,
          senderName: user.displayName || 'Test User',
          senderAvatar: user.photoURL || undefined,
          text: `Test message from Global Chat Test - ${new Date().toLocaleTimeString()}`,
          type: 'text' as const
        };
        
        const messageId = await firestoreService.sendGlobalChatMessage(testMessage);
        updateTestResult('Send Message (Auth Required)', 'success', `Message sent with ID: ${messageId.substring(0, 8)}...`);
      }
    } catch (error: any) {
      const errorInfo = FirebaseErrorHandler.handleError(error);
      updateTestResult('Send Message (Auth Required)', 'error', errorInfo.userFriendlyMessage);
    }

    // Test 4: Authentication Status
    try {
      const authStatus = user ? (isGuest ? 'Guest User' : 'Authenticated User') : 'Not Authenticated';
      const canSend = user && !isGuest ? 'Yes' : 'No';
      updateTestResult('Authentication Status', 'success', `${authStatus} - Can send messages: ${canSend}`);
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
      <Text style={styles.title}>Global Chat Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isRunning && styles.buttonDisabled]} 
        onPress={runTests}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running Tests...' : 'Test Global Chat'}
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
        This test verifies Global Chat functionality including Firebase integration, real-time updates, and authentication.
        {'\n'}User Status: {user ? (isGuest ? 'Guest' : 'Authenticated') : 'Not Signed In'}
        {'\n'}To test message sending, you need to be signed in as an authenticated user.
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

export default GlobalChatTest;
