import { firestoreService } from '../services/firestoreService';

/**
 * Utility to clean up old/stale streams from Firebase
 * This should be run when there are streams showing but no one is actually live
 */
export const cleanupOldStreams = async () => {
  try {
    console.log('🧹 Starting stream cleanup...');
    
    // Get all streams (not just active ones)
    const allStreams = await firestoreService.getAllStreams();
    console.log(`🔍 Found ${allStreams.length} total streams in database`);
    
    // Filter streams that are older than 1 hour and still marked as active
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const staleStreams = allStreams.filter(stream => {
      const streamAge = Date.now() - (stream.startedAt || 0);
      const isStale = stream.isActive && streamAge > oneHourAgo;
      
      if (isStale) {
        console.log(`🚨 Found stale stream: ${stream.id} - ${stream.title} (${Math.round(streamAge / 60000)} minutes old)`);
      }
      
      return isStale;
    });
    
    console.log(`🧹 Found ${staleStreams.length} stale streams to clean up`);
    
    // Clean up stale streams
    for (const stream of staleStreams) {
      try {
        await firestoreService.endStream(stream.id, 'timeout_cleanup');
        console.log(`✅ Cleaned up stale stream: ${stream.id}`);
      } catch (error) {
        console.error(`❌ Failed to clean up stream ${stream.id}:`, error);
      }
    }
    
    console.log('🎉 Stream cleanup completed');
    return staleStreams.length;
  } catch (error) {
    console.error('❌ Stream cleanup failed:', error);
    throw error;
  }
};

/**
 * Clean up ALL streams (use with caution - for development only)
 */
export const cleanupAllStreams = async () => {
  try {
    console.log('🧹 Starting FULL stream cleanup (development only)...');
    
    const allStreams = await firestoreService.getAllStreams();
    console.log(`🔍 Found ${allStreams.length} total streams to clean up`);
    
    for (const stream of allStreams) {
      try {
        await firestoreService.endStream(stream.id, 'timeout_cleanup');
        console.log(`✅ Cleaned up stream: ${stream.id} - ${stream.title}`);
      } catch (error) {
        console.error(`❌ Failed to clean up stream ${stream.id}:`, error);
      }
    }
    
    console.log('🎉 Full stream cleanup completed');
    return allStreams.length;
  } catch (error) {
    console.error('❌ Full stream cleanup failed:', error);
    throw error;
  }
};
