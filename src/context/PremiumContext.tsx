import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { adapty, AdaptyProfile } from 'react-native-adapty';

import { ACCESS_LEVEL_ID } from '@/src/config/adapty';

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  /** When the current premium period ends. Null if not premium. */
  expiresAt: Date | null;
  /** Whether the subscription is set to auto-renew at expiresAt. */
  willRenew: boolean;
  /** Re-fetch the latest Adapty profile (e.g. after a purchase). */
  refresh: () => Promise<void>;
  /** Restore prior purchases (Apple requirement on paywall screens). */
  restore: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [willRenew, setWillRenew] = useState(false);

  const applyProfile = useCallback((profile: AdaptyProfile | null | undefined) => {
    const access = profile?.accessLevels?.[ACCESS_LEVEL_ID];
    setIsPremium(access?.isActive ?? false);
    setExpiresAt(access?.expiresAt ? new Date(access.expiresAt) : null);
    setWillRenew(access?.willRenew ?? false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const profile = await adapty.getProfile();
        if (!cancelled) applyProfile(profile);
      } catch {
        // Keep default (not premium) — Adapty caches and will fire onLatestProfileLoad later.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    const subscription = adapty.addEventListener('onLatestProfileLoad', (profile) => {
      applyProfile(profile);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [applyProfile]);

  const refresh = useCallback(async () => {
    try {
      const profile = await adapty.getProfile();
      applyProfile(profile);
    } catch {
      // ignore — listener will catch up
    }
  }, [applyProfile]);

  const restore = useCallback(async () => {
    try {
      const profile = await adapty.restorePurchases();
      applyProfile(profile);
    } catch {
      // ignore — caller can show its own error UI
    }
  }, [applyProfile]);

  return (
    <PremiumContext.Provider value={{ isPremium, isLoading, expiresAt, willRenew, refresh, restore }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
