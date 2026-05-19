'use client';

import { useEffect, useRef, useState } from 'react';

// Focus management hook
export const useFocusManagement = () => {
  const focusableElementsSelector = 
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(focusableElementsSelector);
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  };

  const restoreFocus = (element: HTMLElement | null) => {
    if (element && element.focus) {
      element.focus();
    }
  };

  return { trapFocus, restoreFocus };
};

// Skip link component for keyboard navigation
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-lg z-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
    >
      {children}
    </a>
  );
}

// Screen reader announcements
export function ScreenReaderAnnouncement({ message, priority = 'polite' }: { 
  message: string; 
  priority?: 'polite' | 'assertive' 
}) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Loading state with accessibility
export function AccessibleLoadingState({ 
  isLoading, 
  loadingText = 'Loading...', 
  children 
}: { 
  isLoading: boolean; 
  loadingText?: string; 
  children: React.ReactNode 
}) {
  return (
    <div>
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          aria-label={loadingText}
          className="flex items-center justify-center p-8"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// Keyboard navigation hook
export const useKeyboardNavigation = (
  items: Array<{ id: string; element?: HTMLElement }>,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
    onSelect?: (id: string) => void;
  } = {}
) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { loop = true, orientation = 'vertical', onSelect } = options;

  const handleKeyDown = (e: KeyboardEvent) => {
    let newIndex = activeIndex;

    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          newIndex = activeIndex + 1;
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1;
          }
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          newIndex = activeIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0;
          }
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          newIndex = activeIndex + 1;
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1;
          }
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          newIndex = activeIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0;
          }
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onSelect && items[activeIndex]) {
          onSelect(items[activeIndex].id);
        }
        break;
    }

    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      const element = items[newIndex]?.element;
      if (element) {
        element.focus();
      }
    }
  };

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown
  };
};

// High contrast mode detection
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const isWindowsHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      // Check for forced colors (Windows high contrast)
      const isForcedColors = window.matchMedia('(forced-colors: active)').matches;
      
      setIsHighContrast(isWindowsHighContrast || isForcedColors);
    };

    checkHighContrast();

    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const forcedColorsQuery = window.matchMedia('(forced-colors: active)');
    
    mediaQuery.addEventListener('change', checkHighContrast);
    forcedColorsQuery.addEventListener('change', checkHighContrast);

    return () => {
      mediaQuery.removeEventListener('change', checkHighContrast);
      forcedColorsQuery.removeEventListener('change', checkHighContrast);
    };
  }, []);

  return isHighContrast;
};

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// Focus visible utility
export const useFocusVisible = () => {
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  useEffect(() => {
    let hadKeyboardEvent = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Control') {
        hadKeyboardEvent = true;
      }
    };

    const onFocus = () => {
      if (hadKeyboardEvent) {
        setIsFocusVisible(true);
      }
    };

    const onBlur = () => {
      setIsFocusVisible(false);
      hadKeyboardEvent = false;
    };

    const onMouseDown = () => {
      hadKeyboardEvent = false;
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focus', onFocus, true);
    document.addEventListener('blur', onBlur, true);
    document.addEventListener('mousedown', onMouseDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focus', onFocus, true);
      document.removeEventListener('blur', onBlur, true);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  return isFocusVisible;
};

// ARIA live region hook
export const useAriaLiveRegion = () => {
  const [announcement, setAnnouncement] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = (message: string, urgency: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(''); // Clear first to ensure re-announcement
    setTimeout(() => {
      setAnnouncement(message);
      setPriority(urgency);
    }, 100);
  };

  const LiveRegion = () => (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );

  return { announce, LiveRegion };
};