import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ClusterMapView from 'react-native-map-clustering';
import { Marker, Region } from 'react-native-maps';
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

// ─── Glass panel — cross-platform ─────────────────────────────────────────────
function Glass({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={82}
        tint="systemUltraThinMaterialLight"
        style={[styles.glass, style]}
      >
        {children}
      </BlurView>
    );
  }
  // Android fallback
  return (
    <View style={[styles.glassAndroid, style]}>{children}</View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
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
      if (userHasDraggedRef.current && firstFetchDoneRef.current) setHasPanned(true);
    },
    [mapRegionRef],
  );

  const handleMyLocation = useCallback(() => {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 },
      500,
    );
  }, [location]);

  const toggleFilter = useCallback((radio: CellTower['radio']) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(radio)) { if (next.size > 1) next.delete(radio); }
      else next.add(radio);
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
        <Text style={styles.centeredText}>Getting location…</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.centeredText, { color: '#ef4444' }]}>{locationError}</Text>
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
        clusterColor="#1c1c1e"
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

      {/* ── Top controls ── */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">

        {/* Unified glass bar */}
        <View style={styles.barRow} pointerEvents="auto">
          <Glass style={styles.statusBar}>
            {/* Count / loading */}
            <View style={styles.statusLeft}>
              {towersLoading ? (
                <ActivityIndicator size="small" color="#1c1c1e" />
              ) : (
                <Text style={styles.countText}>
                  {towers.length > 0
                    ? `${displayCount} towers`
                    : (towersError ?? 'No towers')}
                </Text>
              )}
            </View>

            {/* Divider */}
            <View style={styles.barDivider} />

            {/* Filter chips */}
            <View style={styles.chipRow}>
              {ALL_RADIOS.map((radio) => {
                const active = activeFilters.has(radio);
                return (
                  <TouchableOpacity
                    key={radio}
                    onPress={() => toggleFilter(radio)}
                    style={[
                      styles.chip,
                      active
                        ? { backgroundColor: RADIO_COLORS[radio] }
                        : styles.chipInactive,
                    ]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, !active && styles.chipTextInactive]}>
                      {RADIO_SHORT[radio]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Glass>

          {/* Refresh button */}
          <TouchableOpacity onPress={handleRefresh} activeOpacity={0.75}>
            <Glass style={styles.iconBtn}>
              <Ionicons name="refresh" size={17} color="#1c1c1e" />
            </Glass>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Search this area ── */}
      {hasPanned && !towersLoading && (
        <View style={styles.searchWrap} pointerEvents="box-none">
          <TouchableOpacity onPress={handleRefresh} activeOpacity={0.8}>
            <Glass style={styles.searchBtn}>
              <Text style={styles.searchText}>Search this area</Text>
            </Glass>
          </TouchableOpacity>
        </View>
      )}

      {/* ── My location ── */}
      <TouchableOpacity
        style={styles.locationBtnWrap}
        onPress={handleMyLocation}
        activeOpacity={0.75}
      >
        <Glass style={styles.locationBtn}>
          <Ionicons name="locate" size={19} color="#3b82f6" />
        </Glass>
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

// ─── Shared glass shape ────────────────────────────────────────────────────────
const GLASS_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc' },
  centeredText: { fontSize: 15, color: '#64748b' },

  // ── Glass ──
  glass: {
    overflow: 'hidden',
    borderRadius: 18,
    ...GLASS_SHADOW,
  },
  glassAndroid: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...GLASS_SHADOW,
  },

  // ── Top overlay ──
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },

  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },

  // Main bar: count + divider + chips
  statusBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  statusLeft: {
    minWidth: 80,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1c1e',
    letterSpacing: -0.2,
  },
  barDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  chipRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInactive: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  chipTextInactive: {
    color: '#6b7280',
  },

  // Refresh button
  iconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search this area
  searchWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  searchBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  searchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1c1e',
    letterSpacing: -0.1,
  },

  // My location
  locationBtnWrap: {
    position: 'absolute',
    bottom: 108,
    right: 14,
  },
  locationBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
