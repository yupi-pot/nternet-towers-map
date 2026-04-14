import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PAGES = [
  {
    key: 'welcome',
    emoji: '📡',
    title: 'Find any cell tower,\nanywhere.',
    body: 'Cellr shows you real tower locations using cross-referenced data — not the inaccurate estimates on FCC maps.',
    accent: '#3b82f6',
  },
  {
    key: 'accurate',
    emoji: '🎯',
    title: 'Accuracy you can\ntrust.',
    body: 'Every tower has a confidence rating based on how many real-world measurements back it up. No more ghost towers.',
    accent: '#22c55e',
  },
  {
    key: 'compass',
    emoji: '🧭',
    title: 'Point your antenna\nexactly right.',
    body: 'Compass bearing tells you precisely which direction to face — critical for signal boosters, RV setup, and rural installs.',
    accent: '#f59e0b',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [locationGranted, setLocationGranted] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isLast = currentIndex === PAGES.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleFinish();
      return;
    }
    const next = currentIndex + 1;
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
  };

  const handleFinish = async () => {
    await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
    router.replace('/(tabs)');
  };

  const handleRequestLocation = async () => {
    setRequesting(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(status === 'granted');
    setRequesting(false);
    if (status === 'granted') {
      // Small delay so user sees the granted state
      setTimeout(handleFinish, 600);
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const currentAccent = PAGES[currentIndex]?.accent ?? '#3b82f6';

  return (
    <SafeAreaView style={styles.container}>
      {/* Page slider */}
      <FlatList
        ref={flatListRef}
        data={PAGES}
        keyExtractor={(p) => p.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled={!isLast}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={[styles.title, { color: item.accent }]}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex
                ? [styles.dotActive, { backgroundColor: currentAccent }]
                : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Bottom actions */}
      <View style={styles.bottom}>
        {isLast ? (
          <>
            {!locationGranted ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: currentAccent }]}
                onPress={handleRequestLocation}
                disabled={requesting}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {requesting ? 'Requesting…' : '📍 Enable Location'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.primaryBtn, { backgroundColor: '#22c55e' }]}>
                <Text style={styles.primaryBtnText}>Location enabled ✓</Text>
              </View>
            )}
            <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: currentAccent }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  page: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 20,
  },
  body: {
    fontSize: 17,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  dot: { borderRadius: 4, height: 8 },
  dotActive: { width: 24 },
  dotInactive: { width: 8, backgroundColor: '#334155' },

  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 15, color: '#475569' },
});
