/**
 * Firebase Operation Wrapper
 * Provides reliable Firebase operations with connection management, error handling, and data sanitization
 */

import { firebaseConnectionManager } from './firebaseConnectionManager';
import { FirebaseErrorHandler } from './firebaseErrorHandler';
import UserDataSanitizer from './userDataSanitizer';
import FirestoreQueryFallbacks from './firestoreQueryFallbacks';
import FirebaseClientReset from './firebaseClientReset';
import { getFirebaseServices } from '../services/firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, getDocs, addDoc } from 'firebase/firestore';

interface OperationOptions {
  retries?: number;
  sanitizeData?: boolean;
  operationName?: string;
}

class FirebaseOperationWrapper {
  private static indexErrorCount = 0;
  private static firstIndexError = 0;

  /**
   * Initialize the Firebase operation wrapper
   */
  static initialize(): void {
    console.log('🔧 Initializing Firebase Operation Wrapper...');
    firebaseConnectionManager.initialize();
  }

  /**
   * Safely create or update a user document
   */
  static async setUserDocument(
    userId: string, 
    userData: any, 
    options: OperationOptions = {}
  ): Promise<void> {
    const { sanitizeData = true, operationName = 'setUserDocument' } = options;

    return firebaseConnectionManager.executeWithRetry(async () => {
      const { db, isInitialized } = getFirebaseServices();
      
      if (!isInitialized || !db) {
        throw new Error('Firebase services not initialized');
      }

      // Sanitize user data if requested
      const finalData = sanitizeData 
        ? UserDataSanitizer.createSafeUserDocument(userData)
        : UserDataSanitizer.removeUndefinedValues(userData);

      console.log(`📝 Setting user document for ${userId}:`, finalData);
      
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, finalData, { merge: true });
      
      console.log(`✅ User document set successfully for ${userId}`);
    }, operationName);
  }

  /**
   * Safely get a user document
   */
  static async getUserDocument(
    userId: string, 
    options: OperationOptions = {}
  ): Promise<any | null> {
    const { operationName = 'getUserDocument' } = options;

    return firebaseConnectionManager.executeWithRetry(async () => {
      const { db, isInitialized } = getFirebaseServices();
      
      if (!isInitialized || !db) {
        throw new Error('Firebase services not initialized');
      }

      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        console.log(`ℹ️ No user document found for ${userId}`);
        return null;
      }
    }, operationName);
  }

  /**
   * Safely update a document
   */
  static async updateDocument(
    collectionName: string,
    documentId: string,
    updateData: any,
    options: OperationOptions = {}
  ): Promise<void> {
    const { sanitizeData = true, operationName = 'updateDocument' } = options;

    return firebaseConnectionManager.executeWithRetry(async () => {
      const { db, isInitialized } = getFirebaseServices();
      
      if (!isInitialized || !db) {
        throw new Error('Firebase services not initialized');
      }

      // Remove undefined values
      const finalData = sanitizeData 
        ? UserDataSanitizer.removeUndefinedValues(updateData)
        : updateData;

      const docRef = doc(db, collectionName, documentId);
      await updateDoc(docRef, finalData);
      
      console.log(`✅ Document updated: ${collectionName}/${documentId}`);
    }, operationName);
  }

  /**
   * Safely get a document
   */
  static async getDocument(
    collectionName: string,
    documentId: string,
    options: OperationOptions = {}
  ): Promise<any | null> {
    const { operationName = 'getDocument' } = options;

    return firebaseConnectionManager.executeWithRetry(async () => {
      const { db, isInitialized } = getFirebaseServices();
      
      if (!isInitialized || !db) {
        throw new Error('Firebase services not initialized');
      }

      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    }, operationName);
  }

  /**
   * Safely execute a query with fallback for index errors
   */
  static async executeQuery(
    queryFn: () => Promise<any>,
    fallbackFn?: () => Promise<any>,
    options: OperationOptions = {}
  ): Promise<any> {
    const { operationName = 'executeQuery' } = options;

    return firebaseConnectionManager.executeWithRetry(async () => {
      try {
        return await queryFn();
      } catch (error: any) {
        // Handle index errors specifically
        if (error.message?.includes('query requires an index')) {
          console.warn(`⚠️ Index error in ${operationName}, using fallback if available`);
          
          if (fallbackFn) {
            console.log(`🔄 Executing fallback for ${operationName}`);
            return await fallbackFn();
          } else {
            console.warn(`❌ No fallback available for ${operationName}, returning empty result`);
            return [];
          }
        }
        throw error;
      }
    }, operationName);
  }

  /**
   * Safely add a document to a collection
   */
  static async addDocument(
    collectionName: string,
    documentData: any,
    options: OperationOptions = {}
  ): Promise<string> {
    const { sanitizeData = true, operationName = 'addDocument' } = options;

    return firebaseConnectionManager.executeWithRetry(async () => {
      const { db, isInitialized } = getFirebaseServices();
      
      if (!isInitialized || !db) {
        throw new Error('Firebase services not initialized');
      }

      // Remove undefined values
      const finalData = sanitizeData 
        ? UserDataSanitizer.removeUndefinedValues(documentData)
        : documentData;

      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, finalData);
      
      console.log(`✅ Document added to ${collectionName}: ${docRef.id}`);
      return docRef.id;
    }, operationName);
  }

  /**
   * Get connection status
   */
  static getConnectionStatus() {
    return firebaseConnectionManager.getConnectionState();
  }

  /**
   * Get purchases with automatic fallback
   */
  static async getPurchases(userId: string, options: OperationOptions = {}): Promise<any[]> {
    const { operationName = 'getPurchases' } = options;

    return this.executeQueryWithFallback(
      () => FirestoreQueryFallbacks.getPurchases(userId),
      operationName
    );
  }

  /**
   * Get music activities with automatic fallback
   */
  static async getMusicActivities(
    userId?: string,
    isCurrentlyPlaying?: boolean,
    options: OperationOptions = {}
  ): Promise<any[]> {
    const { operationName = 'getMusicActivities' } = options;

    return this.executeQueryWithFallback(
      () => FirestoreQueryFallbacks.getMusicActivities(userId, isCurrentlyPlaying),
      operationName
    );
  }

  /**
   * Get products with automatic fallback
   */
  static async getProducts(options: OperationOptions = {}): Promise<any[]> {
    const { operationName = 'getProducts' } = options;

    return this.executeQueryWithFallback(
      () => FirestoreQueryFallbacks.getProducts(),
      operationName
    );
  }

  /**
   * Get notifications with automatic fallback
   */
  static async getNotifications(userId: string, options: OperationOptions = {}): Promise<any[]> {
    const { operationName = 'getNotifications' } = options;

    return this.executeQueryWithFallback(
      () => FirestoreQueryFallbacks.getNotifications(userId),
      operationName
    );
  }

  /**
   * Execute query with automatic fallback and client reset if needed
   */
  private static async executeQueryWithFallback<T>(
    queryFn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      const result = await firebaseConnectionManager.executeWithRetry(queryFn, operationName);

      // Reset error count on success
      this.indexErrorCount = 0;
      return result;

    } catch (error: any) {
      // Track index errors
      if (error.message?.includes('query requires an index')) {
        this.indexErrorCount++;

        if (this.firstIndexError === 0) {
          this.firstIndexError = Date.now();
        }

        const timeWindow = Date.now() - this.firstIndexError;

        // Check if we should reset the client
        if (FirebaseClientReset.shouldResetClient(this.indexErrorCount, timeWindow)) {
          console.log('🚨 Too many index errors, attempting client reset...');
          await FirebaseClientReset.forceClientReset();

          // Reset counters after reset
          this.indexErrorCount = 0;
          this.firstIndexError = 0;

          // Retry the operation once after reset
          try {
            return await firebaseConnectionManager.executeWithRetry(queryFn, `${operationName}_after_reset`);
          } catch (retryError) {
            console.warn(`⚠️ ${operationName} still failed after client reset, returning empty result`);
            return [] as any;
          }
        }
      }

      // For other errors or if reset conditions not met, return empty result
      console.warn(`⚠️ ${operationName} failed, returning empty result:`, error.message);
      return [] as any;
    }
  }

  /**
   * Handle Firebase errors with proper categorization
   */
  static handleError(error: any, context?: string) {
    const errorInfo = FirebaseErrorHandler.handleError(error);

    if (context) {
      console.error(`❌ Firebase error in ${context}:`, errorInfo);
    }

    return errorInfo;
  }
}

export default FirebaseOperationWrapper;
