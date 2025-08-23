import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import DataValidator from '../utils/dataValidation';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
}

const GlobalChatValidationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user, isGuest } = useAuth();

  const updateTestResult = (name: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => prev.map(test => 
      test.name === name ? { ...test, status, message } : test
    ));
  };

  const runValidationTests = async () => {
    setIsRunning(true);
    
    const initialTests: TestResult[] = [
      { name: 'Data Validator - Valid Message', status: 'pending', message: 'Testing...' },
      { name: 'Data Validator - Invalid Message', status: 'pending', message: 'Testing...' },
      { name: 'Data Validator - User Auth', status: 'pending', message: 'Testing...' },
      { name: 'Data Validator - Safe Display Name', status: 'pending', message: 'Testing...' },
      { name: 'Data Validator - Safe Avatar URL', status: 'pending', message: 'Testing...' },
      { name: 'Firebase - Valid Message Send', status: 'pending', message: 'Testing...' },
      { name: 'Firebase - Invalid Message Handling', status: 'pending', message: 'Testing...' },
      { name: 'Error Handler - Validation Errors', status: 'pending', message: 'Testing...' }
    ];
    
    setTestResults(initialTests);

    // Test 1: Valid message validation
    try {
      const validMessage = {
        senderId: 'test-user-123',
        senderName: 'Test User',
        senderAvatar: 'https://example.com/avatar.jpg',
        text: 'This is a valid test message',
        type: 'text'
      };
      
      const result = DataValidator.validateGlobalChatMessage(validMessage);
      if (result.isValid && result.sanitizedData) {
        updateTestResult('Data Validator - Valid Message', 'success', 'Valid message passed validation');
      } else {
        updateTestResult('Data Validator - Valid Message', 'error', `Validation failed: ${result.errors.join(', ')}`);
      }
    } catch (error: any) {
      updateTestResult('Data Validator - Valid Message', 'error', `Test failed: ${error.message}`);
    }

    // Test 2: Invalid message validation
    try {
      const invalidMessage = {
        senderId: '',
        senderName: '',
        text: '',
        type: 'invalid'
      };
      
      const result = DataValidator.validateGlobalChatMessage(invalidMessage);
      if (!result.isValid && result.errors.length > 0) {
        updateTestResult('Data Validator - Invalid Message', 'success', `Correctly rejected invalid message: ${result.errors.length} errors`);
      } else {
        updateTestResult('Data Validator - Invalid Message', 'error', 'Should have rejected invalid message');
      }
    } catch (error: any) {
      updateTestResult('Data Validator - Invalid Message', 'error', `Test failed: ${error.message}`);
    }

    // Test 3: User authentication validation
    try {
      const validUser = { uid: 'test-123', displayName: 'Test User' };
      const invalidUser = null;
      
      const validResult = DataValidator.validateUserAuth(validUser);
      const invalidResult = DataValidator.validateUserAuth(invalidUser);
      
      if (validResult.isValid && !invalidResult.isValid) {
        updateTestResult('Data Validator - User Auth', 'success', 'User auth validation working correctly');
      } else {
        updateTestResult('Data Validator - User Auth', 'error', 'User auth validation failed');
      }
    } catch (error: any) {
      updateTestResult('Data Validator - User Auth', 'error', `Test failed: ${error.message}`);
    }

    // Test 4: Safe display name creation
    try {
      const userWithName = { displayName: 'John Doe' };
      const userWithEmail = { email: 'john@example.com' };
      const userWithNothing = {};
      
      const name1 = DataValidator.createSafeDisplayName(userWithName);
      const name2 = DataValidator.createSafeDisplayName(userWithEmail);
      const name3 = DataValidator.createSafeDisplayName(userWithNothing);
      
      if (name1 === 'John Doe' && name2 === 'john' && name3 === 'Anonymous') {
        updateTestResult('Data Validator - Safe Display Name', 'success', 'Display name creation working correctly');
      } else {
        updateTestResult('Data Validator - Safe Display Name', 'error', `Unexpected names: ${name1}, ${name2}, ${name3}`);
      }
    } catch (error: any) {
      updateTestResult('Data Validator - Safe Display Name', 'error', `Test failed: ${error.message}`);
    }

    // Test 5: Safe avatar URL creation
    try {
      const userWithAvatar = { photoURL: 'https://example.com/avatar.jpg' };
      const userWithInvalidAvatar = { photoURL: 'invalid-url' };
      const userWithoutAvatar = {};
      
      const avatar1 = DataValidator.createSafeAvatarUrl(userWithAvatar);
      const avatar2 = DataValidator.createSafeAvatarUrl(userWithInvalidAvatar);
      const avatar3 = DataValidator.createSafeAvatarUrl(userWithoutAvatar);
      
      if (avatar1 === 'https://example.com/avatar.jpg' && avatar2 === undefined && avatar3 === undefined) {
        updateTestResult('Data Validator - Safe Avatar URL', 'success', 'Avatar URL creation working correctly');
      } else {
        updateTestResult('Data Validator - Safe Avatar URL', 'error', `Unexpected avatars: ${avatar1}, ${avatar2}, ${avatar3}`);
      }
    } catch (error: any) {
      updateTestResult('Data Validator - Safe Avatar URL', 'error', `Test failed: ${error.message}`);
    }

    // Test 6: Firebase valid message send (only for authenticated users)
    try {
      if (!user || isGuest) {
        updateTestResult('Firebase - Valid Message Send', 'error', 'Authentication required - test skipped');
      } else {
        const testMessage = {
          senderId: user.uid,
          senderName: DataValidator.createSafeDisplayName(user),
          text: `Validation test message - ${new Date().toLocaleTimeString()}`,
          type: 'text' as const,
          senderAvatar: DataValidator.createSafeAvatarUrl(user)
        };
        
        const validation = DataValidator.validateGlobalChatMessage(testMessage);
        if (validation.isValid) {
          const messageId = await firestoreService.sendGlobalChatMessage(validation.sanitizedData!);
          updateTestResult('Firebase - Valid Message Send', 'success', `Message sent successfully: ${messageId.substring(0, 8)}...`);
        } else {
          updateTestResult('Firebase - Valid Message Send', 'error', `Validation failed: ${validation.errors.join(', ')}`);
        }
      }
    } catch (error: any) {
      updateTestResult('Firebase - Valid Message Send', 'error', `Send failed: ${error.message}`);
    }

    // Test 7: Firebase invalid message handling
    try {
      if (!user || isGuest) {
        updateTestResult('Firebase - Invalid Message Handling', 'error', 'Authentication required - test skipped');
      } else {
        const invalidMessage = {
          senderId: '',
          senderName: '',
          text: '',
          type: 'text' as const
        };
        
        try {
          await firestoreService.sendGlobalChatMessage(invalidMessage);
          updateTestResult('Firebase - Invalid Message Handling', 'error', 'Should have rejected invalid message');
        } catch (error: any) {
          if (error.message.includes('is required')) {
            updateTestResult('Firebase - Invalid Message Handling', 'success', 'Correctly rejected invalid message');
          } else {
            updateTestResult('Firebase - Invalid Message Handling', 'error', `Unexpected error: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      updateTestResult('Firebase - Invalid Message Handling', 'error', `Test failed: ${error.message}`);
    }

    // Test 8: Error handler validation
    try {
      const validationError = new Error('Sender ID is required');
      const firebaseError = { code: 'permission-denied', message: 'Access denied' };
      
      const validationResult = FirebaseErrorHandler.handleError(validationError);
      const firebaseResult = FirebaseErrorHandler.handleError(firebaseError);
      
      if (validationResult.code === 'validation-error' && firebaseResult.code === 'permission-denied') {
        updateTestResult('Error Handler - Validation Errors', 'success', 'Error handler correctly categorizes errors');
      } else {
        updateTestResult('Error Handler - Validation Errors', 'error', 'Error handler categorization failed');
      }
    } catch (error: any) {
      updateTestResult('Error Handler - Validation Errors', 'error', `Test failed: ${error.message}`);
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
      <Text style={styles.title}>Global Chat Validation Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isRunning && styles.buttonDisabled]} 
        onPress={runValidationTests}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running Tests...' : 'Run Validation Tests'}
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
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
      </ScrollView>

      <Text style={styles.info}>
        This test validates all data validation, Firebase operations, and error handling.
        {'\n'}User Status: {user ? (isGuest ? 'Guest' : 'Authenticated') : 'Not Signed In'}
        {'\n'}Some tests require authentication to run properly.
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
    maxHeight: 600,
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
    maxHeight: 300,
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
    fontSize: 12,
  },
  testMessage: {
    fontSize: 11,
    marginLeft: 26,
  },
  info: {
    color: '#CCCCCC',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default GlobalChatValidationTest;
