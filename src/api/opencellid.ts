import { CellTower, OpenCellIdResponse } from '../types';

const API_TOKEN = process.env.EXPO_PUBLIC_OPENCELLID_TOKEN ?? '';
const BASE_URL = 'https://www.opencellid.org/cell/getInArea';

const MAX_AREA_M2 = 4_000_000;
// Full bbox is clamped to 4 tiles × MAX_AREA_M2 with a safety margin
const MAX_FETCH_AREA_M2 = MAX_AREA_M2 * 4 * 0.99;

const MIN_SAMPLES = 1;
const MAX_RANGE_M = 50_000;

export interface ViewportBBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

function bboxAreaM2(bbox: ViewportBBox): number {
  const heightM = (bbox.maxLat - bbox.minLat) * 111_000;
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const widthM =
    (bbox.maxLon - bbox.minLon) * 111_000 * Math.cos((midLat * Math.PI) / 180);
  return heightM * widthM;
}

/** Clamps full bbox to MAX_FETCH_AREA_M2 before splitting into tiles */
function clampBBox(bbox: ViewportBBox): ViewportBBox {
  const area = bboxAreaM2(bbox);
  if (area <= MAX_FETCH_AREA_M2) return bbox;

  const scale = Math.sqrt(MAX_FETCH_AREA_M2 / area);
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const centerLon = (bbox.minLon + bbox.maxLon) / 2;
  const halfLatDelta = ((bbox.maxLat - bbox.minLat) / 2) * scale;
  const halfLonDelta = ((bbox.maxLon - bbox.minLon) / 2) * scale;

  return {
    minLat: centerLat - halfLatDelta,
    maxLat: centerLat + halfLatDelta,
    minLon: centerLon - halfLonDelta,
    maxLon: centerLon + halfLonDelta,
  };
}

/** Clamps full bbox first, then splits into 4 perfectly adjacent tiles */
function splitBBox2x2(bbox: ViewportBBox): ViewportBBox[] {
  const clamped = clampBBox(bbox);
  const midLat = (clamped.minLat + clamped.maxLat) / 2;
  const midLon = (clamped.minLon + clamped.maxLon) / 2;

  return [
    { minLat: clamped.minLat, minLon: clamped.minLon, maxLat: midLat,          maxLon: midLon          },
    { minLat: clamped.minLat, minLon: midLon,          maxLat: midLat,          maxLon: clamped.maxLon  },
    { minLat: midLat,         minLon: clamped.minLon,  maxLat: clamped.maxLat,  maxLon: midLon          },
    { minLat: midLat,         minLon: midLon,          maxLat: clamped.maxLat,  maxLon: clamped.maxLon  },
  ];
}

function towerKey(tower: CellTower): string {
  return `${tower.mcc}-${tower.mnc}-${tower.lac}-${tower.cellid}`;
}

async function fetchTileTowers(bbox: ViewportBBox): Promise<CellTower[]> {
  const bboxStr = `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`;
  const params = new URLSearchParams({
    key: API_TOKEN,
    BBOX: bboxStr,
    format: 'json',
    limit: '1000',
  });

  try {
    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!response.ok) return [];

    const data = await response.json();
    if ('error' in data) {
      console.error('[OpenCelliD] API error:', data.error);
      return [];
    }

    const cells = (data as OpenCellIdResponse).cells ?? [];
    return cells
      .filter((cell) => cell.samples >= MIN_SAMPLES && cell.range <= MAX_RANGE_M)
      .map((cell) => ({ ...cell, lat: Number(cell.lat), lon: Number(cell.lon) }));
  } catch (error) {
    console.error('[OpenCelliD] Network error:', error);
    return [];
  }
}

export async function fetchTowers(bbox: ViewportBBox): Promise<{ towers: CellTower[]; fetchedBBox: ViewportBBox }> {
  const clamped = clampBBox(bbox);
  const tiles = splitBBox2x2(bbox);
  const tileResults = await Promise.all(tiles.map(fetchTileTowers));
  const merged = tileResults.flat();

  const deduped = Array.from(
    merged.reduce((map, tower) => {
      map.set(towerKey(tower), tower);
      return map;
    }, new Map<string, CellTower>()).values()
  );

  console.log(`[OpenCelliD] Tiles: ${merged.length} raw → ${deduped.length} after dedupe`);
  return { towers: deduped, fetchedBBox: clamped };
}
