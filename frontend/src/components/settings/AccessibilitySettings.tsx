/**
 * Accessibility Settings Component
 * Provides comprehensive accessibility configuration interface
 */

'use client';

import React, { useState } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { AccessibilitySettings as AccessibilitySettingsType } from '@/services/accessibilityService';

interface AccessibilitySettingsProps {
  onSettingsChange?: (settings: AccessibilitySettingsType) => void;
}

export default function AccessibilitySettings({ onSettingsChange }: AccessibilitySettingsProps) {
  const {
    settings,
    updateSettings,
    enableHighContrast,
    disableHighContrast,
    enableReducedMotion,
    disableReducedMotion,
    enableLargeText,
    disableLargeText,
    announceToScreenReader,
  } = useAccessibility();

  const [isTestingAnnouncements, setIsTestingAnnouncements] = useState(false);

  const handleSettingChange = (key: keyof AccessibilitySettingsType, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    updateSettings({ [key]: value });
    
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }

    // Announce changes to screen readers
    announceToScreenReader({
      message: `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`,
      priority: 'medium',
      type: 'status'
    });
  };

  const handleHighContrastToggle = () => {
    if (settings.highContrast) {
      disableHighContrast();
    } else {
      enableHighContrast();
    }
  };

  const handleReducedMotionToggle = () => {
    if (settings.reducedMotion) {
      disableReducedMotion();
    } else {
      enableReducedMotion();
    }
  };

  const handleLargeTextToggle = () => {
    if (settings.largeText) {
      disableLargeText();
    } else {
      enableLargeText();
    }
  };

  const testScreenReaderAnnouncement = () => {
    setIsTestingAnnouncements(true);
    announceToScreenReader({
      message: 'This is a test announcement for screen readers. Your accessibility settings are working correctly.',
      priority: 'medium',
      type: 'status'
    });
    
    setTimeout(() => {
      setIsTestingAnnouncements(false);
    }, 2000);
  };

  const resetToDefaults = () => {
    const defaultSettings: Partial<AccessibilitySettingsType> = {
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      screenReader: false,
      keyboardNavigation: true,
      focusIndicators: true,
      announcements: true,
      skipLinks: true,
      ariaLive: 'polite',
      colorBlindnessSupport: false,
      textToSpeech: false,
    };

    updateSettings(defaultSettings);
    
    if (onSettingsChange) {
      onSettingsChange({ ...settings, ...defaultSettings });
    }

    announceToScreenReader({
      message: 'Accessibility settings reset to defaults',
      priority: 'medium',
      type: 'status'
    });
  };

  return (
    <div className="accessibility-settings bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Accessibility Settings
        </h2>
        <p className="text-gray-600">
          Configure accessibility features to improve your experience with the dashboard.
        </p>
      </div>

      {/* Visual Accessibility */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <i className="fas fa-eye mr-2 text-primary" aria-hidden="true"></i>
          Visual Accessibility
        </h3>
        
        <div className="space-y-4">
          {/* High Contrast */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label htmlFor="high-contrast" className="block text-sm font-medium text-gray-900">
                High Contrast Mode
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Increases contrast between text and background for better visibility
              </p>
            </div>
            <button
              id="high-contrast"
              type="button"
              onClick={handleHighContrastToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.highContrast ? 'bg-primary' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={settings.highContrast}
              aria-labelledby="high-contrast"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.highContrast ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Large Text */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label htmlFor="large-text" className="block text-sm font-medium text-gray-900">
                Large Text
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Increases font size throughout the interface for better readability
              </p>
            </div>
            <button
              id="large-text"
              type="button"
              onClick={handleLargeTextToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.largeText ? 'bg-primary' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={settings.largeText}
              aria-labelledby="large-text"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.largeText ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Color Blindness Support */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label htmlFor="colorblind-support" className="block text-sm font-medium text-gray-900">
                Color Blindness Support
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Adds patterns and textures to color-coded elements
              </p>
            </div>
            <button
              id="colorblind-support"
              type="button"
              onClick={() => handleSettingChange('colorBlindnessSupport', !settings.colorBlindnessSupport)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.colorBlindnessSupport ? 'bg-primary' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={settings.colorBlindnessSupport}
              aria-labelledby="colorblind-support"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.colorBlindnessSupport ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Motion and Animation */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <i className="fas fa-play-circle mr-2 text-green-600" aria-hidden="true"></i>
          Motion and Animation
        </h3>
        
        <div className="space-y-4">
          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label htmlFor="reduced-motion" className="block text-sm font-medium text-gray-900">
                Reduced Motion
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Minimizes animations and transitions that may cause discomfort
              </p>
            </div>
            <button
              id="reduced-motion"
              type="button"
              onClick={handleReducedMotionToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.reducedMotion ? 'bg-primary' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={settings.reducedMotion}
              aria-labelledby="reduced-motion"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation and Interaction */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <i className="fas fa-keyboard mr-2 text-purple-600" aria-hidden="true"></i>
          Navigation and Interaction
        </h3>
        
        <div className="space-y-4">
          {/* Keyboard Navigation */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label htmlFor="keyboard-nav" className="block text-sm font-medium text-gray-900">
                Enhanced Keyboard Navigation
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Enables keyboard shortcuts and improved tab navigation
              </p>
            </div>
            <button
              id="keyboard-nav"
              type="button"
              onClick={() => handleSettingChange('keyboardNavigation', !settings.keyboardNavigation)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.keyboardNavigation ? 'bg-primary' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={settings.keyboardNavigation}
              aria-labelledby="keyboard-nav"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.keyboardNavigation ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Focus Indicators */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label htmlFor="focus-indicators" className="block text-sm font-medium text-gray-900">
                Enhanced Focus Indicators
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Shows clear visual indicators when elements are focused
              </p>
            </div>
            <button
              id="focus-indicators"
              type="button"
              onClick={() => handleSettingChange('focusIndicators', !settings.focusIndicators)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.focusIndicators ? 'bg-primary' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={settings.focusIndicators}
              aria-labelledby="focus-indicators"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.focusIndicators ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Skip Links */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label htmlFor="skip-links" className="block text-sm font-medium text-gray-900">
                Skip Navigation Links
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Provides shortcuts to jump to main content areas
              </p>
            </div>
            <button
              id="skip-links"
              type="button"
              onClick={() => handleSettingChange('skipLinks', !settings.skipLinks)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.skipLinks ? 'bg-primary' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={settings.skipLinks}
              aria-labelledby="skip-links"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.skipLinks ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Screen Reader Support */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <i className="fas fa-volume-up mr-2 text-orange-600" aria-hidden="true"></i>
          Screen Reader Support
        </h3>
        
        <div className="space-y-4">
          {/* Screen Reader Mode */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label htmlFor="screen-reader" className="block text-sm font-medium text-gray-900">
                Screen Reader Optimization
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Optimizes interface for screen reader users
              </p>
            </div>
            <button
              id="screen-reader"
              type="button"
              onClick={() => handleSettingChange('screenReader', !settings.screenReader)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.screenReader ? 'bg-primary' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={settings.screenReader}
              aria-labelledby="screen-reader"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.screenReader ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Announcements */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label htmlFor="announcements" className="block text-sm font-medium text-gray-900">
                Live Announcements
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Announces dynamic content changes to screen readers
              </p>
            </div>
            <button
              id="announcements"
              type="button"
              onClick={() => handleSettingChange('announcements', !settings.announcements)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.announcements ? 'bg-primary' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={settings.announcements}
              aria-labelledby="announcements"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.announcements ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Announcement Priority */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <label htmlFor="aria-live" className="block text-sm font-medium text-gray-900 mb-2">
              Announcement Priority
            </label>
            <select
              id="aria-live"
              value={settings.ariaLive}
              onChange={(e) => handleSettingChange('ariaLive', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            >
              <option value="off">Off - No announcements</option>
              <option value="polite">Polite - Announce when convenient</option>
              <option value="assertive">Assertive - Announce immediately</option>
            </select>
            <p className="text-sm text-gray-600 mt-1">
              Controls how urgently screen readers announce changes
            </p>
          </div>

          {/* Test Announcements */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={testScreenReaderAnnouncement}
              disabled={isTestingAnnouncements}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingAnnouncements ? (
                <>
                  <div className="loading-spinner mr-2" aria-hidden="true"></div>
                  Testing...
                </>
              ) : (
                <>
                  <i className="fas fa-volume-up mr-2" aria-hidden="true"></i>
                  Test Screen Reader Announcement
                </>
              )}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Click to test if screen reader announcements are working
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={resetToDefaults}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <i className="fas fa-undo mr-2" aria-hidden="true"></i>
          Reset to Defaults
        </button>
        
        <div className="text-sm text-gray-600 flex items-center">
          <i className="fas fa-info-circle mr-2" aria-hidden="true"></i>
          Settings are automatically saved as you change them
        </div>
      </div>
    </div>
  );
}