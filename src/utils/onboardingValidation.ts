import { OnboardingData } from '../context/OnboardingContext';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

// Username validation
export const validateUsername = (username: string): ValidationResult => {
  if (!username.trim()) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 20) {
    return { isValid: false, error: 'Username must be less than 20 characters' };
  }
  
  // Check for valid characters (alphanumeric, underscore, hyphen)
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  // Check for reserved usernames
  const reservedUsernames = ['admin', 'root', 'user', 'guest', 'test', 'support', 'help'];
  if (reservedUsernames.includes(username.toLowerCase())) {
    return { isValid: false, error: 'This username is not available' };
  }
  
  return { isValid: true };
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' };
  }
  
  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: 'Password must contain at least one letter and one number' };
  }
  
  return { isValid: true };
};

// Age validation
export const validateAge = (dateOfBirth: Date | null): ValidationResult => {
  if (!dateOfBirth) {
    return { isValid: false, error: 'Date of birth is required' };
  }
  
  const today = new Date();
  const age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  // Adjust age if birthday hasn't occurred this year
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate()) 
    ? age - 1 
    : age;
  
  if (actualAge < 13) {
    return { isValid: false, error: 'You must be at least 13 years old to use this app' };
  }
  
  if (actualAge > 120) {
    return { isValid: false, error: 'Please enter a valid date of birth' };
  }
  
  return { isValid: true };
};

// Phone number validation
export const validatePhoneNumber = (phoneNumber: string): ValidationResult => {
  if (!phoneNumber.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' };
  }
  
  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number must be less than 15 digits' };
  }
  
  return { isValid: true };
};

// Verification code validation
export const validateVerificationCode = (code: string): ValidationResult => {
  if (!code.trim()) {
    return { isValid: false, error: 'Verification code is required' };
  }
  
  if (code.length !== 6) {
    return { isValid: false, error: 'Verification code must be 6 digits' };
  }
  
  if (!/^\d{6}$/.test(code)) {
    return { isValid: false, error: 'Verification code must contain only numbers' };
  }
  
  return { isValid: true };
};

// Terms acceptance validation
export const validateTermsAcceptance = (termsAccepted: boolean): ValidationResult => {
  if (!termsAccepted) {
    return { isValid: false, error: 'You must accept the terms and conditions to continue' };
  }
  
  return { isValid: true };
};

// Interests validation
export const validateInterests = (interests: string[]): ValidationResult => {
  if (interests.length === 0) {
    return { isValid: false, error: 'Please select at least one interest' };
  }
  
  if (interests.length > 10) {
    return { isValid: false, error: 'Please select no more than 10 interests' };
  }
  
  return { isValid: true };
};

// Step-specific validation
export const validateStep = (step: number, data: OnboardingData): ValidationResult => {
  switch (step) {
    case 1: // Welcome
      return { isValid: true };
      
    case 2: // Age Gate
      return validateAge(data.dateOfBirth);
      
    case 3: // Username
      return validateUsername(data.username);
      
    case 4: // Email
      return validateEmail(data.email);
      
    case 5: // Password
      return validatePassword(data.password);
      
    case 6: // Terms
      return validateTermsAcceptance(data.termsAccepted);
      
    case 7: // Permissions Intro
      return { isValid: true };
      
    case 8: // Notifications Permission
      return { isValid: true };
      
    case 9: // Avatar Picker
      return { isValid: true }; // Avatar is optional
      
    case 10: // Theme Choice
      return { isValid: true }; // Theme has default
      
    case 11: // Interests
      return validateInterests(data.interests);
      
    case 12: // Contacts Intro
      return { isValid: true };
      
    case 13: // Contacts Permission
      return { isValid: true };
      
    case 14: // Phone Intro
      return { isValid: true };
      
    case 15: // Phone Verification
      return validatePhoneNumber(data.phoneNumber);
      
    case 16: // Success
      return { isValid: true };
      
    case 17: // Home Handoff
      return { isValid: true };
      
    default:
      return { isValid: false, error: 'Invalid step' };
  }
};

// Complete onboarding validation
export const validateCompleteOnboarding = (data: OnboardingData): ValidationResult => {
  // Check all required fields
  const requiredValidations = [
    validateAge(data.dateOfBirth),
    validateUsername(data.username),
    validateEmail(data.email),
    validatePassword(data.password),
    validateTermsAcceptance(data.termsAccepted),
  ];
  
  for (const validation of requiredValidations) {
    if (!validation.isValid) {
      return validation;
    }
  }
  
  return { isValid: true };
};

// Username availability check (mock implementation)
export const checkUsernameAvailability = async (username: string): Promise<ValidationResult> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock unavailable usernames
  const unavailableUsernames = ['john', 'jane', 'admin', 'test', 'user123'];
  
  if (unavailableUsernames.includes(username.toLowerCase())) {
    return { isValid: false, error: 'This username is already taken' };
  }
  
  return { isValid: true };
};

// Email availability check (mock implementation)
export const checkEmailAvailability = async (email: string): Promise<ValidationResult> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Mock unavailable emails
  const unavailableEmails = ['test@example.com', 'admin@test.com'];
  
  if (unavailableEmails.includes(email.toLowerCase())) {
    return { isValid: false, error: 'An account with this email already exists' };
  }
  
  return { isValid: true };
};
