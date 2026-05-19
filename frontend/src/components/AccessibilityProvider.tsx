/**
 * Accessibility Provider Component
 * Provides accessibility context and initialization for the entire application
 */

'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { accessibilityService } from '@/services/accessibilityService';
import { useAccessibility, useKeyboardNavigation } from '@/hooks/useAccessibility';

interface AccessibilityContextType {
  isInitialized: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  isInitialized: false,
});

export const useAccessibilityContext = () => useContext(AccessibilityContext);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export default function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const { settings } = useAccessibility();
  const { isKeyboardUser } = useKeyboardNavigation();

  useEffect(() => {
    // Initialize accessibility service
    const initializeAccessibility = () => {
      // Apply initial settings
      if (settings.highContrast) {
        document.documentElement.classList.add('high-contrast');
      }
      
      if (settings.reducedMotion) {
        document.documentElement.classList.add('reduced-motion');
      }
      
      if (settings.largeText) {
        document.documentElement.classList.add('large-text');
      }
      
      if (settings.colorBlindnessSupport) {
        document.documentElement.classList.add('colorblind-support');
      }

      // Add keyboard navigation class
      if (isKeyboardUser) {
        document.body.classList.add('keyboard-navigation-active');
      }

      // Add main content landmark if it doesn't exist
      const mainContent = document.getElementById('main-content');
      if (!mainContent) {
        const main = document.querySelector('main');
        if (main && !main.id) {
          main.id = 'main-content';
        }
      }

      // Add navigation landmark if it doesn't exist
      const navigation = document.getElementById('navigation');
      if (!navigation) {
        const nav = document.querySelector('nav');
        if (nav && !nav.id) {
          nav.id = 'navigation';
        }
      }

      // Ensure proper heading hierarchy
      ensureHeadingHierarchy();

      // Add ARIA labels to common elements
      addAriaLabels();
    };

    initializeAccessibility();
  }, [settings, isKeyboardUser]);

  // Ensure proper heading hierarchy
  const ensureHeadingHierarchy = () => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let currentLevel = 0;
    
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level > currentLevel + 1) {
        console.warn(`Heading hierarchy issue: ${heading.tagName} follows h${currentLevel}`, heading);
      }
      
      currentLevel = level;
    });
  };

  // Add ARIA labels to common elements
  const addAriaLabels = () => {
    // Add labels to buttons without text
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach((button) => {
      const icon = button.querySelector('i, svg');
      const text = button.textContent?.trim();
      
      if (!text && icon) {
        // Try to infer label from icon classes
        const iconClasses = icon.className;
        if (iconClasses.includes('search')) {
          button.setAttribute('aria-label', 'Search');
        } else if (iconClasses.includes('menu')) {
          button.setAttribute('aria-label', 'Menu');
        } else if (iconClasses.includes('close')) {
          button.setAttribute('aria-label', 'Close');
        } else if (iconClasses.includes('notification')) {
          button.setAttribute('aria-label', 'Notifications');
        }
      }
    });

    // Add labels to form inputs without labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    inputs.forEach((input) => {
      const placeholder = input.getAttribute('placeholder');
      const type = input.getAttribute('type');
      
      if (placeholder && !input.previousElementSibling?.tagName.toLowerCase().includes('label')) {
        input.setAttribute('aria-label', placeholder);
      } else if (type === 'search') {
        input.setAttribute('aria-label', 'Search');
      }
    });

    // Add role and aria-expanded to dropdown toggles
    const dropdownToggles = document.querySelectorAll('[data-dropdown-toggle]');
    dropdownToggles.forEach((toggle) => {
      if (!toggle.getAttribute('role')) {
        toggle.setAttribute('role', 'button');
      }
      if (!toggle.getAttribute('aria-expanded')) {
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  };

  // Handle route changes for screen reader announcements
  useEffect(() => {
    const handleRouteChange = () => {
      // Announce page changes
      const pageTitle = document.title;
      if (pageTitle) {
        accessibilityService.announcePageChange(pageTitle);
      }

      // Focus management for route changes
      const mainContent = document.getElementById('main-content') || document.querySelector('main');
      if (mainContent) {
        mainContent.focus();
      }
    };

    // Listen for navigation events (for client-side routing)
    window.addEventListener('popstate', handleRouteChange);
    
    // For Next.js router events, you might need to listen to router events
    // This is a simplified version - in a real app you'd use Next.js router events
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Handle focus management for modals and overlays
  useEffect(() => {
    const handleModalOpen = (event: CustomEvent) => {
      const modal = event.detail.modal;
      if (modal) {
        // Save current focus
        const currentFocus = document.activeElement as HTMLElement;
        modal.setAttribute('data-previous-focus', currentFocus?.id || '');
        
        // Focus first focusable element in modal
        const focusableElements = modal.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }
    };

    const handleModalClose = (event: CustomEvent) => {
      const modal = event.detail.modal;
      if (modal) {
        // Restore previous focus
        const previousFocusId = modal.getAttribute('data-previous-focus');
        if (previousFocusId) {
          const previousElement = document.getElementById(previousFocusId);
          if (previousElement) {
            previousElement.focus();
          }
        }
      }
    };

    // Listen for custom modal events
    document.addEventListener('modal:open', handleModalOpen as EventListener);
    document.addEventListener('modal:close', handleModalClose as EventListener);

    return () => {
      document.removeEventListener('modal:open', handleModalOpen as EventListener);
      document.removeEventListener('modal:close', handleModalClose as EventListener);
    };
  }, []);

  const contextValue: AccessibilityContextType = {
    isInitialized: true,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

/**
 * Higher-order component to add accessibility features to any component
 */
export function withAccessibility<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AccessibilityEnhancedComponent(props: P) {
    return (
      <AccessibilityProvider>
        <Component {...props} />
      </AccessibilityProvider>
    );
  };
}

/**
 * Accessibility-aware Modal component
 */
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function AccessibleModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '' 
}: AccessibleModalProps) {
  const { announceToScreenReader } = useAccessibility();

  useEffect(() => {
    if (isOpen) {
      // Announce modal opening
      announceToScreenReader({
        message: `${title} dialog opened`,
        priority: 'medium',
        type: 'status'
      });

      // Dispatch custom event for focus management
      document.dispatchEvent(new CustomEvent('modal:open', {
        detail: { modal: document.querySelector('[role="dialog"]') }
      }));

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Announce modal closing
      announceToScreenReader({
        message: `${title} dialog closed`,
        priority: 'medium',
        type: 'status'
      });

      // Dispatch custom event for focus management
      document.dispatchEvent(new CustomEvent('modal:close', {
        detail: { modal: document.querySelector('[role="dialog"]') }
      }));

      // Restore body scroll
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, title, announceToScreenReader]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className={`modal-content ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-title" className="text-xl font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close dialog"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}