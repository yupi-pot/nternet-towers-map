import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { CellTower, RADIO_COLORS } from '@/src/types';

const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G', UMTS: '3G', LTE: '4G', NR: '5G',
};

// Fractional anchor for MapView <Marker>: the dot center sits at ~33% of total height
// (dot 26px + gap 3px + label ~12px ≈ 41px; 13/41 ≈ 0.32)
export const TOWER_MARKER_ANCHOR = { x: 0.5, y: 0.33 } as const;

interface Props {
  radio: CellTower['radio'];
  cellid: number;
  isSelected?: boolean;
}

export const TowerMarker = React.memo(function TowerMarker({ radio }: Props) {
  const color = RADIO_COLORS[radio] ?? '#8b5cf6';
  // For the near-white 2G color use a grey border so it stays visible on light maps.
  const borderColor = radio === 'GSM' ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.85)';
  return (
    <View style={styles.wrapper}>
      <View style={[
        styles.dot,
        { backgroundColor: color, borderColor },
        Platform.OS === 'ios' && { shadowColor: color === '#f0f0f0' ? '#888' : color },
      ]} />
      <Text style={[styles.label, { color: radio === 'GSM' ? '#666' : color }]}>{RADIO_SHORT[radio]}</Text>
    </View>
  );
});

export const AnimatedTowerMarker = TowerMarker;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});
