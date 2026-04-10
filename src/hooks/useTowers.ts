import { useState, useEffect } from 'react';
import { CellTower, UserLocation } from '../types';
import { fetchTowers } from '../api/opencellid';

interface UseTowersResult {
  towers: CellTower[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Загружает вышки вокруг пользователя.
 * Перезагружает при изменении location или вызове refresh().
 */
export function useTowers(location: UserLocation | null): UseTowersResult {
  const [towers, setTowers] = useState<CellTower[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Счётчик для ручного обновления — инкремент запускает useEffect заново
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!location) return; // геолокация ещё не готова

    async function load() {
      setIsLoading(true);
      setError(null);

      const result = await fetchTowers(location!);

      if (result.length === 0) {
        setError('Вышки не найдены или превышен лимит API');
      }

      setTowers(result);
      setIsLoading(false);
    }

    load();
  }, [location, refreshCount]);

  const refresh = () => setRefreshCount((n) => n + 1);

  return { towers, isLoading, error, refresh };
}
