import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import FirebaseErrorHandler from '../../utils/firebaseErrorHandler';

interface EmailVerificationBannerProps {
  style?: ViewStyle;
}

// Type guard to check if user is a guest user
const isGuestUser = (user: any): boolean => {
  return !!(user && typeof user === 'object' && 'isGuest' in user && user.isGuest === true);
};

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ style }) => {
  const { user, sendEmailVerification, isEmailVerified } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner if email is verified, user is guest, or banner is dismissed
  if (!user || isEmailVerified() || isGuestUser(user) || dismissed) {
    return null;
  }

  const handleSendVerification = async () => {
    setLoading(true);
    try {
      await sendEmailVerification();
      Alert.alert(
        'Verification Email Sent',
        `We've sent a verification email to ${user.email}. Please check your inbox and spam folder.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      const errorInfo = FirebaseErrorHandler.formatAuthErrorForUI(error);
      Alert.alert(errorInfo.title, errorInfo.message);
      
      FirebaseErrorHandler.logError('email_verification_banner', error, {
        email: user.email,
        userId: user.uid
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <MaterialIcons 
          name="warning" 
          size={20} 
          color="#FF9500" 
          style={styles.icon} 
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            Please verify {user.email} to secure your account
          </Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleSendVerification}
          disabled={loading}
        >
          <Text style={styles.verifyButtonText}>
            {loading ? 'Sending...' : 'Send Email'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="close" size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.2)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
});

export default EmailVerificationBanner;
