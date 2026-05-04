import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import TowerDetailModal from '@/src/components/TowerDetailModal';
import { presentPaywall } from '@/src/components/PaywallModal';
import { usePremium } from '@/src/context/PremiumContext';
import { useTowersContext } from '@/src/context/TowersContext';
import { isPremiumOnlyTower } from '@/src/utils/premiumTowers';
import { scheduleReviewAfterFiltersUsed } from '@/src/utils/rateApp';
import { getCarrierName } from '@/src/utils/carrierNames';
import {
  bearingTo,
  CONFIDENCE_COLOR,
  confidenceLabel,
  confidenceLevel,
  formatBearing,
  formatDistance,
  haversineDistance,
} from '@/src/utils/towerUtils';
import { CellTower, RADIO_COLORS } from '@/src/types';

const ALL_RADIOS: CellTower['radio'][] = ['GSM', 'UMTS', 'LTE', 'NR'];
const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G', UMTS: '3G', LTE: '4G', NR: '5G',
};
const RADIO_LABEL: Record<CellTower['radio'], string> = {
  GSM: '2G', UMTS: '3G', LTE: '4G LTE', NR: '5G',
};

// ─── White header ─────────────────────────────────────────────────────────────
function WhiteHeader({ children, paddingTop }: { children: React.ReactNode; paddingTop: number }) {
  return (
    <View style={[styles.headerWrap, { paddingTop: paddingTop + 10 }]}>
      {children}
    </View>
  );
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
interface RowItem { tower: CellTower; dist: number | null; bearing: number | null }

function NearestTowerCard({ item, onPress }: { item: RowItem; onPress: (t: CellTower) => void }) {
  const { t } = useTranslation();
  const { tower, dist, bearing } = item;
  const color = RADIO_COLORS[tower.radio];
  const carrier = getCarrierName(tower.mcc, tower.mnc);
  const conf = confidenceLevel(tower.samples);
  const enodebId = tower.radio === 'LTE' ? tower.cellid >> 8 : null;

  return (
    <TouchableOpacity
      style={styles.heroCard}
      onPress={() => onPress(tower)}
      activeOpacity={0.75}
    >
      {/* Colored left accent border */}
      <View style={[styles.heroAccent, { backgroundColor: color }]} />

      <View style={styles.heroContent}>
        {/* Top: badge + distance + bearing */}
        <View style={styles.heroTop}>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{RADIO_SHORT[tower.radio]}</Text>
          </View>
          <View style={styles.heroDistRow}>
            {dist != null && (
              <Text style={[styles.heroDistance, { color }]}>{formatDistance(dist)}</Text>
            )}
            {bearing != null && (
              <Text style={styles.heroBearing}>{formatBearing(bearing)}</Text>
            )}
          </View>
        </View>

        {/* Carrier */}
        <Text style={styles.heroCarrier} numberOfLines={1}>{carrier}</Text>

        {/* Detail grid */}
        <View style={styles.heroGrid}>
          <HeroCell label={t('tower.cellId')} value={String(tower.cellid)} />
          {enodebId != null && <HeroCell label={t('tower.eNodeB')} value={String(enodebId)} />}
          <HeroCell label={t('tower.mccMnc')} value={`${tower.mcc} / ${tower.mnc}`} />
          <HeroCell label={t('tower.lac')} value={String(tower.lac)} />
          <HeroCell label={t('tower.coverageRadius')} value={`~${tower.range.toLocaleString()} ${t('units.m')}`} />
          <HeroCell label={t('tower.measurements')} value={tower.samples.toLocaleString()} />
          {tower.averageSignalStrength !== 0 && (
            <HeroCell label={t('tower.avgSignal')} value={`${tower.averageSignalStrength} dBm`} />
          )}
        </View>

        {/* Bottom: confidence + signal bars */}
        <View style={styles.heroBottom}>
          <View style={[styles.confPill, { backgroundColor: CONFIDENCE_COLOR[conf] + '18' }]}>
            <View style={[styles.confDot, { backgroundColor: CONFIDENCE_COLOR[conf] }]} />
            <Text style={[styles.confLabel, { color: CONFIDENCE_COLOR[conf] }]}>
              {t('tower.confidenceFull', { level: confidenceLabel(conf) })}
            </Text>
          </View>
          <SignalBars conf={conf} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function HeroCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroCellItem}>
      <Text style={styles.heroCellLabel}>{label}</Text>
      <Text style={styles.heroCellValue}>{value}</Text>
    </View>
  );
}

// ─── Regular tower row ────────────────────────────────────────────────────────
function TowerRow({ item, onPress }: { item: RowItem; onPress: (t: CellTower) => void }) {
  const { t } = useTranslation();
  const { tower, dist } = item;
  const color = RADIO_COLORS[tower.radio];
  const carrier = getCarrierName(tower.mcc, tower.mnc);

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
          {t('list.cellPrefix')} {tower.cellid}{tower.range > 0 ? `  ·  ~${tower.range} ${t('units.m')}` : ''}
        </Text>
      </View>

      {/* Distance */}
      {dist != null && (
        <View style={styles.rowRight}>
          <Text style={styles.distance}>{formatDistance(dist)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const Separator = () => <View style={styles.separator} />;

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ListTab() {
  const { t } = useTranslation();
  const { towers: allTowers, isLoading, error, location } = useTowersContext();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const towers = useMemo(
    () => (isPremium ? allTowers : allTowers.filter((t) => !isPremiumOnlyTower(t))),
    [allTowers, isPremium],
  );

  const [activeFilters, setActiveFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapFilters, setMapFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const [selectedTower, setSelectedTower] = useState<CellTower | null>(null);

  const toggleFilter = (radio: CellTower['radio']) => {
    if (!isPremium) {
      void presentPaywall();
      return;
    }
    void scheduleReviewAfterFiltersUsed();
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
    if (!location) return filtered.map((tower) => ({ tower, dist: null, bearing: null }));
    return filtered
      .map((tower) => ({
        tower,
        dist: haversineDistance(location.latitude, location.longitude, tower.lat, tower.lon),
        bearing: bearingTo(location.latitude, location.longitude, tower.lat, tower.lon),
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
      <Text style={styles.sectionLabel}>{t('list.nearestTower')}</Text>
      <NearestTowerCard item={nearest} onPress={(tower) => setSelectedTower(tower)} />
      {listRows.length > 0 && (
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          {t('list.nearby', { count: listRows.length })}
        </Text>
      )}
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      {/* ── White header ── */}
      <WhiteHeader paddingTop={insets.top}>
        <View style={styles.titleRow}>
          <Text style={styles.largeTitle}>{t('list.title')} </Text>
          <Text style={styles.largeCount}>
            {isLoading ? '…' : totalFiltered}
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => router.push('/settings' as never)}
            hitSlop={10}
            activeOpacity={0.6}
          >
            {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
              <GlassView
                glassEffectStyle="regular"
                isInteractive
                style={styles.settingsBtnGlass}
              >
                <Ionicons name="settings-outline" size={22} color="#1c1c1e" />
              </GlassView>
            ) : (
              <View style={[styles.settingsBtnGlass, styles.settingsBtnFallback]}>
                <Ionicons name="settings-outline" size={22} color="#1c1c1e" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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
        </ScrollView>
      </WhiteHeader>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1c1c1e" />
        </View>
      ) : towers.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cellular-outline" size={40} color="#d1d5db" />
          <Text style={styles.emptyTitle}>{error ?? t('errors.noTowersLoaded')}</Text>
          <Text style={styles.emptyHint}>{t('list.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={listRows}
          keyExtractor={(item) =>
            `${item.tower.mcc}-${item.tower.mnc}-${item.tower.lac}-${item.tower.cellid}`
          }
          renderItem={({ item }) => <TowerRow item={item} onPress={(tower) => setSelectedTower(tower)} />}
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  listContent: { paddingTop: 8 },

  // ── Header ──
  headerWrap: {
    backgroundColor: '#ffffff',
    zIndex: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  settingsBtnGlass: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 2,
  },
  settingsBtnFallback: {
    backgroundColor: 'rgba(118,118,128,0.12)',
  },
  largeTitle: {
    fontSize: 36,
    fontWeight: '600',
    color: '#1c1c1e',
    letterSpacing: -0.5,
  },
  largeCount: {
    fontSize: 36,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: -0.5,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'nowrap',
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
    gap: 8,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroDistRow: {
    alignItems: 'flex-end',
    gap: 2,
  },
  heroDistance: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroBearing: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
    letterSpacing: 0.3,
  },
  heroCarrier: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1c1c1e',
    letterSpacing: -0.3,
  },

  // hero detail grid
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 2,
  },
  heroCellItem: {
    width: '50%',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#edf2f7',
  },
  heroCellLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  heroCellValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    fontVariant: ['tabular-nums'],
  },

  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
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
});
