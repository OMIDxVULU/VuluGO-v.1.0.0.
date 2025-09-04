/**
 * User Data Sanitizer
 * Handles undefined values and data validation for Firebase user documents
 */

interface UserData {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  [key: string]: any;
}

interface SanitizedUserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  phoneNumber: string;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  [key: string]: any;
}

class UserDataSanitizer {
  /**
   * Sanitize user data for Firestore storage
   * Removes undefined values and provides safe defaults
   */
  static sanitizeUserData(userData: UserData): SanitizedUserData {
    const sanitized: SanitizedUserData = {
      uid: userData.uid,
      email: userData.email || '',
      displayName: userData.displayName || 'Anonymous User',
      photoURL: userData.photoURL || '', // Empty string instead of null/undefined
      emailVerified: userData.emailVerified || false,
      phoneNumber: userData.phoneNumber || '',
      createdAt: new Date(), // Will be converted to Firestore timestamp
      updatedAt: new Date()
    };

    // Add any additional fields, sanitizing them
    Object.keys(userData).forEach(key => {
      if (!['uid', 'email', 'displayName', 'photoURL', 'emailVerified', 'phoneNumber'].includes(key)) {
        const value = userData[key];
        if (value !== undefined && value !== null) {
          sanitized[key] = value;
        }
      }
    });

    return sanitized;
  }

  /**
   * Generate a default avatar URL based on user info
   */
  static generateDefaultAvatar(displayName?: string, email?: string): string {
    const name = displayName || email?.split('@')[0] || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    // Use a placeholder service that generates avatars based on initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6E69F4&color=FFFFFF&size=150`;
  }

  /**
   * Validate user data before Firestore operations
   */
  static validateUserData(userData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userData.uid || typeof userData.uid !== 'string') {
      errors.push('uid is required and must be a string');
    }

    if (userData.email !== undefined && userData.email !== null && userData.email !== '' && typeof userData.email !== 'string') {
      errors.push('email must be a string or empty');
    }

    if (userData.displayName !== undefined && userData.displayName !== null && typeof userData.displayName !== 'string') {
      errors.push('displayName must be a string');
    }

    if (userData.photoURL !== undefined && userData.photoURL !== null && typeof userData.photoURL !== 'string') {
      errors.push('photoURL must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clean object of undefined values recursively
   */
  static removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item)).filter(item => item !== undefined);
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      });
      return cleaned;
    }

    return obj;
  }

  /**
   * Prepare user data for Firebase Auth profile update
   */
  static prepareAuthProfileData(userData: UserData): { displayName?: string; photoURL?: string } {
    const profile: { displayName?: string; photoURL?: string } = {};

    if (userData.displayName && userData.displayName.trim()) {
      profile.displayName = userData.displayName.trim();
    }

    if (userData.photoURL && userData.photoURL.trim()) {
      profile.photoURL = userData.photoURL.trim();
    } else if (userData.displayName || userData.email) {
      // Generate default avatar if no photoURL provided
      profile.photoURL = this.generateDefaultAvatar(userData.displayName, userData.email);
    }

    return profile;
  }

  /**
   * Create safe user document for Firestore
   */
  static createSafeUserDocument(userData: UserData, additionalData: any = {}): any {
    // Sanitize the main user data
    const sanitized = this.sanitizeUserData(userData);
    
    // Add additional data if provided
    const combined = { ...sanitized, ...additionalData };
    
    // Remove any undefined values
    const cleaned = this.removeUndefinedValues(combined);
    
    // Validate the final data
    const validation = this.validateUserData(cleaned);
    if (!validation.isValid) {
      console.warn('⚠️ User data validation warnings:', validation.errors);
    }

    return cleaned;
  }
}

export default UserDataSanitizer;
