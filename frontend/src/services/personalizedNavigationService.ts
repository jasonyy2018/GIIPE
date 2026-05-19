'use client';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  category: 'primary' | 'secondary' | 'utility';
  priority: number;
  isCustom?: boolean;
  description?: string;
  shortcut?: string;
  accessCount?: number;
  lastAccessed?: Date;
  isVisible?: boolean;
}

export interface NavigationPreferences {
  favoriteItems: string[];
  hiddenItems: string[];
  customOrder: string[];
  showIcons: boolean;
  showDescriptions: boolean;
  showShortcuts: boolean;
  groupByCategory: boolean;
  maxVisibleItems: number;
}

export interface NavigationAnalytics {
  itemId: string;
  accessCount: number;
  lastAccessed: Date;
  averageTimeSpent?: number;
  clickThroughRate?: number;
}

class PersonalizedNavigationService {
  private preferencesKey = 'navigation_preferences';
  private analyticsKey = 'navigation_analytics';
  private customItemsKey = 'custom_navigation_items';
  private listeners: Set<() => void> = new Set();

  private defaultItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: 'fas fa-tachometer-alt',
      category: 'primary',
      priority: 1,
      description: 'Your personal dashboard and overview'
    },
    {
      id: 'events',
      label: 'Events',
      href: '/events',
      icon: 'fas fa-calendar',
      category: 'primary',
      priority: 2,
      description: 'Browse and manage events'
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      href: '/bookmarks',
      icon: 'fas fa-bookmark',
      category: 'secondary',
      priority: 4,
      description: 'Your saved content'
    },
    {
      id: 'messages',
      label: 'Messages',
      href: '/messages',
      icon: 'fas fa-envelope',
      category: 'secondary',
      priority: 5,
      description: 'Messages and communications'
    },
    {
      id: 'connections',
      label: 'Connections',
      href: '/connections',
      icon: 'fas fa-users',
      category: 'secondary',
      priority: 6,
      description: 'Your network and connections'
    },
    {
      id: 'search',
      label: 'Search',
      href: '/search',
      icon: 'fas fa-search',
      category: 'utility',
      priority: 7,
      description: 'Search across all content'
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: 'fas fa-user',
      category: 'utility',
      priority: 8,
      description: 'Your profile and settings'
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: 'fas fa-cog',
      category: 'utility',
      priority: 9,
      description: 'Account and application settings'
    }
  ];

  private defaultPreferences: NavigationPreferences = {
    favoriteItems: [],
    hiddenItems: [],
    customOrder: [],
    showIcons: true,
    showDescriptions: false,
    showShortcuts: true,
    groupByCategory: false,
    maxVisibleItems: 8
  };

  /**
   * Get personalized navigation items
   */
  getNavigationItems(): NavigationItem[] {
    try {
      const preferences = this.getPreferences();
      const analytics = this.getAnalytics();
      const customItems = this.getCustomItems();
      
      // Combine default and custom items
      let allItems = [...this.defaultItems, ...customItems];
      
      // Apply analytics data
      allItems = allItems.map(item => {
        const itemAnalytics = analytics.find(a => a.itemId === item.id);
        return {
          ...item,
          accessCount: itemAnalytics?.accessCount || 0,
          lastAccessed: itemAnalytics?.lastAccessed
        };
      });

      // Filter out hidden items
      allItems = allItems.filter(item => !preferences.hiddenItems.includes(item.id));

      // Apply custom ordering
      if (preferences.customOrder.length > 0) {
        allItems = this.applyCustomOrder(allItems, preferences.customOrder);
      } else {
        // Sort by priority and access frequency
        allItems = this.sortByRelevance(allItems);
      }

      // Mark favorites
      allItems = allItems.map(item => ({
        ...item,
        isFavorite: preferences.favoriteItems.includes(item.id)
      }));

      // Apply visibility preferences
      allItems = allItems.map(item => ({
        ...item,
        isVisible: true // All items in the list are visible by default
      }));

      return allItems;
    } catch (error) {
      console.error('Error getting navigation items:', error);
      return this.defaultItems;
    }
  }

  /**
   * Get navigation items grouped by category
   */
  getGroupedNavigationItems(): Record<string, NavigationItem[]> {
    const items = this.getNavigationItems();
    const grouped: Record<string, NavigationItem[]> = {
      primary: [],
      secondary: [],
      utility: []
    };

    items.forEach(item => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });

    return grouped;
  }

  /**
   * Get most frequently accessed items
   */
  getFrequentlyUsedItems(limit: number = 5): NavigationItem[] {
    const items = this.getNavigationItems();
    return items?.filter(item => (item.accessCount || 0) > 0)
      .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
      .slice(0, limit);
  }

  /**
   * Get recently accessed items
   */
  getRecentlyUsedItems(limit: number = 5): NavigationItem[] {
    const items = this.getNavigationItems();
    return items?.filter(item => item.lastAccessed)
      .sort((a, b) => {
        const aTime = a.lastAccessed?.getTime() || 0;
        const bTime = b.lastAccessed?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  /**
   * Track navigation item access
   */
  trackItemAccess(itemId: string): void {
    try {
      const analytics = this.getAnalytics();
      const existingIndex = analytics.findIndex(a => a.itemId === itemId);
      
      if (existingIndex >= 0) {
        analytics[existingIndex].accessCount++;
        analytics[existingIndex].lastAccessed = new Date();
      } else {
        analytics.push({
          itemId,
          accessCount: 1,
          lastAccessed: new Date()
        });
      }

      this.saveAnalytics(analytics);
      this.notifyListeners();
    } catch (error) {
      console.error('Error tracking item access:', error);
    }
  }

  /**
   * Add item to favorites
   */
  addToFavorites(itemId: string): void {
    try {
      const preferences = this.getPreferences();
      if (!preferences.favoriteItems.includes(itemId)) {
        preferences.favoriteItems.push(itemId);
        this.savePreferences(preferences);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  }

  /**
   * Remove item from favorites
   */
  removeFromFavorites(itemId: string): void {
    try {
      const preferences = this.getPreferences();
      preferences.favoriteItems = preferences.favoriteItems.filter(id => id !== itemId);
      this.savePreferences(preferences);
      this.notifyListeners();
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  }

  /**
   * Hide navigation item
   */
  hideItem(itemId: string): void {
    try {
      const preferences = this.getPreferences();
      if (!preferences.hiddenItems.includes(itemId)) {
        preferences.hiddenItems.push(itemId);
        this.savePreferences(preferences);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error hiding item:', error);
    }
  }

  /**
   * Show hidden navigation item
   */
  showItem(itemId: string): void {
    try {
      const preferences = this.getPreferences();
      preferences.hiddenItems = preferences.hiddenItems.filter(id => id !== itemId);
      this.savePreferences(preferences);
      this.notifyListeners();
    } catch (error) {
      console.error('Error showing item:', error);
    }
  }

  /**
   * Update navigation order
   */
  updateItemOrder(orderedItemIds: string[]): void {
    try {
      const preferences = this.getPreferences();
      preferences.customOrder = orderedItemIds;
      this.savePreferences(preferences);
      this.notifyListeners();
    } catch (error) {
      console.error('Error updating item order:', error);
    }
  }

  /**
   * Add custom navigation item
   */
  addCustomItem(item: Omit<NavigationItem, 'id' | 'isCustom'>): void {
    try {
      const customItems = this.getCustomItems();
      const newItem: NavigationItem = {
        ...item,
        id: this.generateId(),
        isCustom: true
      };
      
      customItems.push(newItem);
      this.saveCustomItems(customItems);
      this.notifyListeners();
    } catch (error) {
      console.error('Error adding custom item:', error);
    }
  }

  /**
   * Remove custom navigation item
   */
  removeCustomItem(itemId: string): void {
    try {
      const customItems = this.getCustomItems();
      const filteredItems = customItems.filter(item => item.id !== itemId);
      this.saveCustomItems(filteredItems);
      this.notifyListeners();
    } catch (error) {
      console.error('Error removing custom item:', error);
    }
  }

  /**
   * Get navigation preferences
   */
  getPreferences(): NavigationPreferences {
    try {
      if (typeof window === 'undefined') return this.defaultPreferences;
      
      const stored = localStorage.getItem(this.preferencesKey);
      if (!stored) return this.defaultPreferences;
      
      return { ...this.defaultPreferences, ...JSON.parse(stored) };
    } catch (error) {
      console.error('Error getting preferences:', error);
      return this.defaultPreferences;
    }
  }

  /**
   * Update navigation preferences
   */
  updatePreferences(preferences: Partial<NavigationPreferences>): void {
    try {
      const currentPreferences = this.getPreferences();
      const updatedPreferences = { ...currentPreferences, ...preferences };
      this.savePreferences(updatedPreferences);
      this.notifyListeners();
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }

  /**
   * Subscribe to navigation changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private getAnalytics(): NavigationAnalytics[] {
    try {
      if (typeof window === 'undefined') return [];
      
      const stored = localStorage.getItem(this.analyticsKey);
      if (!stored) return [];
      
      const analytics = JSON.parse(stored);
      return analytics.map((item: any) => ({
        ...item,
        lastAccessed: item.lastAccessed ? new Date(item.lastAccessed) : undefined
      }));
    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  }

  private saveAnalytics(analytics: NavigationAnalytics[]): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.analyticsKey, JSON.stringify(analytics));
    } catch (error) {
      console.error('Error saving analytics:', error);
    }
  }

  private getCustomItems(): NavigationItem[] {
    try {
      if (typeof window === 'undefined') return [];
      
      const stored = localStorage.getItem(this.customItemsKey);
      if (!stored) return [];
      
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error getting custom items:', error);
      return [];
    }
  }

  private saveCustomItems(items: NavigationItem[]): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.customItemsKey, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving custom items:', error);
    }
  }

  private savePreferences(preferences: NavigationPreferences): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.preferencesKey, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  private applyCustomOrder(items: NavigationItem[], order: string[]): NavigationItem[] {
    const orderedItems: NavigationItem[] = [];
    const remainingItems = [...items];

    // Add items in custom order
    order.forEach(itemId => {
      const itemIndex = remainingItems.findIndex(item => item.id === itemId);
      if (itemIndex >= 0) {
        orderedItems.push(remainingItems.splice(itemIndex, 1)[0]);
      }
    });

    // Add remaining items at the end
    orderedItems.push(...remainingItems);

    return orderedItems;
  }

  private sortByRelevance(items: NavigationItem[]): NavigationItem[] {
    return items.sort((a, b) => {
      // Favorites first
      const aFavorite = (a as any).isFavorite ? 1 : 0;
      const bFavorite = (b as any).isFavorite ? 1 : 0;
      if (aFavorite !== bFavorite) return bFavorite - aFavorite;

      // Then by access frequency
      const aAccess = a.accessCount || 0;
      const bAccess = b.accessCount || 0;
      if (aAccess !== bAccess) return bAccess - aAccess;

      // Then by priority
      return a.priority - b.priority;
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in navigation listener:', error);
      }
    });
  }

  private generateId(): string {
    return `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const personalizedNavigationService = new PersonalizedNavigationService();