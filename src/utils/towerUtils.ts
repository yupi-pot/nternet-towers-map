// ─── Distance ────────────────────────────────────────────────────────────────

/** Haversine distance in meters between two lat/lon points. */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format meters as human-readable distance string. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ─── Bearing ─────────────────────────────────────────────────────────────────

/**
 * Calculates the initial bearing (forward azimuth) from point 1 to point 2.
 * Returns degrees 0–360, where 0 = North.
 */
export function bearingTo(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const bearing = (Math.atan2(x, y) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** Convert a 0–360 bearing to a cardinal direction string (N, NE, E…). */
export function cardinalDirection(bearing: number): string {
  const index = Math.round(bearing / 45) % 8;
  return CARDINALS[index];
}

/** Format bearing as "NE · 42°" */
export function formatBearing(bearing: number): string {
  return `${cardinalDirection(bearing)} · ${Math.round(bearing)}°`;
}

// ─── Confidence ───────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Confidence level based on the number of OpenCelliD sample measurements. */
export function confidenceLevel(samples: number): ConfidenceLevel {
  if (samples >= 10) return 'high';
  if (samples >= 2) return 'medium';
  return 'low';
}

export const CONFIDENCE_COLOR: Record<ConfidenceLevel, string> = {
  high: '#22c55e',
  medium: '#f59e0b',
  low: '#ef4444',
};

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// ─── Tower limit (free vs premium) ───────────────────────────────────────────

export const FREE_TOWER_LIMIT = 10;
