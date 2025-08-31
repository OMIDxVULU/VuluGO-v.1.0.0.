import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthColors } from './AuthDesignSystem';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  submessage?: string;
  type?: 'loading' | 'success' | 'error';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  visible, 
  message = 'Loading...', 
  submessage,
  type = 'loading' 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <MaterialIcons name="check-circle" size={48} color="#4CAF50" />;
      case 'error':
        return <MaterialIcons name="error" size={48} color="#F44336" />;
      default:
        return <ActivityIndicator size="large" color={AuthColors.primaryButton} />;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      default:
        return AuthColors.primaryButton;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <BlurView intensity={20} style={styles.overlay}>
        <View style={styles.container}>
          <View style={[styles.content, { borderColor: getIconColor() }]}>
            <View style={styles.iconContainer}>
              {getIcon()}
            </View>
            
            <Text style={styles.message}>{message}</Text>
            
            {submessage && (
              <Text style={styles.submessage}>{submessage}</Text>
            )}
            
            {type === 'loading' && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={styles.progressFill} />
                </View>
              </View>
            )}
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'rgba(39, 41, 49, 0.95)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    maxWidth: 300,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  submessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AuthColors.primaryButton,
    borderRadius: 2,
    width: '100%',
    opacity: 0.8,
  },
});

export default LoadingOverlay;
