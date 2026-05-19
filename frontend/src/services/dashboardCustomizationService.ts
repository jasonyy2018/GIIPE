'use client';

import type { 
  DashboardLayout, 
  DashboardTheme, 
  DashboardPreferences, 
  DashboardWidget,
  WidgetConfig 
} from '@/types/dashboard';

class DashboardCustomizationService {
  private storageKey = 'dashboardCustomization';
  private subscribers: Set<() => void> = new Set();

  // Default themes
  private defaultThemes: DashboardTheme[] = [
    {
      id: 'default',
      name: 'Default',
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        text: '#111827',
        accent: '#10B981'
      },
      spacing: 'normal',
      borderRadius: 'medium'
    },
    {
      id: 'dark',
      name: 'Dark Mode',
      colors: {
        primary: '#60A5FA',
        secondary: '#9CA3AF',
        background: '#111827',
        surface: '#1F2937',
        text: '#F9FAFB',
        accent: '#34D399'
      },
      spacing: 'normal',
      borderRadius: 'medium'
    },
    {
      id: 'compact',
      name: 'Compact',
      colors: {
        primary: '#8B5CF6',
        secondary: '#6B7280',
        background: '#F3F4F6',
        surface: '#FFFFFF',
        text: '#374151',
        accent: '#F59E0B'
      },
      spacing: 'compact',
      borderRadius: 'small'
    },
    {
      id: 'spacious',
      name: 'Spacious',
      colors: {
        primary: '#06B6D4',
        secondary: '#64748B',
        background: '#FEFEFE',
        surface: '#FFFFFF',
        text: '#0F172A',
        accent: '#EF4444'
      },
      spacing: 'spacious',
      borderRadius: 'large'
    }
  ];

  // Available widget configurations
  private availableWidgets: WidgetConfig[] = [
    {
      id: 'stats-overview',
      name: 'Stats Overview',
      description: 'Display key statistics and metrics',
      component: 'StatsOverview',
      category: 'stats',
      defaultSize: { width: 4, height: 2 },
      minSize: { width: 2, height: 1 },
      maxSize: { width: 6, height: 3 },
      configurable: true,
      icon: 'fas fa-chart-bar'
    },
    {
      id: 'upcoming-events',
      name: 'Upcoming Events',
      description: 'Show your upcoming events and registrations',
      component: 'UpcomingEvents',
      category: 'events',
      defaultSize: { width: 2, height: 3 },
      minSize: { width: 2, height: 2 },
      maxSize: { width: 4, height: 4 },
      configurable: true,
      icon: 'fas fa-calendar'
    },
    {
      id: 'recent-activity',
      name: 'Recent Activity',
      description: 'Your recent actions and updates',
      component: 'ActivityFeed',
      category: 'content',
      defaultSize: { width: 1, height: 3 },
      minSize: { width: 1, height: 2 },
      maxSize: { width: 2, height: 4 },
      configurable: true,
      icon: 'fas fa-history'
    },
    {
      id: 'saved-content',
      name: 'Saved Content',
      description: 'Your bookmarked articles and content',
      component: 'SavedContent',
      category: 'content',
      defaultSize: { width: 1, height: 3 },
      minSize: { width: 1, height: 2 },
      maxSize: { width: 3, height: 4 },
      configurable: true,
      icon: 'fas fa-bookmark'
    },
    {
      id: 'content-recommendations',
      name: 'Content Recommendations',
      description: 'Personalized content suggestions',
      component: 'ContentRecommendations',
      category: 'content',
      defaultSize: { width: 1, height: 3 },
      minSize: { width: 1, height: 2 },
      maxSize: { width: 2, height: 4 },
      configurable: true,
      icon: 'fas fa-lightbulb'
    },
    {
      id: 'social-interactions',
      name: 'Social Interactions',
      description: 'Your social activity and interactions',
      component: 'SocialInteractions',
      category: 'social',
      defaultSize: { width: 2, height: 2 },
      minSize: { width: 2, height: 2 },
      maxSize: { width: 3, height: 3 },
      configurable: true,
      icon: 'fas fa-users'
    },
    {
      id: 'network-activity',
      name: 'Network Activity',
      description: 'Your networking connections and activity',
      component: 'NetworkActivity',
      category: 'social',
      defaultSize: { width: 1, height: 2 },
      minSize: { width: 1, height: 2 },
      maxSize: { width: 2, height: 3 },
      configurable: true,
      icon: 'fas fa-network-wired'
    },
    {
      id: 'connection-recommendations',
      name: 'Connection Recommendations',
      description: 'Suggested connections based on your interests',
      component: 'ConnectionRecommendations',
      category: 'social',
      defaultSize: { width: 1, height: 2 },
      minSize: { width: 1, height: 2 },
      maxSize: { width: 2, height: 3 },
      configurable: true,
      icon: 'fas fa-user-plus'
    },
    {
      id: 'personal-analytics',
      name: 'Personal Analytics',
      description: 'Detailed analytics about your platform usage',
      component: 'PersonalAnalytics',
      category: 'analytics',
      defaultSize: { width: 3, height: 2 },
      minSize: { width: 2, height: 2 },
      maxSize: { width: 4, height: 3 },
      configurable: true,
      icon: 'fas fa-chart-line'
    },
    {
      id: 'content-discovery',
      name: 'Content Discovery',
      description: 'Discover trending and popular content',
      component: 'ContentDiscovery',
      category: 'content',
      defaultSize: { width: 3, height: 2 },
      minSize: { width: 2, height: 2 },
      maxSize: { width: 4, height: 3 },
      configurable: true,
      icon: 'fas fa-compass'
    },
    {
      id: 'quick-actions',
      name: 'Quick Actions',
      description: 'Customizable quick action buttons',
      component: 'QuickActionsPanel',
      category: 'actions',
      defaultSize: { width: 3, height: 1 },
      minSize: { width: 2, height: 1 },
      maxSize: { width: 4, height: 2 },
      configurable: true,
      icon: 'fas fa-bolt'
    }
  ];

  // Default layout
  private createDefaultLayout(): DashboardLayout {
    return {
      id: 'default',
      name: 'Default Layout',
      gridColumns: 3,
      gridRows: 8,
      widgets: [
        {
          id: 'stats-overview',
          title: 'Stats Overview',
          component: 'StatsOverview',
          enabled: true,
          position: { x: 0, y: 0, width: 3, height: 1 }
        },
        {
          id: 'upcoming-events',
          title: 'Upcoming Events',
          component: 'UpcomingEvents',
          enabled: true,
          position: { x: 0, y: 1, width: 2, height: 2 }
        },
        {
          id: 'recent-activity',
          title: 'Recent Activity',
          component: 'ActivityFeed',
          enabled: true,
          position: { x: 2, y: 1, width: 1, height: 2 }
        },
        {
          id: 'saved-content',
          title: 'Saved Content',
          component: 'SavedContent',
          enabled: true,
          position: { x: 0, y: 3, width: 1, height: 2 }
        },
        {
          id: 'content-recommendations',
          title: 'Content Recommendations',
          component: 'ContentRecommendations',
          enabled: true,
          position: { x: 1, y: 3, width: 1, height: 2 }
        },
        {
          id: 'social-interactions',
          title: 'Social Interactions',
          component: 'SocialInteractions',
          enabled: true,
          position: { x: 2, y: 3, width: 1, height: 2 }
        },
        {
          id: 'personal-analytics',
          title: 'Personal Analytics',
          component: 'PersonalAnalytics',
          enabled: true,
          position: { x: 0, y: 5, width: 3, height: 1 }
        },
        {
          id: 'quick-actions',
          title: 'Quick Actions',
          component: 'QuickActionsPanel',
          enabled: true,
          position: { x: 0, y: 6, width: 3, height: 1 }
        }
      ]
    };
  }

  // Get user preferences
  getPreferences(userId: string): DashboardPreferences {
    try {
      const stored = localStorage.getItem(`${this.storageKey}_${userId}`);
      if (stored) {
        const preferences = JSON.parse(stored);
        return {
          ...this.getDefaultPreferences(userId),
          ...preferences
        };
      }
    } catch (error) {
      console.error('Error loading dashboard preferences:', error);
    }
    
    return this.getDefaultPreferences(userId);
  }

  // Get default preferences
  private getDefaultPreferences(userId: string): DashboardPreferences {
    return {
      userId,
      currentLayout: 'default',
      currentTheme: 'default',
      autoSave: true,
      showWidgetTitles: true,
      enableAnimations: true,
      compactMode: false,
      refreshInterval: 300, // 5 minutes
      hiddenWidgets: [],
      customLayouts: [this.createDefaultLayout()]
    };
  }

  // Save preferences
  savePreferences(preferences: DashboardPreferences): void {
    try {
      localStorage.setItem(
        `${this.storageKey}_${preferences.userId}`,
        JSON.stringify(preferences)
      );
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
    }
  }

  // Update specific preference
  updatePreference<K extends keyof DashboardPreferences>(
    userId: string,
    key: K,
    value: DashboardPreferences[K]
  ): void {
    const preferences = this.getPreferences(userId);
    preferences[key] = value;
    this.savePreferences(preferences);
  }

  // Get available themes
  getAvailableThemes(): DashboardTheme[] {
    return [...this.defaultThemes];
  }

  // Get theme by id
  getTheme(themeId: string): DashboardTheme | null {
    return this.defaultThemes.find(theme => theme.id === themeId) || null;
  }

  // Get available widgets
  getAvailableWidgets(): WidgetConfig[] {
    return [...this.availableWidgets];
  }

  // Get widget config by id
  getWidgetConfig(widgetId: string): WidgetConfig | null {
    return this.availableWidgets.find(widget => widget.id === widgetId) || null;
  }

  // Get current layout
  getCurrentLayout(userId: string): DashboardLayout {
    const preferences = this.getPreferences(userId);
    const layout = preferences.customLayouts.find(l => l.id === preferences.currentLayout);
    return layout || this.createDefaultLayout();
  }

  // Save layout
  saveLayout(userId: string, layout: DashboardLayout): void {
    const preferences = this.getPreferences(userId);
    const existingIndex = preferences.customLayouts.findIndex(l => l.id === layout.id);
    
    if (existingIndex >= 0) {
      preferences.customLayouts[existingIndex] = layout;
    } else {
      preferences.customLayouts.push(layout);
    }
    
    this.savePreferences(preferences);
  }

  // Create new layout
  createLayout(userId: string, name: string, basedOn?: string): DashboardLayout {
    const preferences = this.getPreferences(userId);
    const baseLayout = basedOn 
      ? preferences.customLayouts.find(l => l.id === basedOn) || this.createDefaultLayout()
      : this.createDefaultLayout();
    
    const newLayout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name,
      gridColumns: baseLayout.gridColumns,
      gridRows: baseLayout.gridRows,
      widgets: baseLayout.widgets.map(widget => ({ ...widget }))
    };
    
    preferences.customLayouts.push(newLayout);
    this.savePreferences(preferences);
    
    return newLayout;
  }

  // Delete layout
  deleteLayout(userId: string, layoutId: string): void {
    if (layoutId === 'default') return; // Can't delete default layout
    
    const preferences = this.getPreferences(userId);
    preferences.customLayouts = preferences.customLayouts.filter(l => l.id !== layoutId);
    
    // If current layout was deleted, switch to default
    if (preferences.currentLayout === layoutId) {
      preferences.currentLayout = 'default';
    }
    
    this.savePreferences(preferences);
  }

  // Update widget position
  updateWidgetPosition(
    userId: string, 
    layoutId: string, 
    widgetId: string, 
    position: { x: number; y: number; width: number; height: number }
  ): void {
    const preferences = this.getPreferences(userId);
    const layout = preferences.customLayouts.find(l => l.id === layoutId);
    
    if (layout) {
      const widget = layout.widgets.find(w => w.id === widgetId);
      if (widget) {
        widget.position = position;
        this.savePreferences(preferences);
      }
    }
  }

  // Add widget to layout
  addWidget(userId: string, layoutId: string, widgetConfig: WidgetConfig): void {
    const preferences = this.getPreferences(userId);
    const layout = preferences.customLayouts.find(l => l.id === layoutId);
    
    if (layout) {
      // Find available position
      const position = this.findAvailablePosition(layout, widgetConfig.defaultSize);
      
      const newWidget: DashboardWidget = {
        id: `${widgetConfig.id}-${Date.now()}`,
        title: widgetConfig.name,
        component: widgetConfig.component,
        enabled: true,
        position
      };
      
      layout.widgets.push(newWidget);
      this.savePreferences(preferences);
    }
  }

  // Remove widget from layout
  removeWidget(userId: string, layoutId: string, widgetId: string): void {
    const preferences = this.getPreferences(userId);
    const layout = preferences.customLayouts.find(l => l.id === layoutId);
    
    if (layout) {
      layout.widgets = layout.widgets.filter(w => w.id !== widgetId);
      this.savePreferences(preferences);
    }
  }

  // Toggle widget visibility
  toggleWidget(userId: string, widgetId: string): void {
    const preferences = this.getPreferences(userId);
    const hiddenIndex = preferences.hiddenWidgets.indexOf(widgetId);
    
    if (hiddenIndex >= 0) {
      preferences.hiddenWidgets.splice(hiddenIndex, 1);
    } else {
      preferences.hiddenWidgets.push(widgetId);
    }
    
    this.savePreferences(preferences);
  }

  // Find available position for new widget
  private findAvailablePosition(
    layout: DashboardLayout, 
    size: { width: number; height: number }
  ): { x: number; y: number; width: number; height: number } {
    const { width, height } = size;
    const { gridColumns, gridRows } = layout;
    
    // Try to find empty space
    for (let y = 0; y <= gridRows - height; y++) {
      for (let x = 0; x <= gridColumns - width; x++) {
        const position = { x, y, width, height };
        
        // Check if position is available
        const isAvailable = !layout.widgets.some(widget => 
          this.positionsOverlap(widget.position, position)
        );
        
        if (isAvailable) {
          return position;
        }
      }
    }
    
    // If no space found, add to bottom
    const maxY = Math.max(...layout.widgets.map(w => w.position.y + w.position.height), 0);
    return { x: 0, y: maxY, width, height };
  }

  // Check if two positions overlap
  private positionsOverlap(
    pos1: { x: number; y: number; width: number; height: number },
    pos2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      pos1.x + pos1.width <= pos2.x ||
      pos2.x + pos2.width <= pos1.x ||
      pos1.y + pos1.height <= pos2.y ||
      pos2.y + pos2.height <= pos1.y
    );
  }

  // Reset to defaults
  resetToDefaults(userId: string): void {
    const defaultPreferences = this.getDefaultPreferences(userId);
    this.savePreferences(defaultPreferences);
  }

  // Export preferences
  exportPreferences(userId: string): string {
    const preferences = this.getPreferences(userId);
    return JSON.stringify(preferences, null, 2);
  }

  // Import preferences
  importPreferences(userId: string, data: string): boolean {
    try {
      const preferences = JSON.parse(data);
      preferences.userId = userId; // Ensure correct user ID
      this.savePreferences(preferences);
      return true;
    } catch (error) {
      console.error('Error importing preferences:', error);
      return false;
    }
  }

  // Subscribe to changes
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify subscribers
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }
}

export const dashboardCustomizationService = new DashboardCustomizationService();