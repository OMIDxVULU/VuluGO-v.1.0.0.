import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

// Mock data for demonstration purposes - in a real app, this would come from an API
const MOCK_STREAMS: LiveStream[] = [
  {
    id: '101',
    title: 'Live title, test test test test test 123',
    hosts: [
      { name: 'Sara', avatar: 'https://randomuser.me/api/portraits/women/32.jpg', joinOrder: 1, isSpeaking: true, isMuted: false },
      { name: 'Emily', avatar: 'https://randomuser.me/api/portraits/women/33.jpg', joinOrder: 2, isSpeaking: false, isMuted: false },
      { name: 'Anna', avatar: 'https://randomuser.me/api/portraits/women/34.jpg', joinOrder: 3, isSpeaking: false, isMuted: false },
    ],
    viewers: [
      { name: 'Jessica', avatar: 'https://randomuser.me/api/portraits/women/31.jpg', isMuted: false, isBanned: false },
      { name: 'Mike', avatar: 'https://randomuser.me/api/portraits/men/31.jpg', isMuted: false, isBanned: false },
      { name: 'Lisa', avatar: 'https://randomuser.me/api/portraits/women/35.jpg', isMuted: true, isBanned: false },
    ],
    views: 2590,
    boost: 0,
    friends: [
      { name: 'Jessica', avatar: 'https://randomuser.me/api/portraits/women/31.jpg' },
    ],
    isActive: true,
    startedAt: Date.now() - 3600000, // started 1 hour ago
  },
  {
    id: '102',
    title: 'Friday Night Live Stream',
    hosts: [
      { name: 'Michael', avatar: 'https://randomuser.me/api/portraits/men/33.jpg', joinOrder: 1, isSpeaking: true, isMuted: false },
      { name: 'David', avatar: 'https://randomuser.me/api/portraits/women/32.jpg', joinOrder: 2, isSpeaking: false, isMuted: false },
      { name: 'Tom', avatar: 'https://randomuser.me/api/portraits/women/33.jpg', joinOrder: 3, isSpeaking: false, isMuted: false },
    ],
    viewers: [
      { name: 'Sarah', avatar: 'https://randomuser.me/api/portraits/women/36.jpg', isMuted: false, isBanned: false },
      { name: 'John', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', isMuted: false, isBanned: false },
    ],
    views: 1240,
    boost: 0,
    friends: [
      { name: 'Michael', avatar: 'https://randomuser.me/api/portraits/men/33.jpg' },
    ],
    isActive: true,
    startedAt: Date.now() - 7200000, // started 2 hours ago
  },
  {
    id: '201',
    title: 'Live Stream with Friends',
    hosts: [
      { name: 'James', avatar: 'https://randomuser.me/api/portraits/men/43.jpg', joinOrder: 1, isSpeaking: true, isMuted: false },
      { name: 'Lisa', avatar: 'https://randomuser.me/api/portraits/women/43.jpg', joinOrder: 2, isSpeaking: false, isMuted: false },
      { name: 'Kevin', avatar: 'https://randomuser.me/api/portraits/men/44.jpg', joinOrder: 3, isSpeaking: false, isMuted: false },
    ],
    viewers: [
      { name: 'Emma', avatar: 'https://randomuser.me/api/portraits/women/37.jpg', isMuted: false, isBanned: false },
      { name: 'Alex', avatar: 'https://randomuser.me/api/portraits/men/33.jpg', isMuted: false, isBanned: false },
      { name: 'Sophie', avatar: 'https://randomuser.me/api/portraits/women/38.jpg', isMuted: false, isBanned: false },
    ],
    views: 1350,
    boost: 210,
    rank: 3,
    isActive: true,
    startedAt: Date.now() - 1800000, // started 30 minutes ago
  },
  {
    id: '202',
    title: 'Live Stream with Friends',
    hosts: [
      { name: 'Sara', avatar: 'https://randomuser.me/api/portraits/women/32.jpg', joinOrder: 1, isSpeaking: true, isMuted: false },
      { name: 'Emily', avatar: 'https://randomuser.me/api/portraits/women/33.jpg', joinOrder: 2, isSpeaking: false, isMuted: false },
      { name: 'Anna', avatar: 'https://randomuser.me/api/portraits/women/34.jpg', joinOrder: 3, isSpeaking: false, isMuted: false },
      { name: 'John', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', joinOrder: 4, isSpeaking: false, isMuted: false },
    ],
    viewers: [
      { name: 'Mike', avatar: 'https://randomuser.me/api/portraits/men/31.jpg', isMuted: false, isBanned: false },
      { name: 'Lisa', avatar: 'https://randomuser.me/api/portraits/women/35.jpg', isMuted: false, isBanned: false },
    ],
    views: 2650,
    boost: 0,
    rank: 1,
    isActive: true,
    startedAt: Date.now() - 900000, // started 15 minutes ago
  },
  {
    id: '203',
    title: 'Epic gameplay session',
    hosts: [
      { name: 'GamerPro', avatar: 'https://randomuser.me/api/portraits/men/45.jpg', joinOrder: 1, isSpeaking: true, isMuted: false },
      { name: 'GameGirl', avatar: 'https://randomuser.me/api/portraits/women/39.jpg', joinOrder: 2, isSpeaking: false, isMuted: false },
    ],
    viewers: [
      { name: 'Fan1', avatar: 'https://randomuser.me/api/portraits/men/46.jpg', isMuted: false, isBanned: false },
      { name: 'Fan2', avatar: 'https://randomuser.me/api/portraits/women/40.jpg', isMuted: false, isBanned: false },
      { name: 'Fan3', avatar: 'https://randomuser.me/api/portraits/men/47.jpg', isMuted: false, isBanned: false },
    ],
    views: 1400,
    boost: 0,
    rank: 2,
    isActive: true,
    startedAt: Date.now() - 2700000, // started 45 minutes ago
  },
  {
    id: '301',
    title: 'Music & Chill',
    hosts: [
      { name: 'MusicLover', avatar: 'https://randomuser.me/api/portraits/women/41.jpg', joinOrder: 1, isSpeaking: true, isMuted: false },
      { name: 'ChillDude', avatar: 'https://randomuser.me/api/portraits/men/48.jpg', joinOrder: 2, isSpeaking: false, isMuted: false },
    ],
    viewers: [
      { name: 'Listener1', avatar: 'https://randomuser.me/api/portraits/women/42.jpg', isMuted: false, isBanned: false },
      { name: 'Listener2', avatar: 'https://randomuser.me/api/portraits/men/49.jpg', isMuted: false, isBanned: false },
    ],
    views: 890,
    boost: 0,
    isActive: true,
    startedAt: Date.now() - 3600000, // started 1 hour ago
  },
  {
    id: '302',
    title: 'Late night talks',
    hosts: [
      { name: 'NightOwl', avatar: 'https://randomuser.me/api/portraits/men/50.jpg', joinOrder: 1, isSpeaking: true, isMuted: false },
      { name: 'Insomniac', avatar: 'https://randomuser.me/api/portraits/women/43.jpg', joinOrder: 2, isSpeaking: false, isMuted: false },
    ],
    viewers: [
      { name: 'LateBird', avatar: 'https://randomuser.me/api/portraits/men/51.jpg', isMuted: false, isBanned: false },
      { name: 'SleepyHead', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', isMuted: false, isBanned: false },
    ],
    views: 650,
    boost: 0,
    isActive: true,
    startedAt: Date.now() - 5400000, // started 1.5 hours ago
  },
  {
    id: '303',
    title: 'Tech talk & coding',
    hosts: [
      { name: 'TechGuru', avatar: 'https://randomuser.me/api/portraits/men/52.jpg', joinOrder: 1, isSpeaking: true, isMuted: false },
      { name: 'CodeQueen', avatar: 'https://randomuser.me/api/portraits/women/45.jpg', joinOrder: 2, isSpeaking: false, isMuted: false },
    ],
    viewers: [
      { name: 'Dev1', avatar: 'https://randomuser.me/api/portraits/men/53.jpg', isMuted: false, isBanned: false },
      { name: 'Dev2', avatar: 'https://randomuser.me/api/portraits/women/46.jpg', isMuted: false, isBanned: false },
    ],
    views: 1200,
    boost: 0,
    isActive: true,
    startedAt: Date.now() - 3600000, // started 1 hour ago
  },
  {
    id: '304',
    title: 'Casual gaming & chill vibes',
    hosts: [
      { name: 'RelaxedGamer', avatar: 'https://randomuser.me/api/portraits/women/22.jpg', joinOrder: 1, isSpeaking: true, isMuted: false },
      { name: 'ChillDude', avatar: 'https://randomuser.me/api/portraits/men/21.jpg', joinOrder: 2, isSpeaking: false, isMuted: false },
      { name: 'FunFriend', avatar: 'https://randomuser.me/api/portraits/women/21.jpg', joinOrder: 3, isSpeaking: false, isMuted: false },
    ],
    viewers: [
      { name: 'Viewer1', avatar: 'https://randomuser.me/api/portraits/men/54.jpg', isMuted: false, isBanned: false },
      { name: 'Viewer2', avatar: 'https://randomuser.me/api/portraits/women/47.jpg', isMuted: false, isBanned: false },
    ],
    views: 1500,
    boost: 0,
    isActive: true,
    startedAt: Date.now() - 5400000, // started 1.5 hours ago
  },
];

// Provider component
export const LiveStreamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [streams, setStreams] = useState<LiveStream[]>(MOCK_STREAMS);
  const [currentlyWatching, setCurrentlyWatching] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // In a real app, you would fetch data from your API here
  useEffect(() => {
    // Simulating an API call
    const fetchStreams = async () => {
      // In a real app: const response = await api.getStreams();
      // Then: setStreams(response.data);
      
      // For now, we're using our mock data
      setStreams(MOCK_STREAMS);
    };

    fetchStreams();
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

  const joinStream = (streamId: string) => {
    console.log(`Joining stream ${streamId}`);
    setCurrentlyWatching(streamId);
    // In a real app, you might also track this on your backend
  };

  // Add this new function to handle minimizing streams
  const setStreamMinimized = (streamId: string, minimized: boolean) => {
    if (streamId) {
      setCurrentlyWatching(streamId);
      setIsMinimized(minimized);
    }
  };

  // New functions for enhanced live stream features
  const joinAsHost = (streamId: string, userName: string, userAvatar: string) => {
    setStreams(prevStreams => 
      prevStreams.map(stream => {
        if (stream.id === streamId) {
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
  };

  const kickHost = (streamId: string, hostName: string, kickedBy: string) => {
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
  };

  const muteViewer = (streamId: string, viewerName: string, mutedBy: string) => {
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
  };

  const banViewer = (streamId: string, viewerName: string, bannedBy: string) => {
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