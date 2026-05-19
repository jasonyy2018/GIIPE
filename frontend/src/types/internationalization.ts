/**
 * Internationalization Types
 * Defines types for multi-language support and localization
 */

export interface Locale {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  region: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: {
      symbol: string;
      position: 'before' | 'after';
    };
  };
}

export interface Translation {
  [key: string]: string | Translation;
}

export interface TranslationNamespace {
  [namespace: string]: Translation;
}

export interface LocaleData {
  locale: Locale;
  translations: TranslationNamespace;
}

export interface DateTimeFormatOptions {
  locale?: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  weekday?: 'long' | 'short' | 'narrow';
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  timeZoneName?: 'long' | 'short';
}

export interface NumberFormatOptions {
  locale?: string;
  style?: 'decimal' | 'currency' | 'percent';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  minimumIntegerDigits?: number;
  useGrouping?: boolean;
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  compactDisplay?: 'short' | 'long';
}

export interface RelativeTimeFormatOptions {
  locale?: string;
  numeric?: 'always' | 'auto';
  style?: 'long' | 'short' | 'narrow';
}

export interface PluralRules {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface TranslationKey {
  key: string;
  namespace?: string;
  defaultValue?: string;
  interpolation?: Record<string, string | number>;
  count?: number;
  context?: string;
}

export interface I18nConfig {
  defaultLocale: string;
  supportedLocales: string[];
  fallbackLocale: string;
  namespaces: string[];
  interpolation: {
    prefix: string;
    suffix: string;
    escapeValue: boolean;
  };
  pluralization: {
    enabled: boolean;
    rules: Record<string, PluralRules>;
  };
  rtl: {
    enabled: boolean;
    locales: string[];
  };
}

export interface I18nContextType {
  currentLocale: string;
  supportedLocales: Locale[];
  isRTL: boolean;
  isLoading: boolean;
  t: (key: string, options?: Partial<TranslationKey>) => string;
  changeLocale: (locale: string) => Promise<void>;
  formatDate: (date: Date, options?: DateTimeFormatOptions) => string;
  formatTime: (date: Date, options?: DateTimeFormatOptions) => string;
  formatDateTime: (date: Date, options?: DateTimeFormatOptions) => string;
  formatNumber: (number: number, options?: NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string, options?: NumberFormatOptions) => string;
  formatPercent: (value: number, options?: NumberFormatOptions) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit, options?: RelativeTimeFormatOptions) => string;
}