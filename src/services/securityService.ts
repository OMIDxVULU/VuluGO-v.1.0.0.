import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storageUtils';

export interface SecurityEvent {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'signup_attempt' | 'password_reset' | 'account_locked' | 'suspicious_activity';
  timestamp: number;
  userIdentifier?: string;
  ipAddress?: string;
  deviceInfo?: string;
  details?: any;
}

export interface AccountLockInfo {
  isLocked: boolean;
  lockUntil?: number;
  attemptCount: number;
  lastAttempt: number;
  lockReason?: string;
}

export interface DeviceFingerprint {
  deviceId: string;
  platform: string;
  model?: string;
  osVersion?: string;
  appVersion?: string;
  screenDimensions?: string;
  timezone?: string;
  language?: string;
}

export class SecurityService {
  private static instance: SecurityService;
  private readonly SECURITY_EVENTS_KEY = '@vulugo_security_events';
  private readonly ACCOUNT_LOCKS_KEY = '@vulugo_account_locks';
  private readonly DEVICE_FINGERPRINT_KEY = '@vulugo_device_fingerprint';
  private readonly SUSPICIOUS_IPS_KEY = '@vulugo_suspicious_ips';

  // Mutex for preventing race conditions
  private userLocks = new Map<string, Promise<boolean>>();
  
  // Security thresholds
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly ACCOUNT_LOCK_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 10;
  private readonly MAX_EVENTS_STORED = 1000;

  // DDoS Protection thresholds
  private readonly DDOS_REQUEST_THRESHOLD = 100; // requests per minute
  private readonly DDOS_BLOCK_DURATION = 60 * 60 * 1000; // 1 hour
  private readonly IP_RATE_LIMIT = 50; // requests per minute per IP

  private constructor() {
    this.initializeDeviceFingerprint();
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  // Initialize device fingerprinting
  private async initializeDeviceFingerprint(): Promise<void> {
    try {
      let fingerprint = await this.getStoredDeviceFingerprint();
      
      if (!fingerprint) {
        fingerprint = await this.generateDeviceFingerprint();
        await this.storeDeviceFingerprint(fingerprint);
      }
    } catch (error) {
      console.warn('Error initializing device fingerprint:', error);
    }
  }

  // Generate device fingerprint
  private async generateDeviceFingerprint(): Promise<DeviceFingerprint> {
    try {
      // Try to get existing device ID from secure storage
      let deviceId: string;

      try {
        const existingId = await SecureStore.getItemAsync('device_id');
        if (existingId) {
          deviceId = existingId;
        } else {
          // Generate stable device fingerprint based on device characteristics
          const stableAttributes = [
            Platform.OS,
            Platform.Version.toString(),
            Intl.DateTimeFormat().resolvedOptions().timeZone,
          ].join('-');

          deviceId = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            stableAttributes
          );

          // Store for future use
          await SecureStore.setItemAsync('device_id', deviceId);
        }
      } catch (error) {
        console.warn('Failed to use secure storage for device ID, using fallback:', error);
        // Try to read from both locations and sync them
        const fallbackResult = await safeGetItem('device_id_fallback');

        if (fallbackResult.success && fallbackResult.data) {
          deviceId = fallbackResult.data;
          // Try to sync back to SecureStore when it becomes available
          try {
            await SecureStore.setItemAsync('device_id', deviceId);
          } catch (syncError) {
            // SecureStore still unavailable, continue with fallback
          }
        } else {
          // Generate new ID and store in both locations
          deviceId = `fallback-${await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            `${Platform.OS}-${Platform.Version}`
          )}`;
          await safeSetItem('device_id_fallback', deviceId);
          // Try to store in SecureStore too
          try {
            await SecureStore.setItemAsync('device_id', deviceId);
          } catch (syncError) {
            // SecureStore unavailable, fallback storage is sufficient
          }
        }
      }

      return {
        deviceId,
        platform: Platform.OS,
        osVersion: Platform.Version.toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: 'en', // You might want to get this from device settings
      };
    } catch (error) {
      console.warn('Error generating device fingerprint:', error);
      const fallbackId = `error-fallback-${Date.now()}`;

      // Try to store the fallback ID
      const storeResult = await safeSetItem('device_id_fallback', fallbackId);
      if (!storeResult.success && !storeResult.error?.includes('Development environment')) {
        console.warn('Failed to store fallback device ID:', storeResult.error);
      }

      return {
        deviceId: fallbackId,
        platform: Platform.OS,
      };
    }
  }

  // Store device fingerprint
  private async storeDeviceFingerprint(fingerprint: DeviceFingerprint): Promise<void> {
    try {
      const result = await safeSetItem(this.DEVICE_FINGERPRINT_KEY, JSON.stringify(fingerprint));
      if (!result.success && !result.error?.includes('Development environment')) {
        console.warn('Error storing device fingerprint:', result.error);
      }
    } catch (error) {
      console.warn('Error storing device fingerprint:', error);
    }
  }

  // Get stored device fingerprint
  private async getStoredDeviceFingerprint(): Promise<DeviceFingerprint | null> {
    try {
      const stored = await AsyncStorage.getItem(this.DEVICE_FINGERPRINT_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Error getting device fingerprint:', error);
      return null;
    }
  }

  // Log security event
  async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    try {
      const fullEvent: SecurityEvent = {
        ...event,
        timestamp: Date.now(),
      };

      const events = await this.getSecurityEvents();
      events.push(fullEvent);

      // Keep only the most recent events
      if (events.length > this.MAX_EVENTS_STORED) {
        events.splice(0, events.length - this.MAX_EVENTS_STORED);
      }

      const result = await safeSetItem(this.SECURITY_EVENTS_KEY, JSON.stringify(events));
      if (!result.success) {
        // In development environment, this is expected - just continue silently
        if (!result.error?.includes('Development environment')) {
          console.warn('Error logging security event:', result.error);
        }
        return;
      }

      // Check for suspicious activity
      await this.analyzeSuspiciousActivity(event.userIdentifier);
    } catch (error) {
      console.warn('Error logging security event:', error);
    }
  }

  // Get security events
  async getSecurityEvents(userIdentifier?: string): Promise<SecurityEvent[]> {
    try {
      const result = await safeGetItem(this.SECURITY_EVENTS_KEY);
      if (!result.success) {
        // In development environment, this is expected - return empty array
        return [];
      }

      const events: SecurityEvent[] = result.data ? JSON.parse(result.data) : [];

      if (userIdentifier) {
        return events.filter(event => event.userIdentifier === userIdentifier);
      }

      return events;
    } catch (error) {
      console.warn('Error getting security events:', error);
      return [];
    }
  }

  // Check if account is locked
  async isAccountLocked(userIdentifier: string): Promise<AccountLockInfo> {
    try {
      const stored = await AsyncStorage.getItem(this.ACCOUNT_LOCKS_KEY);
      const locks: Record<string, AccountLockInfo> = stored ? JSON.parse(stored) : {};
      
      const lockInfo = locks[userIdentifier] || {
        isLocked: false,
        attemptCount: 0,
        lastAttempt: 0,
      };

      // Check if lock has expired
      if (lockInfo.isLocked && lockInfo.lockUntil && Date.now() > lockInfo.lockUntil) {
        lockInfo.isLocked = false;
        lockInfo.lockUntil = undefined;
        lockInfo.attemptCount = 0;
        
        // Update storage
        locks[userIdentifier] = lockInfo;
        await AsyncStorage.setItem(this.ACCOUNT_LOCKS_KEY, JSON.stringify(locks));
      }

      return lockInfo;
    } catch (error) {
      console.warn('Error checking account lock:', error);
      return { isLocked: false, attemptCount: 0, lastAttempt: 0 };
    }
  }

  // Lock account
  async lockAccount(userIdentifier: string, reason: string = 'Too many failed attempts'): Promise<void> {
    try {
      const result = await safeGetItem(this.ACCOUNT_LOCKS_KEY);
      const locks: Record<string, AccountLockInfo> = result.success && result.data ? JSON.parse(result.data) : {};

      locks[userIdentifier] = {
        isLocked: true,
        lockUntil: Date.now() + this.ACCOUNT_LOCK_DURATION,
        attemptCount: 0,
        lastAttempt: Date.now(),
        lockReason: reason,
      };

      const storeResult = await safeSetItem(this.ACCOUNT_LOCKS_KEY, JSON.stringify(locks));
      if (!storeResult.success && !storeResult.error?.includes('Development environment')) {
        console.warn('Error storing account lock:', storeResult.error);
        return;
      }

      // Log security event
      await this.logSecurityEvent({
        type: 'account_locked',
        userIdentifier,
        details: { reason, lockDuration: this.ACCOUNT_LOCK_DURATION },
      });
    } catch (error) {
      console.warn('Error locking account:', error);
    }
  }

  // Record failed login attempt with mutex to prevent race conditions
  async recordFailedAttempt(userIdentifier: string): Promise<boolean> {
    // Acquire mutex for this user
    const existingLock = this.userLocks.get(userIdentifier);
    if (existingLock) {
      await existingLock;
    }

    const lockPromise = this._recordFailedAttemptInternal(userIdentifier);
    this.userLocks.set(userIdentifier, lockPromise);

    try {
      const result = await lockPromise;
      return result;
    } finally {
      this.userLocks.delete(userIdentifier);
    }
  }

  private async _recordFailedAttemptInternal(userIdentifier: string): Promise<boolean> {
    try {
      const result = await safeGetItem(this.ACCOUNT_LOCKS_KEY);
      const locks: Record<string, AccountLockInfo> = result.success && result.data ? JSON.parse(result.data) : {};

      const lockInfo = locks[userIdentifier] || {
        isLocked: false,
        attemptCount: 0,
        lastAttempt: 0,
      };

      lockInfo.attemptCount += 1;
      lockInfo.lastAttempt = Date.now();

      // Check if we should lock the account
      if (lockInfo.attemptCount >= this.MAX_FAILED_ATTEMPTS) {
        lockInfo.isLocked = true;
        lockInfo.lockUntil = Date.now() + this.ACCOUNT_LOCK_DURATION;
      }

      locks[userIdentifier] = lockInfo;
      const storeResult = await safeSetItem(this.ACCOUNT_LOCKS_KEY, JSON.stringify(locks));

      if (!storeResult.success) {
        if (!storeResult.error?.includes('Development environment')) {
          console.warn('Error storing failed attempt:', storeResult.error);
        }
        // In development, still return the lock status even if storage fails
        return lockInfo.isLocked;
      }

      // Log security event only after successful persistence
      if (lockInfo.isLocked && lockInfo.attemptCount >= this.MAX_FAILED_ATTEMPTS) {
        await this.logSecurityEvent({
          type: 'account_locked',
          userIdentifier,
          details: { attemptCount: lockInfo.attemptCount },
        });
      }

      return lockInfo.isLocked;
    } catch (error) {
      console.warn('Error recording failed attempt:', error);
      return false;
    }
  }

  // Clear failed attempts (on successful login)
  async clearFailedAttempts(userIdentifier: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.ACCOUNT_LOCKS_KEY);
      const locks: Record<string, AccountLockInfo> = stored ? JSON.parse(stored) : {};

      if (locks[userIdentifier]) {
        locks[userIdentifier] = {
          isLocked: false,
          attemptCount: 0,
          lastAttempt: Date.now(),
        };

        await AsyncStorage.setItem(this.ACCOUNT_LOCKS_KEY, JSON.stringify(locks));
      }
    } catch (error) {
      console.warn('Error clearing failed attempts:', error);
    }
  }

  // Analyze suspicious activity
  private async analyzeSuspiciousActivity(userIdentifier?: string): Promise<void> {
    if (!userIdentifier) return;

    try {
      const recentEvents = await this.getRecentEvents(userIdentifier, 60 * 60 * 1000); // Last hour
      const failedAttempts = recentEvents.filter(event => event.type === 'login_failure');

      if (failedAttempts.length >= this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        await this.logSecurityEvent({
          type: 'suspicious_activity',
          userIdentifier,
          details: { failedAttempts: failedAttempts.length, timeWindow: '1 hour' },
        });
      }
    } catch (error) {
      console.warn('Error analyzing suspicious activity:', error);
    }
  }

  // DDoS Protection - Track IP-based request rates
  private ipRequestCounts = new Map<string, { count: number; lastReset: number; blocked: boolean; blockUntil?: number }>();

  checkDDoSProtection(ipAddress: string): { allowed: boolean; remainingTime?: number } {
    const now = Date.now();
    const record = this.ipRequestCounts.get(ipAddress);

    if (!record) {
      this.ipRequestCounts.set(ipAddress, { count: 1, lastReset: now, blocked: false });
      return { allowed: true };
    }

    // Check if IP is currently blocked
    if (record.blocked && record.blockUntil && now < record.blockUntil) {
      return { allowed: false, remainingTime: record.blockUntil - now };
    }

    // Reset counter if minute has passed
    if (now - record.lastReset > 60 * 1000) {
      record.count = 1;
      record.lastReset = now;
      record.blocked = false;
      record.blockUntil = undefined;
      return { allowed: true };
    }

    // Increment counter
    record.count++;

    // Check if threshold exceeded
    if (record.count > this.IP_RATE_LIMIT) {
      record.blocked = true;
      record.blockUntil = now + this.DDOS_BLOCK_DURATION;

      // Log DDoS attempt
      this.logSecurityEvent({
        type: 'suspicious_activity',
        ipAddress,
        details: { type: 'ddos_attempt', requestCount: record.count }
      });

      return { allowed: false, remainingTime: this.DDOS_BLOCK_DURATION };
    }

    return { allowed: true };
  }

  // Content filtering for harmful content
  filterContent(content: string): { filtered: string; flagged: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let filtered = content;

    // Profanity filter (basic implementation)
    const profanityPatterns = [
      /\b(spam|scam|hack|cheat|bot|fake)\b/gi,
      /\b(password|login|account|steal|phish)\b/gi,
      /(http[s]?:\/\/[^\s]+)/gi, // URLs
    ];

    profanityPatterns.forEach((pattern, index) => {
      if (pattern.test(filtered)) {
        switch (index) {
          case 0:
            reasons.push('spam_keywords');
            break;
          case 1:
            reasons.push('security_keywords');
            break;
          case 2:
            reasons.push('external_links');
            break;
        }
        filtered = filtered.replace(pattern, '[FILTERED]');
      }
    });

    return {
      filtered,
      flagged: reasons.length > 0,
      reasons
    };
  }

  // Get recent events
  private async getRecentEvents(userIdentifier: string, timeWindow: number): Promise<SecurityEvent[]> {
    const events = await this.getSecurityEvents(userIdentifier);
    const cutoff = Date.now() - timeWindow;
    return events.filter(event => event.timestamp > cutoff);
  }

  // Get device fingerprint
  async getDeviceFingerprint(): Promise<DeviceFingerprint | null> {
    return await this.getStoredDeviceFingerprint();
  }

  // Clean up old data
  async cleanup(): Promise<void> {
    try {
      // Clean up old security events
      const events = await this.getSecurityEvents();
      const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
      const recentEvents = events.filter(event => event.timestamp > cutoff);
      
      if (recentEvents.length !== events.length) {
        await AsyncStorage.setItem(this.SECURITY_EVENTS_KEY, JSON.stringify(recentEvents));
      }

      // Clean up expired locks
      const stored = await AsyncStorage.getItem(this.ACCOUNT_LOCKS_KEY);
      const locks: Record<string, AccountLockInfo> = stored ? JSON.parse(stored) : {};
      
      let hasChanges = false;
      for (const [userIdentifier, lockInfo] of Object.entries(locks)) {
        if (lockInfo.isLocked && lockInfo.lockUntil && Date.now() > lockInfo.lockUntil) {
          locks[userIdentifier] = {
            isLocked: false,
            attemptCount: 0,
            lastAttempt: lockInfo.lastAttempt,
          };
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await AsyncStorage.setItem(this.ACCOUNT_LOCKS_KEY, JSON.stringify(locks));
      }
    } catch (error) {
      console.warn('Error during security cleanup:', error);
    }
  }
}

export const securityService = SecurityService.getInstance();
export default securityService;
