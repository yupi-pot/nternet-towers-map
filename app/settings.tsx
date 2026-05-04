import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

import LanguagePickerModal from '@/src/components/LanguagePickerModal';
import { presentPaywall } from '@/src/components/PaywallModal';
import { usePremium } from '@/src/context/PremiumContext';
import { tapLight, tapMedium, tapSuccess } from '@/src/utils/haptics';
import {
  getStoredLanguage,
  LanguageCode,
  setAppLanguage,
  SUPPORTED_LANGUAGES,
} from '@/src/i18n';

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
  const { t } = useTranslation();
  const { isPremium, expiresAt, willRenew } = usePremium();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [storedLang, setStoredLang] = useState<LanguageCode | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber =
    (Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode) ?? null;
  const deviceLabel = `${Platform.OS} ${Platform.Version}`;

  useEffect(() => {
    getOrCreateUserId().then(setUserId);
    getStoredLanguage().then(setStoredLang);
  }, []);

  const openURL = (url: string) =>
    WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));

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
    tapSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const handleLanguageSelect = async (code: LanguageCode | null) => {
    setPickerOpen(false);
    setStoredLang(code);
    await setAppLanguage(code);
  };

  const languageValue = storedLang
    ? SUPPORTED_LANGUAGES.find((l) => l.code === storedLang)?.native ?? storedLang
    : t('settings.languageSystem');

  const formattedExpiry = expiresAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(expiresAt)
    : null;
  const expiryLabel = formattedExpiry
    ? willRenew
      ? t('settings.renewsOn', { date: formattedExpiry })
      : t('settings.expiresOn', { date: formattedExpiry })
    : null;

  const openManageSubscription = () => {
    tapLight();
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header — matches Map/List large title */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.largeTitle}>{t('settings.title')}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => { tapLight(); router.back(); }}
          style={styles.headerClose}
          hitSlop={10}
          activeOpacity={0.6}
        >
          <Ionicons name="close" size={22} color="#1c1c1e" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {!isPremium && (
          <TouchableOpacity
            style={styles.premiumCta}
            onPress={() => { tapMedium(); void presentPaywall(); }}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.premiumCtaText}>{t('settings.getPremium')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}

        {isPremium && (
          <TouchableOpacity
            style={styles.premiumActiveCard}
            onPress={openManageSubscription}
            activeOpacity={0.7}
          >
            <View style={styles.premiumActiveIcon}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </View>
            <View style={styles.premiumActiveBody}>
              <Text style={styles.premiumActiveTitle}>{t('settings.premiumActive')}</Text>
              {expiryLabel && (
                <Text style={styles.premiumActiveSub}>{expiryLabel}</Text>
              )}
            </View>
            <Text style={styles.premiumActiveAction}>
              {t('settings.manageSubscription')}
            </Text>
          </TouchableOpacity>
        )}

        {/* About */}
        <Text style={styles.sectionLabel}>{t('settings.sectionAbout')}</Text>
        <View style={styles.group}>
          <Row
            icon="lock-closed-outline"
            label={t('settings.privacyPolicy')}
            onPress={() => openURL(PRIVACY_URL)}
            showChevron
          />
          <Separator />
          <Row
            icon="document-text-outline"
            label={t('settings.termsOfUse')}
            onPress={() => openURL(TERMS_URL)}
            showChevron
          />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>{t('settings.sectionPreferences')}</Text>
        <View style={styles.group}>
          <Row
            icon="globe-outline"
            label={t('settings.language')}
            value={languageValue}
            onPress={() => setPickerOpen(true)}
            showChevron
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>{t('settings.sectionSupport')}</Text>
        <View style={styles.group}>
          <Row
            icon="mail-outline"
            label={t('settings.contactUs')}
            onPress={openSupportEmail}
            showChevron
          />
        </View>

        {/* Footer */}
        <TouchableOpacity
          style={styles.footer}
          onPress={copyUserId}
          activeOpacity={0.6}
        >
          <Text style={styles.footerText}>Cellr v{appVersion}</Text>
          <Text style={styles.footerText} selectable>
            {copied ? t('settings.copied') : userId ?? '…'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <LanguagePickerModal
        visible={pickerOpen}
        selected={storedLang}
        onClose={() => setPickerOpen(false)}
        onSelect={handleLanguageSelect}
      />
    </View>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({
  icon,
  label,
  value,
  onPress,
  showChevron,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress ? () => { tapLight(); onPress(); } : undefined}
      activeOpacity={0.55}
      disabled={!onPress}
    >
      <Ionicons name={icon} size={22} color="#8e8e93" style={styles.rowIcon} />
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
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 6,
    backgroundColor: '#f2f2f7',
    gap: 4,
  },
  headerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(118,118,128,0.12)',
    marginBottom: 4,
  },
  largeTitle: {
    fontSize: 36,
    fontWeight: '600',
    color: '#1c1c1e',
    letterSpacing: -0.5,
  },

  scroll: {
    paddingTop: 8,
  },

  premiumCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  premiumCtaText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },

  premiumActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  premiumActiveIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumActiveBody: { flex: 1 },
  premiumActiveTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1e',
    letterSpacing: -0.2,
  },
  premiumActiveSub: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  premiumActiveAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
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
    textAlign: 'center',
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
  /* keep separator-indent in sync with row icon + gap (14 + 28 + 12 = 54) */

  footer: {
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#aeaeb2',
    letterSpacing: 0.1,
  },
});
