import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TowerDetailModal from '@/src/components/TowerDetailModal';
import { useTowersContext } from '@/src/context/TowersContext';
import { getCarrierName } from '@/src/utils/carrierNames';
import {
  CONFIDENCE_COLOR,
  CONFIDENCE_LABEL,
  confidenceLevel,
  formatDistance,
  haversineDistance,
} from '@/src/utils/towerUtils';
import { CellTower, RADIO_COLORS } from '@/src/types';

const ALL_RADIOS: CellTower['radio'][] = ['GSM', 'UMTS', 'LTE', 'NR'];
const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G',
  UMTS: '3G',
  LTE: '4G',
  NR: '5G',
};

interface RowItem {
  tower: CellTower;
  dist: number | null;
}

function TowerRow({
  item,
  onPress,
}: {
  item: RowItem;
  onPress: (tower: CellTower) => void;
}) {
  const { tower, dist } = item;
  const carrier = getCarrierName(tower.mcc, tower.mnc);
  const conf = confidenceLevel(tower.samples);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(tower)} activeOpacity={0.7}>
      <View style={[styles.badge, { backgroundColor: RADIO_COLORS[tower.radio] }]}>
        <Text style={styles.badgeText}>{RADIO_SHORT[tower.radio]}</Text>
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.carrierName} numberOfLines={1}>
          {carrier}
        </Text>
        <Text style={styles.rowSub}>
          Cell {tower.cellid}
          {tower.range > 0 ? `  ·  ~${tower.range} m` : ''}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {dist != null && (
          <Text style={styles.distance}>{formatDistance(dist)}</Text>
        )}
        <View style={[styles.confDot, { backgroundColor: CONFIDENCE_COLOR[conf] }]}>
          <Text style={styles.confDotText}>{CONFIDENCE_LABEL[conf][0]}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const Separator = () => <View style={styles.separator} />;

export default function ListTab() {
  const { towers, isLoading, error, location } = useTowersContext();

  const [activeFilters, setActiveFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapFilters, setMapFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const [selectedTower, setSelectedTower] = useState<CellTower | null>(null);

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

    let sorted: RowItem[];
    if (!location) {
      sorted = filtered.map((tower) => ({ tower, dist: null }));
    } else {
      sorted = filtered
        .map((tower) => ({
          tower,
          dist: haversineDistance(location.latitude, location.longitude, tower.lat, tower.lon),
        }))
        .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    }

    return sorted;
  }, [towers, mapFilters, location]);

  const totalFiltered = towers.filter((t) => activeFilters.has(t.radio)).length;

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
            <Text style={[styles.chipText, !activeFilters.has(radio) && styles.chipTextInactive]}>
              {RADIO_SHORT[radio]}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.countLabel}>
          <Text style={styles.countLabelText}>
            {isLoading ? '…' : `${totalFiltered} towers`}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Confidence: </Text>
        {(['high', 'medium', 'low'] as const).map((level) => (
          <View key={level} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CONFIDENCE_COLOR[level] }]} />
            <Text style={styles.legendLabel}>{CONFIDENCE_LABEL[level]}</Text>
          </View>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : towers.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error ?? 'No towers loaded'}</Text>
          <Text style={styles.emptyHint}>Go to the Map tab and tap "Search this area"</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={rows}
            keyExtractor={(item) =>
              `${item.tower.mcc}-${item.tower.mnc}-${item.tower.lac}-${item.tower.cellid}`
            }
            renderItem={({ item }) => (
              <TowerRow item={item} onPress={(t) => setSelectedTower(t)} />
            )}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={styles.listContent}
          />

        </>
      )}

      <TowerDetailModal
        tower={selectedTower}
        userLat={location?.latitude ?? null}
        userLon={location?.longitude ?? null}
        onClose={() => setSelectedTower(null)}
      />

      {__DEV__ && (
        <TouchableOpacity
          style={styles.debugBtn}
          onPress={() =>
            Alert.alert('Reset Onboarding', 'This will show onboarding on next launch.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset & Show Now',
                style: 'destructive',
                onPress: async () => {
                  await SecureStore.deleteItemAsync('hasSeenOnboarding');
                  router.replace('/onboarding' as never);
                },
              },
            ])
          }
        >
          <Text style={styles.debugBtnText}>⚙ Reset Onboarding</Text>
        </TouchableOpacity>
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
  countLabel: { marginLeft: 'auto' },
  countLabelText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  legendText: { fontSize: 12, color: '#94a3b8' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: '#64748b' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 8 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  listContent: { paddingBottom: 80 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  carrierName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  rowSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  distance: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  confDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confDotText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 60 },

  debugBtn: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  debugBtnText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
});
