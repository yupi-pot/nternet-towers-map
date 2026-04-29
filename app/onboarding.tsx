import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useVideoPlayer, VideoView } from 'expo-video';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#f6f2ed';
const ACCENT = '#3b82f6';
const TITLE_COLOR = '#111827';
const BODY_COLOR = '#6b7280';
const DIVIDER = '#e0d9d0';
const ICON_SIZE = 72;

// ─── Pages ────────────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface VideoPage {
  key: 'intro';
  type: 'video';
  title: string;
}

interface IconPage {
  key: string;
  type: 'icon';
  icon: IoniconsName;
  title: string;
  body: string;
  isPermission?: boolean;
}

type Page = VideoPage | IconPage;

const PAGES: Page[] = [
  {
    key: 'intro',
    type: 'video',
    title: 'Cell Tower Map',
  },
  {
    key: 'discover',
    type: 'icon',
    icon: 'radio-outline',
    title: 'Find any tower,\nanywhere.',
    body: 'Real tower locations using cross-referenced data — more accurate than FCC coverage maps.',
  },
  {
    key: 'accurate',
    type: 'icon',
    icon: 'shield-checkmark-outline',
    title: 'Data you can\ntrust.',
    body: 'Every tower carries a confidence rating based on real-world measurements. No ghost towers, no guesses.',
  },
  {
    key: 'navigate',
    type: 'icon',
    icon: 'compass-outline',
    title: 'Point your antenna\nexactly right.',
    body: 'Compass bearing tells you precisely which direction to face — essential for signal boosters and rural installs.',
  },
  {
    key: 'location',
    type: 'icon',
    icon: 'location-outline',
    title: 'One permission\nneeded.',
    body: 'We use your location to find towers nearby. We never store it or share it with anyone.',
    isPermission: true,
  },
];

// ─── Video slide ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VIDEO_SOURCE = require('../assets/onboarding.mov');

function VideoSlide({ isActive, title }: { isActive: boolean; title: string }) {
  const player = useVideoPlayer(VIDEO_SOURCE, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.videoSlide, { width }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      {/* Dark gradient overlay at bottom */}
      <View style={[styles.videoOverlay, { paddingBottom: insets.bottom + 100 }]}>
        <Text style={styles.videoTitle}>{title}</Text>
      </View>
    </View>
  );
}

// ─── Animated icon ─────────────────────────────────────────────────────────────
function PageIcon({ icon, isActive }: { icon: IoniconsName; isActive: boolean }) {
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
      <Ionicons name={icon} size={ICON_SIZE} color={ACCENT} />
    </Animated.View>
  );
}

// ─── Icon slide ───────────────────────────────────────────────────────────────
function IconSlide({ page, isActive }: { page: IconPage; isActive: boolean }) {
  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.iconArea}>
        <PageIcon icon={page.icon} isActive={isActive} />
      </View>
      <View style={styles.divider} />
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
  const insets = useSafeAreaInsets();

  const isLast = currentIndex === PAGES.length - 1;
  const isVideoSlide = currentIndex === 0;

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
    try {
      setRequesting(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      setRequesting(false);
      if (status === 'granted') {
        setLocationGranted(true);
        setTimeout(finish, 500);
      } else {
        finish();
      }
    } catch {
      setRequesting(false);
      finish();
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
    <View style={styles.container}>
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
        renderItem={({ item, index }) =>
          item.type === 'video' ? (
            <VideoSlide isActive={index === currentIndex} title={item.title} />
          ) : (
            <IconSlide page={item} isActive={index === currentIndex} />
          )
        }
      />

      {/* Bottom controls — hidden on video slide (tap to advance) */}
      {isVideoSlide ? (
        <TouchableOpacity
          style={[styles.videoTapArea, { bottom: insets.bottom + 32 }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <View style={styles.videoNextBtn}>
            <Text style={styles.videoNextText}>Get Started →</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
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
            {!isLast ? (
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.skipBtn} />
            )}

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
                  {(currentPage as IconPage)?.isPermission ? 'Allow Location →' : 'Next →'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Video slide ──
  videoSlide: {
    height,
    backgroundColor: '#000',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    background: 'transparent',
  },
  videoTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  videoTapArea: {
    position: 'absolute',
    alignSelf: 'center',
  },
  videoNextBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  videoNextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  // ── Icon slide ──
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
    gap: 16,
    backgroundColor: BG,
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
