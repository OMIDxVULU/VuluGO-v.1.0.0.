import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import gamingService, { 
  MiningSession, 
  MiningStats, 
  SlotsStats, 
  GoldMinerStats, 
  UserGameProfile,
  SlotsSession,
  GoldMinerSession
} from '../services/gamingService';

interface GamingContextType {
  // Mining Game State
  activeMiningSession: MiningSession | null;
  miningStats: MiningStats | null;
  isMining: boolean;
  
  // Slots Game State
  slotsStats: SlotsStats | null;
  lastSlotsSession: SlotsSession | null;
  
  // Gold Miner Game State
  goldMinerStats: GoldMinerStats | null;
  lastGoldMinerSession: GoldMinerSession | null;
  
  // Overall Gaming State
  userGameProfile: UserGameProfile | null;
  
  // Loading States
  isLoadingMining: boolean;
  isLoadingSlots: boolean;
  isLoadingGoldMiner: boolean;
  isLoadingProfile: boolean;
  
  // Mining Game Actions
  startMining: (location?: string, equipment?: string[]) => Promise<void>;
  stopMining: () => Promise<{ gold: number; gems: number; tokens: number }>;
  refreshMiningData: () => Promise<void>;
  
  // Slots Game Actions
  playSlots: (betAmount: number, currencyType: 'gold' | 'gems' | 'tokens') => Promise<SlotsSession>;
  refreshSlotsData: () => Promise<void>;
  
  // Gold Miner Game Actions
  completeGoldMinerGame: (gameData: {
    level: number;
    score: number;
    goldCollected: number;
    gemsCollected: number;
    duration: number;
    itemsCollected: any;
  }) => Promise<{ goldReward: number; gemReward: number; experienceGained: number }>;
  refreshGoldMinerData: () => Promise<void>;
  
  // General Actions
  refreshAllGamingData: () => Promise<void>;
}

const GamingContext = createContext<GamingContextType | undefined>(undefined);

interface GamingProviderProps {
  children: ReactNode;
}

export const GamingProvider: React.FC<GamingProviderProps> = ({ children }) => {
  const { user, isGuest, userProfile } = useAuth();
  
  // Mining State
  const [activeMiningSession, setActiveMiningSession] = useState<MiningSession | null>(null);
  const [miningStats, setMiningStats] = useState<MiningStats | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [isLoadingMining, setIsLoadingMining] = useState(false);
  
  // Slots State
  const [slotsStats, setSlotsStats] = useState<SlotsStats | null>(null);
  const [lastSlotsSession, setLastSlotsSession] = useState<SlotsSession | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  // Gold Miner State
  const [goldMinerStats, setGoldMinerStats] = useState<GoldMinerStats | null>(null);
  const [lastGoldMinerSession, setLastGoldMinerSession] = useState<GoldMinerSession | null>(null);
  const [isLoadingGoldMiner, setIsLoadingGoldMiner] = useState(false);
  
  // Overall Gaming State
  const [userGameProfile, setUserGameProfile] = useState<UserGameProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Load gaming data when user changes
  useEffect(() => {
    if (!user || isGuest) {
      // Reset all state for guests
      setActiveMiningSession(null);
      setMiningStats(null);
      setIsMining(false);
      setSlotsStats(null);
      setLastSlotsSession(null);
      setGoldMinerStats(null);
      setLastGoldMinerSession(null);
      setUserGameProfile(null);
      return;
    }

    loadAllGamingData();
  }, [user, isGuest]);

  // Load all gaming-related data
  const loadAllGamingData = async () => {
    if (!user || isGuest) return;

    try {
      const results = await Promise.allSettled([
        refreshMiningData(),
        refreshSlotsData(),
        refreshGoldMinerData(),
        refreshProfileData()
      ]);

      // Handle results individually
      results.forEach((result, index) => {
        const operations = ['mining', 'slots', 'goldMiner', 'profile'];
        if (result.status === 'rejected') {
          console.error(`Failed to load ${operations[index]} data:`, result.reason);
        }
      });
    } catch (error) {
      console.error('Failed to load gaming data:', error);
    }
  };

  // Mining Game Actions
  const startMining = async (location: string = 'surface', equipment: string[] = ['basic_pickaxe']) => {
    if (!user || isGuest) {
      throw new Error('Authentication required to start mining');
    }

    setIsLoadingMining(true);
    try {
      const sessionId = await gamingService.startMiningSession(
        user.uid,
        userProfile?.displayName || 'User',
        userProfile?.photoURL,
        location,
        equipment
      );

      // Refresh mining data to get the new session
      await refreshMiningData();
    } catch (error: any) {
      console.error('Failed to start mining:', error);
      throw new Error(`Failed to start mining: ${error.message}`);
    } finally {
      setIsLoadingMining(false);
    }
  };

  const stopMining = async (): Promise<{ gold: number; gems: number; tokens: number }> => {
    if (!user || isGuest || !activeMiningSession) {
      throw new Error('No active mining session to stop');
    }

    setIsLoadingMining(true);
    try {
      const rewards = await gamingService.endMiningSession(activeMiningSession.id);
      
      // Refresh mining data
      await refreshMiningData();
      
      return rewards;
    } catch (error: any) {
      console.error('Failed to stop mining:', error);
      throw new Error(`Failed to stop mining: ${error.message}`);
    } finally {
      setIsLoadingMining(false);
    }
  };

  const refreshMiningData = async () => {
    if (!user || isGuest) return;

    setIsLoadingMining(true);
    try {
      const [session, stats] = await Promise.all([
        gamingService.getActiveMiningSession(user.uid),
        gamingService.getMiningStats(user.uid)
      ]);

      setActiveMiningSession(session);
      setMiningStats(stats);
      setIsMining(session?.isActive || false);
    } catch (error) {
      console.error('Failed to refresh mining data:', error);
    } finally {
      setIsLoadingMining(false);
    }
  };

  // Slots Game Actions
  const playSlots = async (betAmount: number, currencyType: 'gold' | 'gems' | 'tokens'): Promise<SlotsSession> => {
    if (!user || isGuest) {
      throw new Error('Authentication required to play slots');
    }

    setIsLoadingSlots(true);
    try {
      const session = await gamingService.playSlots(
        user.uid,
        userProfile?.displayName || 'User',
        userProfile?.photoURL,
        betAmount,
        currencyType
      );

      setLastSlotsSession(session);
      
      // Refresh slots data
      await refreshSlotsData();
      
      return session;
    } catch (error: any) {
      console.error('Failed to play slots:', error);
      throw new Error(`Failed to play slots: ${error.message}`);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const refreshSlotsData = async () => {
    if (!user || isGuest) return;

    setIsLoadingSlots(true);
    try {
      const stats = await gamingService.getSlotsStats(user.uid);
      setSlotsStats(stats);
    } catch (error) {
      console.error('Failed to refresh slots data:', error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Gold Miner Game Actions
  const completeGoldMinerGame = async (gameData: {
    level: number;
    score: number;
    goldCollected: number;
    gemsCollected: number;
    duration: number;
    itemsCollected: any;
  }): Promise<{ goldReward: number; gemReward: number; experienceGained: number }> => {
    if (!user || isGuest) {
      throw new Error('Authentication required to complete gold miner game');
    }

    setIsLoadingGoldMiner(true);
    try {
      const rewards = await gamingService.completeGoldMinerSession(
        user.uid,
        userProfile?.displayName || 'User',
        userProfile?.photoURL,
        gameData
      );

      // Refresh gold miner data
      await refreshGoldMinerData();
      
      return rewards;
    } catch (error: any) {
      console.error('Failed to complete gold miner game:', error);
      throw new Error(`Failed to complete gold miner game: ${error.message}`);
    } finally {
      setIsLoadingGoldMiner(false);
    }
  };

  const refreshGoldMinerData = async () => {
    if (!user || isGuest) return;

    setIsLoadingGoldMiner(true);
    try {
      const stats = await gamingService.getGoldMinerStats(user.uid);
      setGoldMinerStats(stats);
    } catch (error) {
      console.error('Failed to refresh gold miner data:', error);
    } finally {
      setIsLoadingGoldMiner(false);
    }
  };

  // Profile Actions
  const refreshProfileData = async () => {
    if (!user || isGuest) return;

    setIsLoadingProfile(true);
    try {
      const profile = await gamingService.getUserGameProfile(user.uid);
      setUserGameProfile(profile);
    } catch (error) {
      console.error('Failed to refresh profile data:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // General Actions
  const refreshAllGamingData = async () => {
    await loadAllGamingData();
  };

  return (
    <GamingContext.Provider value={{
      // Mining Game State
      activeMiningSession,
      miningStats,
      isMining,
      
      // Slots Game State
      slotsStats,
      lastSlotsSession,
      
      // Gold Miner Game State
      goldMinerStats,
      lastGoldMinerSession,
      
      // Overall Gaming State
      userGameProfile,
      
      // Loading States
      isLoadingMining,
      isLoadingSlots,
      isLoadingGoldMiner,
      isLoadingProfile,
      
      // Mining Game Actions
      startMining,
      stopMining,
      refreshMiningData,
      
      // Slots Game Actions
      playSlots,
      refreshSlotsData,
      
      // Gold Miner Game Actions
      completeGoldMinerGame,
      refreshGoldMinerData,
      
      // General Actions
      refreshAllGamingData
    }}>
      {children}
    </GamingContext.Provider>
  );
};

// Custom hook to use the gaming context
export const useGaming = (): GamingContextType => {
  const context = useContext(GamingContext);
  if (!context) {
    throw new Error('useGaming must be used within a GamingProvider');
  }
  return context;
};

export default GamingContext;
