import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthColors, AuthTypography } from '../auth/AuthDesignSystem';

// Base Input Component
interface OnboardingInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  maxLength?: number;
  editable?: boolean;
}

export const OnboardingInput: React.FC<OnboardingInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  autoCapitalize = 'none',
  keyboardType = 'default',
  maxLength,
  editable = true,
}) => {
  return (
    <View style={styles.inputContainer}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={[
        styles.inputWrapper,
        error && styles.inputWrapperError,
      ]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={AuthColors.placeholderColor}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
        />
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

// Password Input Component
interface OnboardingPasswordInputProps extends Omit<OnboardingInputProps, 'keyboardType'> {
  showStrengthIndicator?: boolean;
}

export const OnboardingPasswordInput: React.FC<OnboardingPasswordInputProps> = ({
  showStrengthIndicator = true,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const getPasswordStrength = (password: string) => {
    if (password.length < 4) return { strength: 'weak', color: AuthColors.errorColor };
    if (password.length < 8) return { strength: 'medium', color: AuthColors.warningColor };
    return { strength: 'strong', color: AuthColors.successColor };
  };

  const passwordStrength = getPasswordStrength(props.value);

  return (
    <View style={styles.inputContainer}>
      {props.label && (
        <Text style={styles.label}>{props.label}</Text>
      )}
      <View style={[
        styles.inputWrapper,
        props.error && styles.inputWrapperError,
      ]}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={AuthColors.placeholderColor}
          secureTextEntry={!isPasswordVisible}
          autoCapitalize="none"
          maxLength={props.maxLength}
        />
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPasswordVisible ? 'eye-off' : 'eye'}
            size={20}
            color={AuthColors.mutedText}
          />
        </TouchableOpacity>
      </View>
      {showStrengthIndicator && props.value.length > 0 && (
        <View style={styles.strengthContainer}>
          <View style={[styles.strengthBar, { backgroundColor: passwordStrength.color }]} />
          <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
            {passwordStrength.strength.toUpperCase()}
          </Text>
        </View>
      )}
      {props.error && (
        <Text style={styles.errorText}>{props.error}</Text>
      )}
      {props.helperText && !props.error && (
        <Text style={styles.helperText}>{props.helperText}</Text>
      )}
    </View>
  );
};

// Date Input Component (for Age Gate)
interface OnboardingDateInputProps {
  label?: string;
  date: Date;
  onDateChange: (date: Date) => void;
  error?: string;
  helperText?: string;
}

export const OnboardingDateInput: React.FC<OnboardingDateInputProps> = ({
  label,
  date,
  onDateChange,
  error,
  helperText,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return { day, month, year };
  };

  const { day, month, year } = formatDate(date);

  return (
    <View style={styles.inputContainer}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={styles.dateInputContainer}>
        <View style={[styles.dateInputWrapper, error && styles.inputWrapperError]}>
          <TextInput
            style={styles.dateInput}
            value={day}
            placeholder="DD"
            placeholderTextColor={AuthColors.placeholderColor}
            keyboardType="numeric"
            maxLength={2}
            editable={false}
          />
        </View>
        <Text style={styles.dateSeparator}>/</Text>
        <View style={[styles.dateInputWrapper, error && styles.inputWrapperError]}>
          <TextInput
            style={styles.dateInput}
            value={month}
            placeholder="MM"
            placeholderTextColor={AuthColors.placeholderColor}
            keyboardType="numeric"
            maxLength={2}
            editable={false}
          />
        </View>
        <Text style={styles.dateSeparator}>/</Text>
        <View style={[styles.dateInputWrapperYear, error && styles.inputWrapperError]}>
          <TextInput
            style={styles.dateInput}
            value={year}
            placeholder="YYYY"
            placeholderTextColor={AuthColors.placeholderColor}
            keyboardType="numeric"
            maxLength={4}
            editable={false}
          />
        </View>
      </View>
      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.datePickerButtonText}>Select Date</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowPicker(Platform.OS === 'ios');
            if (selectedDate) {
              onDateChange(selectedDate);
            }
          }}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13, // Helper/microcopy size
    fontWeight: '600',
    color: AuthColors.mutedText, // #9AA3B2 - muted gray
    marginBottom: 12, // Discord spacing between labels and inputs
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    backgroundColor: AuthColors.inputBackground, // #1e2230 - dark input background
    borderRadius: 8, // Slightly rounded for modern look
    borderWidth: 1,
    borderColor: AuthColors.inputBorder, // #252A3A - subtle border
    paddingHorizontal: 16,
    paddingVertical: 14, // Better touch target
    minHeight: 48, // Discord button height consistency
  },
  inputWrapperError: {
    borderColor: AuthColors.inputBorderError,
  },
  input: {
    fontSize: 16,
    color: AuthColors.inputText,
    fontWeight: '400',
  },
  passwordInput: {
    paddingRight: 40,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 12,
    padding: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  strengthBar: {
    height: 3,
    flex: 1,
    borderRadius: 1.5,
  },
  strengthText: {
    ...AuthTypography.microcopy,
    fontWeight: '600',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInputWrapper: {
    flex: 1,
    backgroundColor: AuthColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AuthColors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateInputWrapperYear: {
    flex: 1.5,
    backgroundColor: AuthColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AuthColors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateInput: {
    fontSize: 16,
    color: AuthColors.inputText,
    fontWeight: '400',
    textAlign: 'center',
  },
  dateSeparator: {
    fontSize: 16,
    color: AuthColors.mutedText,
    fontWeight: '400',
  },
  datePickerButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  datePickerButtonText: {
    ...AuthTypography.microcopy,
    color: AuthColors.primaryButton,
    textDecorationLine: 'underline',
  },
  errorText: {
    ...AuthTypography.helperText,
    color: AuthColors.errorColor,
    marginTop: 4,
  },
  helperText: {
    ...AuthTypography.helperText,
    marginTop: 4,
  },
});
