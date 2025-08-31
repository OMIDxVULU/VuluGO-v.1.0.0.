/**
 * Phone number formatting utilities
 * Handles formatting phone numbers based on country-specific patterns
 */

import { Country } from '../data/countries';

/**
 * Format phone number based on country format pattern
 */
export const formatPhoneNumber = (phoneNumber: string, country: Country): string => {
  if (!phoneNumber || !country.format) {
    return phoneNumber;
  }

  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  if (!digits) return '';

  // Apply country-specific formatting
  let formatted = '';
  let digitIndex = 0;
  
  for (let i = 0; i < country.format.length && digitIndex < digits.length; i++) {
    const formatChar = country.format[i];
    
    if (formatChar === '#') {
      // Replace # with actual digit
      formatted += digits[digitIndex];
      digitIndex++;
    } else {
      // Add formatting character (space, dash, parentheses, etc.)
      formatted += formatChar;
    }
  }
  
  // Add any remaining digits
  while (digitIndex < digits.length) {
    formatted += digits[digitIndex];
    digitIndex++;
  }
  
  return formatted;
};

/**
 * Remove formatting from phone number, keeping only digits
 */
export const cleanPhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/\D/g, '');
};

/**
 * Get the maximum length for a phone number based on country format
 */
export const getMaxPhoneLength = (country: Country): number => {
  if (!country.format) return 15; // Default max international length
  
  // Count # characters in format pattern
  return country.format.split('#').length - 1;
};

/**
 * Validate phone number format for a specific country
 */
export const validatePhoneNumber = (phoneNumber: string, country: Country): {
  isValid: boolean;
  error?: string;
} => {
  const cleaned = cleanPhoneNumber(phoneNumber);

  if (!cleaned) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Basic validation - all digits
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, error: 'Phone number must contain only digits' };
  }

  // Minimum length check
  if (cleaned.length < 7) {
    return { isValid: false, error: 'Phone number is too short' };
  }

  // If country has a specific format, validate against it
  if (country.format) {
    const expectedLength = country.format.split('#').length - 1;

    if (cleaned.length !== expectedLength) {
      return {
        isValid: false,
        error: `Phone number should be ${expectedLength} digits for ${country.name}`
      };
    }
  } else {
    // For countries without specific format, use reasonable bounds
    if (cleaned.length > 15) {
      return { isValid: false, error: 'Phone number is too long' };
    }

    // Country-specific validation for common cases
    if (country.iso2 === 'NO' && (cleaned.length < 8 || cleaned.length > 8)) {
      return { isValid: false, error: 'Norwegian phone numbers should be 8 digits' };
    }
  }

  return { isValid: true };
};

/**
 * Format phone number as user types (real-time formatting)
 */
export const formatAsYouType = (
  input: string, 
  previousValue: string, 
  country: Country
): string => {
  // Handle deletion - if input is shorter, allow it
  if (input.length < previousValue.length) {
    const cleaned = cleanPhoneNumber(input);
    return formatPhoneNumber(cleaned, country);
  }
  
  // For new input, format normally
  const cleaned = cleanPhoneNumber(input);
  const maxLength = getMaxPhoneLength(country);
  
  // Limit to max length
  if (cleaned.length > maxLength) {
    return previousValue; // Don't allow more digits
  }
  
  return formatPhoneNumber(cleaned, country);
};

/**
 * Get complete international phone number
 */
export const getInternationalPhoneNumber = (
  phoneNumber: string, 
  country: Country
): string => {
  const cleaned = cleanPhoneNumber(phoneNumber);
  if (!cleaned) return '';
  
  return `${country.dialCode}${cleaned}`;
};

/**
 * Parse international phone number to extract country and local number
 */
export const parseInternationalPhoneNumber = (
  internationalNumber: string
): { country?: Country; localNumber: string } => {
  if (!internationalNumber.startsWith('+')) {
    return { localNumber: internationalNumber };
  }
  
  // Try to match against known country codes
  // Sort by dial code length (longest first) to match more specific codes first
  const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  
  for (const country of sortedCountries) {
    if (internationalNumber.startsWith(country.dialCode)) {
      const localNumber = internationalNumber.substring(country.dialCode.length);
      return { country, localNumber };
    }
  }
  
  return { localNumber: internationalNumber };
};

// Import countries for parsing
import { COUNTRIES } from '../data/countries';

/**
 * Get placeholder text for phone input based on country
 */
export const getPhoneNumberPlaceholder = (country: Country): string => {
  if (country.format) {
    // Replace # with example digits
    let placeholder = country.format;
    const exampleDigits = '1234567890';
    let digitIndex = 0;
    
    placeholder = placeholder.replace(/#/g, () => {
      const digit = exampleDigits[digitIndex % exampleDigits.length];
      digitIndex++;
      return digit;
    });
    
    return placeholder;
  }
  
  // Default placeholder
  return 'Enter phone number';
};

/**
 * Check if phone number is complete based on country format
 */
export const isPhoneNumberComplete = (phoneNumber: string, country: Country, allowedShortfall: number = 0): boolean => {
  const cleaned = cleanPhoneNumber(phoneNumber);
  const maxLength = getMaxPhoneLength(country);
  const minLength = Math.max(7, maxLength - allowedShortfall); // Minimum 7 digits, or maxLength minus allowed shortfall

  // Consider complete if it meets the minimum length requirement
  return cleaned.length >= minLength && cleaned.length <= maxLength;
};

/**
 * Get cursor position after formatting
 * Useful for maintaining cursor position during real-time formatting
 */
export const getCursorPosition = (
  oldValue: string,
  newValue: string,
  oldCursorPos: number
): number => {
  // Simple approach: try to maintain relative position
  const oldLength = oldValue.length;
  const newLength = newValue.length;
  
  if (oldLength === 0) return newLength;
  
  const ratio = newLength / oldLength;
  return Math.min(Math.round(oldCursorPos * ratio), newLength);
};
