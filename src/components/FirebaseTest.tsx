import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const FirebaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Test Firebase connection
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setConnectionStatus('✅ Firebase Connected - User Logged In');
      } else {
        setUser(null);
        setConnectionStatus('✅ Firebase Connected - No User');
      }
    }, (error) => {
      setConnectionStatus(`❌ Firebase Error: ${error.message}`);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{connectionStatus}</Text>
      {user && (
        <Text style={styles.userInfo}>
          User: {user.email || user.displayName || user.uid}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    margin: 16,
  },
  status: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userInfo: {
    color: '#00FF00',
    fontSize: 12,
    marginTop: 8,
  },
});

export default FirebaseTest; 