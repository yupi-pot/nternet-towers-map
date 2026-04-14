import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const PREMIUM_KEY = 'cellr_premium';

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  /** Activate premium (mock — replace with IAP call next step). */
  activatePremium: () => Promise<void>;
  /** Deactivate for testing. */
  deactivatePremium: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(PREMIUM_KEY)
      .then((val) => setIsPremium(val === 'true'))
      .finally(() => setIsLoading(false));
  }, []);

  const activatePremium = useCallback(async () => {
    await SecureStore.setItemAsync(PREMIUM_KEY, 'true');
    setIsPremium(true);
  }, []);

  const deactivatePremium = useCallback(async () => {
    await SecureStore.deleteItemAsync(PREMIUM_KEY);
    setIsPremium(false);
  }, []);

  return (
    <PremiumContext.Provider value={{ isPremium, isLoading, activatePremium, deactivatePremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
