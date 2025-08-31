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
  and
} from 'firebase/firestore';
import { db, auth } from './firebase';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';
import notificationService from './notificationService';

// Friend activity types
export type ActivityType = 'live_stream' | 'music_listening' | 'gaming' | 'status_update' | 'profile_update' | 'achievement';

export interface FriendActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  activityType: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  data?: any; // Activity-specific data
  isActive: boolean; // Whether the activity is currently ongoing
  endTime?: Date; // When the activity ended (for ongoing activities)
}

export interface LiveStreamActivity extends FriendActivity {
  activityType: 'live_stream';
  data: {
    streamId: string;
    streamTitle: string;
    viewerCount: number;
    category?: string;
    thumbnailUrl?: string;
  };
}

export interface MusicActivity extends FriendActivity {
  activityType: 'music_listening';
  data: {
    songTitle: string;
    artist: string;
    albumArt?: string;
    duration?: number;
    platform?: string; // Spotify, Apple Music, etc.
  };
}

export interface GamingActivity extends FriendActivity {
  activityType: 'gaming';
  data: {
    gameName: string;
    gameIcon?: string;
    score?: number;
    level?: number;
    achievement?: string;
  };
}

export interface StatusActivity extends FriendActivity {
  activityType: 'status_update';
  data: {
    status: string;
    mood?: string;
    location?: string;
  };
}

export type ActivityData = LiveStreamActivity | MusicActivity | GamingActivity | StatusActivity;

class FriendActivityService {
  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  /**
   * Create a new friend activity
   */
  async createActivity(activity: Omit<FriendActivity, 'id' | 'timestamp'>): Promise<string> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required to create activities');
      }

      const activityData = {
        ...activity,
        timestamp: serverTimestamp(),
        isActive: activity.isActive ?? true
      };

      const docRef = await addDoc(collection(db, 'friendActivities'), activityData);
      
      // Notify friends about the activity (for certain types)
      if (activity.activityType === 'live_stream' || activity.activityType === 'achievement') {
        await this.notifyFriendsAboutActivity(activity.userId, docRef.id, activity);
      }
      
      return docRef.id;
    } catch (error: any) {
      FirebaseErrorHandler.logError('createActivity', error);
      throw new Error(`Failed to create activity: ${error.message}`);
    }
  }

  /**
   * Update an existing activity (e.g., end a live stream)
   */
  async updateActivity(activityId: string, updates: Partial<FriendActivity>): Promise<void> {
    try {
      const activityRef = doc(db, 'friendActivities', activityId);
      const updateData = {
        ...updates,
        ...(updates.isActive === false && { endTime: serverTimestamp() })
      };
      
      await updateDoc(activityRef, updateData);
    } catch (error: any) {
      FirebaseErrorHandler.logError('updateActivity', error);
      throw new Error(`Failed to update activity: ${error.message}`);
    }
  }

  /**
   * End an activity (mark as inactive)
   */
  async endActivity(activityId: string): Promise<void> {
    await this.updateActivity(activityId, { isActive: false });
  }

  /**
   * Get friend activities for a user's friends
   */
  async getFriendActivities(userId: string, limitCount: number = 50): Promise<FriendActivity[]> {
    try {
      // First get user's friends
      const friendsQuery = query(
        collection(db, 'friends'),
        where('userId', '==', userId),
        where('status', '==', 'accepted')
      );
      
      const friendsSnapshot = await getDocs(friendsQuery);
      const friendIds: string[] = [];
      
      friendsSnapshot.forEach((doc) => {
        const data = doc.data();
        friendIds.push(data.friendId);
      });

      if (friendIds.length === 0) {
        return [];
      }

      // Get activities from friends (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Batch queries for >10 friends (Firestore 'in' limit is 10)
      const chunks = [];
      for (let i = 0; i < friendIds.length; i += 10) {
        chunks.push(friendIds.slice(i, i + 10));
      }

      const queryPromises = chunks.map(chunk => {
        const activitiesQuery = query(
          collection(db, 'friendActivities'),
          where('userId', 'in', chunk),
          where('timestamp', '>=', oneDayAgo),
          orderBy('timestamp', 'desc')
        );
        return getDocs(activitiesQuery);
      });

      const snapshots = await Promise.all(queryPromises);
      const activities: FriendActivity[] = [];
      const seenIds = new Set<string>();

      // Merge and deduplicate results
      snapshots.forEach(snapshot => {
        snapshot.forEach((doc) => {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            const data = doc.data();
            activities.push({
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate() || new Date(),
              endTime: data.endTime?.toDate()
            } as FriendActivity);
          }
        });
      });

      // Sort by timestamp and apply limit
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return activities.slice(0, limitCount);
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getFriendActivities - returning empty array for guest user');
        return [];
      }

      FirebaseErrorHandler.logError('getFriendActivities', error);
      throw new Error(`Failed to get friend activities: ${error.message}`);
    }
  }

  /**
   * Listen to real-time friend activities
   */
  onFriendActivities(userId: string, callback: (activities: FriendActivity[]) => void): () => void {
    try {
      // This is a simplified version - in a real app, you'd need to handle the friends list dynamically
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const q = query(
        collection(db, 'friendActivities'),
        where('timestamp', '>=', oneDayAgo),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      return onSnapshot(q, async (querySnapshot) => {
        // Filter activities to only include friends
        const friendsQuery = query(
          collection(db, 'friends'),
          where('userId', '==', userId),
          where('status', '==', 'accepted')
        );
        
        const friendsSnapshot = await getDocs(friendsQuery);
        const friendIds = new Set<string>();
        
        friendsSnapshot.forEach((doc) => {
          const data = doc.data();
          friendIds.add(data.friendId);
        });

        const activities: FriendActivity[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (friendIds.has(data.userId)) {
            activities.push({
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate() || new Date(),
              endTime: data.endTime?.toDate()
            } as FriendActivity);
          }
        });

        callback(activities);
      }, (error) => {
        // Handle permission errors gracefully for guest users
        if (FirebaseErrorHandler.isPermissionError(error)) {
          console.warn('Permission denied for onFriendActivities - returning empty array for guest user');
          callback([]);
          return;
        }

        console.error('Friend activities listener error:', error);
        FirebaseErrorHandler.logError('onFriendActivities', error);
        callback([]);
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('onFriendActivities', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Create a live stream activity
   */
  async createLiveStreamActivity(
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    streamData: {
      streamId: string;
      streamTitle: string;
      viewerCount: number;
      category?: string;
      thumbnailUrl?: string;
    }
  ): Promise<string> {
    const activity: Omit<LiveStreamActivity, 'id' | 'timestamp'> = {
      userId,
      userName,
      userAvatar,
      activityType: 'live_stream',
      title: `${userName} is live`,
      description: streamData.streamTitle,
      isActive: true,
      data: streamData
    };

    return this.createActivity(activity);
  }

  /**
   * Create a music listening activity
   */
  async createMusicActivity(
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    musicData: {
      songTitle: string;
      artist: string;
      albumArt?: string;
      duration?: number;
      platform?: string;
    }
  ): Promise<string> {
    const activity: Omit<MusicActivity, 'id' | 'timestamp'> = {
      userId,
      userName,
      userAvatar,
      activityType: 'music_listening',
      title: `${userName} is listening to music`,
      description: `${musicData.songTitle} by ${musicData.artist}`,
      isActive: true,
      data: musicData
    };

    return this.createActivity(activity);
  }

  /**
   * Create a gaming activity
   */
  async createGamingActivity(
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    gamingData: {
      gameName: string;
      gameIcon?: string;
      score?: number;
      level?: number;
      achievement?: string;
    }
  ): Promise<string> {
    const activity: Omit<GamingActivity, 'id' | 'timestamp'> = {
      userId,
      userName,
      userAvatar,
      activityType: 'gaming',
      title: `${userName} is playing ${gamingData.gameName}`,
      description: gamingData.achievement || `Level ${gamingData.level || 1}`,
      isActive: true,
      data: gamingData
    };

    return this.createActivity(activity);
  }

  /**
   * Notify friends about a new activity
   */
  private async notifyFriendsAboutActivity(
    userId: string,
    activityId: string,
    activity: Omit<FriendActivity, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      // Get user's friends
      const friendsQuery = query(
        collection(db, 'friends'),
        where('userId', '==', userId),
        where('status', '==', 'accepted')
      );
      
      const friendsSnapshot = await getDocs(friendsQuery);

      // Create notifications for all friends
      const notificationPromises = [];
      friendsSnapshot.forEach((doc) => {
        const friendData = doc.data();

        // Create notification for each friend
        const notificationPromise = notificationService.createNotification({
          userId: friendData.friendId,
          type: 'activity',
          title: activity.title,
          message: activity.description,
          read: false,
          data: {
            activityType: activity.activityType,
            fromUserId: userId,
            fromUserName: activity.userName,
            fromUserAvatar: activity.userAvatar,
            activityData: activity.data
          }
        });
        notificationPromises.push(notificationPromise);
      });

      // Wait for all notifications to be created
      const results = await Promise.allSettled(notificationPromises);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to create notification ${index}:`, result.reason);
        }
      });
    } catch (error) {
      console.warn('Failed to notify friends about activity:', error);
    }
  }

  /**
   * Get active activities for a user (currently ongoing)
   */
  async getActiveActivities(userId: string): Promise<FriendActivity[]> {
    try {
      const q = query(
        collection(db, 'friendActivities'),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const activities: FriendActivity[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
          endTime: data.endTime?.toDate()
        } as FriendActivity);
      });

      return activities;
    } catch (error: any) {
      FirebaseErrorHandler.logError('getActiveActivities', error);
      throw new Error(`Failed to get active activities: ${error.message}`);
    }
  }
}

export const friendActivityService = new FriendActivityService();
export default friendActivityService;
