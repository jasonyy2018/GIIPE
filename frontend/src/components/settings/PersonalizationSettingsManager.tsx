'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  personalizationSettingsService,
  type PersonalizationSettings,
  type PreferenceBackup,
  type PreferenceTemplate,
  type PreferenceImportResult
} from '@/services/personalizationSettingsService';

interface PersonalizationSettingsManagerProps {
  userId: string;
  className?: string;
}

type TabType = 'overview' | 'import-export' | 'templates' | 'backups' | 'reset';

export default function PersonalizationSettingsManager({ 
  userId, 
  className = "" 
}: PersonalizationSettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [settings, setSettings] = useState<PersonalizationSettings | null>(null);
  const [backups, setBackups] = useState<PreferenceBackup[]>([]);
  const [templates, setTemplates] = useState<PreferenceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ show: false, title: '', message: '', action: () => {} });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    
    const unsubscribe = personalizationSettingsService.subscribe(() => {
      loadData();
    });

    return unsubscribe;
  }, [userId]);

  const loadData = () => {
    const currentSettings = personalizationSettingsService.getPersonalizationSettings(userId);
    const userBackups = personalizationSettingsService.getBackups(userId);
    const availableTemplates = personalizationSettingsService.getTemplates();
    
    setSettings(currentSettings);
    setBackups(userBackups);
    setTemplates(availableTemplates);
  };

  const showMessage = (type: 'success' | 'error' | 'warning', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleExportSettings = () => {
    try {
      personalizationSettingsService.exportAsFile(userId);
      showMessage('success', 'Settings exported successfully');
    } catch (error) {
      showMessage('error', 'Failed to export settings');
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const result = await personalizationSettingsService.importFromFile(userId, file);
      
      if (result.success) {
        showMessage('success', result.message);
        if (result.warnings && result.warnings.length > 0) {
          console.warn('Import warnings:', result.warnings);
        }
      } else {
        showMessage('error', result.message);
        if (result.errors) {
          console.error('Import errors:', result.errors);
        }
      }
    } catch (error) {
      showMessage('error', 'Failed to import settings');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setShowConfirmDialog({
      show: true,
      title: 'Apply Template',
      message: `Are you sure you want to apply the "${template.name}" template? This will override your current settings.`,
      action: () => {
        const success = personalizationSettingsService.applyTemplate(userId, templateId);
        if (success) {
          showMessage('success', `Template "${template.name}" applied successfully`);
        } else {
          showMessage('error', 'Failed to apply template');
        }
        setShowConfirmDialog({ show: false, title: '', message: '', action: () => {} });
      }
    });
  };

  const handleCreateBackup = () => {
    const backupName = prompt('Enter a name for this backup (optional):');
    if (backupName === null) return; // User cancelled
    
    const backupId = personalizationSettingsService.createBackup(userId, backupName || undefined);
    if (backupId) {
      showMessage('success', 'Backup created successfully');
      loadData();
    } else {
      showMessage('error', 'Failed to create backup');
    }
  };

  const handleRestoreBackup = (backupId: string) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return;

    setShowConfirmDialog({
      show: true,
      title: 'Restore Backup',
      message: `Are you sure you want to restore the backup "${backup.name}"? This will override your current settings.`,
      action: () => {
        const success = personalizationSettingsService.restoreFromBackup(userId, backupId);
        if (success) {
          showMessage('success', 'Backup restored successfully');
        } else {
          showMessage('error', 'Failed to restore backup');
        }
        setShowConfirmDialog({ show: false, title: '', message: '', action: () => {} });
      }
    });
  };

  const handleDeleteBackup = (backupId: string) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return;

    setShowConfirmDialog({
      show: true,
      title: 'Delete Backup',
      message: `Are you sure you want to delete the backup "${backup.name}"? This action cannot be undone.`,
      action: () => {
        personalizationSettingsService.deleteBackup(userId, backupId);
        showMessage('success', 'Backup deleted successfully');
        loadData();
        setShowConfirmDialog({ show: false, title: '', message: '', action: () => {} });
      }
    });
  };

  const handleResetSection = (sections: (keyof PersonalizationSettings)[]) => {
    const sectionNames = sections.map(s => String(s)).join(', ');
    
    setShowConfirmDialog({
      show: true,
      title: 'Reset Settings',
      message: `Are you sure you want to reset ${sectionNames} to default values? This action cannot be undone.`,
      action: () => {
        personalizationSettingsService.resetToDefaults(userId, sections);
        showMessage('success', `${sectionNames} reset to defaults`);
        setShowConfirmDialog({ show: false, title: '', message: '', action: () => {} });
      }
    });
  };

  const handleResetAll = () => {
    setShowConfirmDialog({
      show: true,
      title: 'Reset All Settings',
      message: 'Are you sure you want to reset ALL personalization settings to default values? This will remove all customizations and cannot be undone.',
      action: () => {
        personalizationSettingsService.resetToDefaults(userId);
        showMessage('success', 'All settings reset to defaults');
        setShowConfirmDialog({ show: false, title: '', message: '', action: () => {} });
      }
    });
  };

  const renderOverviewTab = () => {
    if (!settings) return null;

    const summary = personalizationSettingsService.getSettingsSummary(userId);

    return (
      <div className="space-y-6">
        {/* Current Settings Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <i className="fas fa-palette text-primary mr-2"></i>
                <span className="font-medium text-gray-900">Theme</span>
              </div>
              <span className="text-sm text-gray-600 capitalize">{summary.theme}</span>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <i className="fas fa-th-large text-green-600 mr-2"></i>
                <span className="font-medium text-gray-900">Layout</span>
              </div>
              <span className="text-sm text-gray-600 capitalize">{summary.layout}</span>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <i className="fas fa-brain text-purple-600 mr-2"></i>
                <span className="font-medium text-gray-900">Learning</span>
              </div>
              <span className={`text-sm ${summary.learningEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                {summary.learningEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <i className="fas fa-universal-access text-orange-600 mr-2"></i>
                <span className="font-medium text-gray-900">Accessibility</span>
              </div>
              <span className={`text-sm ${summary.accessibilityEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                {summary.accessibilityEnabled ? 'Enhanced' : 'Standard'}
              </span>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <i className="fas fa-cog text-gray-600 mr-2"></i>
                <span className="font-medium text-gray-900">Customizations</span>
              </div>
              <span className="text-sm text-gray-600">
                {Object.values(summary.customizations).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0)} items
              </span>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <i className="fas fa-clock text-indigo-600 mr-2"></i>
                <span className="font-medium text-gray-900">Last Updated</span>
              </div>
              <span className="text-sm text-gray-600">
                {new Date(summary.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleCreateBackup}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center mb-2">
                <i className="fas fa-save text-primary mr-3"></i>
                <span className="font-medium text-gray-900">Create Backup</span>
              </div>
              <p className="text-sm text-gray-600">Save your current settings</p>
            </button>
            
            <button
              onClick={handleExportSettings}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center mb-2">
                <i className="fas fa-download text-green-600 mr-3"></i>
                <span className="font-medium text-gray-900">Export Settings</span>
              </div>
              <p className="text-sm text-gray-600">Download settings as file</p>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center mb-2">
                <i className="fas fa-upload text-purple-600 mr-3"></i>
                <span className="font-medium text-gray-900">Import Settings</span>
              </div>
              <p className="text-sm text-gray-600">Load settings from file</p>
            </button>
            
            <button
              onClick={() => setActiveTab('templates')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center mb-2">
                <i className="fas fa-magic text-orange-600 mr-3"></i>
                <span className="font-medium text-gray-900">Apply Template</span>
              </div>
              <p className="text-sm text-gray-600">Use predefined configurations</p>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderImportExportTab = () => (
    <div className="space-y-6">
      {/* Export Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Export Settings</h3>
        <p className="text-gray-600 mb-4">
          Download your personalization settings as a JSON file. This includes all your preferences, 
          customizations, and configurations.
        </p>
        
        <button
          onClick={handleExportSettings}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <i className="fas fa-download"></i>
          <span>Export All Settings</span>
        </button>
      </div>

      {/* Import Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Import Settings</h3>
        <p className="text-gray-600 mb-4">
          Upload a previously exported settings file to restore your preferences. 
          A backup will be created automatically before importing.
        </p>
        
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
            <span>{isLoading ? 'Importing...' : 'Import Settings File'}</span>
          </button>
        </div>
      </div>

      {/* Import/Export Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="flex items-center text-lg font-medium text-primary-dark mb-3">
          <i className="fas fa-info-circle mr-2"></i>
          Tips for Import/Export
        </h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>�?Exported files contain all your personalization settings and preferences</p>
          <p>�?Import will merge settings with your current configuration</p>
          <p>�?A backup is automatically created before importing</p>
          <p>�?Settings are validated for integrity during import</p>
          <p>�?You can share settings files with other users</p>
        </div>
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <i className="fas fa-magic text-primary mt-1 mr-3"></i>
          <div>
            <h3 className="text-sm font-medium text-primary-dark">Preference Templates</h3>
            <p className="text-sm text-blue-700 mt-1">
              Choose from predefined configurations optimized for different use cases. 
              A backup will be created before applying any template.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full mt-1 capitalize">
                  {template.category}
                </span>
              </div>
              <button
                onClick={() => handleApplyTemplate(template.id)}
                className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark transition-colors"
              >
                Apply
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">{template.description}</p>
            
            {/* Template Preview */}
            <div className="space-y-2 text-sm">
              <h4 className="font-medium text-gray-700">Includes:</h4>
              <div className="space-y-1 text-gray-600">
                {template.settings.dashboard && (
                  <div className="flex items-center">
                    <i className="fas fa-th-large w-4 mr-2"></i>
                    <span>Dashboard: {template.settings.dashboard.theme} theme, {template.settings.dashboard.compactMode ? 'compact' : 'normal'} mode</span>
                  </div>
                )}
                {template.settings.navigation && (
                  <div className="flex items-center">
                    <i className="fas fa-compass w-4 mr-2"></i>
                    <span>Navigation: {template.settings.navigation.maxVisibleItems} items, {template.settings.navigation.groupByCategory ? 'grouped' : 'flat'}</span>
                  </div>
                )}
                {template.settings.learning && (
                  <div className="flex items-center">
                    <i className="fas fa-brain w-4 mr-2"></i>
                    <span>Learning: {template.settings.learning.enabled ? 'enabled' : 'disabled'}</span>
                  </div>
                )}
                {template.settings.accessibility && (
                  <div className="flex items-center">
                    <i className="fas fa-universal-access w-4 mr-2"></i>
                    <span>Accessibility enhancements</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBackupsTab = () => (
    <div className="space-y-6">
      {/* Create Backup */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Backup Management</h3>
          <button
            onClick={handleCreateBackup}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <i className="fas fa-plus"></i>
            <span>Create Backup</span>
          </button>
        </div>
        
        <p className="text-gray-600">
          Create and manage backups of your personalization settings. 
          Backups are automatically created before major changes.
        </p>
      </div>

      {/* Backups List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Your Backups ({backups.length})
        </h3>
        
        {backups.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-archive text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500 mb-2">No backups yet</p>
            <p className="text-sm text-gray-400">
              Create your first backup to save your current settings
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <i className={`fas ${backup.isAutomatic ? 'fa-robot' : 'fa-user'} text-gray-400`}></i>
                    <div>
                      <h4 className="font-medium text-gray-900">{backup.name}</h4>
                      <p className="text-sm text-gray-600">
                        {backup.createdAt.toLocaleString()}
                        {backup.isAutomatic && (
                          <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            Automatic
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRestoreBackup(backup.id)}
                    className="px-3 py-1 text-sm text-primary border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(backup.id)}
                    className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderResetTab = () => (
    <div className="space-y-6">
      {/* Warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <i className="fas fa-exclamation-triangle text-red-600 mt-1 mr-3"></i>
          <div>
            <h3 className="text-sm font-medium text-red-800">Caution: Reset Operations</h3>
            <p className="text-sm text-red-700 mt-1">
              Reset operations cannot be undone. Consider creating a backup before proceeding.
            </p>
          </div>
        </div>
      </div>

      {/* Section Resets */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Reset Specific Sections</h3>
        <p className="text-gray-600 mb-6">
          Reset individual sections of your personalization settings to their default values.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleResetSection(['dashboard'])}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center mb-2">
              <i className="fas fa-th-large text-primary mr-3"></i>
              <span className="font-medium text-gray-900">Dashboard Settings</span>
            </div>
            <p className="text-sm text-gray-600">Theme, layout, widgets, and display preferences</p>
          </button>
          
          <button
            onClick={() => handleResetSection(['navigation'])}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center mb-2">
              <i className="fas fa-compass text-green-600 mr-3"></i>
              <span className="font-medium text-gray-900">Navigation Settings</span>
            </div>
            <p className="text-sm text-gray-600">Menu preferences, favorites, and custom items</p>
          </button>
          
          <button
            onClick={() => handleResetSection(['learning'])}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center mb-2">
              <i className="fas fa-brain text-purple-600 mr-3"></i>
              <span className="font-medium text-gray-900">Learning Settings</span>
            </div>
            <p className="text-sm text-gray-600">Preference learning and automation rules</p>
          </button>
          
          <button
            onClick={() => handleResetSection(['accessibility'])}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center mb-2">
              <i className="fas fa-universal-access text-orange-600 mr-3"></i>
              <span className="font-medium text-gray-900">Accessibility Settings</span>
            </div>
            <p className="text-sm text-gray-600">Contrast, motion, and assistive features</p>
          </button>
          
          <button
            onClick={() => handleResetSection(['notifications'])}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center mb-2">
              <i className="fas fa-bell text-indigo-600 mr-3"></i>
              <span className="font-medium text-gray-900">Notification Settings</span>
            </div>
            <p className="text-sm text-gray-600">Alert preferences and quiet hours</p>
          </button>
          
          <button
            onClick={() => handleResetSection(['privacy'])}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center mb-2">
              <i className="fas fa-shield-alt text-red-600 mr-3"></i>
              <span className="font-medium text-gray-900">Privacy Settings</span>
            </div>
            <p className="text-sm text-gray-600">Tracking, analytics, and data sharing</p>
          </button>
        </div>
      </div>

      {/* Complete Reset */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-900 mb-4">Complete Reset</h3>
        <p className="text-red-700 mb-6">
          Reset ALL personalization settings to their default values. This will remove all customizations, 
          preferences, and configurations. This action cannot be undone.
        </p>
        
        <button
          onClick={handleResetAll}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Reset All Settings to Defaults
        </button>
      </div>
    </div>
  );

  if (!settings) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Personalization Settings
        </h1>
        <p className="text-gray-600">
          Manage your preferences, import/export settings, and customize your experience.
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-yellow-50 border border-yellow-200 text-yellow-800'
        }`}>
          <div className="flex items-center">
            <i className={`fas ${
              message.type === 'success' ? 'fa-check-circle' :
              message.type === 'error' ? 'fa-exclamation-circle' :
              'fa-exclamation-triangle'
            } mr-2`}></i>
            {message.text}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: 'fas fa-home' },
            { id: 'import-export', label: 'Import/Export', icon: 'fas fa-exchange-alt' },
            { id: 'templates', label: 'Templates', icon: 'fas fa-magic' },
            { id: 'backups', label: 'Backups', icon: 'fas fa-archive' },
            { id: 'reset', label: 'Reset', icon: 'fas fa-undo' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={`${tab.icon} mr-2`}></i>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'import-export' && renderImportExportTab()}
      {activeTab === 'templates' && renderTemplatesTab()}
      {activeTab === 'backups' && renderBackupsTab()}
      {activeTab === 'reset' && renderResetTab()}

      {/* Confirmation Dialog */}
      {showConfirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {showConfirmDialog.title}
            </h3>
            <p className="text-gray-600 mb-6">
              {showConfirmDialog.message}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog({ show: false, title: '', message: '', action: () => {} })}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={showConfirmDialog.action}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}