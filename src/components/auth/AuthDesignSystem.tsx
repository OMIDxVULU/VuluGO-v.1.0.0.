import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Discord Dark Mode Design System (WCAG AA compliant)
export const AuthColors = {
  // Discord-inspired dark background colors
  backgroundGradient: ['#36393f', '#2f3136', '#202225'],
  background: '#0f1117', // Pure dark gray/black - app background
  cardBackground: '#151924', // Slightly lighter dark - panels/cards
  cardBackgroundLight: '#40444b',

  // Dark mode text colors
  primaryText: '#ffffff', // Headings - white
  secondaryText: '#D1D5DB', // Body - light gray
  labelText: '#8e9297',
  mutedText: '#9AA3B2', // Subtext/helper - muted gray

  // Discord button styling with new accent
  primaryButton: '#5865F2', // Vibrant indigo - Discord blurple
  primaryButtonGradient: ['#5865F2', '#4752c4'],
  primaryButtonHover: '#4752c4',
  secondaryButton: '#4f545c',
  secondaryButtonText: '#ffffff',

  // Discord-style interactive elements
  linkColor: '#00b0f4', // Discord link blue
  inputBackground: '#1e2230', // Darker input background for Discord style
  inputBorder: '#252A3A', // Subtle borders/dividers
  inputBorderFocus: '#5865F2', // Vibrant indigo focus with glow
  inputBorderError: '#ed4245',
  inputBorderSuccess: '#57f287',
  inputText: '#ffffff', // White input text

  // Dark mode status colors
  errorColor: '#ed4245',
  successColor: '#57f287',
  warningColor: '#fee75c',
  placeholderColor: '#9AA3B2', // Muted gray for placeholders

  // Dark mode shadows and elevation
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  shadowColorDark: 'rgba(0, 0, 0, 0.5)',

  // Additional UI elements
  divider: '#252A3A', // Subtle 1px line dividers
  overlay: 'rgba(0, 0, 0, 0.85)',

  // Discord accent colors
  online: '#57f287',
  idle: '#faa61a',
  dnd: '#ed4245',
  offline: '#747f8d',
};

// Discord Dark Mode Typography System
export const AuthTypography = {
  // Discord-style titles (24-28px, bold, white)
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: AuthColors.primaryText, // White
    textAlign: 'center' as const,
    letterSpacing: -0.3,
  },

  // Large titles for onboarding steps
  onboardingTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: AuthColors.primaryText, // White
    textAlign: 'center' as const,
    letterSpacing: -0.2,
  },

  // Body text (15-16px, light gray)
  bodyText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: AuthColors.secondaryText, // Light gray
    textAlign: 'center' as const,
    lineHeight: 22,
  },

  // Subtitle with Discord colors
  subtitle: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: AuthColors.secondaryText,
    textAlign: 'center' as const,
    marginTop: 8,
    lineHeight: 22,
  },

  // Microcopy (13px, muted gray)
  microcopy: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: AuthColors.mutedText, // Muted gray
    textAlign: 'center' as const,
    lineHeight: 18,
  },

  // Helper text for inputs
  helperText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: AuthColors.mutedText, // Muted gray
    marginTop: 4,
  },

  // Discord-style form labels (small uppercase with letter-spacing)
  label: {
    fontSize: 12, // Smaller for Discord style
    fontWeight: '600' as const,
    color: AuthColors.mutedText, // Muted gray for Discord style
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5, // Discord-style letter spacing
    marginBottom: 8,
  },

  // Floating labels for modern inputs
  floatingLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: AuthColors.labelText,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  // Button text with proper weight
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.25,
  },

  // Secondary button text
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AuthColors.secondaryButtonText,
    letterSpacing: 0.25,
  },

  // Link styling
  linkText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: AuthColors.linkColor,
  },

  // Small text for terms, etc.
  smallText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: AuthColors.secondaryText,
    lineHeight: 20,
  },

  // Input text styling
  inputText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: AuthColors.primaryText,
  },
};

// Modern Spacing System (8px grid)
export const AuthSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Layout constants for consistent design
export const AuthLayout = {
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  shadow: {
    sm: {
      shadowColor: AuthColors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: AuthColors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: AuthColors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  minTouchTarget: 44, // WCAG minimum touch target
};

// Auth Title Component
interface AuthTitleProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export const AuthTitle: React.FC<AuthTitleProps> = ({ title, subtitle, style }) => (
  <View style={[styles.titleContainer, style]}>
    <Text style={AuthTypography.title}>{title}</Text>
    {subtitle && <Text style={AuthTypography.subtitle}>{subtitle}</Text>}
  </View>
);

// Auth Input Component
interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  showPasswordToggle?: boolean;
  isPasswordVisible?: boolean;
  onTogglePassword?: () => void;
  containerStyle?: ViewStyle;
  loading?: boolean;
  success?: boolean;
  disabled?: boolean;
  required?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  error,
  showPasswordToggle = false,
  isPasswordVisible = false,
  onTogglePassword,
  containerStyle,
  loading = false,
  success = false,
  disabled = false,
  required = false,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  return (
    <View style={[styles.inputGroup, containerStyle]}>
      <Text style={AuthTypography.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity
        style={[
          styles.inputContainer,
          error && styles.inputError,
          success && styles.inputSuccess,
          disabled && styles.inputDisabled,
          isFocused && styles.inputFocus,
        ]}
        activeOpacity={1}
        onPress={() => {
          console.log('🔍 Input container pressed, focusing TextInput:', label);
          textInputRef.current?.focus();
        }}
        disabled={disabled || loading}
      >
        <TextInput
          ref={textInputRef}
          style={[styles.input, disabled && styles.inputTextDisabled]}
          placeholderTextColor={AuthColors.placeholderColor}
          secureTextEntry={showPasswordToggle && !isPasswordVisible}
          editable={!disabled && !loading}
          onFocus={(e) => {
            console.log('🔍 Input focused:', label, 'Event:', e.nativeEvent); // Enhanced debug log
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            console.log('🔍 Input blurred:', label, 'Event:', e.nativeEvent); // Enhanced debug log
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          onChangeText={(text) => {
            console.log('🔍 Input changed:', label, text.length, 'chars'); // Debug log
            textInputProps.onChangeText?.(text);
          }}
          onPressIn={(e) => {
            console.log('🔍 Input pressed:', label, 'Event:', e.nativeEvent); // Enhanced debug log
            textInputProps.onPressIn?.(e);
          }}
          onTouchStart={(e) => {
            console.log('🔍 Input touch started:', label, 'Event:', e.nativeEvent); // Enhanced debug
            textInputProps.onTouchStart?.(e);
          }}
          // CRITICAL FIXES for input responsiveness
          pointerEvents="auto"
          accessible={true}
          accessibilityLabel={label}
          accessibilityHint={`Enter your ${label.toLowerCase()}`}
          // Ensure keyboard appears
          keyboardType={textInputProps.keyboardType || 'default'}
          returnKeyType={textInputProps.returnKeyType || 'done'}
          autoComplete="off"
          // CRITICAL FIX: Ensure TextInput can be focused
          focusable={true}
          // CRITICAL FIX: Ensure TextInput is selectable and touchable
          selectTextOnFocus={false}
          // CRITICAL FIX: Prevent automatic blur
          blurOnSubmit={false}
          // Remove any conflicting props that might block input
          {...textInputProps}
        />

        {/* Right side icons - CRITICAL FIX: Prevent blocking touch events */}
        <View style={styles.inputRightContainer} pointerEvents="box-none">
          {loading && (
            <ActivityIndicator
              size="small"
              color={AuthColors.primaryButton}
              style={styles.inputIcon}
            />
          )}

          {success && !loading && (
            <MaterialIcons
              name="check-circle"
              size={20}
              color="#4CAF50"
              style={styles.inputIcon}
            />
          )}

          {showPasswordToggle && !loading && !success && (
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => {
                console.log('🔍 Password toggle pressed'); // Debug log
                onTogglePassword?.();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isPasswordVisible ? 'visibility' : 'visibility-off'}
                size={20}
                color={AuthColors.secondaryText}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// Auth Button Component
interface AuthButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'link';
  loading?: boolean;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  containerStyle,
  textStyle,
  disabled,
  ...touchableProps
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return [styles.primaryButton, disabled && styles.buttonDisabled];
      case 'secondary':
        return [styles.secondaryButton, disabled && styles.buttonDisabled];
      case 'link':
        return styles.linkButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return [AuthTypography.buttonText, textStyle];
      case 'secondary':
        return [AuthTypography.buttonText, { color: AuthColors.secondaryText }, textStyle];
      case 'link':
        return [AuthTypography.linkText, textStyle];
      default:
        return [AuthTypography.buttonText, textStyle];
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), containerStyle]}
      disabled={disabled || loading}
      {...touchableProps}
    >
      <Text style={getTextStyle()}>
        {loading ? 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
};

// Auth Link Component
interface AuthLinkProps extends TouchableOpacityProps {
  text: string;
  linkText: string;
  onLinkPress: () => void;
  containerStyle?: ViewStyle;
}

export const AuthLink: React.FC<AuthLinkProps> = ({
  text,
  linkText,
  onLinkPress,
  containerStyle,
  ...touchableProps
}) => (
  <View style={[styles.linkContainer, containerStyle]}>
    <Text style={AuthTypography.bodyText}>{text} </Text>
    <TouchableOpacity onPress={onLinkPress} {...touchableProps}>
      <Text style={AuthTypography.linkText}>{linkText}</Text>
    </TouchableOpacity>
  </View>
);

// Auth Container Component
interface AuthContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const AuthContainer: React.FC<AuthContainerProps> = ({ children, style }) => (
  <View style={[styles.container, style]}>
    <View style={styles.card}>
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  titleContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: AuthColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AuthColors.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    // CRITICAL FIX: Remove paddingHorizontal from container to prevent touch issues
  },
  inputFocus: {
    borderColor: AuthColors.inputBorderFocus,
    shadowColor: AuthColors.inputBorderFocus,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inputError: {
    borderColor: AuthColors.errorColor,
  },
  inputSuccess: {
    borderColor: '#4CAF50',
  },
  inputDisabled: {
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
    borderColor: 'rgba(142, 142, 147, 0.3)',
  },
  input: {
    flex: 1,
    color: AuthColors.primaryText,
    fontSize: 16,
    paddingVertical: 12,
    paddingLeft: 16, // CRITICAL FIX: Left padding for text
    paddingRight: 50, // REDUCED: Less padding to prevent touch area conflicts
    minHeight: 48, // CRITICAL FIX: Ensure minimum touch target size
    // CRITICAL FIX: Ensure TextInput receives all touch events
    width: '100%',
    // CRITICAL FIX: Ensure TextInput is touchable
    zIndex: 1,
  },
  inputTextDisabled: {
    color: 'rgba(142, 142, 147, 0.6)',
  },
  inputRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12, // REDUCED: Less padding to prevent overlap
    // CRITICAL FIX: Ensure right container doesn't block input touches
    position: 'absolute',
    right: 0,
    height: '100%',
    justifyContent: 'center',
    // CRITICAL FIX: Ensure icons don't interfere with TextInput touches
    zIndex: 2,
    width: 40, // FIXED WIDTH: Prevent expanding beyond necessary space
    // pointerEvents handled in JSX, not here
  },
  inputIcon: {
    marginRight: 8,
  },
  passwordToggle: {
    padding: 8, // INCREASED: Better touch target
    // CRITICAL FIX: Ensure password toggle is touchable
    zIndex: 3,
    pointerEvents: 'auto', // EXPLICIT: This button should receive touches
  },
  required: {
    color: AuthColors.errorColor,
  },
  errorText: {
    color: AuthColors.errorColor,
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: AuthColors.primaryButton,
    borderRadius: 14, // Discord-style rounded corners
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 8,
    minHeight: 48, // Discord-style button height
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: AuthColors.inputBorder,
  },
  linkButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
});
