'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  personalizedNavigationService, 
  type NavigationItem, 
  type NavigationPreferences 
} from '@/services/personalizedNavigationService';

interface PersonalizedNavigationMenuProps {
  orientation?: 'horizontal' | 'vertical';
  showCategories?: boolean;
  showFrequentlyUsed?: boolean;
  showRecentlyUsed?: boolean;
  maxItems?: number;
  className?: string;
  onItemClick?: (item: NavigationItem) => void;
}

export default function PersonalizedNavigationMenu({
  orientation = 'horizontal',
  showCategories = false,
  showFrequentlyUsed = true,
  showRecentlyUsed = true,
  maxItems = 8,
  className = '',
  onItemClick
}: PersonalizedNavigationMenuProps) {
  const pathname = usePathname();
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<Record<string, NavigationItem[]>>({});
  const [frequentlyUsed, setFrequentlyUsed] = useState<NavigationItem[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<NavigationItem[]>([]);
  const [preferences, setPreferences] = useState<NavigationPreferences | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);

  useEffect(() => {
    loadNavigationData();

    // Subscribe to changes
    const unsubscribe = personalizedNavigationService.subscribe(() => {
      loadNavigationData();
    });

    return unsubscribe;
  }, []);

  const loadNavigationData = () => {
    const items = personalizedNavigationService.getNavigationItems();
    const grouped = personalizedNavigationService.getGroupedNavigationItems();
    const frequent = personalizedNavigationService.getFrequentlyUsedItems(5);
    const recent = personalizedNavigationService.getRecentlyUsedItems(5);
    const prefs = personalizedNavigationService.getPreferences();

    setNavigationItems(items.slice(0, maxItems));
    setGroupedItems(grouped);
    setFrequentlyUsed(frequent);
    setRecentlyUsed(recent);
    setPreferences(prefs);
  };

  const handleItemClick = (item: NavigationItem) => {
    personalizedNavigationService.trackItemAccess(item.id);
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const toggleFavorite = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const item = navigationItems.find(item => item.id === itemId);
    if (!item) return;

    if ((item as any).isFavorite) {
      personalizedNavigationService.removeFromFavorites(itemId);
    } else {
      personalizedNavigationService.addToFavorites(itemId);
    }
  };

  const isActiveItem = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const renderNavigationItem = (item: NavigationItem, showActions: boolean = false) => {
    const isActive = isActiveItem(item.href);
    const isFavorite = (item as any).isFavorite;

    return (
      <div key={item.id} className="relative group">
        <Link
          href={item.href}
          onClick={() => handleItemClick(item)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
            orientation === 'vertical' ? 'w-full' : ''
          } ${
            isActive
              ? 'bg-primary text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
          }`}
          title={preferences?.showDescriptions ? item.description : item.label}
        >
          {preferences?.showIcons && (
            <i className={`${item.icon} ${orientation === 'vertical' ? 'w-5' : ''}`}></i>
          )}
          <span className={`font-medium ${orientation === 'horizontal' ? 'hidden md:inline' : ''}`}>
            {item.label}
          </span>
          {preferences?.showShortcuts && item.shortcut && (
            <span className="text-xs bg-gray-200 text-gray-600 px-1 rounded ml-auto">
              {item.shortcut}
            </span>
          )}
          {isFavorite && (
            <i className="fas fa-star text-yellow-500 text-xs"></i>
          )}
        </Link>

        {/* Action buttons (visible on hover) */}
        {showActions && (
          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => toggleFavorite(e, item.id)}
              className={`p-1 rounded text-xs ${
                isFavorite 
                  ? 'text-yellow-500 hover:text-yellow-600' 
                  : 'text-gray-400 hover:text-yellow-500'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <i className={`fas fa-star ${isFavorite ? '' : 'far'}`}></i>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCategorizedNavigation = () => {
    const categories = [
      { key: 'primary', label: 'Main', icon: 'fas fa-home' },
      { key: 'secondary', label: 'Tools', icon: 'fas fa-tools' },
      { key: 'utility', label: 'Settings', icon: 'fas fa-cog' }
    ];

    return (
      <div className="space-y-6">
        {categories.map(category => {
          const items = groupedItems[category.key] || [];
          if (items.length === 0) return null;

          return (
            <div key={category.key}>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center">
                <i className={`${category.icon} mr-2`}></i>
                {category.label}
              </h4>
              <div className={`space-y-1 ${orientation === 'horizontal' ? 'flex space-x-2 space-y-0' : ''}`}>
                {items.slice(0, maxItems).map(item => renderNavigationItem(item, true))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderQuickAccess = () => {
    if (!showFrequentlyUsed && !showRecentlyUsed) return null;

    return (
      <div className="border-t border-gray-200 pt-4 mt-4">
        {showFrequentlyUsed && frequentlyUsed.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center">
              <i className="fas fa-fire mr-2"></i>
              Frequently Used
            </h4>
            <div className={`space-y-1 ${orientation === 'horizontal' ? 'flex space-x-2 space-y-0' : ''}`}>
              {frequentlyUsed.slice(0, 3).map(item => renderNavigationItem(item))}
            </div>
          </div>
        )}

        {showRecentlyUsed && recentlyUsed.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center">
              <i className="fas fa-clock mr-2"></i>
              Recently Used
            </h4>
            <div className={`space-y-1 ${orientation === 'horizontal' ? 'flex space-x-2 space-y-0' : ''}`}>
              {recentlyUsed.slice(0, 3).map(item => renderNavigationItem(item))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!preferences) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <nav className={`${className}`} aria-label="Personalized navigation">
      {/* Customization toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Navigation</h3>
        <button
          onClick={() => setShowCustomization(!showCustomization)}
          className="text-sm text-gray-500 hover:text-primary transition-colors"
          title="Customize navigation"
        >
          <i className="fas fa-cog"></i>
        </button>
      </div>

      {/* Customization panel */}
      {showCustomization && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Customize Navigation</h4>
          
          <div className="space-y-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={preferences.showIcons}
                onChange={(e) => personalizedNavigationService.updatePreferences({ showIcons: e.target.checked })}
                className="mr-2"
              />
              Show icons
            </label>
            
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={preferences.showDescriptions}
                onChange={(e) => personalizedNavigationService.updatePreferences({ showDescriptions: e.target.checked })}
                className="mr-2"
              />
              Show descriptions on hover
            </label>
            
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={preferences.groupByCategory}
                onChange={(e) => personalizedNavigationService.updatePreferences({ groupByCategory: e.target.checked })}
                className="mr-2"
              />
              Group by category
            </label>
          </div>
        </div>
      )}

      {/* Navigation items */}
      <div className={orientation === 'horizontal' ? 'flex space-x-2 overflow-x-auto' : 'space-y-1'}>
        {preferences.groupByCategory || showCategories ? (
          renderCategorizedNavigation()
        ) : (
          <div className={`space-y-1 ${orientation === 'horizontal' ? 'flex space-x-2 space-y-0' : ''}`}>
            {navigationItems.map(item => renderNavigationItem(item, true))}
          </div>
        )}
      </div>

      {/* Quick access section */}
      {orientation === 'vertical' && renderQuickAccess()}
    </nav>
  );
}