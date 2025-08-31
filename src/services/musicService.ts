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
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';
import friendActivityService from './friendActivityService';

// Music platform types
export type MusicPlatform = 'spotify' | 'apple_music' | 'youtube_music' | 'soundcloud' | 'local';

// Music interfaces
export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  albumArt?: string;
  previewUrl?: string;
  externalUrl?: string;
  platform: MusicPlatform;
  isrc?: string; // International Standard Recording Code
  genres?: string[];
  releaseDate?: Date;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  tracks: Track[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  followers: number;
  totalDuration: number;
}

export interface UserMusicActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  track: Track;
  startTime: Date;
  endTime?: Date;
  isCurrentlyPlaying: boolean;
  platform: MusicPlatform;
  playbackPosition: number; // in seconds
  volume: number; // 0-100
  isShuffled: boolean;
  repeatMode: 'none' | 'track' | 'playlist';
  playlist?: {
    id: string;
    name: string;
    currentIndex: number;
  };
}

export interface MusicPreferences {
  userId: string;
  favoriteGenres: string[];
  preferredPlatforms: MusicPlatform[];
  autoShareActivity: boolean;
  allowFriendsToSeeActivity: boolean;
  favoriteArtists: string[];
  recentlyPlayed: Track[];
  savedTracks: string[]; // Track IDs
  savedPlaylists: string[]; // Playlist IDs
  lastUpdated: Date;
}

export interface MusicStats {
  userId: string;
  totalListeningTime: number; // in seconds
  topTracks: Array<{
    track: Track;
    playCount: number;
    totalTime: number;
  }>;
  topArtists: Array<{
    artist: string;
    playCount: number;
    totalTime: number;
  }>;
  topGenres: Array<{
    genre: string;
    playCount: number;
    totalTime: number;
  }>;
  monthlyStats: Array<{
    month: string;
    listeningTime: number;
    topTrack: Track;
  }>;
  lastUpdated: Date;
}

class MusicService {
  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  /**
   * Start music activity (user starts playing a track)
   */
  async startMusicActivity(
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    track: Track,
    platform: MusicPlatform,
    playlistInfo?: { id: string; name: string; currentIndex: number }
  ): Promise<string> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required to start music activity');
      }

      // End any existing music activity for this user
      await this.endCurrentMusicActivity(userId);

      const activity: Omit<UserMusicActivity, 'id'> = {
        userId,
        userName,
        userAvatar,
        track,
        startTime: serverTimestamp(),
        isCurrentlyPlaying: true,
        platform,
        playbackPosition: 0,
        volume: 80,
        isShuffled: false,
        repeatMode: 'none',
        playlist: playlistInfo
      };

      const docRef = await addDoc(collection(db, 'musicActivities'), activity);

      // Create friend activity for music listening
      await friendActivityService.createMusicActivity(
        userId,
        userName,
        userAvatar,
        {
          songTitle: track.title,
          artist: track.artist,
          albumArt: track.albumArt,
          duration: track.duration,
          platform
        }
      );

      // Update user's music preferences with recently played
      await this.updateRecentlyPlayed(userId, track);

      return docRef.id;
    } catch (error: any) {
      FirebaseErrorHandler.logError('startMusicActivity', error);
      throw new Error(`Failed to start music activity: ${error.message}`);
    }
  }

  /**
   * Update music activity (track progress, volume, etc.)
   */
  async updateMusicActivity(
    activityId: string,
    updates: Partial<Pick<UserMusicActivity, 'playbackPosition' | 'volume' | 'isShuffled' | 'repeatMode'>>
  ): Promise<void> {
    try {
      const activityRef = doc(db, 'musicActivities', activityId);
      await updateDoc(activityRef, updates);
    } catch (error: any) {
      FirebaseErrorHandler.logError('updateMusicActivity', error);
      throw new Error(`Failed to update music activity: ${error.message}`);
    }
  }

  /**
   * End current music activity
   */
  async endCurrentMusicActivity(userId: string): Promise<void> {
    try {
      // Find current active music activity
      const q = query(
        collection(db, 'musicActivities'),
        where('userId', '==', userId),
        where('isCurrentlyPlaying', '==', true),
        orderBy('startTime', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const activityDoc = querySnapshot.docs[0];
        const activityData = activityDoc.data() as UserMusicActivity;
        
        await updateDoc(activityDoc.ref, {
          endTime: serverTimestamp(),
          isCurrentlyPlaying: false
        });

        // Update music stats
        await this.updateMusicStats(userId, activityData);

        // End the corresponding friend activity
        await friendActivityService.endActivity(activityDoc.id);
      }
    } catch (error: any) {
      FirebaseErrorHandler.logError('endCurrentMusicActivity', error);
      // Don't throw error to avoid blocking other operations
      console.warn('Failed to end current music activity:', error);
    }
  }

  /**
   * Get user's current music activity
   */
  async getCurrentMusicActivity(userId: string): Promise<UserMusicActivity | null> {
    try {
      const q = query(
        collection(db, 'musicActivities'),
        where('userId', '==', userId),
        where('isCurrentlyPlaying', '==', true),
        orderBy('startTime', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        startTime: data.startTime?.toDate() || new Date(),
        endTime: data.endTime?.toDate()
      } as UserMusicActivity;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getCurrentMusicActivity - returning null for guest user');
        return null;
      }

      FirebaseErrorHandler.logError('getCurrentMusicActivity', error);
      throw new Error(`Failed to get current music activity: ${error.message}`);
    }
  }

  /**
   * Get friends' music activities
   */
  async getFriendsMusicActivities(userId: string, limitCount: number = 20): Promise<UserMusicActivity[]> {
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

      // Batch queries for >10 friends (Firestore 'in' limit is 10)
      const chunks = [];
      for (let i = 0; i < friendIds.length; i += 10) {
        chunks.push(friendIds.slice(i, i + 10));
      }

      const queryPromises = chunks.map(chunk => {
        const activitiesQuery = query(
          collection(db, 'musicActivities'),
          where('userId', 'in', chunk),
          orderBy('startTime', 'desc')
        );
        return getDocs(activitiesQuery);
      });

      const snapshots = await Promise.all(queryPromises);
      const activities: UserMusicActivity[] = [];
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
              startTime: data.startTime?.toDate() || new Date(),
              endTime: data.endTime?.toDate()
            } as UserMusicActivity);
          }
        });
      });

      // Sort by startTime and apply limit
      activities.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      return activities.slice(0, limitCount);
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getFriendsMusicActivities - returning empty array for guest user');
        return [];
      }

      FirebaseErrorHandler.logError('getFriendsMusicActivities', error);
      throw new Error(`Failed to get friends music activities: ${error.message}`);
    }
  }

  /**
   * Listen to real-time music activities
   */
  onMusicActivities(userId: string, callback: (activities: UserMusicActivity[]) => void): () => void {
    try {
      const q = query(
        collection(db, 'musicActivities'),
        where('isCurrentlyPlaying', '==', true),
        orderBy('startTime', 'desc'),
        limit(50)
      );

      return onSnapshot(q, async (querySnapshot) => {
        // Filter to only include friends' activities
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

        const activities: UserMusicActivity[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (friendIds.has(data.userId)) {
            activities.push({
              id: doc.id,
              ...data,
              startTime: data.startTime?.toDate() || new Date(),
              endTime: data.endTime?.toDate()
            } as UserMusicActivity);
          }
        });

        callback(activities);
      }, (error) => {
        // Handle permission errors gracefully for guest users
        if (FirebaseErrorHandler.isPermissionError(error)) {
          console.warn('Permission denied for onMusicActivities - returning empty array for guest user');
          callback([]);
          return;
        }

        console.error('Music activities listener error:', error);
        FirebaseErrorHandler.logError('onMusicActivities', error);
        callback([]);
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('onMusicActivities', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Update user's recently played tracks
   */
  private async updateRecentlyPlayed(userId: string, track: Track): Promise<void> {
    try {
      const preferencesRef = doc(db, 'musicPreferences', userId);
      const preferencesDoc = await getDoc(preferencesRef);

      let recentlyPlayed: Track[] = [];
      
      if (preferencesDoc.exists()) {
        const data = preferencesDoc.data();
        recentlyPlayed = data.recentlyPlayed || [];
      }

      // Remove track if it already exists and add to beginning
      recentlyPlayed = recentlyPlayed.filter(t => t.id !== track.id);
      recentlyPlayed.unshift(track);
      
      // Keep only last 50 tracks
      recentlyPlayed = recentlyPlayed.slice(0, 50);

      await setDoc(preferencesRef, {
        userId,
        recentlyPlayed,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error: any) {
      console.warn('Failed to update recently played:', error);
    }
  }

  /**
   * Update music statistics
   */
  private async updateMusicStats(userId: string, activity: UserMusicActivity): Promise<void> {
    try {
      const statsRef = doc(db, 'musicStats', userId);
      const statsDoc = await getDoc(statsRef);

      const listeningTime = activity.endTime && activity.startTime 
        ? Math.floor((activity.endTime.getTime() - activity.startTime.getTime()) / 1000)
        : 0;

      if (listeningTime <= 0) return;

      let stats: Partial<MusicStats> = {
        userId,
        totalListeningTime: listeningTime,
        lastUpdated: serverTimestamp() as any
      };

      if (statsDoc.exists()) {
        const existingStats = statsDoc.data() as MusicStats;
        stats.totalListeningTime = (existingStats.totalListeningTime || 0) + listeningTime;
        
        // Update top tracks, artists, genres (simplified version)
        // In a real implementation, you'd have more sophisticated aggregation
      }

      await setDoc(statsRef, stats, { merge: true });
    } catch (error: any) {
      console.warn('Failed to update music stats:', error);
    }
  }

  /**
   * Get user's music preferences
   */
  async getMusicPreferences(userId: string): Promise<MusicPreferences | null> {
    try {
      const preferencesRef = doc(db, 'musicPreferences', userId);
      const preferencesDoc = await getDoc(preferencesRef);

      if (!preferencesDoc.exists()) {
        return null;
      }

      const data = preferencesDoc.data();
      return {
        ...data,
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      } as MusicPreferences;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getMusicPreferences - returning null for guest user');
        return null;
      }

      FirebaseErrorHandler.logError('getMusicPreferences', error);
      throw new Error(`Failed to get music preferences: ${error.message}`);
    }
  }

  /**
   * Update user's music preferences
   */
  async updateMusicPreferences(userId: string, preferences: Partial<MusicPreferences>): Promise<void> {
    try {
      const preferencesRef = doc(db, 'musicPreferences', userId);
      await setDoc(preferencesRef, {
        ...preferences,
        userId,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error: any) {
      FirebaseErrorHandler.logError('updateMusicPreferences', error);
      throw new Error(`Failed to update music preferences: ${error.message}`);
    }
  }
}

export const musicService = new MusicService();
export default musicService;
