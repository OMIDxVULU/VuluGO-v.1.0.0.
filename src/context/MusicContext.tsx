import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import musicService, { Track, UserMusicActivity, MusicPreferences, MusicPlatform } from '../services/musicService';

interface MusicContextType {
  // Current playback state
  currentTrack: Track | null;
  isPlaying: boolean;
  playbackPosition: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: 'none' | 'track' | 'playlist';
  
  // User's music activity
  currentActivity: UserMusicActivity | null;
  friendsActivities: UserMusicActivity[];
  
  // User preferences
  musicPreferences: MusicPreferences | null;
  
  // Loading states
  isLoadingActivity: boolean;
  isLoadingPreferences: boolean;
  
  // Playback controls
  playTrack: (track: Track, platform: MusicPlatform) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  stopTrack: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  toggleRepeat: () => Promise<void>;
  
  // Activity management
  refreshActivity: () => Promise<void>;
  refreshFriendsActivities: () => Promise<void>;
  
  // Preferences management
  updatePreferences: (preferences: Partial<MusicPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

interface MusicProviderProps {
  children: ReactNode;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const { user, isGuest, userProfile } = useAuth();
  
  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'track' | 'playlist'>('none');
  
  // Activity state
  const [currentActivity, setCurrentActivity] = useState<UserMusicActivity | null>(null);
  const [friendsActivities, setFriendsActivities] = useState<UserMusicActivity[]>([]);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(null);
  
  // Preferences state
  const [musicPreferences, setMusicPreferences] = useState<MusicPreferences | null>(null);
  
  // Loading states
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);

  // Load user's music data when user changes
  useEffect(() => {
    if (!user || isGuest) {
      // Reset all state for guests
      setCurrentTrack(null);
      setIsPlaying(false);
      setPlaybackPosition(0);
      setCurrentActivity(null);
      setFriendsActivities([]);
      setMusicPreferences(null);
      setCurrentActivityId(null);
      return;
    }

    loadMusicData();
    
    // Set up real-time listener for friends' music activities
    const unsubscribe = musicService.onMusicActivities(user.uid, (activities) => {
      setFriendsActivities(activities);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, isGuest]);

  // Load all music-related data
  const loadMusicData = async () => {
    if (!user || isGuest) return;

    try {
      // Load current activity
      await refreshActivity();
      
      // Load preferences
      await refreshPreferences();
      
      // Load friends' activities
      await refreshFriendsActivities();
    } catch (error) {
      console.error('Failed to load music data:', error);
    }
  };

  // Playback control functions
  const playTrack = async (track: Track, platform: MusicPlatform) => {
    if (!user || isGuest) {
      throw new Error('Authentication required to play music');
    }

    try {
      // End current activity if exists
      if (currentActivityId) {
        await musicService.endCurrentMusicActivity(user.uid);
      }

      // Start new music activity
      const activityId = await musicService.startMusicActivity(
        user.uid,
        userProfile?.displayName || 'User',
        userProfile?.photoURL,
        track,
        platform
      );

      // Update local state
      setCurrentTrack(track);
      setIsPlaying(true);
      setPlaybackPosition(0);
      setCurrentActivityId(activityId);

      // Refresh current activity
      await refreshActivity();
    } catch (error: any) {
      console.error('Failed to play track:', error);
      throw new Error(`Failed to play track: ${error.message}`);
    }
  };

  const pauseTrack = async () => {
    if (!currentActivityId) return;

    try {
      await musicService.updateMusicActivity(currentActivityId, {
        playbackPosition
      });
      
      setIsPlaying(false);
    } catch (error: any) {
      console.error('Failed to pause track:', error);
      throw new Error(`Failed to pause track: ${error.message}`);
    }
  };

  const resumeTrack = async () => {
    if (!currentActivityId) return;

    setIsPlaying(true);
  };

  const stopTrack = async () => {
    if (!user || isGuest || !currentActivityId) return;

    try {
      await musicService.endCurrentMusicActivity(user.uid);
      
      // Reset local state
      setCurrentTrack(null);
      setIsPlaying(false);
      setPlaybackPosition(0);
      setCurrentActivityId(null);
      setCurrentActivity(null);
    } catch (error: any) {
      console.error('Failed to stop track:', error);
      throw new Error(`Failed to stop track: ${error.message}`);
    }
  };

  const seekTo = async (position: number) => {
    if (!currentActivityId) return;

    try {
      await musicService.updateMusicActivity(currentActivityId, {
        playbackPosition: position
      });
      
      setPlaybackPosition(position);
    } catch (error: any) {
      console.error('Failed to seek:', error);
      throw new Error(`Failed to seek: ${error.message}`);
    }
  };

  const setVolume = async (newVolume: number) => {
    if (!currentActivityId) return;

    try {
      await musicService.updateMusicActivity(currentActivityId, {
        volume: newVolume
      });
      
      setVolumeState(newVolume);
    } catch (error: any) {
      console.error('Failed to set volume:', error);
      throw new Error(`Failed to set volume: ${error.message}`);
    }
  };

  const toggleShuffle = async () => {
    if (!currentActivityId) return;

    try {
      const newShuffleState = !isShuffled;
      
      await musicService.updateMusicActivity(currentActivityId, {
        isShuffled: newShuffleState
      });
      
      setIsShuffled(newShuffleState);
    } catch (error: any) {
      console.error('Failed to toggle shuffle:', error);
      throw new Error(`Failed to toggle shuffle: ${error.message}`);
    }
  };

  const toggleRepeat = async () => {
    if (!currentActivityId) return;

    try {
      const modes: Array<'none' | 'track' | 'playlist'> = ['none', 'track', 'playlist'];
      const currentIndex = modes.indexOf(repeatMode);
      const newMode = modes[(currentIndex + 1) % modes.length];
      
      await musicService.updateMusicActivity(currentActivityId, {
        repeatMode: newMode
      });
      
      setRepeatMode(newMode);
    } catch (error: any) {
      console.error('Failed to toggle repeat:', error);
      throw new Error(`Failed to toggle repeat: ${error.message}`);
    }
  };

  // Activity management functions
  const refreshActivity = async () => {
    if (!user || isGuest) return;

    setIsLoadingActivity(true);
    try {
      const activity = await musicService.getCurrentMusicActivity(user.uid);
      setCurrentActivity(activity);
      
      if (activity) {
        setCurrentTrack(activity.track);
        setIsPlaying(activity.isCurrentlyPlaying);
        setPlaybackPosition(activity.playbackPosition);
        setVolumeState(activity.volume);
        setIsShuffled(activity.isShuffled);
        setRepeatMode(activity.repeatMode);
        setCurrentActivityId(activity.id);
      }
    } catch (error) {
      console.error('Failed to refresh activity:', error);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const refreshFriendsActivities = async () => {
    if (!user || isGuest) return;

    try {
      const activities = await musicService.getFriendsMusicActivities(user.uid);
      setFriendsActivities(activities);
    } catch (error) {
      console.error('Failed to refresh friends activities:', error);
    }
  };

  // Preferences management functions
  const updatePreferences = async (preferences: Partial<MusicPreferences>) => {
    if (!user || isGuest) return;

    try {
      await musicService.updateMusicPreferences(user.uid, preferences);
      await refreshPreferences();
    } catch (error: any) {
      console.error('Failed to update preferences:', error);
      throw new Error(`Failed to update preferences: ${error.message}`);
    }
  };

  const refreshPreferences = async () => {
    if (!user || isGuest) return;

    setIsLoadingPreferences(true);
    try {
      const preferences = await musicService.getMusicPreferences(user.uid);
      setMusicPreferences(preferences);
    } catch (error) {
      console.error('Failed to refresh preferences:', error);
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  return (
    <MusicContext.Provider value={{
      // Current playback state
      currentTrack,
      isPlaying,
      playbackPosition,
      volume,
      isShuffled,
      repeatMode,
      
      // User's music activity
      currentActivity,
      friendsActivities,
      
      // User preferences
      musicPreferences,
      
      // Loading states
      isLoadingActivity,
      isLoadingPreferences,
      
      // Playback controls
      playTrack,
      pauseTrack,
      resumeTrack,
      stopTrack,
      seekTo,
      setVolume,
      toggleShuffle,
      toggleRepeat,
      
      // Activity management
      refreshActivity,
      refreshFriendsActivities,
      
      // Preferences management
      updatePreferences,
      refreshPreferences
    }}>
      {children}
    </MusicContext.Provider>
  );
};

// Custom hook to use the music context
export const useMusic = (): MusicContextType => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

export default MusicContext;
