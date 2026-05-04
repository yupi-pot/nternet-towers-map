import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const KEY = 'cellr_coverage_uses';
export const FREE_COVERAGE_QUOTA = 5;

export function useCoverageQuota() {
  const [used, setUsed] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        const n = raw ? parseInt(raw, 10) : 0;
        setUsed(Number.isFinite(n) && n >= 0 ? n : 0);
      } catch {
        setUsed(0);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const consume = useCallback(async () => {
    setUsed((prev) => {
      const next = prev + 1;
      SecureStore.setItemAsync(KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const remaining = Math.max(0, FREE_COVERAGE_QUOTA - used);

  return { used, remaining, loaded, consume };
}
