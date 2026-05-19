'use client';

import type { 
  PersonalizationSettings, 
  PreferenceExport, 
  PreferenceImportResult,
  PreferenceBackup,
  PreferenceTemplate,
  DashboardPersonalization,
  NavigationPersonalization,
  SearchPersonalization,
  NotificationPersonalization,
  AccessibilityPersonalization,
  PrivacyPersonalization,
  LearningPersonalization
} from '@/types/personalization';

// Re-export types for easier importing
export type {
  PersonalizationSettings,
  PreferenceExport,
  PreferenceImportResult,
  PreferenceBackup,
  PreferenceTemplate,
  DashboardPersonalization,
  NavigationPersonalization,
  SearchPersonalization,
  NotificationPersonalization,
  AccessibilityPersonalization,
  PrivacyPersonalization,
  LearningPersonalization
};
import { dashboardCustomizationService } from './dashboardCustomizationService';
import { personalizedNavigationService } from './personalizedNavigationService';
import { preferenceLearningService } from './preferenceLearningService';

class PersonalizationSettingsService {
  private storageKey = 'personalizationSettings';
  private backupKey = 'personalizationBackups';
  private currentVersion = '1.0.0';
  private subscribers: Set<() => void> = new Set();

  // Default templates
  private defaultTemplates: PreferenceTemplate[] = [
    {
      id: 'beginner',
      name: 'Beginner Friendly',
      description: 'Simple layout with helpful hints and guidance',
      category: 'beginner',
      settings: {
        dashboard: {
          theme: 'default',
          layout: 'default',
          compactMode: false,
          showWidgetTitles: true,
          enableAnimations: true,
          refreshInterval: 300,
          hiddenWidgets: [],
          widgetOrder: [],
          customLayouts: [],
          autoSave: true
        },
        navigation: {
          favoriteItems: [],
          hiddenItems: [],
          customOrder: [],
          showIcons: true,
          showDescriptions: true,
          showShortcuts: true,
          groupByCategory: true,
          maxVisibleItems: 6,
          customItems: []
        },
        learning: {
          enabled: true,
          confidenceThreshold: 0.8,
          enabledRules: [],
          autoApply: false,
          feedbackEnabled: true
        }
      }
    },
    {
      id: 'productivity',
      name: 'Productivity Focused',
      description: 'Streamlined interface for maximum efficiency',
      category: 'productivity',
      settings: {
        dashboard: {
          theme: 'compact',
          layout: 'default',
          compactMode: true,
          showWidgetTitles: false,
          enableAnimations: false,
          refreshInterval: 120,
          hiddenWidgets: [],
          widgetOrder: [],
          customLayouts: [],
          autoSave: true
        },
        navigation: {
          favoriteItems: [],
          hiddenItems: [],
          customOrder: [],
          showIcons: false,
          showDescriptions: false,
          showShortcuts: true,
          groupByCategory: false,
          maxVisibleItems: 10,
          customItems: []
        },
        learning: {
          enabled: true,
          confidenceThreshold: 0.6,
          enabledRules: [],
          autoApply: true,
          feedbackEnabled: false
        }
      }
    },
    {
      id: 'accessibility',
      name: 'Accessibility Enhanced',
      description: 'Optimized for screen readers and keyboard navigation',
      category: 'accessibility',
      settings: {
        dashboard: {
          theme: 'default',
          layout: 'default',
          compactMode: false,
          showWidgetTitles: true,
          enableAnimations: false,
          refreshInterval: 600,
          hiddenWidgets: [],
          widgetOrder: [],
          customLayouts: [],
          autoSave: true
        },
        accessibility: {
          highContrast: true,
          reducedMotion: true,
          largeText: true,
          screenReader: true,
          keyboardNavigation: true,
          focusIndicators: true
        },
        navigation: {
          favoriteItems: [],
          hiddenItems: [],
          customOrder: [],
          showIcons: true,
          showDescriptions: true,
          showShortcuts: true,
          groupByCategory: true,
          maxVisibleItems: 8,
          customItems: []
        }
      }
    },
    {
      id: 'advanced',
      name: 'Advanced User',
      description: 'Full customization with all features enabled',
      category: 'advanced',
      settings: {
        dashboard: {
          theme: 'dark',
          layout: 'default',
          compactMode: false,
          showWidgetTitles: true,
          enableAnimations: true,
          refreshInterval: 180,
          hiddenWidgets: [],
          widgetOrder: [],
          customLayouts: [],
          autoSave: true
        },
        navigation: {
          favoriteItems: [],
          hiddenItems: [],
          customOrder: [],
          showIcons: true,
          showDescriptions: false,
          showShortcuts: true,
          groupByCategory: false,
          maxVisibleItems: 12,
          customItems: []
        },
        learning: {
          enabled: true,
          confidenceThreshold: 0.5,
          enabledRules: [],
          autoApply: true,
          feedbackEnabled: true
        }
      }
    }
  ];

  // Get current personalization settings
  getPersonalizationSettings(userId: string): PersonalizationSettings {
    try {
      const stored = localStorage.getItem(`${this.storageKey}_${userId}`);
      if (stored) {
        const settings = JSON.parse(stored);
        return {
          ...this.getDefaultSettings(userId),
          ...settings,
          userId
        };
      }
    } catch (error) {
      console.error('Error loading personalization settings:', error);
    }
    
    return this.getDefaultSettings(userId);
  }

  // Get default settings
  private getDefaultSettings(userId: string): PersonalizationSettings {
    return {
      userId,
      dashboard: {
        theme: 'default',
        layout: 'default',
        compactMode: false,
        showWidgetTitles: true,
        enableAnimations: true,
        refreshInterval: 300,
        hiddenWidgets: [],
        widgetOrder: [],
        customLayouts: [],
        autoSave: true
      },
      navigation: {
        favoriteItems: [],
        hiddenItems: [],
        customOrder: [],
        showIcons: true,
        showDescriptions: false,
        showShortcuts: true,
        groupByCategory: false,
        maxVisibleItems: 8,
        customItems: []
      },
      search: {
        defaultFilters: {},
        savedSearches: [],
        searchHistory: [],
        enableAutocomplete: true,
        enableSuggestions: true,
        maxHistoryItems: 50
      },
      notifications: {
        enablePush: true,
        enableEmail: true,
        enableInApp: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        },
        categories: {
          system: true,
          events: true,
          social: true,
          security: true
        },
        frequency: 'immediate'
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        largeText: false,
        screenReader: false,
        keyboardNavigation: false,
        focusIndicators: false
      },
      privacy: {
        trackingEnabled: true,
        analyticsEnabled: true,
        personalizedContent: true,
        shareUsageData: false,
        cookiePreferences: {
          essential: true,
          analytics: true,
          marketing: false,
          preferences: true
        }
      },
      learning: {
        enabled: true,
        confidenceThreshold: 0.6,
        enabledRules: [],
        autoApply: false,
        feedbackEnabled: true
      },
      lastUpdated: new Date(),
      version: this.currentVersion
    };
  }

  // Save personalization settings
  savePersonalizationSettings(settings: PersonalizationSettings): void {
    try {
      settings.lastUpdated = new Date();
      settings.version = this.currentVersion;
      
      localStorage.setItem(
        `${this.storageKey}_${settings.userId}`,
        JSON.stringify(settings)
      );
      
      // Apply settings to individual services
      this.applySettingsToServices(settings);
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving personalization settings:', error);
    }
  }

  // Update specific section
  updateSection<K extends keyof PersonalizationSettings>(
    userId: string,
    section: K,
    data: PersonalizationSettings[K]
  ): void {
    const settings = this.getPersonalizationSettings(userId);
    settings[section] = data;
    this.savePersonalizationSettings(settings);
  }

  // Apply settings to individual services
  private applySettingsToServices(settings: PersonalizationSettings): void {
    try {
      // Apply dashboard settings
      if (settings.dashboard) {
        const dashboardPrefs = dashboardCustomizationService.getPreferences(settings.userId);
        Object.assign(dashboardPrefs, {
          currentTheme: settings.dashboard.theme,
          currentLayout: settings.dashboard.layout,
          compactMode: settings.dashboard.compactMode,
          showWidgetTitles: settings.dashboard.showWidgetTitles,
          enableAnimations: settings.dashboard.enableAnimations,
          refreshInterval: settings.dashboard.refreshInterval,
          hiddenWidgets: settings.dashboard.hiddenWidgets,
          autoSave: settings.dashboard.autoSave
        });
        dashboardCustomizationService.savePreferences(dashboardPrefs);
      }

      // Apply navigation settings
      if (settings.navigation) {
        personalizedNavigationService.updatePreferences(settings.navigation);
      }

      // Apply learning settings
      if (settings.learning) {
        preferenceLearningService.setLearningEnabled(settings.learning.enabled);
        preferenceLearningService.setConfidenceThreshold(settings.learning.confidenceThreshold);
        
        // Enable/disable rules
        const allRules = preferenceLearningService.getLearningRules();
        allRules.forEach(rule => {
          const shouldEnable = settings.learning.enabledRules.includes(rule.id);
          preferenceLearningService.toggleLearningRule(rule.id, shouldEnable);
        });
      }
    } catch (error) {
      console.error('Error applying settings to services:', error);
    }
  }

  // Export preferences
  exportPreferences(userId: string): PreferenceExport {
    const settings = this.getPersonalizationSettings(userId);
    const exportData: PreferenceExport = {
      settings,
      exportDate: new Date(),
      exportVersion: this.currentVersion,
      checksum: this.generateChecksum(settings)
    };
    
    return exportData;
  }

  // Export as JSON file
  exportAsFile(userId: string, filename?: string): void {
    const exportData = this.exportPreferences(userId);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `personalization-settings-${userId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Import preferences
  importPreferences(userId: string, data: string | PreferenceExport): PreferenceImportResult {
    try {
      let importData: PreferenceExport;
      
      if (typeof data === 'string') {
        importData = JSON.parse(data);
      } else {
        importData = data;
      }

      // Validate import data
      const validation = this.validateImportData(importData);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Invalid import data',
          errors: validation.errors
        };
      }

      // Verify checksum if available
      if (importData.checksum) {
        const calculatedChecksum = this.generateChecksum(importData.settings);
        if (calculatedChecksum !== importData.checksum) {
          return {
            success: false,
            message: 'Data integrity check failed',
            errors: ['Checksum mismatch - data may be corrupted']
          };
        }
      }

      // Create backup before import
      this.createBackup(userId, 'Before Import');

      // Merge with current settings
      const currentSettings = this.getPersonalizationSettings(userId);
      const mergedSettings: PersonalizationSettings = {
        ...currentSettings,
        ...importData.settings,
        userId, // Ensure correct user ID
        lastUpdated: new Date(),
        version: this.currentVersion
      };

      // Save merged settings
      this.savePersonalizationSettings(mergedSettings);

      return {
        success: true,
        message: 'Preferences imported successfully',
        warnings: validation.warnings,
        imported: mergedSettings
      };
    } catch (error) {
      console.error('Error importing preferences:', error);
      return {
        success: false,
        message: 'Failed to import preferences',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Import from file
  importFromFile(userId: string, file: File): Promise<PreferenceImportResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const result = this.importPreferences(userId, content);
          resolve(result);
        } catch (error) {
          resolve({
            success: false,
            message: 'Failed to read file',
            errors: [error instanceof Error ? error.message : 'Unknown error']
          });
        }
      };
      
      reader.onerror = () => {
        resolve({
          success: false,
          message: 'Failed to read file',
          errors: ['File reading error']
        });
      };
      
      reader.readAsText(file);
    });
  }

  // Reset to defaults
  resetToDefaults(userId: string, sections?: (keyof PersonalizationSettings)[]): void {
    const defaultSettings = this.getDefaultSettings(userId);
    
    if (sections && sections.length > 0) {
      // Reset only specific sections
      const currentSettings = this.getPersonalizationSettings(userId);
      sections.forEach(section => {
        if (section !== 'userId' && section !== 'lastUpdated' && section !== 'version') {
          (currentSettings as any)[section] = (defaultSettings as any)[section];
        }
      });
      this.savePersonalizationSettings(currentSettings);
    } else {
      // Reset everything
      this.savePersonalizationSettings(defaultSettings);
    }
  }

  // Apply template
  applyTemplate(userId: string, templateId: string): boolean {
    const template = this.defaultTemplates.find(t => t.id === templateId);
    if (!template) return false;

    // Create backup before applying template
    this.createBackup(userId, `Before applying ${template.name} template`);

    const currentSettings = this.getPersonalizationSettings(userId);
    const updatedSettings: PersonalizationSettings = {
      ...currentSettings,
      ...template.settings,
      userId,
      lastUpdated: new Date(),
      version: this.currentVersion
    };

    this.savePersonalizationSettings(updatedSettings);
    return true;
  }

  // Get available templates
  getTemplates(): PreferenceTemplate[] {
    return [...this.defaultTemplates];
  }

  // Backup management
  createBackup(userId: string, name?: string): string {
    const settings = this.getPersonalizationSettings(userId);
    const backup: PreferenceBackup = {
      id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Backup ${new Date().toLocaleString()}`,
      settings,
      createdAt: new Date(),
      isAutomatic: !name
    };

    const backups = this.getBackups(userId);
    backups.push(backup);
    
    // Keep only last 10 backups
    const sortedBackups = backups?.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    try {
      localStorage.setItem(`${this.backupKey}_${userId}`, JSON.stringify(sortedBackups));
    } catch (error) {
      console.error('Error saving backup:', error);
    }

    return backup.id;
  }

  // Get backups
  getBackups(userId: string): PreferenceBackup[] {
    try {
      const stored = localStorage.getItem(`${this.backupKey}_${userId}`);
      if (stored) {
        const backups = JSON.parse(stored);
        return backups.map((backup: any) => ({
          ...backup,
          createdAt: new Date(backup.createdAt)
        }));
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    }
    return [];
  }

  // Restore from backup
  restoreFromBackup(userId: string, backupId: string): boolean {
    const backups = this.getBackups(userId);
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) return false;

    // Create a backup of current state before restoring
    this.createBackup(userId, 'Before restore');

    this.savePersonalizationSettings(backup.settings);
    return true;
  }

  // Delete backup
  deleteBackup(userId: string, backupId: string): void {
    const backups = this.getBackups(userId).filter(b => b.id !== backupId);
    try {
      localStorage.setItem(`${this.backupKey}_${userId}`, JSON.stringify(backups));
    } catch (error) {
      console.error('Error deleting backup:', error);
    }
  }

  // Validate import data
  private validateImportData(data: PreferenceExport): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.settings) {
      errors.push('Missing settings data');
      return { isValid: false, errors, warnings };
    }

    if (!data.settings.userId) {
      warnings.push('No user ID in import data');
    }

    if (data.exportVersion && data.exportVersion !== this.currentVersion) {
      warnings.push(`Version mismatch: export is ${data.exportVersion}, current is ${this.currentVersion}`);
    }

    // Validate required sections
    const requiredSections = ['dashboard', 'navigation'];
    for (const section of requiredSections) {
      if (!data.settings[section as keyof PersonalizationSettings]) {
        warnings.push(`Missing ${section} settings`);
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Generate checksum for data integrity
  private generateChecksum(settings: PersonalizationSettings): string {
    const str = JSON.stringify(settings, Object.keys(settings).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  // Subscribe to changes
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify subscribers
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }

  // Get settings summary for display
  getSettingsSummary(userId: string): Record<string, any> {
    const settings = this.getPersonalizationSettings(userId);
    return {
      theme: settings.dashboard.theme,
      layout: settings.dashboard.layout,
      learningEnabled: settings.learning.enabled,
      accessibilityEnabled: Object.values(settings.accessibility).some(Boolean),
      customizations: {
        hiddenWidgets: settings.dashboard.hiddenWidgets.length,
        favoriteNavItems: settings.navigation.favoriteItems.length,
        customNavItems: settings.navigation.customItems.length
      },
      lastUpdated: settings.lastUpdated,
      version: settings.version
    };
  }
}

export const personalizationSettingsService = new PersonalizationSettingsService();