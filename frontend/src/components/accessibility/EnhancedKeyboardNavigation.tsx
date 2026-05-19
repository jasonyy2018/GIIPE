/**
 * Enhanced Keyboard Navigation Component
 * Provides comprehensive keyboard navigation for dashboard features
 */

'use client';

import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { accessibilityService } from '@/services/accessibilityService';

interface KeyboardNavigationProps {
  children: ReactNode;
  navigationMode: 'grid' | 'list' | 'tree' | 'tabs' | 'menu';
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  className?: string;
}

export default function EnhancedKeyboardNavigation({
  children,
  navigationMode,
  orientation = 'both',
  wrap = true,
  className = ''
}: KeyboardNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings, announceToScreenReader } = useAccessibility();
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);
  const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !settings.keyboardNavigation) return;

    updateFocusableElements();
    setupKeyboardListeners();

    // Update focusable elements when DOM changes
    const observer = new MutationObserver(updateFocusableElements);
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [settings.keyboardNavigation, navigationMode, orientation]);

  const updateFocusableElements = () => {
    const container = containerRef.current;
    if (!container) return;

    const elements = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    setFocusableElements(Array.from(elements));
  };

  const setupKeyboardListeners = () => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyNavigation);
    container.addEventListener('focusin', handleFocusIn);
  };

  const handleKeyNavigation = (event: KeyboardEvent) => {
    if (focusableElements.length === 0) return;

    const currentElement = document.activeElement as HTMLElement;
    const currentIndex = focusableElements.indexOf(currentElement);

    switch (navigationMode) {
      case 'grid':
        handleGridNavigation(event, currentIndex);
        break;
      case 'list':
        handleListNavigation(event, currentIndex);
        break;
      case 'tree':
        handleTreeNavigation(event, currentIndex);
        break;
      case 'tabs':
        handleTabsNavigation(event, currentIndex);
        break;
      case 'menu':
        handleMenuNavigation(event, currentIndex);
        break;
    }
  };

  const handleGridNavigation = (event: KeyboardEvent, currentIndex: number) => {
    const container = containerRef.current;
    if (!container) return;

    // Calculate grid dimensions
    const containerRect = container.getBoundingClientRect();
    const firstElementRect = focusableElements[0]?.getBoundingClientRect();
    if (!firstElementRect) return;

    const itemWidth = firstElementRect.width;
    const itemsPerRow = Math.floor(containerRect.width / itemWidth);

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = wrap ? (currentIndex + 1) % focusableElements.length : Math.min(currentIndex + 1, focusableElements.length - 1);
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = wrap ? (currentIndex - 1 + focusableElements.length) % focusableElements.length : Math.max(currentIndex - 1, 0);
        }
        break;

      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          const nextRowIndex = currentIndex + itemsPerRow;
          newIndex = nextRowIndex < focusableElements.length ? nextRowIndex : (wrap ? currentIndex % itemsPerRow : currentIndex);
        }
        break;

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          const prevRowIndex = currentIndex - itemsPerRow;
          newIndex = prevRowIndex >= 0 ? prevRowIndex : (wrap ? currentIndex + (Math.ceil(focusableElements.length / itemsPerRow) - 1) * itemsPerRow : currentIndex);
        }
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = focusableElements.length - 1;
        break;
    }

    if (newIndex !== currentIndex && focusableElements[newIndex]) {
      focusableElements[newIndex].focus();
      setCurrentFocusIndex(newIndex);
      announceNavigation(newIndex);
    }
  };

  const handleListNavigation = (event: KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = wrap ? (currentIndex + 1) % focusableElements.length : Math.min(currentIndex + 1, focusableElements.length - 1);
        break;

      case 'ArrowUp':
        event.preventDefault();
        newIndex = wrap ? (currentIndex - 1 + focusableElements.length) % focusableElements.length : Math.max(currentIndex - 1, 0);
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = focusableElements.length - 1;
        break;
    }

    if (newIndex !== currentIndex && focusableElements[newIndex]) {
      focusableElements[newIndex].focus();
      setCurrentFocusIndex(newIndex);
      announceNavigation(newIndex);
    }
  };

  const handleTreeNavigation = (event: KeyboardEvent, currentIndex: number) => {
    const currentElement = focusableElements[currentIndex];
    if (!currentElement) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, focusableElements.length - 1);
        if (focusableElements[nextIndex]) {
          focusableElements[nextIndex].focus();
          setCurrentFocusIndex(nextIndex);
          announceNavigation(nextIndex);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (focusableElements[prevIndex]) {
          focusableElements[prevIndex].focus();
          setCurrentFocusIndex(prevIndex);
          announceNavigation(prevIndex);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        // Expand if collapsible
        const expandButton = currentElement.querySelector('[aria-expanded="false"]') as HTMLElement;
        if (expandButton) {
          expandButton.click();
          announceToScreenReader({
            message: 'Expanded',
            priority: 'medium',
            type: 'status'
          });
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        // Collapse if expanded
        const collapseButton = currentElement.querySelector('[aria-expanded="true"]') as HTMLElement;
        if (collapseButton) {
          collapseButton.click();
          announceToScreenReader({
            message: 'Collapsed',
            priority: 'medium',
            type: 'status'
          });
        }
        break;
    }
  };

  const handleTabsNavigation = (event: KeyboardEvent, currentIndex: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowLeft':
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        let newIndex = currentIndex + direction;
        
        if (wrap) {
          newIndex = (newIndex + focusableElements.length) % focusableElements.length;
        } else {
          newIndex = Math.max(0, Math.min(newIndex, focusableElements.length - 1));
        }

        if (focusableElements[newIndex]) {
          focusableElements[newIndex].focus();
          setCurrentFocusIndex(newIndex);
          announceNavigation(newIndex);
        }
        break;

      case 'Home':
        event.preventDefault();
        if (focusableElements[0]) {
          focusableElements[0].focus();
          setCurrentFocusIndex(0);
          announceNavigation(0);
        }
        break;

      case 'End':
        event.preventDefault();
        const lastIndex = focusableElements.length - 1;
        if (focusableElements[lastIndex]) {
          focusableElements[lastIndex].focus();
          setCurrentFocusIndex(lastIndex);
          announceNavigation(lastIndex);
        }
        break;
    }
  };

  const handleMenuNavigation = (event: KeyboardEvent, currentIndex: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % focusableElements.length;
        if (focusableElements[nextIndex]) {
          focusableElements[nextIndex].focus();
          setCurrentFocusIndex(nextIndex);
          announceNavigation(nextIndex);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
        if (focusableElements[prevIndex]) {
          focusableElements[prevIndex].focus();
          setCurrentFocusIndex(prevIndex);
          announceNavigation(prevIndex);
        }
        break;

      case 'Escape':
        event.preventDefault();
        // Close menu or return to parent
        const container = containerRef.current;
        if (container) {
          const closeButton = container.querySelector('[aria-label*="close"], [aria-label*="Close"]') as HTMLElement;
          if (closeButton) {
            closeButton.click();
          }
        }
        break;
    }
  };

  const handleFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    const index = focusableElements.indexOf(target);
    if (index !== -1) {
      setCurrentFocusIndex(index);
    }
  };

  const announceNavigation = (index: number) => {
    const element = focusableElements[index];
    if (!element) return;

    const label = getElementLabel(element);
    const position = `${index + 1} of ${focusableElements.length}`;
    
    announceToScreenReader({
      message: `${label}, ${position}`,
      priority: 'low',
      type: 'navigation'
    });
  };

  const getElementLabel = (element: HTMLElement): string => {
    return element.getAttribute('aria-label') ||
           element.getAttribute('title') ||
           element.textContent?.trim() ||
           element.tagName.toLowerCase();
  };

  return (
    <div
      ref={containerRef}
      className={`enhanced-keyboard-navigation ${className}`}
      role={getRoleForNavigationMode(navigationMode)}
      aria-orientation={orientation === 'both' ? undefined : orientation}
      data-navigation-mode={navigationMode}
    >
      {children}
    </div>
  );
}

const getRoleForNavigationMode = (mode: string): string => {
  const roleMap = {
    grid: 'grid',
    list: 'list',
    tree: 'tree',
    tabs: 'tablist',
    menu: 'menu'
  };
  return roleMap[mode as keyof typeof roleMap] || 'group';
};

/**
 * Keyboard Shortcut Display Component
 */
interface KeyboardShortcutDisplayProps {
  shortcut: string;
  description: string;
  className?: string;
}

export function KeyboardShortcutDisplay({ 
  shortcut, 
  description, 
  className = '' 
}: KeyboardShortcutDisplayProps) {
  return (
    <div className={`keyboard-shortcut-display flex items-center justify-between ${className}`}>
      <span className="shortcut-description">{description}</span>
      <kbd className="shortcut-keys bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm font-mono">
        {shortcut}
      </kbd>
    </div>
  );
}

/**
 * Navigation Breadcrumbs Component
 */
interface NavigationBreadcrumbsProps {
  items: Array<{
    label: string;
    href?: string;
    current?: boolean;
  }>;
  className?: string;
}

export function NavigationBreadcrumbs({ items, className = '' }: NavigationBreadcrumbsProps) {
  const { announceToScreenReader } = useAccessibility();

  const handleBreadcrumbClick = (item: any, index: number) => {
    announceToScreenReader({
      message: `Navigated to ${item.label}`,
      priority: 'medium',
      type: 'navigation'
    });
  };

  return (
    <nav aria-label="Breadcrumb" className={`navigation-breadcrumbs ${className}`}>
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <i className="fas fa-chevron-right text-gray-400 mx-2" aria-hidden="true" />
            )}
            {item.current ? (
              <span 
                className="text-gray-900 font-medium"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <a
                href={item.href}
                className="text-primary hover:text-primary-dark hover:underline"
                onClick={() => handleBreadcrumbClick(item, index)}
              >
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}