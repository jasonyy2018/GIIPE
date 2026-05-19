/**
 * Internationalization Provider Component
 * Provides internationalization context and initialization for the entire application
 */

'use client';

import React, { createContext, useContext, useEffect, ReactNode, type JSX } from 'react';
import { i18nService } from '@/services/internationalizationService';
import { useInternationalization } from '@/hooks/useInternationalization';
import { I18nContextType } from '@/types/internationalization';

const InternationalizationContext = createContext<I18nContextType | null>(null);

export const useI18nContext = () => {
  const context = useContext(InternationalizationContext);
  if (!context) {
    throw new Error('useI18nContext must be used within an InternationalizationProvider');
  }
  return context;
};

interface InternationalizationProviderProps {
  children: ReactNode;
  defaultLocale?: string;
}

export default function InternationalizationProvider({ 
  children, 
  defaultLocale 
}: InternationalizationProviderProps) {
  const i18n = useInternationalization();

  useEffect(() => {
    // Initialize with default locale if provided
    if (defaultLocale && defaultLocale !== i18n.currentLocale) {
      i18n.changeLocale(defaultLocale);
    }

    // Apply initial RTL/LTR styles
    applyDirectionStyles(i18n.isRTL);

    // Listen for locale changes to update styles
    const handleLocaleChange = (event: CustomEvent) => {
      const isRTL = i18nService.isRTL(event.detail.locale);
      applyDirectionStyles(isRTL);
    };

    document.addEventListener('locale:changed', handleLocaleChange as EventListener);

    return () => {
      document.removeEventListener('locale:changed', handleLocaleChange as EventListener);
    };
  }, [defaultLocale, i18n.currentLocale, i18n.isRTL, i18n.changeLocale]);

  const applyDirectionStyles = (isRTL: boolean) => {
    // Apply CSS classes for RTL/LTR support
    if (isRTL) {
      document.body.classList.add('rtl');
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl');
    }

    // Update CSS custom properties for directional spacing
    document.documentElement.style.setProperty('--text-align-start', isRTL ? 'right' : 'left');
    document.documentElement.style.setProperty('--text-align-end', isRTL ? 'left' : 'right');
    document.documentElement.style.setProperty('--margin-start', isRTL ? 'margin-right' : 'margin-left');
    document.documentElement.style.setProperty('--margin-end', isRTL ? 'margin-left' : 'margin-right');
    document.documentElement.style.setProperty('--padding-start', isRTL ? 'padding-right' : 'padding-left');
    document.documentElement.style.setProperty('--padding-end', isRTL ? 'padding-left' : 'padding-right');
    document.documentElement.style.setProperty('--border-start', isRTL ? 'border-right' : 'border-left');
    document.documentElement.style.setProperty('--border-end', isRTL ? 'border-left' : 'border-right');
    document.documentElement.style.setProperty('--flex-direction-row', isRTL ? 'row-reverse' : 'row');
  };

  const contextValue: I18nContextType = {
    currentLocale: i18n.currentLocale,
    supportedLocales: i18n.supportedLocales,
    isRTL: i18n.isRTL,
    isLoading: i18n.isLoading,
    t: i18n.t,
    changeLocale: i18n.changeLocale,
    formatDate: i18n.formatDate,
    formatTime: i18n.formatTime,
    formatDateTime: i18n.formatDateTime,
    formatNumber: i18n.formatNumber,
    formatCurrency: i18n.formatCurrency,
    formatPercent: i18n.formatPercent,
    formatRelativeTime: i18n.formatRelativeTime,
  };

  return (
    <InternationalizationContext.Provider value={contextValue}>
      {children}
    </InternationalizationContext.Provider>
  );
}

/**
 * Higher-order component to add internationalization features to any component
 */
export function withInternationalization<P extends object>(
  Component: React.ComponentType<P>
) {
  return function InternationalizedComponent(props: P) {
    return (
      <InternationalizationProvider>
        <Component {...props} />
      </InternationalizationProvider>
    );
  };
}

/**
 * Locale Selector Component
 */
interface LocaleSelectorProps {
  className?: string;
  showNativeNames?: boolean;
  showFlags?: boolean;
}

export function LocaleSelector({ 
  className = '', 
  showNativeNames = true,
  showFlags = false 
}: LocaleSelectorProps) {
  const { currentLocale, supportedLocales, changeLocale, t, isLoading } = useI18nContext();

  const handleLocaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value;
    changeLocale(newLocale);
  };

  const getFlagEmoji = (locale: string): string => {
    const flagMap: Record<string, string> = {
      'en-US': '🇺🇸',
      'es-ES': '🇪🇸',
      'fr-FR': '🇫🇷',
      'de-DE': '🇩🇪',
      'ja-JP': '🇯🇵',
      'ar-SA': '🇸🇦',
      'he-IL': '🇮🇱'
    };
    return flagMap[locale] || '🌐';
  };

  return (
    <div className={`locale-selector ${className}`}>
      <label htmlFor="locale-select" className="sr-only">
        {t('common.select_language', { defaultValue: 'Select Language' })}
      </label>
      <select
        id="locale-select"
        value={currentLocale}
        onChange={handleLocaleChange}
        disabled={isLoading}
        className="form-select"
        aria-label={t('common.select_language', { defaultValue: 'Select Language' })}
      >
        {supportedLocales.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {showFlags && `${getFlagEmoji(locale.code)} `}
            {showNativeNames ? locale.nativeName : locale.name}
            {!showNativeNames && locale.nativeName !== locale.name && ` (${locale.nativeName})`}
          </option>
        ))}
      </select>
      {isLoading && (
        <div className="loading-indicator ml-2" aria-label={t('common.loading', { defaultValue: 'Loading...' })}>
          <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
        </div>
      )}
    </div>
  );
}

/**
 * Translated Text Component
 */
interface TranslatedTextProps {
  i18nKey: string;
  namespace?: string;
  defaultValue?: string;
  interpolation?: Record<string, string | number>;
  count?: number;
  context?: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children?: ReactNode;
}

export function TranslatedText({
  i18nKey,
  namespace = 'common',
  defaultValue,
  interpolation,
  count,
  context,
  as: Component = 'span',
  className = '',
  children
}: TranslatedTextProps) {
  const { t } = useI18nContext();

  const translatedText = t(i18nKey, {
    namespace,
    defaultValue,
    interpolation,
    count,
    context
  });

  return (
    <Component className={className}>
      {translatedText}
      {children}
    </Component>
  );
}

/**
 * Formatted Date Component
 */
interface FormattedDateProps {
  date: Date;
  format?: 'short' | 'medium' | 'long' | 'full';
  showTime?: boolean;
  timeFormat?: 'short' | 'medium' | 'long' | 'full';
  relative?: boolean;
  className?: string;
}

export function FormattedDate({
  date,
  format = 'medium',
  showTime = false,
  timeFormat = 'short',
  relative = false,
  className = ''
}: FormattedDateProps) {
  const { formatDate, formatDateTime, formatRelativeTime } = useI18nContext();

  const getFormattedDate = () => {
    if (relative) {
      const now = new Date();
      const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
      
      if (Math.abs(diffInSeconds) < 60) {
        return formatRelativeTime(diffInSeconds, 'second');
      } else if (Math.abs(diffInSeconds) < 3600) {
        return formatRelativeTime(Math.floor(diffInSeconds / 60), 'minute');
      } else if (Math.abs(diffInSeconds) < 86400) {
        return formatRelativeTime(Math.floor(diffInSeconds / 3600), 'hour');
      } else {
        return formatRelativeTime(Math.floor(diffInSeconds / 86400), 'day');
      }
    }

    if (showTime) {
      return formatDateTime(date, { 
        dateStyle: format, 
        timeStyle: timeFormat 
      });
    }

    return formatDate(date, { dateStyle: format });
  };

  return (
    <time 
      dateTime={date.toISOString()} 
      className={className}
      title={formatDateTime(date, { dateStyle: 'full', timeStyle: 'medium' })}
    >
      {getFormattedDate()}
    </time>
  );
}

/**
 * Formatted Number Component
 */
interface FormattedNumberProps {
  value: number;
  type?: 'number' | 'currency' | 'percent';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  className?: string;
}

export function FormattedNumber({
  value,
  type = 'number',
  currency,
  minimumFractionDigits,
  maximumFractionDigits,
  className = ''
}: FormattedNumberProps) {
  const { formatNumber, formatCurrency, formatPercent } = useI18nContext();

  const getFormattedNumber = () => {
    const options = {
      minimumFractionDigits,
      maximumFractionDigits
    };

    switch (type) {
      case 'currency':
        return formatCurrency(value, currency, options);
      case 'percent':
        return formatPercent(value, options);
      default:
        return formatNumber(value, options);
    }
  };

  return (
    <span className={className}>
      {getFormattedNumber()}
    </span>
  );
}