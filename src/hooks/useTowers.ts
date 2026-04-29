import { useState, useEffect, useRef } from 'react';
import { CellTower } from '../types';
import { fetchTowers, ViewportBBox } from '../api/opencellid';
import { fetchTowersFromSupabase } from '../api/supabase';
import { DataSource } from '../context/DataSourceContext';

interface UseTowersResult {
  towers: CellTower[];
  fetchedBBox: ViewportBBox | null;
  isLoading: boolean;
  error: string | null;
}

export function useTowers(
  bbox: ViewportBBox | null,
  fetchKey: number,
  dataSource: DataSource = 'opencellid'
): UseTowersResult {
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

    setFetchedBBox(null);
    setError(null);
    setIsLoading(true);

    timerRef.current = setTimeout(async () => {
      const bboxArg = { minLat, maxLat, minLon, maxLon };
      const fetcher =
        dataSource === 'supabase' ? fetchTowersFromSupabase : fetchTowers;

      try {
        const { towers: result, fetchedBBox: resultBBox } = await fetcher(bboxArg);

        if (result.length === 0) {
          setError('No towers found');
          setTowers([]);
        } else {
          setError(null);
          setTowers(result);
        }

        setFetchedBBox(resultBBox);
      } catch {
        setError('Failed to load towers');
        setTowers([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [minLat, maxLat, minLon, maxLon, fetchKey, dataSource]);

  return { towers, fetchedBBox, isLoading, error };
}
