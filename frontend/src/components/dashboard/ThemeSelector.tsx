'use client';

import { useState, useEffect } from 'react';
import { dashboardCustomizationService } from '@/services/dashboardCustomizationService';
import type { DashboardTheme, DashboardPreferences } from '@/types/dashboard';

interface ThemeSelectorProps {
  userId: string;
  className?: string;
  showPreview?: boolean;
  onThemeChange?: (theme: DashboardTheme) => void;
}

export default function ThemeSelector({ 
  userId, 
  className = '', 
  showPreview = true,
  onThemeChange 
}: ThemeSelectorProps) {
  const [preferences, setPreferences] = useState<DashboardPreferences | null>(null);
  const [availableThemes, setAvailableThemes] = useState<DashboardTheme[]>([]);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    const unsubscribe = dashboardCustomizationService.subscribe(() => {
      loadData();
    });

    return unsubscribe;
  }, [userId]);

  const loadData = () => {
    const prefs = dashboardCustomizationService.getPreferences(userId);
    const themes = dashboardCustomizationService.getAvailableThemes();
    
    setPreferences(prefs);
    setAvailableThemes(themes);
  };

  const handleThemeSelect = (themeId: string) => {
    dashboardCustomizationService.updatePreference(userId, 'currentTheme', themeId);
    
    const theme = availableThemes.find(t => t.id === themeId);
    if (theme && onThemeChange) {
      onThemeChange(theme);
    }
    
    setPreviewTheme(null);
  };

  const handleThemePreview = (themeId: string | null) => {
    if (showPreview) {
      setPreviewTheme(themeId);
    }
  };

  if (!preferences) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const currentThemeId = previewTheme || preferences.currentTheme;
  const currentTheme = availableThemes.find(t => t.id === currentThemeId);

  return (
    <div className={className}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Theme</h3>
        <p className="text-sm text-gray-600">
          Select a theme to customize the appearance of your dashboard
        </p>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {availableThemes.map(theme => (
          <div
            key={theme.id}
            onClick={() => handleThemeSelect(theme.id)}
            onMouseEnter={() => handleThemePreview(theme.id)}
            onMouseLeave={() => handleThemePreview(null)}
            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
              preferences.currentTheme === theme.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Theme Preview */}
            <div className="mb-3">
              <div 
                className="h-16 rounded-lg p-3 flex items-end"
                style={{ backgroundColor: theme.colors.background }}
              >
                <div className="flex space-x-1">
                  <div 
                    className="w-8 h-4 rounded"
                    style={{ backgroundColor: theme.colors.primary }}
                  ></div>
                  <div 
                    className="w-6 h-4 rounded"
                    style={{ backgroundColor: theme.colors.secondary }}
                  ></div>
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: theme.colors.accent }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Theme Info */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{theme.name}</h4>
              {preferences.currentTheme === theme.id && (
                <div className="flex items-center space-x-1 text-primary">
                  <i className="fas fa-check text-sm"></i>
                  <span className="text-xs font-medium">Active</span>
                </div>
              )}
            </div>

            {/* Color Palette */}
            <div className="flex space-x-1 mb-3">
              {Object.entries(theme.colors).map(([key, color]) => (
                <div
                  key={key}
                  className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: color }}
                  title={key}
                ></div>
              ))}
            </div>

            {/* Theme Properties */}
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex items-center justify-between">
                <span>Spacing:</span>
                <span className="capitalize">{theme.spacing}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Corners:</span>
                <span className="capitalize">{theme.borderRadius}</span>
              </div>
            </div>

            {/* Preview Badge */}
            {previewTheme === theme.id && preferences.currentTheme !== theme.id && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                Preview
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current Theme Details */}
      {currentTheme && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            {previewTheme ? 'Previewing:' : 'Current Theme:'} {currentTheme.name}
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(currentTheme.colors).map(([key, color]) => (
              <div key={key} className="flex items-center space-x-2">
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: color }}
                ></div>
                <div>
                  <div className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {color}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Spacing:</span>
                <span className="ml-2 text-gray-600 capitalize">{currentTheme.spacing}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Border Radius:</span>
                <span className="ml-2 text-gray-600 capitalize">{currentTheme.borderRadius}</span>
              </div>
            </div>
          </div>

          {previewTheme && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Click to apply this theme
              </span>
              <button
                onClick={() => setPreviewTheme(null)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel Preview
              </button>
            </div>
          )}
        </div>
      )}

      {/* Theme Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="flex items-center text-sm font-medium text-primary-dark mb-2">
          <i className="fas fa-lightbulb mr-2"></i>
          Theme Tips
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>�?Hover over themes to preview them before applying</p>
          <p>�?Dark mode is great for low-light environments</p>
          <p>�?Compact themes work well on smaller screens</p>
          <p>�?Spacious themes provide better readability</p>
        </div>
      </div>
    </div>
  );
}