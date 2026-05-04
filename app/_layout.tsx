import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import {
  router,
  Stack,
  useNavigationContainerRef,
  usePathname,
  useRootNavigationState,
} from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { adapty } from 'react-native-adapty';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PostHogProvider, usePostHog } from 'posthog-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { ADAPTY_PUBLIC_KEY } from '@/src/config/adapty';
import { PremiumProvider, usePremium } from '@/src/context/PremiumContext';
import { POSTHOG_API_KEY, POSTHOG_HOST } from '@/src/config/posthog';

try {
  adapty.activate(ADAPTY_PUBLIC_KEY, {
    logLevel: __DEV__ ? 'verbose' : 'error',
    __ignoreActivationOnFastRefresh: __DEV__,
  });
} catch (error) {
  console.error('Failed to activate Adapty SDK:', error);
}

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const routingInstrumentation = Sentry.reactNavigationIntegration();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  integrations: [routingInstrumentation],
  tracesSampleRate: 1.0,
});

SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(function RootLayout() {
  const ref = useNavigationContainerRef();

  useEffect(() => {
    if (ref?.current) {
      routingInstrumentation.registerNavigationContainer(ref);
    }
  }, [ref]);

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Check onboarding state independently of font loading.
  // SecureStore uses iOS Keychain which survives reinstalls, so we use a
  // FileSystem marker (cleared on uninstall) to detect fresh installs and
  // reset the onboarding flag.
  useEffect(() => {
    (async () => {
      try {
        const INSTALL_MARKER = `${FileSystem.documentDirectory}.installed`;
        const [markerInfo, val] = await Promise.all([
          FileSystem.getInfoAsync(INSTALL_MARKER),
          SecureStore.getItemAsync('hasSeenOnboarding'),
        ]);
        if (!markerInfo.exists) {
          await SecureStore.deleteItemAsync('hasSeenOnboarding');
          await FileSystem.writeAsStringAsync(INSTALL_MARKER, '1');
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(!val);
        }
      } catch {
        // Fall back gracefully — show onboarding check from SecureStore alone
        const val = await SecureStore.getItemAsync('hasSeenOnboarding').catch(() => null);
        setNeedsOnboarding(!val);
      } finally {
        setOnboardingChecked(true);
      }
    })();
  }, []);

  // Only hide the splash once BOTH fonts and the onboarding check are ready —
  // this prevents the white-screen flash that happens if we hide while returning null.
  useEffect(() => {
    if (fontsLoaded && onboardingChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, onboardingChecked]);

  if (!fontsLoaded || !onboardingChecked) return null;

  return <RootLayoutNav needsOnboarding={needsOnboarding} />;
});

function RootLayoutNav({ needsOnboarding }: { needsOnboarding: boolean }) {
  const colorScheme = useColorScheme();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return; // wait until navigator is mounted
    if (needsOnboarding) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/onboarding' as any);
    }
  }, [needsOnboarding, navigationState?.key]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider
        apiKey={POSTHOG_API_KEY}
        options={{
          host: POSTHOG_HOST,
          captureAppLifecycleEvents: true,
          enableSessionReplay: true,
        }}
      >
        <PremiumProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <PostHogTracker />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen
                name="settings"
                options={{
                  headerShown: false,
                  presentation: 'modal',
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
          </ThemeProvider>
        </PremiumProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}

function PostHogTracker() {
  const posthog = usePostHog();
  const pathname = usePathname();
  const { isPremium, isLoading: premiumLoading } = usePremium();

  useEffect(() => {
    if (!posthog || !pathname) return;
    posthog.screen(pathname);
  }, [posthog, pathname]);

  useEffect(() => {
    if (!posthog || premiumLoading) return;
    posthog.register({ is_premium: isPremium });
    const distinctId = posthog.getDistinctId();
    if (distinctId) {
      posthog.identify(distinctId, { is_premium: isPremium });
    }
  }, [posthog, isPremium, premiumLoading]);

  return null;
}
