import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  Compass,
  MapPin,
  Radio,
  ShieldCheck,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#f6f2ed';
const ACCENT = '#3b82f6';
const TITLE_COLOR = '#111827';
const BODY_COLOR = '#6b7280';
const DIVIDER = '#e0d9d0';
const ICON_SIZE = 72;

// ─── Pages ────────────────────────────────────────────────────────────────────
interface Page {
  key: string;
  Icon: React.FC<{ size: number; color: string; strokeWidth: number }>;
  title: string;
  body: string;
  isPermission?: boolean;
}

const PAGES: Page[] = [
  {
    key: 'discover',
    Icon: Radio,
    title: 'Find any tower,\nanywhere.',
    body: 'Real tower locations using cross-referenced data — more accurate than FCC coverage maps.',
  },
  {
    key: 'accurate',
    Icon: ShieldCheck,
    title: 'Data you can\ntrust.',
    body: 'Every tower carries a confidence rating based on real-world measurements. No ghost towers, no guesses.',
  },
  {
    key: 'navigate',
    Icon: Compass,
    title: 'Point your antenna\nexactly right.',
    body: 'Compass bearing tells you precisely which direction to face — essential for signal boosters and rural installs.',
  },
  {
    key: 'location',
    Icon: MapPin,
    title: 'One permission\nneeded.',
    body: 'We use your location to find towers nearby. We never store it or share it with anyone.',
    isPermission: true,
  },
];

// ─── Animated icon ─────────────────────────────────────────────────────────────
function PageIcon({
  Icon,
  isActive,
}: {
  Icon: Page['Icon'];
  isActive: boolean;
}) {
  const scale = useSharedValue(0.65);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1, { damping: 14, stiffness: 160, mass: 0.8 });
      opacity.value = withTiming(1, { duration: 280 });
    } else {
      scale.value = withTiming(0.65, { duration: 180 });
      opacity.value = withTiming(0, { duration: 180 });
    }
  }, [isActive, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.iconWrap, style]}>
      <Icon size={ICON_SIZE} color={ACCENT} strokeWidth={1.5} />
    </Animated.View>
  );
}

// ─── Single page ──────────────────────────────────────────────────────────────
function OnboardingPage({
  page,
  isActive,
}: {
  page: Page;
  isActive: boolean;
}) {
  return (
    <View style={[styles.page, { width }]}>
      {/* Icon area */}
      <View style={styles.iconArea}>
        <PageIcon Icon={page.Icon} isActive={isActive} />
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Text area */}
      <View style={styles.textArea}>
        <Text style={styles.title}>{page.title}</Text>
        <Text style={styles.body}>{page.body}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [locationGranted, setLocationGranted] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isLast = currentIndex === PAGES.length - 1;

  const finish = useCallback(async () => {
    await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
    router.replace('/(tabs)' as never);
  }, []);

  const handleNext = () => {
    if (isLast) { finish(); return; }
    flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
  };

  const handleSkip = () => finish();

  const handleRequestLocation = async () => {
    setRequesting(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    setRequesting(false);
    if (status === 'granted') {
      setLocationGranted(true);
      setTimeout(finish, 500);
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  const currentPage = PAGES[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={PAGES}
        keyExtractor={(p) => p.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!isLast || !locationGranted}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <OnboardingPage page={item} isActive={index === currentIndex} />
        )}
      />

      {/* Bottom controls */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          {/* Skip — hidden on last page */}
          {!isLast ? (
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipBtn} />
          )}

          {/* Next / Done / Location */}
          {isLast ? (
            locationGranted ? (
              <TouchableOpacity style={styles.nextBtn} onPress={finish} activeOpacity={0.7}>
                <Text style={[styles.nextText, { color: '#22c55e' }]}>Done ✓</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleRequestLocation}
                disabled={requesting}
                activeOpacity={0.7}
              >
                <Text style={styles.nextText}>
                  {requesting ? 'Requesting…' : 'Allow Location →'}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.7}>
              <Text style={styles.nextText}>
                {currentPage?.isPermission ? 'Allow Location →' : 'Next →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Page ──
  page: { flex: 1 },
  iconArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginHorizontal: 32,
    marginBottom: 32,
  },
  textArea: {
    paddingHorizontal: 32,
    paddingBottom: 16,
    minHeight: 160,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TITLE_COLOR,
    lineHeight: 34,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    color: BODY_COLOR,
    lineHeight: 24,
  },

  // ── Bottom controls ──
  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 12,
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 20, backgroundColor: ACCENT },
  dotInactive: { width: 6, backgroundColor: '#d1c9bf' },

  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    backgroundColor: '#e8e2da',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 22,
    minWidth: 80,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  nextBtn: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
});
