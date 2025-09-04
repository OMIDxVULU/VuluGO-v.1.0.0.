/**
 * React Hook for Virtual Gifts
 * Provides easy integration with virtual gifts service
 */

import { useState, useEffect, useCallback } from 'react';
import virtualGiftsService, {
  VirtualGift,
  GiftTransaction,
  UserWallet
} from '../services/virtualGiftsService';
import { useAuth } from '../contexts/AuthContext';

export interface UseVirtualGiftsOptions {
  autoLoadCatalog?: boolean;
  autoLoadWallet?: boolean;
  onGiftSent?: (transaction: GiftTransaction) => void;
  onWalletUpdated?: (wallet: UserWallet) => void;
  onError?: (error: string) => void;
}

export interface VirtualGiftsState {
  giftCatalog: VirtualGift[];
  userWallet: UserWallet | null;
  transactions: GiftTransaction[];
  gemPackages: any[];
  isLoading: boolean;
  isSending: boolean;
  isPurchasing: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useVirtualGifts(options: UseVirtualGiftsOptions = {}) {
  const { autoLoadCatalog = true, autoLoadWallet = true } = options;
  const { user } = useAuth();

  const [state, setState] = useState<VirtualGiftsState>({
    giftCatalog: [],
    userWallet: null,
    transactions: [],
    gemPackages: [],
    isLoading: false,
    isSending: false,
    isPurchasing: false,
    error: null,
    lastUpdated: null
  });

  // Load gift catalog
  const loadGiftCatalog = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const catalog = await virtualGiftsService.loadGiftCatalog();

      setState(prev => ({
        ...prev,
        giftCatalog: catalog,
        isLoading: false,
        lastUpdated: new Date()
      }));

      return catalog;

    } catch (error: any) {
      const errorMessage = `Failed to load gift catalog: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      options.onError?.(errorMessage);
      throw error;
    }
  }, [options]);

  // Load user wallet
  const loadUserWallet = useCallback(async (userId?: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const wallet = await virtualGiftsService.getUserWallet(userId);

      setState(prev => ({
        ...prev,
        userWallet: wallet,
        isLoading: false,
        lastUpdated: new Date()
      }));

      options.onWalletUpdated?.(wallet!);
      return wallet;

    } catch (error: any) {
      const errorMessage = `Failed to load wallet: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      options.onError?.(errorMessage);
      throw error;
    }
  }, [options]);

  // Load user transactions
  const loadTransactions = useCallback(async (
    userId?: string,
    type: 'sent' | 'received' | 'all' = 'all',
    limit: number = 50
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const transactions = await virtualGiftsService.getUserTransactions(userId, type, limit);

      setState(prev => ({
        ...prev,
        transactions,
        isLoading: false,
        lastUpdated: new Date()
      }));

      return transactions;

    } catch (error: any) {
      const errorMessage = `Failed to load transactions: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      options.onError?.(errorMessage);
      throw error;
    }
  }, [options]);

  // Send gift
  const sendGift = useCallback(async (
    giftId: string,
    recipientId: string,
    streamId?: string,
    messageId?: string,
    position?: { x: number; y: number },
    message?: string,
    isPublic: boolean = true
  ) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      setState(prev => ({ ...prev, isSending: true, error: null }));

      const transactionId = await virtualGiftsService.sendGift(
        giftId,
        recipientId,
        streamId,
        messageId,
        position,
        message,
        isPublic
      );

      // Refresh wallet after sending gift
      await loadUserWallet();

      setState(prev => ({ ...prev, isSending: false }));

      // Create transaction object for callback
      const gift = state.giftCatalog.find(g => g.id === giftId);
      if (gift) {
        const transaction: GiftTransaction = {
          id: transactionId,
          giftId,
          giftName: gift.name,
          giftEmoji: gift.emoji,
          senderId: user.uid,
          senderName: user.displayName || 'User',
          recipientId,
          recipientName: 'User',
          streamId,
          messageId,
          gemsCost: gift.price,
          goldValue: gift.goldValue,
          platformFee: Math.floor(gift.goldValue * 0.3),
          recipientEarnings: gift.goldValue - Math.floor(gift.goldValue * 0.3),
          status: 'completed',
          position,
          message,
          isPublic,
          createdAt: new Date() as any
        };

        options.onGiftSent?.(transaction);
      }

      console.log(`✅ Gift sent successfully: ${transactionId}`);
      return transactionId;

    } catch (error: any) {
      const errorMessage = `Failed to send gift: ${error.message}`;
      setState(prev => ({
        ...prev,
        isSending: false,
        error: errorMessage
      }));

      options.onError?.(errorMessage);
      throw error;
    }
  }, [user, state.giftCatalog, loadUserWallet, options]);

  // Purchase gems
  const purchaseGems = useCallback(async (packageId: string, paymentMethodId: string) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      setState(prev => ({ ...prev, isPurchasing: true, error: null }));

      const transactionId = await virtualGiftsService.purchaseGems(packageId, paymentMethodId);

      // Refresh wallet after purchase
      await loadUserWallet();

      setState(prev => ({ ...prev, isPurchasing: false }));

      console.log(`✅ Gems purchased successfully: ${transactionId}`);
      return transactionId;

    } catch (error: any) {
      const errorMessage = `Failed to purchase gems: ${error.message}`;
      setState(prev => ({
        ...prev,
        isPurchasing: false,
        error: errorMessage
      }));

      options.onError?.(errorMessage);
      throw error;
    }
  }, [user, loadUserWallet, options]);

  // Convert gold to gems
  const convertGoldToGems = useCallback(async (goldAmount: number) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await virtualGiftsService.convertGoldToGems(goldAmount);

      // Refresh wallet after conversion
      await loadUserWallet();

      setState(prev => ({ ...prev, isLoading: false }));

      console.log(`✅ Converted ${goldAmount} gold to gems`);

    } catch (error: any) {
      const errorMessage = `Failed to convert gold to gems: ${error.message}`;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      options.onError?.(errorMessage);
      throw error;
    }
  }, [user, loadUserWallet, options]);

  // Get gifts by category
  const getGiftsByCategory = useCallback((category: VirtualGift['category']) => {
    return virtualGiftsService.getGiftsByCategory(category);
  }, []);

  // Check if user can afford gift
  const canAffordGift = useCallback((giftId: string): boolean => {
    if (!state.userWallet) return false;
    
    const gift = state.giftCatalog.find(g => g.id === giftId);
    if (!gift) return false;
    
    return state.userWallet.gems >= gift.price;
  }, [state.userWallet, state.giftCatalog]);

  // Get gift by ID
  const getGiftById = useCallback((giftId: string): VirtualGift | undefined => {
    return state.giftCatalog.find(g => g.id === giftId);
  }, [state.giftCatalog]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    try {
      const promises = [loadGiftCatalog()];
      
      if (user) {
        promises.push(loadUserWallet());
        promises.push(loadTransactions());
      }

      await Promise.all(promises);

    } catch (error) {
      console.error('Failed to refresh virtual gifts data:', error);
    }
  }, [user, loadGiftCatalog, loadUserWallet, loadTransactions]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load gem packages
  useEffect(() => {
    const packages = virtualGiftsService.getGemPackages();
    setState(prev => ({ ...prev, gemPackages: packages }));
  }, []);

  // Auto-load data on mount
  useEffect(() => {
    if (autoLoadCatalog) {
      loadGiftCatalog();
    }
  }, [autoLoadCatalog, loadGiftCatalog]);

  useEffect(() => {
    if (autoLoadWallet && user) {
      loadUserWallet();
    }
  }, [autoLoadWallet, user, loadUserWallet]);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [state.error, clearError]);

  return {
    // State
    giftCatalog: state.giftCatalog,
    userWallet: state.userWallet,
    transactions: state.transactions,
    gemPackages: state.gemPackages,
    isLoading: state.isLoading,
    isSending: state.isSending,
    isPurchasing: state.isPurchasing,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    loadGiftCatalog,
    loadUserWallet,
    loadTransactions,
    sendGift,
    purchaseGems,
    convertGoldToGems,
    refreshAll,
    clearError,

    // Helpers
    getGiftsByCategory,
    canAffordGift,
    getGiftById,

    // Computed values
    hasGifts: state.giftCatalog.length > 0,
    hasWallet: !!state.userWallet,
    hasTransactions: state.transactions.length > 0,
    canSendGifts: !!user && !!state.userWallet && state.userWallet.gems > 0,
    
    // Quick wallet info
    gems: state.userWallet?.gems || 0,
    gold: state.userWallet?.gold || 0,
    totalSpent: state.userWallet?.totalSpent || 0,
    totalEarned: state.userWallet?.totalEarned || 0,
    totalGiftsSent: state.userWallet?.totalGiftsSent || 0,
    totalGiftsReceived: state.userWallet?.totalGiftsReceived || 0,

    // Gift categories
    basicGifts: getGiftsByCategory('basic'),
    premiumGifts: getGiftsByCategory('premium'),
    exclusiveGifts: getGiftsByCategory('exclusive'),
    seasonalGifts: getGiftsByCategory('seasonal'),

    // Transaction stats
    sentTransactions: state.transactions.filter(t => t.senderId === user?.uid),
    receivedTransactions: state.transactions.filter(t => t.recipientId === user?.uid),
    recentTransactions: state.transactions.slice(0, 10),

    // Status flags
    isActive: !state.isLoading && !state.error,
    hasSufficientGems: (giftPrice: number) => (state.userWallet?.gems || 0) >= giftPrice,
    conversionRate: 10, // 10 gold = 1 gem
    canConvertGold: (state.userWallet?.gold || 0) >= 10
  };
}

export default useVirtualGifts;
