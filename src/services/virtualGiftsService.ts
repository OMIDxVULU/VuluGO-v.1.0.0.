/**
 * Virtual Gifts Service
 * Handles virtual currency, gift sending, revenue sharing, and monetization
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface VirtualGift {
  id: string;
  name: string;
  description: string;
  emoji: string;
  animationUrl?: string;
  thumbnailUrl?: string;
  price: number; // in gems
  goldValue: number; // gold equivalent for recipient
  category: 'basic' | 'premium' | 'exclusive' | 'seasonal';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;
  isLimited: boolean;
  limitedQuantity?: number;
  remainingQuantity?: number;
  validUntil?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GiftTransaction {
  id: string;
  giftId: string;
  giftName: string;
  giftEmoji: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  streamId?: string;
  messageId?: string;
  
  // Financial details
  gemsCost: number;
  goldValue: number;
  platformFee: number;
  recipientEarnings: number;
  
  // Transaction status
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  
  // Metadata
  position?: { x: number; y: number };
  message?: string;
  isPublic: boolean;
  
  createdAt: Timestamp;
  processedAt?: Timestamp;
}

export interface UserWallet {
  userId: string;
  gems: number;
  gold: number;
  totalSpent: number;
  totalEarned: number;
  totalGiftsSent: number;
  totalGiftsReceived: number;
  lastTransactionAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RevenueShare {
  streamId: string;
  hostId: string;
  totalRevenue: number;
  platformFee: number;
  hostEarnings: number;
  totalGifts: number;
  topGifters: { userId: string; amount: number }[];
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  createdAt: Timestamp;
}

class VirtualGiftsService {
  private static instance: VirtualGiftsService;
  private giftCatalog: VirtualGift[] = [];
  private userWallet: UserWallet | null = null;

  private constructor() {
    this.loadGiftCatalog();
  }

  static getInstance(): VirtualGiftsService {
    if (!VirtualGiftsService.instance) {
      VirtualGiftsService.instance = new VirtualGiftsService();
    }
    return VirtualGiftsService.instance;
  }

  /**
   * Load gift catalog
   */
  async loadGiftCatalog(): Promise<VirtualGift[]> {
    try {
      const giftsQuery = query(
        collection(db, 'virtualGifts'),
        where('isActive', '==', true),
        orderBy('category'),
        orderBy('price')
      );

      const snapshot = await getDocs(giftsQuery);
      this.giftCatalog = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VirtualGift[];

      console.log(`✅ Loaded ${this.giftCatalog.length} virtual gifts`);
      return this.giftCatalog;

    } catch (error: any) {
      console.error('Failed to load gift catalog:', error);
      return [];
    }
  }

  /**
   * Get gift catalog
   */
  getGiftCatalog(): VirtualGift[] {
    return this.giftCatalog;
  }

  /**
   * Get gifts by category
   */
  getGiftsByCategory(category: VirtualGift['category']): VirtualGift[] {
    return this.giftCatalog.filter(gift => gift.category === category);
  }

  /**
   * Get user wallet
   */
  async getUserWallet(userId?: string): Promise<UserWallet | null> {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) {
        throw new Error('User not authenticated');
      }

      const walletDoc = await getDoc(doc(db, 'userWallets', targetUserId));
      
      if (!walletDoc.exists()) {
        // Create new wallet
        return await this.createUserWallet(targetUserId);
      }

      const wallet = {
        userId: targetUserId,
        ...walletDoc.data()
      } as UserWallet;

      if (!userId || userId === auth.currentUser?.uid) {
        this.userWallet = wallet;
      }

      return wallet;

    } catch (error: any) {
      console.error('Failed to get user wallet:', error);
      return null;
    }
  }

  /**
   * Send virtual gift
   */
  async sendGift(
    giftId: string,
    recipientId: string,
    streamId?: string,
    messageId?: string,
    position?: { x: number; y: number },
    message?: string,
    isPublic: boolean = true
  ): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const senderId = auth.currentUser.uid;
      const senderName = auth.currentUser.displayName || 'User';

      // Get gift details
      const gift = this.giftCatalog.find(g => g.id === giftId);
      if (!gift) {
        throw new Error('Gift not found');
      }

      // Check if gift is available
      if (gift.isLimited && gift.remainingQuantity !== undefined && gift.remainingQuantity <= 0) {
        throw new Error('Gift is out of stock');
      }

      if (gift.validUntil && gift.validUntil.toMillis() < Date.now()) {
        throw new Error('Gift is no longer available');
      }

      // Get sender wallet
      const senderWallet = await this.getUserWallet(senderId);
      if (!senderWallet) {
        throw new Error('Wallet not found');
      }

      // Check if user has enough gems
      if (senderWallet.gems < gift.price) {
        throw new Error('Insufficient gems');
      }

      // Get recipient info
      const recipientDoc = await getDoc(doc(db, 'users', recipientId));
      if (!recipientDoc.exists()) {
        throw new Error('Recipient not found');
      }

      const recipientName = recipientDoc.data()?.displayName || 'User';

      // Calculate financial details
      const platformFeeRate = 0.3; // 30% platform fee
      const platformFee = Math.floor(gift.goldValue * platformFeeRate);
      const recipientEarnings = gift.goldValue - platformFee;

      // Create transaction
      const transactionData: Omit<GiftTransaction, 'id'> = {
        giftId,
        giftName: gift.name,
        giftEmoji: gift.emoji,
        senderId,
        senderName,
        recipientId,
        recipientName,
        streamId,
        messageId,
        gemsCost: gift.price,
        goldValue: gift.goldValue,
        platformFee,
        recipientEarnings,
        status: 'pending',
        position,
        message,
        isPublic,
        createdAt: serverTimestamp() as Timestamp
      };

      // Process transaction
      const transactionId = await this.processGiftTransaction(transactionData, gift);

      console.log(`✅ Gift sent: ${gift.name} from ${senderId} to ${recipientId}`);
      return transactionId;

    } catch (error: any) {
      console.error('Failed to send gift:', error);
      throw new Error(`Failed to send gift: ${error.message}`);
    }
  }

  /**
   * Process gift transaction
   */
  private async processGiftTransaction(
    transactionData: Omit<GiftTransaction, 'id'>,
    gift: VirtualGift
  ): Promise<string> {
    return await runTransaction(db, async (transaction) => {
      // Create transaction record
      const transactionRef = doc(collection(db, 'giftTransactions'));
      transaction.set(transactionRef, transactionData);

      // Update sender wallet (deduct gems)
      const senderWalletRef = doc(db, 'userWallets', transactionData.senderId);
      transaction.update(senderWalletRef, {
        gems: increment(-transactionData.gemsCost),
        totalSpent: increment(transactionData.gemsCost),
        totalGiftsSent: increment(1),
        lastTransactionAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update recipient wallet (add gold)
      const recipientWalletRef = doc(db, 'userWallets', transactionData.recipientId);
      transaction.update(recipientWalletRef, {
        gold: increment(transactionData.recipientEarnings),
        totalEarned: increment(transactionData.recipientEarnings),
        totalGiftsReceived: increment(1),
        lastTransactionAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update gift inventory if limited
      if (gift.isLimited && gift.remainingQuantity !== undefined) {
        const giftRef = doc(db, 'virtualGifts', gift.id);
        transaction.update(giftRef, {
          remainingQuantity: increment(-1),
          updatedAt: serverTimestamp()
        });
      }

      // Update stream revenue if applicable
      if (transactionData.streamId) {
        const streamRef = doc(db, 'streams', transactionData.streamId);
        transaction.update(streamRef, {
          totalGifts: increment(1),
          revenue: increment(transactionData.recipientEarnings),
          lastActivity: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Mark transaction as completed
      transaction.update(transactionRef, {
        status: 'completed',
        processedAt: serverTimestamp()
      });

      return transactionRef.id;
    });
  }

  /**
   * Get user gift transactions
   */
  async getUserTransactions(
    userId?: string,
    type: 'sent' | 'received' | 'all' = 'all',
    limitCount: number = 50
  ): Promise<GiftTransaction[]> {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      if (!targetUserId) {
        throw new Error('User not authenticated');
      }

      let transactionsQuery;

      if (type === 'sent') {
        transactionsQuery = query(
          collection(db, 'giftTransactions'),
          where('senderId', '==', targetUserId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      } else if (type === 'received') {
        transactionsQuery = query(
          collection(db, 'giftTransactions'),
          where('recipientId', '==', targetUserId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      } else {
        // Get both sent and received (would need composite query or multiple queries)
        const sentQuery = query(
          collection(db, 'giftTransactions'),
          where('senderId', '==', targetUserId),
          orderBy('createdAt', 'desc'),
          limit(limitCount / 2)
        );

        const receivedQuery = query(
          collection(db, 'giftTransactions'),
          where('recipientId', '==', targetUserId),
          orderBy('createdAt', 'desc'),
          limit(limitCount / 2)
        );

        const [sentSnapshot, receivedSnapshot] = await Promise.all([
          getDocs(sentQuery),
          getDocs(receivedQuery)
        ]);

        const allTransactions = [
          ...sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          ...receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        ] as GiftTransaction[];

        // Sort by creation date
        return allTransactions.sort((a, b) => 
          b.createdAt.toMillis() - a.createdAt.toMillis()
        ).slice(0, limitCount);
      }

      const snapshot = await getDocs(transactionsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GiftTransaction[];

    } catch (error: any) {
      console.error('Failed to get user transactions:', error);
      return [];
    }
  }

  /**
   * Get stream gift transactions
   */
  async getStreamTransactions(
    streamId: string,
    limitCount: number = 100
  ): Promise<GiftTransaction[]> {
    try {
      const transactionsQuery = query(
        collection(db, 'giftTransactions'),
        where('streamId', '==', streamId),
        where('status', '==', 'completed'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(transactionsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GiftTransaction[];

    } catch (error: any) {
      console.error('Failed to get stream transactions:', error);
      return [];
    }
  }

  /**
   * Purchase gems with real money
   */
  async purchaseGems(packageId: string, paymentMethodId: string): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const purchaseGems = httpsCallable(functions, 'purchaseGems');
      
      const result = await purchaseGems({
        packageId,
        paymentMethodId,
        userId: auth.currentUser.uid
      });

      const { transactionId, gemsAdded } = result.data as any;

      // Refresh user wallet
      await this.getUserWallet();

      console.log(`✅ Purchased ${gemsAdded} gems: ${transactionId}`);
      return transactionId;

    } catch (error: any) {
      console.error('Failed to purchase gems:', error);
      throw new Error(`Failed to purchase gems: ${error.message}`);
    }
  }

  /**
   * Convert gold to gems
   */
  async convertGoldToGems(goldAmount: number): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const userId = auth.currentUser.uid;
      const conversionRate = 10; // 10 gold = 1 gem
      const gemsToAdd = Math.floor(goldAmount / conversionRate);

      if (gemsToAdd === 0) {
        throw new Error('Insufficient gold for conversion');
      }

      const goldToDeduct = gemsToAdd * conversionRate;

      // Get current wallet
      const wallet = await this.getUserWallet(userId);
      if (!wallet || wallet.gold < goldToDeduct) {
        throw new Error('Insufficient gold balance');
      }

      // Update wallet
      await updateDoc(doc(db, 'userWallets', userId), {
        gold: increment(-goldToDeduct),
        gems: increment(gemsToAdd),
        updatedAt: serverTimestamp()
      });

      // Refresh local wallet
      await this.getUserWallet();

      console.log(`✅ Converted ${goldToDeduct} gold to ${gemsToAdd} gems`);

    } catch (error: any) {
      console.error('Failed to convert gold to gems:', error);
      throw new Error(`Failed to convert gold to gems: ${error.message}`);
    }
  }

  /**
   * Generate revenue share report
   */
  async generateRevenueShare(
    streamId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueShare> {
    try {
      const transactions = await this.getStreamTransactions(streamId, 1000);
      
      // Filter by date range
      const filteredTransactions = transactions.filter(t => {
        const transactionDate = t.createdAt.toDate();
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      // Calculate totals
      const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.goldValue, 0);
      const platformFee = filteredTransactions.reduce((sum, t) => sum + t.platformFee, 0);
      const hostEarnings = filteredTransactions.reduce((sum, t) => sum + t.recipientEarnings, 0);

      // Calculate top gifters
      const gifterMap = new Map<string, number>();
      filteredTransactions.forEach(t => {
        const current = gifterMap.get(t.senderId) || 0;
        gifterMap.set(t.senderId, current + t.goldValue);
      });

      const topGifters = Array.from(gifterMap.entries())
        .map(([userId, amount]) => ({ userId, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // Get host ID from stream
      const streamDoc = await getDoc(doc(db, 'streams', streamId));
      const hostId = streamDoc.exists() ? streamDoc.data()?.hostId : '';

      const revenueShare: RevenueShare = {
        streamId,
        hostId,
        totalRevenue,
        platformFee,
        hostEarnings,
        totalGifts: filteredTransactions.length,
        topGifters,
        period: {
          start: Timestamp.fromDate(startDate),
          end: Timestamp.fromDate(endDate)
        },
        createdAt: serverTimestamp() as Timestamp
      };

      // Save revenue share report
      await addDoc(collection(db, 'revenueShares'), revenueShare);

      return revenueShare;

    } catch (error: any) {
      console.error('Failed to generate revenue share:', error);
      throw error;
    }
  }

  /**
   * Create user wallet
   */
  private async createUserWallet(userId: string): Promise<UserWallet> {
    try {
      const wallet: UserWallet = {
        userId,
        gems: 100, // Starting gems
        gold: 0,
        totalSpent: 0,
        totalEarned: 0,
        totalGiftsSent: 0,
        totalGiftsReceived: 0,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      await doc(db, 'userWallets', userId).set(wallet);
      
      console.log(`✅ Created wallet for user: ${userId}`);
      return wallet;

    } catch (error: any) {
      console.error('Failed to create user wallet:', error);
      throw error;
    }
  }

  /**
   * Get gem packages for purchase
   */
  getGemPackages(): Array<{
    id: string;
    name: string;
    gems: number;
    price: number;
    bonus: number;
    popular?: boolean;
  }> {
    return [
      {
        id: 'gems_100',
        name: 'Starter Pack',
        gems: 100,
        price: 0.99,
        bonus: 0
      },
      {
        id: 'gems_500',
        name: 'Popular Pack',
        gems: 500,
        price: 4.99,
        bonus: 50,
        popular: true
      },
      {
        id: 'gems_1000',
        name: 'Value Pack',
        gems: 1000,
        price: 9.99,
        bonus: 150
      },
      {
        id: 'gems_2500',
        name: 'Premium Pack',
        gems: 2500,
        price: 19.99,
        bonus: 500
      },
      {
        id: 'gems_5000',
        name: 'Ultimate Pack',
        gems: 5000,
        price: 39.99,
        bonus: 1500
      }
    ];
  }

  /**
   * Get current user wallet (cached)
   */
  getCurrentUserWallet(): UserWallet | null {
    return this.userWallet;
  }

  /**
   * Refresh user wallet
   */
  async refreshUserWallet(): Promise<UserWallet | null> {
    if (!auth.currentUser) return null;
    return await this.getUserWallet(auth.currentUser.uid);
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    this.giftCatalog = [];
    this.userWallet = null;
    console.log('🧹 Virtual Gifts Service destroyed');
  }
}

export default VirtualGiftsService.getInstance();
