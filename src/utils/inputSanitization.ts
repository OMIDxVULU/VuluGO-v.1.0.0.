/**
 * Input sanitization and validation utilities for authentication
 */

// Email validation regex (RFC 5322 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Username validation regex (alphanumeric, underscores, hyphens, 3-30 chars)
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

// Phone number validation regex (international format)
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

// Date validation regex (DD/MM/YYYY)
const DATE_REGEX = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

// Display name validation regex (letters, spaces, hyphens, apostrophes, 2-50 chars)
const DISPLAY_NAME_REGEX = /^[a-zA-Z\s'-]{2,50}$/;

// Common SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(--|\/\*|\*\/|;|'|"|`)/,
  /(\bOR\b|\bAND\b).*[=<>]/i,
  /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/i,
];

// XSS patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]+src[^>]*>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
];

// Comprehensive profanity filter with secure word loading
class ProfanityFilter {
  private profanityWords: Set<string>;
  private patterns: RegExp[];
  private leetMap: Record<string, string[]>;

  constructor() {
    // Initialize with basic non-offensive words for testing
    // In production, load from secure external source
    this.profanityWords = this.loadProfanityWords();

    // Define leet speak substitution map
    this.leetMap = {
      'a': ['a', 'A', '@', '4'],
      'e': ['e', 'E', '3'],
      'i': ['i', 'I', '1', '!'],
      'o': ['o', 'O', '0'],
      's': ['s', 'S', '$', '5'],
      't': ['t', 'T', '7'],
      'l': ['l', 'L', '1'],
      'g': ['g', 'G', '9'],
      'h': ['h', 'H', '#'],
      'b': ['b', 'B', '6'],
      'z': ['z', 'Z', '2']
    };

    // Create patterns for variations with improved precision
    this.patterns = Array.from(this.profanityWords).map(word => {
      return this.createPrecisePattern(word);
    });
  }

  // Load profanity words from secure source (placeholder implementation)
  private loadProfanityWords(): Set<string> {
    // In production, this should load from:
    // 1. External config file (not in source control)
    // 2. Secure API endpoint
    // 3. Encrypted configuration
    // 4. Third-party profanity filter library

    // For now, use minimal test words
    return new Set([
      'badword', 'testprofanity', 'inappropriate'
    ]);
  }

  // Create precise pattern that avoids false positives
  private createPrecisePattern(word: string): RegExp {
    const patternParts = word.split('').map(char => {
      const lowerChar = char.toLowerCase();
      if (this.leetMap[lowerChar]) {
        // Use specific substitutions for this character
        return `[${this.leetMap[lowerChar].join('')}]`;
      } else {
        // Allow case variations only
        return `[${char.toLowerCase()}${char.toUpperCase()}]`;
      }
    });

    // Join with optional single separator (not unlimited)
    const pattern = patternParts.join('[^\\w]?');

    // Use precise word boundaries with lookarounds
    return new RegExp(`(?<![A-Za-z0-9])${pattern}(?![A-Za-z0-9])`, 'g');
  }

  isProfane(text: string): boolean {
    // Check pattern matches for variations (no longer check exact matches to avoid storing words)
    for (const pattern of this.patterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  clean(text: string): string {
    let cleanedText = text;

    for (const pattern of this.patterns) {
      cleanedText = cleanedText.replace(pattern, (match) => '*'.repeat(match.length));
    }

    return cleanedText;
  }

  // Method to add words from external source (for production use)
  addWordsFromSecureSource(words: string[]): void {
    for (const word of words) {
      if (word && word.trim()) {
        this.profanityWords.add(word.toLowerCase().trim());
        this.patterns.push(this.createPrecisePattern(word.toLowerCase().trim()));
      }
    }
  }
}

// Global profanity filter instance
const profanityFilter = new ProfanityFilter();

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

export interface SecurityCheckResult {
  isSafe: boolean;
  threats: string[];
  sanitizedValue: string;
}

/**
 * Sanitize and validate email address
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Check for suspicious patterns
  const securityCheck = checkForSecurityThreats(trimmed);
  if (!securityCheck.isSafe) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true, sanitizedValue: trimmed };
};

/**
 * Sanitize and validate username
 */
export const validateUsername = (username: string): ValidationResult => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Username is required' };
  }

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (trimmed.length > 30) {
    return { isValid: false, error: 'Username must be less than 30 characters' };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  // Check for profanity
  if (containsProfanity(trimmed)) {
    return { isValid: false, error: 'Username contains inappropriate content' };
  }

  // Check for security threats
  const securityCheck = checkForSecurityThreats(trimmed);
  if (!securityCheck.isSafe) {
    return { isValid: false, error: 'Invalid username format' };
  }

  return { isValid: true, sanitizedValue: trimmed };
};

/**
 * Sanitize and validate display name
 */
export const validateDisplayName = (displayName: string): ValidationResult => {
  if (!displayName || typeof displayName !== 'string') {
    return { isValid: false, error: 'Display name is required' };
  }

  const trimmed = displayName.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Display name is required' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters long' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Display name must be less than 50 characters' };
  }

  if (!DISPLAY_NAME_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Display name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  // Check for profanity
  if (containsProfanity(trimmed)) {
    return { isValid: false, error: 'Display name contains inappropriate content' };
  }

  // Check for security threats
  const securityCheck = checkForSecurityThreats(trimmed);
  if (!securityCheck.isSafe) {
    return { isValid: false, error: 'Invalid display name format' };
  }

  return { isValid: true, sanitizedValue: trimmed };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }

  return { isValid: true, sanitizedValue: password };
};

/**
 * Sanitize and validate phone number
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: true, sanitizedValue: '' }; // Phone is optional
  }

  const trimmed = phone.trim().replace(/\s+/g, '');
  
  if (trimmed.length === 0) {
    return { isValid: true, sanitizedValue: '' };
  }

  if (!PHONE_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid phone number (e.g., +1234567890)' };
  }

  return { isValid: true, sanitizedValue: trimmed };
};

/**
 * Sanitize and validate date of birth
 */
export const validateDateOfBirth = (date: string): ValidationResult => {
  if (!date || typeof date !== 'string') {
    return { isValid: true, sanitizedValue: '' }; // Date is optional
  }

  const trimmed = date.trim();
  
  if (trimmed.length === 0) {
    return { isValid: true, sanitizedValue: '' };
  }

  if (!DATE_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter date in DD/MM/YYYY format' };
  }

  // Parse and validate the date
  const [day, month, year] = trimmed.split('/').map(Number);
  const dateObj = new Date(year, month - 1, day);
  
  if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
    return { isValid: false, error: 'Please enter a valid date' };
  }

  // Check if user is at least 13 years old
  const today = new Date();
  const age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  const dayDiff = today.getDate() - day;
  
  if (age < 13 || (age === 13 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))) {
    return { isValid: false, error: 'You must be at least 13 years old to create an account' };
  }

  // Check if date is not in the future
  if (dateObj > today) {
    return { isValid: false, error: 'Date of birth cannot be in the future' };
  }

  return { isValid: true, sanitizedValue: trimmed };
};

/**
 * Check for security threats in input
 */
export const checkForSecurityThreats = (input: string): SecurityCheckResult => {
  const threats: string[] = [];
  let sanitizedValue = input;

  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('SQL_INJECTION');
      break;
    }
  }

  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('XSS');
      sanitizedValue = sanitizedValue.replace(pattern, '');
    }
  }

  // Remove potentially dangerous characters
  sanitizedValue = sanitizedValue.replace(/[<>'"&]/g, '');

  return {
    isSafe: threats.length === 0,
    threats,
    sanitizedValue,
  };
};

/**
 * Check for profanity in input
 */
export const containsProfanity = (input: string): boolean => {
  return profanityFilter.isProfane(input);
};

/**
 * Sanitize general text input
 */
export const sanitizeTextInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Rate limiting helper
 */
export class RateLimiter {
  protected attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    protected maxAttempts: number = 5,
    protected windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {
    // Set up periodic cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.windowMs);
  }
  
  isAllowed(identifier: string): boolean {
    // Perform cleanup on each check to remove stale entries
    this.cleanup();

    const now = Date.now();
    const record = this.attempts.get(identifier);
    
    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Check if limit exceeded
    if (record.count >= this.maxAttempts) {
      return false;
    }
    
    // Increment count
    record.count++;
    record.lastAttempt = now;
    return true;
  }
  
  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || record.count < this.maxAttempts) {
      return 0;
    }
    
    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, this.windowMs - elapsed);
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  // Clean up stale entries to prevent memory leaks
  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, record] of this.attempts.entries()) {
      if (now - record.lastAttempt > this.windowMs) {
        this.attempts.delete(identifier);
      }
    }
  }

  // Destroy the rate limiter and clean up resources
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.attempts.clear();
  }
}

// Enhanced rate limiter with progressive delays
export class ProgressiveRateLimiter extends RateLimiter {
  private progressiveDelays: number[] = [
    1 * 60 * 1000,    // 1 minute after 1st failure
    5 * 60 * 1000,    // 5 minutes after 2nd failure
    15 * 60 * 1000,   // 15 minutes after 3rd failure
    30 * 60 * 1000,   // 30 minutes after 4th failure
    60 * 60 * 1000,   // 1 hour after 5th failure
  ];

  getProgressiveDelay(attemptCount: number): number {
    if (attemptCount <= 0) return 0;
    const index = Math.min(attemptCount - 1, this.progressiveDelays.length - 1);
    return this.progressiveDelays[index];
  }

  isAllowed(identifier: string): boolean {
    const attempt = this.attempts.get(identifier);
    if (!attempt) return true;

    const now = Date.now();
    const progressiveDelay = this.getProgressiveDelay(attempt.count);
    const timeSinceLastAttempt = now - attempt.lastAttempt;

    // Use progressive delay instead of fixed window
    if (attempt.count > 0 && timeSinceLastAttempt < progressiveDelay) {
      return false;
    }

    // Reset if enough time has passed
    if (timeSinceLastAttempt >= this.windowMs) {
      this.attempts.delete(identifier);
      return true;
    }

    return attempt.count < this.maxAttempts;
  }

  getRemainingTime(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt) return 0;

    const now = Date.now();
    const progressiveDelay = this.getProgressiveDelay(attempt.count);
    const timeSinceLastAttempt = now - attempt.lastAttempt;

    if (attempt.count > 0 && timeSinceLastAttempt < progressiveDelay) {
      return progressiveDelay - timeSinceLastAttempt;
    }

    return Math.max(0, this.windowMs - timeSinceLastAttempt);
  }
}

// Global rate limiter instances with progressive delays
export const loginRateLimiter = new ProgressiveRateLimiter(5, 60 * 60 * 1000); // Progressive delays up to 1 hour
export const signupRateLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour
export const passwordResetRateLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour
export const biometricRateLimiter = new RateLimiter(10, 5 * 60 * 1000); // 10 attempts per 5 minutes
