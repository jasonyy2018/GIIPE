'use client';

import { useState, useEffect } from 'react';
import { 
  personalizedNavigationService, 
  type NavigationItem, 
  type NavigationPreferences 
} from '@/services/personalizedNavigationService';
import { recentlyAccessedService } from '@/services/recentlyAccessedService';

export default function NavigationSettings() {
  const [preferences, setPreferences] = useState<NavigationPreferences | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<Record<string, NavigationItem[]>>({});
  const [showAddCustomItem, setShowAddCustomItem] = useState(false);
  const [customItem, setCustomItem] = useState({
    label: '',
    href: '',
    icon: 'fas fa-link',
    category: 'utility' as 'primary' | 'secondary' | 'utility',
    description: ''
  });

  useEffect(() => {
    loadData();

    const unsubscribe = personalizedNavigationService.subscribe(() => {
      loadData();
    });

    return unsubscribe;
  }, []);

  const loadData = () => {
    const prefs = personalizedNavigationService.getPreferences();
    const items = personalizedNavigationService.getNavigationItems();
    const grouped = personalizedNavigationService.getGroupedNavigationItems();
    
    setPreferences(prefs);
    setNavigationItems(items);
    setGroupedItems(grouped);
  };

  const updatePreference = (key: keyof NavigationPreferences, value: any) => {
    if (!preferences) return;
    
    const updatedPreferences = { ...preferences, [key]: value };
    personalizedNavigationService.updatePreferences({ [key]: value });
    setPreferences(updatedPreferences);
  };

  const toggleFavorite = (itemId: string) => {
    const item = navigationItems.find(item => item.id === itemId);
    if (!item) return;

    if ((item as any).isFavorite) {
      personalizedNavigationService.removeFromFavorites(itemId);
    } else {
      personalizedNavigationService.addToFavorites(itemId);
    }
  };

  const toggleItemVisibility = (itemId: string) => {
    const item = navigationItems.find(item => item.id === itemId);
    if (!item) return;

    if (preferences?.hiddenItems.includes(itemId)) {
      personalizedNavigationService.showItem(itemId);
    } else {
      personalizedNavigationService.hideItem(itemId);
    }
  };

  const addCustomItem = () => {
    if (!customItem.label || !customItem.href) return;

    personalizedNavigationService.addCustomItem({
      label: customItem.label,
      href: customItem.href,
      icon: customItem.icon,
      category: customItem.category,
      priority: 100,
      description: customItem.description
    });

    setCustomItem({
      label: '',
      href: '',
      icon: 'fas fa-link',
      category: 'utility',
      description: ''
    });
    setShowAddCustomItem(false);
  };

  const removeCustomItem = (itemId: string) => {
    personalizedNavigationService.removeCustomItem(itemId);
  };

  const clearRecentlyAccessed = () => {
    if (confirm('Are you sure you want to clear all recently accessed content?')) {
      recentlyAccessedService.clearAll();
    }
  };

  const resetNavigationPreferences = () => {
    if (confirm('Are you sure you want to reset all navigation preferences to defaults?')) {
      personalizedNavigationService.updatePreferences({
        favoriteItems: [],
        hiddenItems: [],
        customOrder: [],
        showIcons: true,
        showDescriptions: false,
        showShortcuts: true,
        groupByCategory: false,
        maxVisibleItems: 8
      });
    }
  };

  if (!preferences) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Navigation Settings</h2>
        <p className="text-gray-600 mt-1">
          Customize your navigation experience and manage your preferences
        </p>
      </div>

      {/* Display Preferences */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Preferences</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Show Icons</label>
              <p className="text-xs text-gray-500">Display icons next to navigation items</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.showIcons}
                onChange={(e) => updatePreference('showIcons', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Show Descriptions</label>
              <p className="text-xs text-gray-500">Show item descriptions on hover</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.showDescriptions}
                onChange={(e) => updatePreference('showDescriptions', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Show Keyboard Shortcuts</label>
              <p className="text-xs text-gray-500">Display keyboard shortcuts when available</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.showShortcuts}
                onChange={(e) => updatePreference('showShortcuts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Group by Category</label>
              <p className="text-xs text-gray-500">Organize navigation items by category</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.groupByCategory}
                onChange={(e) => updatePreference('groupByCategory', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Maximum Visible Items: {preferences.maxVisibleItems}
            </label>
            <input
              type="range"
              min="4"
              max="12"
              value={preferences.maxVisibleItems}
              onChange={(e) => updatePreference('maxVisibleItems', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>4</span>
              <span>12</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Items Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Navigation Items</h3>
          <button
            onClick={() => setShowAddCustomItem(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Custom Item
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h4>
              <div className="space-y-2">
                {items.map((item) => {
                  const isFavorite = (item as any).isFavorite;
                  const isHidden = preferences.hiddenItems.includes(item.id);
                  
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isHidden ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <i className={`${item.icon} text-gray-600 w-5`}></i>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${isHidden ? 'text-gray-400' : 'text-gray-900'}`}>
                              {item.label}
                            </span>
                            {isFavorite && (
                              <i className="fas fa-star text-yellow-500 text-xs"></i>
                            )}
                            {item.isCustom && (
                              <span className="px-2 py-1 bg-light text-blue-700 text-xs rounded">
                                Custom
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500">{item.description}</p>
                          )}
                          {item.accessCount && item.accessCount > 0 && (
                            <p className="text-xs text-gray-400">
                              Accessed {item.accessCount} times
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className={`p-2 rounded transition-colors ${
                            isFavorite
                              ? 'text-yellow-500 hover:text-yellow-600'
                              : 'text-gray-400 hover:text-yellow-500'
                          }`}
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <i className={`fas fa-star ${isFavorite ? '' : 'far'}`}></i>
                        </button>

                        <button
                          onClick={() => toggleItemVisibility(item.id)}
                          className={`p-2 rounded transition-colors ${
                            isHidden
                              ? 'text-gray-400 hover:text-green-600'
                              : 'text-gray-400 hover:text-red-600'
                          }`}
                          title={isHidden ? 'Show item' : 'Hide item'}
                        >
                          <i className={`fas ${isHidden ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                        </button>

                        {item.isCustom && (
                          <button
                            onClick={() => removeCustomItem(item.id)}
                            className="p-2 rounded text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove custom item"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Item Modal */}
      {showAddCustomItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Navigation Item</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={customItem.label}
                  onChange={(e) => setCustomItem({ ...customItem, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Navigation item label"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="text"
                  value={customItem.href}
                  onChange={(e) => setCustomItem({ ...customItem, href: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="/custom-page"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                <input
                  type="text"
                  value={customItem.icon}
                  onChange={(e) => setCustomItem({ ...customItem, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="fas fa-link"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={customItem.category}
                  onChange={(e) => setCustomItem({ ...customItem, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="utility">Utility</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={customItem.description}
                  onChange={(e) => setCustomItem({ ...customItem, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Brief description"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddCustomItem(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addCustomItem}
                disabled={!customItem.label || !customItem.href}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Recently Accessed Content</h4>
              <p className="text-sm text-gray-600">Clear your browsing history and recently accessed items</p>
            </div>
            <button
              onClick={clearRecentlyAccessed}
              className="px-4 py-2 text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear History
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Navigation Preferences</h4>
              <p className="text-sm text-gray-600">Reset all navigation settings to default values</p>
            </div>
            <button
              onClick={resetNavigationPreferences}
              className="px-4 py-2 text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}