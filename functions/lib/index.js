"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupInactiveStreams = exports.validateStreamAccess = exports.generateAgoraToken = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const agora_access_token_1 = require("agora-access-token");
// Initialize Firebase Admin
admin.initializeApp();
/**
 * Agora Token Generation Cloud Function
 * Generates secure RTC tokens for live streaming channels
 */
exports.generateAgoraToken = functions.https.onCall(async (data, context) => {
    var _a, _b;
    try {
        // Verify user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to generate Agora token');
        }
        const { channelName, uid, role = 'audience', expirationTimeInSeconds = 3600 } = data;
        // Validate required parameters
        if (!channelName) {
            throw new functions.https.HttpsError('invalid-argument', 'channelName is required');
        }
        if (!uid) {
            throw new functions.https.HttpsError('invalid-argument', 'uid is required');
        }
        // Get Agora credentials from environment variables
        const appId = (_a = functions.config().agora) === null || _a === void 0 ? void 0 : _a.app_id;
        const appCertificate = (_b = functions.config().agora) === null || _b === void 0 ? void 0 : _b.app_certificate;
        if (!appId || !appCertificate) {
            console.error('Agora credentials not configured');
            throw new functions.https.HttpsError('failed-precondition', 'Agora service not properly configured');
        }
        // Determine user role
        const userRole = role === 'host' ? agora_access_token_1.RtcRole.PUBLISHER : agora_access_token_1.RtcRole.SUBSCRIBER;
        // Calculate expiration time
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
        // Generate the token
        const token = agora_access_token_1.RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, userRole, privilegeExpiredTs);
        // Log token generation (redacted)
        const debug = process.env.DEBUG_LOGS === '1' || process.env.DEBUG_LOGS === 'true';
        const maskValue = (value) => {
            const str = String(value !== null && value !== void 0 ? value : '');
            return str.slice(-4).padStart(str.length, '*');
        };
        const maskedRequestUid = maskValue(uid);
        const maskedAuthUid = maskValue(context.auth.uid);
        if (debug) {
            console.log('Generated Agora token', {
                role,
                expirationTimeInSeconds,
                privilegeExpiredTs,
                authUid: maskedAuthUid,
                requestUid: maskedRequestUid
            });
        } else {
            console.log('Generated Agora token');
        }
        return {
            token,
            appId,
            channelName,
            uid,
            role,
            expiresAt: privilegeExpiredTs * 1000, // Convert to milliseconds
        };
    }
    catch (error) {
        console.error('Error generating Agora token:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to generate Agora token');
    }
});
/**
 * Validate Stream Access Cloud Function
 * Validates if a user can join a specific stream
 */
exports.validateStreamAccess = functions.https.onCall(async (data, context) => {
    var _a;
    try {
        // Verify user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { streamId } = data;
        if (!streamId) {
            throw new functions.https.HttpsError('invalid-argument', 'streamId is required');
        }
        // Get stream document from Firestore
        const streamDoc = await admin.firestore()
            .collection('streams')
            .doc(streamId)
            .get();
        if (!streamDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Stream not found');
        }
        const streamData = streamDoc.data();
        const userId = context.auth.uid;
        // Check if stream is active
        if (!(streamData === null || streamData === void 0 ? void 0 : streamData.isActive)) {
            throw new functions.https.HttpsError('failed-precondition', 'Stream is not active');
        }
        // Check if user is banned from this stream
        if (streamData.bannedUsers && streamData.bannedUsers.includes(userId)) {
            throw new functions.https.HttpsError('permission-denied', 'User is banned from this stream');
        }
        // Check if stream has reached maximum capacity
        const maxParticipants = streamData.maxParticipants || 50;
        const currentParticipants = ((_a = streamData.participants) === null || _a === void 0 ? void 0 : _a.length) || 0;
        if (currentParticipants >= maxParticipants) {
            throw new functions.https.HttpsError('resource-exhausted', 'Stream has reached maximum capacity');
        }
        return {
            canJoin: true,
            streamData: {
                id: streamId,
                title: streamData.title,
                hostId: streamData.hostId,
                hostName: streamData.hostName,
                isActive: streamData.isActive,
                participantCount: currentParticipants,
                maxParticipants
            }
        };
    }
    catch (error) {
        console.error('Error validating stream access:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to validate stream access');
    }
});
/**
 * Stream Cleanup Cloud Function
 * Automatically cleans up inactive streams
 */
exports.cleanupInactiveStreams = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
    try {
        const now = admin.firestore.Timestamp.now();
        const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - (5 * 60 * 1000));
        // Paginate results with limit and process in batches of <=500 updates
        const QUERY_LIMIT = 200;
        let lastDoc = null;
        let totalCleaned = 0;
        while (true) {
            let queryRef = admin.firestore()
                .collection('streams')
                .where('isActive', '==', true)
                .where('lastActivity', '<', fiveMinutesAgo)
                .orderBy('lastActivity')
                .limit(QUERY_LIMIT);
            if (lastDoc) queryRef = queryRef.startAfter(lastDoc);
            const snapshot = await queryRef.get();
            if (snapshot.empty) break;
            // Chunk updates into 500 per batch
            const docs = snapshot.docs;
            let index = 0;
            while (index < docs.length) {
                const batch = admin.firestore().batch();
                for (let i = 0; i < 500 && index < docs.length; i++, index++) {
                    const d = docs[index];
                    batch.update(d.ref, {
                        isActive: false,
                        endedAt: now,
                        endReason: 'inactive_timeout'
                    });
                    totalCleaned++;
                }
                await batch.commit();
            }
            lastDoc = docs[docs.length - 1];
        }
        if (totalCleaned > 0) {
            console.log(`Cleaned up ${totalCleaned} inactive streams`);
        }
        return { cleanedUp: totalCleaned };
    }
    catch (error) {
        console.error('Error cleaning up inactive streams:', error);
        throw error;
    }
});
//# sourceMappingURL=index.js.map