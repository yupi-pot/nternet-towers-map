export interface CellTower {
  radio: 'GSM' | 'UMTS' | 'LTE' | 'NR'; // GSM=2G, UMTS=3G, LTE=4G, NR=5G
  mcc: number;    // Mobile Country Code
  mnc: number;    // Mobile Network Code (operator)
  lac: number;    // Location Area Code
  cellid: number; // Cell ID
  lat: number;
  lon: number;
  range: number;                // coverage radius in meters
  samples: number;              // number of measurements
  averageSignalStrength: number; // average signal in dBm
}

export interface OpenCellIdResponse {
  count: number;
  cells: CellTower[];
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export const RADIO_LABELS: Record<CellTower['radio'], string> = {
  GSM: '2G (GSM)',
  UMTS: '3G (UMTS)',
  LTE: '4G (LTE)',
  NR: '5G (NR)',
};

export const RADIO_COLORS: Record<CellTower['radio'], string> = {
  GSM: '#ef4444',   // red
  UMTS: '#f97316',  // orange
  LTE: '#22c55e',   // green
  NR: '#3b82f6',    // blue
};
