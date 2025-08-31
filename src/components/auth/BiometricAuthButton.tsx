import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

interface BiometricAuthButtonProps {
  onSuccess?: () => void;
  disabled?: boolean;
  style?: any;
}

export const BiometricAuthButton: React.FC<BiometricAuthButtonProps> = ({
  onSuccess,
  disabled = false,
  style,
}) => {
  const { 
    signInWithBiometrics, 
    isBiometricAuthAvailable, 
    getBiometricTypeDescription 
  } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric Authentication');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const available = await isBiometricAuthAvailable();
      setIsAvailable(available);
      
      if (available) {
        const type = await getBiometricTypeDescription();
        setBiometricType(type);
      }
    } catch (error) {
      console.warn('Error checking biometric availability:', error);
      setIsAvailable(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (disabled || loading || !isAvailable) return;

    setLoading(true);
    try {
      const success = await signInWithBiometrics();
      
      if (success) {
        Alert.alert('Success', 'Welcome back to VuluGO!');
        if (onSuccess) {
          onSuccess();
        } else {
          router.replace('/(main)');
        }
      } else {
        Alert.alert('Authentication Failed', 'Please try again or use your password.');
      }
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricType.toLowerCase().includes('face')) {
      return 'user-check';
    } else if (biometricType.toLowerCase().includes('touch') || biometricType.toLowerCase().includes('fingerprint')) {
      return 'fingerprint';
    } else {
      return 'shield';
    }
  };

  if (!isAvailable) {
    return null; // Don't show button if biometric auth is not available
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.button, disabled && styles.disabledButton]}
        onPress={handleBiometricAuth}
        disabled={disabled || loading}
      >
        <LinearGradient
          colors={loading ? ['#6E69F4', '#5865F2'] : ['#6E69F4', '#5865F2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingSpinner} />
              <Text style={styles.buttonText}>Authenticating...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Feather name={getBiometricIcon() as any} size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Sign in with {biometricType}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// Settings component for enabling/disabling biometric auth
interface BiometricSettingsProps {
  onToggle?: (enabled: boolean) => void;
}

export const BiometricSettings: React.FC<BiometricSettingsProps> = ({ onToggle }) => {
  const { 
    enableBiometricAuth, 
    disableBiometricAuth, 
    getBiometricTypeDescription,
    user,
    isGuest
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric Authentication');

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    let mounted = true;

    try {
      const type = await getBiometricTypeDescription();
      if (mounted) setBiometricType(type);

      // Check if biometric auth is currently enabled
      const isCurrentlyEnabled = await isBiometricAuthAvailable();
      if (mounted) setIsEnabled(isCurrentlyEnabled);
    } catch (error) {
      console.warn('Error checking biometric status:', error);
      if (mounted) setIsEnabled(false);
    }

    return () => {
      mounted = false;
    };
  };

  const handleToggle = async () => {
    if (loading || isGuest || !user) return;

    setLoading(true);
    try {
      if (isEnabled) {
        await disableBiometricAuth();
        setIsEnabled(false);
        Alert.alert('Disabled', `${biometricType} login has been disabled.`);
      } else {
        const success = await enableBiometricAuth();
        if (success) {
          setIsEnabled(true);
          Alert.alert('Enabled', `${biometricType} login has been enabled for faster sign-in.`);
        }
      }
      
      if (onToggle) {
        onToggle(!isEnabled);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update biometric settings.');
    } finally {
      setLoading(false);
    }
  };

  if (isGuest || !user) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.settingsContainer} onPress={handleToggle} disabled={loading}>
      <View style={styles.settingsContent}>
        <View style={styles.settingsIcon}>
          <Feather name="shield" size={20} color="#6E69F4" />
        </View>
        <View style={styles.settingsText}>
          <Text style={styles.settingsTitle}>{biometricType}</Text>
          <Text style={styles.settingsSubtitle}>
            {isEnabled ? 'Enabled for quick sign-in' : 'Enable for quick sign-in'}
          </Text>
        </View>
        <View style={styles.toggle}>
          <View style={[styles.toggleTrack, isEnabled && styles.toggleTrackActive]}>
            <View style={[styles.toggleThumb, isEnabled && styles.toggleThumbActive]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  button: {
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderTopColor: 'transparent',
    marginRight: 12,
  },
  settingsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  settingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(110, 105, 244, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingsSubtitle: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  toggle: {
    marginLeft: 12,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#6E69F4',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});

export default BiometricAuthButton;
