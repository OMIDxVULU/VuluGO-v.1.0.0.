import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

export interface SessionConfig {
  inactivityTimeoutMinutes: number;
  backgroundTimeoutMinutes: number;
  maxSessionDurationHours: number;
  enableAutoLogout: boolean;
}

export interface SessionData {
  lastActiveTime: number;
  sessionStartTime: number;
  backgroundTime?: number;
  isActive: boolean;
}

class SessionService {
  private static instance: SessionService;
  private config: SessionConfig;
  private sessionData: SessionData | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private backgroundTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private onSessionExpired: (() => void) | null = null;
  private isInitialized = false;
  private isInitializing = false;

  private readonly SESSION_STORAGE_KEY = '@vulugo_session_data';

  private constructor() {
    this.config = {
      inactivityTimeoutMinutes: 30, // 30 minutes of inactivity
      backgroundTimeoutMinutes: 15, // 15 minutes in background
      maxSessionDurationHours: 24, // 24 hours max session
      enableAutoLogout: true,
    };
  }

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  public async initialize(onSessionExpired?: () => void): Promise<void> {
    if (this.isInitialized || this.isInitializing) return;

    this.isInitializing = true;

    try {
      this.onSessionExpired = onSessionExpired || null;

      // Load existing session data
      await this.loadSessionData();

      // Set up app state monitoring
      this.setupAppStateMonitoring();

      // Check if existing session is still valid
      if (this.sessionData) {
        const isValid = this.isSessionValid();
        if (!isValid) {
          await this.expireSession();
          return;
        }
      }

      // Start new session if none exists
      if (!this.sessionData) {
        await this.startSession();
      }

      // Set up timers
      this.setupInactivityTimer();

      this.isInitialized = true;
    } finally {
      this.isInitializing = false;
    }
  }

  public async startSession(): Promise<void> {
    const now = Date.now();
    this.sessionData = {
      lastActiveTime: now,
      sessionStartTime: now,
      isActive: true,
    };
    
    await this.saveSessionData();
    this.setupInactivityTimer();
  }

  public async updateActivity(): Promise<void> {
    if (!this.sessionData || !this.config.enableAutoLogout) return;
    
    const now = Date.now();
    this.sessionData.lastActiveTime = now;
    this.sessionData.isActive = true;
    
    await this.saveSessionData();
    
    // Reset inactivity timer
    this.setupInactivityTimer();
  }

  public async endSession(): Promise<void> {
    this.clearTimers();
    this.sessionData = null;
    await AsyncStorage.removeItem(this.SESSION_STORAGE_KEY);
  }

  public getSessionData(): SessionData | null {
    return this.sessionData;
  }

  public updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): SessionConfig {
    return { ...this.config };
  }

  private async loadSessionData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.SESSION_STORAGE_KEY);
      if (stored) {
        this.sessionData = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load session data:', error);
      this.sessionData = null;
    }
  }

  private async saveSessionData(): Promise<void> {
    if (!this.sessionData) return;
    
    try {
      await AsyncStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(this.sessionData));
    } catch (error) {
      console.warn('Failed to save session data:', error);
    }
  }

  private isSessionValid(): boolean {
    if (!this.sessionData || !this.config.enableAutoLogout) return true;
    
    const now = Date.now();
    const { lastActiveTime, sessionStartTime, backgroundTime } = this.sessionData;
    
    // Check max session duration
    const sessionDuration = now - sessionStartTime;
    const maxSessionMs = this.config.maxSessionDurationHours * 60 * 60 * 1000;
    if (sessionDuration > maxSessionMs) {
      return false;
    }
    
    // Check inactivity timeout
    const inactivityDuration = now - lastActiveTime;
    const inactivityTimeoutMs = this.config.inactivityTimeoutMinutes * 60 * 1000;
    if (inactivityDuration > inactivityTimeoutMs) {
      return false;
    }
    
    // Check background timeout
    if (backgroundTime) {
      const backgroundDuration = now - backgroundTime;
      const backgroundTimeoutMs = this.config.backgroundTimeoutMinutes * 60 * 1000;
      if (backgroundDuration > backgroundTimeoutMs) {
        return false;
      }
    }
    
    return true;
  }

  private setupInactivityTimer(): void {
    this.clearTimers();
    
    if (!this.config.enableAutoLogout) return;
    
    const timeoutMs = this.config.inactivityTimeoutMinutes * 60 * 1000;
    this.inactivityTimer = setTimeout(() => {
      this.expireSession();
    }, timeoutMs);
  }

  private setupAppStateMonitoring(): void {
    if (this.appStateSubscription) return;
    
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    if (!this.sessionData || !this.config.enableAutoLogout) return;
    
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background
      this.sessionData.backgroundTime = Date.now();
      this.sessionData.isActive = false;
      await this.saveSessionData();
      
      // Set background timeout
      const timeoutMs = this.config.backgroundTimeoutMinutes * 60 * 1000;
      this.backgroundTimer = setTimeout(() => {
        this.expireSession().catch((error) => {
          console.warn('Error during background session expiration:', error);
        });
      }, timeoutMs);
      
    } else if (nextAppState === 'active') {
      // App came to foreground
      this.clearBackgroundTimer();
      
      if (this.sessionData.backgroundTime) {
        const backgroundDuration = Date.now() - this.sessionData.backgroundTime;
        const backgroundTimeoutMs = this.config.backgroundTimeoutMinutes * 60 * 1000;
        
        if (backgroundDuration > backgroundTimeoutMs) {
          await this.expireSession();
          return;
        }
      }
      
      // Update activity and resume session
      await this.updateActivity();
    }
  }

  private async expireSession(): Promise<void> {
    await this.endSession();
    
    if (this.onSessionExpired) {
      this.onSessionExpired();
    }
  }

  private clearTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    
    this.clearBackgroundTimer();
  }

  private clearBackgroundTimer(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }

  public cleanup(): void {
    this.clearTimers();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    this.isInitialized = false;
    this.isInitializing = false;
  }
}

export const sessionService = SessionService.getInstance();
export default sessionService;
