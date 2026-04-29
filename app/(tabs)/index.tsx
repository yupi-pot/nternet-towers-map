import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import Supercluster from 'supercluster';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapErrorBoundary } from '@/src/components/MapErrorBoundary';
import TowerDetailModal from '@/src/components/TowerDetailModal';
import { useTowersContext } from '@/src/context/TowersContext';
import { CellTower, RADIO_COLORS, RADIO_LABELS } from '@/src/types';

const ALL_RADIOS: CellTower['radio'][] = ['GSM', 'UMTS', 'LTE', 'NR'];
const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G', UMTS: '3G', LTE: '4G', NR: '5G',
};

const supercluster = new Supercluster({ radius: 40, maxZoom: 16 });

const MIN_ZOOM = 9;     // below this zoom level: skip markers, show overlay
const MAX_MARKERS = 500; // above this cluster count: warn user to zoom in

function regionToZoom(region: Region): number {
  return Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
}

function regionToBBox(region: Region): [number, number, number, number] {
  return [
    region.longitude - region.longitudeDelta / 2,
    region.latitude - region.latitudeDelta / 2,
    region.longitude + region.longitudeDelta / 2,
    region.latitude + region.latitudeDelta / 2,
  ];
}

// Deterministic jitter to break collinear tower coordinates from rounded DB data.
// Uses a simple hash of cellid so the same tower always gets the same offset.
// ±0.0003° ≈ ±30 m — imperceptible at city scale, eliminates straight-line clusters.
function jitter(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 0.0006;
}

const ClusterMarker = React.memo(function ClusterMarker({
  lat, lon, clusterId, pointCount, onPress,
}: {
  lat: number; lon: number; clusterId: number; pointCount: number;
  onPress: () => void;
}) {
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lon }}
      tracksViewChanges={false}
      onPress={onPress}
    >
      <View collapsable={false} style={styles.cluster}>
        <Text style={styles.clusterText}>{pointCount}</Text>
      </View>
    </Marker>
  );
});

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
    dataSource,
    setDataSource,
  } = useTowersContext();

  const [activeFilters, setActiveFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const [mapFilters, setMapFilters]       = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [hasPanned,     setHasPanned]     = useState(false);
  const [selectedTower, setSelectedTower] = useState<CellTower | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef            = useRef<any>(null);
  const firstFetchDoneRef = useRef(false);
  const userHasDraggedRef = useRef(false);

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
        next = new Set([radio]);
      } else if (prev.has(radio) && prev.size === 1) {
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
      setCurrentRegion(region);
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

  // Build supercluster index whenever filtered towers change
  const filteredTowers = useMemo(
    () => towers.filter((t) => mapFilters.has(t.radio)),
    [towers, mapFilters],
  );

  const clusterPoints = useMemo<Supercluster.PointFeature<{ tower: CellTower }>[]>(
    () => filteredTowers.map((tower) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          tower.lon + jitter(tower.cellid),
          tower.lat + jitter(tower.cellid + 99991),
        ],
      },
      properties: { tower },
    })),
    [filteredTowers],
  );

  useMemo(() => {
    supercluster.load(clusterPoints);
  }, [clusterPoints]);

  const clusters = useMemo(() => {
    const region = currentRegion ?? mapRegionRef.current;
    if (!region) return [];
    return supercluster.getClusters(regionToBBox(region), regionToZoom(region));
  }, [clusterPoints, currentRegion, mapRegionRef]);

  const displayCount = towers.filter((t) => activeFilters.has(t.radio)).length;

  const zoom = currentRegion ? regionToZoom(currentRegion) : MIN_ZOOM;
  const tooZoomedOut = zoom < MIN_ZOOM;
  const tooManyMarkers = !tooZoomedOut && clusters.length > MAX_MARKERS;

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

  if (!location) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.centeredText}>Waiting for location…</Text>
      </View>
    );
  }

  return (
    <MapErrorBoundary onReset={() => setCurrentRegion(null)}>
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPanDrag={handlePanDrag}
        showsUserLocation
      >
        {!tooZoomedOut && !tooManyMarkers && clusters.map((item) => {
          const [lon, lat] = item.geometry.coordinates;
          if (!isFinite(lat) || !isFinite(lon)) return null;

          const isCluster = item.properties.cluster;

          if (isCluster) {
            const { cluster_id, point_count } = item.properties as Supercluster.ClusterProperties;
            if (!isFinite(cluster_id) || !isFinite(point_count)) return null;
            return (
              <ClusterMarker
                key={`cluster-${cluster_id}`}
                lat={lat}
                lon={lon}
                clusterId={cluster_id}
                pointCount={point_count}
                onPress={() => {
                  const expansionZoom = supercluster.getClusterExpansionZoom(cluster_id);
                  const delta = 360 / Math.pow(2, expansionZoom);
                  mapRef.current?.animateToRegion(
                    { latitude: lat, longitude: lon, latitudeDelta: delta, longitudeDelta: delta },
                    300,
                  );
                }}
              />
            );
          }

          const { tower } = item.properties as { tower: CellTower };
          if (!tower) return null;
          return (
            <Marker
              key={`${tower.mcc}-${tower.mnc}-${tower.lac}-${tower.cellid}`}
              coordinate={{ latitude: lat, longitude: lon }}
              pinColor={RADIO_COLORS[tower.radio] ?? '#8b5cf6'}
              tracksViewChanges={false}
              onPress={() => setSelectedTower(tower)}
              title={RADIO_LABELS[tower.radio] ?? tower.radio}
              description={`Cell ID: ${tower.cellid}`}
            />
          );
        })}
      </MapView>

      {/* ── Zoom / density overlay ── */}
      {(tooZoomedOut || tooManyMarkers) && (
        <View style={styles.zoomWarning} pointerEvents="none">
          <GlassView>
            <Text style={styles.zoomWarningText}>
              {tooZoomedOut ? 'Zoom in to see towers' : 'Too many towers — zoom in for detail'}
            </Text>
          </GlassView>
        </View>
      )}

      {/* ── Top controls ── */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.barRow} pointerEvents="auto">
          <GlassView style={styles.statusBar}>
            <View style={styles.statusLeft}>
              {towersLoading
                ? <ActivityIndicator size="small" color="#1c1c1e" />
                : <Text style={styles.countText}>
                    {towers.length > 0 ? `${displayCount} towers` : (towersError ?? 'No towers')}
                  </Text>
              }
            </View>

            <View style={styles.barDivider} />

            <View style={styles.chipRow}>
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

      {/* ── Data source switcher (debug) ── */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.dataSourceBtn}
          onPress={() => setDataSource(dataSource === 'opencellid' ? 'supabase' : 'opencellid')}
          activeOpacity={0.75}
        >
          <GlassView style={[styles.dataSourcePill, dataSource === 'supabase' && styles.dataSourcePillActive]}>
            <Text style={[styles.dataSourceText, dataSource === 'supabase' && styles.dataSourceTextActive]}>
              {dataSource === 'supabase' ? 'SB' : 'OC'}
            </Text>
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
        userLat={location.latitude}
        userLon={location.longitude}
        onClose={() => setSelectedTower(null)}
      />
    </View>
    </MapErrorBoundary>
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

  cluster: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1c1c1e',
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW,
  },
  clusterText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  searchWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', pointerEvents: 'box-none',
  },
  searchBtn: { paddingVertical: 11, paddingHorizontal: 20 },
  searchText: { fontSize: 14, fontWeight: '600', color: '#1c1c1e', letterSpacing: -0.1 },

  zoomWarning: {
    position: 'absolute', bottom: 160, left: 0, right: 0,
    alignItems: 'center',
  },
  zoomWarningText: { fontSize: 13, fontWeight: '600', color: '#1c1c1e', paddingVertical: 9, paddingHorizontal: 18 },

  locationBtnWrap: { position: 'absolute', bottom: 108, right: 14 },
  sentryDebugBtn: { position: 'absolute', bottom: 160, right: 14 },
  dataSourceBtn: { position: 'absolute', bottom: 212, right: 14 },
  dataSourcePill: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  dataSourcePillActive: { backgroundColor: 'rgba(34,197,94,0.15)' },
  dataSourceText: { fontSize: 11, fontWeight: '800', color: '#6b7280', letterSpacing: 0.3 },
  dataSourceTextActive: { color: '#16a34a' },
});
