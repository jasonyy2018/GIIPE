/**
 * Keyboard Shortcuts Service
 * Manages global keyboard shortcuts for power users
 */

export interface KeyboardShortcut {
  id: string;
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  category: 'navigation' | 'search' | 'content' | 'social' | 'system';
  action: () => void | Promise<void>;
  enabled?: boolean;
  global?: boolean; // If true, works even when input fields are focused
}

export interface ShortcutCategory {
  id: string;
  name: string;
  icon: string;
  shortcuts: KeyboardShortcut[];
}

class KeyboardShortcutsService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled = true;

  constructor() {
    this.setupGlobalListener();
  }

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(shortcutId: string): void {
    const entries = Array.from(this.shortcuts.entries());
    for (const [key, shortcut] of entries) {
      if (shortcut.id === shortcutId) {
        this.shortcuts.delete(key);
        break;
      }
    }
  }

  /**
   * Get all registered shortcuts grouped by category
   */
  getShortcutsByCategory(): ShortcutCategory[] {
    const categories: Record<string, ShortcutCategory> = {};

    const shortcuts = Array.from(this.shortcuts.values());
    for (const shortcut of shortcuts) {
      if (!categories[shortcut.category]) {
        categories[shortcut.category] = {
          id: shortcut.category,
          name: this.getCategoryName(shortcut.category),
          icon: this.getCategoryIcon(shortcut.category),
          shortcuts: []
        };
      }
      categories[shortcut.category].shortcuts.push(shortcut);
    }

    return Object.values(categories);
  }

  /**
   * Enable or disable keyboard shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if shortcuts are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get formatted shortcut display string
   */
  getShortcutDisplay(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey || shortcut.metaKey) {
      parts.push(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘' : 'Ctrl');
    }
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join(' + ');
  }

  /**
   * Register default application shortcuts
   */
  registerDefaultShortcuts(router: any): void {
    const defaultShortcuts: KeyboardShortcut[] = [
      // Navigation shortcuts
      {
        id: 'goto-dashboard',
        key: 'h',
        ctrlKey: true,
        description: 'Go to Dashboard',
        category: 'navigation',
        action: () => router.push('/dashboard')
      },
      {
        id: 'goto-events',
        key: 'e',
        ctrlKey: true,
        description: 'Browse Events',
        category: 'navigation',
        action: () => router.push('/events')
      },
      {
        id: 'goto-profile',
        key: 'p',
        ctrlKey: true,
        description: 'Edit Profile',
        category: 'navigation',
        action: () => router.push('/dashboard/profile')
      },
      {
        id: 'goto-settings',
        key: ',',
        ctrlKey: true,
        description: 'Open Settings',
        category: 'navigation',
        action: () => router.push('/settings')
      },

      // Search shortcuts
      {
        id: 'global-search',
        key: 'k',
        ctrlKey: true,
        description: 'Global Search',
        category: 'search',
        global: true,
        action: () => {
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          } else {
            router.push('/search');
          }
        }
      },
      {
        id: 'search-events',
        key: 'e',
        ctrlKey: true,
        shiftKey: true,
        description: 'Search Events',
        category: 'search',
        action: () => router.push('/search?type=event')
      },
      {
        id: 'search-people',
        key: 'p',
        ctrlKey: true,
        shiftKey: true,
        description: 'Search People',
        category: 'search',
        action: () => router.push('/search?type=user')
      },

      // Content shortcuts
      {
        id: 'saved-content',
        key: 'b',
        ctrlKey: true,
        description: 'Saved Content',
        category: 'content',
        action: () => router.push('/saved')
      },
      {
        id: 'notifications',
        key: 'n',
        ctrlKey: true,
        description: 'Open Notifications',
        category: 'content',
        action: () => {
          const notificationButton = document.querySelector('[data-notification-trigger]') as HTMLButtonElement;
          if (notificationButton) {
            notificationButton.click();
          } else {
            router.push('/notifications');
          }
        }
      },
      {
        id: 'activity-feed',
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
        description: 'Activity Feed',
        category: 'content',
        action: () => router.push('/activity')
      },

      // Social shortcuts
      {
        id: 'connections',
        key: 'f',
        ctrlKey: true,
        description: 'Find People',
        category: 'social',
        action: () => router.push('/users')
      },
      {
        id: 'messages',
        key: 'm',
        ctrlKey: true,
        description: 'Messages',
        category: 'social',
        action: () => router.push('/messages')
      },
      {
        id: 'discussions',
        key: 'd',
        ctrlKey: true,
        description: 'Discussions',
        category: 'social',
        action: () => router.push('/discussions')
      },

      // System shortcuts
      {
        id: 'help',
        key: '?',
        ctrlKey: true,
        description: 'Show Help',
        category: 'system',
        global: true,
        action: () => this.showShortcutsHelp()
      },
      {
        id: 'refresh',
        key: 'r',
        ctrlKey: true,
        shiftKey: true,
        description: 'Refresh Page',
        category: 'system',
        action: () => window.location.reload()
      },
      {
        id: 'escape',
        key: 'Escape',
        description: 'Close Modals/Dropdowns',
        category: 'system',
        global: true,
        action: () => {
          // Close any open modals or dropdowns
          const closeButtons = document.querySelectorAll('[data-close], .modal-close, [aria-label="Close"]');
          if (closeButtons.length > 0) {
            (closeButtons[closeButtons.length - 1] as HTMLElement).click();
          }
          
          // Remove focus from active element
          if (document.activeElement && document.activeElement !== document.body) {
            (document.activeElement as HTMLElement).blur();
          }
        }
      }
    ];

    defaultShortcuts.forEach(shortcut => this.register(shortcut));
  }

  /**
   * Show shortcuts help modal
   */
  private showShortcutsHelp(): void {
    const existingModal = document.getElementById('shortcuts-help-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'shortcuts-help-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    
    const categories = this.getShortcutsByCategory();
    
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-800">Keyboard Shortcuts</h2>
          <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('#shortcuts-help-modal').remove()">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${categories.map(category => `
              <div>
                <h3 class="flex items-center text-lg font-medium text-gray-700 mb-4">
                  <i class="${category.icon} mr-2"></i>
                  ${category.name}
                </h3>
                <div class="space-y-2">
                  ${category.shortcuts.map(shortcut => `
                    <div class="flex items-center justify-between py-2">
                      <span class="text-sm text-gray-600">${shortcut.description}</span>
                      <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        ${this.getShortcutDisplay(shortcut)}
                      </kbd>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p class="text-sm text-gray-600">
            <i class="fas fa-info-circle mr-1"></i>
            Press <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + ?</kbd> to show this help again
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on click outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close on escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Setup global keyboard event listener
   */
  private setupGlobalListener(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      const key = this.getEventKey(e);
      const shortcut = this.shortcuts.get(key);

      if (shortcut) {
        // Check if we should ignore the shortcut when in input fields
        if (!shortcut.global && this.isInInputField(e.target as Element)) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        
        try {
          shortcut.action();
        } catch (error) {
          console.error('Error executing keyboard shortcut:', error);
        }
      }
    });
  }

  /**
   * Generate unique key for shortcut
   */
  private getShortcutKey(shortcut: KeyboardShortcut): string {
    return `${shortcut.ctrlKey || shortcut.metaKey ? 'ctrl+' : ''}${shortcut.shiftKey ? 'shift+' : ''}${shortcut.altKey ? 'alt+' : ''}${shortcut.key.toLowerCase()}`;
  }

  /**
   * Generate key from keyboard event
   */
  private getEventKey(e: KeyboardEvent): string {
    return `${e.ctrlKey || e.metaKey ? 'ctrl+' : ''}${e.shiftKey ? 'shift+' : ''}${e.altKey ? 'alt+' : ''}${e.key.toLowerCase()}`;
  }

  /**
   * Check if target is an input field
   */
  private isInInputField(target: Element): boolean {
    if (!target) return false;
    
    const tagName = target.tagName.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    const isContentEditable = target.getAttribute('contenteditable') === 'true';
    
    return isInput || isContentEditable;
  }

  /**
   * Get category display name
   */
  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      navigation: 'Navigation',
      search: 'Search',
      content: 'Content',
      social: 'Social',
      system: 'System'
    };
    return names[category] || category;
  }

  /**
   * Get category icon
   */
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      navigation: 'fas fa-compass',
      search: 'fas fa-search',
      content: 'fas fa-file-alt',
      social: 'fas fa-users',
      system: 'fas fa-cog'
    };
    return icons[category] || 'fas fa-keyboard';
  }
}

// Export singleton instance
export const keyboardShortcutsService = new KeyboardShortcutsService();

// Export hook for React components
export function useKeyboardShortcuts(router?: any) {
  const registerShortcuts = (shortcuts: KeyboardShortcut[]) => {
    shortcuts.forEach(shortcut => keyboardShortcutsService.register(shortcut));
  };

  const registerDefaults = () => {
    if (router) {
      keyboardShortcutsService.registerDefaultShortcuts(router);
    }
  };

  const getShortcuts = () => {
    return keyboardShortcutsService.getShortcutsByCategory();
  };

  const setEnabled = (enabled: boolean) => {
    keyboardShortcutsService.setEnabled(enabled);
  };

  return {
    registerShortcuts,
    registerDefaults,
    getShortcuts,
    setEnabled,
    service: keyboardShortcutsService
  };
}