import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import FirebaseErrorHandler from '../../utils/firebaseErrorHandler';
import authService from '../../services/authService';
import {
  validateEmail,
  validateUsername,
  validateDisplayName,
  validatePassword,
  validatePhoneNumber,
  validateDateOfBirth,
  signupRateLimiter,
} from '../../utils/inputSanitization';
import SocialAuthButtons from './SocialAuthButtons';
import {
  AuthContainer,
  AuthTitle,
  AuthInput,
  AuthButton,
  AuthLink,
  AuthColors,
  AuthTypography,
  AuthSpacing,
  AuthLayout,
} from './AuthDesignSystem';

interface SignupScreenProps {
  onSwitchToLogin: () => void;
  onSwitchToEmailVerification: (email: string) => void;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ onSwitchToLogin, onSwitchToEmailVerification }) => {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldValidation, setFieldValidation] = useState({
    email: false,
    displayName: false,
    username: false,
    password: false,
    phoneNumber: false,
    dateOfBirth: false,
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    displayName?: string;
    username?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    terms?: string;
  }>({});

  // Handle date of birth input with formatting
  const handleDateOfBirthChange = (text: string) => {
    // Remove all non-digit characters
    const digitsOnly = text.replace(/\D/g, '');

    // Limit to 8 digits (ddmmyyyy)
    const limitedDigits = digitsOnly.slice(0, 8);

    // Format with slashes
    let formatted = limitedDigits;
    if (limitedDigits.length >= 3) {
      formatted = limitedDigits.slice(0, 2) + '/' + limitedDigits.slice(2);
    }
    if (limitedDigits.length >= 5) {
      formatted = limitedDigits.slice(0, 2) + '/' + limitedDigits.slice(2, 4) + '/' + limitedDigits.slice(4);
    }

    setDateOfBirth(formatted);
  };

  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setBirthDate(selectedDate);
      const formattedDate = selectedDate.toLocaleDateString('en-GB'); // dd/mm/yyyy format
      setDateOfBirth(formattedDate);

      // Clear error when date is selected
      if (errors.dateOfBirth) {
        setErrors(prev => ({ ...prev, dateOfBirth: '' }));
      }
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  // Real-time validation functions
  const validateEmailRealTime = (emailValue: string) => {
    const emailValidation = validateEmail(emailValue);
    setFieldValidation(prev => ({ ...prev, email: emailValidation.isValid }));
    if (emailValidation.isValid && errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const validateDisplayNameRealTime = (nameValue: string) => {
    const nameValidation = validateDisplayName(nameValue);
    setFieldValidation(prev => ({ ...prev, displayName: nameValidation.isValid }));
    if (nameValidation.isValid && errors.displayName) {
      setErrors(prev => ({ ...prev, displayName: '' }));
    }
  };

  const validateUsernameRealTime = (usernameValue: string) => {
    const usernameValidation = validateUsername(usernameValue);
    setFieldValidation(prev => ({ ...prev, username: usernameValidation.isValid }));
    if (usernameValidation.isValid && errors.username) {
      setErrors(prev => ({ ...prev, username: '' }));
    }
  };

  const validatePasswordRealTime = (passwordValue: string) => {
    const passwordValidation = validatePassword(passwordValue);
    setFieldValidation(prev => ({ ...prev, password: passwordValidation.isValid }));
    if (passwordValidation.isValid && errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  // Form completion helpers
  const isFormValid = () => {
    return (
      fieldValidation.email &&
      fieldValidation.displayName &&
      fieldValidation.username &&
      fieldValidation.password &&
      phoneNumber.length > 0 &&
      dateOfBirth.length > 0 &&
      agreeToTerms
    );
  };

  const getFormCompletionText = () => {
    const completedFields = Object.values(fieldValidation).filter(Boolean).length;
    const totalFields = Object.keys(fieldValidation).length + 2; // +2 for phone and date
    const hasTerms = agreeToTerms ? 1 : 0;
    const totalCompleted = completedFields + (phoneNumber.length > 0 ? 1 : 0) + (dateOfBirth.length > 0 ? 1 : 0) + hasTerms;

    if (totalCompleted === totalFields) {
      return "Ready!";
    } else {
      return `${totalFields - totalCompleted} more field${totalFields - totalCompleted !== 1 ? 's' : ''}`;
    }
  };

  const getButtonTitle = () => {
    if (loading) return "Creating...";
    if (!isFormValid()) return "Complete Form";
    return "Create Account";
  };

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
      displayName?: string;
      username?: string;
      phoneNumber?: string;
      dateOfBirth?: string;
      terms?: string;
    } = {};

    // Email validation with enhanced security
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    // Password validation with enhanced security
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }

    // Display name validation with enhanced security
    const displayNameValidation = validateDisplayName(displayName);
    if (!displayNameValidation.isValid) {
      newErrors.displayName = displayNameValidation.error;
    }

    // Username validation with enhanced security
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      newErrors.username = usernameValidation.error;
    }

    // Phone number validation (only if provided)
    if (phoneNumber && phoneNumber.trim() !== '') {
      const phoneValidation = validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        newErrors.phoneNumber = phoneValidation.error;
      }
    }

    // Date of birth validation (only if provided)
    if (dateOfBirth && dateOfBirth.trim() !== '') {
      const dateValidation = validateDateOfBirth(dateOfBirth);
      if (!dateValidation.isValid) {
        newErrors.dateOfBirth = dateValidation.error;
      }
    }

    // Terms of service validation
    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    // Check rate limiting
    const emailValidation = validateEmail(email);
    const userIdentifier = emailValidation.sanitizedValue || email.trim().toLowerCase();

    if (!signupRateLimiter.isAllowed(userIdentifier)) {
      const remainingTime = Math.ceil(signupRateLimiter.getRemainingTime(userIdentifier) / 1000 / 60);
      Alert.alert(
        'Too Many Signup Attempts',
        `Please wait ${remainingTime} minutes before trying again`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim(), username.trim());

      // After successful signup, send verification email and switch to verification screen
      try {
        await authService.sendEmailVerification();
        onSwitchToEmailVerification(email.trim());
      } catch (verificationError: any) {
        // If verification email fails, still proceed but show warning
        console.warn('Failed to send verification email:', verificationError);
        Alert.alert(
          'Account Created',
          `Welcome to VuluGO, @${username}! We couldn't send a verification email right now, but you can verify your email later in account settings.`,
          [{ text: 'OK', onPress: () => router.replace('/(main)') }]
        );
      }
    } catch (error: any) {
      // Use enhanced Firebase error handling
      const errorInfo = FirebaseErrorHandler.formatAuthErrorForUI(error);

      // Check if we should switch to login mode
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          errorInfo.title,
          errorInfo.message,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In Instead',
              onPress: () => onSwitchToLogin()
            }
          ]
        );
      } else {
        Alert.alert(errorInfo.title, errorInfo.message);
      }

      // Log the error for debugging (without PII)
      FirebaseErrorHandler.logError('signup', error, {
        emailDomain: email ? email.trim().split('@')[1] : undefined,
        usernameLength: username ? username.trim().length : 0,
        hasPhoneNumber: !!phoneNumber.trim(),
        hasDateOfBirth: !!dateOfBirth.trim()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            // CRITICAL FIX: Ensure scroll view doesn't interfere with input touches
            nestedScrollEnabled={false}
            scrollEnabled={true}
            // CRITICAL FIX: Ensure touch events reach inputs properly
            keyboardDismissMode="none"
            automaticallyAdjustKeyboardInsets={false}
            // CRITICAL FIX: Prevent ScrollView from stealing focus
            removeClippedSubviews={false}
            bounces={false}
          >
            <AuthContainer>
              <View style={styles.titleContainer}>
                <Text style={AuthTypography.title}>Create account</Text>
              </View>

              <View style={styles.formContainer}>
                <AuthInput
                  label="EMAIL"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    validateEmailRealTime(text);
                  }}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  required
                  error={errors.email}
                  success={fieldValidation.email && email.length > 0}
                />

                <AuthInput
                  label="DISPLAY NAME"
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    validateDisplayNameRealTime(text);
                  }}
                  placeholder="Display name"
                  autoCapitalize="words"
                  required
                  error={errors.displayName}
                  success={fieldValidation.displayName && displayName.length > 0}
                />

                <AuthInput
                  label="USERNAME"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    validateUsernameRealTime(text);
                  }}
                  placeholder="Username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  required
                  error={errors.username}
                  success={fieldValidation.username && username.length > 0}
                />

                <AuthInput
                  label="PASSWORD"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    validatePasswordRealTime(text);
                  }}
                  placeholder="Password"
                  showPasswordToggle
                  isPasswordVisible={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  required
                  error={errors.password}
                  success={fieldValidation.password && password.length > 0}
                />

                <AuthInput
                  label="PHONE NUMBER"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="(555) 123-4567"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  error={errors.phoneNumber}
                />

                <TouchableOpacity
                  style={styles.datePickerContainer}
                  onPress={showDatePickerModal}
                >
                  <AuthInput
                    label="DATE OF BIRTH"
                    value={dateOfBirth || ''}
                    placeholder="Select your date of birth"
                    editable={false}
                    required
                    error={errors.dateOfBirth}
                  />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={birthDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDatePickerChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                  />
                )}
                </View>

                {/* Terms of Service Agreement */}
                <TouchableOpacity
                  style={styles.termsContainer}
                  onPress={() => setAgreeToTerms(!agreeToTerms)}
                  activeOpacity={0.7}
                >
                  <View style={styles.checkbox}>
                    <View style={[styles.checkboxBox, agreeToTerms && styles.checkboxChecked]}>
                      {agreeToTerms && (
                        <MaterialIcons name="check" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </View>

                  <View style={styles.termsText}>
                    <Text style={AuthTypography.bodyText}>
                      I agree to VuluGO's{' '}
                      <Text style={AuthTypography.linkText}>Terms of Service</Text>
                      {' '}and{' '}
                      <Text style={AuthTypography.linkText}>Privacy Policy</Text>
                    </Text>
                    {errors.terms && (
                      <Text style={styles.errorText}>{errors.terms}</Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Form Progress Indicator */}
                <View style={styles.progressContainer}>
                  <Text style={AuthTypography.helperText}>
                    {getFormCompletionText()}
                  </Text>
                </View>

                <AuthButton
                  title={getButtonTitle()}
                  onPress={handleSignup}
                  loading={loading}
                  disabled={loading || !isFormValid()}
                />

                <View style={styles.socialContainer}>
                  <SocialAuthButtons
                    disabled={loading}
                    onSuccess={() => {
                      setTimeout(() => {
                        router.replace('/(main)');
                      }, 1500);
                    }}
                  />
                </View>

                <AuthLink
                  text="Already have an account?"
                  linkText="Sign In"
                  onLinkPress={onSwitchToLogin}
                />
            </AuthContainer>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },

  // Safe area
  safeArea: {
    flex: 1,
  },

  // Keyboard avoiding view
  keyboardView: {
    flex: 1,
  },

  // Scroll view for better mobile experience
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: AuthSpacing.lg,
  },

  // Title container
  titleContainer: {
    marginBottom: AuthSpacing.xl,
    alignItems: 'center',
  },

  // Form container
  formContainer: {
    width: '100%',
    marginBottom: AuthSpacing.lg,
  },

  // Date picker container
  datePickerContainer: {
    width: '100%',
  },

  // Terms and conditions
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: AuthSpacing.lg,
    paddingHorizontal: AuthSpacing.sm,
  },

  checkbox: {
    marginRight: AuthSpacing.md,
    marginTop: 2,
  },

  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: AuthColors.inputBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: AuthColors.primary,
    borderColor: AuthColors.primary,
  },

  termsText: {
    flex: 1,
  },

  errorText: {
    ...AuthTypography.errorText,
    marginTop: AuthSpacing.xs,
  },

  // Progress container
  progressContainer: {
    marginBottom: AuthSpacing.lg,
    alignItems: 'center',
  },

  // Social container
  socialContainer: {
    marginTop: AuthSpacing.lg,
  },



});
export default SignupScreen;
