import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import i18n from '@/src/i18n';
import { UserLocation } from '../types';

interface UseLocationResult {
  location: UserLocation | null;
  errorMsg: string | null;
  isLoading: boolean;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const startedRef = useRef(false);

  async function startWatching() {
    if (startedRef.current) return;

    const { status } = await Location.getForegroundPermissionsAsync();

    if (status !== 'granted') {
      // Permission not yet granted — onboarding will request it.
      // Don't show the system dialog here.
      setIsLoading(false);
      return;
    }

    startedRef.current = true;

    try {
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: initial.coords.latitude,
        longitude: initial.coords.longitude,
      });
      setIsLoading(false);

      subscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
      );
    } catch (error) {
      console.error('[useLocation]', error);
      setErrorMsg(i18n.t('errors.failedToGetLocation'));
      setIsLoading(false);
    }
  }

  useEffect(() => {
    startWatching();

    // Re-check when the user returns from Settings after enabling location.
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') startWatching();
    });

    return () => {
      sub.remove();
      subscriptionRef.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, errorMsg, isLoading };
}
