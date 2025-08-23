import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import shopService, { 
  Product, 
  Purchase, 
  UserInventory, 
  ShopStats, 
  ShopPromotion,
  ProductCategory 
} from '../services/shopService';

interface ShopContextType {
  // Product State
  products: Product[];
  featuredProducts: Product[];
  productsByCategory: { [key in ProductCategory]?: Product[] };
  
  // User State
  userInventory: UserInventory | null;
  purchaseHistory: Purchase[];
  shopStats: ShopStats | null;
  
  // Promotions
  activePromotions: ShopPromotion[];
  
  // Loading States
  isLoadingProducts: boolean;
  isLoadingInventory: boolean;
  isLoadingPurchases: boolean;
  isLoadingStats: boolean;
  isLoadingPromotions: boolean;
  isPurchasing: boolean;
  
  // Actions
  purchaseProduct: (productId: string, quantity?: number) => Promise<Purchase>;
  refreshProducts: (category?: ProductCategory) => Promise<void>;
  refreshInventory: () => Promise<void>;
  refreshPurchaseHistory: () => Promise<void>;
  refreshShopStats: () => Promise<void>;
  refreshPromotions: () => Promise<void>;
  refreshAllShopData: () => Promise<void>;
  
  // Utility Functions
  getProductsByCategory: (category: ProductCategory) => Product[];
  canAffordProduct: (product: Product, quantity?: number) => boolean;
  hasProduct: (productId: string) => boolean;
  getProductQuantity: (productId: string) => number;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

interface ShopProviderProps {
  children: ReactNode;
}

export const ShopProvider: React.FC<ShopProviderProps> = ({ children }) => {
  const { user, isGuest, userProfile } = useAuth();
  
  // Product State
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<{ [key in ProductCategory]?: Product[] }>({});
  
  // User State
  const [userInventory, setUserInventory] = useState<UserInventory | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
  const [shopStats, setShopStats] = useState<ShopStats | null>(null);
  
  // Promotions
  const [activePromotions, setActivePromotions] = useState<ShopPromotion[]>([]);
  
  // Loading States
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Load shop data when user changes
  useEffect(() => {
    if (!user || isGuest) {
      // Reset all state for guests
      setProducts([]);
      setFeaturedProducts([]);
      setProductsByCategory({});
      setUserInventory(null);
      setPurchaseHistory([]);
      setShopStats(null);
      setActivePromotions([]);
      return;
    }

    loadAllShopData();
    
    // Set up real-time listener for products
    const unsubscribe = shopService.onProducts(null, (newProducts) => {
      setProducts(newProducts);
      organizeFeaturedProducts(newProducts);
      organizeProductsByCategory(newProducts);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, isGuest]);

  // Load all shop-related data
  const loadAllShopData = async () => {
    if (!user || isGuest) return;

    try {
      const results = await Promise.allSettled([
        refreshProducts(),
        refreshInventory(),
        refreshPurchaseHistory(),
        refreshShopStats(),
        refreshPromotions()
      ]);

      // Handle results individually
      results.forEach((result, index) => {
        const operations = ['products', 'inventory', 'purchaseHistory', 'shopStats', 'promotions'];
        if (result.status === 'rejected') {
          console.error(`Failed to load ${operations[index]} data:`, result.reason);
        }
      });
    } catch (error) {
      console.error('Failed to load shop data:', error);
    }
  };

  // Organize featured products (legendary and epic items)
  const organizeFeaturedProducts = (allProducts: Product[]) => {
    const featured = allProducts.filter(product => 
      product.rarity === 'legendary' || product.rarity === 'epic' || product.isLimited
    ).slice(0, 10);
    setFeaturedProducts(featured);
  };

  // Organize products by category
  const organizeProductsByCategory = (allProducts: Product[]) => {
    const categorized: { [key in ProductCategory]?: Product[] } = {};
    
    allProducts.forEach(product => {
      if (!categorized[product.category]) {
        categorized[product.category] = [];
      }
      categorized[product.category]!.push(product);
    });
    
    setProductsByCategory(categorized);
  };

  // Product Actions
  const refreshProducts = async (category?: ProductCategory) => {
    setIsLoadingProducts(true);
    try {
      const newProducts = await shopService.getProducts(category);
      setProducts(newProducts);
      organizeFeaturedProducts(newProducts);
      organizeProductsByCategory(newProducts);
    } catch (error) {
      console.error('Failed to refresh products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Purchase Actions
  const purchaseProduct = async (productId: string, quantity: number = 1): Promise<Purchase> => {
    if (!user || isGuest) {
      throw new Error('Authentication required to make purchases');
    }

    setIsPurchasing(true);
    try {
      const purchase = await shopService.purchaseProduct(
        user.uid,
        userProfile?.displayName || 'User',
        userProfile?.photoURL,
        productId,
        quantity
      );

      // Refresh relevant data after purchase
      await Promise.all([
        refreshInventory(),
        refreshPurchaseHistory(),
        refreshShopStats()
      ]);

      return purchase;
    } catch (error: any) {
      console.error('Failed to purchase product:', error);
      throw new Error(`Failed to purchase product: ${error.message}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Inventory Actions
  const refreshInventory = async () => {
    if (!user || isGuest) return;

    setIsLoadingInventory(true);
    try {
      const inventory = await shopService.getUserInventory(user.uid);
      setUserInventory(inventory);
    } catch (error) {
      console.error('Failed to refresh inventory:', error);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Purchase History Actions
  const refreshPurchaseHistory = async () => {
    if (!user || isGuest) return;

    setIsLoadingPurchases(true);
    try {
      const history = await shopService.getPurchaseHistory(user.uid);
      setPurchaseHistory(history);
    } catch (error) {
      console.error('Failed to refresh purchase history:', error);
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  // Stats Actions
  const refreshShopStats = async () => {
    if (!user || isGuest) return;

    setIsLoadingStats(true);
    try {
      const stats = await shopService.getShopStats(user.uid);
      setShopStats(stats);
    } catch (error) {
      console.error('Failed to refresh shop stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Promotions Actions
  const refreshPromotions = async () => {
    setIsLoadingPromotions(true);
    try {
      const promotions = await shopService.getActivePromotions();
      setActivePromotions(promotions);
    } catch (error) {
      console.error('Failed to refresh promotions:', error);
    } finally {
      setIsLoadingPromotions(false);
    }
  };

  // General Actions
  const refreshAllShopData = async () => {
    await loadAllShopData();
  };

  // Utility Functions
  const getProductsByCategory = (category: ProductCategory): Product[] => {
    return productsByCategory[category] || [];
  };

  const canAffordProduct = (product: Product, quantity: number = 1): boolean => {
    // This would need access to user's currency balances
    // For now, return true - this should be integrated with currency context
    return true;
  };

  const hasProduct = (productId: string): boolean => {
    if (!userInventory) return false;
    return productId in userInventory.items && userInventory.items[productId].quantity > 0;
  };

  const getProductQuantity = (productId: string): number => {
    if (!userInventory) return 0;
    return userInventory.items[productId]?.quantity || 0;
  };

  return (
    <ShopContext.Provider value={{
      // Product State
      products,
      featuredProducts,
      productsByCategory,
      
      // User State
      userInventory,
      purchaseHistory,
      shopStats,
      
      // Promotions
      activePromotions,
      
      // Loading States
      isLoadingProducts,
      isLoadingInventory,
      isLoadingPurchases,
      isLoadingStats,
      isLoadingPromotions,
      isPurchasing,
      
      // Actions
      purchaseProduct,
      refreshProducts,
      refreshInventory,
      refreshPurchaseHistory,
      refreshShopStats,
      refreshPromotions,
      refreshAllShopData,
      
      // Utility Functions
      getProductsByCategory,
      canAffordProduct,
      hasProduct,
      getProductQuantity
    }}>
      {children}
    </ShopContext.Provider>
  );
};

// Custom hook to use the shop context
export const useShop = (): ShopContextType => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};

export default ShopContext;
