import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { CellTower, RADIO_COLORS } from '@/src/types';

const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G', UMTS: '3G', LTE: '4G', NR: '5G',
};

interface Props {
  radio: CellTower['radio'];
  cellid: number;        // kept for API compat
  isSelected?: boolean;  // kept for API compat
}

export const TowerMarker = React.memo(function TowerMarker({ radio }: Props) {
  const color = RADIO_COLORS[radio] ?? '#8b5cf6';
  return (
    <View style={[
      styles.pin,
      { borderColor: color },
      Platform.OS === 'ios' && { shadowColor: color },
    ]}>
      <Text style={[styles.label, { color }]}>{RADIO_SHORT[radio] ?? String(radio)}</Text>
    </View>
  );
});

// Alias kept so existing imports don't need updating.
export const AnimatedTowerMarker = TowerMarker;

const styles = StyleSheet.create({
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
