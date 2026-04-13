import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTowersContext } from '@/src/context/TowersContext';
import { CellTower, RADIO_COLORS } from '@/src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_RADIOS: CellTower['radio'][] = ['GSM', 'UMTS', 'LTE', 'NR'];
const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G',
  UMTS: '3G',
  LTE: '4G',
  NR: '5G',
};

// ─── Row ─────────────────────────────────────────────────────────────────────

interface RowItem {
  tower: CellTower;
  dist: number | null;
}

function TowerRow({ item }: { item: RowItem }) {
  const { tower, dist } = item;
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: RADIO_COLORS[tower.radio] }]}>
        <Text style={styles.badgeText}>{RADIO_SHORT[tower.radio]}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.cellId}>Cell {tower.cellid}</Text>
        <Text style={styles.rowSub}>
          MCC {tower.mcc} · MNC {tower.mnc}
          {tower.range > 0 ? `  ·  r ~${tower.range} m` : ''}
        </Text>
      </View>
      {dist != null && <Text style={styles.distance}>{formatDist(dist)}</Text>}
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ListTab() {
  const { towers, isLoading, error, location } = useTowersContext();

  const [activeFilters, setActiveFilters] = useState<Set<CellTower['radio']>>(
    new Set(ALL_RADIOS),
  );
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapFilters, setMapFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));

  const toggleFilter = (radio: CellTower['radio']) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(radio)) {
        if (next.size > 1) next.delete(radio);
      } else {
        next.add(radio);
      }
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
      filterTimerRef.current = setTimeout(() => setMapFilters(new Set(next)), 150);
      return next;
    });
  };

  const rows = useMemo<RowItem[]>(() => {
    const filtered = towers.filter((t) => mapFilters.has(t.radio));
    if (!location) return filtered.map((tower) => ({ tower, dist: null }));
    return filtered
      .map((tower) => ({
        tower,
        dist: haversineDistance(location.latitude, location.longitude, tower.lat, tower.lon),
      }))
      .sort((a, b) => a.dist! - b.dist!);
  }, [towers, mapFilters, location]);

  const displayCount = towers.filter((t) => activeFilters.has(t.radio)).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        {ALL_RADIOS.map((radio) => (
          <TouchableOpacity
            key={radio}
            style={[
              styles.chip,
              activeFilters.has(radio)
                ? { backgroundColor: RADIO_COLORS[radio], borderColor: RADIO_COLORS[radio] }
                : styles.chipInactive,
            ]}
            onPress={() => toggleFilter(radio)}
          >
            <Text
              style={[styles.chipText, !activeFilters.has(radio) && styles.chipTextInactive]}
            >
              {RADIO_SHORT[radio]}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countLabel}>
          {isLoading ? '…' : `${displayCount} towers`}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : towers.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error ?? 'No towers loaded'}</Text>
          <Text style={styles.emptyHint}>
            Go to the Map tab and tap "Search this area"
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) =>
            `${item.tower.mcc}-${item.tower.mnc}-${item.tower.lac}-${item.tower.cellid}`
          }
          renderItem={({ item }) => <TowerRow item={item} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chip: {
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1.5,
  },
  chipInactive: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  chipTextInactive: { color: '#64748b' },
  countLabel: { marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: '500' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 8 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  listContent: { paddingBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  badge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  rowBody: { flex: 1 },
  cellId: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  rowSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  distance: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 60 },
});
