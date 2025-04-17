import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the structure of a stream
export interface StreamHost {
  name: string;
  avatar: string;
}

export interface StreamFriend {
  name: string;
  avatar: string;
}

export interface LiveStream {
  id: string;
  title: string;
  hosts: StreamHost[];
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
}

// Create the context with a default value
const LiveStreamContext = createContext<LiveStreamContextType | undefined>(undefined);

// Mock data for demonstration purposes - in a real app, this would come from an API
const MOCK_STREAMS: LiveStream[] = [
  {
    id: '101',
    title: 'Live title, test test test test test 123',
    hosts: [
      { name: 'Sara', avatar: 'https://randomuser.me/api/portraits/women/32.jpg' },
      { name: 'Emily', avatar: 'https://randomuser.me/api/portraits/women/33.jpg' },
      { name: 'Anna', avatar: 'https://randomuser.me/api/portraits/women/34.jpg' },
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
      { name: 'Michael', avatar: 'https://randomuser.me/api/portraits/men/33.jpg' },
      { name: 'David', avatar: 'https://randomuser.me/api/portraits/women/32.jpg' },
      { name: 'Tom', avatar: 'https://randomuser.me/api/portraits/women/33.jpg' },
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
      { name: 'James', avatar: 'https://randomuser.me/api/portraits/men/43.jpg' },
      { name: 'Lisa', avatar: 'https://randomuser.me/api/portraits/women/43.jpg' },
      { name: 'Kevin', avatar: 'https://randomuser.me/api/portraits/men/44.jpg' },
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
      { name: 'Sara', avatar: 'https://randomuser.me/api/portraits/women/32.jpg' },
      { name: 'Emily', avatar: 'https://randomuser.me/api/portraits/women/33.jpg' },
      { name: 'Anna', avatar: 'https://randomuser.me/api/portraits/women/34.jpg' },
      { name: 'John', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
    ],
    views: 1420,
    boost: 320,
    rank: 2,
    friends: [
      { name: 'Ella', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    ],
    isActive: true,
    startedAt: Date.now() - 2700000, // started 45 minutes ago
  },
  {
    id: '301',
    title: 'Epic gameplay session',
    hosts: [
      { name: 'Alex', avatar: 'https://randomuser.me/api/portraits/men/28.jpg' },
      { name: 'Sarah', avatar: 'https://randomuser.me/api/portraits/women/29.jpg' },
      { name: 'Mike', avatar: 'https://randomuser.me/api/portraits/men/30.jpg' },
    ],
    views: 631,
    boost: 450,
    rank: 1,
    isActive: true,
    startedAt: Date.now() - 5400000, // started 1.5 hours ago
  },
  {
    id: '302',
    title: 'Late night streaming',
    hosts: [
      { name: 'NightOwl', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
      { name: 'MidnightGamer', avatar: 'https://randomuser.me/api/portraits/men/44.jpg' },
      { name: 'LateStreamer', avatar: 'https://randomuser.me/api/portraits/women/45.jpg' },
    ],
    views: 312,
    boost: 0,
    isActive: true,
    startedAt: Date.now() - 9000000, // started 2.5 hours ago
  },
  {
    id: '303',
    title: 'Competitive matchmaking',
    hosts: [
      { name: 'ChampPlayer', avatar: 'https://randomuser.me/api/portraits/men/28.jpg' },
      { name: 'ProCoach', avatar: 'https://randomuser.me/api/portraits/women/28.jpg' },
      { name: 'Teammate1', avatar: 'https://randomuser.me/api/portraits/men/29.jpg' },
    ],
    views: 2100,
    boost: 0,
    friends: [
      { name: 'Friend4', avatar: 'https://randomuser.me/api/portraits/women/24.jpg' },
      { name: 'Friend5', avatar: 'https://randomuser.me/api/portraits/men/25.jpg' },
    ],
    isActive: true,
    startedAt: Date.now() - 3600000, // started 1 hour ago
  },
  {
    id: '304',
    title: 'Casual gaming & chill vibes',
    hosts: [
      { name: 'RelaxedGamer', avatar: 'https://randomuser.me/api/portraits/women/22.jpg' },
      { name: 'ChillDude', avatar: 'https://randomuser.me/api/portraits/men/21.jpg' },
      { name: 'FunFriend', avatar: 'https://randomuser.me/api/portraits/women/21.jpg' },
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