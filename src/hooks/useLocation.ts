import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
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

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    async function start() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setErrorMsg('Location access denied.\nPlease enable it in phone settings.');
          setIsLoading(false);
          return;
        }

        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
        });
        setIsLoading(false);

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
          (pos) => {
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          }
        );
      } catch (error) {
        console.error('[useLocation]', error);
        setErrorMsg('Failed to get location');
        setIsLoading(false);
      }
    }

    start();

    return () => {
      subscription?.remove();
    };
  }, []);

  return { location, errorMsg, isLoading };
}
