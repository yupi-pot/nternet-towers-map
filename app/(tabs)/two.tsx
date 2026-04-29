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
const RADIO_LABEL: Record<CellTower['radio'], string> = {
  GSM: '2G', UMTS: '3G', LTE: '4G LTE', NR: '5G NR',
};

// ─── Glass header (matches map tab) ──────────────────────────────────────────
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

// ─── Signal bars ──────────────────────────────────────────────────────────────
function SignalBars({ conf, color }: { conf: 'high' | 'medium' | 'low'; color: string }) {
  const activeBars = conf === 'high' ? 4 : conf === 'medium' ? 3 : 2;
  const heights = [0.4, 0.6, 0.8, 1.0];
  return (
    <View style={styles.signalBarsRow}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.signalBar,
            { height: 16 * h, backgroundColor: i < activeBars ? color : '#e5e5ea' },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Nearest tower hero card ──────────────────────────────────────────────────
interface RowItem { tower: CellTower; dist: number | null }

function NearestTowerCard({ item, onPress }: { item: RowItem; onPress: (t: CellTower) => void }) {
  const { tower, dist } = item;
  const color = RADIO_COLORS[tower.radio];
  const carrier = getCarrierName(tower.mcc, tower.mnc);
  const conf = confidenceLevel(tower.samples);

  return (
    <TouchableOpacity
      style={styles.heroCard}
      onPress={() => onPress(tower)}
      activeOpacity={0.75}
    >
      {/* Colored left accent border */}
      <View style={[styles.heroAccent, { backgroundColor: color }]} />

      <View style={styles.heroContent}>
        {/* Top: badge + distance */}
        <View style={styles.heroTop}>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{RADIO_SHORT[tower.radio]}</Text>
          </View>
          <Text style={[styles.heroDistance, { color }]}>
            {dist != null ? formatDistance(dist) : '–'}
          </Text>
        </View>

        {/* Carrier + cell info */}
        <Text style={styles.heroCarrier} numberOfLines={1}>{carrier}</Text>
        <Text style={styles.heroSub}>
          MCC {tower.mcc} · MNC {tower.mnc} · Cell {tower.cellid}
        </Text>

        {/* Bottom: confidence + signal bars */}
        <View style={styles.heroBottom}>
          <View style={[styles.confPill, { backgroundColor: CONFIDENCE_COLOR[conf] + '22' }]}>
            <View style={[styles.confDot, { backgroundColor: CONFIDENCE_COLOR[conf] }]} />
            <Text style={[styles.confLabel, { color: CONFIDENCE_COLOR[conf] }]}>
              {CONFIDENCE_LABEL[conf]}
            </Text>
          </View>
          <SignalBars conf={conf} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Regular tower row ────────────────────────────────────────────────────────
function TowerRow({ item, onPress }: { item: RowItem; onPress: (t: CellTower) => void }) {
  const { tower, dist } = item;
  const color = RADIO_COLORS[tower.radio];
  const carrier = getCarrierName(tower.mcc, tower.mnc);
  const conf = confidenceLevel(tower.samples);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(tower)} activeOpacity={0.65}>
      {/* Colored left accent */}
      <View style={[styles.rowAccent, { backgroundColor: color }]} />

      {/* Network badge */}
      <View style={[styles.badge, { backgroundColor: color }]}>
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

  const radioCounts = useMemo(() => {
    const c: Record<CellTower['radio'], number> = { GSM: 0, UMTS: 0, LTE: 0, NR: 0 };
    towers.forEach((t) => c[t.radio]++);
    return c;
  }, [towers]);
  const nearest = rows[0] ?? null;
  const listRows = rows.slice(1);

  const listHeader = nearest ? (
    <View>
      <Text style={styles.sectionLabel}>Nearest Tower</Text>
      <NearestTowerCard item={nearest} onPress={(t) => setSelectedTower(t)} />
      {listRows.length > 0 && (
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          Nearby  ·  {listRows.length}
        </Text>
      )}
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      {/* ── iOS 26-style navigation header ── */}
      <GlassHeader paddingTop={insets.top}>
        <View style={styles.titleRow}>
          <Text style={styles.largeTitle}>Towers</Text>
          <Text style={styles.countBadge}>
            {isLoading ? '…' : totalFiltered}
          </Text>
        </View>

        <View style={styles.filterRow}>
          {ALL_RADIOS.map((radio) => {
            const active = activeFilters.has(radio);
            const color = RADIO_COLORS[radio];
            return (
              <TouchableOpacity
                key={radio}
                onPress={() => toggleFilter(radio)}
                style={[
                  styles.pill,
                  active
                    ? { backgroundColor: color + '18', borderWidth: 1, borderColor: color + 'AA' }
                    : styles.pillInactive,
                ]}
                activeOpacity={0.75}
              >
                <View style={[styles.pillDot, { backgroundColor: active ? color : '#9ca3af' }]} />
                <Text style={[styles.pillText, { color: active ? color : '#6b7280' }]}>
                  {RADIO_LABEL[radio]}
                </Text>
                <Text style={[styles.pillCount, { color: active ? color + '99' : '#9ca3af' }]}>
                  {radioCounts[radio]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </GlassHeader>

      {/* ── Content ── */}
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
          data={listRows}
          keyExtractor={(item) =>
            `${item.tower.mcc}-${item.tower.mnc}-${item.tower.lac}-${item.tower.cellid}`
          }
          renderItem={({ item }) => <TowerRow item={item} onPress={(t) => setSelectedTower(t)} />}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
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
          style={[styles.debugBtn, { bottom: insets.bottom + 90 }]}
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
  listContent: { paddingTop: 8 },

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
    color: '#9ca3af',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    paddingVertical: 7,
    paddingHorizontal: 13,
    gap: 6,
  },
  pillInactive: { backgroundColor: 'rgba(0,0,0,0.05)' },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.1 },
  pillCount: { fontSize: 11, fontWeight: '500' },

  // ── Section labels ──
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
  },

  // ── Hero card ──
  heroCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  heroAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  heroContent: {
    flex: 1,
    padding: 18,
    gap: 6,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroDistance: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroCarrier: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1c1c1e',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 12,
    color: '#8e8e93',
    fontVariant: ['tabular-nums'],
    marginBottom: 6,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  // ── Signal bars ──
  signalBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 16,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },

  // ── Regular row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingRight: 16,
    gap: 12,
    overflow: 'hidden',
  },
  rowAccent: {
    width: 3,
    alignSelf: 'stretch',
  },
  rowBody: { flex: 1 },
  carrierName: { fontSize: 15, fontWeight: '600', color: '#1c1c1e' },
  rowSub: { fontSize: 12, color: '#8e8e93', marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 5 },
  distance: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },

  // ── Shared badge / confidence ──
  badge: {
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 34,
    alignItems: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
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

  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e5ea', marginLeft: 19 },

  // ── Empty state ──
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#3c3c43', textAlign: 'center' },
  emptyHint: { fontSize: 14, color: '#aeaeb2', textAlign: 'center', lineHeight: 20 },

  // ── Debug ──
  debugBtn: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  debugBtnText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
});
