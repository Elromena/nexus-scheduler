import { en, type Translations } from './translations/en';
import { es } from './translations/es';
import { fr } from './translations/fr';
import { de } from './translations/de';
import { pt } from './translations/pt';
import { ru } from './translations/ru';
import { zh } from './translations/zh';
import { ja } from './translations/ja';
import { ko } from './translations/ko';
import { tr } from './translations/tr';
import { it } from './translations/it';

export type { Translations };

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko' | 'tr' | 'it';

export const translations: Record<Locale, Translations> = {
  en,
  es,
  fr,
  de,
  pt,
  ru,
  zh,
  ja,
  ko,
  tr,
  it,
};

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  tr: 'Türkçe',
  it: 'Italiano',
};

// URL path to locale mapping
export const pathToLocale: Record<string, Locale> = {
  'es': 'es',
  'fr': 'fr',
  'de': 'de',
  'pt': 'pt',
  'ru': 'ru',
  'zh': 'zh',
  'ja': 'ja',
  'ko': 'ko',
  'tr': 'tr',
  'it': 'it',
};

/**
 * Detect locale from URL path
 * Looks for patterns like /es/, /fr/, /zh/ in the URL
 */
export function detectLocaleFromPath(path: string): Locale {
  // Check for locale in path (e.g., /es/page, /zh/page)
  const pathParts = path.split('/').filter(Boolean);
  
  for (const part of pathParts) {
    const lowerPart = part.toLowerCase();
    if (lowerPart in pathToLocale) {
      return pathToLocale[lowerPart];
    }
  }
  
  return 'en'; // Default to English
}

/**
 * Detect locale from URL (including parent window if in iframe)
 */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  
  // First, check URL query parameter (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  if (langParam && langParam in translations) {
    return langParam as Locale;
  }
  
  // Check current path
  const pathLocale = detectLocaleFromPath(window.location.pathname);
  if (pathLocale !== 'en') return pathLocale;
  
  // Try to get parent window URL (if in iframe)
  try {
    if (window.parent !== window) {
      const parentPath = window.parent.location.pathname;
      const parentLocale = detectLocaleFromPath(parentPath);
      if (parentLocale !== 'en') return parentLocale;
    }
  } catch {
    // Cross-origin iframe, can't access parent
    // Check referrer instead
    if (document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        const referrerLocale = detectLocaleFromPath(referrerUrl.pathname);
        if (referrerLocale !== 'en') return referrerLocale;
      } catch {
        // Invalid referrer URL
      }
    }
  }
  
  return 'en';
}

/**
 * Get translations for a specific locale
 */
export function getTranslations(locale: Locale = 'en'): Translations {
  return translations[locale] || translations.en;
}

/**
 * Get a nested translation value using dot notation
 * e.g., t('welcome.title') returns the welcome title
 */
export function t(key: string, locale: Locale = 'en', replacements?: Record<string, string>): string {
  const trans = getTranslations(locale);
  const keys = key.split('.');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = trans;
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }
  
  if (typeof value !== 'string') {
    console.warn(`Translation not found: ${key}`);
    return key;
  }
  
  // Apply replacements (e.g., {date} -> actual date)
  if (replacements) {
    for (const [placeholder, replacement] of Object.entries(replacements)) {
      value = value.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacement);
    }
  }
  
  return value;
}
