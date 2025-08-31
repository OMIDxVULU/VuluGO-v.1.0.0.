/**
 * Twilio SMS Service
 * Production-ready SMS service using Twilio API for VULU
 * Alternative to Firebase Auth Phone Authentication for React Native
 */

import { SMSVerificationResult, CodeVerificationResult } from './smsVerificationService';
import { Buffer } from 'buffer';

// Debug environment variables (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Twilio Environment Variables Debug:');
  console.log('  EXPO_PUBLIC_TWILIO_ACCOUNT_SID:', process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING');
  console.log('  EXPO_PUBLIC_TWILIO_API_KEY_SID:', process.env.EXPO_PUBLIC_TWILIO_API_KEY_SID ? 'SET' : 'MISSING');
  console.log('  EXPO_PUBLIC_TWILIO_API_KEY_SECRET:', process.env.EXPO_PUBLIC_TWILIO_API_KEY_SECRET ? 'SET' : 'MISSING');
  console.log('  EXPO_PUBLIC_TWILIO_FROM_NUMBER:', process.env.EXPO_PUBLIC_TWILIO_FROM_NUMBER || 'MISSING');
}

// Twilio configuration with API Key support
const TWILIO_CONFIG = {
  // Account identification
  accountSid: process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID || 'your-twilio-account-sid',

  // API Key authentication (preferred for production)
  apiKeySid: process.env.EXPO_PUBLIC_TWILIO_API_KEY_SID || '',
  apiKeySecret: process.env.EXPO_PUBLIC_TWILIO_API_KEY_SECRET || '',

  // Fallback to account credentials (legacy)
  authToken: process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN || '',

  // Phone number for sending SMS
  fromNumber: process.env.EXPO_PUBLIC_TWILIO_FROM_NUMBER || '+1234567890',

  // Twilio API endpoints
  baseUrl: 'https://api.twilio.com/2010-04-01',
};

if (process.env.NODE_ENV === 'development') {
  console.log('📱 Twilio Config Loaded:');
  console.log('  Account SID:', TWILIO_CONFIG.accountSid.substring(0, 10) + '...');
  console.log('  API Key SID:', TWILIO_CONFIG.apiKeySid ? TWILIO_CONFIG.apiKeySid.substring(0, 10) + '...' : 'MISSING');
  console.log('  API Key Secret:', TWILIO_CONFIG.apiKeySecret ? 'SET' : 'MISSING');
  console.log('  Auth Token (fallback):', TWILIO_CONFIG.authToken ? 'SET' : 'MISSING');
  console.log('  From Number:', TWILIO_CONFIG.fromNumber);
  console.log('  Authentication Method:', TWILIO_CONFIG.apiKeySid ? 'API Key' : 'Account Credentials');
}

export class TwilioSMSService {
  private static instance: TwilioSMSService;

  static getInstance(): TwilioSMSService {
    if (!TwilioSMSService.instance) {
      TwilioSMSService.instance = new TwilioSMSService();
    }
    return TwilioSMSService.instance;
  }

  /**
   * Send SMS verification code using Twilio API
   */
  async sendSMS(phoneNumber: string, message: string): Promise<SMSVerificationResult> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 Sending SMS via Twilio');
      }

      // Check if Twilio is configured
      if (!this.isTwilioConfigured()) {
        throw new Error('Twilio not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER environment variables.');
      }

      // Prepare Twilio API request
      const url = `${TWILIO_CONFIG.baseUrl}/Accounts/${TWILIO_CONFIG.accountSid}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append('To', phoneNumber);
      formData.append('From', TWILIO_CONFIG.fromNumber);
      formData.append('Body', message);

      // Create authorization header (API Key preferred, fallback to account credentials)
      let credentials: string;
      if (TWILIO_CONFIG.apiKeySid && TWILIO_CONFIG.apiKeySecret) {
        // Use API Key authentication (recommended)
        credentials = Buffer.from(`${TWILIO_CONFIG.apiKeySid}:${TWILIO_CONFIG.apiKeySecret}`).toString('base64');
        if (process.env.NODE_ENV === 'development') {
          console.log('🔑 Using API Key authentication');
        }
      } else if (TWILIO_CONFIG.authToken) {
        // Fallback to account credentials
        credentials = Buffer.from(`${TWILIO_CONFIG.accountSid}:${TWILIO_CONFIG.authToken}`).toString('base64');
        if (process.env.NODE_ENV === 'development') {
          console.log('🔑 Using Account credentials (fallback)');
        }
      } else {
        throw new Error('No valid Twilio credentials found (API Key or Auth Token)');
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Twilio API error: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ SMS sent successfully via Twilio:', result.sid);
        }

        return {
          success: true,
          verificationId: result.sid, // Use Twilio message SID as verification ID
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          throw new Error('SMS request timed out');
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error('❌ Twilio SMS sending failed:', error);
      
      return {
        success: false,
        error: this.getErrorMessage(error),
        errorCode: error.code || 'twilio-error',
      };
    }
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSVerificationResult> {
    const message = `Your VULU verification code: ${code}. Expires in 10 min.`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Check if Twilio is properly configured
   */
  private isTwilioConfigured(): boolean {
    const hasAccountSid = TWILIO_CONFIG.accountSid !== 'your-twilio-account-sid' &&
                         TWILIO_CONFIG.accountSid.length > 0;

    const hasFromNumber = TWILIO_CONFIG.fromNumber !== '+1234567890' &&
                         TWILIO_CONFIG.fromNumber.length > 0;

    // Check for API Key credentials (preferred)
    const hasApiKey = TWILIO_CONFIG.apiKeySid.length > 0 &&
                     TWILIO_CONFIG.apiKeySecret.length > 0;

    // Check for account credentials (fallback)
    const hasAuthToken = TWILIO_CONFIG.authToken.length > 0;

    // Valid if we have account SID, from number, and either API key or auth token
    return hasAccountSid && hasFromNumber && (hasApiKey || hasAuthToken);
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error.message?.includes('not configured')) {
      return 'SMS service not configured. Please contact support.';
    }
    
    if (error.message?.includes('invalid phone number')) {
      return 'Invalid phone number format.';
    }
    
    if (error.message?.includes('rate limit')) {
      return 'Too many SMS requests. Please try again later.';
    }
    
    if (error.message?.includes('insufficient funds')) {
      return 'SMS service temporarily unavailable. Please try again later.';
    }
    
    return error.message || 'Failed to send SMS. Please try again.';
  }

  /**
   * Validate phone number format for Twilio
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    // Twilio requires E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  }
}

// Export singleton instance
export const twilioSMSService = TwilioSMSService.getInstance();
