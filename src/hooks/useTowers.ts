import { useState, useEffect, useRef } from 'react';
import { CellTower } from '../types';
import { fetchTowers, ViewportBBox } from '../api/opencellid';

interface UseTowersResult {
  towers: CellTower[];
  fetchedBBox: ViewportBBox | null;
  isLoading: boolean;
  error: string | null;
}

export function useTowers(bbox: ViewportBBox | null, fetchKey: number): UseTowersResult {
  const [towers, setTowers] = useState<CellTower[]>([]);
  const [fetchedBBox, setFetchedBBox] = useState<ViewportBBox | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minLat = bbox?.minLat ?? null;
  const maxLat = bbox?.maxLat ?? null;
  const minLon = bbox?.minLon ?? null;
  const maxLon = bbox?.maxLon ?? null;

  useEffect(() => {
    if (minLat === null || maxLat === null || minLon === null || maxLon === null) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    setTowers([]);
    setFetchedBBox(null);
    setError(null);
    setIsLoading(true);

    timerRef.current = setTimeout(async () => {
      const { towers: result, fetchedBBox: resultBBox } = await fetchTowers({
        minLat, maxLat, minLon, maxLon,
      });

      if (result.length === 0) {
        setError('No towers found');
        setTowers([]);
      } else {
        setTowers(result);
      }

      setFetchedBBox(resultBBox);
      setIsLoading(false);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [minLat, maxLat, minLon, maxLon, fetchKey]);

  return { towers, fetchedBBox, isLoading, error };
}
