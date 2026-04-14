import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Region } from 'react-native-maps';
import ClusterMapView from 'react-native-map-clustering';
import { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import TowerDetailModal from '@/src/components/TowerDetailModal';
import { useTowersContext } from '@/src/context/TowersContext';
import { CellTower, RADIO_COLORS, RADIO_LABELS } from '@/src/types';

const ALL_RADIOS: CellTower['radio'][] = ['GSM', 'UMTS', 'LTE', 'NR'];
const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G',
  UMTS: '3G',
  LTE: '4G',
  NR: '5G',
};

export default function MapTab() {
  const {
    towers,
    isLoading: towersLoading,
    error: towersError,
    location,
    locationLoading,
    locationError,
    mapRegionRef,
    refreshCurrentRegion,
  } = useTowersContext();

  // Network type filter
  const [activeFilters, setActiveFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const [mapFilters, setMapFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hasPanned, setHasPanned] = useState(false);
  const [selectedTower, setSelectedTower] = useState<CellTower | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const firstFetchDoneRef = useRef(false);
  const userHasDraggedRef = useRef(false);

  if (towers.length > 0) firstFetchDoneRef.current = true;

  const handleRefresh = useCallback(() => {
    refreshCurrentRegion();
    setHasPanned(false);
    userHasDraggedRef.current = false;
  }, [refreshCurrentRegion]);

  const handlePanDrag = useCallback(() => {
    userHasDraggedRef.current = true;
  }, []);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      mapRegionRef.current = region;
      if (userHasDraggedRef.current && firstFetchDoneRef.current) {
        setHasPanned(true);
      }
    },
    [mapRegionRef],
  );

  const handleMyLocation = useCallback(() => {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      500,
    );
  }, [location]);

  const toggleFilter = useCallback((radio: CellTower['radio']) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(radio)) {
        if (next.size > 1) next.delete(radio);
      } else {
        next.add(radio);
      }
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
      filterTimerRef.current = setTimeout(() => setMapFilters(new Set(next)), 200);
      return next;
    });
  }, []);

  const filteredTowers = useMemo(
    () => towers.filter((t) => mapFilters.has(t.radio)),
    [towers, mapFilters],
  );

  const displayCount = towers.filter((t) => activeFilters.has(t.radio)).length;

  if (locationLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Getting location…</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{locationError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ClusterMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location!.latitude,
          longitude: location!.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPanDrag={handlePanDrag}
        showsUserLocation
        clusterColor="#3b82f6"
        clusterTextColor="#fff"
        radius={40}
        animationEnabled={false}
      >
        {filteredTowers.map((tower) => (
          <Marker
            key={`${tower.mcc}-${tower.mnc}-${tower.lac}-${tower.cellid}`}
            coordinate={{ latitude: tower.lat, longitude: tower.lon }}
            pinColor={RADIO_COLORS[tower.radio]}
            onPress={() => setSelectedTower(tower)}
            title={RADIO_LABELS[tower.radio]}
            description={`Cell ID: ${tower.cellid}`}
          />
        ))}
      </ClusterMapView>

      {/* Top overlay: status + filters */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.statusRow} pointerEvents="auto">
          <View style={styles.statusChip}>
            {towersLoading ? (
              <ActivityIndicator size="small" color="#1e293b" />
            ) : (
              <Text style={styles.statusText}>
                {towers.length > 0
                  ? `${displayCount} towers`
                  : (towersError ?? 'No towers found')}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={handleRefresh}>
            <Text style={styles.iconBtnText}>⟳</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow} pointerEvents="auto">
          {ALL_RADIOS.map((radio) => (
            <TouchableOpacity
              key={radio}
              style={[
                styles.filterChip,
                activeFilters.has(radio)
                  ? { backgroundColor: RADIO_COLORS[radio], borderColor: RADIO_COLORS[radio] }
                  : styles.filterChipInactive,
              ]}
              onPress={() => toggleFilter(radio)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !activeFilters.has(radio) && styles.filterChipTextInactive,
                ]}
              >
                {RADIO_SHORT[radio]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* Search this area */}
      {hasPanned && !towersLoading && (
        <View style={styles.searchAreaWrap} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.searchAreaBtn}
            onPress={handleRefresh}
          >
            <Text style={styles.searchAreaText}>Search this area</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* My location */}
      <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation}>
        <Text style={styles.myLocationIcon}>⊙</Text>
      </TouchableOpacity>

      <TowerDetailModal
        tower={selectedTower}
        userLat={location?.latitude ?? null}
        userLon={location?.longitude ?? null}
        onClose={() => setSelectedTower(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748b' },
  errorText: { fontSize: 16, color: '#ef4444', textAlign: 'center' },

  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  statusChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: { color: '#1e293b', fontSize: 13, fontWeight: '600' },
  iconBtn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  iconBtnText: { color: '#1e293b', fontSize: 20 },

  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: '#cbd5e1',
  },
  filterChipText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  filterChipTextInactive: { color: '#64748b' },

  searchAreaWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchAreaBtn: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  searchAreaText: { fontSize: 14, fontWeight: '700', color: '#1e293b' },

  myLocationBtn: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  myLocationIcon: { fontSize: 22, color: '#3b82f6' },
});
