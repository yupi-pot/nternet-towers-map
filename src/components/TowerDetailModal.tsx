import * as Clipboard from 'expo-clipboard';
import {
  cacheDirectory,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
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
  withTiming,
} from 'react-native-reanimated';

import { getCarrierName } from '@/src/utils/carrierNames';
import {
  bearingTo,
  cardinalDirection,
  CONFIDENCE_COLOR,
  CONFIDENCE_LABEL,
  confidenceLevel,
  formatBearing,
  formatDistance,
  haversineDistance,
} from '@/src/utils/towerUtils';
import { useCompass } from '@/src/hooks/useCompass';
import { CellTower, RADIO_COLORS, RADIO_LABELS } from '@/src/types';

interface Props {
  tower: CellTower | null;
  userLat: number | null;
  userLon: number | null;
  onClose: () => void;
  onFlagInaccurate?: (tower: CellTower) => void;
}

export default function TowerDetailModal({ tower, userLat, userLon, onClose, onFlagInaccurate }: Props) {
  const deviceHeading = useCompass();
  const [flagged, setFlagged] = useState(false);

  const overlayOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(400);

  useEffect(() => {
    if (tower) {
      overlayOpacity.value = withTiming(1, { duration: 220 });
      cardTranslateY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tower]);

  const handleClose = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 200 });
    cardTranslateY.value = withTiming(
      400,
      { duration: 250, easing: Easing.in(Easing.quad) },
      (finished) => { if (finished) runOnJS(onClose)(); },
    );
  }, [onClose, overlayOpacity, cardTranslateY]);

  const overlayAnimStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const cardAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateY: cardTranslateY.value }] }));

  if (!tower) return null;

  const carrier = getCarrierName(tower.mcc, tower.mnc);
  const conf = confidenceLevel(tower.samples);

  // Distance & bearing (requires user location)
  const hasLocation = userLat != null && userLon != null;
  const distance = hasLocation
    ? haversineDistance(userLat!, userLon!, tower.lat, tower.lon)
    : null;
  const towerBearing = hasLocation
    ? bearingTo(userLat!, userLon!, tower.lat, tower.lon)
    : null;

  // Arrow rotation for live compass: rotate arrow by (towerBearing - deviceHeading)
  const arrowRotation =
    towerBearing != null && deviceHeading != null
      ? (towerBearing - deviceHeading + 360) % 360
      : null;

  const handleCopyCoords = () =>
    Clipboard.setStringAsync(`${tower.lat.toFixed(6)}, ${tower.lon.toFixed(6)}`);

  const handleExport = async () => {
    const data = {
      cellid: tower.cellid,
      carrier,
      radio: tower.radio,
      lat: tower.lat,
      lon: tower.lon,
      range_m: tower.range,
      samples: tower.samples,
      avg_signal_dbm: tower.averageSignalStrength || null,
      mcc: tower.mcc,
      mnc: tower.mnc,
      lac: tower.lac,
    };
    const json = JSON.stringify(data, null, 2);
    const path = `${cacheDirectory}tower_${tower.cellid}.json`;
    await writeAsStringAsync(path, json);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'application/json' });
    }
  };

  const handleFlag = () => {
    if (flagged) return;
    setFlagged(true);
    onFlagInaccurate?.(tower);
    Alert.alert('Thanks!', 'Your report helps improve tower accuracy for everyone.');
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, overlayAnimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View style={[styles.card, cardAnimStyle]}>
            {/* Handle */}
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            {/* Network badge + carrier + close */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <View style={[styles.networkBadge, { backgroundColor: RADIO_COLORS[tower.radio] }]}>
                  <Text style={styles.networkBadgeText}>{RADIO_LABELS[tower.radio]}</Text>
                </View>
                <Text style={styles.carrierName}>{carrier}</Text>
              </View>

              {/* Confidence */}
              <View style={[styles.confBadge, { borderColor: CONFIDENCE_COLOR[conf] }]}>
                <View style={[styles.confDot, { backgroundColor: CONFIDENCE_COLOR[conf] }]} />
                <Text style={[styles.confText, { color: CONFIDENCE_COLOR[conf] }]}>
                  {CONFIDENCE_LABEL[conf]}
                </Text>
              </View>

              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Distance + bearing row */}
            {hasLocation && distance != null && towerBearing != null && (
              <View style={styles.bearingRow}>
                <View style={styles.bearingItem}>
                  <Text style={styles.bearingLabel}>Distance</Text>
                  <Text style={styles.bearingValue}>{formatDistance(distance)}</Text>
                </View>
                <View style={styles.bearingDivider} />
                <View style={styles.bearingItem}>
                  <Text style={styles.bearingLabel}>Direction</Text>
                  <View style={styles.compassWrap}>
                    <Text style={styles.bearingValue}>
                      {formatBearing(towerBearing)}
                    </Text>
                    {arrowRotation != null && (
                      <Text
                        style={[
                          styles.compassArrow,
                          { transform: [{ rotate: `${arrowRotation}deg` }] },
                        ]}
                      >
                        ↑
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Detail rows */}
            <View style={styles.details}>
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
              <InfoRow label="Coverage radius" value={`~${tower.range.toLocaleString()} m`} />
              <InfoRow label="Measurements" value={`${tower.samples.toLocaleString()}`} />
              {tower.averageSignalStrength !== 0 && (
                <InfoRow label="Avg signal" value={`${tower.averageSignalStrength} dBm`} />
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, flagged && styles.actionBtnDisabled]}
                onPress={handleFlag}
              >
                <Text style={[styles.actionBtnText, flagged && styles.actionBtnTextDisabled]}>
                  {flagged ? 'Reported' : '⚑ Flag inaccurate'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={handleExport}
              >
                <Text style={styles.actionBtnTextPrimary}>↑ Export</Text>
              </TouchableOpacity>
            </View>
        </Animated.View>
      </Animated.View>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, marginBottom: 6 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  networkBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  networkBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  carrierName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

  confBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  confDot: { width: 7, height: 7, borderRadius: 4 },
  confText: { fontSize: 12, fontWeight: '700' },

  closeBtn: { padding: 4, marginLeft: 4 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },

  bearingRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  bearingItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  bearingDivider: { width: 1, backgroundColor: '#e2e8f0' },
  bearingLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  bearingValue: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  compassWrap: { alignItems: 'center' },
  compassArrow: { fontSize: 22, color: '#3b82f6', marginTop: 4, fontWeight: '700' },
  premiumRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  details: { gap: 0, marginBottom: 16 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14, color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  infoAction: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnDisabled: { borderColor: '#f1f5f9' },
  actionBtnPrimary: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  actionBtnTextDisabled: { color: '#cbd5e1' },
  actionBtnTextPrimary: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
