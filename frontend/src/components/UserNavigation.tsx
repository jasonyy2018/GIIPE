'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { personalizedNavigationService, type NavigationItem } from '@/services/personalizedNavigationService';
import { useNavigationTracking } from '@/hooks/useNavigationTracking';
import BreadcrumbNavigation from './navigation/BreadcrumbNavigation';
import RecentlyAccessedContent from './navigation/RecentlyAccessedContent';

interface UserNavigationProps {
  showBreadcrumbs?: boolean;
  showRecentlyAccessed?: boolean;
  maxItems?: number;
  className?: string;
}

export default function UserNavigation({ 
  showBreadcrumbs = false,
  showRecentlyAccessed = true,
  maxItems = 8,
  className = ''
}: UserNavigationProps) {
  const pathname = usePathname();
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [showRecentlyAccessedPanel, setShowRecentlyAccessedPanel] = useState(false);
  
  // Track navigation automatically
  const { trackNavigationItemClick } = useNavigationTracking();

  useEffect(() => {
    // Load personalized navigation items
    const items = personalizedNavigationService.getNavigationItems();
    setNavigationItems(items.slice(0, maxItems));

    // Subscribe to changes
    const unsubscribe = personalizedNavigationService.subscribe(() => {
      const updatedItems = personalizedNavigationService.getNavigationItems();
      setNavigationItems(updatedItems.slice(0, maxItems));
    });

    return unsubscribe;
  }, [maxItems]);

  const handleItemClick = (item: NavigationItem) => {
    trackNavigationItemClick(item.id);
    personalizedNavigationService.trackItemAccess(item.id);
  };

  const isActiveItem = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className={className}>
      {/* Main Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Navigation Items */}
            <div className="flex space-x-8 overflow-x-auto">
              {navigationItems.map((item) => {
                const isActive = isActiveItem(item.href);
                const isFavorite = (item as any).isFavorite;
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => handleItemClick(item)}
                    className={`inline-flex items-center px-1 pt-1 pb-4 border-b-2 text-sm font-medium transition-colors whitespace-nowrap relative ${
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    title={item.description}
                  >
                    <i className={`${item.icon} mr-2`}></i>
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.label.charAt(0)}</span>
                    
                    {/* Favorite indicator */}
                    {isFavorite && (
                      <i className="fas fa-star text-yellow-500 text-xs ml-1"></i>
                    )}
                    
                    {/* Access count indicator (for frequently used items) */}
                    {(item.accessCount || 0) > 10 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-2">
              {showRecentlyAccessed && (
                <div className="relative">
                  <button
                    onClick={() => setShowRecentlyAccessedPanel(!showRecentlyAccessedPanel)}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title="Recently accessed content"
                  >
                    <i className="fas fa-clock"></i>
                  </button>
                  
                  {/* Recently accessed dropdown */}
                  {showRecentlyAccessedPanel && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-10"
                        onClick={() => setShowRecentlyAccessedPanel(false)}
                      ></div>
                      
                      {/* Panel */}
                      <div className="absolute top-full right-0 mt-2 w-80 z-20">
                        <RecentlyAccessedContent
                          maxItems={8}
                          showSearch={true}
                          showClearAll={true}
                          className="shadow-lg border"
                          onItemClick={() => setShowRecentlyAccessedPanel(false)}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              
              <button
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors md:hidden"
                title="Navigation menu"
              >
                <i className="fas fa-bars"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <BreadcrumbNavigation 
              showHome={true}
              maxItems={4}
            />
          </div>
        </div>
      )}
    </div>
  );
}