'use client';

export interface RecentlyAccessedItem {
  id: string;
  type: 'event' | 'article' | 'news' | 'user' | 'page';
  title: string;
  url: string;
  timestamp: Date;
  icon?: string;
  description?: string;
  image?: string;
  category?: string;
}

export interface RecentlyAccessedOptions {
  maxItems?: number;
  excludeTypes?: string[];
  groupByType?: boolean;
}

class RecentlyAccessedService {
  private storageKey = 'recently_accessed_content';
  private maxItems = 50;
  private listeners: Set<(items: RecentlyAccessedItem[]) => void> = new Set();

  constructor() {
    // Clean up old items on initialization
    this.cleanupOldItems();
  }

  /**
   * Add an item to recently accessed content
   */
  addItem(item: Omit<RecentlyAccessedItem, 'timestamp'>): void {
    try {
      const items = this.getItems();
      
      // Remove existing item with same URL to avoid duplicates
      const filteredItems = items.filter(existingItem => existingItem.url !== item.url);
      
      // Add new item at the beginning
      const newItem: RecentlyAccessedItem = {
        ...item,
        timestamp: new Date()
      };
      
      const updatedItems = [newItem, ...filteredItems].slice(0, this.maxItems);
      
      this.saveItems(updatedItems);
      this.notifyListeners(updatedItems);
    } catch (error) {
      console.error('Error adding recently accessed item:', error);
    }
  }

  /**
   * Get recently accessed items with optional filtering
   */
  getItems(options: RecentlyAccessedOptions = {}): RecentlyAccessedItem[] {
    try {
      const {
        maxItems = 20,
        excludeTypes = [],
        groupByType = false
      } = options;

      const items = this.loadItems();
      
      // Filter by type if specified
      let filteredItems = items;
      if (excludeTypes.length > 0) {
        filteredItems = items.filter(item => !excludeTypes.includes(item.type));
      }

      // Limit items
      filteredItems = filteredItems.slice(0, maxItems);

      // Group by type if requested
      if (groupByType) {
        return this.groupItemsByType(filteredItems);
      }

      return filteredItems;
    } catch (error) {
      console.error('Error getting recently accessed items:', error);
      return [];
    }
  }

  /**
   * Get items by specific type
   */
  getItemsByType(type: string, limit: number = 10): RecentlyAccessedItem[] {
    try {
      const items = this.loadItems();
      return items?.filter(item => item.type === type)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting items by type:', error);
      return [];
    }
  }

  /**
   * Search recently accessed items
   */
  searchItems(query: string, limit: number = 10): RecentlyAccessedItem[] {
    try {
      const items = this.loadItems();
      const lowercaseQuery = query.toLowerCase();
      
      return items?.filter(item => 
          item.title.toLowerCase().includes(lowercaseQuery) ||
          (item.description && item.description.toLowerCase().includes(lowercaseQuery)) ||
          (item.category && item.category.toLowerCase().includes(lowercaseQuery))
        )
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching recently accessed items:', error);
      return [];
    }
  }

  /**
   * Remove an item from recently accessed
   */
  removeItem(url: string): void {
    try {
      const items = this.loadItems();
      const filteredItems = items.filter(item => item.url !== url);
      
      this.saveItems(filteredItems);
      this.notifyListeners(filteredItems);
    } catch (error) {
      console.error('Error removing recently accessed item:', error);
    }
  }

  /**
   * Clear all recently accessed items
   */
  clearAll(): void {
    try {
      this.saveItems([]);
      this.notifyListeners([]);
    } catch (error) {
      console.error('Error clearing recently accessed items:', error);
    }
  }

  /**
   * Subscribe to changes in recently accessed items
   */
  subscribe(callback: (items: RecentlyAccessedItem[]) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Track page visit automatically
   */
  trackPageVisit(
    title: string,
    url: string,
    type: RecentlyAccessedItem['type'] = 'page',
    options: Partial<Pick<RecentlyAccessedItem, 'icon' | 'description' | 'image' | 'category'>> = {}
  ): void {
    // Don't track certain URLs
    const excludePatterns = [
      '/api/',
      '/auth/',
      '/_next/',
      '/favicon',
      '/robots.txt'
    ];

    if (excludePatterns.some(pattern => url.includes(pattern))) {
      return;
    }

    this.addItem({
      id: this.generateId(),
      type,
      title,
      url,
      ...options
    });
  }

  private loadItems(): RecentlyAccessedItem[] {
    try {
      if (typeof window === 'undefined') return [];
      
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const items = JSON.parse(stored);
      
      // Convert timestamp strings back to Date objects
      return items.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    } catch (error) {
      console.error('Error loading recently accessed items:', error);
      return [];
    }
  }

  private saveItems(items: RecentlyAccessedItem[]): void {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving recently accessed items:', error);
    }
  }

  private notifyListeners(items: RecentlyAccessedItem[]): void {
    this.listeners.forEach(callback => {
      try {
        callback(items);
      } catch (error) {
        console.error('Error in recently accessed listener:', error);
      }
    });
  }

  private groupItemsByType(items: RecentlyAccessedItem[]): RecentlyAccessedItem[] {
    const grouped: Record<string, RecentlyAccessedItem[]> = {};
    
    items.forEach(item => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push(item);
    });

    // Flatten back to array, maintaining type grouping
    const result: RecentlyAccessedItem[] = [];
    Object.entries(grouped).forEach(([type, typeItems]) => {
      result.push(...typeItems);
    });

    return result;
  }

  private cleanupOldItems(): void {
    try {
      const items = this.loadItems();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep items for 30 days
      
      const recentItems = items.filter(item => item.timestamp > cutoffDate);
      
      if (recentItems.length !== items.length) {
        this.saveItems(recentItems);
      }
    } catch (error) {
      console.error('Error cleaning up old items:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const recentlyAccessedService = new RecentlyAccessedService();

// Hook for React components
export function useRecentlyAccessed(options: RecentlyAccessedOptions = {}) {
  const [items, setItems] = useState<RecentlyAccessedItem[]>([]);

  useEffect(() => {
    // Initial load
    setItems(recentlyAccessedService.getItems(options));

    // Subscribe to changes
    const unsubscribe = recentlyAccessedService.subscribe((updatedItems) => {
      setItems(recentlyAccessedService.getItems(options));
    });

    return unsubscribe;
  }, []);

  return {
    items,
    addItem: (item: Omit<RecentlyAccessedItem, 'timestamp'>) => recentlyAccessedService.addItem(item),
    removeItem: (url: string) => recentlyAccessedService.removeItem(url),
    clearAll: () => recentlyAccessedService.clearAll(),
    searchItems: (query: string, limit?: number) => recentlyAccessedService.searchItems(query, limit),
    trackPageVisit: (title: string, url: string, type?: RecentlyAccessedItem['type'], options?: any) => 
      recentlyAccessedService.trackPageVisit(title, url, type, options)
  };
}

import { useState, useEffect } from 'react';