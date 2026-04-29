import { useState, useEffect, useRef } from 'react';
import { CellTower } from '../types';
import { ViewportBBox } from '../api/opencellid';
import { fetchTowersFromSupabase } from '../api/supabase';

interface UseTowersResult {
  towers: CellTower[];
  fetchedBBox: ViewportBBox | null;
  isLoading: boolean;
  error: string | null;
}

export function useTowers(
  bbox: ViewportBBox | null,
  fetchKey: number,
): UseTowersResult {
  const [towers, setTowers] = useState<CellTower[]>([]);
  const [fetchedBBox, setFetchedBBox] = useState<ViewportBBox | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Accumulated tower cache — prevents blinking when panning over known areas
  const towersMapRef = useRef<Map<string, CellTower>>(new Map());

  const minLat = bbox?.minLat ?? null;
  const maxLat = bbox?.maxLat ?? null;
  const minLon = bbox?.minLon ?? null;
  const maxLon = bbox?.maxLon ?? null;

  useEffect(() => {
    if (minLat === null || maxLat === null || minLon === null || maxLon === null) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    // Cancel any in-flight fetch so a stale response can't overwrite newer results
    abortRef.current?.abort();

    setFetchedBBox(null);
    setError(null);
    setIsLoading(true);

    timerRef.current = setTimeout(async () => {
      const ac = new AbortController();
      abortRef.current = ac;
      const bboxArg = { minLat, maxLat, minLon, maxLon };

      try {
        const { towers: result, fetchedBBox: resultBBox } = await fetchTowersFromSupabase(bboxArg, ac.signal);

        // Merge new towers into the accumulated cache so already-visible towers
        // don't blink out when panning to a slightly different region.
        result.forEach((tower) => {
          const key = `${tower.mcc}-${tower.mnc}-${tower.lac}-${tower.cellid}`;
          towersMapRef.current.set(key, tower);
        });

        // Prune towers that are well outside the current viewport to bound memory.
        const latPad = (maxLat - minLat) * 2;
        const lonPad = (maxLon - minLon) * 2;
        for (const [key, tower] of towersMapRef.current) {
          if (
            tower.lat < minLat - latPad ||
            tower.lat > maxLat + latPad ||
            tower.lon < minLon - lonPad ||
            tower.lon > maxLon + lonPad
          ) {
            towersMapRef.current.delete(key);
          }
        }

        // Only expose towers within the exact current viewport — the cache may hold
        // a broader set for smooth re-panning, but off-screen towers must not appear
        // in counts or clusters.
        const visible = Array.from(towersMapRef.current.values()).filter(
          (t) => t.lat >= minLat && t.lat <= maxLat && t.lon >= minLon && t.lon <= maxLon,
        );

        if (visible.length === 0) {
          setError('No towers found');
          setTowers([]);
        } else {
          setError(null);
          setTowers(visible);
        }

        setFetchedBBox(resultBBox);
      } catch (err: unknown) {
        // Ignore aborted requests — a newer fetch is already in flight
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Failed to load towers');
        setTowers([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [minLat, maxLat, minLon, maxLon, fetchKey]);

  return { towers, fetchedBBox, isLoading, error };
}
