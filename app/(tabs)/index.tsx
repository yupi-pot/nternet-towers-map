import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import Supercluster from 'supercluster';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapErrorBoundary } from '@/src/components/MapErrorBoundary';
import CoverageOverlay from '@/src/components/CoverageOverlay';
import TowerDetailModal from '@/src/components/TowerDetailModal';
import { TowerMarker, TOWER_MARKER_ANCHOR } from '@/src/components/TowerMarker';
import { useTowersContext } from '@/src/context/TowersContext';
import { CellTower, RADIO_COLORS } from '@/src/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_RADIOS: CellTower['radio'][] = ['GSM', 'UMTS', 'LTE', 'NR'];
const RADIO_LABEL: Record<CellTower['radio'], string> = {
  GSM: '2G', UMTS: '3G', LTE: '4G LTE', NR: '5G NR',
};

const RIPPLE_BASE  = 28;  // base ring diameter matching the pin size

// Pulse config per radio type: 2G is subtle, 5G is wide and fast
const RIPPLE_CONFIG: Record<CellTower['radio'], { maxScale: number; duration: number; maxOpacity: number }> = {
  GSM:  { maxScale: 1.4, duration: 3500, maxOpacity: 0.30 },
  UMTS: { maxScale: 1.6, duration: 3000, maxOpacity: 0.40 },
  LTE:  { maxScale: 1.8, duration: 2600, maxOpacity: 0.52 },
  NR:   { maxScale: 2.2, duration: 2000, maxOpacity: 0.68 },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClusterRadioCounts { gsm: number; umts: number; lte: number; nr: number }
interface RippleItem {
  id: string; x: number; y: number;
  color: string; maxScale: number; duration: number; maxOpacity: number; staggerMs: number;
}


// ─── Supercluster config (stable, defined outside component) ──────────────────

const SC_OPTIONS: Supercluster.Options<{ tower: CellTower }, ClusterRadioCounts> = {
  radius: 40,
  maxZoom: 16,
  map: (props) => ({
    gsm:  props.tower.radio === 'GSM'  ? 1 : 0,
    umts: props.tower.radio === 'UMTS' ? 1 : 0,
    lte:  props.tower.radio === 'LTE'  ? 1 : 0,
    nr:   props.tower.radio === 'NR'   ? 1 : 0,
  }),
  reduce: (acc, props) => {
    acc.gsm  += props.gsm;
    acc.umts += props.umts;
    acc.lte  += props.lte;
    acc.nr   += props.nr;
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function regionToZoom(region: Region): number {
  return Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
}

function regionToBBox(region: Region): [number, number, number, number] {
  return [
    region.longitude - region.longitudeDelta / 2,
    region.latitude  - region.latitudeDelta  / 2,
    region.longitude + region.longitudeDelta / 2,
    region.latitude  + region.latitudeDelta  / 2,
  ];
}

// Deterministic jitter to break collinear tower coordinates from rounded DB data.
function jitter(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 0.0006;
}


// Return the radio type with the highest count (prefer higher-gen on tie).
function dominantRadio(counts: ClusterRadioCounts): CellTower['radio'] {
  const entries: [CellTower['radio'], number][] = [
    ['NR', counts.nr], ['LTE', counts.lte], ['UMTS', counts.umts], ['GSM', counts.gsm],
  ];
  return entries.find(([, n]) => n > 0)?.[0] ?? 'LTE';
}

// ─── SVG donut helpers ────────────────────────────────────────────────────────

function polarXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(cx: number, cy: number, R: number, r: number, startDeg: number, endDeg: number): string {
  const sweep = endDeg - startDeg;
  if (sweep >= 359.9) {
    // Full ring: SVG can't draw a 360° arc in one path; split into two halves
    const t  = polarXY(cx, cy, R, 0);   const b  = polarXY(cx, cy, R, 180);
    const ti = polarXY(cx, cy, r, 0);   const bi = polarXY(cx, cy, r, 180);
    return [
      `M ${t.x} ${t.y} A ${R} ${R} 0 1 1 ${b.x} ${b.y} A ${R} ${R} 0 1 1 ${t.x} ${t.y}`,
      `M ${ti.x} ${ti.y} A ${r} ${r} 0 1 0 ${bi.x} ${bi.y} A ${r} ${r} 0 1 0 ${ti.x} ${ti.y} Z`,
    ].join(' ');
  }
  const largeArc = sweep > 180 ? 1 : 0;
  const s = polarXY(cx, cy, R, startDeg); const e = polarXY(cx, cy, R, endDeg);
  const si = polarXY(cx, cy, r, startDeg); const ei = polarXY(cx, cy, r, endDeg);
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y} L ${ei.x} ${ei.y} A ${r} ${r} 0 ${largeArc} 0 ${si.x} ${si.y} Z`;
}

// ─── Components ───────────────────────────────────────────────────────────────

const ClusterPie = React.memo(function ClusterPie({
  counts, total,
}: { counts: ClusterRadioCounts; total: number }) {
  const segs = (
    [['GSM', counts.gsm], ['UMTS', counts.umts], ['LTE', counts.lte], ['NR', counts.nr]] as [CellTower['radio'], number][]
  ).filter(([, n]) => n > 0);

  const CX = 22, CY = 22, R = 19, ri = 12;
  let deg = 0;

  return (
    <Svg width={44} height={44}>
      {segs.length === 1 ? (
        <Circle cx={CX} cy={CY} r={R} fill={RADIO_COLORS[segs[0][0]]} />
      ) : (
        segs.map(([radio, count]) => {
          const sweep = (count / total) * 360;
          const d = donutArc(CX, CY, R, ri, deg, deg + sweep);
          deg += sweep;
          return <Path key={radio} d={d} fill={RADIO_COLORS[radio]} />;
        })
      )}
      <Circle cx={CX} cy={CY} r={ri} fill="#faf6f0" />
      <SvgText
        x={CX} y={CY + 4}
        textAnchor="middle"
        fill="#1a1a1a"
        fontSize={11}
        fontWeight="bold"
      >
        {total > 999 ? `${Math.round(total / 1000)}k` : String(total)}
      </SvgText>
    </Svg>
  );
});

const ClusterMarker = React.memo(function ClusterMarker({
  lat, lon, clusterId, pointCount, counts, onPress, minimized, tracksViewChanges,
}: {
  lat: number; lon: number; clusterId: number; pointCount: number;
  counts: ClusterRadioCounts; onPress: () => void;
  minimized?: boolean; tracksViewChanges?: boolean;
}) {
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lon }}
      tracksViewChanges={tracksViewChanges ?? false}
      onPress={onPress}
    >
      <View collapsable={false}>
        {minimized
          ? <View style={[styles.clusterDot, { backgroundColor: RADIO_COLORS[dominantRadio(counts)] }]} />
          : <ClusterPie counts={counts} total={pointCount} />
        }
      </View>
    </Marker>
  );
});

// Ripple ring for a single tower or cluster — rendered as absolute overlay sibling to MapView.
// Runs entirely outside Marker/Fabric so Reanimated can animate freely.
const SingleRipple = React.memo(function SingleRipple({
  id: _id, x, y, color, maxScale, duration, maxOpacity, staggerMs,
}: RippleItem) {
  // Start just outside the pin edge so the ring always expands outward, never covers the dot.
  const scale   = useSharedValue(1.1);
  const opacity = useSharedValue(maxOpacity);

  useEffect(() => {
    const cfg = { duration, easing: Easing.out(Easing.ease) };
    scale.value   = withDelay(staggerMs, withRepeat(withTiming(maxScale, cfg), -1, false));
    opacity.value = withDelay(staggerMs, withRepeat(withTiming(0,        cfg), -1, false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <View
      style={{ position: 'absolute', left: x - RIPPLE_BASE / 2, top: y - RIPPLE_BASE / 2 }}
      pointerEvents="none"
    >
      <Animated.View style={[styles.rippleRing, { borderColor: color }, animStyle]} />
    </View>
  );
});

function GlassView({ style, children }: { style?: object; children: React.ReactNode }) {
  return (
    <View style={[styles.glass, Platform.OS === 'android' ? styles.glassAndroid : styles.glassIOS, style]}>
      {children}
    </View>
  );
}

// Slot-machine counter: old number slides out, new slides in from opposite direction.
function AnimatedCount({ value, textStyle }: { value: number; textStyle: object }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  const y  = useSharedValue(0);
  const op = useSharedValue(1);

  useEffect(() => {
    if (value === prevRef.current) return;
    const up = value > prevRef.current;
    prevRef.current = value;

    y.value  = withTiming(up ? -44 : 44, { duration: 140, easing: Easing.in(Easing.ease) });
    op.value = withTiming(0, { duration: 140 }, () => {
      runOnJS(setDisplayed)(value);
      y.value  = up ? 44 : -44;
      y.value  = withTiming(0,  { duration: 260, easing: Easing.out(Easing.back(1.2)) });
      op.value = withTiming(1,  { duration: 200 });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: op.value,
  }));

  return (
    <View style={{ height: 42, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.Text style={[textStyle, animStyle]}>{displayed}</Animated.Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MapTab() {
  const router = useRouter();
  const {
    towers,
    isCapped,
    location, locationLoading, locationError,
    mapRegionRef, refreshCurrentRegion,
  } = useTowersContext();

  const [activeFilters, setActiveFilters] = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const [mapFilters,    setMapFilters]    = useState<Set<CellTower['radio']>>(new Set(ALL_RADIOS));
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [selectedTower, setSelectedTower] = useState<CellTower | null>(null);
  const [coverageTower, setCoverageTower] = useState<CellTower | null>(null);
  const [trackingMarkers, setTrackingMarkers] = useState(false);
  const [rippleItems, setRippleItems] = useState<RippleItem[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef                 = useRef<any>(null);
  const scRef                  = useRef(new Supercluster<{ tower: CellTower }, ClusterRadioCounts>(SC_OPTIONS));
  const firstFetchDoneRef      = useRef(false);
  const userHasDraggedRef      = useRef(false);
  const isPanningRef           = useRef(false);
  const isProgrammaticMoveRef  = useRef(false);
  // Prevents MapView.onPress from clearing coverage on the same tap that opened it
  const markerJustPressedRef   = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

  // Secret: tap title 7× to relaunch onboarding
  const titleTapCountRef = useRef(0);
  const titleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTitleTap = useCallback(() => {
    titleTapCountRef.current += 1;
    if (titleTapTimerRef.current) clearTimeout(titleTapTimerRef.current);
    titleTapTimerRef.current = setTimeout(() => { titleTapCountRef.current = 0; }, 1500);
    if (titleTapCountRef.current >= 7) {
      titleTapCountRef.current = 0;
      SecureStore.deleteItemAsync('hasSeenOnboarding').then(() => router.replace('/onboarding' as never));
    }
  }, [router]);

  // Briefly enable tracksViewChanges on all markers so they repaint when coverage toggles
  useEffect(() => {
    setTrackingMarkers(true);
    const t = setTimeout(() => setTrackingMarkers(false), 600);
    return () => clearTimeout(t);
  }, [coverageTower]);

  if (towers.length > 0) firstFetchDoneRef.current = true;

  const isAllActive = activeFilters.size === ALL_RADIOS.length;

  const applyFilters = useCallback((next: Set<CellTower['radio']>) => {
    setActiveFilters(next);
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => setMapFilters(new Set(next)), 200);
  }, []);

  const handleAllChip = useCallback(() => applyFilters(new Set(ALL_RADIOS)), [applyFilters]);

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

  const handlePanDrag = useCallback(() => {
    userHasDraggedRef.current = true;
    if (!isPanningRef.current) {
      isPanningRef.current = true;
      setIsPanning(true);
    }
  }, []);

  // Fires for ALL map movement (user or programmatic) — clears ripples while map is in motion
  const handleRegionChange = useCallback(() => {
    if (!isPanningRef.current) {
      isPanningRef.current = true;
      setIsPanning(true);
    }
  }, []);


  const handleRegionChangeComplete = useCallback((region: Region) => {
    mapRegionRef.current = region;
    setCurrentRegion(region);
    isPanningRef.current = false;
    setIsPanning(false);
    if (isProgrammaticMoveRef.current) {
      isProgrammaticMoveRef.current = false;
      return;
    }
    refreshCurrentRegion();
  }, [mapRegionRef, refreshCurrentRegion]);

  const handleMyLocation = useCallback(() => {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 },
      500,
    );
  }, [location]);

  // Open the sheet for a tower and center it in the visible map area above the sheet
  const handleTowerPress = useCallback((tower: CellTower) => {
    markerJustPressedRef.current = true; // block MapView.onPress for this tap
    setSelectedTower(tower);
    setCoverageTower(tower);
    setRippleItems([]);

    const region = currentRegion ?? mapRegionRef.current;
    if (!mapRef.current || !region) return;

    // Shift map center south so the tower pin lands in the visible area above the sheet.
    // Estimated sheet height ~460px; offset = half that / screen height * latDelta
    const { height: screenH } = Dimensions.get('window');
    const latOffset = (460 / 2 / screenH) * region.latitudeDelta;

    isProgrammaticMoveRef.current = true;
    mapRef.current.animateToRegion(
      {
        latitude: tower.lat - latOffset,
        longitude: tower.lon,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      },
      400,
    );
  }, [currentRegion, mapRegionRef]);

  const filteredTowers = useMemo(
    () => towers.filter((t) => mapFilters.has(t.radio)),
    [towers, mapFilters],
  );

  const clusterPoints = useMemo<Supercluster.PointFeature<{ tower: CellTower }>[]>(
    () => filteredTowers.map((tower) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [tower.lon + jitter(tower.cellid), tower.lat + jitter(tower.cellid + 99991)],
      },
      properties: { tower },
    })),
    [filteredTowers],
  );

  // load() and getClusters() must be in the same memo so the index is always
  // up-to-date before querying — a useEffect load would fire after render,
  // leaving getClusters querying stale data and causing native insert-index crashes.
  const clusters = useMemo(() => {
    scRef.current.load(clusterPoints);
    const region = currentRegion ?? mapRegionRef.current;
    if (!region) return [];
    return scRef.current.getClusters(regionToBBox(region), regionToZoom(region));
  }, [clusterPoints, currentRegion, mapRegionRef]);

  // Build ripple items by asking MapView for exact screen positions.
  // Done in a single effect so positions and items are always in sync —
  // no stale key lookups, no dropped items from volatile cluster_ids.
  useEffect(() => {
    const region = currentRegion ?? mapRegionRef.current;
    if (!mapRef.current || isPanning || !region) {
      setRippleItems([]);
      return;
    }
    if (isCapped) {
      setRippleItems([]);
      return;
    }
    let cancelled = false;
    // Delay so the map finishes rendering pins in their final positions before
    // we query screen coordinates — without this, pointForCoordinate can return
    // stale positions from the previous camera state.
    const delay = setTimeout(() => {
      Promise.all(
        clusters.map(async (item) => {
          const [lon, lat] = item.geometry.coordinates;
          if (!isFinite(lat) || !isFinite(lon)) return null;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pos = await (mapRef.current as any).pointForCoordinate({ latitude: lat, longitude: lon });
            if (!pos || !isFinite(pos.x) || !isFinite(pos.y)) return null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isCluster = (item.properties as any).cluster;
            if (isCluster) {
              const { cluster_id } = item.properties as Supercluster.ClusterProperties;
              const counts = item.properties as unknown as ClusterRadioCounts;
              const dom = dominantRadio({ gsm: counts.gsm ?? 0, umts: counts.umts ?? 0, lte: counts.lte ?? 0, nr: counts.nr ?? 0 });
              const cfg = RIPPLE_CONFIG[dom];
              return { id: `c${cluster_id}`, x: pos.x, y: pos.y, color: RADIO_COLORS[dom], ...cfg, staggerMs: (cluster_id % 8) * 300 } as RippleItem;
            } else {
              const { tower } = item.properties as { tower: CellTower };
              if (!tower) return null;
              const cfg = RIPPLE_CONFIG[tower.radio];
              return { id: `t${tower.mcc}-${tower.mnc}-${tower.lac}-${tower.cellid}`, x: pos.x, y: pos.y, color: RADIO_COLORS[tower.radio], ...cfg, staggerMs: (tower.cellid % 8) * 300 } as RippleItem;
            }
          } catch {
            return null;
          }
        }),
      ).then((results) => {
        if (cancelled) return;
        setRippleItems(results.filter((r): r is RippleItem => r !== null));
      });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(delay);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, currentRegion, isPanning]);


  const displayCount = towers.filter((t) => activeFilters.has(t.radio)).length;
  const radioCounts = useMemo(() => {
    const c: Record<CellTower['radio'], number> = { GSM: 0, UMTS: 0, LTE: 0, NR: 0 };
    towers.forEach((t) => c[t.radio]++);
    return c;
  }, [towers]);

  const initialRegion = location
    ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }
    : { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 30, longitudeDelta: 30 };

  return (
    <MapErrorBoundary onReset={() => setCurrentRegion(null)}>
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        userInterfaceStyle="light"
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPanDrag={handlePanDrag}
        onPress={() => {
          if (markerJustPressedRef.current) {
            markerJustPressedRef.current = false;
            return;
          }
          setCoverageTower(null);
        }}
        showsUserLocation
      >
        {coverageTower && <CoverageOverlay tower={coverageTower} />}
        {clusters.flatMap((item) => {
          const [lon, lat] = item.geometry.coordinates;
          if (!isFinite(lat) || !isFinite(lon)) return [];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((item.properties as any).cluster) {
            const { cluster_id, point_count } = item.properties as Supercluster.ClusterProperties;
            if (!isFinite(cluster_id) || !isFinite(point_count)) return [];
            const counts = item.properties as unknown as ClusterRadioCounts;
            return [
              <ClusterMarker
                key={`cluster-${cluster_id}`}
                lat={lat}
                lon={lon}
                clusterId={cluster_id}
                pointCount={point_count}
                counts={{
                  gsm: counts.gsm ?? 0, umts: counts.umts ?? 0,
                  lte: counts.lte ?? 0, nr:   counts.nr   ?? 0,
                }}
                minimized={isCapped || coverageTower !== null}
                tracksViewChanges={trackingMarkers}
                onPress={() => {
                  setRippleItems([]);
                  const expansionZoom = scRef.current.getClusterExpansionZoom(cluster_id);
                  const delta = 360 / Math.pow(2, expansionZoom);
                  isProgrammaticMoveRef.current = true;
                  mapRef.current?.animateToRegion(
                    { latitude: lat, longitude: lon, latitudeDelta: delta, longitudeDelta: delta },
                    300,
                  );
                }}
              />,
            ];
          }

          const { tower } = item.properties as { tower: CellTower };
          if (!tower) return [];
          return [
            <Marker
              key={`${tower.mcc}-${tower.mnc}-${tower.lac}-${tower.cellid}`}
              coordinate={{ latitude: lat, longitude: lon }}
              tracksViewChanges={trackingMarkers}
              onPress={() => handleTowerPress(tower)}
              anchor={TOWER_MARKER_ANCHOR}
            >
              <TowerMarker
                radio={tower.radio}
                cellid={tower.cellid}
                minimized={isCapped || (coverageTower !== null && !(
                  tower.mcc === coverageTower.mcc &&
                  tower.mnc === coverageTower.mnc &&
                  tower.lac === coverageTower.lac &&
                  tower.cellid === coverageTower.cellid
                ))}
              />
            </Marker>,
          ];
        })}
      </MapView>

      {/* ── Saturation tint overlay ── */}
      <View style={styles.saturationOverlay} pointerEvents="none" />

      {/* ── Ripple overlay for ALL towers + clusters (sibling to MapView, free to animate) ── */}
      {rippleItems.map((item) => (
        <SingleRipple key={item.id} {...item} />
      ))}

      {/* ── Top controls ── */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <LinearGradient
          colors={['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.60)', 'rgba(255,255,255,0)']}
          locations={[0, 0.55, 1]}
          style={styles.topGradient}
          pointerEvents="none"
        />
        <View style={styles.statusBar} pointerEvents="auto">
          {/* Title row — tap 7× to relaunch onboarding */}
          <TouchableOpacity onPress={handleTitleTap} activeOpacity={1} style={styles.titleRow}>
            <Text style={styles.bigTitle}>Found </Text>
            <AnimatedCount value={displayCount} textStyle={styles.bigTitleCount} />
            {isCapped && <Text style={styles.bigTitleCount}>+</Text>}
            <Text style={styles.bigTitle}> towers</Text>
          </TouchableOpacity>

          {/* Filter pills — single line, styled like list tab */}
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
                  <View style={[styles.pillDot, { backgroundColor: color }]} />
                  <Text style={[styles.pillText, { color: active ? color : '#6b7280' }]} numberOfLines={1}>
                    {RADIO_LABEL[radio]}
                  </Text>
                  <Text style={[styles.pillCount, { color: active ? color + '99' : '#9ca3af' }]}>
                    {radioCounts[radio]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>

      {/* ── My location ── */}
      {location && (
        <TouchableOpacity style={styles.locationBtnWrap} onPress={handleMyLocation} activeOpacity={0.75}>
          <GlassView style={styles.locationBtn}>
            <Ionicons name="navigate" size={22} color="#3b82f6" />
          </GlassView>
        </TouchableOpacity>
      )}

      <TowerDetailModal
        tower={selectedTower}
        userLat={location?.latitude ?? null}
        userLon={location?.longitude ?? null}
        onClose={() => setSelectedTower(null)}
      />

    </View>
    </MapErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  clusterDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  saturationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 150, 0, 0.10)',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc' },
  centeredText: { fontSize: 15, color: '#64748b' },

  glass: { borderRadius: 18, overflow: 'hidden', ...SHADOW },
  glassIOS: { backgroundColor: 'rgba(255,255,255,0.82)' },
  glassAndroid: { backgroundColor: 'rgba(255,255,255,0.95)' },

  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 6 },

  statusBar: {
    flexDirection: 'column',
    paddingTop: 10, paddingBottom: 12, paddingHorizontal: 20, gap: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bigTitle: {
    fontSize: 36, fontWeight: '600', color: '#1c1c1e', letterSpacing: -0.5,
    textShadowColor: 'rgba(255,255,255,0.7)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6,
  },
  bigTitleCount: {
    fontSize: 36, fontWeight: '600', color: '#9ca3af', letterSpacing: -0.5,
    textShadowColor: 'rgba(255,255,255,0.7)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 7, alignItems: 'center' },
  chip: { borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  chipAll: { backgroundColor: '#1c1c1e' },
  chipInactive: { backgroundColor: 'rgba(255,255,255,0.92)' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
  chipTextInactive: { color: '#6b7280' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 5,
  },
  pillInactive: { backgroundColor: 'rgba(255,255,255,0.92)' },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.1 },
  pillCount: { fontSize: 11, fontWeight: '500' },

  iconBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  locationBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },

  rippleRing: {
    width: RIPPLE_BASE, height: RIPPLE_BASE, borderRadius: RIPPLE_BASE / 2, borderWidth: 1.5,
  },

  locationBtnWrap: { position: 'absolute', bottom: 108, right: 14 },
});
