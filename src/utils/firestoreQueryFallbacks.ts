/**
 * Firestore Query Fallbacks
 * Provides immediate functionality while composite indexes propagate
 */

import { getFirebaseServices } from '../services/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';

interface QueryFallbackOptions {
  maxRetries?: number;
  fallbackLimit?: number;
  useSimpleQueries?: boolean;
}

class FirestoreQueryFallbacks {
  /**
   * Get purchases with fallback to simple queries
   */
  static async getPurchases(
    userId: string, 
    options: QueryFallbackOptions = {}
  ): Promise<any[]> {
    const { fallbackLimit = 50, useSimpleQueries = true } = options;
    
    try {
      const { db } = getFirebaseServices();
      if (!db) throw new Error('Firebase not initialized');

      // Try the full composite query first
      const purchasesRef = collection(db, 'purchases');
      const fullQuery = query(
        purchasesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(fallbackLimit)
      );
      
      const snapshot = await getDocs(fullQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
    } catch (error: any) {
      if (error.message?.includes('query requires an index') && useSimpleQueries) {
        console.log('🔄 Using fallback query for purchases...');
        return this.getPurchasesFallback(userId, fallbackLimit);
      }
      throw error;
    }
  }

  /**
   * Fallback: Get purchases with simple query (no ordering)
   */
  private static async getPurchasesFallback(userId: string, limitCount: number): Promise<any[]> {
    try {
      const { db } = getFirebaseServices();
      if (!db) return [];

      const purchasesRef = collection(db, 'purchases');
      const simpleQuery = query(
        purchasesRef,
        where('userId', '==', userId),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(simpleQuery);
      const purchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort client-side as fallback
      return purchases.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
        return bTime.getTime() - aTime.getTime();
      });
      
    } catch (error) {
      console.warn('❌ Purchases fallback failed:', error);
      return [];
    }
  }

  /**
   * Get music activities with fallback
   */
  static async getMusicActivities(
    userId?: string,
    isCurrentlyPlaying?: boolean,
    options: QueryFallbackOptions = {}
  ): Promise<any[]> {
    const { fallbackLimit = 20, useSimpleQueries = true } = options;
    
    try {
      const { db } = getFirebaseServices();
      if (!db) throw new Error('Firebase not initialized');

      const activitiesRef = collection(db, 'musicActivities');
      let fullQuery;
      
      if (userId && isCurrentlyPlaying !== undefined) {
        // Full composite query
        fullQuery = query(
          activitiesRef,
          where('isCurrentlyPlaying', '==', isCurrentlyPlaying),
          where('userId', '==', userId),
          orderBy('startTime', 'desc'),
          limit(fallbackLimit)
        );
      } else if (isCurrentlyPlaying !== undefined) {
        // Partial query
        fullQuery = query(
          activitiesRef,
          where('isCurrentlyPlaying', '==', isCurrentlyPlaying),
          orderBy('startTime', 'desc'),
          limit(fallbackLimit)
        );
      } else {
        // Simple query
        fullQuery = query(activitiesRef, limit(fallbackLimit));
      }
      
      const snapshot = await getDocs(fullQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
    } catch (error: any) {
      if (error.message?.includes('query requires an index') && useSimpleQueries) {
        console.log('🔄 Using fallback query for music activities...');
        return this.getMusicActivitiesFallback(userId, isCurrentlyPlaying, fallbackLimit);
      }
      throw error;
    }
  }

  /**
   * Fallback: Get music activities with simple queries
   */
  private static async getMusicActivitiesFallback(
    userId?: string,
    isCurrentlyPlaying?: boolean,
    limitCount: number = 20
  ): Promise<any[]> {
    try {
      const { db } = getFirebaseServices();
      if (!db) return [];

      const activitiesRef = collection(db, 'musicActivities');
      let simpleQuery;
      
      if (userId) {
        simpleQuery = query(
          activitiesRef,
          where('userId', '==', userId),
          limit(limitCount)
        );
      } else if (isCurrentlyPlaying !== undefined) {
        simpleQuery = query(
          activitiesRef,
          where('isCurrentlyPlaying', '==', isCurrentlyPlaying),
          limit(limitCount)
        );
      } else {
        simpleQuery = query(activitiesRef, limit(limitCount));
      }
      
      const snapshot = await getDocs(simpleQuery);
      let activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Apply client-side filtering and sorting
      if (isCurrentlyPlaying !== undefined) {
        activities = activities.filter(activity => activity.isCurrentlyPlaying === isCurrentlyPlaying);
      }
      
      activities.sort((a, b) => {
        const aTime = a.startTime?.toDate?.() || new Date(a.startTime || 0);
        const bTime = b.startTime?.toDate?.() || new Date(b.startTime || 0);
        return bTime.getTime() - aTime.getTime();
      });
      
      return activities.slice(0, limitCount);
      
    } catch (error) {
      console.warn('❌ Music activities fallback failed:', error);
      return [];
    }
  }

  /**
   * Get products with fallback
   */
  static async getProducts(options: QueryFallbackOptions = {}): Promise<any[]> {
    const { fallbackLimit = 50, useSimpleQueries = true } = options;
    
    try {
      const { db } = getFirebaseServices();
      if (!db) throw new Error('Firebase not initialized');

      const productsRef = collection(db, 'products');
      const fullQuery = query(
        productsRef,
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(fallbackLimit)
      );
      
      const snapshot = await getDocs(fullQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
    } catch (error: any) {
      if (error.message?.includes('query requires an index') && useSimpleQueries) {
        console.log('🔄 Using fallback query for products...');
        return this.getProductsFallback(fallbackLimit);
      }
      throw error;
    }
  }

  /**
   * Fallback: Get products with simple query
   */
  private static async getProductsFallback(limitCount: number): Promise<any[]> {
    try {
      const { db } = getFirebaseServices();
      if (!db) return [];

      const productsRef = collection(db, 'products');
      const simpleQuery = query(
        productsRef,
        where('isActive', '==', true),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(simpleQuery);
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort client-side
      return products.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime.getTime() - aTime.getTime();
      });
      
    } catch (error) {
      console.warn('❌ Products fallback failed:', error);
      return [];
    }
  }

  /**
   * Get notifications with fallback
   */
  static async getNotifications(userId: string, options: QueryFallbackOptions = {}): Promise<any[]> {
    const { fallbackLimit = 30, useSimpleQueries = true } = options;
    
    try {
      const { db } = getFirebaseServices();
      if (!db) throw new Error('Firebase not initialized');

      const notificationsRef = collection(db, 'notifications');
      const fullQuery = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(fallbackLimit)
      );
      
      const snapshot = await getDocs(fullQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
    } catch (error: any) {
      if (error.message?.includes('query requires an index') && useSimpleQueries) {
        console.log('🔄 Using fallback query for notifications...');
        return this.getNotificationsFallback(userId, fallbackLimit);
      }
      throw error;
    }
  }

  /**
   * Fallback: Get notifications with simple query
   */
  private static async getNotificationsFallback(userId: string, limitCount: number): Promise<any[]> {
    try {
      const { db } = getFirebaseServices();
      if (!db) return [];

      const notificationsRef = collection(db, 'notifications');
      const simpleQuery = query(
        notificationsRef,
        where('userId', '==', userId),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(simpleQuery);
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort client-side
      return notifications.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
        return bTime.getTime() - aTime.getTime();
      });
      
    } catch (error) {
      console.warn('❌ Notifications fallback failed:', error);
      return [];
    }
  }
}

export default FirestoreQueryFallbacks;
