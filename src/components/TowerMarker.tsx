import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { CellTower, RADIO_COLORS } from '@/src/types';

const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G', UMTS: '3G', LTE: '4G', NR: '5G',
};

export const TOWER_MARKER_ANCHOR = { x: 0.5, y: 0.5 } as const;

interface Props {
  radio: CellTower['radio'];
  cellid: number;
  isSelected?: boolean;
  minimized?: boolean;
}

export const TowerMarker = React.memo(function TowerMarker({ radio, minimized }: Props) {
  const color = RADIO_COLORS[radio] ?? '#8b5cf6';

  if (minimized) {
    return <View style={[styles.dot, { backgroundColor: color }]} />;
  }

  return (
    <View style={[
      styles.pin,
      { backgroundColor: color },
      Platform.OS === 'ios' && { shadowColor: color },
    ]}>
      <Text style={styles.label}>{RADIO_SHORT[radio]}</Text>
    </View>
  );
});

export const AnimatedTowerMarker = TowerMarker;

const styles = StyleSheet.create({
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
  },
  label: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#fff',
  },
});
