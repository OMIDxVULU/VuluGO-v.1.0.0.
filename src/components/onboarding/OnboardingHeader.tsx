import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthColors, AuthTypography } from '../auth/AuthDesignSystem';

interface OnboardingHeaderProps {
  title?: string;
  onBackPress?: () => void;
  onHelpPress?: () => void;
  showBackButton?: boolean;
  showHelpButton?: boolean;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  title,
  onBackPress,
  onHelpPress,
  showBackButton = true,
  showHelpButton = true,
}) => {
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        {/* Left: Back Arrow */}
        <View style={styles.leftSection}>
          {showBackButton && onBackPress && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onBackPress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={AuthColors.primaryText} 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Optional Title */}
        <View style={styles.centerSection}>
          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        {/* Right: Help Icon */}
        <View style={styles.rightSection}>
          {showHelpButton && onHelpPress && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onHelpPress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="help-circle-outline" 
                size={24} 
                color={AuthColors.primaryText} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AuthColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    width: 40,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  rightSection: {
    width: 40,
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: AuthColors.primaryText,
    textAlign: 'center',
  },
});

export default OnboardingHeader;
