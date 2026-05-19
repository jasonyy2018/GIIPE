// Personalization types for comprehensive settings management
export interface PersonalizationSettings {
  userId: string;
  dashboard: DashboardPersonalization;
  navigation: NavigationPersonalization;
  search: SearchPersonalization;
  notifications: NotificationPersonalization;
  accessibility: AccessibilityPersonalization;
  privacy: PrivacyPersonalization;
  learning: LearningPersonalization;
  lastUpdated: Date;
  version: string;
}

export interface DashboardPersonalization {
  theme: string;
  layout: string;
  compactMode: boolean;
  showWidgetTitles: boolean;
  enableAnimations: boolean;
  refreshInterval: number;
  hiddenWidgets: string[];
  widgetOrder: string[];
  customLayouts: any[];
  autoSave: boolean;
}

export interface NavigationPersonalization {
  favoriteItems: string[];
  hiddenItems: string[];
  customOrder: string[];
  showIcons: boolean;
  showDescriptions: boolean;
  showShortcuts: boolean;
  groupByCategory: boolean;
  maxVisibleItems: number;
  customItems: any[];
}

export interface SearchPersonalization {
  defaultFilters: Record<string, any>;
  savedSearches: any[];
  searchHistory: string[];
  enableAutocomplete: boolean;
  enableSuggestions: boolean;
  maxHistoryItems: number;
}

export interface NotificationPersonalization {
  enablePush: boolean;
  enableEmail: boolean;
  enableInApp: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  categories: Record<string, boolean>;
  frequency: 'immediate' | 'hourly' | 'daily';
}

export interface AccessibilityPersonalization {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

export interface PrivacyPersonalization {
  trackingEnabled: boolean;
  analyticsEnabled: boolean;
  personalizedContent: boolean;
  shareUsageData: boolean;
  cookiePreferences: Record<string, boolean>;
}

export interface LearningPersonalization {
  enabled: boolean;
  confidenceThreshold: number;
  enabledRules: string[];
  autoApply: boolean;
  feedbackEnabled: boolean;
}

export interface PreferenceExport {
  settings: PersonalizationSettings;
  exportDate: Date;
  exportVersion: string;
  checksum: string;
}

export interface PreferenceImportResult {
  success: boolean;
  message: string;
  warnings?: string[];
  errors?: string[];
  imported?: Partial<PersonalizationSettings>;
}

export interface PreferenceBackup {
  id: string;
  name: string;
  settings: PersonalizationSettings;
  createdAt: Date;
  isAutomatic: boolean;
}

export interface PreferenceTemplate {
  id: string;
  name: string;
  description: string;
  category: 'beginner' | 'advanced' | 'accessibility' | 'productivity';
  settings: Partial<PersonalizationSettings>;
  preview?: string;
}