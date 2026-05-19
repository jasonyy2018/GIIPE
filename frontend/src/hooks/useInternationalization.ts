/**
 * Internationalization Hooks
 * React hooks for multi-language support and localization
 */

import { useState, useEffect, useCallback } from 'react';
import { i18nService } from '@/services/internationalizationService';
import { 
  Locale, 
  TranslationKey, 
  DateTimeFormatOptions, 
  NumberFormatOptions, 
  RelativeTimeFormatOptions 
} from '@/types/internationalization';

export interface UseInternationalizationReturn {
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

export function useInternationalization(): UseInternationalizationReturn {
  const [currentLocale, setCurrentLocale] = useState(i18nService.getCurrentLocale());
  const [supportedLocales, setSupportedLocales] = useState<Locale[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Update state when locale changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const handleLocaleChange = (event: CustomEvent) => {
      setCurrentLocale(event.detail.locale);
      setIsLoading(false);
    };

    document.addEventListener('locale:changed', handleLocaleChange as EventListener);
    
    // Initialize supported locales
    setSupportedLocales(i18nService.getSupportedLocales());

    return () => {
      document.removeEventListener('locale:changed', handleLocaleChange as EventListener);
    };
  }, []);

  const changeLocale = useCallback(async (locale: string) => {
    setIsLoading(true);
    try {
      await i18nService.changeLocale(locale);
    } catch (error) {
      console.error('Failed to change locale:', error);
      setIsLoading(false);
    }
  }, []);

  const t = useCallback((key: string, options?: Partial<TranslationKey>) => {
    return i18nService.t(key, options);
  }, [currentLocale]);

  const formatDate = useCallback((date: Date, options?: DateTimeFormatOptions) => {
    return i18nService.formatDate(date, options);
  }, [currentLocale]);

  const formatTime = useCallback((date: Date, options?: DateTimeFormatOptions) => {
    return i18nService.formatTime(date, options);
  }, [currentLocale]);

  const formatDateTime = useCallback((date: Date, options?: DateTimeFormatOptions) => {
    return i18nService.formatDateTime(date, options);
  }, [currentLocale]);

  const formatNumber = useCallback((number: number, options?: NumberFormatOptions) => {
    return i18nService.formatNumber(number, options);
  }, [currentLocale]);

  const formatCurrency = useCallback((amount: number, currency?: string, options?: NumberFormatOptions) => {
    return i18nService.formatCurrency(amount, currency, options);
  }, [currentLocale]);

  const formatPercent = useCallback((value: number, options?: NumberFormatOptions) => {
    return i18nService.formatPercent(value, options);
  }, [currentLocale]);

  const formatRelativeTime = useCallback((value: number, unit: Intl.RelativeTimeFormatUnit, options?: RelativeTimeFormatOptions) => {
    return i18nService.formatRelativeTime(value, unit, options);
  }, [currentLocale]);

  return {
    currentLocale,
    supportedLocales,
    isRTL: i18nService.isRTL(currentLocale),
    isLoading,
    t,
    changeLocale,
    formatDate,
    formatTime,
    formatDateTime,
    formatNumber,
    formatCurrency,
    formatPercent,
    formatRelativeTime,
  };
}

/**
 * Hook for translation with namespace
 */
export function useTranslation(namespace: string = 'common') {
  const { t: baseT, ...rest } = useInternationalization();
  
  const t = useCallback((key: string, options?: Partial<Omit<TranslationKey, 'namespace'>>) => {
    return baseT(key, { ...options, namespace });
  }, [baseT, namespace]);

  return { t, ...rest };
}

/**
 * Hook for date and time formatting
 */
export function useDateTimeFormatting() {
  const { formatDate, formatTime, formatDateTime, formatRelativeTime, currentLocale } = useInternationalization();

  const formatDateShort = useCallback((date: Date) => {
    return formatDate(date, { dateStyle: 'short' });
  }, [formatDate]);

  const formatDateMedium = useCallback((date: Date) => {
    return formatDate(date, { dateStyle: 'medium' });
  }, [formatDate]);

  const formatDateLong = useCallback((date: Date) => {
    return formatDate(date, { dateStyle: 'long' });
  }, [formatDate]);

  const formatTimeShort = useCallback((date: Date) => {
    return formatTime(date, { timeStyle: 'short' });
  }, [formatTime]);

  const formatTimeMedium = useCallback((date: Date) => {
    return formatTime(date, { timeStyle: 'medium' });
  }, [formatTime]);

  const formatDateTimeShort = useCallback((date: Date) => {
    return formatDateTime(date, { dateStyle: 'short', timeStyle: 'short' });
  }, [formatDateTime]);

  const formatDateTimeMedium = useCallback((date: Date) => {
    return formatDateTime(date, { dateStyle: 'medium', timeStyle: 'medium' });
  }, [formatDateTime]);

  const formatRelativeTimeAuto = useCallback((date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    
    if (Math.abs(diffInSeconds) < 60) {
      return formatRelativeTime(diffInSeconds, 'second');
    } else if (Math.abs(diffInSeconds) < 3600) {
      return formatRelativeTime(Math.floor(diffInSeconds / 60), 'minute');
    } else if (Math.abs(diffInSeconds) < 86400) {
      return formatRelativeTime(Math.floor(diffInSeconds / 3600), 'hour');
    } else if (Math.abs(diffInSeconds) < 2592000) {
      return formatRelativeTime(Math.floor(diffInSeconds / 86400), 'day');
    } else if (Math.abs(diffInSeconds) < 31536000) {
      return formatRelativeTime(Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return formatRelativeTime(Math.floor(diffInSeconds / 31536000), 'year');
    }
  }, [formatRelativeTime]);

  return {
    formatDate,
    formatTime,
    formatDateTime,
    formatDateShort,
    formatDateMedium,
    formatDateLong,
    formatTimeShort,
    formatTimeMedium,
    formatDateTimeShort,
    formatDateTimeMedium,
    formatRelativeTime,
    formatRelativeTimeAuto,
    currentLocale
  };
}

/**
 * Hook for number and currency formatting
 */
export function useNumberFormatting() {
  const { formatNumber, formatCurrency, formatPercent, currentLocale } = useInternationalization();

  const formatInteger = useCallback((number: number) => {
    return formatNumber(number, { maximumFractionDigits: 0 });
  }, [formatNumber]);

  const formatDecimal = useCallback((number: number, decimals: number = 2) => {
    return formatNumber(number, { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    });
  }, [formatNumber]);

  const formatCompactNumber = useCallback((number: number) => {
    return formatNumber(number, { 
      notation: 'compact',
      compactDisplay: 'short'
    });
  }, [formatNumber]);

  const formatPercentage = useCallback((value: number, decimals: number = 1) => {
    return formatPercent(value, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }, [formatPercent]);

  return {
    formatNumber,
    formatInteger,
    formatDecimal,
    formatCompactNumber,
    formatCurrency,
    formatPercent,
    formatPercentage,
    currentLocale
  };
}

/**
 * Hook for RTL layout support
 */
export function useRTLSupport() {
  const { isRTL, currentLocale } = useInternationalization();

  const getTextAlign = useCallback((align: 'left' | 'right' | 'center' = 'left') => {
    if (align === 'center') return 'center';
    if (isRTL) {
      return align === 'left' ? 'right' : 'left';
    }
    return align;
  }, [isRTL]);

  const getFlexDirection = useCallback((direction: 'row' | 'row-reverse' | 'column' | 'column-reverse' = 'row') => {
    if (direction === 'column' || direction === 'column-reverse') return direction;
    if (isRTL) {
      return direction === 'row' ? 'row-reverse' : 'row';
    }
    return direction;
  }, [isRTL]);

  const getMarginStart = useCallback((margin: string) => {
    return isRTL ? { marginRight: margin } : { marginLeft: margin };
  }, [isRTL]);

  const getMarginEnd = useCallback((margin: string) => {
    return isRTL ? { marginLeft: margin } : { marginRight: margin };
  }, [isRTL]);

  const getPaddingStart = useCallback((padding: string) => {
    return isRTL ? { paddingRight: padding } : { paddingLeft: padding };
  }, [isRTL]);

  const getPaddingEnd = useCallback((padding: string) => {
    return isRTL ? { paddingLeft: padding } : { paddingRight: padding };
  }, [isRTL]);

  const getBorderStart = useCallback((border: string) => {
    return isRTL ? { borderRight: border } : { borderLeft: border };
  }, [isRTL]);

  const getBorderEnd = useCallback((border: string) => {
    return isRTL ? { borderLeft: border } : { borderRight: border };
  }, [isRTL]);

  return {
    isRTL,
    currentLocale,
    getTextAlign,
    getFlexDirection,
    getMarginStart,
    getMarginEnd,
    getPaddingStart,
    getPaddingEnd,
    getBorderStart,
    getBorderEnd
  };
}