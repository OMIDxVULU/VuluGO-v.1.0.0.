/**
 * AnalyticsService.ts
 * 
 * A unified analytics and crash reporting service for the application.
 * This service provides a wrapper around different analytics and crash
 * reporting providers, allowing easy integration and switching.
 */

// Types for analytics events and user properties
export interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
}

export interface UserProperties {
  [key: string]: string | number | boolean;
}

export interface ErrorReport {
  error: Error;
  componentStack?: string;
  metadata?: Record<string, any>;
}

// Configurable options
export interface AnalyticsConfig {
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  enablePerformanceMonitoring: boolean;
  sessionTimeoutSeconds: number;
  userIdKey: string;
  sampleRate: number;
}

// Default configuration
const DEFAULT_CONFIG: AnalyticsConfig = {
  enableAnalytics: true,
  enableCrashReporting: true,
  enablePerformanceMonitoring: true,
  sessionTimeoutSeconds: 1800, // 30 minutes
  userIdKey: 'user_id',
  sampleRate: 1.0, // 100% sampling rate
};

/**
 * AnalyticsService class
 * 
 * Core analytics service that manages tracking, crash reporting, and performance monitoring.
 */
class AnalyticsService {
  private config: AnalyticsConfig;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private initialized: boolean = false;
  private lastActiveTimestamp: number = Date.now();
  private extraUserProperties: UserProperties = {};
  private performanceData: Record<string, number> = {};
  
  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Generate a session ID
    this.refreshSession();
  }
  
  /**
   * Initialize the analytics service with the required providers
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Here you would initialize analytics providers like Firebase, Sentry, etc.
      // Analytics service initialized
      
      // Mark as initialized
      this.initialized = true;
      
      // Track app start event
      this.trackEvent({
        name: 'app_start',
        params: {
          session_id: this.sessionId,
          timestamp: Date.now(),
        }
      });
      
      // Set up session timeout monitoring
      this.setupSessionMonitoring();
    } catch (error) {
      console.error('Failed to initialize analytics service:', error);
    }
  }
  
  /**
   * Set the user ID for analytics tracking
   * @param userId The user's unique identifier
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    
    // Add user ID to user properties
    this.extraUserProperties[this.config.userIdKey] = userId;
    
    // Here you would set the user ID in various analytics providers
    // User ID updated
  }
  
  /**
   * Set additional user properties for analytics tracking
   * @param properties Key-value pairs of user properties
   */
  public setUserProperties(properties: UserProperties): void {
    this.extraUserProperties = {
      ...this.extraUserProperties,
      ...properties
    };
    
    // Here you would set these properties in various analytics providers
    // User properties updated
  }
  
  /**
   * Track an analytics event
   * @param event The event to track
   */
  public trackEvent(event: AnalyticsEvent): void {
    if (!this.config.enableAnalytics) return;
    
    // Apply sampling rate
    if (Math.random() > this.config.sampleRate) return;
    
    // Add standard properties to all events
    const enrichedEvent = {
      ...event,
      params: {
        ...event.params,
        session_id: this.sessionId,
        user_id: this.userId,
        timestamp: Date.now(),
        ...this.extraUserProperties
      }
    };
    
    // Here you would send the event to various analytics providers
    // Event tracked
  }
  
  /**
   * Report an error to crash reporting service
   * @param errorReport The error information to report
   */
  public reportError(errorReport: ErrorReport): void {
    if (!this.config.enableCrashReporting) return;
    
    // Enrich error with context
    const enrichedReport = {
      ...errorReport,
      metadata: {
        ...errorReport.metadata,
        session_id: this.sessionId,
        user_id: this.userId,
        timestamp: Date.now(),
        ...this.extraUserProperties
      }
    };
    
    // Here you would send the error to crash reporting providers like Sentry, Firebase Crashlytics, etc.
    console.error('Error reported:', enrichedReport);
  }
  
  /**
   * Record a performance metric
   * @param metricName The name of the metric
   * @param value The value of the metric
   */
  public recordPerformanceMetric(metricName: string, value: number): void {
    if (!this.config.enablePerformanceMonitoring) return;
    
    this.performanceData[metricName] = value;
    
    // Here you would send the performance metric to performance monitoring providers
    // Performance metric recorded
  }
  
  /**
   * Start timing a performance metric
   * @param metricName The name of the metric to time
   */
  public startPerformanceTimer(metricName: string): void {
    if (!this.config.enablePerformanceMonitoring) return;
    
    const timerKey = `${metricName}_start`;
    this.performanceData[timerKey] = Date.now();
  }
  
  /**
   * Stop timing a performance metric and record the duration
   * @param metricName The name of the metric being timed
   */
  public stopPerformanceTimer(metricName: string): number | null {
    if (!this.config.enablePerformanceMonitoring) return null;
    
    const timerKey = `${metricName}_start`;
    const startTime = this.performanceData[timerKey];
    
    if (!startTime) {
      console.warn(`No start time found for performance timer: ${metricName}`);
      return null;
    }
    
    const duration = Date.now() - startTime;
    this.recordPerformanceMetric(metricName, duration);
    
    // Clean up the start time
    delete this.performanceData[timerKey];
    
    return duration;
  }
  
  /**
   * Mark user activity to keep the session alive
   */
  public markActive(): void {
    this.lastActiveTimestamp = Date.now();
  }
  
  /**
   * Manually refresh the session
   */
  public refreshSession(): void {
    // Generate a new session ID (timestamp + random string)
    this.sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    this.lastActiveTimestamp = Date.now();
    
    // Track session start event
    this.trackEvent({
      name: 'session_start',
      params: {
        session_id: this.sessionId
      }
    });
    
    // New session started
  }
  
  /**
   * Set up monitoring for session timeouts
   */
  private setupSessionMonitoring(): void {
    // Check session expiry every minute
    setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - this.lastActiveTimestamp;
      
      // If inactive for longer than the session timeout, refresh the session
      if (timeSinceLastActivity > this.config.sessionTimeoutSeconds * 1000) {
        // End the previous session
        this.trackEvent({
          name: 'session_end',
          params: {
            session_id: this.sessionId,
            duration_ms: timeSinceLastActivity
          }
        });
        
        // Start a new session
        this.refreshSession();
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Clean up resources when the app is closed
   */
  public shutdown(): void {
    // Track end of session
    this.trackEvent({
      name: 'app_end',
      params: {
        session_id: this.sessionId,
        duration_ms: Date.now() - this.lastActiveTimestamp
      }
    });
    
    // Here you would flush any pending data to analytics providers
    // Analytics service shut down
  }
}

// Create and export a singleton instance
export const analyticsService = new AnalyticsService();

// Export the class for testing or custom instances
export default AnalyticsService; 