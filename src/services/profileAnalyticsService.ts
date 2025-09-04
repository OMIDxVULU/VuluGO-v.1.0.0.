import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
  increment,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';
import notificationService from './notificationService';

// Profile view interfaces
export interface ProfileView {
  id: string;
  profileOwnerId: string;
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
  timestamp: Date;
  isGhostMode: boolean;
  isPremiumViewer: boolean;
  visitCount: number;
  sessionDuration?: number; // in seconds
  deviceInfo?: {
    platform: string;
    userAgent?: string;
  };
}

export interface ProfileAnalytics {
  profileOwnerId: string;
  totalViews: number;
  dailyViews: number;
  weeklyViews: number;
  monthlyViews: number;
  uniqueViewers: number;
  averageSessionDuration: number;
  topViewers: Array<{
    viewerId: string;
    viewerName: string;
    viewerAvatar?: string;
    viewCount: number;
    lastViewed: Date;
  }>;
  viewsByDay: Array<{
    date: string;
    views: number;
  }>;
  lastUpdated: Date;
}

export interface ProfileViewer {
  id: string;
  name: string;
  username: string;
  profileImage: string;
  viewCount: number;
  lastViewed: Date;
  isGhostMode?: boolean;
  isPremiumViewer?: boolean;
}

class ProfileAnalyticsService {
  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  private isGuestUser(): boolean {
    // Check if current user is a guest user
    const currentUser = auth?.currentUser;
    if (!currentUser) return true; // No user means guest

    // Check for guest user ID pattern
    if (currentUser.uid?.startsWith('guest_')) return true;

    // Check for anonymous authentication
    if (currentUser.isAnonymous) return true;

    return false;
  }

  private shouldSkipFirestoreOperation(): boolean {
    // Skip Firestore operations for guest users to prevent permission errors
    return !this.isAuthenticated() || this.isGuestUser();
  }

  /**
   * Record a profile view
   */
  async recordProfileView(
    profileOwnerId: string,
    viewerData: {
      viewerId: string;
      viewerName: string;
      viewerAvatar?: string;
      isGhostMode?: boolean;
      isPremiumViewer?: boolean;
      sessionDuration?: number;
      deviceInfo?: any;
    }
  ): Promise<string> {
    try {
      // Don't record self-views
      if (profileOwnerId === viewerData.viewerId) {
        return '';
      }

      // Check if user should skip Firestore operations (guest users)
      if (this.shouldSkipFirestoreOperation()) {
        console.warn('Skipping recordProfileView for guest user');
        return '';
      }

      // Check if this viewer has viewed this profile before
      const existingViewQuery = query(
        collection(db, 'profileViews'),
        where('profileOwnerId', '==', profileOwnerId),
        where('viewerId', '==', viewerData.viewerId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const existingViews = await getDocs(existingViewQuery);
      let visitCount = 1;

      if (!existingViews.empty) {
        const lastView = existingViews.docs[0].data();
        visitCount = (lastView.visitCount || 0) + 1;
      }

      // Create new profile view record
      const profileView: Omit<ProfileView, 'id'> = {
        profileOwnerId,
        viewerId: viewerData.viewerId,
        viewerName: viewerData.viewerName,
        viewerAvatar: viewerData.viewerAvatar,
        timestamp: serverTimestamp() as any,
        isGhostMode: viewerData.isGhostMode || false,
        isPremiumViewer: viewerData.isPremiumViewer || false,
        visitCount,
        sessionDuration: viewerData.sessionDuration,
        deviceInfo: viewerData.deviceInfo
      };

      const docRef = await addDoc(collection(db, 'profileViews'), profileView);

      // Update profile analytics
      await this.updateProfileAnalytics(profileOwnerId);

      // Create notification for profile owner (if not ghost mode)
      if (!viewerData.isGhostMode) {
        await notificationService.createProfileViewNotification(
          profileOwnerId,
          viewerData.viewerId,
          viewerData.viewerName,
          viewerData.viewerAvatar,
          false,
          viewerData.isPremiumViewer || false,
          visitCount
        );
      }

      return docRef.id;
    } catch (error: any) {
      FirebaseErrorHandler.logError('recordProfileView', error);
      throw new Error(`Failed to record profile view: ${error.message}`);
    }
  }

  /**
   * Get profile views for a user
   */
  async getProfileViews(profileOwnerId: string, limitCount: number = 50): Promise<ProfileView[]> {
    try {
      // Check if user should skip Firestore operations (guest users)
      if (this.shouldSkipFirestoreOperation()) {
        console.warn('Skipping getProfileViews for guest user - returning empty array');
        return [];
      }

      // Check if current user has permission to view this profile's analytics
      const currentUserId = this.getCurrentUserId();
      if (!currentUserId || currentUserId !== profileOwnerId) {
        console.warn('User does not have permission to view profile analytics for this user');
        return [];
      }

      const q = query(
        collection(db, 'profileViews'),
        where('profileOwnerId', '==', profileOwnerId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const views: ProfileView[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        views.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as ProfileView);
      });

      return views;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getProfileViews - returning empty array for guest user');
        return [];
      }

      FirebaseErrorHandler.logError('getProfileViews', error);
      throw new Error(`Failed to get profile views: ${error.message}`);
    }
  }

  /**
   * Listen to real-time profile views
   */
  onProfileViews(profileOwnerId: string, callback: (views: ProfileView[]) => void): () => void {
    try {
      const q = query(
        collection(db, 'profileViews'),
        where('profileOwnerId', '==', profileOwnerId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      return onSnapshot(q, (querySnapshot) => {
        const views: ProfileView[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          views.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          } as ProfileView);
        });

        callback(views);
      }, (error) => {
        // Handle permission errors gracefully for guest users
        if (FirebaseErrorHandler.isPermissionError(error)) {
          console.warn('Permission denied for onProfileViews - returning empty array for guest user');
          callback([]);
          return;
        }

        console.error('Profile views listener error:', error);
        FirebaseErrorHandler.logError('onProfileViews', error);
        callback([]);
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('onProfileViews', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Get profile analytics
   */
  async getProfileAnalytics(profileOwnerId: string): Promise<ProfileAnalytics | null> {
    try {
      const analyticsRef = doc(db, 'profileAnalytics', profileOwnerId);
      const analyticsDoc = await getDoc(analyticsRef);

      if (!analyticsDoc.exists()) {
        // Create initial analytics if they don't exist
        await this.updateProfileAnalytics(profileOwnerId);
        return await this.getProfileAnalytics(profileOwnerId);
      }

      const data = analyticsDoc.data();
      return {
        ...data,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        topViewers: data.topViewers?.map((viewer: any) => ({
          ...viewer,
          lastViewed: viewer.lastViewed?.toDate() || new Date()
        })) || [],
        viewsByDay: data.viewsByDay || []
      } as ProfileAnalytics;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getProfileAnalytics - returning empty analytics for guest user');
        return {
          userId: profileOwnerId,
          totalViews: 0,
          uniqueViewers: 0,
          viewsToday: 0,
          viewsThisWeek: 0,
          viewsThisMonth: 0,
          topViewers: [],
          viewsByDay: [],
          lastUpdated: new Date()
        };
      }

      FirebaseErrorHandler.logError('getProfileAnalytics', error);
      throw new Error(`Failed to get profile analytics: ${error.message}`);
    }
  }

  /**
   * Update profile analytics (called after each view)
   */
  private async updateProfileAnalytics(profileOwnerId: string): Promise<void> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all views for analytics calculation
      const allViewsQuery = query(
        collection(db, 'profileViews'),
        where('profileOwnerId', '==', profileOwnerId)
      );

      const allViews = await getDocs(allViewsQuery);
      const views: ProfileView[] = [];

      allViews.forEach((doc) => {
        const data = doc.data();
        views.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as ProfileView);
      });

      // Calculate analytics
      const totalViews = views.length;
      const dailyViews = views.filter(view => 
        view.timestamp.toISOString().split('T')[0] === today
      ).length;
      const weeklyViews = views.filter(view => view.timestamp >= weekAgo).length;
      const monthlyViews = views.filter(view => view.timestamp >= monthAgo).length;

      // Calculate unique viewers
      const uniqueViewers = new Set(views.map(view => view.viewerId)).size;

      // Calculate average session duration
      const sessionsWithDuration = views.filter(view => view.sessionDuration);
      const averageSessionDuration = sessionsWithDuration.length > 0
        ? sessionsWithDuration.reduce((sum, view) => sum + (view.sessionDuration || 0), 0) / sessionsWithDuration.length
        : 0;

      // Calculate top viewers
      const viewerCounts = new Map<string, { count: number; lastViewed: Date; name: string; avatar?: string }>();
      views.forEach(view => {
        const existing = viewerCounts.get(view.viewerId);
        if (existing) {
          existing.count++;
          if (view.timestamp > existing.lastViewed) {
            existing.lastViewed = view.timestamp;
          }
        } else {
          viewerCounts.set(view.viewerId, {
            count: 1,
            lastViewed: view.timestamp,
            name: view.viewerName,
            avatar: view.viewerAvatar
          });
        }
      });

      const topViewers = Array.from(viewerCounts.entries())
        .map(([viewerId, data]) => ({
          viewerId,
          viewerName: data.name,
          viewerAvatar: data.avatar,
          viewCount: data.count,
          lastViewed: data.lastViewed
        }))
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 10);

      // Calculate views by day (last 30 days)
      const viewsByDay = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayViews = views.filter(view => 
          view.timestamp.toISOString().split('T')[0] === dateStr
        ).length;
        
        viewsByDay.push({
          date: dateStr,
          views: dayViews
        });
      }

      // Update analytics document
      const analyticsRef = doc(db, 'profileAnalytics', profileOwnerId);
      const analyticsData: Omit<ProfileAnalytics, 'lastUpdated'> & { lastUpdated: any } = {
        profileOwnerId,
        totalViews,
        dailyViews,
        weeklyViews,
        monthlyViews,
        uniqueViewers,
        averageSessionDuration,
        topViewers,
        viewsByDay,
        lastUpdated: serverTimestamp()
      };

      await setDoc(analyticsRef, analyticsData, { merge: true });

    } catch (error: any) {
      // Don't throw error for analytics updates to avoid blocking main operations
      console.warn('Failed to update profile analytics:', error);
    }
  }

  /**
   * Get profile viewers in the format expected by the UI
   */
  async getProfileViewers(profileOwnerId: string): Promise<ProfileViewer[]> {
    try {
      // Check if user should skip Firestore operations (guest users)
      if (this.shouldSkipFirestoreOperation()) {
        console.warn('Skipping getProfileViewers for guest user - returning empty array');
        return [];
      }

      // Check if current user has permission to view this profile's analytics
      const currentUserId = this.getCurrentUserId();
      if (!currentUserId || currentUserId !== profileOwnerId) {
        console.warn('User does not have permission to view profile viewers for this user');
        return [];
      }

      const views = await this.getProfileViews(profileOwnerId, 100);

      // Group by viewer and get latest info
      const viewerMap = new Map<string, ProfileViewer>();

      views.forEach(view => {
        const existing = viewerMap.get(view.viewerId);
        if (!existing || view.timestamp > existing.lastViewed) {
          viewerMap.set(view.viewerId, {
            id: view.viewerId,
            name: view.viewerName,
            username: `@${view.viewerName.toLowerCase().replace(/\s+/g, '')}`,
            profileImage: view.viewerAvatar || 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=U',
            viewCount: view.visitCount,
            lastViewed: view.timestamp,
            isGhostMode: view.isGhostMode,
            isPremiumViewer: view.isPremiumViewer
          });
        }
      });

      return Array.from(viewerMap.values())
        .sort((a, b) => b.lastViewed.getTime() - a.lastViewed.getTime());
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getProfileViewers - returning empty array for guest user');
        return [];
      }

      FirebaseErrorHandler.logError('getProfileViewers', error);
      throw new Error(`Failed to get profile viewers: ${error.message}`);
    }
  }
}

export const profileAnalyticsService = new ProfileAnalyticsService();
export default profileAnalyticsService;
