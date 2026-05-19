/**
 * Accessibility Hook
 * Provides React integration for accessibility features
 */

import { useState, useEffect, useCallback } from 'react';
import { accessibilityService, AccessibilitySettings, ScreenReaderAnnouncement } from '@/services/accessibilityService';

export interface UseAccessibilityReturn {
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  announceToScreenReader: (announcement: ScreenReaderAnnouncement) => void;
  announcePageChange: (pageName: string) => void;
  announceWidgetUpdate: (widgetName: string, updateType: string) => void;
  announceError: (errorMessage: string) => void;
  enableHighContrast: () => void;
  disableHighContrast: () => void;
  enableReducedMotion: () => void;
  disableReducedMotion: () => void;
  enableLargeText: () => void;
  disableLargeText: () => void;
  focusFirstElement: () => void;
  focusLastElement: () => void;
  restoreFocus: () => void;
  isHighContrast: boolean;
  isReducedMotion: boolean;
  isLargeText: boolean;
  isScreenReaderActive: boolean;
}

export function useAccessibility(): UseAccessibilityReturn {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    accessibilityService.getSettings()
  );

  // Update local state when settings change
  useEffect(() => {
    const currentSettings = accessibilityService.getSettings();
    setSettings(currentSettings);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    accessibilityService.updateSettings(newSettings);
    setSettings(accessibilityService.getSettings());
  }, []);

  const announceToScreenReader = useCallback((announcement: ScreenReaderAnnouncement) => {
    accessibilityService.announceToScreenReader(announcement);
  }, []);

  const announcePageChange = useCallback((pageName: string) => {
    accessibilityService.announcePageChange(pageName);
  }, []);

  const announceWidgetUpdate = useCallback((widgetName: string, updateType: string) => {
    accessibilityService.announceWidgetUpdate(widgetName, updateType);
  }, []);

  const announceError = useCallback((errorMessage: string) => {
    accessibilityService.announceError(errorMessage);
  }, []);

  const enableHighContrast = useCallback(() => {
    accessibilityService.enableHighContrast();
    setSettings(accessibilityService.getSettings());
  }, []);

  const disableHighContrast = useCallback(() => {
    accessibilityService.disableHighContrast();
    setSettings(accessibilityService.getSettings());
  }, []);

  const enableReducedMotion = useCallback(() => {
    accessibilityService.enableReducedMotion();
    setSettings(accessibilityService.getSettings());
  }, []);

  const disableReducedMotion = useCallback(() => {
    accessibilityService.disableReducedMotion();
    setSettings(accessibilityService.getSettings());
  }, []);

  const enableLargeText = useCallback(() => {
    accessibilityService.enableLargeText();
    setSettings(accessibilityService.getSettings());
  }, []);

  const disableLargeText = useCallback(() => {
    accessibilityService.disableLargeText();
    setSettings(accessibilityService.getSettings());
  }, []);

  const focusFirstElement = useCallback(() => {
    accessibilityService.focusFirstElement();
  }, []);

  const focusLastElement = useCallback(() => {
    accessibilityService.focusLastElement();
  }, []);

  const restoreFocus = useCallback(() => {
    accessibilityService.restoreFocus();
  }, []);

  return {
    settings,
    updateSettings,
    announceToScreenReader,
    announcePageChange,
    announceWidgetUpdate,
    announceError,
    enableHighContrast,
    disableHighContrast,
    enableReducedMotion,
    disableReducedMotion,
    enableLargeText,
    disableLargeText,
    focusFirstElement,
    focusLastElement,
    restoreFocus,
    isHighContrast: settings.highContrast,
    isReducedMotion: settings.reducedMotion,
    isLargeText: settings.largeText,
    isScreenReaderActive: settings.screenReader,
  };
}

/**
 * Hook for keyboard navigation
 */
export function useKeyboardNavigation() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  useEffect(() => {
    if (isKeyboardUser) {
      document.body.classList.add('keyboard-navigation-active');
    } else {
      document.body.classList.remove('keyboard-navigation-active');
    }
  }, [isKeyboardUser]);

  return { isKeyboardUser };
}

/**
 * Hook for focus management
 */
export function useFocusManagement() {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);

  const trapFocus = useCallback((containerElement: HTMLElement) => {
    const focusableElements = containerElement.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    containerElement.addEventListener('keydown', handleKeyDown);

    // Focus first element
    firstElement?.focus();

    return () => {
      containerElement.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const saveFocus = useCallback(() => {
    setFocusedElement(document.activeElement as HTMLElement);
  }, []);

  const restoreFocus = useCallback(() => {
    if (focusedElement && document.contains(focusedElement)) {
      focusedElement.focus();
    }
  }, [focusedElement]);

  return {
    trapFocus,
    saveFocus,
    restoreFocus,
    focusedElement,
  };
}

/**
 * Hook for screen reader announcements
 */
export function useScreenReaderAnnouncements() {
  const { announceToScreenReader } = useAccessibility();

  const announceStatus = useCallback((message: string) => {
    announceToScreenReader({
      message,
      priority: 'medium',
      type: 'status'
    });
  }, [announceToScreenReader]);

  const announceAlert = useCallback((message: string) => {
    announceToScreenReader({
      message,
      priority: 'high',
      type: 'alert'
    });
  }, [announceToScreenReader]);

  const announceNavigation = useCallback((message: string) => {
    announceToScreenReader({
      message,
      priority: 'medium',
      type: 'navigation'
    });
  }, [announceToScreenReader]);

  const announceContent = useCallback((message: string) => {
    announceToScreenReader({
      message,
      priority: 'low',
      type: 'content'
    });
  }, [announceToScreenReader]);

  return {
    announceStatus,
    announceAlert,
    announceNavigation,
    announceContent,
  };
}