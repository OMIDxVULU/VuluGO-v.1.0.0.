/**
 * Image Utilities - Safe image handling to prevent null buffer errors
 * Fixes the "Error: Could not find MIME for Buffer <null>" Jimp error
 */

import { Platform } from 'react-native';

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
  size?: number;
}

export interface SafeImageSource {
  uri: string;
  fallbackUri?: string;
  headers?: Record<string, string>;
}

class ImageUtils {
  private static readonly DEFAULT_AVATAR = 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=U';
  private static readonly FALLBACK_AVATARS = [
    'https://randomuser.me/api/portraits/lego/1.jpg',
    'https://randomuser.me/api/portraits/lego/2.jpg',
    'https://randomuser.me/api/portraits/lego/3.jpg',
  ];

  /**
   * Validate image URL and return safe source
   */
  static validateImageSource(uri: string | null | undefined): SafeImageSource {
    // Handle null/undefined/empty URIs
    if (!uri || typeof uri !== 'string' || uri.trim().length === 0) {
      console.warn('[IMAGE_UTILS] Invalid image URI provided, using default');
      return {
        uri: this.DEFAULT_AVATAR,
        fallbackUri: this.FALLBACK_AVATARS[0],
      };
    }

    // Validate URI format
    try {
      const url = new URL(uri);
      
      // Check for supported protocols
      if (!['http:', 'https:', 'data:', 'file:'].includes(url.protocol)) {
        console.warn('[IMAGE_UTILS] Unsupported protocol:', url.protocol);
        return {
          uri: this.DEFAULT_AVATAR,
          fallbackUri: uri, // Keep original as fallback
        };
      }

      // Check for common image extensions
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasImageExtension = imageExtensions.some(ext => 
        url.pathname.toLowerCase().includes(ext)
      );

      // For URLs without clear image extensions, add validation headers
      const headers = hasImageExtension ? undefined : {
        'Accept': 'image/*',
        'Cache-Control': 'no-cache',
      };

      return {
        uri,
        fallbackUri: this.DEFAULT_AVATAR,
        headers,
      };

    } catch (error) {
      console.warn('[IMAGE_UTILS] Invalid URL format:', uri, error);
      return {
        uri: this.DEFAULT_AVATAR,
        fallbackUri: this.FALLBACK_AVATARS[0],
      };
    }
  }

  /**
   * Get safe avatar URI with fallbacks
   */
  static getSafeAvatarUri(uri: string | null | undefined, userId?: string): string {
    const validated = this.validateImageSource(uri);
    
    // If we have a user ID, generate a consistent fallback
    if (userId && (!uri || uri === this.DEFAULT_AVATAR)) {
      const avatarIndex = this.hashUserId(userId) % this.FALLBACK_AVATARS.length;
      return this.FALLBACK_AVATARS[avatarIndex];
    }
    
    return validated.uri;
  }

  /**
   * Generate consistent avatar for user ID
   */
  static generateUserAvatar(userId: string, displayName?: string): string {
    if (!userId) {
      return this.DEFAULT_AVATAR;
    }

    // Use initials if display name is available
    if (displayName && displayName.trim().length > 0) {
      const initials = displayName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
      
      const colors = ['FF2D55', '007AFF', '34C759', 'FF9500', 'AF52DE', '5AC8FA'];
      const colorIndex = this.hashUserId(userId) % colors.length;
      const backgroundColor = colors[colorIndex];
      
      return `https://ui-avatars.com/api/?background=${backgroundColor}&color=fff&name=${initials}&size=200&bold=true`;
    }

    // Fallback to consistent random avatar
    const avatarIndex = this.hashUserId(userId) % this.FALLBACK_AVATARS.length;
    return this.FALLBACK_AVATARS[avatarIndex];
  }

  /**
   * Validate image buffer (for Jimp or other image processing)
   */
  static validateImageBuffer(buffer: any): ImageValidationResult {
    // Check for null/undefined buffer
    if (!buffer) {
      return {
        isValid: false,
        error: 'Image buffer is null or undefined',
      };
    }

    // Check for empty buffer
    if (buffer.length === 0) {
      return {
        isValid: false,
        error: 'Image buffer is empty',
      };
    }

    // Basic MIME type detection from buffer headers
    const mimeType = this.detectMimeType(buffer);
    if (!mimeType) {
      return {
        isValid: false,
        error: 'Could not detect image MIME type from buffer',
      };
    }

    return {
      isValid: true,
      mimeType,
      size: buffer.length,
    };
  }

  /**
   * Safe image processing wrapper (for Jimp or similar)
   */
  static async safeImageProcess<T>(
    buffer: any,
    processor: (validBuffer: any) => Promise<T>,
    fallback?: T
  ): Promise<T | null> {
    try {
      // Validate buffer first
      const validation = this.validateImageBuffer(buffer);
      if (!validation.isValid) {
        console.warn('[IMAGE_UTILS] Image buffer validation failed:', validation.error);
        return fallback || null;
      }

      // Process with validated buffer
      return await processor(buffer);

    } catch (error: any) {
      console.error('[IMAGE_UTILS] Image processing error:', error);
      
      // Handle specific Jimp errors
      if (error.message?.includes('Could not find MIME for Buffer')) {
        console.error('[IMAGE_UTILS] Jimp MIME detection failed - buffer may be corrupted');
      }
      
      return fallback || null;
    }
  }

  /**
   * Detect MIME type from buffer headers
   */
  private static detectMimeType(buffer: any): string | null {
    if (!buffer || buffer.length < 4) {
      return null;
    }

    // Convert buffer to Uint8Array for consistent access
    const bytes = new Uint8Array(buffer);

    // JPEG
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'image/jpeg';
    }

    // PNG
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'image/png';
    }

    // GIF
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return 'image/gif';
    }

    // WebP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      return 'image/webp';
    }

    // BMP
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
      return 'image/bmp';
    }

    return null;
  }

  /**
   * Hash user ID for consistent avatar selection
   */
  private static hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get optimized image URI for performance
   */
  static getOptimizedImageUri(uri: string, width?: number, height?: number): string {
    const validated = this.validateImageSource(uri);
    
    // For external services that support resizing
    if (uri.includes('randomuser.me') && width && height) {
      return uri; // randomuser.me doesn't support custom sizing
    }
    
    if (uri.includes('ui-avatars.com') && width) {
      return uri.replace(/size=\d+/, `size=${width}`);
    }
    
    return validated.uri;
  }

  /**
   * Preload image to check if it's accessible
   */
  static async preloadImage(uri: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = uri;
      } else {
        // For React Native, we'll assume the image is valid
        // In a real implementation, you might use react-native-fast-image
        resolve(true);
      }
    });
  }

  /**
   * Get safe image source with error handling
   */
  static getSafeImageSource(uri: string | null | undefined): { uri: string } {
    const validated = this.validateImageSource(uri);
    return { uri: validated.uri };
  }
}

export default ImageUtils;
