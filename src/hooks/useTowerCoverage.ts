import { useEffect, useRef, useState } from 'react';
import { CellTower } from '@/src/types';

const NUM_ANGLES = 36;
const NUM_RADII = 10;
const TOWER_HEIGHT_M = 30;
const FETCH_TIMEOUT_MS = 8000;
const MAX_RADIUS_M = 25000;
const RING_FRACS = [1.0, 0.70, 0.45, 0.20] as const;

export interface CoverageRing {
  coordinates: { latitude: number; longitude: number }[];
}

export interface CoverageData {
  rings: CoverageRing[];  // 4 rings, index 0 = outermost
  center: { latitude: number; longitude: number };
  radius: number;
  ready: boolean;         // false while terrain is being fetched
}

function getCoverageRadius(tower: CellTower): number {
  const r = tower.range;
  if (r > 100 && r <= MAX_RADIUS_M) return r;
  switch (tower.radio) {
    case 'GSM':  return 10000;
    case 'UMTS': return 5000;
    case 'LTE':  return 6000;
    case 'NR':   return 1000;
    default:     return 4000;
  }
}

function offsetCoord(
  lat: number, lon: number, distM: number, bearingDeg: number,
): { lat: number; lon: number } {
  const R = 6371000;
  const φ = lat * (Math.PI / 180);
  const λ = lon * (Math.PI / 180);
  const θ = bearingDeg * (Math.PI / 180);
  const δ = distM / R;
  const φ2 = Math.asin(Math.sin(φ) * Math.cos(δ) + Math.cos(φ) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ),
    Math.cos(δ) - Math.sin(φ) * Math.sin(φ2),
  );
  return { lat: φ2 * 180 / Math.PI, lon: λ2 * 180 / Math.PI };
}

function buildPolygon(
  tLat: number, tLon: number, distPerAngle: number[],
): { latitude: number; longitude: number }[] {
  return distPerAngle.map((dist, i) => {
    const pt = offsetCoord(tLat, tLon, dist, (i / NUM_ANGLES) * 360);
    return { latitude: pt.lat, longitude: pt.lon };
  });
}

async function fetchElevations(
  locations: { latitude: number; longitude: number }[],
): Promise<number[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const locs = locations.map((l) => `${l.latitude},${l.longitude}`).join('|');
    const res = await fetch(
      `https://api.opentopodata.org/v1/srtm90m?locations=${locs}`,
      { signal: ctrl.signal },
    );
    const json = await res.json();
    return (json.results as { elevation: number }[]).map((r) => r.elevation);
  } finally {
    clearTimeout(timer);
  }
}

export function useTowerCoverage(tower: CellTower | null): CoverageData | null {
  const [data, setData] = useState<CoverageData | null>(null);
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    if (!tower) {
      setData(null);
      activeId.current = null;
      return;
    }

    const id = `${tower.mcc}-${tower.mnc}-${tower.lac}-${tower.cellid}`;
    activeId.current = id;

    const radius = getCoverageRadius(tower);
    console.log('[Coverage] tower tapped:', id, 'radius:', radius, 'm');

    const fullDists = new Array(NUM_ANGLES).fill(radius);

    // Show simple circles immediately while terrain loads
    console.log('[Coverage] setting fallback circles, ready=false');
    setData({
      rings: RING_FRACS.map((f) => ({
        coordinates: buildPolygon(tower.lat, tower.lon, fullDists.map((d) => d * f)),
      })),
      center: { latitude: tower.lat, longitude: tower.lon },
      radius,
      ready: false,
    });

    // Build polar elevation query grid: tower center + NUM_ANGLES × NUM_RADII
    const queryLocs: { latitude: number; longitude: number }[] = [
      { latitude: tower.lat, longitude: tower.lon },
    ];
    const meta: { angleIdx: number; radiusIdx: number }[] = [];

    for (let a = 0; a < NUM_ANGLES; a++) {
      for (let r = 1; r <= NUM_RADII; r++) {
        const pt = offsetCoord(tower.lat, tower.lon, radius * (r / NUM_RADII), (a / NUM_ANGLES) * 360);
        queryLocs.push({ latitude: pt.lat, longitude: pt.lon });
        meta.push({ angleIdx: a, radiusIdx: r - 1 });
      }
    }

    console.log('[Coverage] fetching elevation for', queryLocs.length, 'points...');
    fetchElevations(queryLocs)
      .then((elevs) => {
        console.log('[Coverage] elevation fetch OK, samples:', elevs.length, 'tower elev:', elevs[0]);
        if (activeId.current !== id) {
          console.log('[Coverage] stale response, ignoring');
          return;
        }

        const towerElev = elevs[0];
        const grid: { elevation: number; distM: number }[][] =
          Array.from({ length: NUM_ANGLES }, () => []);

        meta.forEach((m, i) => {
          grid[m.angleIdx].push({
            elevation: elevs[i + 1],
            distM: radius * ((m.radiusIdx + 1) / NUM_RADII),
          });
        });

        // Ray-march viewshed: track max slope from tower; first blockage stops the ray
        const maxDists = grid.map((ray) => {
          let maxSlope = -Infinity;
          let maxDist = radius * 0.05;
          for (const pt of ray) {
            const slope = (pt.elevation - towerElev - TOWER_HEIGHT_M) / pt.distM;
            if (slope >= maxSlope) {
              maxSlope = slope;
              maxDist = pt.distM;
            } else {
              break;
            }
          }
          return maxDist;
        });

        console.log('[Coverage] viewshed done. sample maxDists (first 5):', maxDists.slice(0, 5));
        setData({
          rings: RING_FRACS.map((f) => ({
            coordinates: buildPolygon(
              tower.lat, tower.lon,
              maxDists.map((d) => Math.min(d, radius * f)),
            ),
          })),
          center: { latitude: tower.lat, longitude: tower.lon },
          radius,
          ready: true,
        });
      })
      .catch((err) => {
        console.log('[Coverage] elevation fetch FAILED:', err?.message ?? err);
        if (activeId.current !== id) return;
        // Terrain fetch failed — promote simple circles to "ready" so they stay
        setData((prev) => (prev ? { ...prev, ready: true } : null));
      });
  }, [tower]);

  return data;
}
