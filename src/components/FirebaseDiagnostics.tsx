import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import FirebaseHealthCheck, { FirebaseHealthStatus, HealthCheckResult } from '../utils/firebaseHealthCheck';
import { getFirebaseStatus } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

const FirebaseDiagnostics: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<FirebaseHealthStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user, isGuest } = useAuth();

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const status = await FirebaseHealthCheck.runHealthCheck();
      setHealthStatus(status);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsRunning(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    runDiagnostics();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#4CAF50';
      case 'degraded': return '#FF9800';
      case 'unhealthy': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return 'check-circle';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'help';
    }
  };

  const renderServiceStatus = (service: HealthCheckResult) => (
    <View key={service.service} style={styles.serviceItem}>
      <View style={styles.serviceHeader}>
        <MaterialIcons 
          name={getStatusIcon(service.status)} 
          size={20} 
          color={getStatusColor(service.status)} 
        />
        <Text style={styles.serviceName}>{service.service}</Text>
        {service.responseTime && (
          <Text style={styles.responseTime}>{service.responseTime}ms</Text>
        )}
      </View>
      <Text style={[styles.serviceMessage, { color: getStatusColor(service.status) }]}>
        {service.message}
      </Text>
      {service.error && (
        <Text style={styles.errorDetails}>
          Error: {service.error.message || String(service.error)}
        </Text>
      )}
    </View>
  );

  const renderInitializationStatus = () => {
    const status = getFirebaseStatus();
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Firebase Initialization</Text>
        <View style={styles.initStatus}>
          <Text style={styles.initItem}>
            Attempted: {status.attempted ? '✅' : '❌'}
          </Text>
          <Text style={styles.initItem}>
            Initialized: {status.initialized ? '✅' : '❌'}
          </Text>
          {status.error && (
            <Text style={styles.errorText}>
              Error: {status.error.message}
            </Text>
          )}
        </View>
        
        <Text style={styles.subsectionTitle}>Services Status:</Text>
        <View style={styles.servicesGrid}>
          <Text style={[styles.serviceStatus, status.services.app && styles.serviceHealthy]}>
            App: {status.services.app ? '✅' : '❌'}
          </Text>
          <Text style={[styles.serviceStatus, status.services.auth && styles.serviceHealthy]}>
            Auth: {status.services.auth ? '✅' : '❌'}
          </Text>
          <Text style={[styles.serviceStatus, status.services.db && styles.serviceHealthy]}>
            Firestore: {status.services.db ? '✅' : '❌'}
          </Text>
          <Text style={[styles.serviceStatus, status.services.storage && styles.serviceHealthy]}>
            Storage: {status.services.storage ? '✅' : '❌'}
          </Text>
        </View>
      </View>
    );
  };

  const renderUserStatus = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Authentication Status</Text>
      <View style={styles.userInfo}>
        <Text style={styles.userItem}>
          User Type: {user ? (isGuest ? 'Guest' : 'Authenticated') : 'Not Signed In'}
        </Text>
        {user && (
          <>
            <Text style={styles.userItem}>
              User ID: {user.uid.substring(0, 12)}...
            </Text>
            {user.email && (
              <Text style={styles.userItem}>
                Email: {user.email}
              </Text>
            )}
            {user.displayName && (
              <Text style={styles.userItem}>
                Display Name: {user.displayName}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Firebase Diagnostics</Text>
        <TouchableOpacity 
          style={[styles.runButton, isRunning && styles.runButtonDisabled]} 
          onPress={runDiagnostics}
          disabled={isRunning}
        >
          <MaterialIcons 
            name={isRunning ? "hourglass-empty" : "refresh"} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running...' : 'Run Check'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderInitializationStatus()}
        {renderUserStatus()}

        {healthStatus && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overall Status</Text>
              <View style={styles.overallStatus}>
                <MaterialIcons 
                  name={getStatusIcon(healthStatus.overall)} 
                  size={24} 
                  color={getStatusColor(healthStatus.overall)} 
                />
                <Text style={[styles.overallStatusText, { color: getStatusColor(healthStatus.overall) }]}>
                  {healthStatus.overall.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.timestamp}>
                Last checked: {new Date(healthStatus.timestamp).toLocaleTimeString()}
              </Text>
              <View style={styles.summary}>
                <Text style={styles.summaryItem}>
                  ✅ Healthy: {healthStatus.summary.healthy}
                </Text>
                <Text style={styles.summaryItem}>
                  ⚠️ Degraded: {healthStatus.summary.degraded}
                </Text>
                <Text style={styles.summaryItem}>
                  ❌ Unhealthy: {healthStatus.summary.unhealthy}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Details</Text>
              {healthStatus.services.map(renderServiceStatus)}
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          <Text style={styles.troubleshootingText}>
            • If services are unhealthy, try restarting the app{'\n'}
            • Check your internet connection{'\n'}
            • Ensure Firebase rules are properly deployed{'\n'}
            • Clear app cache if issues persist{'\n'}
            • Contact support if problems continue
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6E69F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  runButtonDisabled: {
    backgroundColor: '#666',
  },
  runButtonText: {
    color: '#FFFFFF',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginTop: 12,
    marginBottom: 8,
  },
  initStatus: {
    marginBottom: 12,
  },
  initItem: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 4,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceStatus: {
    color: '#F44336',
    fontSize: 12,
    width: '48%',
    marginBottom: 4,
  },
  serviceHealthy: {
    color: '#4CAF50',
  },
  userInfo: {
    marginTop: 8,
  },
  userItem: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 4,
  },
  overallStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  overallStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
    marginBottom: 12,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  serviceItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 8,
  },
  responseTime: {
    color: '#999',
    fontSize: 12,
  },
  serviceMessage: {
    fontSize: 12,
    marginBottom: 4,
  },
  errorDetails: {
    color: '#FF6B6B',
    fontSize: 11,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  troubleshootingText: {
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default FirebaseDiagnostics;
