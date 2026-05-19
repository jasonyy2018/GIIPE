/**
 * Accessibility Service
 * Provides comprehensive accessibility features including screen reader support,
 * keyboard navigation, high contrast mode, and reduced motion preferences
 */

import { AccessibilityPersonalization } from '@/types/personalization';

export interface AccessibilitySettings extends AccessibilityPersonalization {
  announcements: boolean;
  skipLinks: boolean;
  ariaLive: 'off' | 'polite' | 'assertive';
  colorBlindnessSupport: boolean;
  textToSpeech: boolean;
}

export interface ScreenReaderAnnouncement {
  message: string;
  priority: 'low' | 'medium' | 'high';
  type: 'status' | 'alert' | 'navigation' | 'content';
  delay?: number;
}

export interface KeyboardShortcut {
  key: string;
  modifiers: string[];
  action: string;
  description: string;
  context?: string;
}

class AccessibilityService {
  private settings: AccessibilitySettings;
  private announceRegion: HTMLElement | null = null;
  private keyboardListeners: Map<string, (event: KeyboardEvent) => void> = new Map();
  private focusHistory: HTMLElement[] = [];
  private skipLinks: HTMLElement[] = [];

  constructor() {
    this.settings = this.getDefaultSettings();
    this.loadSettings();
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.initializeService();
    }
  }

  private getDefaultSettings(): AccessibilitySettings {
    return {
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
  }

  private initializeService(): void {
    this.createAnnounceRegion();
    this.setupKeyboardNavigation();
    this.setupSkipLinks();
    this.applyAccessibilitySettings();
    this.detectUserPreferences();
    this.registerDashboardShortcuts();
  }

  /**
   * Screen Reader Support
   */
  private createAnnounceRegion(): void {
    if (typeof window === 'undefined') return;

    this.announceRegion = document.createElement('div');
    this.announceRegion.setAttribute('aria-live', this.settings.ariaLive);
    this.announceRegion.setAttribute('aria-atomic', 'true');
    this.announceRegion.setAttribute('aria-relevant', 'additions text');
    this.announceRegion.className = 'sr-only';
    this.announceRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    
    document.body.appendChild(this.announceRegion);
  }

  public announceToScreenReader(announcement: ScreenReaderAnnouncement): void {
    if (!this.settings.announcements || !this.announceRegion) return;

    const delay = announcement.delay || (announcement.priority === 'high' ? 0 : 100);
    
    setTimeout(() => {
      if (this.announceRegion) {
        // Clear previous announcement
        this.announceRegion.textContent = '';
        
        // Add new announcement
        setTimeout(() => {
          if (this.announceRegion) {
            this.announceRegion.textContent = announcement.message;
          }
        }, 10);
      }
    }, delay);
  }

  public announcePageChange(pageName: string): void {
    this.announceToScreenReader({
      message: `Navigated to ${pageName}`,
      priority: 'medium',
      type: 'navigation'
    });
  }

  public announceWidgetUpdate(widgetName: string, updateType: string): void {
    this.announceToScreenReader({
      message: `${widgetName} ${updateType}`,
      priority: 'low',
      type: 'content'
    });
  }

  public announceError(errorMessage: string): void {
    this.announceToScreenReader({
      message: `Error: ${errorMessage}`,
      priority: 'high',
      type: 'alert'
    });
  }

  /**
   * Dynamic Content Accessibility
   */
  public announceDynamicContent(element: HTMLElement, changeType: 'added' | 'removed' | 'updated'): void {
    if (!this.settings.announcements) return;

    const elementType = this.getElementType(element);
    const elementDescription = this.getElementDescription(element);
    
    let message = '';
    switch (changeType) {
      case 'added':
        message = `New ${elementType} added: ${elementDescription}`;
        break;
      case 'removed':
        message = `${elementType} removed: ${elementDescription}`;
        break;
      case 'updated':
        message = `${elementType} updated: ${elementDescription}`;
        break;
    }

    this.announceToScreenReader({
      message,
      priority: 'medium',
      type: 'content'
    });
  }

  private getElementType(element: HTMLElement): string {
    const role = element.getAttribute('role');
    if (role) return role;

    const tagName = element.tagName.toLowerCase();
    const typeMap: { [key: string]: string } = {
      'button': 'button',
      'a': 'link',
      'input': 'input field',
      'select': 'dropdown',
      'textarea': 'text area',
      'h1': 'heading level 1',
      'h2': 'heading level 2',
      'h3': 'heading level 3',
      'h4': 'heading level 4',
      'h5': 'heading level 5',
      'h6': 'heading level 6',
      'img': 'image',
      'table': 'table',
      'form': 'form',
      'nav': 'navigation',
      'main': 'main content',
      'aside': 'sidebar',
      'section': 'section',
      'article': 'article',
      'div': 'content area'
    };

    return typeMap[tagName] || 'element';
  }

  private getElementDescription(element: HTMLElement): string {
    // Try to get meaningful description from various attributes
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) return labelElement.textContent || '';
    }

    const title = element.getAttribute('title');
    if (title) return title;

    const alt = element.getAttribute('alt');
    if (alt) return alt;

    const textContent = element.textContent?.trim();
    if (textContent && textContent.length < 100) return textContent;

    return 'unlabeled element';
  }

  /**
   * Enhanced Widget Accessibility
   */
  public setupWidgetAccessibility(widget: HTMLElement, widgetName: string): void {
    // Ensure proper ARIA attributes
    if (!widget.getAttribute('role')) {
      widget.setAttribute('role', 'region');
    }

    if (!widget.getAttribute('aria-label') && !widget.getAttribute('aria-labelledby')) {
      widget.setAttribute('aria-label', widgetName);
    }

    // Add live region for dynamic updates
    const liveRegion = widget.querySelector('[aria-live]');
    if (!liveRegion) {
      const region = document.createElement('div');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'false');
      region.className = 'sr-only';
      widget.appendChild(region);
    }

    // Setup keyboard navigation within widget
    this.setupWidgetKeyboardNavigation(widget);

    // Monitor for dynamic changes
    this.observeWidgetChanges(widget, widgetName);
  }

  private setupWidgetKeyboardNavigation(widget: HTMLElement): void {
    const focusableElements = widget.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    // Add arrow key navigation for widget items
    widget.addEventListener('keydown', (event) => {
      if (!this.settings.keyboardNavigation) return;

      const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement);
      
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          const nextIndex = (currentIndex + 1) % focusableElements.length;
          focusableElements[nextIndex].focus();
          break;
        
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
          focusableElements[prevIndex].focus();
          break;
        
        case 'Home':
          event.preventDefault();
          focusableElements[0].focus();
          break;
        
        case 'End':
          event.preventDefault();
          focusableElements[focusableElements.length - 1].focus();
          break;
      }
    });
  }

  private observeWidgetChanges(widget: HTMLElement, widgetName: string): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.announceDynamicContent(node as HTMLElement, 'added');
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.announceDynamicContent(node as HTMLElement, 'removed');
            }
          });
        } else if (mutation.type === 'attributes' || mutation.type === 'characterData') {
          if (mutation.target.nodeType === Node.ELEMENT_NODE) {
            this.announceDynamicContent(mutation.target as HTMLElement, 'updated');
          }
        }
      });
    });

    observer.observe(widget, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ['aria-label', 'aria-expanded', 'aria-selected', 'aria-checked']
    });
  }

  /**
   * Keyboard Navigation
   */
  private setupKeyboardNavigation(): void {
    if (typeof window === 'undefined') return;

    // Global keyboard shortcuts
    const shortcuts: KeyboardShortcut[] = [
      {
        key: 'h',
        modifiers: ['alt'],
        action: 'goHome',
        description: 'Go to home page'
      },
      {
        key: 'd',
        modifiers: ['alt'],
        action: 'goDashboard',
        description: 'Go to dashboard'
      },
      {
        key: 's',
        modifiers: ['alt'],
        action: 'focusSearch',
        description: 'Focus search input'
      },
      {
        key: 'n',
        modifiers: ['alt'],
        action: 'openNotifications',
        description: 'Open notifications'
      },
      {
        key: 'm',
        modifiers: ['alt'],
        action: 'openMainMenu',
        description: 'Open main menu'
      },
      {
        key: '/',
        modifiers: [],
        action: 'showKeyboardHelp',
        description: 'Show keyboard shortcuts help'
      }
    ];

    shortcuts.forEach(shortcut => {
      this.registerKeyboardShortcut(shortcut);
    });

    // Tab navigation enhancement
    document.addEventListener('keydown', this.handleTabNavigation.bind(this));
    
    // Focus management
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
  }

  private handleTabNavigation(event: KeyboardEvent): void {
    if (!this.settings.keyboardNavigation) return;

    if (event.key === 'Tab') {
      // Enhanced tab navigation logic
      const focusableElements = this.getFocusableElements();
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      
      if (event.shiftKey) {
        // Shift+Tab (backward)
        if (currentIndex <= 0) {
          event.preventDefault();
          focusableElements[focusableElements.length - 1]?.focus();
        }
      } else {
        // Tab (forward)
        if (currentIndex >= focusableElements.length - 1) {
          event.preventDefault();
          focusableElements[0]?.focus();
        }
      }
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target && this.settings.focusIndicators) {
      this.focusHistory.push(target);
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }
    }
  }

  private handleFocusOut(_event: FocusEvent): void {
    // Focus management logic - placeholder for future implementation
  }

  public registerKeyboardShortcut(shortcut: KeyboardShortcut): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const key = this.getShortcutKey(shortcut);
    
    const handler = (event: KeyboardEvent) => {
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault();
        this.executeShortcutAction(shortcut.action);
      }
    };

    this.keyboardListeners.set(key, handler);
    document.addEventListener('keydown', handler);
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    return `${shortcut.modifiers.join('+')}+${shortcut.key}`;
  }

  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    const modifiersMatch = shortcut.modifiers.every(modifier => {
      switch (modifier) {
        case 'ctrl': return event.ctrlKey;
        case 'alt': return event.altKey;
        case 'shift': return event.shiftKey;
        case 'meta': return event.metaKey;
        default: return false;
      }
    });

    return modifiersMatch && event.key.toLowerCase() === shortcut.key.toLowerCase();
  }

  /**
   * Enhanced Keyboard Shortcuts
   */
  public registerDashboardShortcuts(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const dashboardShortcuts: KeyboardShortcut[] = [
      // Widget navigation
      {
        key: '1',
        modifiers: ['alt'],
        action: 'focusWidget1',
        description: 'Focus first dashboard widget',
        context: 'dashboard'
      },
      {
        key: '2',
        modifiers: ['alt'],
        action: 'focusWidget2',
        description: 'Focus second dashboard widget',
        context: 'dashboard'
      },
      {
        key: '3',
        modifiers: ['alt'],
        action: 'focusWidget3',
        description: 'Focus third dashboard widget',
        context: 'dashboard'
      },
      {
        key: '4',
        modifiers: ['alt'],
        action: 'focusWidget4',
        description: 'Focus fourth dashboard widget',
        context: 'dashboard'
      },
      
      // Quick actions
      {
        key: 'r',
        modifiers: ['alt'],
        action: 'refreshDashboard',
        description: 'Refresh dashboard data',
        context: 'dashboard'
      },
      {
        key: 'c',
        modifiers: ['alt'],
        action: 'customizeDashboard',
        description: 'Open dashboard customization',
        context: 'dashboard'
      },
      
      // Accessibility toggles
      {
        key: 'c',
        modifiers: ['alt', 'shift'],
        action: 'toggleHighContrast',
        description: 'Toggle high contrast mode',
        context: 'global'
      },
      {
        key: 'r',
        modifiers: ['alt', 'shift'],
        action: 'toggleReducedMotion',
        description: 'Toggle reduced motion',
        context: 'global'
      },
      {
        key: 't',
        modifiers: ['alt', 'shift'],
        action: 'toggleLargeText',
        description: 'Toggle large text mode',
        context: 'global'
      }
    ];

    dashboardShortcuts.forEach(shortcut => {
      this.registerKeyboardShortcut(shortcut);
    });
  }

  private executeShortcutAction(action: string): void {
    switch (action) {
      case 'goHome':
        window.location.href = '/';
        break;
      case 'goDashboard':
        window.location.href = '/dashboard';
        break;
      case 'focusSearch':
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLElement;
        searchInput?.focus();
        break;
      case 'openNotifications':
        const notificationButton = document.querySelector('[aria-label*="notification" i]') as HTMLElement;
        notificationButton?.click();
        break;
      case 'openMainMenu':
        const menuButton = document.querySelector('[aria-label*="menu" i], [aria-expanded]') as HTMLElement;
        menuButton?.click();
        break;
      case 'showKeyboardHelp':
        this.showKeyboardHelp();
        break;
      
      // Dashboard-specific actions
      case 'focusWidget1':
      case 'focusWidget2':
      case 'focusWidget3':
      case 'focusWidget4':
        const widgetNumber = parseInt(action.slice(-1));
        this.focusWidget(widgetNumber);
        break;
      
      case 'refreshDashboard':
        this.refreshDashboard();
        break;
      
      case 'customizeDashboard':
        this.openDashboardCustomization();
        break;
      
      // Accessibility toggles
      case 'toggleHighContrast':
        if (this.settings.highContrast) {
          this.disableHighContrast();
        } else {
          this.enableHighContrast();
        }
        break;
      
      case 'toggleReducedMotion':
        if (this.settings.reducedMotion) {
          this.disableReducedMotion();
        } else {
          this.enableReducedMotion();
        }
        break;
      
      case 'toggleLargeText':
        if (this.settings.largeText) {
          this.disableLargeText();
        } else {
          this.enableLargeText();
        }
        break;
    }
  }

  private focusWidget(widgetNumber: number): void {
    const widgets = document.querySelectorAll('[role="region"], .dashboard-widget');
    const widget = widgets[widgetNumber - 1] as HTMLElement;
    
    if (widget) {
      widget.focus();
      this.announceToScreenReader({
        message: `Focused on widget ${widgetNumber}: ${widget.getAttribute('aria-label') || 'Dashboard widget'}`,
        priority: 'medium',
        type: 'navigation'
      });
    }
  }

  private refreshDashboard(): void {
    // Trigger dashboard refresh event
    document.dispatchEvent(new CustomEvent('dashboard:refresh'));
    this.announceToScreenReader({
      message: 'Dashboard refresh initiated',
      priority: 'medium',
      type: 'status'
    });
  }

  private openDashboardCustomization(): void {
    // Trigger dashboard customization event
    document.dispatchEvent(new CustomEvent('dashboard:customize'));
    this.announceToScreenReader({
      message: 'Dashboard customization opened',
      priority: 'medium',
      type: 'navigation'
    });
  }

  /**
   * Skip Links
   */
  private setupSkipLinks(): void {
    if (!this.settings.skipLinks || typeof window === 'undefined') return;

    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links';
    skipLinksContainer.style.cssText = `
      position: fixed;
      top: -100px;
      left: 0;
      z-index: 9999;
      background: #000;
      color: #fff;
      padding: 8px;
      transition: top 0.3s;
    `;

    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#navigation', text: 'Skip to navigation' },
      { href: '#search', text: 'Skip to search' },
      { href: '#footer', text: 'Skip to footer' }
    ];

    skipLinks.forEach(link => {
      const skipLink = document.createElement('a');
      skipLink.href = link.href;
      skipLink.textContent = link.text;
      skipLink.className = 'skip-link';
      skipLink.style.cssText = `
        display: block;
        color: #fff;
        text-decoration: none;
        padding: 4px 8px;
        margin: 2px 0;
      `;

      skipLink.addEventListener('focus', () => {
        skipLinksContainer.style.top = '0';
      });

      skipLink.addEventListener('blur', () => {
        skipLinksContainer.style.top = '-100px';
      });

      skipLinksContainer.appendChild(skipLink);
      this.skipLinks.push(skipLink);
    });

    document.body.insertBefore(skipLinksContainer, document.body.firstChild);
  }

  /**
   * High Contrast Mode
   */
  public enableHighContrast(): void {
    this.settings.highContrast = true;
    document.documentElement.classList.add('high-contrast');
    this.announceToScreenReader({
      message: 'High contrast mode enabled',
      priority: 'medium',
      type: 'status'
    });
    this.saveSettings();
  }

  public disableHighContrast(): void {
    this.settings.highContrast = false;
    document.documentElement.classList.remove('high-contrast');
    this.announceToScreenReader({
      message: 'High contrast mode disabled',
      priority: 'medium',
      type: 'status'
    });
    this.saveSettings();
  }

  /**
   * Reduced Motion
   */
  public enableReducedMotion(): void {
    this.settings.reducedMotion = true;
    document.documentElement.classList.add('reduced-motion');
    this.announceToScreenReader({
      message: 'Reduced motion enabled',
      priority: 'medium',
      type: 'status'
    });
    this.saveSettings();
  }

  public disableReducedMotion(): void {
    this.settings.reducedMotion = false;
    document.documentElement.classList.remove('reduced-motion');
    this.announceToScreenReader({
      message: 'Reduced motion disabled',
      priority: 'medium',
      type: 'status'
    });
    this.saveSettings();
  }

  /**
   * Large Text Support
   */
  public enableLargeText(): void {
    this.settings.largeText = true;
    document.documentElement.classList.add('large-text');
    this.announceToScreenReader({
      message: 'Large text enabled',
      priority: 'medium',
      type: 'status'
    });
    this.saveSettings();
  }

  public disableLargeText(): void {
    this.settings.largeText = false;
    document.documentElement.classList.remove('large-text');
    this.announceToScreenReader({
      message: 'Large text disabled',
      priority: 'medium',
      type: 'status'
    });
    this.saveSettings();
  }

  /**
   * Settings Management
   */
  public updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.applyAccessibilitySettings();
    this.saveSettings();
  }

  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  private applyAccessibilitySettings(): void {
    if (typeof window === 'undefined') return;

    // Apply high contrast
    if (this.settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Apply reduced motion
    if (this.settings.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }

    // Apply large text
    if (this.settings.largeText) {
      document.documentElement.classList.add('large-text');
    } else {
      document.documentElement.classList.remove('large-text');
    }

    // Update aria-live region
    if (this.announceRegion) {
      this.announceRegion.setAttribute('aria-live', this.settings.ariaLive);
    }
  }

  private detectUserPreferences(): void {
    if (typeof window === 'undefined') return;

    // Detect system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    if (prefersReducedMotion && !this.settings.reducedMotion) {
      this.enableReducedMotion();
    }

    if (prefersHighContrast && !this.settings.highContrast) {
      this.enableHighContrast();
    }

    // Listen for changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (e.matches) {
        this.enableReducedMotion();
      } else {
        this.disableReducedMotion();
      }
    });

    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      if (e.matches) {
        this.enableHighContrast();
      } else {
        this.disableHighContrast();
      }
    });
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('accessibility-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error);
    }
  }

  private loadSettings(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('accessibility-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
    }
  }

  /**
   * Utility Methods
   */
  public showKeyboardHelp(): void {
    // This would typically open a modal or overlay with keyboard shortcuts
    console.log('Keyboard shortcuts help would be displayed here');
  }

  public focusFirstElement(): void {
    const focusableElements = this.getFocusableElements();
    focusableElements[0]?.focus();
  }

  public focusLastElement(): void {
    const focusableElements = this.getFocusableElements();
    focusableElements[focusableElements.length - 1]?.focus();
  }

  public restoreFocus(): void {
    const lastFocused = this.focusHistory[this.focusHistory.length - 2];
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
    }
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    // Remove event listeners
    this.keyboardListeners.forEach((handler) => {
      document.removeEventListener('keydown', handler);
    });
    this.keyboardListeners.clear();

    // Remove announce region
    if (this.announceRegion && this.announceRegion.parentNode) {
      this.announceRegion.parentNode.removeChild(this.announceRegion);
    }

    // Clear focus history
    this.focusHistory = [];
  }
}

// Export singleton instance
export const accessibilityService = new AccessibilityService();
export default accessibilityService;