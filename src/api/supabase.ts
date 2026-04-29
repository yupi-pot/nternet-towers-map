import { CellTower } from '../types';
import { ViewportBBox } from './opencellid';

const SUPABASE_URL = 'https://nykisarixoohwxqbxdnz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55a2lzYXJpeG9vaHd4cWJ4ZG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjQyNzksImV4cCI6MjA5MzA0MDI3OX0.YN5vRzHACGAP5l_lTO5ezxrXAEIn65F6YOBp42BYgTo';

const MAX_RANGE_M = 50_000;
const ROW_LIMIT = 2000;

interface SupabaseRow {
  radio: string;
  mcc: number;
  net: number;
  area: number;
  cell: number;
  lon: number;
  lat: number;
  range: number | null;
  samples: number | null;
  avg_signal: number | null;
}

function toRadio(r: string): CellTower['radio'] {
  if (r === 'GSM' || r === 'UMTS' || r === 'LTE' || r === 'NR') return r;
  return 'LTE';
}

function rowToTower(row: SupabaseRow): CellTower {
  return {
    radio: toRadio(row.radio),
    mcc: row.mcc,
    mnc: row.net,
    lac: row.area,
    cellid: row.cell,
    lon: row.lon,
    lat: row.lat,
    range: row.range ?? 1000,
    samples: row.samples ?? 0,
    averageSignalStrength: row.avg_signal ?? 0,
  };
}

export async function fetchTowersFromSupabase(
  bbox: ViewportBBox
): Promise<{ towers: CellTower[]; fetchedBBox: ViewportBBox }> {
  const params = new URLSearchParams({
    'lat': `gte.${bbox.minLat}`,
    'lat': `lte.${bbox.maxLat}`,
    'lon': `gte.${bbox.minLon}`,
    'lon': `lte.${bbox.maxLon}`,
    'select': 'radio,mcc,net,area,cell,lon,lat,range,samples,avg_signal',
    'limit': String(ROW_LIMIT),
  });

  // URLSearchParams deduplicates keys — build query string manually for multi-filter
  const query = [
    `lat=gte.${bbox.minLat}`,
    `lat=lte.${bbox.maxLat}`,
    `lon=gte.${bbox.minLon}`,
    `lon=lte.${bbox.maxLon}`,
    `range=lte.${MAX_RANGE_M}`,
    `select=radio,mcc,net,area,cell,lon,lat,range,samples,avg_signal`,
    `limit=${ROW_LIMIT}`,
  ].join('&');

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/cell_towers?${query}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!resp.ok) {
      console.error('[Supabase] HTTP', resp.status);
      return { towers: [], fetchedBBox: bbox };
    }

    const rows: SupabaseRow[] = await resp.json();
    const towers = rows.map(rowToTower);
    console.log(`[Supabase] ${towers.length} towers for bbox`);
    return { towers, fetchedBBox: bbox };
  } catch (err) {
    console.error('[Supabase] fetch error:', err);
    return { towers: [], fetchedBBox: bbox };
  }
}
