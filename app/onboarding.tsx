import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { presentPaywall } from '@/src/components/PaywallModal';
import { requestReviewAfterPaywall } from '@/src/utils/rateApp';
import {
  Dimensions,
  FlatList,
  Image,
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
const ACCENT = '#111827';
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

type PermissionKind = 'tracking' | 'notifications' | 'location';

interface IconPage {
  key: string;
  type: 'icon';
  icon: IoniconsName;
  title: string;
  body: string;
  permission?: PermissionKind;
  buttonText?: string;
}

interface ImagePage {
  key: string;
  type: 'image';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  image: any;
  title: string;
  body: string;
  permission?: PermissionKind;
  buttonText?: string;
}

type Page = VideoPage | IconPage | ImagePage;

const PAGES: Page[] = [
  {
    key: 'intro',
    type: 'video',
    title: 'Cell Tower Map',
  },
  {
    key: 'database',
    type: 'image',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    image: require('../assets/images/onboarding-tower.jpg'),
    title: 'Real towers. Verified locations',
    body: 'Carrier coverage maps are guesswork — painted to look good, not to be accurate. Ours cross-references real tower registrations, confidence-rated and refreshed every few days.',
    permission: 'tracking',
    buttonText: 'Continue',
  },
  {
    key: 'antenna',
    type: 'image',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    image: require('../assets/images/onboarding-antenna.jpg'),
    title: 'Stop pointing your\nantenna blind',
    body: 'Get the exact compass bearing to any tower. No guessing, no wasted install. Essential for signal boosters, rooftop antennas, and rural setups.',
    permission: 'notifications',
    buttonText: 'Enable Notifications',
  },
  {
    key: 'terrain',
    type: 'image',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    image: require('../assets/images/onboarding-terrain.jpg'),
    title: 'Hills block signal. We know that',
    body: 'Most apps ignore elevation. Ours accounts for every hill and valley between you and the tower — so you see where signal actually reaches, not just the distance.',
  },
  {
    key: 'location',
    type: 'image',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    image: require('../assets/images/onboarding-location.jpg'),
    title: 'One permission,\nthen you\'re in',
    body: 'Required to find towers near you and calculate distances. Your location is never stored or shared.',
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
    if (isActive) player.play();
    else player.pause();
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

      {/* Gradient: transparent top → deep black bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)', 'rgba(0,0,0,0.96)']}
        locations={[0.3, 0.55, 0.78, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Centered text block in the lower portion */}
      <View style={[styles.videoContent, { paddingBottom: 24 }]}>
        {/* Database badge */}
        <View style={styles.videoBadge}>
          <View style={styles.videoBadgeDot} />
          <Text style={styles.videoBadgeText}>4.5M towers · updated 1 day ago</Text>
        </View>

        {/* Main title */}
        <Text style={styles.videoTitle}>{title}</Text>

        {/* Subtitle / DB info */}
        <Text style={styles.videoSubtitle}>
          Real tower locations in 200+ countries{'\n'}Confidence-rated from real measurements
        </Text>
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

// ─── Image slide ─────────────────────────────────────────────────────────────
function ImageSlide({ page }: { page: ImagePage }) {
  return (
    <View style={[styles.imagePage, { width }]}>
      {/* Image fills all space above the text block */}
      <View style={styles.imageArea}>
        <Image
          source={page.image}
          style={styles.slideImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(243,244,243,0)', '#f3f4f3']}
          locations={[0.92, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>
      {/* Text pinned to the bottom */}
      <View style={styles.imageTextArea}>
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
    // Show paywall on top of the map after onboarding. Fire-and-forget —
    // failures or no-config paywalls just no-op so the user still lands on tabs.
    const promptRate = () => { void requestReviewAfterPaywall(); };
    presentPaywall({
      onClose: promptRate,
      onPurchase: promptRate,
      onRestore: promptRate,
    }).catch(() => {});
  }, []);

  const advance = useCallback(() => {
    flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
  }, [currentIndex]);

  const handleNext = () => {
    if (isLast) { finish(); return; }
    advance();
  };

  const handleRequestTracking = async () => {
    try {
      setRequesting(true);
      await requestTrackingPermissionsAsync();
    } catch {
      // ignore — proceed regardless of outcome
    } finally {
      setRequesting(false);
      advance();
    }
  };

  const handleRequestNotifications = async () => {
    try {
      setRequesting(true);
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
    } catch {
      // ignore — proceed regardless of outcome
    } finally {
      setRequesting(false);
      advance();
    }
  };

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
  const currentPermission =
    currentPage.type === 'icon' || currentPage.type === 'image'
      ? currentPage.permission
      : undefined;

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
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        scrollEnabled={!isLast || !locationGranted}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) =>
          item.type === 'video' ? (
            <VideoSlide isActive={index === currentIndex} title={item.title} />
          ) : item.type === 'image' ? (
            <ImageSlide page={item} />
          ) : (
            <IconSlide page={item} isActive={index === currentIndex} />
          )
        }
      />

      {/* Dots — top of screen, hidden on video slide */}
      {!isVideoSlide && (
        <View style={[styles.dotsTop, { top: insets.top + 16 }]} pointerEvents="none">
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      )}

      {/* Bottom bar — always rendered so FlatList height never shifts */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12, backgroundColor: isVideoSlide ? 'transparent' : BG }]}>
        <View>
          {isVideoSlide ? (
            <TouchableOpacity style={styles.videoNextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.videoNextText}>Get Started →</Text>
            </TouchableOpacity>
          ) : currentPermission === 'tracking' ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={handleRequestTracking}
              disabled={requesting}
              activeOpacity={0.85}
            >
              <Text style={styles.nextText}>
                {requesting ? 'Requesting…' : 'Continue →'}
              </Text>
            </TouchableOpacity>
          ) : currentPermission === 'notifications' ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={handleRequestNotifications}
              disabled={requesting}
              activeOpacity={0.85}
            >
              <Text style={styles.nextText}>
                {requesting ? 'Requesting…' : 'Enable Notifications →'}
              </Text>
            </TouchableOpacity>
          ) : isLast ? (
            locationGranted ? (
              <TouchableOpacity style={styles.nextBtn} onPress={finish} activeOpacity={0.85}>
                <Text style={styles.nextText}>Done ✓</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleRequestLocation}
                disabled={requesting}
                activeOpacity={0.85}
              >
                <Text style={styles.nextText}>
                  {requesting ? 'Requesting…' : 'Allow Location →'}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextText}>Next →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // ── Video slide ──
  videoSlide: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  videoBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  videoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
  videoTitle: {
    fontSize: 36,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  videoSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 0,
  },
  videoNextBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  videoNextText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.1,
  },

  // ── Image slide ──
  imagePage: {
    flex: 1,
    backgroundColor: '#f3f4f3',
  },
  imageArea: {
    flex: 1,
  },
  slideImage: {
    flex: 1,
    width: '100%',
  },
  imageTextArea: {
    paddingHorizontal: 32,
    paddingBottom: 28,
    paddingTop: 20,
  },

  // ── Icon slide ──
  page: { flex: 1, backgroundColor: BG },
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
  },
  title: {
    fontSize: 36,
    fontWeight: '600',
    color: TITLE_COLOR,
    lineHeight: 38,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 18,
    color: BODY_COLOR,
    lineHeight: 26,
  },

  // ── Dots (top overlay) ──
  dotsTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },

  // ── Bottom controls ──
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 20, backgroundColor: ACCENT },
  dotInactive: { width: 6, backgroundColor: '#d1c9bf' },
  nextBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.1,
  },
});
