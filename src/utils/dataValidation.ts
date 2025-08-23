/**
 * Data validation utilities for Firebase operations
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export class DataValidator {
  /**
   * Validates and sanitizes global chat message data
   */
  static validateGlobalChatMessage(data: any): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: any = {};

    // Validate senderId
    if (!data.senderId || typeof data.senderId !== 'string' || !data.senderId.trim()) {
      errors.push('Sender ID is required and must be a non-empty string');
    } else {
      sanitizedData.senderId = data.senderId.trim();
    }

    // Validate senderName
    if (!data.senderName || typeof data.senderName !== 'string' || !data.senderName.trim()) {
      // Provide fallback for senderName
      sanitizedData.senderName = 'Anonymous';
    } else {
      sanitizedData.senderName = data.senderName.trim();
    }

    // Validate text
    if (!data.text || typeof data.text !== 'string' || !data.text.trim()) {
      errors.push('Message text is required and must be a non-empty string');
    } else {
      const trimmedText = data.text.trim();
      if (trimmedText.length > 500) {
        errors.push('Message text cannot exceed 500 characters');
      } else {
        sanitizedData.text = trimmedText;
      }
    }

    // Validate type
    if (!data.type || typeof data.type !== 'string') {
      sanitizedData.type = 'text'; // Default type
    } else {
      const validTypes = ['text', 'system'];
      if (validTypes.includes(data.type)) {
        sanitizedData.type = data.type;
      } else {
        sanitizedData.type = 'text'; // Fallback to default
      }
    }

    // Validate senderAvatar (optional)
    if (data.senderAvatar) {
      if (typeof data.senderAvatar === 'string' && data.senderAvatar.trim()) {
        const avatarUrl = data.senderAvatar.trim();
        // Basic URL validation
        if (this.isValidUrl(avatarUrl)) {
          sanitizedData.senderAvatar = avatarUrl;
        }
        // If invalid URL, we simply don't include it (optional field)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }

  /**
   * Validates user authentication data
   */
  static validateUserAuth(user: any): ValidationResult {
    const errors: string[] = [];

    if (!user) {
      errors.push('User object is required');
      return { isValid: false, errors };
    }

    if (!user.uid || typeof user.uid !== 'string' || !user.uid.trim()) {
      errors.push('User ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: user
    };
  }

  /**
   * Basic URL validation
   */
  private static isValidUrl(string: string): boolean {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  /**
   * Sanitizes text input by removing potentially harmful content
   */
  static sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 500); // Limit length
  }

  /**
   * Validates Firebase document data before operations
   */
  static validateFirebaseDocument(data: any, requiredFields: string[]): ValidationResult {
    const errors: string[] = [];
    const sanitizedData: any = {};

    // Check required fields
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors.push(`Field '${field}' is required`);
      } else {
        sanitizedData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
      }
    }

    // Copy optional fields if they exist and are valid
    for (const [key, value] of Object.entries(data)) {
      if (!requiredFields.includes(key) && value !== undefined && value !== null) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed) {
            sanitizedData[key] = trimmed;
          }
        } else {
          sanitizedData[key] = value;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }

  /**
   * Creates a safe user display name
   */
  static createSafeDisplayName(user: any): string {
    if (!user) return 'Anonymous';
    
    if (user.displayName && typeof user.displayName === 'string' && user.displayName.trim()) {
      return user.displayName.trim();
    }
    
    if (user.email && typeof user.email === 'string' && user.email.trim()) {
      // Extract name part from email
      const emailName = user.email.split('@')[0];
      if (emailName && emailName.trim()) {
        return emailName.trim();
      }
    }
    
    return 'Anonymous';
  }

  /**
   * Creates a safe avatar URL or returns undefined
   */
  static createSafeAvatarUrl(user: any): string | undefined {
    if (!user || !user.photoURL) return undefined;
    
    if (typeof user.photoURL === 'string' && user.photoURL.trim()) {
      const url = user.photoURL.trim();
      return this.isValidUrl(url) ? url : undefined;
    }
    
    return undefined;
  }
}

export default DataValidator;
