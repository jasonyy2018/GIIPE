/**
 * Internationalization Service
 * Provides comprehensive multi-language support and localization features
 */

import { 
  Locale, 
  Translation, 
  TranslationNamespace, 
  LocaleData, 
  I18nConfig, 
  TranslationKey,
  DateTimeFormatOptions,
  NumberFormatOptions,
  RelativeTimeFormatOptions,
  PluralRules
} from '@/types/internationalization';

class InternationalizationService {
  private config: I18nConfig;
  private currentLocale: string;
  private localeData: Map<string, LocaleData> = new Map();
  private translations: Map<string, TranslationNamespace> = new Map();
  private formatters: Map<string, Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat> = new Map();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  constructor() {
    this.config = this.getDefaultConfig();
    this.currentLocale = this.config.defaultLocale;
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.initializeService();
    }
  }

  private getDefaultConfig(): I18nConfig {
    return {
      defaultLocale: 'en-US',
      supportedLocales: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'ar-SA', 'he-IL'],
      fallbackLocale: 'en-US',
      namespaces: ['common', 'dashboard', 'navigation', 'forms', 'errors'],
      interpolation: {
        prefix: '{{',
        suffix: '}}',
        escapeValue: true
      },
      pluralization: {
        enabled: true,
        rules: {}
      },
      rtl: {
        enabled: true,
        locales: ['ar-SA', 'he-IL', 'fa-IR', 'ur-PK']
      }
    };
  }

  private async initializeService(): Promise<void> {
    // Load default locale data
    await this.loadLocaleData(this.config.defaultLocale);
    
    // Load user's preferred locale if different
    const userLocale = this.getUserPreferredLocale();
    if (userLocale && userLocale !== this.config.defaultLocale) {
      await this.changeLocale(userLocale);
    }

    // Setup locale change detection (only on client)
    if (typeof window !== 'undefined') {
      this.setupLocaleDetection();
    }
  }

  /**
   * Locale Management
   */
  public async changeLocale(locale: string): Promise<void> {
    if (!this.config.supportedLocales.includes(locale)) {
      console.warn(`Locale ${locale} is not supported. Falling back to ${this.config.fallbackLocale}`);
      locale = this.config.fallbackLocale;
    }

    // Load locale data if not already loaded
    if (!this.localeData.has(locale)) {
      await this.loadLocaleData(locale);
    }

    this.currentLocale = locale;
    this.saveUserPreferredLocale(locale);
    this.applyLocaleSettings(locale);
    
    // Notify listeners of locale change
    document.dispatchEvent(new CustomEvent('locale:changed', { 
      detail: { locale, localeData: this.localeData.get(locale) } 
    }));
  }

  public getCurrentLocale(): string {
    return this.currentLocale;
  }

  public getSupportedLocales(): Locale[] {
    return this.config.supportedLocales?.map(code => this.localeData.get(code)?.locale)
      .filter(Boolean) as Locale[];
  }

  public isRTL(locale?: string): boolean {
    const targetLocale = locale || this.currentLocale;
    return this.config.rtl.locales.includes(targetLocale);
  }

  private async loadLocaleData(locale: string): Promise<void> {
    // Check if already loading
    if (this.loadingPromises.has(locale)) {
      return this.loadingPromises.get(locale);
    }

    const loadPromise = this.performLocaleLoad(locale);
    this.loadingPromises.set(locale, loadPromise);
    
    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(locale);
    }
  }

  private async performLocaleLoad(locale: string): Promise<void> {
    try {
      // Load locale configuration
      const localeConfig = await this.loadLocaleConfig(locale);
      
      // Load translations for all namespaces
      const translations: TranslationNamespace = {};
      for (const namespace of this.config.namespaces) {
        translations[namespace] = await this.loadTranslations(locale, namespace);
      }

      // Store locale data
      this.localeData.set(locale, {
        locale: localeConfig,
        translations
      });

      this.translations.set(locale, translations);
    } catch (error) {
      console.error(`Failed to load locale data for ${locale}:`, error);
      
      // Fallback to default locale if not already loading it
      if (locale !== this.config.fallbackLocale) {
        await this.loadLocaleData(this.config.fallbackLocale);
      }
    }
  }

  private async loadLocaleConfig(locale: string): Promise<Locale> {
    // In a real application, this would load from a server or local files
    // For now, return predefined locale configurations
    const localeConfigs: Record<string, Locale> = {
      'en-US': {
        code: 'en-US',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        region: 'United States',
        currency: 'USD',
        dateFormat: 'MM/dd/yyyy',
        timeFormat: 'h:mm a',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: {
            symbol: '$',
            position: 'before'
          }
        }
      },
      'es-ES': {
        code: 'es-ES',
        name: 'Spanish',
        nativeName: 'Español',
        direction: 'ltr',
        region: 'Spain',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        numberFormat: {
          decimal: ',',
          thousands: '.',
          currency: {
            symbol: '€',
            position: 'after'
          }
        }
      },
      'fr-FR': {
        code: 'fr-FR',
        name: 'French',
        nativeName: 'Français',
        direction: 'ltr',
        region: 'France',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        numberFormat: {
          decimal: ',',
          thousands: ' ',
          currency: {
            symbol: '€',
            position: 'after'
          }
        }
      },
      'de-DE': {
        code: 'de-DE',
        name: 'German',
        nativeName: 'Deutsch',
        direction: 'ltr',
        region: 'Germany',
        currency: 'EUR',
        dateFormat: 'dd.MM.yyyy',
        timeFormat: 'HH:mm',
        numberFormat: {
          decimal: ',',
          thousands: '.',
          currency: {
            symbol: '€',
            position: 'after'
          }
        }
      },
      'ja-JP': {
        code: 'ja-JP',
        name: 'Japanese',
        nativeName: '日本語',
        direction: 'ltr',
        region: 'Japan',
        currency: 'JPY',
        dateFormat: 'yyyy/MM/dd',
        timeFormat: 'HH:mm',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: {
            symbol: '¥',
            position: 'before'
          }
        }
      },
      'ar-SA': {
        code: 'ar-SA',
        name: 'Arabic',
        nativeName: 'العربية',
        direction: 'rtl',
        region: 'Saudi Arabia',
        currency: 'SAR',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: {
            symbol: 'ر.س',
            position: 'after'
          }
        }
      },
      'he-IL': {
        code: 'he-IL',
        name: 'Hebrew',
        nativeName: 'עברית',
        direction: 'rtl',
        region: 'Israel',
        currency: 'ILS',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: {
            symbol: '₪',
            position: 'before'
          }
        }
      }
    };

    return localeConfigs[locale] || localeConfigs[this.config.fallbackLocale];
  }

  private async loadTranslations(locale: string, namespace: string): Promise<Translation> {
    // In a real application, this would load from translation files
    // For now, return sample translations
    const translations: Record<string, Record<string, Translation>> = {
      'en-US': {
        common: {
          'welcome': 'Welcome',
          'loading': 'Loading...',
          'error': 'Error',
          'success': 'Success',
          'cancel': 'Cancel',
          'save': 'Save',
          'delete': 'Delete',
          'edit': 'Edit',
          'close': 'Close',
          'search': 'Search',
          'filter': 'Filter',
          'sort': 'Sort',
          'next': 'Next',
          'previous': 'Previous',
          'page': 'Page',
          'of': 'of',
          'items': 'items',
          'selected': 'selected'
        },
        dashboard: {
          'title': 'Dashboard',
          'overview': 'Overview',
          'statistics': 'Statistics',
          'recent_activity': 'Recent Activity',
          'upcoming_events': 'Upcoming Events',
          'saved_content': 'Saved Content',
          'notifications': 'Notifications',
          'settings': 'Settings',
          'profile': 'Profile',
          'logout': 'Logout'
        },
        navigation: {
          'home': 'Home',
          'dashboard': 'Dashboard',
          'events': 'Events',
          'content': 'Content',
          'network': 'Network',
          'settings': 'Settings',
          'help': 'Help',
          'about': 'About'
        },
        forms: {
          'required_field': 'This field is required',
          'invalid_email': 'Please enter a valid email address',
          'password_too_short': 'Password must be at least 8 characters',
          'passwords_dont_match': 'Passwords do not match',
          'submit': 'Submit',
          'reset': 'Reset'
        },
        errors: {
          'network_error': 'Network error occurred',
          'server_error': 'Server error occurred',
          'not_found': 'Page not found',
          'unauthorized': 'Unauthorized access',
          'forbidden': 'Access forbidden',
          'try_again': 'Please try again'
        }
      },
      'es-ES': {
        common: {
          'welcome': 'Bienvenido',
          'loading': 'Cargando...',
          'error': 'Error',
          'success': 'Éxito',
          'cancel': 'Cancelar',
          'save': 'Guardar',
          'delete': 'Eliminar',
          'edit': 'Editar',
          'close': 'Cerrar',
          'search': 'Buscar',
          'filter': 'Filtrar',
          'sort': 'Ordenar',
          'next': 'Siguiente',
          'previous': 'Anterior',
          'page': 'Página',
          'of': 'de',
          'items': 'elementos',
          'selected': 'seleccionado'
        },
        dashboard: {
          'title': 'Panel de Control',
          'overview': 'Resumen',
          'statistics': 'Estadísticas',
          'recent_activity': 'Actividad Reciente',
          'upcoming_events': 'Próximos Eventos',
          'saved_content': 'Contenido Guardado',
          'notifications': 'Notificaciones',
          'settings': 'Configuración',
          'profile': 'Perfil',
          'logout': 'Cerrar Sesión'
        }
      }
    };

    return translations[locale]?.[namespace] || translations[this.config.fallbackLocale]?.[namespace] || {};
  }

  /**
   * Translation Functions
   */
  public t(key: string, options: Partial<TranslationKey> = {}): string {
    const {
      namespace = 'common',
      defaultValue = key,
      interpolation = {},
      count,
      context
    } = options;

    // Get translation
    let translation = this.getTranslation(key, namespace, context);
    
    // Handle pluralization
    if (count !== undefined && this.config.pluralization.enabled) {
      translation = this.handlePluralization(translation, count, key, namespace);
    }

    // Handle interpolation
    if (Object.keys(interpolation).length > 0) {
      translation = this.interpolateString(translation, interpolation);
    }

    return translation || defaultValue;
  }

  private getTranslation(key: string, namespace: string, context?: string): string {
    const translations = this.translations.get(this.currentLocale);
    if (!translations) return '';

    const namespaceTranslations = translations[namespace];
    if (!namespaceTranslations) return '';

    // Handle context
    const contextKey = context ? `${key}_${context}` : key;
    
    // Handle nested keys (e.g., 'user.profile.name')
    const keys = contextKey.split('.');
    let value: any = namespaceTranslations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return '';
      }
    }

    return typeof value === 'string' ? value : '';
  }

  private handlePluralization(translation: string, count: number, key: string, namespace: string): string {
    // Try to get plural forms
    const pluralKey = `${key}_plural`;
    const zeroKey = `${key}_zero`;
    const oneKey = `${key}_one`;
    const twoKey = `${key}_two`;
    const fewKey = `${key}_few`;
    const manyKey = `${key}_many`;

    if (count === 0) {
      const zeroTranslation = this.getTranslation(zeroKey, namespace);
      if (zeroTranslation) return zeroTranslation;
    }

    if (count === 1) {
      const oneTranslation = this.getTranslation(oneKey, namespace);
      if (oneTranslation) return oneTranslation;
    }

    if (count === 2) {
      const twoTranslation = this.getTranslation(twoKey, namespace);
      if (twoTranslation) return twoTranslation;
    }

    // Check for other plural forms based on locale rules
    const pluralRule = this.getPluralRule(count, this.currentLocale);
    
    if (pluralRule === 'few') {
      const fewTranslation = this.getTranslation(fewKey, namespace);
      if (fewTranslation) return fewTranslation;
    }

    if (pluralRule === 'many') {
      const manyTranslation = this.getTranslation(manyKey, namespace);
      if (manyTranslation) return manyTranslation;
    }

    // Fallback to plural form
    const pluralTranslation = this.getTranslation(pluralKey, namespace);
    if (pluralTranslation) return pluralTranslation;

    return translation;
  }

  private getPluralRule(count: number, locale: string): string {
    try {
      const pr = new Intl.PluralRules(locale);
      return pr.select(count);
    } catch (error) {
      console.warn(`Failed to get plural rule for locale ${locale}:`, error);
      return count === 1 ? 'one' : 'other';
    }
  }

  private interpolateString(template: string, values: Record<string, string | number>): string {
    const { prefix, suffix, escapeValue } = this.config.interpolation;
    
    return template.replace(
      new RegExp(`${this.escapeRegExp(prefix)}([^${this.escapeRegExp(suffix)}]+)${this.escapeRegExp(suffix)}`, 'g'),
      (match, key) => {
        const value = values[key.trim()];
        if (value === undefined || value === null) return match;
        
        const stringValue = String(value);
        return escapeValue ? this.escapeHtml(stringValue) : stringValue;
      }
    );
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Formatting Functions
   */
  public formatDate(date: Date, options: DateTimeFormatOptions = {}): string {
    const locale = options.locale || this.currentLocale;
    const key = `date-${locale}-${JSON.stringify(options)}`;
    
    if (!this.formatters.has(key)) {
      this.formatters.set(key, new Intl.DateTimeFormat(locale, options));
    }
    
    return (this.formatters.get(key) as Intl.DateTimeFormat).format(date);
  }

  public formatTime(date: Date, options: DateTimeFormatOptions = {}): string {
    const timeOptions = { ...options, dateStyle: undefined };
    return this.formatDate(date, timeOptions);
  }

  public formatDateTime(date: Date, options: DateTimeFormatOptions = {}): string {
    return this.formatDate(date, options);
  }

  public formatNumber(number: number, options: NumberFormatOptions = {}): string {
    const locale = options.locale || this.currentLocale;
    const key = `number-${locale}-${JSON.stringify(options)}`;
    
    if (!this.formatters.has(key)) {
      this.formatters.set(key, new Intl.NumberFormat(locale, options));
    }
    
    return (this.formatters.get(key) as Intl.NumberFormat).format(number);
  }

  public formatCurrency(amount: number, currency?: string, options: NumberFormatOptions = {}): string {
    const localeData = this.localeData.get(this.currentLocale);
    const currencyCode = currency || localeData?.locale.currency || 'USD';
    
    return this.formatNumber(amount, {
      ...options,
      style: 'currency',
      currency: currencyCode
    });
  }

  public formatPercent(value: number, options: NumberFormatOptions = {}): string {
    return this.formatNumber(value, {
      ...options,
      style: 'percent'
    });
  }

  public formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, options: RelativeTimeFormatOptions = {}): string {
    const locale = options.locale || this.currentLocale;
    const key = `relative-${locale}-${JSON.stringify(options)}`;
    
    if (!this.formatters.has(key)) {
      this.formatters.set(key, new Intl.RelativeTimeFormat(locale, options));
    }
    
    return (this.formatters.get(key) as Intl.RelativeTimeFormat).format(value, unit);
  }

  /**
   * Utility Functions
   */
  private getUserPreferredLocale(): string | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem('preferred-locale');
    } catch (error) {
      console.warn('Failed to get user preferred locale:', error);
      return null;
    }
  }

  private saveUserPreferredLocale(locale: string): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem('preferred-locale', locale);
    } catch (error) {
      console.warn('Failed to save user preferred locale:', error);
    }
  }

  private applyLocaleSettings(locale: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const localeData = this.localeData.get(locale);
    if (!localeData) return;

    // Set document language
    document.documentElement.lang = locale;
    
    // Set document direction
    document.documentElement.dir = localeData.locale.direction;
    
    // Add/remove RTL class
    if (localeData.locale.direction === 'rtl') {
      document.documentElement.classList.add('rtl');
      document.documentElement.classList.remove('ltr');
    } else {
      document.documentElement.classList.add('ltr');
      document.documentElement.classList.remove('rtl');
    }
  }

  private setupLocaleDetection(): void {
    if (typeof window === 'undefined') return;
    
    // Detect browser language changes
    window.addEventListener('languagechange', () => {
      const browserLocale = navigator.language;
      if (this.config.supportedLocales.includes(browserLocale)) {
        this.changeLocale(browserLocale);
      }
    });
  }

  /**
   * Configuration
   */
  public updateConfig(newConfig: Partial<I18nConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): I18nConfig {
    return { ...this.config };
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.localeData.clear();
    this.translations.clear();
    this.formatters.clear();
    this.loadingPromises.clear();
  }
}

// Export singleton instance
export const i18nService = new InternationalizationService();
export default i18nService;