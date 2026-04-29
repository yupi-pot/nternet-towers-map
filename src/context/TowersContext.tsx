import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Region } from 'react-native-maps';

import { ViewportBBox } from '../api/opencellid';
import { useDataSource } from './DataSourceContext';
import { useLocation } from '../hooks/useLocation';
import { useTowers } from '../hooks/useTowers';
import { CellTower } from '../types';

function regionToBBox(region: Region): ViewportBBox {
  return {
    minLat: region.latitude - region.latitudeDelta / 2,
    maxLat: region.latitude + region.latitudeDelta / 2,
    minLon: region.longitude - region.longitudeDelta / 2,
    maxLon: region.longitude + region.longitudeDelta / 2,
  };
}

interface TowersContextValue {
  towers: CellTower[];
  isLoading: boolean;
  error: string | null;
  location: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  locationError: string | null;
  mapRegionRef: React.RefObject<Region | null>;
  refreshCurrentRegion: () => void;
  dataSource: import('./DataSourceContext').DataSource;
  setDataSource: (src: import('./DataSourceContext').DataSource) => void;
}

const TowersContext = createContext<TowersContextValue | null>(null);

export function TowersProvider({ children }: { children: React.ReactNode }) {
  const { location, errorMsg: locationError, isLoading: locationLoading } = useLocation();

  const [fetchBBox, setFetchBBox] = useState<ViewportBBox | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const mapRegionRef = useRef<Region | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!location || initializedRef.current) return;
    initializedRef.current = true;
    const initialRegion: Region = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
    mapRegionRef.current = initialRegion;
    setFetchBBox(regionToBBox(initialRegion));
  }, [location]);

  const { dataSource, setDataSource } = useDataSource();
  const { towers, isLoading, error } = useTowers(fetchBBox, fetchKey, dataSource);

  const refreshCurrentRegion = useCallback(() => {
    const region = mapRegionRef.current;
    if (!region) return;
    setFetchBBox(regionToBBox(region));
    setFetchKey((k) => k + 1);
  }, []);

  return (
    <TowersContext.Provider
      value={{
        towers,
        isLoading,
        error,
        location,
        locationLoading,
        locationError,
        mapRegionRef,
        refreshCurrentRegion,
        dataSource,
        setDataSource,
      }}
    >
      {children}
    </TowersContext.Provider>
  );
}

export function useTowersContext(): TowersContextValue {
  const ctx = useContext(TowersContext);
  if (!ctx) throw new Error('useTowersContext must be used within TowersProvider');
  return ctx;
}
