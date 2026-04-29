import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { CellTower, RADIO_COLORS } from '@/src/types';

const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G', UMTS: '3G', LTE: '4G', NR: '5G',
};

interface Props {
  radio: CellTower['radio'];
  cellid: number;
  isSelected?: boolean;
}

// Single stable component — no conditional component swapping inside <Marker>.
// With Fabric (New Architecture), swapping child component types or toggling
// tracksViewChanges triggers TelemetryController::pullTransaction crashes.
// Keep this component fully stable after initial mount.
export const TowerMarker = React.memo(function TowerMarker({ radio, cellid, isSelected }: Props) {
  const color = RADIO_COLORS[radio] ?? '#8b5cf6';
  const label = `${RADIO_SHORT[radio] ?? String(radio)} · ${String(cellid).slice(-4)}`;

  return (
    <View style={styles.wrapper}>
      <View style={[
        styles.pin,
        { borderColor: color },
        isSelected && styles.pinSelected,
        Platform.OS === 'ios' && { shadowColor: color },
      ]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <View style={[styles.tag, isSelected && { borderColor: color + '55' }]}>
        <Text style={styles.tagText}>{label}</Text>
      </View>
    </View>
  );
});

// Keep export so existing imports don't break, but it's now the same component.
// Do NOT use Reanimated shared values inside a Marker child on Fabric — the
// animation is invisible (tracksViewChanges=false means native ignores updates)
// and the shared value worklets race with Fabric commits.
export const AnimatedTowerMarker = TowerMarker;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: 72,
  },

  pin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  pinSelected: {
    borderWidth: 3,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  tag: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 7,
    backgroundColor: 'rgba(5,5,5,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  tagText: {
    color: '#e5e5e5',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
