/**
 * Logging Throttle Utility
 * Prevents spam logging by throttling repeated log messages
 */

interface ThrottleEntry {
  lastLog: number;
  count: number;
}

class LoggingThrottle {
  private static instance: LoggingThrottle;
  private throttleMap = new Map<string, ThrottleEntry>();
  private readonly DEFAULT_THROTTLE_MS = 5000; // 5 seconds
  private readonly MAX_SUPPRESSED_COUNT = 100;

  private constructor() {}

  static getInstance(): LoggingThrottle {
    if (!LoggingThrottle.instance) {
      LoggingThrottle.instance = new LoggingThrottle();
    }
    return LoggingThrottle.instance;
  }

  /**
   * Throttled console.log
   */
  log(key: string, message: string, throttleMs: number = this.DEFAULT_THROTTLE_MS): void {
    if (this.shouldLog(key, throttleMs)) {
      const entry = this.throttleMap.get(key);
      if (entry && entry.count > 0) {
        console.log(`${message} (suppressed ${entry.count} similar messages)`);
        entry.count = 0;
      } else {
        console.log(message);
      }
    }
  }

  /**
   * Throttled console.warn
   */
  warn(key: string, message: string, throttleMs: number = this.DEFAULT_THROTTLE_MS): void {
    if (this.shouldLog(key, throttleMs)) {
      const entry = this.throttleMap.get(key);
      if (entry && entry.count > 0) {
        console.warn(`${message} (suppressed ${entry.count} similar messages)`);
        entry.count = 0;
      } else {
        console.warn(message);
      }
    }
  }

  /**
   * Throttled console.error
   */
  error(key: string, message: string, throttleMs: number = this.DEFAULT_THROTTLE_MS): void {
    if (this.shouldLog(key, throttleMs)) {
      const entry = this.throttleMap.get(key);
      if (entry && entry.count > 0) {
        console.error(`${message} (suppressed ${entry.count} similar messages)`);
        entry.count = 0;
      } else {
        console.error(message);
      }
    }
  }

  /**
   * Check if a log should be emitted
   */
  private shouldLog(key: string, throttleMs: number): boolean {
    const now = Date.now();
    const entry = this.throttleMap.get(key);

    if (!entry) {
      this.throttleMap.set(key, { lastLog: now, count: 0 });
      return true;
    }

    if (now - entry.lastLog >= throttleMs) {
      entry.lastLog = now;
      return true;
    }

    // Increment suppressed count
    entry.count++;
    
    // If we've suppressed too many, force a log
    if (entry.count >= this.MAX_SUPPRESSED_COUNT) {
      entry.lastLog = now;
      return true;
    }

    return false;
  }

  /**
   * Clear throttle history for a specific key
   */
  clearKey(key: string): void {
    this.throttleMap.delete(key);
  }

  /**
   * Clear all throttle history
   */
  clearAll(): void {
    this.throttleMap.clear();
  }

  /**
   * Get throttle statistics
   */
  getStats(): { totalKeys: number; suppressedMessages: number } {
    let suppressedMessages = 0;
    for (const entry of this.throttleMap.values()) {
      suppressedMessages += entry.count;
    }
    
    return {
      totalKeys: this.throttleMap.size,
      suppressedMessages
    };
  }
}

// Export singleton instance
export const loggingThrottle = LoggingThrottle.getInstance();

// Convenience functions
export const throttledLog = (key: string, message: string, throttleMs?: number) => 
  loggingThrottle.log(key, message, throttleMs);

export const throttledWarn = (key: string, message: string, throttleMs?: number) => 
  loggingThrottle.warn(key, message, throttleMs);

export const throttledError = (key: string, message: string, throttleMs?: number) => 
  loggingThrottle.error(key, message, throttleMs);

// Specific throttled loggers for common use cases
export const throttledNetworkLog = (message: string) => 
  throttledLog('network-state', message, 5000);

export const throttledConnectionLog = (message: string) => 
  throttledLog('connection-state', message, 3000);

export const throttledPerformanceLog = (message: string) => 
  throttledLog('performance-alert', message, 10000);

export const throttledAgoraLog = (message: string) => 
  throttledLog('agora-debug', message, 60000);

export default loggingThrottle;
