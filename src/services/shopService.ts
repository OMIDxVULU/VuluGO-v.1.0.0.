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
  runTransaction,
  FieldValue
} from 'firebase/firestore';
import { db, auth } from './firebase';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';
import virtualCurrencyService from './virtualCurrencyService';
import friendActivityService from './friendActivityService';

// Shop types
export type ProductCategory = 'avatar' | 'equipment' | 'boost' | 'currency' | 'cosmetic' | 'premium';
export type CurrencyType = 'gold' | 'gems' | 'tokens';

// Product interfaces
export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: {
    gold?: number;
    gems?: number;
    tokens?: number;
  };
  imageUrl?: string;
  iconUrl?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isLimited: boolean;
  limitedQuantity?: number;
  remainingQuantity?: number;
  isActive: boolean;
  requirements?: {
    level?: number;
    achievements?: string[];
    previousPurchases?: string[];
  };
  effects?: {
    miningBoost?: number;
    experienceBoost?: number;
    currencyMultiplier?: number;
    duration?: number; // in seconds for temporary items
  };
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  price: {
    gold?: number;
    gems?: number;
    tokens?: number;
  };
  quantity: number;
  totalCost: {
    gold?: number;
    gems?: number;
    tokens?: number;
  };
  timestamp: Date | FieldValue;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionIds: string[]; // References to virtualCurrency transactions
  metadata?: any;
}

export interface UserInventory {
  userId: string;
  items: {
    [productId: string]: {
      productId: string;
      productName: string;
      category: ProductCategory;
      quantity: number;
      purchaseDate: Date;
      isActive?: boolean;
      expiresAt?: Date; // for temporary items
      metadata?: any;
    };
  };
  activeBoosts: {
    [boostType: string]: {
      productId: string;
      multiplier: number;
      expiresAt: Date;
    };
  };
  lastUpdated: Date;
}

export interface ShopStats {
  userId: string;
  totalPurchases: number;
  totalSpent: {
    gold: number;
    gems: number;
    tokens: number;
  };
  favoriteCategory: ProductCategory;
  mostExpensivePurchase: {
    productId: string;
    productName: string;
    cost: number;
    currency: CurrencyType;
  };
  purchaseHistory: Purchase[];
  lastPurchaseDate: Date;
  vipLevel: number;
  vipPoints: number;
  lastUpdated: Date;
}

export interface ShopPromotion {
  id: string;
  name: string;
  description: string;
  discountPercentage: number;
  applicableProducts: string[]; // Product IDs
  applicableCategories: ProductCategory[];
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  maxUses?: number;
  currentUses: number;
  requirements?: {
    minLevel?: number;
    minPurchases?: number;
    specificUsers?: string[];
  };
  createdAt: Date;
}

class ShopService {
  private getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
  }

  private isAuthenticated(): boolean {
    return auth?.currentUser !== null;
  }

  // PRODUCT MANAGEMENT

  /**
   * Get all available products
   */
  async getProducts(category?: ProductCategory, limit?: number): Promise<Product[]> {
    try {
      let q = query(
        collection(db, 'products'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      if (category) {
        q = query(
          collection(db, 'products'),
          where('isActive', '==', true),
          where('category', '==', category),
          orderBy('createdAt', 'desc')
        );
      }

      if (limit) {
        q = query(q, limit(limit));
      }

      const querySnapshot = await getDocs(q);
      const products: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Product);
      });

      return products;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getProducts - returning empty array for guest user');
        return [];
      }

      FirebaseErrorHandler.logError('getProducts', error);
      throw new Error(`Failed to get products: ${error.message}`);
    }
  }

  /**
   * Get a specific product by ID
   */
  async getProduct(productId: string): Promise<Product | null> {
    try {
      const productRef = doc(db, 'products', productId);
      const productDoc = await getDoc(productRef);

      if (!productDoc.exists()) {
        return null;
      }

      const data = productDoc.data();
      return {
        id: productDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Product;
    } catch (error: any) {
      FirebaseErrorHandler.logError('getProduct', error);
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  /**
   * Listen to real-time product updates
   */
  onProducts(category: ProductCategory | null, callback: (products: Product[]) => void): () => void {
    try {
      let q = query(
        collection(db, 'products'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      if (category) {
        q = query(
          collection(db, 'products'),
          where('isActive', '==', true),
          where('category', '==', category),
          orderBy('createdAt', 'desc')
        );
      }

      return onSnapshot(q, (querySnapshot) => {
        const products: Product[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          products.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Product);
        });

        callback(products);
      }, (error) => {
        // Handle permission errors gracefully for guest users
        if (FirebaseErrorHandler.isPermissionError(error)) {
          console.warn('Permission denied for onProducts - returning empty array for guest user');
          callback([]);
          return;
        }

        console.error('Products listener error:', error);
        FirebaseErrorHandler.logError('onProducts', error);
        callback([]);
      });
    } catch (error: any) {
      FirebaseErrorHandler.logError('onProducts', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // PURCHASE MANAGEMENT

  /**
   * Purchase a product
   */
  async purchaseProduct(
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    productId: string,
    quantity: number = 1
  ): Promise<Purchase> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required to make purchases');
      }

      // Get product details
      const product = await this.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.isActive) {
        throw new Error('Product is no longer available');
      }

      // Check user requirements
      if (product.requirements) {
        await this.checkPurchaseRequirements(userId, product.requirements);
      }

      // Calculate total cost
      const totalCost = {
        gold: (product.price.gold || 0) * quantity,
        gems: (product.price.gems || 0) * quantity,
        tokens: (product.price.tokens || 0) * quantity
      };

      // Check if user can afford the purchase
      const canAfford = await virtualCurrencyService.canAfford(userId, totalCost);
      if (!canAfford) {
        throw new Error('Insufficient funds for this purchase');
      }

      // Use transaction for atomic quantity check and purchase creation
      const purchaseRef = await runTransaction(db, async (transaction) => {
        // Re-fetch product within transaction
        const productRef = doc(db, 'products', productId);
        const freshProductDoc = await transaction.get(productRef);

        if (!freshProductDoc.exists()) {
          throw new Error('Product not found');
        }

        const freshProduct = freshProductDoc.data() as Product;

        // Check quantity limits within transaction
        if (freshProduct.isLimited && freshProduct.remainingQuantity !== undefined) {
          if (freshProduct.remainingQuantity < quantity) {
            throw new Error(`Only ${freshProduct.remainingQuantity} items remaining`);
          }
        }

        // Create purchase record within transaction
        const purchase: Omit<Purchase, 'id'> = {
          userId,
          userName,
          userAvatar,
          productId,
          productName: product.name,
          productCategory: product.category,
          price: product.price,
          quantity,
          totalCost,
          timestamp: serverTimestamp(),
          status: 'pending',
          transactionIds: []
        };

        const purchaseRef = doc(collection(db, 'purchases'));
        transaction.set(purchaseRef, purchase);

        // Update product quantity if limited (within transaction)
        if (freshProduct.isLimited && freshProduct.remainingQuantity !== undefined) {
          transaction.update(productRef, {
            remainingQuantity: increment(-quantity)
          });
        }

        return purchaseRef;
      });

      try {
        // Process payment transactions
        const transactionIds: string[] = [];

        if (totalCost.gold && totalCost.gold > 0) {
          const transaction = await virtualCurrencyService.spendCurrency(
            userId,
            'gold',
            totalCost.gold,
            `Purchase: ${product.name} x${quantity}`,
            { purchaseId: purchaseRef.id, productId, category: product.category }
          );
          transactionIds.push(transaction.id);
        }

        if (totalCost.gems && totalCost.gems > 0) {
          const transaction = await virtualCurrencyService.spendCurrency(
            userId,
            'gems',
            totalCost.gems,
            `Purchase: ${product.name} x${quantity}`,
            { purchaseId: purchaseRef.id, productId, category: product.category }
          );
          transactionIds.push(transaction.id);
        }

        if (totalCost.tokens && totalCost.tokens > 0) {
          const transaction = await virtualCurrencyService.spendCurrency(
            userId,
            'tokens',
            totalCost.tokens,
            `Purchase: ${product.name} x${quantity}`,
            { purchaseId: purchaseRef.id, productId, category: product.category }
          );
          transactionIds.push(transaction.id);
        }

        // Update purchase status
        await updateDoc(purchaseRef, {
          status: 'completed',
          transactionIds
        });

        // Add to user inventory
        await this.addToInventory(userId, product, quantity);

        // Update shop stats
        await this.updateShopStats(userId, purchaseRef.id, product, totalCost);

        // Create friend activity for significant purchases
        if (product.rarity === 'legendary' || (totalCost.gold && totalCost.gold >= 1000)) {
          await friendActivityService.createActivity({
            userId,
            userName,
            userAvatar,
            activityType: 'status_update',
            title: `${userName} made a purchase`,
            description: `Bought ${product.name}${quantity > 1 ? ` x${quantity}` : ''}`,
            isActive: false,
            data: {
              type: 'shop_purchase',
              productName: product.name,
              category: product.category,
              rarity: product.rarity,
              quantity
            }
          });
        }

        return {
          id: purchaseRef.id,
          userId,
          userName,
          userAvatar,
          productId,
          productName: product.name,
          productCategory: product.category,
          price: product.price,
          quantity,
          totalCost,
          timestamp: new Date(),
          status: 'completed',
          transactionIds
        } as Purchase;

      } catch (paymentError) {
        // Update purchase status to failed
        await updateDoc(purchaseRef, {
          status: 'failed'
        });
        throw paymentError;
      }

    } catch (error: any) {
      FirebaseErrorHandler.logError('purchaseProduct', error);
      throw new Error(`Failed to purchase product: ${error.message}`);
    }
  }

  /**
   * Get user's purchase history
   */
  async getPurchaseHistory(userId: string, limitCount: number = 50): Promise<Purchase[]> {
    try {
      const q = query(
        collection(db, 'purchases'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const purchases: Purchase[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        purchases.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as Purchase);
      });

      return purchases;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getPurchaseHistory - returning empty array for guest user');
        return [];
      }

      FirebaseErrorHandler.logError('getPurchaseHistory', error);
      throw new Error(`Failed to get purchase history: ${error.message}`);
    }
  }

  // INVENTORY MANAGEMENT

  /**
   * Get user's inventory
   */
  async getUserInventory(userId: string): Promise<UserInventory> {
    try {
      const inventoryRef = doc(db, 'userInventories', userId);
      const inventoryDoc = await getDoc(inventoryRef);

      if (!inventoryDoc.exists()) {
        // Create initial inventory
        const initialInventory: Omit<UserInventory, 'lastUpdated'> & { lastUpdated: any } = {
          userId,
          items: {},
          activeBoosts: {},
          lastUpdated: serverTimestamp()
        };

        await setDoc(inventoryRef, initialInventory);
        return { ...initialInventory, lastUpdated: new Date() } as UserInventory;
      }

      const data = inventoryDoc.data();
      return {
        ...data,
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      } as UserInventory;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getUserInventory - returning empty inventory for guest user');
        return {
          userId,
          items: [],
          lastUpdated: new Date()
        };
      }

      FirebaseErrorHandler.logError('getUserInventory', error);
      throw new Error(`Failed to get user inventory: ${error.message}`);
    }
  }

  /**
   * Add item to user inventory
   */
  private async addToInventory(userId: string, product: Product, quantity: number): Promise<void> {
    try {
      const inventoryRef = doc(db, 'userInventories', userId);
      const inventory = await this.getUserInventory(userId);

      const existingItem = inventory.items[product.id];
      const newQuantity = (existingItem?.quantity || 0) + quantity;

      const itemData = {
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: newQuantity,
        purchaseDate: existingItem?.purchaseDate || new Date(),
        ...(product.effects?.duration && {
          expiresAt: new Date(Date.now() + product.effects.duration * 1000)
        })
      };

      await updateDoc(inventoryRef, {
        [`items.${product.id}`]: itemData,
        lastUpdated: serverTimestamp()
      });

      // Activate boosts if applicable
      if (product.effects && product.category === 'boost') {
        await this.activateBoost(userId, product);
      }

    } catch (error: any) {
      console.warn('Failed to add to inventory:', error);
    }
  }

  // HELPER METHODS

  private async checkPurchaseRequirements(userId: string, requirements: Product['requirements']): Promise<void> {
    if (!requirements) return;

    // Check level requirement
    if (requirements.level) {
      // Implementation would check user level
      throw new Error(`Level ${requirements.level} required`);
    }

    // Check achievement requirements
    if (requirements.achievements && requirements.achievements.length > 0) {
      // Implementation would check user achievements
      throw new Error(`Required achievements: ${requirements.achievements.join(', ')}`);
    }

    // Check previous purchase requirements
    if (requirements.previousPurchases && requirements.previousPurchases.length > 0) {
      // Implementation would check user's purchase history
      throw new Error(`Required previous purchases: ${requirements.previousPurchases.join(', ')}`);
    }
  }

  private async updateShopStats(userId: string, purchaseId: string, product: Product, totalCost: any): Promise<void> {
    // Implementation for updating shop statistics
  }

  private async activateBoost(userId: string, product: Product): Promise<void> {
    // Implementation for activating boost items
  }

  /**
   * Get shop statistics for user
   */
  async getShopStats(userId: string): Promise<ShopStats | null> {
    try {
      const statsRef = doc(db, 'shopStats', userId);
      const statsDoc = await getDoc(statsRef);

      if (!statsDoc.exists()) {
        return null;
      }

      const data = statsDoc.data();
      return {
        ...data,
        lastPurchaseDate: data.lastPurchaseDate?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      } as ShopStats;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getShopStats - returning null for guest user');
        return null;
      }

      FirebaseErrorHandler.logError('getShopStats', error);
      throw new Error(`Failed to get shop stats: ${error.message}`);
    }
  }

  /**
   * Get active promotions
   */
  async getActivePromotions(): Promise<ShopPromotion[]> {
    try {
      const now = new Date();
      const q = query(
        collection(db, 'shopPromotions'),
        where('isActive', '==', true),
        where('startDate', '<=', now),
        where('endDate', '>=', now),
        orderBy('startDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const promotions: ShopPromotion[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        promotions.push({
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date()
        } as ShopPromotion);
      });

      return promotions;
    } catch (error: any) {
      // Handle permission errors gracefully for guest users
      if (FirebaseErrorHandler.isPermissionError(error)) {
        console.warn('Permission denied for getActivePromotions - returning empty array for guest user');
        return [];
      }

      FirebaseErrorHandler.logError('getActivePromotions', error);
      throw new Error(`Failed to get active promotions: ${error.message}`);
    }
  }
}

export const shopService = new ShopService();
export default shopService;
