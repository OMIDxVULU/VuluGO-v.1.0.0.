/**
 * App Lifecycle Service for VuluGO
 * Handles app state changes and audio session management for live streaming
 */

import { AppState, AppStateStatus } from 'react-native';
import { agoraService } from './agoraService';
import { throttledNetworkLog } from '../utils/loggingThrottle';

export interface AppLifecycleCallbacks {
  onAppStateChange?: (nextAppState: AppStateStatus) => void;
  onStreamInterrupted?: () => void;
  onStreamResumed?: () => void;
  onBackgroundTransition?: () => void;
  onForegroundTransition?: () => void;
}

class AppLifecycleService {
  private static instance: AppLifecycleService;
  private currentAppState: AppStateStatus = AppState.currentState;
  private callbacks: AppLifecycleCallbacks = {};
  private appStateSubscription: any = null;
  private isStreamActive = false;
  private wasStreamActiveBeforeBackground = false;

  private constructor() {
    this.setupAppStateListener();
  }

  static getInstance(): AppLifecycleService {
    if (!AppLifecycleService.instance) {
      AppLifecycleService.instance = new AppLifecycleService();
    }
    return AppLifecycleService.instance;
  }

  /**
   * Set up app state change listener
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
    
    console.log('📱 [LIFECYCLE] App state listener initialized');
  }

  /**
   * Handle app state changes
   */
  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    console.log(`📱 [LIFECYCLE] App state changed: ${this.currentAppState} -> ${nextAppState}`);

    const previousAppState = this.currentAppState;
    this.currentAppState = nextAppState;

    // Notify callbacks
    this.callbacks.onAppStateChange?.(nextAppState);

    try {
      if (nextAppState === 'background') {
        await this.handleBackgroundTransition(previousAppState);
      } else if (nextAppState === 'active') {
        await this.handleForegroundTransition(previousAppState);
      }
    } catch (error) {
      console.error('❌ [LIFECYCLE] Error handling app state change:', error);
    }
  }

  /**
   * Handle app going to background
   */
  private async handleBackgroundTransition(previousState: AppStateStatus): Promise<void> {
    console.log('📱 [LIFECYCLE] App going to background');

    // Check if stream is currently active
    const streamState = agoraService.getStreamState();
    this.wasStreamActiveBeforeBackground = streamState.isJoined;

    if (this.wasStreamActiveBeforeBackground) {
      console.log('🔄 [LIFECYCLE] Stream active during background transition');
      
      // Notify about stream interruption
      this.callbacks.onStreamInterrupted?.();

      // Handle audio session for background streaming
      await this.handleBackgroundAudioSession();
    }

    // Notify callbacks
    this.callbacks.onBackgroundTransition?.();
  }

  /**
   * Handle app coming to foreground
   */
  private async handleForegroundTransition(previousState: AppStateStatus): Promise<void> {
    console.log('📱 [LIFECYCLE] App coming to foreground');

    if (this.wasStreamActiveBeforeBackground) {
      console.log('🔄 [LIFECYCLE] Resuming stream after background');
      
      // Handle audio session restoration
      await this.handleForegroundAudioSession();

      // Notify about stream resumption
      this.callbacks.onStreamResumed?.();
    }

    // Reset background state
    this.wasStreamActiveBeforeBackground = false;

    // Notify callbacks
    this.callbacks.onForegroundTransition?.();
  }

  /**
   * Handle audio session when app goes to background
   */
  private async handleBackgroundAudioSession(): Promise<void> {
    try {
      console.log('🔊 [LIFECYCLE] Configuring audio session for background');

      // Notify Agora service about app state change
      await agoraService.handleAppStateChange('background');

      // For live streaming, we typically want to keep audio active
      // but this depends on your app's requirements
      
      // Option 1: Keep audio active (for hosts)
      const streamState = agoraService.getStreamState();
      const isHost = Array.from(streamState.participants.values())
        .some(p => p.isHost && p.uid === streamState.localUid);

      if (isHost) {
        console.log('🎤 [LIFECYCLE] Keeping audio active for host');
        // Keep microphone active for hosts
      } else {
        console.log('🔇 [LIFECYCLE] Muting audio for participant');
        // Mute audio for participants to save battery
        await agoraService.muteLocalAudio(true);
      }

    } catch (error) {
      console.error('❌ [LIFECYCLE] Error configuring background audio session:', error);
    }
  }

  /**
   * Handle audio session when app comes to foreground
   */
  private async handleForegroundAudioSession(): Promise<void> {
    try {
      console.log('🔊 [LIFECYCLE] Restoring audio session for foreground');

      // Notify Agora service about app state change
      await agoraService.handleAppStateChange('active');

      // Restore previous audio state
      const streamState = agoraService.getStreamState();
      
      // Check if we need to reconnect or restore audio
      if (!streamState.isConnected) {
        console.log('🔄 [LIFECYCLE] Attempting to reconnect stream');
        // The AgoraStreamView component should handle reconnection
      }

    } catch (error) {
      console.error('❌ [LIFECYCLE] Error restoring foreground audio session:', error);
    }
  }

  /**
   * Set callbacks for app lifecycle events
   */
  setCallbacks(callbacks: AppLifecycleCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    console.log('📱 [LIFECYCLE] Callbacks updated');
  }

  /**
   * Update stream active status
   */
  setStreamActive(isActive: boolean): void {
    this.isStreamActive = isActive;
    console.log(`📱 [LIFECYCLE] Stream active status: ${isActive}`);
  }

  /**
   * Get current app state
   */
  getCurrentAppState(): AppStateStatus {
    return this.currentAppState;
  }

  /**
   * Check if app is in background
   */
  isInBackground(): boolean {
    return this.currentAppState === 'background';
  }

  /**
   * Check if app is active
   */
  isActive(): boolean {
    return this.currentAppState === 'active';
  }

  /**
   * Handle audio interruptions (calls, notifications, etc.)
   */
  handleAudioInterruption(type: 'began' | 'ended'): void {
    console.log(`🔊 [LIFECYCLE] Audio interruption ${type}`);

    if (type === 'began') {
      // Audio interruption began (incoming call, etc.)
      this.callbacks.onStreamInterrupted?.();
    } else {
      // Audio interruption ended
      this.callbacks.onStreamResumed?.();
    }
  }

  /**
   * Cleanup and remove listeners
   */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.callbacks = {};
    console.log('📱 [LIFECYCLE] App lifecycle service destroyed');
  }

  /**
   * Handle memory warnings
   */
  handleMemoryWarning(): void {
    console.warn('⚠️ [LIFECYCLE] Memory warning received');
    
    // Could implement memory cleanup here
    // For example, clearing caches, reducing quality, etc.
  }

  /**
   * Handle network state changes
   */
  handleNetworkStateChange(isConnected: boolean): void {
    // Use throttled logging to prevent spam
    throttledNetworkLog(`🌐 [LIFECYCLE] Network state changed: ${isConnected ? 'connected' : 'disconnected'}`);

    if (!isConnected && this.isStreamActive) {
      console.log('📡 [LIFECYCLE] Network disconnected during active stream');
      this.callbacks.onStreamInterrupted?.();
    } else if (isConnected && this.wasStreamActiveBeforeBackground) {
      console.log('📡 [LIFECYCLE] Network reconnected, attempting stream resume');
      this.callbacks.onStreamResumed?.();
    }
  }

  /**
   * Get lifecycle statistics
   */
  getStats(): {
    currentAppState: AppStateStatus;
    isStreamActive: boolean;
    wasStreamActiveBeforeBackground: boolean;
  } {
    return {
      currentAppState: this.currentAppState,
      isStreamActive: this.isStreamActive,
      wasStreamActiveBeforeBackground: this.wasStreamActiveBeforeBackground,
    };
  }
}

export const appLifecycleService = AppLifecycleService.getInstance();
