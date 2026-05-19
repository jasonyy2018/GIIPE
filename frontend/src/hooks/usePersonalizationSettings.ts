'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  personalizationSettingsService,
  type PersonalizationSettings,
  type PreferenceBackup,
  type PreferenceTemplate,
  type PreferenceImportResult
} from '@/services/personalizationSettingsService';

interface UsePersonalizationSettingsOptions {
  userId: string;
  autoLoad?: boolean;
}

interface UsePersonalizationSettingsReturn {
  // State
  settings: PersonalizationSettings | null;
  backups: PreferenceBackup[];
  templates: PreferenceTemplate[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSettings: () => void;
  saveSettings: (settings: PersonalizationSettings) => void;
  updateSection: <K extends keyof PersonalizationSettings>(
    section: K,
    data: PersonalizationSettings[K]
  ) => void;
  
  // Import/Export
  exportSettings: () => void;
  exportAsFile: (filename?: string) => void;
  importFromFile: (file: File) => Promise<PreferenceImportResult>;
  importFromData: (data: string) => PreferenceImportResult;
  
  // Templates
  applyTemplate: (templateId: string) => boolean;
  getTemplate: (templateId: string) => PreferenceTemplate | null;
  
  // Backups
  createBackup: (name?: string) => string | null;
  restoreBackup: (backupId: string) => boolean;
  deleteBackup: (backupId: string) => void;
  
  // Reset
  resetToDefaults: (sections?: (keyof PersonalizationSettings)[]) => void;
  resetSection: (section: keyof PersonalizationSettings) => void;
  
  // Utilities
  getSettingsSummary: () => Record<string, any>;
  refresh: () => void;
}

export function usePersonalizationSettings({
  userId,
  autoLoad = true
}: UsePersonalizationSettingsOptions): UsePersonalizationSettingsReturn {
  const [settings, setSettings] = useState<PersonalizationSettings | null>(null);
  const [backups, setBackups] = useState<PreferenceBackup[]>([]);
  const [templates, setTemplates] = useState<PreferenceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all data
  const loadSettings = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentSettings = personalizationSettingsService.getPersonalizationSettings(userId);
      const userBackups = personalizationSettingsService.getBackups(userId);
      const availableTemplates = personalizationSettingsService.getTemplates();
      
      setSettings(currentSettings);
      setBackups(userBackups);
      setTemplates(availableTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Save settings
  const saveSettings = useCallback((newSettings: PersonalizationSettings) => {
    try {
      setError(null);
      personalizationSettingsService.savePersonalizationSettings(newSettings);
      setSettings(newSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  }, []);

  // Update specific section
  const updateSection = useCallback(<K extends keyof PersonalizationSettings>(
    section: K,
    data: PersonalizationSettings[K]
  ) => {
    try {
      setError(null);
      personalizationSettingsService.updateSection(userId, section as keyof PersonalizationSettings, data);
      loadSettings(); // Reload to get updated settings
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update section');
    }
  }, [userId, loadSettings]);

  // Export settings
  const exportSettings = useCallback(() => {
    try {
      setError(null);
      return personalizationSettingsService.exportPreferences(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export settings');
      return null;
    }
  }, [userId]);

  // Export as file
  const exportAsFile = useCallback((filename?: string) => {
    try {
      setError(null);
      personalizationSettingsService.exportAsFile(userId, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export file');
    }
  }, [userId]);

  // Import from file
  const importFromFile = useCallback(async (file: File): Promise<PreferenceImportResult> => {
    try {
      setError(null);
      setIsLoading(true);
      
      const result = await personalizationSettingsService.importFromFile(userId, file);
      
      if (result.success) {
        loadSettings(); // Reload settings after successful import
      } else {
        setError(result.message);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import file';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      };
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadSettings]);

  // Import from data
  const importFromData = useCallback((data: string): PreferenceImportResult => {
    try {
      setError(null);
      const result = personalizationSettingsService.importPreferences(userId, data);
      
      if (result.success) {
        loadSettings(); // Reload settings after successful import
      } else {
        setError(result.message);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import data';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      };
    }
  }, [userId, loadSettings]);

  // Apply template
  const applyTemplate = useCallback((templateId: string): boolean => {
    try {
      setError(null);
      const success = personalizationSettingsService.applyTemplate(userId, templateId);
      
      if (success) {
        loadSettings(); // Reload settings after applying template
      } else {
        setError('Failed to apply template');
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
      return false;
    }
  }, [userId, loadSettings]);

  // Get template
  const getTemplate = useCallback((templateId: string): PreferenceTemplate | null => {
    return templates.find(t => t.id === templateId) || null;
  }, [templates]);

  // Create backup
  const createBackup = useCallback((name?: string): string | null => {
    try {
      setError(null);
      const backupId = personalizationSettingsService.createBackup(userId, name);
      loadSettings(); // Reload to update backups list
      return backupId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
      return null;
    }
  }, [userId, loadSettings]);

  // Restore backup
  const restoreBackup = useCallback((backupId: string): boolean => {
    try {
      setError(null);
      const success = personalizationSettingsService.restoreFromBackup(userId, backupId);
      
      if (success) {
        loadSettings(); // Reload settings after restore
      } else {
        setError('Failed to restore backup');
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup');
      return false;
    }
  }, [userId, loadSettings]);

  // Delete backup
  const deleteBackup = useCallback((backupId: string) => {
    try {
      setError(null);
      personalizationSettingsService.deleteBackup(userId, backupId);
      loadSettings(); // Reload to update backups list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete backup');
    }
  }, [userId, loadSettings]);

  // Reset to defaults
  const resetToDefaults = useCallback((sections?: (keyof PersonalizationSettings)[]) => {
    try {
      setError(null);
      personalizationSettingsService.resetToDefaults(userId, sections as (keyof PersonalizationSettings)[] | undefined);
      loadSettings(); // Reload settings after reset
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
    }
  }, [userId, loadSettings]);

  // Reset specific section
  const resetSection = useCallback((section: keyof PersonalizationSettings) => {
    resetToDefaults([section]);
  }, [resetToDefaults]);

  // Get settings summary
  const getSettingsSummary = useCallback(() => {
    try {
      return personalizationSettingsService.getSettingsSummary(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get settings summary');
      return {};
    }
  }, [userId]);

  // Refresh all data
  const refresh = useCallback(() => {
    loadSettings();
  }, [loadSettings]);

  // Auto-load on mount and user change
  useEffect(() => {
    if (autoLoad && userId) {
      loadSettings();
    }
  }, [autoLoad, userId, loadSettings]);

  // Subscribe to service changes
  useEffect(() => {
    const unsubscribe = personalizationSettingsService.subscribe(() => {
      loadSettings();
    });

    return unsubscribe;
  }, [loadSettings]);

  return {
    // State
    settings,
    backups,
    templates,
    isLoading,
    error,

    // Actions
    loadSettings,
    saveSettings,
    updateSection,

    // Import/Export
    exportSettings,
    exportAsFile,
    importFromFile,
    importFromData,

    // Templates
    applyTemplate,
    getTemplate,

    // Backups
    createBackup,
    restoreBackup,
    deleteBackup,

    // Reset
    resetToDefaults,
    resetSection,

    // Utilities
    getSettingsSummary,
    refresh
  };
}