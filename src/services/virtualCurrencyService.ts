import {
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';

// Currency types
export type CurrencyType = 'gold' | 'gems' | 'tokens';

// Transaction types
export type TransactionType = 'earn' | 'spend' | 'purchase' | 'reward' | 'refund' | 'bonus';

export interface CurrencyBalance {
  gold: number;
  gems: number;
  tokens: number;
  lastUpdated: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  currencyType: CurrencyType;
  amount: number;
  balanceAfter: number;
  description: string;
  metadata?: any; // Additional data about the transaction
  timestamp: Date;
}

export interface CurrencyReward {
  currencyType: CurrencyType;
  amount: number;
  reason: string;
}

class VirtualCurrencyService {
  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  /**
   * Safely convert Firestore timestamp to Date
   */
  private safeToDate(timestamp: any): Date {
    if (!timestamp) {
      return new Date();
    }

    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      try {
        return timestamp.toDate();
      } catch (error) {
        console.warn('Failed to convert timestamp to date:', error);
        return new Date();
      }
    }

    if (timestamp instanceof Date) {
      return timestamp;
    }

    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp);
    }

    return new Date();
  }

  /**
   * Get user's currency balances
   */
  async getCurrencyBalances(userId: string): Promise<CurrencyBalance> {
    try {
      // Check authentication state first
      if (!this.isAuthenticated()) {
        // Return default balance for guest users
        return {
          gold: 0,
          gems: 0,
          tokens: 0,
          lastUpdated: new Date()
        };
      }

      return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          // Create initial balance for new user
          const initialBalance: CurrencyBalance = {
            gold: 1000, // Starting gold
            gems: 50,   // Starting gems
            tokens: 0,  // Starting tokens
            lastUpdated: new Date()
          };

          transaction.set(userRef, {
            currencyBalances: {
              ...initialBalance,
              lastUpdated: serverTimestamp()
            }
          }, { merge: true });

          return initialBalance;
        }

        const userData = userDoc.data();
        const balances = userData.currencyBalances || {
          gold: 1000,
          gems: 50,
          tokens: 0,
          lastUpdated: serverTimestamp()
        };

        return {
          gold: balances.gold || 0,
          gems: balances.gems || 0,
          tokens: balances.tokens || 0,
          lastUpdated: this.safeToDate(balances.lastUpdated)
        };
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('getCurrencyBalances', error);
      throw new Error(`Failed to get currency balances: ${error.message}`);
    }
  }

  /**
   * Listen to real-time currency balance changes
   */
  onCurrencyBalances(userId: string, callback: (balances: CurrencyBalance) => void): () => void {
    try {
      const userRef = doc(db, 'users', userId);

      return onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const balances = userData.currencyBalances || {
            gold: 1000,
            gems: 50,
            tokens: 0,
            lastUpdated: new Date()
          };

          callback({
            gold: balances.gold || 0,
            gems: balances.gems || 0,
            tokens: balances.tokens || 0,
            lastUpdated: this.safeToDate(balances.lastUpdated)
          });
        }
      }, (error) => {
        // Handle permission errors gracefully for guest users
        if (FirebaseErrorHandler.isPermissionError(error)) {
          // Silently provide default balances for guest users
          callback({
            gold: 1000,
            gems: 50,
            tokens: 0,
            lastUpdated: new Date()
          });
          return;
        }

        // Log non-permission errors
        console.error('Currency balances listener error:', error);
        FirebaseErrorHandler.logError('onCurrencyBalances', error);
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('onCurrencyBalances', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Add currency to user's balance
   */
  async addCurrency(
    userId: string,
    currencyType: CurrencyType,
    amount: number,
    description: string,
    metadata?: any
  ): Promise<Transaction> {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }

      return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);

        // Get current balance from fresh snapshot
        let currentBalance = 0;
        if (userDoc.exists()) {
          const userData = userDoc.data();
          currentBalance = userData.currencyBalances?.[currencyType] || 0;
        }

        const newBalance = currentBalance + amount;

        // Update user balance within transaction
        transaction.update(userRef, {
          [`currencyBalances.${currencyType}`]: newBalance,
          'currencyBalances.lastUpdated': serverTimestamp()
        });

        // Create transaction record
        const transactionData: Omit<Transaction, 'id'> = {
          userId,
          type: 'earn',
          currencyType,
          amount,
          balanceAfter: newBalance,
          description,
          metadata,
          timestamp: serverTimestamp()
        };

        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, transactionData);

        return {
          id: transactionRef.id,
          ...transactionData,
          timestamp: new Date()
        } as Transaction;
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('addCurrency', error);
      throw new Error(`Failed to add currency: ${error.message}`);
    }
  }

  /**
   * Spend currency from user's balance
   */
  async spendCurrency(
    userId: string,
    currencyType: CurrencyType,
    amount: number,
    description: string,
    metadata?: any
  ): Promise<Transaction> {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }

      // Get current balance
      const currentBalances = await this.getCurrencyBalances(userId);
      
      if (currentBalances[currencyType] < amount) {
        throw new Error(`Insufficient ${currencyType} balance. Required: ${amount}, Available: ${currentBalances[currencyType]}`);
      }

      const userRef = doc(db, 'users', userId);
      const newBalance = currentBalances[currencyType] - amount;

      // Update user balance
      await updateDoc(userRef, {
        [`currencyBalances.${currencyType}`]: increment(-amount),
        'currencyBalances.lastUpdated': serverTimestamp()
      });

      // Create transaction record
      const transaction: Omit<Transaction, 'id'> = {
        userId,
        type: 'spend',
        currencyType,
        amount: -amount, // Negative for spending
        balanceAfter: newBalance,
        description,
        metadata,
        timestamp: serverTimestamp() as any
      };

      const transactionRef = await addDoc(collection(db, 'transactions'), transaction);

      return {
        id: transactionRef.id,
        ...transaction,
        timestamp: new Date()
      } as Transaction;
    } catch (error: any) {
      FirebaseErrorHandler.logError('spendCurrency', error);
      throw new Error(`Failed to spend currency: ${error.message}`);
    }
  }

  /**
   * Transfer currency between users
   */
  async transferCurrency(
    fromUserId: string,
    toUserId: string,
    currencyType: CurrencyType,
    amount: number,
    description: string
  ): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }

      if (fromUserId === toUserId) {
        throw new Error('Cannot transfer to the same user');
      }

      return await runTransaction(db, async (transaction) => {
        // Read both user documents within transaction
        const fromUserRef = doc(db, 'users', fromUserId);
        const toUserRef = doc(db, 'users', toUserId);

        const fromUserDoc = await transaction.get(fromUserRef);
        const toUserDoc = await transaction.get(toUserRef);

        // Get current balances
        const fromBalance = fromUserDoc.exists()
          ? (fromUserDoc.data().currencyBalances?.[currencyType] || 0)
          : 0;
        const toBalance = toUserDoc.exists()
          ? (toUserDoc.data().currencyBalances?.[currencyType] || 0)
          : 0;

        // Check if sender has sufficient balance
        if (fromBalance < amount) {
          throw new Error(`Insufficient ${currencyType} balance for transfer`);
        }

        const newFromBalance = fromBalance - amount;
        const newToBalance = toBalance + amount;

        // Update both user balances within transaction
        transaction.update(fromUserRef, {
          [`currencyBalances.${currencyType}`]: newFromBalance,
          'currencyBalances.lastUpdated': serverTimestamp()
        });

        transaction.update(toUserRef, {
          [`currencyBalances.${currencyType}`]: newToBalance,
          'currencyBalances.lastUpdated': serverTimestamp()
        });

        // Create transaction records
        const fromTransactionData: Omit<Transaction, 'id'> = {
          userId: fromUserId,
          type: 'spend',
          currencyType,
          amount: -amount,
          balanceAfter: newFromBalance,
          description: `Transfer to user: ${description}`,
          metadata: { transferTo: toUserId },
          timestamp: serverTimestamp()
        };

        const toTransactionData: Omit<Transaction, 'id'> = {
          userId: toUserId,
          type: 'earn',
          currencyType,
          amount,
          balanceAfter: newToBalance,
          description: `Transfer from user: ${description}`,
          metadata: { transferFrom: fromUserId },
          timestamp: serverTimestamp()
        };

        const fromTransactionRef = doc(collection(db, 'transactions'));
        const toTransactionRef = doc(collection(db, 'transactions'));

        transaction.set(fromTransactionRef, fromTransactionData);
        transaction.set(toTransactionRef, toTransactionData);

        return {
          fromTransaction: { id: fromTransactionRef.id, ...fromTransactionData, timestamp: new Date() } as Transaction,
          toTransaction: { id: toTransactionRef.id, ...toTransactionData, timestamp: new Date() } as Transaction
        };
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('transferCurrency', error);
      throw new Error(`Failed to transfer currency: ${error.message}`);
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string, limitCount: number = 50): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          timestamp: this.safeToDate(data.timestamp)
        } as Transaction);
      });

      return transactions;
    } catch (error: any) {
      FirebaseErrorHandler.logError('getTransactionHistory', error);
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  /**
   * Award daily login bonus
   */
  async awardDailyBonus(userId: string): Promise<CurrencyReward[]> {
    try {
      const rewards: CurrencyReward[] = [
        { currencyType: 'gold', amount: 100, reason: 'Daily login bonus' },
        { currencyType: 'gems', amount: 5, reason: 'Daily login bonus' }
      ];

      for (const reward of rewards) {
        await this.addCurrency(
          userId,
          reward.currencyType,
          reward.amount,
          reward.reason,
          { type: 'daily_bonus', date: new Date().toISOString().split('T')[0] }
        );
      }

      return rewards;
    } catch (error: any) {
      FirebaseErrorHandler.logError('awardDailyBonus', error);
      throw new Error(`Failed to award daily bonus: ${error.message}`);
    }
  }

  /**
   * Check if user can afford a purchase
   */
  async canAfford(userId: string, costs: Partial<CurrencyBalance>): Promise<boolean> {
    try {
      const balances = await this.getCurrencyBalances(userId);
      
      for (const [currency, cost] of Object.entries(costs)) {
        if (cost && balances[currency as CurrencyType] < cost) {
          return false;
        }
      }
      
      return true;
    } catch (error: any) {
      FirebaseErrorHandler.logError('canAfford', error);
      return false;
    }
  }

  /**
   * Make a purchase (spend multiple currencies)
   */
  async makePurchase(
    userId: string,
    costs: Partial<CurrencyBalance>,
    description: string,
    metadata?: any
  ): Promise<Transaction[]> {
    try {
      const canAffordPurchase = await this.canAfford(userId, costs);
      if (!canAffordPurchase) {
        throw new Error('Insufficient funds for purchase');
      }

      const transactions: Transaction[] = [];

      for (const [currency, cost] of Object.entries(costs)) {
        if (cost && cost > 0) {
          const transaction = await this.spendCurrency(
            userId,
            currency as CurrencyType,
            cost,
            description,
            metadata
          );
          transactions.push(transaction);
        }
      }

      return transactions;
    } catch (error: any) {
      FirebaseErrorHandler.logError('makePurchase', error);
      throw new Error(`Failed to make purchase: ${error.message}`);
    }
  }
}

export const virtualCurrencyService = new VirtualCurrencyService();
export default virtualCurrencyService;
