import { auth, db, storage, getFirebaseStatus, isFirebaseInitialized } from '../services/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { FirebaseErrorHandler } from './firebaseErrorHandler';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  error?: any;
}

export interface FirebaseHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  timestamp: string;
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export class FirebaseHealthCheck {
  private static readonly TIMEOUT_MS = 10000; // 10 seconds
  private static readonly DEGRADED_THRESHOLD_MS = 3000; // 3 seconds

  /**
   * Run comprehensive health check on all Firebase services
   */
  static async runHealthCheck(): Promise<FirebaseHealthStatus> {
    console.log('🏥 Running Firebase health check...');
    
    const results: HealthCheckResult[] = [];
    
    // Check Firebase initialization
    results.push(await this.checkInitialization());
    
    // Check Authentication service
    results.push(await this.checkAuthentication());
    
    // Check Firestore service
    results.push(await this.checkFirestore());
    
    // Check Storage service
    results.push(await this.checkStorage());
    
    // Check network connectivity
    results.push(await this.checkNetworkConnectivity());
    
    // Calculate overall status
    const summary = this.calculateSummary(results);
    const overall = this.determineOverallStatus(summary);
    
    const healthStatus: FirebaseHealthStatus = {
      overall,
      services: results,
      timestamp: new Date().toISOString(),
      summary
    };
    
    console.log('🏥 Health check complete:', {
      overall,
      summary,
      issues: results.filter(r => r.status !== 'healthy').map(r => r.service)
    });
    
    return healthStatus;
  }

  /**
   * Check Firebase initialization status
   */
  private static async checkInitialization(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const status = getFirebaseStatus();
      const responseTime = Date.now() - startTime;
      
      if (!status.attempted) {
        return {
          service: 'Firebase Initialization',
          status: 'unhealthy',
          message: 'Firebase initialization not attempted',
          responseTime
        };
      }
      
      if (!status.initialized) {
        return {
          service: 'Firebase Initialization',
          status: 'unhealthy',
          message: `Initialization failed: ${status.error?.message || 'Unknown error'}`,
          responseTime,
          error: status.error
        };
      }
      
      const missingServices = [];
      if (!status.services.app) missingServices.push('app');
      if (!status.services.auth) missingServices.push('auth');
      if (!status.services.db) missingServices.push('firestore');
      if (!status.services.storage) missingServices.push('storage');
      
      if (missingServices.length > 0) {
        return {
          service: 'Firebase Initialization',
          status: 'degraded',
          message: `Some services not initialized: ${missingServices.join(', ')}`,
          responseTime
        };
      }
      
      return {
        service: 'Firebase Initialization',
        status: 'healthy',
        message: 'All Firebase services initialized successfully',
        responseTime
      };
      
    } catch (error) {
      return {
        service: 'Firebase Initialization',
        status: 'unhealthy',
        message: `Initialization check failed: ${error}`,
        responseTime: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Check Firebase Authentication service
   */
  private static async checkAuthentication(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!auth) {
        return {
          service: 'Firebase Auth',
          status: 'unhealthy',
          message: 'Auth service not available',
          responseTime: Date.now() - startTime
        };
      }
      
      // Check if we can access current user (this is a lightweight operation)
      const currentUser = auth.currentUser;
      const responseTime = Date.now() - startTime;
      
      const status = responseTime > this.DEGRADED_THRESHOLD_MS ? 'degraded' : 'healthy';
      const message = currentUser 
        ? `Auth service healthy (user: ${currentUser.uid.substring(0, 8)}...)`
        : 'Auth service healthy (no user signed in)';
      
      return {
        service: 'Firebase Auth',
        status,
        message,
        responseTime
      };
      
    } catch (error) {
      return {
        service: 'Firebase Auth',
        status: 'unhealthy',
        message: `Auth check failed: ${error}`,
        responseTime: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Check Firestore service
   */
  private static async checkFirestore(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!db) {
        return {
          service: 'Firestore',
          status: 'unhealthy',
          message: 'Firestore service not available',
          responseTime: Date.now() - startTime
        };
      }
      
      // Try to perform a lightweight read operation
      const testCollection = collection(db, 'globalChat');
      const testQuery = query(testCollection, limit(1));
      
      await Promise.race([
        getDocs(testQuery),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.TIMEOUT_MS)
        )
      ]);
      
      const responseTime = Date.now() - startTime;
      const status = responseTime > this.DEGRADED_THRESHOLD_MS ? 'degraded' : 'healthy';
      
      return {
        service: 'Firestore',
        status,
        message: `Firestore service healthy (${responseTime}ms)`,
        responseTime
      };
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Permission errors are expected for some operations
      if (FirebaseErrorHandler.isPermissionError(error)) {
        return {
          service: 'Firestore',
          status: 'healthy',
          message: 'Firestore service healthy (permission check passed)',
          responseTime
        };
      }
      
      // Network errors indicate degraded service
      if (FirebaseErrorHandler.isNetworkError(error)) {
        return {
          service: 'Firestore',
          status: 'degraded',
          message: `Firestore network issues: ${error.message}`,
          responseTime,
          error
        };
      }
      
      return {
        service: 'Firestore',
        status: 'unhealthy',
        message: `Firestore check failed: ${error.message}`,
        responseTime,
        error
      };
    }
  }

  /**
   * Check Firebase Storage service
   */
  private static async checkStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!storage) {
        return {
          service: 'Firebase Storage',
          status: 'unhealthy',
          message: 'Storage service not available',
          responseTime: Date.now() - startTime
        };
      }
      
      // Storage is available if we can access the service
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'Firebase Storage',
        status: 'healthy',
        message: 'Storage service available',
        responseTime
      };
      
    } catch (error) {
      return {
        service: 'Firebase Storage',
        status: 'unhealthy',
        message: `Storage check failed: ${error}`,
        responseTime: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Check network connectivity
   */
  private static async checkNetworkConnectivity(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Try to fetch a lightweight resource
      const response = await Promise.race([
        fetch('https://www.google.com/favicon.ico', { 
          method: 'HEAD',
          cache: 'no-cache'
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), this.TIMEOUT_MS)
        )
      ]);
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const status = responseTime > this.DEGRADED_THRESHOLD_MS ? 'degraded' : 'healthy';
        return {
          service: 'Network Connectivity',
          status,
          message: `Network connectivity healthy (${responseTime}ms)`,
          responseTime
        };
      } else {
        return {
          service: 'Network Connectivity',
          status: 'degraded',
          message: `Network issues detected (status: ${response.status})`,
          responseTime
        };
      }
      
    } catch (error) {
      return {
        service: 'Network Connectivity',
        status: 'unhealthy',
        message: `Network connectivity failed: ${error}`,
        responseTime: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Calculate summary statistics
   */
  private static calculateSummary(results: HealthCheckResult[]) {
    return results.reduce(
      (acc, result) => {
        acc[result.status]++;
        return acc;
      },
      { healthy: 0, degraded: 0, unhealthy: 0 }
    );
  }

  /**
   * Determine overall status based on individual service results
   */
  private static determineOverallStatus(summary: { healthy: number; degraded: number; unhealthy: number }): 'healthy' | 'degraded' | 'unhealthy' {
    if (summary.unhealthy > 0) {
      return 'unhealthy';
    }
    if (summary.degraded > 0) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Quick health check for critical services only
   */
  static async quickHealthCheck(): Promise<boolean> {
    try {
      const isInitialized = isFirebaseInitialized();
      const hasAuth = !!auth;
      const hasDb = !!db;
      
      return isInitialized && hasAuth && hasDb;
    } catch (error) {
      console.warn('Quick health check failed:', error);
      return false;
    }
  }
}

export default FirebaseHealthCheck;
