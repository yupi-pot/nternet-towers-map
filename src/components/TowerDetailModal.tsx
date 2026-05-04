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
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

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
import { useCompass } from '@/src/hooks/useCompass';
import { presentPaywall } from '@/src/components/PaywallModal';
import { usePremium } from '@/src/context/PremiumContext';
import { CellTower, RADIO_COLORS, RADIO_LABELS } from '@/src/types';

interface Props {
  tower: CellTower | null;
  userLat: number | null;
  userLon: number | null;
  /** Closes sheet only — coverage stays on map (X button, overlay tap, swipe) */
  onClose: () => void;
  onFlagInaccurate?: (tower: CellTower) => void;
  /** Coverage availability for this tower view (shown as a small notice). */
  coverageNotice?: 'remaining' | 'locked' | null;
  coverageRemaining?: number;
}

export default function TowerDetailModal({
  tower, userLat, userLon, onClose, onFlagInaccurate,
  coverageNotice = null, coverageRemaining = 0,
}: Props) {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const deviceHeading = useCompass();
  const [flagged, setFlagged] = useState(false);

  const cardTranslateY = useSharedValue(500);

  useEffect(() => {
    if (tower) {
      cardTranslateY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tower]);

  const closeCard = useCallback(() => {
    cardTranslateY.value = withTiming(
      600,
      { duration: 250, easing: Easing.in(Easing.quad) },
      (finished) => { if (finished) runOnJS(onClose)(); },
    );
  }, [onClose, cardTranslateY]);

  const openPaywall = useCallback(() => {
    // Close the bottom sheet first — iOS won't let Adapty present a native
    // modal on top of an active React Native <Modal>. Wait one frame after
    // unmounting before triggering the native presentation.
    cardTranslateY.value = withTiming(
      600,
      { duration: 200, easing: Easing.in(Easing.quad) },
      (finished) => {
        if (!finished) return;
        runOnJS(onClose)();
        runOnJS(setTimeout)(() => { void presentPaywall(); }, 50);
      },
    );
  }, [onClose, cardTranslateY]);

  // Swipe-to-close: card follows finger live, closes on fast/far swipe
  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      cardTranslateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 700) {
        cardTranslateY.value = withTiming(
          600,
          { duration: 200, easing: Easing.in(Easing.quad) },
          (finished) => { if (finished) runOnJS(onClose)(); },
        );
      } else {
        cardTranslateY.value = withSpring(0, { damping: 22, stiffness: 280 });
      }
    });

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
  }));

  if (!tower) return null;

  const carrier = getCarrierName(tower.mcc, tower.mnc);
  const conf = confidenceLevel(tower.samples);
  const enodebId = tower.radio === 'LTE' ? tower.cellid >> 8 : null;

  const hasLocation = userLat != null && userLon != null;
  const distance = hasLocation ? haversineDistance(userLat!, userLon!, tower.lat, tower.lon) : null;
  const towerBearing = hasLocation ? bearingTo(userLat!, userLon!, tower.lat, tower.lon) : null;
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
    Alert.alert(t('tower.thanksTitle'), t('tower.thanksBody'));
  };

  return (
    // Transparent Modal: map + coverage visible through it.
    // Tapping above the card closes the sheet only (coverage stays).
    // Second tap on the map (via MapView.onPress) then closes coverage.
    <Modal visible transparent animationType="none" onRequestClose={closeCard}>
      <GestureHandlerRootView style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeCard} />
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[styles.card, { paddingBottom: 28 + insets.bottom }, cardAnimStyle]}>
            {/* Handle — visual cue for swipe */}
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

            <TouchableOpacity
              style={[styles.confBadge, { borderColor: CONFIDENCE_COLOR[conf] }]}
              onPress={() => Alert.alert(
                t('tower.confidenceTitle'),
                t('tower.confidenceBody'),
                [{ text: t('common.ok') }],
              )}
              activeOpacity={0.7}
            >
              <View style={[styles.confDot, { backgroundColor: CONFIDENCE_COLOR[conf] }]} />
              <Text style={[styles.confText, { color: CONFIDENCE_COLOR[conf] }]}>
                {t('tower.confidenceBadge', { level: confidenceLabel(conf) })}
              </Text>
              <Text style={[styles.confInfo, { color: CONFIDENCE_COLOR[conf] }]}>ⓘ</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={closeCard} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Distance + bearing */}
          {hasLocation && distance != null && towerBearing != null && (
            <View style={styles.bearingRow}>
              <View style={styles.bearingItem}>
                <Text style={styles.bearingLabel}>{t('tower.distance')}</Text>
                <Text style={styles.bearingValue}>{formatDistance(distance)}</Text>
              </View>
              <View style={styles.bearingDivider} />
              <View style={styles.bearingItem}>
                <Text style={styles.bearingLabel}>{t('tower.direction')}</Text>
                <View style={styles.compassWrap}>
                  <Text style={styles.bearingValue}>{formatBearing(towerBearing)}</Text>
                  {arrowRotation != null && (
                    <Text style={[styles.compassArrow, { transform: [{ rotate: `${arrowRotation}deg` }] }]}>
                      ↑
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Coverage quota notice */}
          {!isPremium && coverageNotice === 'remaining' && (
            <TouchableOpacity style={styles.coverageNoticeRemain} onPress={openPaywall} activeOpacity={0.85}>
              <Text style={styles.coverageNoticeRemainText}>
                {t('tower.coverageRemaining', { count: coverageRemaining })}
              </Text>
              <Text style={styles.coverageNoticeCta}>{t('tower.getPremium')}</Text>
            </TouchableOpacity>
          )}
          {!isPremium && coverageNotice === 'locked' && (
            <TouchableOpacity style={styles.coverageNoticeLocked} onPress={openPaywall} activeOpacity={0.85}>
              <Text style={styles.coverageNoticeLockedText}>
                🔒 {t('tower.coverageLocked')}
              </Text>
              <Text style={styles.coverageNoticeCta}>{t('tower.getPremium')}</Text>
            </TouchableOpacity>
          )}

          {/* Detail rows */}
          <View style={styles.contentBlock}>
            <View style={styles.details}>
              <InfoRow label={t('tower.cellId')} value={String(tower.cellid)} />
              {enodebId != null && (
                <LockedInfoRow
                  label={t('tower.eNodeB')}
                  value={String(enodebId)}
                  isPremium={isPremium}
                  onPress={openPaywall}
                />
              )}
              <LockedInfoRow
                label={t('tower.mccMnc')}
                value={`${tower.mcc} / ${tower.mnc}`}
                isPremium={isPremium}
                onPress={openPaywall}
              />
              <LockedInfoRow
                label={t('tower.lac')}
                value={String(tower.lac)}
                isPremium={isPremium}
                onPress={openPaywall}
              />
              <TouchableOpacity onPress={handleCopyCoords}>
                <InfoRow
                  label={t('tower.coordinates')}
                  value={`${tower.lat.toFixed(5)}, ${tower.lon.toFixed(5)}`}
                  action={t('common.copy')}
                />
              </TouchableOpacity>
              <LockedInfoRow
                label={t('tower.coverageRadius')}
                value={`~${tower.range.toLocaleString()} ${t('units.m')}`}
                isPremium={isPremium}
                onPress={openPaywall}
              />
              <LockedInfoRow
                label={t('tower.measurements')}
                value={`${tower.samples.toLocaleString()}`}
                isPremium={isPremium}
                onPress={openPaywall}
              />
              {tower.averageSignalStrength !== 0 && (
                <LockedInfoRow
                  label={t('tower.avgSignal')}
                  value={`${tower.averageSignalStrength} dBm`}
                  isPremium={isPremium}
                  onPress={openPaywall}
                />
              )}
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, flagged && styles.actionBtnDisabled]}
              onPress={handleFlag}
            >
              <Text style={[styles.actionBtnText, flagged && styles.actionBtnTextDisabled]}>
                {flagged ? t('tower.reported') : t('tower.flagInaccurate')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={isPremium ? handleExport : openPaywall}
            >
              <Text style={styles.actionBtnTextPrimary}>
                {isPremium ? t('tower.export') : `🔒 ${t('tower.export')}`}
              </Text>
            </TouchableOpacity>
          </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

function InfoRow({ label, value, action }: { label: string; value: string; action?: string }) {
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

function LockedInfoRow({
  label, value, isPremium, onPress,
}: { label: string; value: string; isPremium: boolean; onPress: () => void }) {
  if (isPremium) {
    return <InfoRow label={label} value={value} />;
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <View style={styles.infoRight}>
          <Text style={styles.infoValueLocked}>••• •••</Text>
          <Text style={styles.infoLock}>🔒</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },

  handleWrap: { alignItems: 'center', paddingTop: 10, marginBottom: 6 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },

  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  networkBadge: {
    alignSelf: 'flex-start', borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 12, marginBottom: 4,
  },
  networkBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  carrierName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

  confBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginTop: 2,
  },
  confDot: { width: 7, height: 7, borderRadius: 4 },
  confText: { fontSize: 12, fontWeight: '700' },
  confInfo: { fontSize: 13, fontWeight: '500', opacity: 0.7 },

  closeBtn: { padding: 4, marginLeft: 4 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },

  bearingRow: {
    flexDirection: 'row', backgroundColor: '#f8fafc',
    borderRadius: 16, marginBottom: 14, overflow: 'hidden',
  },
  bearingItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  bearingDivider: { width: 1, backgroundColor: '#e2e8f0' },
  bearingLabel: {
    fontSize: 11, color: '#94a3b8', fontWeight: '600',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  bearingValue: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  compassWrap: { alignItems: 'center' },
  compassArrow: { fontSize: 22, color: '#3b82f6', marginTop: 4, fontWeight: '700' },

  contentBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  details: { gap: 0, paddingHorizontal: 14 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#edf2f7',
  },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14, color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  infoValueLocked: { fontSize: 14, fontWeight: '700', color: '#cbd5e1', letterSpacing: 2 },
  infoLock: { fontSize: 12, opacity: 0.55 },
  infoAction: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },

  coverageNoticeRemain: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#eff6ff', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12,
  },
  coverageNoticeRemainText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8', flex: 1 },
  coverageNoticeLocked: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fef3c7', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12,
  },
  coverageNoticeLockedText: { fontSize: 13, fontWeight: '600', color: '#92400e', flex: 1 },
  coverageNoticeCta: { fontSize: 13, fontWeight: '700', color: '#3b82f6', marginLeft: 10 },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  actionBtnDisabled: { borderColor: '#f1f5f9' },
  actionBtnPrimary: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  actionBtnTextDisabled: { color: '#cbd5e1' },
  actionBtnTextPrimary: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
