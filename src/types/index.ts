// ============================================================
// Типы данных для всего приложения
// ============================================================

/**
 * Одна вышка сотовой связи из OpenCelliD API.
 * Названия полей соответствуют реальному ответу API.
 */
export interface CellTower {
  radio: 'GSM' | 'UMTS' | 'LTE' | 'NR'; // GSM=2G, UMTS=3G, LTE=4G, NR=5G
  mcc: number;    // Mobile Country Code (250 = Россия)
  mnc: number;    // Mobile Network Code (код оператора)
  lac: number;    // Location Area Code
  cellid: number; // Cell ID
  lat: number;
  lon: number;
  range: number;               // радиус покрытия в метрах
  samples: number;             // количество измерений
  averageSignalStrength: number; // средний сигнал в dBm
}

/**
 * Ответ от API при запросе вышек в области.
 */
export interface OpenCellIdResponse {
  count: number;
  cells: CellTower[];
}

/**
 * Координаты пользователя.
 */
export interface UserLocation {
  latitude: number;
  longitude: number;
}

/**
 * Читабельные названия типов сетей.
 */
export const RADIO_LABELS: Record<CellTower['radio'], string> = {
  GSM: '2G (GSM)',
  UMTS: '3G (UMTS)',
  LTE: '4G (LTE)',
  NR: '5G (NR)',
};

/**
 * Цвета маркеров на карте по типу сети.
 */
export const RADIO_COLORS: Record<CellTower['radio'], string> = {
  GSM: '#ef4444',   // красный
  UMTS: '#f97316',  // оранжевый
  LTE: '#22c55e',   // зелёный
  NR: '#3b82f6',    // синий
};
