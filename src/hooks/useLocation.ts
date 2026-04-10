import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { UserLocation } from '../types';

interface UseLocationResult {
  location: UserLocation | null;
  errorMsg: string | null;
  isLoading: boolean;
}

/**
 * Запрашивает разрешение на геолокацию и возвращает текущие координаты.
 *
 * Почему хук — потому что он интегрирован в жизненный цикл React.
 * При уходе с экрана эффект очищается автоматически.
 */
export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // async внутри useEffect — стандартный паттерн,
    // потому что useEffect не может быть async напрямую
    async function getLocation() {
      try {
        // requestForegroundPermissions — разрешение только пока приложение активно
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setErrorMsg('Нет доступа к геолокации.\nРазреши его в настройках телефона.');
          return;
        }

        const result = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });
      } catch (error) {
        console.error('[useLocation]', error);
        setErrorMsg('Не удалось получить геолокацию');
      } finally {
        // finally — выполняется всегда, и при успехе и при ошибке
        setIsLoading(false);
      }
    }

    getLocation();
  }, []); // [] = запустить один раз при монтировании компонента

  return { location, errorMsg, isLoading };
}
