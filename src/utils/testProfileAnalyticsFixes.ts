/**
 * Test script to verify Firebase permission fixes for profile analytics
 * This script tests the graceful degradation for guest users
 */

import { profileAnalyticsService } from '../services/profileAnalyticsService';
import FirebaseErrorHandler from './firebaseErrorHandler';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  error?: any;
}

class ProfileAnalyticsTestSuite {
  private results: TestResult[] = [];

  private addResult(testName: string, passed: boolean, message: string, error?: any) {
    this.results.push({ testName, passed, message, error });
    console.log(`${passed ? '✅' : '❌'} ${testName}: ${message}`);
    if (error && !passed) {
      console.error('Error details:', error);
    }
  }

  /**
   * Test getProfileViews with guest user (should return empty array, not throw)
   */
  async testGetProfileViewsAsGuest(): Promise<void> {
    try {
      const testUserId = 'test_user_123';
      const views = await profileAnalyticsService.getProfileViews(testUserId);
      
      if (Array.isArray(views) && views.length === 0) {
        this.addResult(
          'getProfileViews (Guest User)',
          true,
          'Successfully returned empty array for guest user'
        );
      } else {
        this.addResult(
          'getProfileViews (Guest User)',
          false,
          `Expected empty array, got: ${JSON.stringify(views)}`
        );
      }
    } catch (error: any) {
      // Should not throw for guest users
      this.addResult(
        'getProfileViews (Guest User)',
        false,
        'Should not throw error for guest users',
        error
      );
    }
  }

  /**
   * Test getProfileViewers with guest user (should return empty array, not throw)
   */
  async testGetProfileViewersAsGuest(): Promise<void> {
    try {
      const testUserId = 'test_user_123';
      const viewers = await profileAnalyticsService.getProfileViewers(testUserId);
      
      if (Array.isArray(viewers) && viewers.length === 0) {
        this.addResult(
          'getProfileViewers (Guest User)',
          true,
          'Successfully returned empty array for guest user'
        );
      } else {
        this.addResult(
          'getProfileViewers (Guest User)',
          false,
          `Expected empty array, got: ${JSON.stringify(viewers)}`
        );
      }
    } catch (error: any) {
      // Should not throw for guest users
      this.addResult(
        'getProfileViewers (Guest User)',
        false,
        'Should not throw error for guest users',
        error
      );
    }
  }

  /**
   * Test getProfileAnalytics with guest user (should return default analytics, not throw)
   */
  async testGetProfileAnalyticsAsGuest(): Promise<void> {
    try {
      const testUserId = 'test_user_123';
      const analytics = await profileAnalyticsService.getProfileAnalytics(testUserId);
      
      if (analytics && analytics.totalViews === 0 && analytics.uniqueViewers === 0) {
        this.addResult(
          'getProfileAnalytics (Guest User)',
          true,
          'Successfully returned default analytics for guest user'
        );
      } else {
        this.addResult(
          'getProfileAnalytics (Guest User)',
          false,
          `Expected default analytics, got: ${JSON.stringify(analytics)}`
        );
      }
    } catch (error: any) {
      // Should not throw for guest users
      this.addResult(
        'getProfileAnalytics (Guest User)',
        false,
        'Should not throw error for guest users',
        error
      );
    }
  }

  /**
   * Test recordProfileView with guest user (should not throw, should return empty string)
   */
  async testRecordProfileViewAsGuest(): Promise<void> {
    try {
      const profileOwnerId = 'test_owner_123';
      const viewerData = {
        viewerId: 'guest_viewer_123',
        viewerName: 'Guest User',
        viewerAvatar: 'https://via.placeholder.com/150',
        isGhostMode: false,
        isPremiumViewer: false
      };
      
      const result = await profileAnalyticsService.recordProfileView(profileOwnerId, viewerData);
      
      if (result === '') {
        this.addResult(
          'recordProfileView (Guest User)',
          true,
          'Successfully skipped recording for guest user'
        );
      } else {
        this.addResult(
          'recordProfileView (Guest User)',
          false,
          `Expected empty string, got: ${result}`
        );
      }
    } catch (error: any) {
      // Should not throw for guest users
      this.addResult(
        'recordProfileView (Guest User)',
        false,
        'Should not throw error for guest users',
        error
      );
    }
  }

  /**
   * Test FirebaseErrorHandler.isPermissionError utility
   */
  testPermissionErrorDetection(): void {
    const permissionError = { code: 'permission-denied', message: 'Missing or insufficient permissions' };
    const networkError = { code: 'unavailable', message: 'Service unavailable' };
    const unknownError = { message: 'Unknown error' };

    const isPermissionDetected = FirebaseErrorHandler.isPermissionError(permissionError);
    const isNetworkNotDetected = !FirebaseErrorHandler.isPermissionError(networkError);
    const isUnknownNotDetected = !FirebaseErrorHandler.isPermissionError(unknownError);

    if (isPermissionDetected && isNetworkNotDetected && isUnknownNotDetected) {
      this.addResult(
        'Permission Error Detection',
        true,
        'FirebaseErrorHandler.isPermissionError works correctly'
      );
    } else {
      this.addResult(
        'Permission Error Detection',
        false,
        'FirebaseErrorHandler.isPermissionError not working correctly'
      );
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Profile Analytics Permission Fixes Test Suite...\n');

    // Test permission error detection utility
    this.testPermissionErrorDetection();

    // Test all profile analytics methods with guest user simulation
    await this.testGetProfileViewsAsGuest();
    await this.testGetProfileViewersAsGuest();
    await this.testGetProfileAnalyticsAsGuest();
    await this.testRecordProfileViewAsGuest();

    // Summary
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Profile analytics permission fixes are working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the issues above.');
    }

    return this.results;
  }

  /**
   * Get test results summary
   */
  getResultsSummary(): { passed: number; failed: number; total: number } {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    return { passed, failed, total: this.results.length };
  }
}

// Export the test suite
export const profileAnalyticsTestSuite = new ProfileAnalyticsTestSuite();

// Export function to run tests
export const runProfileAnalyticsTests = async (): Promise<TestResult[]> => {
  return await profileAnalyticsTestSuite.runAllTests();
};

export default ProfileAnalyticsTestSuite;
