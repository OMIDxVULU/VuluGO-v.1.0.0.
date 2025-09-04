/**
 * Graceful Fallback Component
 * Provides fallback UI states for various error scenarios and offline modes
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Discord-inspired colors
const colors = {
  background: '#0f1117',
  cardBackground: '#151924',
  accent: '#5865F2',
  text: '#FFFFFF',
  textMuted: '#B9BBBE',
  textSecondary: '#72767D',
  error: '#ED4245',
  warning: '#FAA61A',
  success: '#3BA55C'
};

export interface GracefulFallbackProps {
  type: 'loading' | 'error' | 'offline' | 'empty' | 'maintenance' | 'permission' | 'network';
  title?: string;
  message?: string;
  icon?: string;
  showRetry?: boolean;
  showOfflineMode?: boolean;
  onRetry?: () => void;
  onOfflineMode?: () => void;
  customActions?: Array<{
    label: string;
    onPress: () => void;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
  style?: any;
}

export default function GracefulFallback({
  type,
  title,
  message,
  icon,
  showRetry = true,
  showOfflineMode = false,
  onRetry,
  onOfflineMode,
  customActions = [],
  style
}: GracefulFallbackProps) {
  
  const getFallbackConfig = () => {
    switch (type) {
      case 'loading':
        return {
          title: title || 'Loading...',
          message: message || 'Please wait while we load your content',
          icon: null,
          showSpinner: true,
          color: colors.accent
        };
        
      case 'error':
        return {
          title: title || 'Something went wrong',
          message: message || 'An unexpected error occurred. Please try again.',
          icon: icon || 'alert-circle',
          showSpinner: false,
          color: colors.error
        };
        
      case 'offline':
        return {
          title: title || 'You\'re offline',
          message: message || 'Check your internet connection and try again.',
          icon: icon || 'wifi-off',
          showSpinner: false,
          color: colors.warning
        };
        
      case 'empty':
        return {
          title: title || 'Nothing here yet',
          message: message || 'There\'s no content to display right now.',
          icon: icon || 'folder-open',
          showSpinner: false,
          color: colors.textSecondary
        };
        
      case 'maintenance':
        return {
          title: title || 'Under maintenance',
          message: message || 'We\'re making improvements. Please check back soon.',
          icon: icon || 'construct',
          showSpinner: false,
          color: colors.warning
        };
        
      case 'permission':
        return {
          title: title || 'Permission required',
          message: message || 'This feature requires additional permissions to work properly.',
          icon: icon || 'lock-closed',
          showSpinner: false,
          color: colors.warning
        };
        
      case 'network':
        return {
          title: title || 'Connection problem',
          message: message || 'Unable to connect to our servers. Please check your network.',
          icon: icon || 'cloud-offline',
          showSpinner: false,
          color: colors.error
        };
        
      default:
        return {
          title: title || 'Something happened',
          message: message || 'Please try again.',
          icon: icon || 'help-circle',
          showSpinner: false,
          color: colors.textSecondary
        };
    }
  };

  const config = getFallbackConfig();

  const renderIcon = () => {
    if (config.showSpinner) {
      return (
        <ActivityIndicator 
          size="large" 
          color={config.color} 
          style={styles.spinner}
        />
      );
    }

    if (config.icon) {
      return (
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
          <Ionicons 
            name={config.icon as any} 
            size={48} 
            color={config.color} 
          />
        </View>
      );
    }

    return null;
  };

  const renderActions = () => {
    const actions = [];

    // Add retry action
    if (showRetry && onRetry && !config.showSpinner) {
      actions.push({
        label: 'Try Again',
        onPress: onRetry,
        style: 'primary' as const
      });
    }

    // Add offline mode action
    if (showOfflineMode && onOfflineMode && type === 'offline') {
      actions.push({
        label: 'Use Offline Mode',
        onPress: onOfflineMode,
        style: 'secondary' as const
      });
    }

    // Add custom actions
    actions.push(...customActions);

    if (actions.length === 0) {
      return null;
    }

    return (
      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.actionButton,
              action.style === 'primary' && styles.primaryButton,
              action.style === 'secondary' && styles.secondaryButton,
              action.style === 'danger' && styles.dangerButton
            ]}
            onPress={action.onPress}
          >
            <Text
              style={[
                styles.actionButtonText,
                action.style === 'primary' && styles.primaryButtonText,
                action.style === 'secondary' && styles.secondaryButtonText,
                action.style === 'danger' && styles.dangerButtonText
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSpecialContent = () => {
    switch (type) {
      case 'maintenance':
        return (
          <View style={styles.specialContent}>
            <Text style={styles.specialText}>
              Expected completion: Soon
            </Text>
          </View>
        );
        
      case 'offline':
        return (
          <View style={styles.specialContent}>
            <Text style={styles.specialText}>
              Some features may be limited while offline
            </Text>
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        {renderIcon()}
        
        <Text style={styles.title}>{config.title}</Text>
        
        <Text style={styles.message}>{config.message}</Text>
        
        {renderSpecialContent()}
        
        {renderActions()}
      </View>
    </View>
  );
}

// Specific fallback components for common scenarios
export function LoadingFallback({ message, style }: { message?: string; style?: any }) {
  return (
    <GracefulFallback
      type="loading"
      message={message}
      style={style}
      showRetry={false}
    />
  );
}

export function ErrorFallback({ 
  title, 
  message, 
  onRetry, 
  style 
}: { 
  title?: string; 
  message?: string; 
  onRetry?: () => void; 
  style?: any;
}) {
  return (
    <GracefulFallback
      type="error"
      title={title}
      message={message}
      onRetry={onRetry}
      style={style}
    />
  );
}

export function OfflineFallback({ 
  onRetry, 
  onOfflineMode, 
  style 
}: { 
  onRetry?: () => void; 
  onOfflineMode?: () => void; 
  style?: any;
}) {
  return (
    <GracefulFallback
      type="offline"
      onRetry={onRetry}
      onOfflineMode={onOfflineMode}
      showOfflineMode={!!onOfflineMode}
      style={style}
    />
  );
}

export function EmptyFallback({ 
  title, 
  message, 
  actionLabel, 
  onAction, 
  style 
}: { 
  title?: string; 
  message?: string; 
  actionLabel?: string; 
  onAction?: () => void; 
  style?: any;
}) {
  return (
    <GracefulFallback
      type="empty"
      title={title}
      message={message}
      showRetry={false}
      customActions={onAction ? [{
        label: actionLabel || 'Get Started',
        onPress: onAction,
        style: 'primary'
      }] : []}
      style={style}
    />
  );
}

export function NetworkFallback({ 
  onRetry, 
  style 
}: { 
  onRetry?: () => void; 
  style?: any;
}) {
  return (
    <GracefulFallback
      type="network"
      onRetry={onRetry}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  specialContent: {
    marginBottom: 24,
  },
  specialText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: colors.text,
  },
  secondaryButtonText: {
    color: colors.textMuted,
  },
  dangerButtonText: {
    color: colors.text,
  },
});
