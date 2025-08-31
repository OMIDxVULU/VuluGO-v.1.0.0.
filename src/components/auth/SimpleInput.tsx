import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

interface SimpleInputProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export const SimpleInput: React.FC<SimpleInputProps> = ({
  label,
  error,
  required = false,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputFocused,
        error && styles.inputError,
      ]}>
        <TextInput
          style={styles.input}
          placeholderTextColor="#9AA3B2"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...textInputProps}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
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
    color: '#D1D5DB',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  required: {
    color: '#FF6B6B',
  },
  inputContainer: {
    backgroundColor: '#1e2230',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252A3A',
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputFocused: {
    borderColor: '#5865F2',
    shadowColor: '#5865F2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  input: {
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 8,
  },
});

export default SimpleInput;
