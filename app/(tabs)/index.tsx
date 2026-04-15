import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
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
  GSM: '2G', UMTS: '3G', LTE: '4G', NR: '5G',
};

function GlassView({ style, children }: { style?: object; children: React.ReactNode }) {
  return (
    <View
      style={[
        styles.glass,
        Platform.OS === 'android' ? styles.glassAndroid : styles.glassIOS,
        style,
      ]}
    >
      {children}
    </View>
  );
}

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

  // Chip state — null means "All"
  const [activeFilters, setActiveFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const [mapFilters, setMapFilters]       = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hasPanned,      setHasPanned]      = useState(false);
  const [selectedTower,  setSelectedTower]  = useState<CellTower | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef              = useRef<any>(null);
  const firstFetchDoneRef   = useRef(false);
  const userHasDraggedRef   = useRef(false);

  if (towers.length > 0) firstFetchDoneRef.current = true;

  const isAllActive = activeFilters.size === ALL_RADIOS.length;

  const applyFilters = useCallback((next: Set<CellTower['radio']>) => {
    setActiveFilters(next);
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => setMapFilters(new Set(next)), 200);
  }, []);

  const handleAllChip = useCallback(() => {
    applyFilters(new Set(ALL_RADIOS));
  }, [applyFilters]);

  const toggleFilter = useCallback((radio: CellTower['radio']) => {
    setActiveFilters((prev) => {
      const allActive = prev.size === ALL_RADIOS.length;
      let next: Set<CellTower['radio']>;

      if (allActive) {
        // "All" → select only this one
        next = new Set([radio]);
      } else if (prev.has(radio) && prev.size === 1) {
        // Last chip tapped again → reset to All
        next = new Set(ALL_RADIOS);
      } else {
        next = new Set(prev);
        if (next.has(radio)) next.delete(radio);
        else next.add(radio);
      }

      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
      filterTimerRef.current = setTimeout(() => setMapFilters(new Set(next)), 200);
      return next;
    });
  }, []);

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
            pinColor={RADIO_COLORS[tower.radio] ?? '#8b5cf6'}
            onPress={() => setSelectedTower(tower)}
            title={RADIO_LABELS[tower.radio]}
            description={`Cell ID: ${tower.cellid}`}
          />
        ))}
      </ClusterMapView>

      {/* ── Top controls ── */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.barRow} pointerEvents="auto">

          {/* Status + chips in one bar */}
          <GlassView style={styles.statusBar}>
            {/* Count */}
            <View style={styles.statusLeft}>
              {towersLoading
                ? <ActivityIndicator size="small" color="#1c1c1e" />
                : <Text style={styles.countText}>
                    {towers.length > 0 ? `${displayCount} towers` : (towersError ?? 'No towers')}
                  </Text>
              }
            </View>

            <View style={styles.barDivider} />

            {/* Chips: All + 2G/3G/4G/5G */}
            <View style={styles.chipRow}>
              {/* All chip */}
              <TouchableOpacity
                onPress={handleAllChip}
                style={[styles.chip, isAllActive ? styles.chipAll : styles.chipInactive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, !isAllActive && styles.chipTextInactive]}>All</Text>
              </TouchableOpacity>

              {ALL_RADIOS.map((radio) => {
                const active = !isAllActive && activeFilters.has(radio);
                return (
                  <TouchableOpacity
                    key={radio}
                    onPress={() => toggleFilter(radio)}
                    style={[styles.chip, active ? { backgroundColor: RADIO_COLORS[radio] } : styles.chipInactive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, !active && styles.chipTextInactive]}>
                      {RADIO_SHORT[radio]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassView>

          {/* Refresh */}
          <TouchableOpacity onPress={handleRefresh} activeOpacity={0.75}>
            <GlassView style={styles.iconBtn}>
              <Ionicons name="refresh" size={17} color="#1c1c1e" />
            </GlassView>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Search this area ── */}
      {hasPanned && !towersLoading && (
        <View style={styles.searchWrap} pointerEvents="box-none">
          <TouchableOpacity onPress={handleRefresh} activeOpacity={0.8}>
            <GlassView style={styles.searchBtn}>
              <Text style={styles.searchText}>Search this area</Text>
            </GlassView>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Sentry debug ── */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.sentryDebugBtn}
          onPress={() => { Sentry.captureException(new Error('Test error from cellr')); }}
          activeOpacity={0.75}
        >
          <GlassView style={styles.iconBtn}>
            <Ionicons name="bug" size={17} color="#ef4444" />
          </GlassView>
        </TouchableOpacity>
      )}

      {/* ── My location ── */}
      <TouchableOpacity style={styles.locationBtnWrap} onPress={handleMyLocation} activeOpacity={0.75}>
        <GlassView style={styles.iconBtn}>
          <Ionicons name="locate" size={19} color="#3b82f6" />
        </GlassView>
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

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 4,
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc' },
  centeredText: { fontSize: 15, color: '#64748b' },

  glass: { borderRadius: 18, overflow: 'hidden', ...SHADOW },
  glassIOS: { backgroundColor: 'rgba(255,255,255,0.82)' },
  glassAndroid: { backgroundColor: 'rgba(255,255,255,0.95)' },

  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },

  statusBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 13,
    gap: 10,
  },
  statusLeft: { minWidth: 76 },
  countText: { fontSize: 13, fontWeight: '700', color: '#1c1c1e', letterSpacing: -0.2 },
  barDivider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: 'rgba(0,0,0,0.2)' },

  chipRow: { flex: 1, flexDirection: 'row', gap: 5 },
  chip: { borderRadius: 8, paddingVertical: 5, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  chipAll: { backgroundColor: '#1c1c1e' },
  chipInactive: { backgroundColor: 'rgba(0,0,0,0.06)' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
  chipTextInactive: { color: '#6b7280' },

  iconBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },

  searchWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', pointerEvents: 'box-none',
  },
  searchBtn: { paddingVertical: 11, paddingHorizontal: 20 },
  searchText: { fontSize: 14, fontWeight: '600', color: '#1c1c1e', letterSpacing: -0.1 },

  locationBtnWrap: { position: 'absolute', bottom: 108, right: 14 },
  sentryDebugBtn: { position: 'absolute', bottom: 160, right: 14 },
});
