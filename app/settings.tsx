import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIVACY_URL = 'https://www.aigma.co/p/688f0dc';
const TERMS_URL = 'https://www.aigma.co/p/3a9cdad';
const SUPPORT_EMAIL = 'genue.luben@gmail.com';
const USER_ID_KEY = 'cellr_user_id';

function generateUserId(): string {
  // RFC4122 v4-ish — good enough as a stable client identifier
  // until RevenueCat / AppHud are wired up.
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) s += '-';
    if (i === 12) s += '4';
    else if (i === 16) s += hex[(Math.random() * 4) | 0 | 8];
    else s += hex[(Math.random() * 16) | 0];
  }
  return s;
}

async function getOrCreateUserId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(USER_ID_KEY);
  if (existing) return existing;
  const id = generateUserId();
  await SecureStore.setItemAsync(USER_ID_KEY, id);
  return id;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber =
    (Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode) ?? null;
  const deviceLabel = `${Platform.OS} ${Platform.Version}`;

  useEffect(() => {
    getOrCreateUserId().then(setUserId);
  }, []);

  const openURL = (url: string) =>
    WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));

  const openLanguageSettings = () => Linking.openSettings();

  const openSupportEmail = () => {
    const subject = `Cellr support — v${appVersion}`;
    const body =
      `\n\n— — — — — — — — — —\n` +
      `User ID: ${userId ?? '(loading)'}\n` +
      `App: Cellr v${appVersion}${buildNumber ? ` (${buildNumber})` : ''}\n` +
      `Device: ${deviceLabel}\n`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  const copyUserId = async () => {
    if (!userId) return;
    await Clipboard.setStringAsync(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
          hitSlop={10}
          activeOpacity={0.6}
        >
          <Ionicons name="chevron-back" size={26} color="#1c1c1e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerBack} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* About */}
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.group}>
          <Row
            icon="lock-closed-outline"
            iconColor="#3b82f6"
            label="Privacy Policy"
            onPress={() => openURL(PRIVACY_URL)}
            showChevron
          />
          <Separator />
          <Row
            icon="document-text-outline"
            iconColor="#8b5cf6"
            label="Terms of Use"
            onPress={() => openURL(TERMS_URL)}
            showChevron
          />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.group}>
          <Row
            icon="globe-outline"
            iconColor="#10b981"
            label="Language"
            value="System"
            onPress={openLanguageSettings}
            showChevron
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.group}>
          <Row
            icon="mail-outline"
            iconColor="#f97316"
            label="Contact Us"
            onPress={openSupportEmail}
            showChevron
          />
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>Cellr v{appVersion}</Text>
          <TouchableOpacity onPress={copyUserId} activeOpacity={0.6}>
            <Text style={styles.footerUserId} selectable>
              {userId ? `${userId}` : '…'}
            </Text>
            <Text style={styles.footerHint}>
              {copied ? 'Copied to clipboard' : 'Tap to copy User ID'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({
  icon,
  iconColor,
  label,
  value,
  onPress,
  showChevron,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.55}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor }]}>
        <Ionicons name={icon} size={17} color="#fff" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {showChevron && (
          <Ionicons name="chevron-forward" size={18} color="#c7c7cc" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const Separator = () => <View style={styles.separator} />;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#f2f2f7',
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1c1c1e',
    letterSpacing: -0.2,
  },

  scroll: {
    paddingTop: 8,
  },

  sectionLabel: {
    fontSize: 13,
    color: '#8e8e93',
    marginHorizontal: 32,
    marginTop: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },

  group: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 12,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: '#1c1c1e',
    letterSpacing: -0.2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 15,
    color: '#8e8e93',
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5ea',
    marginLeft: 54,
  },

  footer: {
    alignItems: 'center',
    marginTop: 36,
    gap: 8,
  },
  footerVersion: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500',
  },
  footerUserId: {
    fontSize: 11,
    color: '#aeaeb2',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    marginTop: 4,
  },
  footerHint: {
    fontSize: 11,
    color: '#c7c7cc',
    textAlign: 'center',
    marginTop: 2,
  },
});
