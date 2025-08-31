import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { AuthColors } from './AuthDesignSystem';
import { CountryCodeSelector, useCountrySelection } from './CountryCodeSelector';
import { Country } from '../../data/countries';
import {
  formatAsYouType,
  getPhoneNumberPlaceholder,
  validatePhoneNumber,
  getInternationalPhoneNumber,
  cleanPhoneNumber,
} from '../../utils/phoneNumberFormatter';

interface PhoneNumberInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (phoneNumber: string) => void;
  onCountryChange?: (country: Country) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  error?: string;
  label?: string;
  disabled?: boolean;
  style?: any;
  inputStyle?: any;
  showValidation?: boolean;
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChangeText,
  onCountryChange,
  onValidationChange,
  error,
  label = 'PHONE NUMBER',
  disabled = false,
  style,
  inputStyle,
  showValidation = true,
  ...textInputProps
}) => {
  const { selectedCountry, handleCountrySelect } = useCountrySelection();
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  // Initialize local value from prop
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  // Notify parent of initial country selection
  useEffect(() => {
    onCountryChange?.(selectedCountry);
  }, [selectedCountry, onCountryChange]);

  // Validate when component mounts or country changes
  useEffect(() => {
    if (showValidation && localValue && selectedCountry) {
      const cleaned = cleanPhoneNumber(localValue);
      if (cleaned) {
        const validation = validatePhoneNumber(cleaned, selectedCountry);
        onValidationChange?.(validation.isValid, validation.error);
      }
    }
  }, [selectedCountry, localValue, showValidation, onValidationChange]);

  // Handle country selection
  const onCountrySelect = (country: Country) => {
    handleCountrySelect(country);
    onCountryChange?.(country);
    
    // Clear and reformat the current number for the new country
    const cleaned = cleanPhoneNumber(localValue);
    const formatted = formatAsYouType(cleaned, '', country);
    setLocalValue(formatted);
    onChangeText(formatted);
    
    // Validate with new country
    if (showValidation && cleaned) {
      const validation = validatePhoneNumber(cleaned, country);
      onValidationChange?.(validation.isValid, validation.error);
    }
  };

  // Handle text input changes
  const handleTextChange = (text: string) => {
    const formatted = formatAsYouType(text, localValue, selectedCountry);
    setLocalValue(formatted);
    onChangeText(formatted);
    
    // Validate the phone number
    if (showValidation) {
      const cleaned = cleanPhoneNumber(formatted);
      if (cleaned) {
        const validation = validatePhoneNumber(cleaned, selectedCountry);
        onValidationChange?.(validation.isValid, validation.error);
      } else {
        onValidationChange?.(false, 'Phone number is required');
      }
    }
  };

  // Get placeholder text
  const placeholder = textInputProps.placeholder || getPhoneNumberPlaceholder(selectedCountry);

  // Get complete international phone number
  const getCompletePhoneNumber = () => {
    return getInternationalPhoneNumber(localValue, selectedCountry);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {label && (
        <Text style={styles.label}>{label} *</Text>
      )}
      
      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        disabled && styles.inputContainerDisabled,
      ]}>
        {/* Country Code Selector */}
        <CountryCodeSelector
          selectedCountry={selectedCountry}
          onCountrySelect={onCountrySelect}
          disabled={disabled}
          style={styles.countrySelector}
        />
        
        {/* Separator */}
        <View style={styles.separator} />
        
        {/* Phone Number Input */}
        <TextInput
          ref={textInputRef}
          style={[styles.textInput, inputStyle]}
          {...textInputProps}
          value={localValue}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={AuthColors.mutedText}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
        />
      </View>
      
      {/* Error Message */}
      {error && showValidation && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      {/* Helper Text */}
      {!error && (
        <Text style={styles.helperText}>
          We'll send you a verification code via SMS
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: AuthColors.mutedText,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: AuthColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AuthColors.inputBorder,
    minHeight: 48,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: AuthColors.inputBorderFocus,
    shadowColor: AuthColors.inputBorderFocus,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inputContainerError: {
    borderColor: AuthColors.inputBorderError,
  },
  inputContainerDisabled: {
    opacity: 0.5,
  },
  countrySelector: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    minWidth: 90,
  },
  separator: {
    width: 1,
    backgroundColor: AuthColors.inputBorder,
    marginVertical: 8,
  },
  textInput: {
    flex: 1,
    color: AuthColors.primaryText,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  errorText: {
    fontSize: 14,
    color: AuthColors.errorColor,
    marginTop: 8,
  },
  helperText: {
    fontSize: 14,
    color: AuthColors.mutedText,
    marginTop: 8,
  },
});

// Export utility functions for external use
export {
  getInternationalPhoneNumber,
  validatePhoneNumber,
  cleanPhoneNumber,
} from '../../utils/phoneNumberFormatter';

// Export country selection hook
export { useCountrySelection } from './CountryCodeSelector';
