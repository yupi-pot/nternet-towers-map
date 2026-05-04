import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import esMX from './locales/es-MX.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import nb from './locales/nb.json';
import pl from './locales/pl.json';
import ptBR from './locales/pt-BR.json';
import ru from './locales/ru.json';
import sv from './locales/sv.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'ru', native: 'Русский' },
  { code: 'es-MX', native: 'Español (México)' },
  { code: 'pt-BR', native: 'Português (Brasil)' },
  { code: 'de', native: 'Deutsch' },
  { code: 'fr', native: 'Français' },
  { code: 'it', native: 'Italiano' },
  { code: 'sv', native: 'Svenska' },
  { code: 'pl', native: 'Polski' },
  { code: 'nb', native: 'Norsk bokmål' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const STORAGE_KEY = 'cellr_language';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  'es-MX': { translation: esMX },
  'pt-BR': { translation: ptBR },
  de: { translation: de },
  fr: { translation: fr },
  it: { translation: it },
  sv: { translation: sv },
  pl: { translation: pl },
  nb: { translation: nb },
} as const;

function isSupported(code: string): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

function detectDeviceLanguage(): LanguageCode {
  const tags = Localization.getLocales();
  for (const tag of tags) {
    if (tag.languageTag && isSupported(tag.languageTag)) return tag.languageTag;
    const base = tag.languageCode;
    if (!base) continue;
    if (isSupported(base)) return base;
    // Fold common base codes onto the regional variant we ship.
    if (base === 'es') return 'es-MX';
    if (base === 'pt') return 'pt-BR';
    if (base === 'no' || base === 'nn') return 'nb';
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

// Apply persisted user override after init (async). Falls back to detected device language.
AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    if (stored && isSupported(stored) && stored !== i18n.language) {
      void i18n.changeLanguage(stored);
    }
  })
  .catch(() => {});

export async function setAppLanguage(code: LanguageCode | null): Promise<void> {
  if (code === null) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await i18n.changeLanguage(detectDeviceLanguage());
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, code);
  await i18n.changeLanguage(code);
}

export async function getStoredLanguage(): Promise<LanguageCode | null> {
  const v = await AsyncStorage.getItem(STORAGE_KEY);
  return v && isSupported(v) ? v : null;
}

// Unit system follows the device region, not the chosen UI language —
// a US user reading the app in Spanish still expects feet/miles.
export function getUnitSystem(): 'metric' | 'imperial' {
  const tags = Localization.getLocales();
  for (const tag of tags) {
    const region = tag.regionCode?.toUpperCase();
    if (!region) continue;
    if (region === 'US' || region === 'LR' || region === 'MM') return 'imperial';
    return 'metric';
  }
  return 'metric';
}

export default i18n;
