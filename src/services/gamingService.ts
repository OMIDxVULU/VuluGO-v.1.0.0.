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
  setDoc,
  increment,
  FieldValue
} from 'firebase/firestore';
import { db, auth } from './firebase';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';
import virtualCurrencyService from './virtualCurrencyService';
import friendActivityService from './friendActivityService';

// Gaming types
export type GameType = 'mining' | 'slots' | 'gold_miner';

// Mining Game Interfaces
export interface MiningSession {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  resourcesCollected: {
    gold: number;
    gems: number;
    tokens: number;
  };
  miningPower: number;
  efficiency: number;
  duration: number; // in seconds
  location: string;
  equipment: string[];
}

export interface MiningStats {
  userId: string;
  totalSessions: number;
  totalMiningTime: number; // in seconds
  totalResourcesCollected: {
    gold: number;
    gems: number;
    tokens: number;
  };
  bestSession: {
    sessionId: string;
    resourcesCollected: number;
    duration: number;
  };
  currentStreak: number;
  longestStreak: number;
  achievements: string[];
  lastMiningDate: Date;
  miningLevel: number;
  experience: number;
  equipment: {
    pickaxe: string;
    helmet: string;
    boots: string;
    gloves: string;
  };
  lastUpdated: Date;
}

// Slots Game Interfaces
export interface SlotsSession {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
  betAmount: number;
  currencyType: 'gold' | 'gems' | 'tokens';
  result: {
    symbols: string[][];
    winningLines: number[];
    multiplier: number;
    payout: number;
  };
  isJackpot: boolean;
  jackpotAmount?: number;
}

export interface SlotsStats {
  userId: string;
  totalSpins: number;
  totalBet: number;
  totalWon: number;
  biggestWin: {
    sessionId: string;
    amount: number;
    multiplier: number;
  };
  jackpotsWon: number;
  winRate: number;
  favoriteSymbols: string[];
  lastPlayDate: Date;
  achievements: string[];
  lastUpdated: Date;
}

// Gold Miner Game Interfaces
export interface GoldMinerSession {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
  level: number;
  score: number;
  goldCollected: number;
  gemsCollected: number;
  timeBonus: number;
  multiplierBonus: number;
  totalEarnings: number;
  duration: number; // in seconds
  itemsCollected: {
    smallGold: number;
    mediumGold: number;
    largeGold: number;
    gems: number;
    diamonds: number;
    rocks: number;
    bags: number;
  };
}

export interface GoldMinerStats {
  userId: string;
  totalGames: number;
  highScore: number;
  totalGoldCollected: number;
  totalGemsCollected: number;
  currentLevel: number;
  experience: number;
  averageScore: number;
  bestTime: number;
  achievements: string[];
  upgrades: {
    clawStrength: number;
    clawSpeed: number;
    dynamite: number;
    luckyCharm: number;
  };
  lastPlayDate: Date;
  lastUpdated: Date;
}

// General Gaming Interfaces
export interface GameAchievement {
  id: string;
  gameType: GameType;
  name: string;
  description: string;
  icon: string;
  requirement: any;
  reward: {
    gold?: number;
    gems?: number;
    tokens?: number;
    experience?: number;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserGameProfile {
  userId: string;
  totalGamesPlayed: number;
  totalTimeSpent: number; // in seconds
  totalEarnings: {
    gold: number;
    gems: number;
    tokens: number;
  };
  favoriteGame: GameType;
  achievements: string[];
  level: number;
  experience: number;
  rank: string;
  lastActiveDate: Date;
  createdAt: Date;
  lastUpdated: Date;
}

class GamingService {
  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  // MINING GAME METHODS
  
  /**
   * Start a mining session
   */
  async startMiningSession(
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    location: string = 'surface',
    equipment: string[] = ['basic_pickaxe']
  ): Promise<string> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required to start mining');
      }

      // End any existing active mining session
      await this.endActiveMiningSession(userId);

      // Get user's mining stats to determine mining power
      const stats = await this.getMiningStats(userId);
      const miningPower = this.calculateMiningPower(stats);
      const efficiency = this.calculateMiningEfficiency(equipment, location);

      const session: Omit<MiningSession, 'id' | 'startTime'> & { startTime: FieldValue } = {
        userId,
        userName,
        userAvatar,
        startTime: serverTimestamp(),
        isActive: true,
        resourcesCollected: { gold: 0, gems: 0, tokens: 0 },
        miningPower,
        efficiency,
        duration: 0,
        location,
        equipment
      };

      const docRef = await addDoc(collection(db, 'miningSessions'), session);

      // Create friend activity
      await friendActivityService.createGamingActivity(
        userId,
        userName,
        userAvatar,
        {
          gameName: 'Mining',
          gameIcon: '⛏️',
          level: stats?.miningLevel || 1,
          achievement: `Started mining at ${location}`
        }
      );

      return docRef.id;
    } catch (error: any) {
      FirebaseErrorHandler.logError('startMiningSession', error);
      throw new Error(`Failed to start mining session: ${error.message}`);
    }
  }

  /**
   * End mining session and distribute rewards
   */
  async endMiningSession(sessionId: string): Promise<{ gold: number; gems: number; tokens: number }> {
    try {
      const sessionRef = doc(db, 'miningSessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        throw new Error('Mining session not found');
      }

      const sessionData = sessionDoc.data() as MiningSession;
      
      if (!sessionData.isActive) {
        throw new Error('Mining session is not active');
      }

      // Calculate mining duration
      const endTime = new Date();
      const startTime = sessionData.startTime && typeof sessionData.startTime.toDate === 'function'
        ? sessionData.startTime.toDate()
        : sessionData.startTime
          ? new Date(sessionData.startTime)
          : new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      // Calculate rewards based on duration, mining power, and efficiency
      const rewards = this.calculateMiningRewards(duration, sessionData.miningPower, sessionData.efficiency);

      // Update session
      await updateDoc(sessionRef, {
        endTime: serverTimestamp(),
        isActive: false,
        duration,
        resourcesCollected: rewards
      });

      // Distribute rewards to user
      if (rewards.gold > 0) {
        await virtualCurrencyService.addCurrency(
          sessionData.userId,
          'gold',
          rewards.gold,
          `Mining rewards - ${duration}s session`,
          { sessionId, gameType: 'mining', location: sessionData.location }
        );
      }

      if (rewards.gems > 0) {
        await virtualCurrencyService.addCurrency(
          sessionData.userId,
          'gems',
          rewards.gems,
          `Mining rewards - ${duration}s session`,
          { sessionId, gameType: 'mining', location: sessionData.location }
        );
      }

      if (rewards.tokens > 0) {
        await virtualCurrencyService.addCurrency(
          sessionData.userId,
          'tokens',
          rewards.tokens,
          `Mining rewards - ${duration}s session`,
          { sessionId, gameType: 'mining', location: sessionData.location }
        );
      }

      // Update mining stats
      await this.updateMiningStats(sessionData.userId, sessionId, duration, rewards);

      // Check for achievements
      await this.checkMiningAchievements(sessionData.userId);

      return rewards;
    } catch (error: any) {
      FirebaseErrorHandler.logError('endMiningSession', error);
      throw new Error(`Failed to end mining session: ${error.message}`);
    }
  }

  /**
   * Get active mining session for user
   */
  async getActiveMiningSession(userId: string): Promise<MiningSession | null> {
    try {
      const q = query(
        collection(db, 'miningSessions'),
        where('userId', '==', userId),
        where('isActive', '==', true),
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
      } as MiningSession;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getActiveMiningSession - returning null for guest user');
        return null;
      }

      FirebaseErrorHandler.logError('getActiveMiningSession', error);
      throw new Error(`Failed to get active mining session: ${error.message}`);
    }
  }

  /**
   * Get mining statistics for user
   */
  async getMiningStats(userId: string): Promise<MiningStats | null> {
    try {
      const statsRef = doc(db, 'miningStats', userId);
      const statsDoc = await getDoc(statsRef);

      if (!statsDoc.exists()) {
        // Create initial stats
        const initialStats: Omit<MiningStats, 'lastUpdated'> & { lastUpdated: any } = {
          userId,
          totalSessions: 0,
          totalMiningTime: 0,
          totalResourcesCollected: { gold: 0, gems: 0, tokens: 0 },
          bestSession: { sessionId: '', resourcesCollected: 0, duration: 0 },
          currentStreak: 0,
          longestStreak: 0,
          achievements: [],
          lastMiningDate: serverTimestamp(),
          miningLevel: 1,
          experience: 0,
          equipment: {
            pickaxe: 'basic_pickaxe',
            helmet: 'basic_helmet',
            boots: 'basic_boots',
            gloves: 'basic_gloves'
          },
          lastUpdated: serverTimestamp()
        };

        await setDoc(statsRef, initialStats);
        return { ...initialStats, lastUpdated: new Date(), lastMiningDate: new Date() } as MiningStats;
      }

      const data = statsDoc.data();
      return {
        ...data,
        lastMiningDate: data.lastMiningDate?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      } as MiningStats;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getMiningStats - returning null for guest user');
        return null;
      }

      FirebaseErrorHandler.logError('getMiningStats', error);
      throw new Error(`Failed to get mining stats: ${error.message}`);
    }
  }

  // SLOTS GAME METHODS

  /**
   * Play slots game
   */
  async playSlots(
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    betAmount: number,
    currencyType: 'gold' | 'gems' | 'tokens'
  ): Promise<SlotsSession> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required to play slots');
      }

      // Check if user can afford the bet
      const canAfford = await virtualCurrencyService.canAfford(userId, { [currencyType]: betAmount });
      if (!canAfford) {
        throw new Error(`Insufficient ${currencyType} balance for bet`);
      }

      // Deduct bet amount
      await virtualCurrencyService.spendCurrency(
        userId,
        currencyType,
        betAmount,
        `Slots bet - ${betAmount} ${currencyType}`,
        { gameType: 'slots', betAmount }
      );

      // Generate slot result
      const result = this.generateSlotsResult();
      const payout = Math.floor(betAmount * result.multiplier);
      const isJackpot = result.multiplier >= 100;

      // Create session record
      const session: Omit<SlotsSession, 'id'> = {
        userId,
        userName,
        userAvatar,
        timestamp: serverTimestamp(),
        betAmount,
        currencyType,
        result,
        isJackpot,
        jackpotAmount: isJackpot ? payout : undefined
      };

      const docRef = await addDoc(collection(db, 'slotsSessions'), session);

      // Pay out winnings if any
      if (payout > 0) {
        await virtualCurrencyService.addCurrency(
          userId,
          currencyType,
          payout,
          `Slots winnings - ${result.multiplier}x multiplier`,
          { sessionId: docRef.id, gameType: 'slots', multiplier: result.multiplier }
        );
      }

      // Update slots stats
      await this.updateSlotsStats(userId, docRef.id, betAmount, payout, result.multiplier, isJackpot);

      // Create friend activity for big wins
      if (result.multiplier >= 10) {
        await friendActivityService.createGamingActivity(
          userId,
          userName,
          userAvatar,
          {
            gameName: 'Slots',
            gameIcon: '🎰',
            score: payout,
            achievement: isJackpot ? 'JACKPOT!' : `${result.multiplier}x Win!`
          }
        );
      }

      return {
        id: docRef.id,
        ...session,
        timestamp: new Date()
      } as SlotsSession;
    } catch (error: any) {
      FirebaseErrorHandler.logError('playSlots', error);
      throw new Error(`Failed to play slots: ${error.message}`);
    }
  }

  // GOLD MINER GAME METHODS

  /**
   * Complete gold miner game session
   */
  async completeGoldMinerSession(
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    gameData: {
      level: number;
      score: number;
      goldCollected: number;
      gemsCollected: number;
      duration: number;
      itemsCollected: any;
    }
  ): Promise<{ goldReward: number; gemReward: number; experienceGained: number }> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required to complete gold miner session');
      }

      // Calculate bonuses and rewards
      const timeBonus = this.calculateTimeBonus(gameData.duration, gameData.level);
      const multiplierBonus = this.calculateMultiplierBonus(gameData.score);
      const goldReward = Math.floor(gameData.goldCollected * (1 + multiplierBonus));
      const gemReward = Math.floor(gameData.gemsCollected * (1 + multiplierBonus));
      const experienceGained = Math.floor(gameData.score / 100) + timeBonus;

      const session: Omit<GoldMinerSession, 'id'> = {
        userId,
        userName,
        userAvatar,
        timestamp: serverTimestamp(),
        level: gameData.level,
        score: gameData.score,
        goldCollected: gameData.goldCollected,
        gemsCollected: gameData.gemsCollected,
        timeBonus,
        multiplierBonus,
        totalEarnings: goldReward + (gemReward * 5), // Gems worth 5x gold
        duration: gameData.duration,
        itemsCollected: gameData.itemsCollected
      };

      const docRef = await addDoc(collection(db, 'goldMinerSessions'), session);

      // Distribute rewards
      if (goldReward > 0) {
        await virtualCurrencyService.addCurrency(
          userId,
          'gold',
          goldReward,
          `Gold Miner rewards - Level ${gameData.level}`,
          { sessionId: docRef.id, gameType: 'gold_miner', level: gameData.level }
        );
      }

      if (gemReward > 0) {
        await virtualCurrencyService.addCurrency(
          userId,
          'gems',
          gemReward,
          `Gold Miner gem rewards - Level ${gameData.level}`,
          { sessionId: docRef.id, gameType: 'gold_miner', level: gameData.level }
        );
      }

      // Update gold miner stats
      await this.updateGoldMinerStats(userId, docRef.id, gameData, experienceGained);

      // Create friend activity for high scores
      if (gameData.score > 10000) {
        await friendActivityService.createGamingActivity(
          userId,
          userName,
          userAvatar,
          {
            gameName: 'Gold Miner',
            gameIcon: '⚒️',
            score: gameData.score,
            level: gameData.level,
            achievement: `High Score: ${gameData.score.toLocaleString()}`
          }
        );
      }

      return { goldReward, gemReward, experienceGained };
    } catch (error: any) {
      FirebaseErrorHandler.logError('completeGoldMinerSession', error);
      throw new Error(`Failed to complete gold miner session: ${error.message}`);
    }
  }

  // HELPER METHODS

  private calculateMiningPower(stats: MiningStats | null): number {
    const basepower = 10;
    const levelBonus = (stats?.miningLevel || 1) * 5;
    const equipmentBonus = this.calculateEquipmentBonus(stats?.equipment);
    return basepower + levelBonus + equipmentBonus;
  }

  private calculateMiningEfficiency(equipment: string[], location: string): number {
    let efficiency = 1.0;
    
    // Equipment bonuses
    if (equipment.includes('diamond_pickaxe')) efficiency += 0.5;
    else if (equipment.includes('gold_pickaxe')) efficiency += 0.3;
    else if (equipment.includes('iron_pickaxe')) efficiency += 0.1;

    // Location modifiers
    if (location === 'deep_cave') efficiency += 0.2;
    else if (location === 'mountain') efficiency += 0.1;

    return efficiency;
  }

  private calculateEquipmentBonus(equipment: any): number {
    if (!equipment) return 0;
    
    let bonus = 0;
    Object.values(equipment).forEach((item: any) => {
      if (typeof item === 'string') {
        if (item.includes('diamond')) bonus += 15;
        else if (item.includes('gold')) bonus += 10;
        else if (item.includes('iron')) bonus += 5;
      }
    });
    
    return bonus;
  }

  private calculateMiningRewards(duration: number, miningPower: number, efficiency: number): { gold: number; gems: number; tokens: number } {
    const minutes = Math.floor(duration / 60);
    const baseGold = Math.floor(minutes * miningPower * efficiency);
    const baseGems = Math.floor(minutes * (miningPower * efficiency) / 10);
    const baseTokens = Math.floor(minutes * (miningPower * efficiency) / 50);

    return {
      gold: Math.max(0, baseGold + Math.floor(Math.random() * baseGold * 0.2)),
      gems: Math.max(0, baseGems + Math.floor(Math.random() * baseGems * 0.1)),
      tokens: Math.max(0, baseTokens)
    };
  }

  private generateSlotsResult(): { symbols: string[][]; winningLines: number[]; multiplier: number; payout: number } {
    const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
    const reels: string[][] = [];
    
    // Generate 3x3 grid
    for (let i = 0; i < 3; i++) {
      reels[i] = [];
      for (let j = 0; j < 3; j++) {
        reels[i][j] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    }

    // Check for winning combinations
    const winningLines: number[] = [];
    let multiplier = 0;

    // Check horizontal lines
    for (let row = 0; row < 3; row++) {
      if (reels[row][0] === reels[row][1] && reels[row][1] === reels[row][2]) {
        winningLines.push(row);
        multiplier += this.getSymbolMultiplier(reels[row][0]);
      }
    }

    // Check vertical lines
    for (let col = 0; col < 3; col++) {
      if (reels[0][col] === reels[1][col] && reels[1][col] === reels[2][col]) {
        winningLines.push(col + 3);
        multiplier += this.getSymbolMultiplier(reels[0][col]);
      }
    }

    // Check diagonals
    if (reels[0][0] === reels[1][1] && reels[1][1] === reels[2][2]) {
      winningLines.push(6);
      multiplier += this.getSymbolMultiplier(reels[0][0]);
    }
    
    if (reels[0][2] === reels[1][1] && reels[1][1] === reels[2][0]) {
      winningLines.push(7);
      multiplier += this.getSymbolMultiplier(reels[0][2]);
    }

    return {
      symbols: reels,
      winningLines,
      multiplier,
      payout: multiplier
    };
  }

  private getSymbolMultiplier(symbol: string): number {
    const multipliers: { [key: string]: number } = {
      '🍒': 2,
      '🍋': 3,
      '🍊': 4,
      '🍇': 5,
      '⭐': 10,
      '💎': 25,
      '7️⃣': 100
    };
    return multipliers[symbol] || 1;
  }

  private calculateTimeBonus(duration: number, level: number): number {
    const targetTime = level * 60; // 1 minute per level
    if (duration < targetTime) {
      return Math.floor((targetTime - duration) / 10);
    }
    return 0;
  }

  private calculateMultiplierBonus(score: number): number {
    if (score > 50000) return 0.5;
    if (score > 25000) return 0.3;
    if (score > 10000) return 0.2;
    if (score > 5000) return 0.1;
    return 0;
  }

  // STATS UPDATE METHODS

  private async endActiveMiningSession(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'miningSessions'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          isActive: false,
          endTime: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.warn('Failed to end active mining sessions:', error);
    }
  }

  private async updateMiningStats(userId: string, sessionId: string, duration: number, rewards: any): Promise<void> {
    try {
      const statsRef = doc(db, 'miningStats', userId);
      const statsDoc = await getDoc(statsRef);

      const totalResources = rewards.gold + rewards.gems + rewards.tokens;
      const experienceGained = Math.floor(duration / 60) + Math.floor(totalResources / 10);

      if (statsDoc.exists()) {
        const currentStats = statsDoc.data() as MiningStats;
        const newExperience = currentStats.experience + experienceGained;
        const newLevel = Math.floor(newExperience / 1000) + 1;

        await updateDoc(statsRef, {
          totalSessions: increment(1),
          totalMiningTime: increment(duration),
          'totalResourcesCollected.gold': increment(rewards.gold),
          'totalResourcesCollected.gems': increment(rewards.gems),
          'totalResourcesCollected.tokens': increment(rewards.tokens),
          experience: newExperience,
          miningLevel: newLevel,
          lastMiningDate: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          ...(totalResources > (currentStats.bestSession?.resourcesCollected || 0) && {
            bestSession: {
              sessionId,
              resourcesCollected: totalResources,
              duration
            }
          })
        });
      }
    } catch (error) {
      console.warn('Failed to update mining stats:', error);
    }
  }

  private async checkMiningAchievements(userId: string): Promise<void> {
    try {
      const stats = await this.getMiningStats(userId);
      if (!stats) return;

      const newAchievements: string[] = [];

      // Check various achievements
      if (stats.totalSessions >= 10 && !stats.achievements.includes('miner_novice')) {
        newAchievements.push('miner_novice');
      }

      if (stats.totalSessions >= 100 && !stats.achievements.includes('miner_expert')) {
        newAchievements.push('miner_expert');
      }

      if (stats.totalResourcesCollected.gold >= 10000 && !stats.achievements.includes('gold_collector')) {
        newAchievements.push('gold_collector');
      }

      if (newAchievements.length > 0) {
        const statsRef = doc(db, 'miningStats', userId);
        await updateDoc(statsRef, {
          achievements: [...stats.achievements, ...newAchievements],
          lastUpdated: serverTimestamp()
        });

        // Award achievement rewards
        for (const achievement of newAchievements) {
          await this.awardAchievementReward(userId, achievement);
        }
      }
    } catch (error) {
      console.warn('Failed to check mining achievements:', error);
    }
  }

  private async updateSlotsStats(userId: string, sessionId: string, betAmount: number, payout: number, multiplier: number, isJackpot: boolean): Promise<void> {
    try {
      const statsRef = doc(db, 'slotsStats', userId);
      const statsDoc = await getDoc(statsRef);

      if (statsDoc.exists()) {
        const currentStats = statsDoc.data() as SlotsStats;
        const newWinRate = ((currentStats.winRate * currentStats.totalSpins) + (payout > 0 ? 1 : 0)) / (currentStats.totalSpins + 1);

        await updateDoc(statsRef, {
          totalSpins: increment(1),
          totalBet: increment(betAmount),
          totalWon: increment(payout),
          winRate: newWinRate,
          lastPlayDate: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          ...(isJackpot && { jackpotsWon: increment(1) }),
          ...(payout > (currentStats.biggestWin?.amount || 0) && {
            biggestWin: {
              sessionId,
              amount: payout,
              multiplier
            }
          })
        });
      } else {
        // Create initial stats
        const initialStats: Omit<SlotsStats, 'lastPlayDate' | 'lastUpdated'> & { lastPlayDate: any; lastUpdated: any } = {
          userId,
          totalSpins: 1,
          totalBet: betAmount,
          totalWon: payout,
          biggestWin: { sessionId, amount: payout, multiplier },
          jackpotsWon: isJackpot ? 1 : 0,
          winRate: payout > 0 ? 1 : 0,
          favoriteSymbols: [],
          achievements: [],
          lastPlayDate: serverTimestamp(),
          lastUpdated: serverTimestamp()
        };

        await setDoc(statsRef, initialStats);
      }
    } catch (error) {
      console.warn('Failed to update slots stats:', error);
    }
  }

  private async updateGoldMinerStats(userId: string, sessionId: string, gameData: any, experienceGained: number): Promise<void> {
    try {
      const statsRef = doc(db, 'goldMinerStats', userId);
      const statsDoc = await getDoc(statsRef);

      if (statsDoc.exists()) {
        const currentStats = statsDoc.data() as GoldMinerStats;
        const newExperience = currentStats.experience + experienceGained;
        const newLevel = Math.floor(newExperience / 500) + 1;
        const newAverageScore = ((currentStats.averageScore * currentStats.totalGames) + gameData.score) / (currentStats.totalGames + 1);

        await updateDoc(statsRef, {
          totalGames: increment(1),
          totalGoldCollected: increment(gameData.goldCollected),
          totalGemsCollected: increment(gameData.gemsCollected),
          experience: newExperience,
          currentLevel: newLevel,
          averageScore: newAverageScore,
          lastPlayDate: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          ...(gameData.score > currentStats.highScore && { highScore: gameData.score }),
          ...(gameData.duration < (currentStats.bestTime || Infinity) && { bestTime: gameData.duration })
        });
      } else {
        // Create initial stats
        const initialStats: Omit<GoldMinerStats, 'lastPlayDate' | 'lastUpdated'> & { lastPlayDate: any; lastUpdated: any } = {
          userId,
          totalGames: 1,
          highScore: gameData.score,
          totalGoldCollected: gameData.goldCollected,
          totalGemsCollected: gameData.gemsCollected,
          currentLevel: 1,
          experience: experienceGained,
          averageScore: gameData.score,
          bestTime: gameData.duration,
          achievements: [],
          upgrades: {
            clawStrength: 1,
            clawSpeed: 1,
            dynamite: 0,
            luckyCharm: 0
          },
          lastPlayDate: serverTimestamp(),
          lastUpdated: serverTimestamp()
        };

        await setDoc(statsRef, initialStats);
      }
    } catch (error) {
      console.warn('Failed to update gold miner stats:', error);
    }
  }

  private async awardAchievementReward(userId: string, achievementId: string): Promise<void> {
    try {
      const rewards: { [key: string]: { gold?: number; gems?: number; tokens?: number } } = {
        'miner_novice': { gold: 500, gems: 10 },
        'miner_expert': { gold: 2000, gems: 50 },
        'gold_collector': { gold: 1000, gems: 25 }
      };

      const reward = rewards[achievementId];
      if (!reward) return;

      if (reward.gold) {
        await virtualCurrencyService.addCurrency(
          userId,
          'gold',
          reward.gold,
          `Achievement reward: ${achievementId}`,
          { type: 'achievement', achievementId }
        );
      }

      if (reward.gems) {
        await virtualCurrencyService.addCurrency(
          userId,
          'gems',
          reward.gems,
          `Achievement reward: ${achievementId}`,
          { type: 'achievement', achievementId }
        );
      }

      if (reward.tokens) {
        await virtualCurrencyService.addCurrency(
          userId,
          'tokens',
          reward.tokens,
          `Achievement reward: ${achievementId}`,
          { type: 'achievement', achievementId }
        );
      }
    } catch (error) {
      console.warn('Failed to award achievement reward:', error);
    }
  }

  // PUBLIC GETTER METHODS

  /**
   * Get slots statistics for user
   */
  async getSlotsStats(userId: string): Promise<SlotsStats | null> {
    try {
      const statsRef = doc(db, 'slotsStats', userId);
      const statsDoc = await getDoc(statsRef);

      if (!statsDoc.exists()) {
        return null;
      }

      const data = statsDoc.data();
      return {
        ...data,
        lastPlayDate: data.lastPlayDate?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      } as SlotsStats;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getSlotsStats - returning null for guest user');
        return null;
      }

      FirebaseErrorHandler.logError('getSlotsStats', error);
      throw new Error(`Failed to get slots stats: ${error.message}`);
    }
  }

  /**
   * Get gold miner statistics for user
   */
  async getGoldMinerStats(userId: string): Promise<GoldMinerStats | null> {
    try {
      const statsRef = doc(db, 'goldMinerStats', userId);
      const statsDoc = await getDoc(statsRef);

      if (!statsDoc.exists()) {
        return null;
      }

      const data = statsDoc.data();
      return {
        ...data,
        lastPlayDate: data.lastPlayDate?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      } as GoldMinerStats;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getGoldMinerStats - returning null for guest user');
        return null;
      }

      FirebaseErrorHandler.logError('getGoldMinerStats', error);
      throw new Error(`Failed to get gold miner stats: ${error.message}`);
    }
  }

  /**
   * Get user's overall gaming profile
   */
  async getUserGameProfile(userId: string): Promise<UserGameProfile | null> {
    try {
      const profileRef = doc(db, 'userGameProfiles', userId);
      const profileDoc = await getDoc(profileRef);

      if (!profileDoc.exists()) {
        // Create initial profile
        const initialProfile: Omit<UserGameProfile, 'createdAt' | 'lastUpdated' | 'lastActiveDate'> & {
          createdAt: any;
          lastUpdated: any;
          lastActiveDate: any;
        } = {
          userId,
          totalGamesPlayed: 0,
          totalTimeSpent: 0,
          totalEarnings: { gold: 0, gems: 0, tokens: 0 },
          favoriteGame: 'mining',
          achievements: [],
          level: 1,
          experience: 0,
          rank: 'Novice',
          createdAt: serverTimestamp(),
          lastActiveDate: serverTimestamp(),
          lastUpdated: serverTimestamp()
        };

        await setDoc(profileRef, initialProfile);
        return {
          ...initialProfile,
          createdAt: new Date(),
          lastUpdated: new Date(),
          lastActiveDate: new Date()
        } as UserGameProfile;
      }

      const data = profileDoc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActiveDate: data.lastActiveDate?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      } as UserGameProfile;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getUserGameProfile - returning null for guest user');
        return null;
      }

      FirebaseErrorHandler.logError('getUserGameProfile', error);
      throw new Error(`Failed to get user game profile: ${error.message}`);
    }
  }
}

export const gamingService = new GamingService();
export default gamingService;
