'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { detectLocale, getTranslations, t as translate, type Locale, type Translations } from './index';

interface TranslationContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translations: Translations;
  t: (key: string, replacements?: Record<string, string>) => string;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

interface TranslationProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function TranslationProvider({ children, initialLocale }: TranslationProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale || 'en');
  const [translations, setTranslations] = useState<Translations>(getTranslations(initialLocale || 'en'));

  // Detect locale on mount (client-side only)
  useEffect(() => {
    if (!initialLocale) {
      const detectedLocale = detectLocale();
      setLocale(detectedLocale);
      setTranslations(getTranslations(detectedLocale));
    }
  }, [initialLocale]);

  // Update translations when locale changes
  useEffect(() => {
    setTranslations(getTranslations(locale));
  }, [locale]);

  // Translation function with current locale
  const t = (key: string, replacements?: Record<string, string>): string => {
    return translate(key, locale, replacements);
  };

  return (
    <TranslationContext.Provider value={{ locale, setLocale, translations, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  
  return context;
}

// Convenience hook for just getting the t function
export function useT() {
  const { t } = useTranslation();
  return t;
}
