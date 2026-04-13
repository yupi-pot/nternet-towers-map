import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClusterMapView from 'react-native-map-clustering';
import { Marker, Region } from 'react-native-maps';
import * as Clipboard from 'expo-clipboard';

import { useLocation } from '@/src/hooks/useLocation';
import { useTowers } from '@/src/hooks/useTowers';
import { ViewportBBox } from '@/src/api/opencellid';
import { CellTower, RADIO_LABELS, RADIO_COLORS } from '@/src/types';

function regionToBBox(region: Region): ViewportBBox {
  return {
    minLat: region.latitude - region.latitudeDelta / 2,
    maxLat: region.latitude + region.latitudeDelta / 2,
    minLon: region.longitude - region.longitudeDelta / 2,
    maxLon: region.longitude + region.longitudeDelta / 2,
  };
}

function TowerInfoModal({
  tower,
  onClose,
}: {
  tower: CellTower | null;
  onClose: () => void;
}) {
  if (!tower) return null;

  const handleCopyCoords = () =>
    Clipboard.setStringAsync(`${tower.lat.toFixed(6)}, ${tower.lon.toFixed(6)}`);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.cardHeader}>
            <View
              style={[styles.networkBadge, { backgroundColor: RADIO_COLORS[tower.radio] }]}
            >
              <Text style={styles.networkBadgeText}>{RADIO_LABELS[tower.radio]}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <InfoRow label="Cell ID" value={String(tower.cellid)} />
          <InfoRow label="MCC / MNC" value={`${tower.mcc} / ${tower.mnc}`} />
          <InfoRow label="LAC" value={String(tower.lac)} />
          <TouchableOpacity onPress={handleCopyCoords}>
            <InfoRow
              label="Coordinates"
              value={`${tower.lat.toFixed(5)}, ${tower.lon.toFixed(5)}`}
              action="Copy"
            />
          </TouchableOpacity>
          <InfoRow label="Coverage radius" value={`~${tower.range} m`} />
          <InfoRow label="Measurements" value={String(tower.samples)} />
          {tower.averageSignalStrength !== 0 && (
            <InfoRow label="Avg signal" value={`${tower.averageSignalStrength} dBm`} />
          )}

          <Text style={styles.hint}>
            MCC = country code · MNC = operator code · tap coords to copy
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InfoRow({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoRight}>
        <Text style={styles.infoValue}>{value}</Text>
        {action && <Text style={styles.infoAction}>{action}</Text>}
      </View>
    </View>
  );
}

const ALL_RADIOS: CellTower['radio'][] = ['GSM', 'UMTS', 'LTE', 'NR'];
const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G',
  UMTS: '3G',
  LTE: '4G',
  NR: '5G',
};

export default function MapTab() {
  const { location, errorMsg, isLoading: locationLoading } = useLocation();

  const [fetchBBox, setFetchBBox] = useState<ViewportBBox | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const mapRegionRef = useRef<Region | null>(null);
  const initializedRef = useRef(false);
  const firstFetchDoneRef = useRef(false);
  const userHasDraggedRef = useRef(false);

  const [activeFilters, setActiveFilters] = useState<Set<CellTower['radio']>>(
    new Set(ALL_RADIOS),
  );
  const [hasPanned, setHasPanned] = useState(false);

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

  const { towers, isLoading: towersLoading, error: towersError } = useTowers(
    fetchBBox,
    fetchKey,
  );

  useEffect(() => {
    if (towers.length > 0) firstFetchDoneRef.current = true;
  }, [towers]);

  const [selectedTower, setSelectedTower] = useState<CellTower | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  const handleRefresh = useCallback(() => {
    const region = mapRegionRef.current;
    if (!region) return;
    setFetchBBox(regionToBBox(region));
    setFetchKey((k) => k + 1);
    setHasPanned(false);
    userHasDraggedRef.current = false;
  }, []);

  const handlePanDrag = useCallback(() => {
    userHasDraggedRef.current = true;
  }, []);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    mapRegionRef.current = region;
    if (userHasDraggedRef.current && firstFetchDoneRef.current) {
      setHasPanned(true);
    }
  }, []);

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
      return next;
    });
  }, []);

  const filteredTowers = towers.filter((t) => activeFilters.has(t.radio));

  const countByRadio = towers.reduce<Partial<Record<CellTower['radio'], number>>>(
    (acc, t) => {
      acc[t.radio] = (acc[t.radio] ?? 0) + 1;
      return acc;
    },
    {},
  );

  if (locationLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Getting location...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMsg}</Text>
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

      {/* Status chip + filter chips */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.statusRow} pointerEvents="auto">
          <View style={styles.statusChip}>
            {towersLoading ? (
              <ActivityIndicator size="small" color="#1e293b" />
            ) : (
              <Text style={styles.statusText}>
                {towers.length > 0
                  ? `${filteredTowers.length} of ${towers.length} towers`
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
            pointerEvents="auto"
          >
            <Text style={styles.searchAreaText}>Search this area</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* My location */}
      <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation}>
        <Text style={styles.myLocationIcon}>⊙</Text>
      </TouchableOpacity>

      {/* Legend */}
      <View style={styles.legend} pointerEvents="none">
        {(Object.entries(RADIO_LABELS) as [keyof typeof RADIO_LABELS, string][]).map(
          ([radio, label]) => (
            <View key={radio} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: RADIO_COLORS[radio] }]} />
              <Text style={styles.legendText}>
                {label}
                {countByRadio[radio] != null ? ` — ${countByRadio[radio]}` : ''}
              </Text>
            </View>
          ),
        )}
      </View>

      <TowerInfoModal tower={selectedTower} onClose={() => setSelectedTower(null)} />
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

  legend: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#1e293b' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  networkBadgeText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  closeBtn: { fontSize: 18, color: '#94a3b8', padding: 4 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 14, color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  infoAction: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  hint: { marginTop: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center' },
});
