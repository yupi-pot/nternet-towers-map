import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  GSM: '2G', UMTS: '3G', LTE: '4G', NR: '5G',
};

// ─── Glass helper (matches map tab) ──────────────────────────────────────────
function GlassHeader({ children, paddingTop }: { children: React.ReactNode; paddingTop: number }) {
  const inner = (
    <View style={[styles.headerInner, { paddingTop: paddingTop + 10 }]}>
      {children}
    </View>
  );
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={85} tint="systemUltraThinMaterialLight" style={styles.headerBlur}>
        {inner}
      </BlurView>
    );
  }
  return <View style={[styles.headerBlur, styles.headerAndroid]}>{inner}</View>;
}

// ─── Tower row ────────────────────────────────────────────────────────────────
interface RowItem { tower: CellTower; dist: number | null }

function TowerRow({ item, onPress }: { item: RowItem; onPress: (t: CellTower) => void }) {
  const { tower, dist } = item;
  const carrier = getCarrierName(tower.mcc, tower.mnc);
  const conf = confidenceLevel(tower.samples);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(tower)} activeOpacity={0.65}>
      {/* Network badge */}
      <View style={[styles.badge, { backgroundColor: RADIO_COLORS[tower.radio] }]}>
        <Text style={styles.badgeText}>{RADIO_SHORT[tower.radio]}</Text>
      </View>

      {/* Info */}
      <View style={styles.rowBody}>
        <Text style={styles.carrierName} numberOfLines={1}>{carrier}</Text>
        <Text style={styles.rowSub}>
          Cell {tower.cellid}{tower.range > 0 ? `  ·  ~${tower.range} m` : ''}
        </Text>
      </View>

      {/* Distance + confidence */}
      <View style={styles.rowRight}>
        {dist != null && <Text style={styles.distance}>{formatDistance(dist)}</Text>}
        <View style={[styles.confPill, { backgroundColor: CONFIDENCE_COLOR[conf] + '22' }]}>
          <View style={[styles.confDot, { backgroundColor: CONFIDENCE_COLOR[conf] }]} />
          <Text style={[styles.confLabel, { color: CONFIDENCE_COLOR[conf] }]}>
            {CONFIDENCE_LABEL[conf]}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const Separator = () => <View style={styles.separator} />;

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ListTab() {
  const { towers, isLoading, error, location } = useTowersContext();
  const insets = useSafeAreaInsets();

  const [activeFilters, setActiveFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapFilters, setMapFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const [selectedTower, setSelectedTower] = useState<CellTower | null>(null);

  const toggleFilter = (radio: CellTower['radio']) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(radio)) { if (next.size > 1) next.delete(radio); }
      else next.add(radio);
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
      .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
  }, [towers, mapFilters, location]);

  const totalFiltered = towers.filter((t) => activeFilters.has(t.radio)).length;

  return (
    <View style={styles.container}>
      {/* ── iOS 26-style navigation header ── */}
      <GlassHeader paddingTop={insets.top}>
        {/* Large title row */}
        <View style={styles.titleRow}>
          <Text style={styles.largeTitle}>Towers</Text>
          <Text style={styles.countBadge}>
            {isLoading ? '…' : totalFiltered}
          </Text>
        </View>

        {/* Filter chips row */}
        <View style={styles.filterRow}>
          {ALL_RADIOS.map((radio) => {
            const active = activeFilters.has(radio);
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

          {/* Confidence legend inline */}
          <View style={styles.legendInline}>
            {(['high', 'medium', 'low'] as const).map((level) => (
              <View key={level} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: CONFIDENCE_COLOR[level] }]} />
              </View>
            ))}
            <Text style={styles.legendHint}>confidence</Text>
          </View>
        </View>
      </GlassHeader>

      {/* ── List ── */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1c1c1e" />
        </View>
      ) : towers.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cellular-outline" size={40} color="#d1d5db" />
          <Text style={styles.emptyTitle}>{error ?? 'No towers loaded'}</Text>
          <Text style={styles.emptyHint}>Open the Map tab and tap "Search this area"</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) =>
            `${item.tower.mcc}-${item.tower.mnc}-${item.tower.lac}-${item.tower.cellid}`
          }
          renderItem={({ item }) => <TowerRow item={item} onPress={(t) => setSelectedTower(t)} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        />
      )}

      <TowerDetailModal
        tower={selectedTower}
        userLat={location?.latitude ?? null}
        userLon={location?.longitude ?? null}
        onClose={() => setSelectedTower(null)}
      />

      {__DEV__ && (
        <TouchableOpacity
          style={[styles.debugBtn, { bottom: insets.bottom + 8 }]}
          onPress={() =>
            Alert.alert('Reset Onboarding', 'Show onboarding flow again?', [
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },

  // ── Header ──
  headerBlur: {
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.12)',
  },
  headerAndroid: { backgroundColor: 'rgba(242,242,247,0.97)' },
  headerInner: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1c1c1e',
    letterSpacing: -0.5,
  },
  countBadge: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8e8e93',
    marginTop: 4,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'nowrap',
  },
  chip: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInactive: { backgroundColor: 'rgba(0,0,0,0.07)' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  chipTextInactive: { color: '#6b7280' },

  legendInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  legendItem: { alignItems: 'center', justifyContent: 'center' },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendHint: { fontSize: 11, color: '#aeaeb2', marginLeft: 4, fontWeight: '500' },

  // ── Empty state ──
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#3c3c43', textAlign: 'center' },
  emptyHint: { fontSize: 14, color: '#aeaeb2', textAlign: 'center', lineHeight: 20 },

  // ── Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  badge: {
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 34,
    alignItems: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  rowBody: { flex: 1 },
  carrierName: { fontSize: 15, fontWeight: '600', color: '#1c1c1e' },
  rowSub: { fontSize: 12, color: '#8e8e93', marginTop: 2 },

  rowRight: { alignItems: 'flex-end', gap: 5 },
  distance: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  confPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  confDot: { width: 6, height: 6, borderRadius: 3 },
  confLabel: { fontSize: 11, fontWeight: '600' },

  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e5ea', marginLeft: 70 },

  // ── Debug ──
  debugBtn: {
    position: 'absolute',
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
