import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { en } from './en';
import { fr } from './fr';

const i18n = new I18n({ en, fr });

// Default to device locale, fallback to English
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Detect device language
const deviceLocale = Localization.getLocales()?.[0]?.languageCode || 'en';
i18n.locale = deviceLocale;

export default i18n;
export type TranslationKeys = typeof en;
