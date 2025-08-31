/**
 * MemoryOptimizer.ts
 * 
 * Utility class to optimize memory usage in the application,
 * particularly for handling long-running chat sessions and preventing memory leaks.
 */

import { Platform } from 'react-native';
import { analyticsService } from '../services/AnalyticsService';

// Maximum items to keep in memory for list-based components
const DEFAULT_SETTINGS = {
  chatMessageLimit: 100,         // Max chat messages to keep in memory
  messageHistoryLimit: 50,       // Max chat messages to store in history
  imageQualityReduction: 0.8,    // Image quality reduction factor
  debounceThreshold: 300,        // Debounce threshold for frequent operations (ms)
  autoCleanupInterval: 60 * 1000, // Auto cleanup interval (ms)
  inactiveCleanupThreshold: 5 * 60 * 1000, // Time before cleaning up inactive data (ms)
  maxBlobSize: 5 * 1024 * 1024,  // Max blob size to store (5MB)
};

/**
 * Interface for optimizer settings
 */
interface MemoryOptimizerSettings {
  chatMessageLimit: number;
  messageHistoryLimit: number;
  imageQualityReduction: number;
  debounceThreshold: number;
  autoCleanupInterval: number;
  inactiveCleanupThreshold: number;
  maxBlobSize: number;
}

/**
 * MemoryOptimizer class
 * 
 * Provides utilities for managing memory usage and preventing memory leaks
 */
class MemoryOptimizer {
  private settings: MemoryOptimizerSettings;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private inactivityTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private memoryUsage: Record<string, number> = {};
  private cleanupCallbacks: Map<string, () => void> = new Map();
  private isLowMemoryDevice: boolean = false;
  
  constructor(settings: Partial<MemoryOptimizerSettings> = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.detectLowMemoryDevice();
    this.setupAutoCleanup();
  }
  
  /**
   * Detect if running on a low memory device
   */
  private detectLowMemoryDevice(): void {
    // Simple heuristic based on platform
    this.isLowMemoryDevice = Platform.OS === 'android';
    
    // For low memory devices, adjust settings
    if (this.isLowMemoryDevice) {
      this.settings.chatMessageLimit = Math.floor(this.settings.chatMessageLimit * 0.7);
      this.settings.messageHistoryLimit = Math.floor(this.settings.messageHistoryLimit * 0.7);
      this.settings.imageQualityReduction = 0.6;
    }
    
    analyticsService.trackEvent({
      name: 'memory_settings_applied',
      params: {
        isLowMemoryDevice: this.isLowMemoryDevice,
        settings: JSON.stringify(this.settings)
      }
    });
  }
  
  /**
   * Set up automatic cleanup at regular intervals
   */
  private setupAutoCleanup(): void {
    setInterval(() => {
      this.runAllCleanupTasks();
    }, this.settings.autoCleanupInterval);
  }
  
  /**
   * Optimize chat messages by trimming the array to the maximum limit
   * @param messages Array of chat messages
   * @returns Optimized array of chat messages
   */
  public optimizeChatMessages<T>(messages: T[]): T[] {
    if (!messages || messages.length <= this.settings.chatMessageLimit) {
      return messages;
    }
    
    // Keep the latest messages up to the limit
    const optimizedMessages = messages.slice(-this.settings.chatMessageLimit);
    
    analyticsService.recordPerformanceMetric('chat_messages_trimmed', messages.length - optimizedMessages.length);
    
    return optimizedMessages;
  }
  
  /**
   * Debounce a function call
   * @param key Unique identifier for the debounced function
   * @param fn Function to debounce
   * @param delay Delay in milliseconds
   */
  public debounce(key: string, fn: () => void, delay: number = this.settings.debounceThreshold): void {
    // Clear existing timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    
    // Set new timer
    const timerId = setTimeout(() => {
      fn();
      this.debounceTimers.delete(key);
    }, delay);
    
    this.debounceTimers.set(key, timerId);
  }
  
  /**
   * Register a cleanup function to be called during memory optimization
   * @param key Unique identifier for the cleanup task
   * @param callback Function to call for cleanup
   */
  public registerCleanupTask(key: string, callback: () => void): void {
    this.cleanupCallbacks.set(key, callback);
    analyticsService.trackEvent({
      name: 'cleanup_task_registered',
      params: { key }
    });
  }
  
  /**
   * Unregister a cleanup task
   * @param key Unique identifier for the cleanup task
   */
  public unregisterCleanupTask(key: string): void {
    this.cleanupCallbacks.delete(key);
  }
  
  /**
   * Run all registered cleanup tasks
   */
  public runAllCleanupTasks(): void {
    analyticsService.startPerformanceTimer('cleanup_tasks');
    
    this.cleanupCallbacks.forEach((callback, key) => {
      try {
        callback();
      } catch (error) {
        console.error(`Error in cleanup task ${key}:`, error);
        analyticsService.reportError({
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { cleanup_task: key }
        });
      }
    });
    
    analyticsService.stopPerformanceTimer('cleanup_tasks');
    analyticsService.trackEvent({
      name: 'cleanup_tasks_completed',
      params: { 
        task_count: this.cleanupCallbacks.size
      }
    });
  }
  
  /**
   * Reset inactivity timer for a component/screen
   * @param key Unique identifier for the component/screen
   * @param callback Function to call when component becomes inactive
   */
  public resetInactivityTimer(key: string, callback: () => void): void {
    // Clear existing timer
    if (this.inactivityTimers.has(key)) {
      clearTimeout(this.inactivityTimers.get(key));
    }
    
    // Set new timer
    const timerId = setTimeout(() => {
      callback();
      this.inactivityTimers.delete(key);
      analyticsService.trackEvent({
        name: 'component_inactive_cleanup',
        params: { key }
      });
    }, this.settings.inactiveCleanupThreshold);
    
    this.inactivityTimers.set(key, timerId);
  }
  
  /**
   * Track memory usage for a specific component/feature
   * @param key Unique identifier for the component/feature
   * @param sizeInBytes Size in bytes
   */
  public trackMemoryUsage(key: string, sizeInBytes: number): void {
    this.memoryUsage[key] = sizeInBytes;
    
    analyticsService.recordPerformanceMetric(`memory_${key}`, sizeInBytes / 1024 / 1024); // Convert to MB
    
    // Flag high memory usage
    if (sizeInBytes > this.settings.maxBlobSize) {
      analyticsService.trackEvent({
        name: 'high_memory_usage',
        params: {
          key,
          size_mb: sizeInBytes / 1024 / 1024,
          threshold_mb: this.settings.maxBlobSize / 1024 / 1024
        }
      });
    }
  }
  
  /**
   * Get the current memory usage summary
   * @returns Object with memory usage information
   */
  public getMemoryUsageSummary(): Record<string, number> {
    return { ...this.memoryUsage };
  }
  
  /**
   * Get the total tracked memory usage
   * @returns Total memory usage in bytes
   */
  public getTotalMemoryUsage(): number {
    return Object.values(this.memoryUsage).reduce((total, size) => total + size, 0);
  }
  
  /**
   * Check if a component is consuming excessive memory
   * @param key Unique identifier for the component/feature
   * @returns Boolean indicating if memory usage is excessive
   */
  public isMemoryUsageExcessive(key: string): boolean {
    const usage = this.memoryUsage[key] || 0;
    return usage > this.settings.maxBlobSize;
  }
  
  /**
   * Clean up resources and prepare for unmount
   */
  public cleanup(): void {
    // Clear all debounce timers
    this.debounceTimers.forEach(timerId => clearTimeout(timerId));
    this.debounceTimers.clear();
    
    // Clear all inactivity timers
    this.inactivityTimers.forEach(timerId => clearTimeout(timerId));
    this.inactivityTimers.clear();
    
    // Run all cleanup tasks
    this.runAllCleanupTasks();
    
    // Track cleanup event
    analyticsService.trackEvent({
      name: 'memory_optimizer_cleanup',
      params: {
        total_memory_tracked: this.getTotalMemoryUsage()
      }
    });
  }
}

// Create a singleton instance
export const memoryOptimizer = new MemoryOptimizer();

// Export the class for testing or creating custom instances
export default MemoryOptimizer; 