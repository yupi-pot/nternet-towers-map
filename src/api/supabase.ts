import { CellTower } from '../types';
import { ViewportBBox } from './opencellid';

const SUPABASE_URL = 'https://nykisarixoohwxqbxdnz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55a2lzYXJpeG9vaHd4cWJ4ZG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjQyNzksImV4cCI6MjA5MzA0MDI3OX0.YN5vRzHACGAP5l_lTO5ezxrXAEIn65F6YOBp42BYgTo';

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
  bbox: ViewportBBox,
  signal?: AbortSignal,
): Promise<{ towers: CellTower[]; fetchedBBox: ViewportBBox }> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/towers_in_bbox`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      min_lat: bbox.minLat,
      max_lat: bbox.maxLat,
      min_lon: bbox.minLon,
      max_lon: bbox.maxLon,
    }),
    signal,
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Supabase HTTP ${resp.status}: ${body}`);
  }

  const rows: SupabaseRow[] = await resp.json();
  const towers = rows.map(rowToTower);
  console.log(`[Supabase] ${towers.length} towers for bbox`);
  return { towers, fetchedBBox: bbox };
}
