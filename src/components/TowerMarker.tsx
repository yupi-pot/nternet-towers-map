import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { CellTower, RADIO_COLORS } from '@/src/types';

const RADIO_SHORT: Record<CellTower['radio'], string> = {
  GSM: '2G', UMTS: '3G', LTE: '4G', NR: '5G',
};

interface Props {
  radio: CellTower['radio'];
  cellid: number;
}

export const TowerMarker = React.memo(function TowerMarker({ radio, cellid }: Props) {
  const color = RADIO_COLORS[radio] ?? '#8b5cf6';
  const label = `${RADIO_SHORT[radio]} · ${String(cellid).slice(-4)}`;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.pin, { borderColor: color }, Platform.OS === 'ios' && { shadowColor: color }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{label}</Text>
      </View>
    </View>
  );
});

export const AnimatedTowerMarker = React.memo(function AnimatedTowerMarker({ radio, cellid }: Props) {
  const color = RADIO_COLORS[radio] ?? '#8b5cf6';
  const label = `${RADIO_SHORT[radio]} · ${String(cellid).slice(-4)}`;

  const scale1 = useSharedValue(0.4);
  const opacity1 = useSharedValue(0.7);
  const scale2 = useSharedValue(0.4);
  const opacity2 = useSharedValue(0.7);

  useEffect(() => {
    const cfg = { duration: 2400, easing: Easing.out(Easing.ease) };
    scale1.value = withRepeat(withTiming(1.8, cfg), -1, false);
    opacity1.value = withRepeat(withTiming(0, cfg), -1, false);
    scale2.value = withDelay(900, withRepeat(withTiming(1.8, cfg), -1, false));
    opacity2.value = withDelay(900, withRepeat(withTiming(0, cfg), -1, false));
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  return (
    <View style={styles.wrapper}>
      {/* Ripple rings */}
      <Animated.View style={[styles.ripple, { borderColor: color }, ring1Style]} />
      <Animated.View style={[styles.ripple, { borderColor: color }, ring2Style]} />

      {/* Pin */}
      <View style={[
        styles.pin,
        styles.pinSelected,
        { borderColor: color },
        Platform.OS === 'ios' && { shadowColor: color },
      ]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>

      <View style={[styles.tag, styles.tagSelected, { borderColor: color + '55' }]}>
        <Text style={styles.tagText}>{label}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: 72,
  },

  ripple: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    top: -12,
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
  tagSelected: {
    borderWidth: 1,
  },
  tagText: {
    color: '#e5e5e5',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
