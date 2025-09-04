/**
 * Enhanced Agora Token Management System
 * Provides secure token generation, renewal, caching, and lifecycle management
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const db = admin.firestore();

// Token cache interface
interface TokenCacheEntry {
  token: string;
  channelName: string;
  uid: number;
  role: string;
  expiresAt: number;
  createdAt: number;
  userId: string;
  renewalCount: number;
}

// In-memory token cache (in production, use Redis or Firestore)
const tokenCache = new Map<string, TokenCacheEntry>();

/**
 * Enhanced Agora Token Generation with caching and validation
 */
export const generateAgoraToken = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to generate Agora token'
      );
    }

    const { 
      channelName, 
      uid, 
      role = 'audience', 
      expirationTimeInSeconds = 3600,
      forceRefresh = false 
    } = data;

    // Validate required parameters
    if (!channelName || !uid) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'channelName and uid are required'
      );
    }

    // Validate stream access first
    await validateStreamAccess(channelName, context.auth.uid, role);

    // Check cache for existing valid token
    const cacheKey = `${channelName}_${uid}_${role}`;
    const cachedToken = tokenCache.get(cacheKey);
    
    if (cachedToken && !forceRefresh) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = cachedToken.expiresAt - now;
      
      // Return cached token if it has more than 5 minutes left
      if (timeUntilExpiry > 300) {
        console.log(`Returning cached token for ${cacheKey}, expires in ${timeUntilExpiry}s`);
        return {
          token: cachedToken.token,
          appId: functions.config().agora?.app_id,
          channelName,
          uid,
          role,
          expiresAt: cachedToken.expiresAt * 1000,
          cached: true,
          renewalCount: cachedToken.renewalCount
        };
      }
    }

    // Generate new token
    const tokenData = await generateNewToken(channelName, uid, role, expirationTimeInSeconds);
    
    // Cache the token
    const cacheEntry: TokenCacheEntry = {
      token: tokenData.token,
      channelName,
      uid,
      role,
      expiresAt: tokenData.expiresAt / 1000,
      createdAt: Math.floor(Date.now() / 1000),
      userId: context.auth.uid,
      renewalCount: 0
    };
    
    tokenCache.set(cacheKey, cacheEntry);
    
    // Store token in Firestore for persistence and monitoring
    await db.collection('agoraTokens').doc(cacheKey).set({
      ...cacheEntry,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsed: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Generated new Agora token for user ${context.auth.uid}:`, {
      channelName,
      uid,
      role,
      expirationTimeInSeconds
    });

    return {
      ...tokenData,
      cached: false,
      renewalCount: 0
    };

  } catch (error) {
    console.error('Error generating Agora token:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate Agora token'
    );
  }
});

/**
 * Renew Agora Token before expiration
 */
export const renewAgoraToken = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { channelName, uid, role = 'audience' } = data;
    
    if (!channelName || !uid) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'channelName and uid are required'
      );
    }

    // Check if user still has access to the stream
    await validateStreamAccess(channelName, context.auth.uid, role);

    const cacheKey = `${channelName}_${uid}_${role}`;
    const cachedToken = tokenCache.get(cacheKey);
    
    if (!cachedToken) {
      throw new functions.https.HttpsError(
        'not-found',
        'No existing token found to renew'
      );
    }

    // Generate renewed token with extended expiration
    const tokenData = await generateNewToken(channelName, uid, role, 3600);
    
    // Update cache
    const updatedEntry: TokenCacheEntry = {
      ...cachedToken,
      token: tokenData.token,
      expiresAt: tokenData.expiresAt / 1000,
      renewalCount: cachedToken.renewalCount + 1
    };
    
    tokenCache.set(cacheKey, updatedEntry);
    
    // Update Firestore record
    await db.collection('agoraTokens').doc(cacheKey).update({
      token: tokenData.token,
      expiresAt: tokenData.expiresAt / 1000,
      renewalCount: admin.firestore.FieldValue.increment(1),
      lastRenewed: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Renewed Agora token for ${cacheKey}, renewal count: ${updatedEntry.renewalCount}`);

    return {
      ...tokenData,
      renewed: true,
      renewalCount: updatedEntry.renewalCount
    };

  } catch (error) {
    console.error('Error renewing Agora token:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to renew Agora token'
    );
  }
});

/**
 * Validate Agora Token
 */
export const validateAgoraToken = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { token, channelName, uid } = data;
    
    if (!token || !channelName || !uid) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'token, channelName, and uid are required'
      );
    }

    // Check token in cache/database
    const tokenDoc = await db.collection('agoraTokens')
      .where('token', '==', token)
      .where('channelName', '==', channelName)
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (tokenDoc.empty) {
      return {
        valid: false,
        reason: 'Token not found'
      };
    }

    const tokenData = tokenDoc.docs[0].data();
    const now = Math.floor(Date.now() / 1000);
    
    if (tokenData.expiresAt <= now) {
      return {
        valid: false,
        reason: 'Token expired',
        expiresAt: tokenData.expiresAt
      };
    }

    // Update last used timestamp
    await tokenDoc.docs[0].ref.update({
      lastUsed: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      valid: true,
      expiresAt: tokenData.expiresAt,
      timeUntilExpiry: tokenData.expiresAt - now,
      renewalCount: tokenData.renewalCount || 0
    };

  } catch (error) {
    console.error('Error validating Agora token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to validate token');
  }
});

/**
 * Cleanup expired tokens (scheduled function)
 */
export const cleanupExpiredTokens = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      // Clean up expired tokens from Firestore
      const expiredTokensQuery = await db.collection('agoraTokens')
        .where('expiresAt', '<', now)
        .get();

      const batch = db.batch();
      let cleanupCount = 0;

      expiredTokensQuery.forEach((doc) => {
        batch.delete(doc.ref);
        
        // Also remove from memory cache
        const data = doc.data();
        const cacheKey = `${data.channelName}_${data.uid}_${data.role}`;
        tokenCache.delete(cacheKey);
        
        cleanupCount++;
      });

      if (cleanupCount > 0) {
        await batch.commit();
        console.log(`Cleaned up ${cleanupCount} expired Agora tokens`);
      }

      return { cleanedTokens: cleanupCount };

    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  });

/**
 * Helper function to generate new token
 */
async function generateNewToken(
  channelName: string, 
  uid: number, 
  role: string, 
  expirationTimeInSeconds: number
) {
  // Get Agora credentials
  const appId = functions.config().agora?.app_id;
  const appCertificate = functions.config().agora?.app_certificate;

  if (!appId || !appCertificate) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Agora service not properly configured'
    );
  }

  // Determine user role
  const userRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  
  // Calculate expiration time
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Generate the token
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    userRole,
    privilegeExpiredTs
  );

  return {
    token,
    appId,
    channelName,
    uid,
    role,
    expiresAt: privilegeExpiredTs * 1000
  };
}

/**
 * Helper function to validate stream access
 */
async function validateStreamAccess(channelName: string, userId: string, role: string) {
  // Get stream document
  const streamDoc = await db.collection('streams').doc(channelName).get();
  
  if (!streamDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Stream not found'
    );
  }

  const streamData = streamDoc.data()!;
  
  // Check if stream is active
  if (!streamData.isActive) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Stream is not active'
    );
  }

  // Check if user is banned
  if (streamData.bannedUserIds && streamData.bannedUserIds.includes(userId)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User is banned from this stream'
    );
  }

  // Check if user is the host
  if (role === 'host' && streamData.hostId !== userId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only the stream host can request host tokens'
    );
  }
}
