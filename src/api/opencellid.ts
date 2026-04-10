// ============================================================
// Запросы к OpenCelliD API
// Документация: http://wiki.opencellid.org/wiki/API
// ============================================================

import { CellTower, OpenCellIdResponse, UserLocation } from '../types';

const API_TOKEN = 'pk.3624ebccd066632db9ab719c2a98b456';
const BASE_URL = 'https://www.opencellid.org/cell/getInArea';

/**
 * Вычисляет bounding box вокруг точки с заданным радиусом.
 *
 * API принимает BBOX в формате: "minLat,minLon,maxLat,maxLon"
 *
 * Почему именно так:
 * - 1° широты ≈ 111 км (константа)
 * - 1° долготы ≈ 111 * cos(широта) км (уменьшается у полюсов)
 */
function getBoundingBox(center: UserLocation, radiusKm: number): string {
  const deltaLat = radiusKm / 111;
  const deltaLon = radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));

  const minLat = center.latitude - deltaLat;
  const maxLat = center.latitude + deltaLat;
  const minLon = center.longitude - deltaLon;
  const maxLon = center.longitude + deltaLon;

  return `${minLat},${minLon},${maxLat},${maxLon}`;
}

/**
 * Загружает вышки вокруг заданной точки.
 *
 * @param location — координаты центра поиска
 * @param radiusKm — радиус в километрах (по умолчанию 5)
 */
export async function fetchTowers(
  location: UserLocation,
  radiusKm: number = 0.7
): Promise<CellTower[]> {
  const bbox = getBoundingBox(location, radiusKm);

  const params = new URLSearchParams({
    key: API_TOKEN,
    BBOX: bbox,
    format: 'json',
  });

  const url = `${BASE_URL}?${params.toString()}`;
  console.log('[OpenCelliD] Запрос:', url);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // 403 = невалидный токен, 429 = превышен лимит запросов
      console.error('[OpenCelliD] HTTP ошибка:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('[OpenCelliD] Ответ:', JSON.stringify(data));

    const cells = (data as OpenCellIdResponse).cells ?? [];
    console.log('[OpenCelliD] Координаты:', cells.map((c) => `lat=${c.lat} lon=${c.lon}`));

    // Явное приведение к числу — OpenCelliD может вернуть строки вместо чисел
    return cells.map((cell) => ({
      ...cell,
      lat: Number(cell.lat),
      lon: Number(cell.lon),
    }));
  } catch (error) {
    console.error('[OpenCelliD] Сетевая ошибка:', error);
    return [];
  }
}
