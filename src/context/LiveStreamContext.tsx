import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { streamingService } from '../services/streamingService';

// Define the structure of a stream
export interface StreamHost {
  name: string;
  avatar: string;
  joinOrder: number; // Track join order for power ranking
  isSpeaking: boolean;
  isMuted: boolean;
}

export interface StreamViewer {
  name: string;
  avatar: string;
  isMuted: boolean;
  isBanned: boolean;
}

export interface StreamFriend {
  name: string;
  avatar: string;
}

export interface LiveStream {
  id: string;
  title: string;
  hosts: StreamHost[];
  viewers: StreamViewer[];
  views: number;
  boost?: number;
  rank?: number;
  friends?: StreamFriend[];
  isActive: boolean;
  startedAt: number; // timestamp
}

// Define the context interface
interface LiveStreamContextType {
  streams: LiveStream[];
  featuredStreams: LiveStream[];
  friendStreams: {
    hosting: LiveStream[];
    watching: LiveStream[];
  };
  getStreamById: (id: string) => LiveStream | undefined;
  joinStream: (streamId: string) => void;
  currentlyWatching: string | null; // ID of the stream the user is currently watching
  isMinimized: boolean;
  setStreamMinimized: (streamId: string, minimized: boolean) => void;
  
  // New features
  joinAsHost: (streamId: string, userName: string, userAvatar: string) => void;
  kickHost: (streamId: string, hostName: string, kickedBy: string) => void;
  muteViewer: (streamId: string, viewerName: string, mutedBy: string) => void;
  banViewer: (streamId: string, viewerName: string, bannedBy: string) => void;
  leaveStream: (streamId: string) => void;
}

// Create the context with a default value
const LiveStreamContext = createContext<LiveStreamContextType | undefined>(undefined);

// Note: MOCK_STREAMS has been replaced with real Firebase data
// The streaming service now fetches active streams from Firestore

// Provider component
export const LiveStreamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Fetch streams from Firebase
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const activeStreams = await streamingService.getActiveStreams();
        setStreams(activeStreams);
      } catch (error) {
        console.error('Error fetching streams:', error);
        // Fallback to empty array if Firebase fails
        setStreams([]);
      }
    };

    fetchStreams();

    // Set up real-time listener for stream updates
    const unsubscribe = streamingService.onActiveStreamsUpdate((updatedStreams) => {
      setStreams(updatedStreams);
    });

    return unsubscribe;
  }, []);

  // Categorize streams for easier access
  const featuredStreams = streams.filter(stream => stream.rank !== undefined)
                                .sort((a, b) => (a.rank || 0) - (b.rank || 0));

  const friendStreams = {
    hosting: streams.filter(stream => 
      stream.hosts.some(host => 
        host.name === 'Michael' || host.name === 'James'
      )
    ),
    watching: streams.filter(stream => 
      stream.friends?.some(friend => 
        friend.name === 'Jessica' || friend.name === 'Ella'
      )
    )
  };

  const getStreamById = (id: string) => {
    return streams.find(stream => stream.id === id);
  };

  const joinStream = async (streamId: string) => {
    try {
      // Get current user info (you'll need to pass this from auth context)
      // For now, we'll use placeholder data
      const currentUser = { uid: 'currentUser', displayName: 'You', photoURL: 'https://randomuser.me/api/portraits/lego/1.jpg' };

      await streamingService.joinStream(
        streamId,
        currentUser.uid,
        currentUser.displayName || 'You',
        currentUser.photoURL || 'https://randomuser.me/api/portraits/lego/1.jpg'
      );

      setCurrentlyWatching(streamId);
      console.log(`Successfully joined stream ${streamId}`);
    } catch (error) {
      console.error('Error joining stream:', error);
      // You might want to show an error message to the user here
    }
  };

  // Add this new function to handle minimizing streams
  const setStreamMinimized = (streamId: string, minimized: boolean) => {
    if (streamId) {
      setCurrentlyWatching(streamId);
      setIsMinimized(minimized);
    }
  };

  // New functions for enhanced live stream features
  const joinAsHost = async (streamId: string, userName: string, userAvatar: string) => {
    try {
      let actualStreamId = streamId;
      const streamExists = streams.some(s => s.id === streamId);

      // Create a new stream if it doesn't exist
      if (!streamExists) {
        actualStreamId = await streamingService.createStream(
          `Live Stream by ${userName}`,
          'currentUser', // Use actual user ID
          userName,
          userAvatar
        );
        console.log(`Created new stream: ${actualStreamId}`);

        // After creating the stream, fetch the latest streams to ensure we have the complete stream data
        try {
          const activeStreams = await streamingService.getActiveStreams();
          setStreams(activeStreams);
        } catch (error) {
          console.error('Error refreshing streams after creation:', error);
        }
      }

      // Find the stream to update (using actualStreamId in case it changed)
      const targetStream = streams.find(s => s.id === actualStreamId);
      if (!targetStream) {
        console.error(`Stream with id ${actualStreamId} not found after creation`);
        return;
      }

      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === actualStreamId) {
            const nextJoinOrder = stream.hosts.length + 1;
            const newHost: StreamHost = {
              name: userName,
              avatar: userAvatar,
              joinOrder: nextJoinOrder,
              isSpeaking: false,
              isMuted: false
            };
            return {
              ...stream,
              hosts: [...stream.hosts, newHost]
            };
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error joining as host:', error);
    }
  };

  const kickHost = async (streamId: string, hostName: string, kickedBy: string) => {
    try {
      // Find the user ID of the host to kick
      const stream = streams.find(s => s.id === streamId);
      if (!stream) return;

      // For now, we'll use the host name as user ID (TODO: Use actual user IDs)
      const userId = hostName; // This should be the actual user ID
      const kickedById = kickedBy; // This should be the actual user ID

      await streamingService.kickParticipant(streamId, userId, kickedById);

      // Update local state
      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === streamId) {
            const kickedByHost = stream.hosts.find(h => h.name === kickedBy);
            const hostToKick = stream.hosts.find(h => h.name === hostName);

            // Check if the kicker has higher power (lower join order)
            if (kickedByHost && hostToKick && kickedByHost.joinOrder < hostToKick.joinOrder) {
              return {
                ...stream,
                hosts: stream.hosts.filter(h => h.name !== hostName)
              };
            }
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error kicking host:', error);
    }
  };

  const muteViewer = async (streamId: string, viewerName: string, mutedBy: string) => {
    try {
      // Find the user ID of the viewer to mute
      const stream = streams.find(s => s.id === streamId);
      if (!stream) return;

      // For now, we'll use the viewer name as user ID (TODO: Use actual user IDs)
      const userId = viewerName; // This should be the actual user ID

      await streamingService.toggleParticipantMute(streamId, userId);

      // Update local state
      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === streamId) {
            return {
              ...stream,
              viewers: stream.viewers.map(viewer =>
                viewer.name === viewerName
                  ? { ...viewer, isMuted: !viewer.isMuted }
                  : viewer
              )
            };
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error muting viewer:', error);
    }
  };

  const banViewer = async (streamId: string, viewerName: string, bannedBy: string) => {
    try {
      // Find the user ID of the viewer to ban
      const stream = streams.find(s => s.id === streamId);
      if (!stream) return;

      // For now, we'll use the viewer name as user ID (TODO: Use actual user IDs)
      const userId = viewerName; // This should be the actual user ID
      const bannedById = bannedBy; // This should be the actual user ID

      await streamingService.banParticipant(streamId, userId, bannedById);

      // Update local state
      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === streamId) {
            return {
              ...stream,
              viewers: stream.viewers.map(viewer =>
                viewer.name === viewerName
                  ? { ...viewer, isBanned: !viewer.isBanned }
                  : viewer
              )
            };
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error banning viewer:', error);
    }
  };

  const leaveStream = (streamId: string) => {
    setCurrentlyWatching(null);
    setIsMinimized(false);
  };

  return (
    <LiveStreamContext.Provider
      value={{
        streams,
        featuredStreams,
        friendStreams,
        getStreamById,
        joinStream,
        currentlyWatching,
        isMinimized,
        setStreamMinimized,
        joinAsHost,
        kickHost,
        muteViewer,
        banViewer,
        leaveStream,
      }}
    >
      {children}
    </LiveStreamContext.Provider>
  );
};

// Custom hook for using the context
export const useLiveStreams = () => {
  const context = useContext(LiveStreamContext);
  if (context === undefined) {
    throw new Error('useLiveStreams must be used within a LiveStreamProvider');
  }
  return context;
}; 