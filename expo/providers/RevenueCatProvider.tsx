import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesPackage,
  PurchasesOffering,
} from 'react-native-purchases';

const REVENUECAT_API_KEY_IOS = 'test_XsAQIeBZQckBRIlVNUbMVsZDRjj';
const ENTITLEMENT_ID = 'pro';
const FREE_QR_LIMIT = 5;

interface RevenueCatContextType {
  isPro: boolean;
  isLoading: boolean;
  currentOffering: PurchasesOffering | null;
  freeUsesRemaining: number;
  canCreateQR: boolean;
  recordUsage: () => void;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

const RevenueCatContext = createContext<RevenueCatContextType>({
  isPro: false,
  isLoading: true,
  currentOffering: null,
  freeUsesRemaining: FREE_QR_LIMIT,
  canCreateQR: true,
  recordUsage: () => {},
  purchasePackage: async () => false,
  restorePurchases: async () => false,
});

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [usageCount, setUsageCount] = useState(0);

  const freeUsesRemaining = Math.max(0, FREE_QR_LIMIT - usageCount);
  const canCreateQR = isPro || freeUsesRemaining > 0;

  useEffect(() => {
    const init = async () => {
      try {
        if (Platform.OS === 'web') {
          setIsLoading(false);
          return;
        }

        Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });

        // Load saved usage count
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const stored = await AsyncStorage.getItem('qr_usage_count');
        if (stored) setUsageCount(parseInt(stored, 10));

        // Check subscription status
        const customerInfo = await Purchases.getCustomerInfo();
        updateProStatus(customerInfo);

        // Load offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setCurrentOffering(offerings.current);
        }

        // Listen for subscription changes
        Purchases.addCustomerInfoUpdateListener(updateProStatus);
      } catch (e) {
        console.log('RevenueCat init error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const updateProStatus = (info: CustomerInfo) => {
    const hasEntitlement = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    setIsPro(hasEntitlement);
  };

  const recordUsage = useCallback(async () => {
    if (isPro) return;
    const newCount = usageCount + 1;
    setUsageCount(newCount);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('qr_usage_count', newCount.toString());
    } catch (e) {
      console.log('Failed to save usage count:', e);
    }
  }, [usageCount, isPro]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasEntitlement);
      return hasEntitlement;
    } catch (e: any) {
      if (!e.userCancelled) {
        console.log('Purchase error:', e);
      }
      return false;
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasEntitlement);
      return hasEntitlement;
    } catch (e) {
      console.log('Restore error:', e);
      return false;
    }
  }, []);

  return (
    <RevenueCatContext.Provider
      value={{
        isPro,
        isLoading,
        currentOffering,
        freeUsesRemaining,
        canCreateQR,
        recordUsage,
        purchasePackage,
        restorePurchases,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export const useRevenueCat = () => useContext(RevenueCatContext);
