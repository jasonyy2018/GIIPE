/**
 * Dynamic Content Accessibility Component
 * Provides accessibility features for dynamically changing content
 */

'use client';

import React, { useEffect, useRef, ReactNode } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { accessibilityService } from '@/services/accessibilityService';

interface DynamicContentAccessibilityProps {
  children: ReactNode;
  contentType: 'widget' | 'list' | 'form' | 'navigation' | 'content';
  label: string;
  announceChanges?: boolean;
  liveRegion?: 'off' | 'polite' | 'assertive';
  className?: string;
}

export default function DynamicContentAccessibility({
  children,
  contentType,
  label,
  announceChanges = true,
  liveRegion = 'polite',
  className = ''
}: DynamicContentAccessibilityProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings, announceToScreenReader } = useAccessibility();
  const previousContentRef = useRef<string>('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Setup accessibility attributes
    setupAccessibilityAttributes(container);

    // Setup keyboard navigation
    if (settings.keyboardNavigation) {
      setupKeyboardNavigation(container);
    }

    // Monitor content changes
    if (announceChanges && settings.announcements) {
      const observer = setupContentObserver(container);
      return () => observer.disconnect();
    }
  }, [settings.keyboardNavigation, settings.announcements, announceChanges, contentType, label]);

  const setupAccessibilityAttributes = (container: HTMLElement) => {
    // Set appropriate role based on content type
    const roleMap = {
      widget: 'region',
      list: 'list',
      form: 'form',
      navigation: 'navigation',
      content: 'main'
    };

    container.setAttribute('role', roleMap[contentType]);
    container.setAttribute('aria-label', label);
    
    if (liveRegion !== 'off') {
      container.setAttribute('aria-live', liveRegion);
      container.setAttribute('aria-atomic', 'false');
    }

    // Add tabindex for focus management
    if (contentType === 'widget') {
      container.setAttribute('tabindex', '-1');
    }
  };

  const setupKeyboardNavigation = (container: HTMLElement) => {
    container.addEventListener('keydown', handleKeyNavigation);
  };

  const handleKeyNavigation = (event: KeyboardEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case 'ArrowDown':
        if (contentType === 'list' || contentType === 'widget') {
          event.preventDefault();
          const nextIndex = (currentIndex + 1) % focusableElements.length;
          focusableElements[nextIndex].focus();
          announceNavigation(focusableElements[nextIndex], 'next');
        }
        break;

      case 'ArrowUp':
        if (contentType === 'list' || contentType === 'widget') {
          event.preventDefault();
          const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
          focusableElements[prevIndex].focus();
          announceNavigation(focusableElements[prevIndex], 'previous');
        }
        break;

      case 'Home':
        if (contentType === 'list' || contentType === 'widget') {
          event.preventDefault();
          focusableElements[0].focus();
          announceNavigation(focusableElements[0], 'first');
        }
        break;

      case 'End':
        if (contentType === 'list' || contentType === 'widget') {
          event.preventDefault();
          const lastElement = focusableElements[focusableElements.length - 1];
          lastElement.focus();
          announceNavigation(lastElement, 'last');
        }
        break;

      case 'Enter':
      case ' ':
        if (contentType === 'widget' && event.target === container) {
          event.preventDefault();
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          }
        }
        break;
    }
  };

  const announceNavigation = (element: HTMLElement, direction: string) => {
    const elementLabel = getElementLabel(element);
    announceToScreenReader({
      message: `${direction} item: ${elementLabel}`,
      priority: 'low',
      type: 'navigation'
    });
  };

  const getElementLabel = (element: HTMLElement): string => {
    return element.getAttribute('aria-label') ||
           element.getAttribute('title') ||
           element.textContent?.trim() ||
           'unlabeled element';
  };

  const setupContentObserver = (container: HTMLElement) => {
    const observer = new MutationObserver((mutations) => {
      let hasSignificantChanges = false;
      let addedCount = 0;
      let removedCount = 0;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          addedCount += mutation.addedNodes.length;
          removedCount += mutation.removedNodes.length;
          hasSignificantChanges = true;
        } else if (mutation.type === 'characterData') {
          hasSignificantChanges = true;
        }
      });

      if (hasSignificantChanges) {
        announceContentChanges(addedCount, removedCount);
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return observer;
  };

  const announceContentChanges = (addedCount: number, removedCount: number) => {
    let message = '';
    
    if (addedCount > 0 && removedCount > 0) {
      message = `${label} updated: ${addedCount} items added, ${removedCount} items removed`;
    } else if (addedCount > 0) {
      message = `${label} updated: ${addedCount} new ${addedCount === 1 ? 'item' : 'items'} added`;
    } else if (removedCount > 0) {
      message = `${label} updated: ${removedCount} ${removedCount === 1 ? 'item' : 'items'} removed`;
    } else {
      message = `${label} content updated`;
    }

    announceToScreenReader({
      message,
      priority: 'medium',
      type: 'content'
    });
  };

  return (
    <div
      ref={containerRef}
      className={`dynamic-content-accessibility ${className}`}
      data-content-type={contentType}
    >
      {children}
    </div>
  );
}

/**
 * Live Region Component for Announcements
 */
interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  className?: string;
}

export function LiveRegion({ message, priority = 'polite', className = '' }: LiveRegionProps) {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {message}
    </div>
  );
}

/**
 * Focus Management Component
 */
interface FocusManagerProps {
  children: ReactNode;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  initialFocus?: string; // CSS selector
}

export function FocusManager({ 
  children, 
  trapFocus = false, 
  restoreFocus = false,
  initialFocus 
}: FocusManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Save current focus if restore is enabled
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Set initial focus
    if (initialFocus) {
      const initialElement = container.querySelector(initialFocus) as HTMLElement;
      if (initialElement) {
        initialElement.focus();
      }
    }

    // Setup focus trap
    if (trapFocus) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          const focusableElements = container.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) as NodeListOf<HTMLElement>;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

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

      container.addEventListener('keydown', handleKeyDown);

      return () => {
        container.removeEventListener('keydown', handleKeyDown);
        
        // Restore focus if enabled
        if (restoreFocus && previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [trapFocus, restoreFocus, initialFocus]);

  return (
    <div ref={containerRef} className="focus-manager">
      {children}
    </div>
  );
}

/**
 * Accessible Status Component
 */
interface AccessibleStatusProps {
  status: 'loading' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  showVisually?: boolean;
  className?: string;
}

export function AccessibleStatus({ 
  status, 
  message, 
  showVisually = true, 
  className = '' 
}: AccessibleStatusProps) {
  const statusIcons = {
    loading: 'fas fa-spinner fa-spin',
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };

  const statusColors = {
    loading: 'text-primary',
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-primary'
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`accessible-status ${showVisually ? 'flex items-center' : 'sr-only'} ${className}`}
    >
      {showVisually && (
        <i 
          className={`${statusIcons[status]} ${statusColors[status]} mr-2`} 
          aria-hidden="true"
        />
      )}
      <span>{message}</span>
    </div>
  );
}