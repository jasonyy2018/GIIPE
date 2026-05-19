'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import PersonalizedNavigationMenu from './PersonalizedNavigationMenu';
import RecentlyAccessedContent from './RecentlyAccessedContent';
import { useNavigationTracking } from '@/hooks/useNavigationTracking';

interface NavigationLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
  showPersonalizedNav?: boolean;
  showRecentlyAccessed?: boolean;
  showSidebar?: boolean;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: (collapsed: boolean) => void;
  className?: string;
}

export default function NavigationLayout({
  children,
  showBreadcrumbs = true,
  showPersonalizedNav = true,
  showRecentlyAccessed = true,
  showSidebar = true,
  sidebarCollapsed: controlledCollapsed,
  onSidebarToggle,
  className = ''
}: NavigationLayoutProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [showRecentlyAccessedPanel, setShowRecentlyAccessedPanel] = useState(false);
  
  // Use controlled or internal state for sidebar collapse
  const sidebarCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  
  // Track navigation automatically
  useNavigationTracking({
    trackPageVisits: true,
    trackNavigationClicks: true
  });

  const handleSidebarToggle = () => {
    const newCollapsed = !sidebarCollapsed;
    
    if (onSidebarToggle) {
      onSidebarToggle(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  };

  const getPageTitle = (): string => {
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) return 'Dashboard';
    
    const titleMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'events': 'Events',
      'news': 'News & Updates',
      'bookmarks': 'Saved Content',
      'messages': 'Messages',
      'profile': 'Profile',
      'settings': 'Settings',
      'search': 'Search Results',
      'connections': 'My Network',
      'social': 'Social Activity',
      'mentions': 'Mentions',
      'analytics': 'Analytics'
    };

    const mainSection = pathSegments[0];
    return titleMap[mainSection] || mainSection.charAt(0).toUpperCase() + mainSection.slice(1);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Menu toggle and breadcrumbs */}
            <div className="flex items-center space-x-4">
              {showSidebar && (
                <button
                  onClick={handleSidebarToggle}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Toggle sidebar"
                >
                  <i className={`fas ${sidebarCollapsed ? 'fa-bars' : 'fa-times'}`}></i>
                </button>
              )}
              
              {showBreadcrumbs && (
                <BreadcrumbNavigation 
                  showHome={true}
                  maxItems={4}
                  className="hidden md:flex"
                />
              )}
            </div>

            {/* Center - Page title (mobile) */}
            <div className="md:hidden">
              <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
            </div>

            {/* Right side - Quick actions */}
            <div className="flex items-center space-x-3">
              {showRecentlyAccessed && (
                <button
                  onClick={() => setShowRecentlyAccessedPanel(!showRecentlyAccessedPanel)}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors relative"
                  title="Recently accessed content"
                >
                  <i className="fas fa-clock"></i>
                  {showRecentlyAccessedPanel && (
                    <div className="absolute top-full right-0 mt-2 w-80 z-50">
                      <RecentlyAccessedContent
                        maxItems={8}
                        showSearch={true}
                        showClearAll={true}
                        className="shadow-lg"
                        onItemClick={() => setShowRecentlyAccessedPanel(false)}
                      />
                    </div>
                  )}
                </button>
              )}
              
              <button
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Search"
              >
                <i className="fas fa-search"></i>
              </button>
              
              <button
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Notifications"
              >
                <i className="fas fa-bell"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <aside 
            className={`bg-white shadow-sm border-r border-gray-200 transition-all duration-300 ${
              sidebarCollapsed ? 'w-16' : 'w-64'
            } flex-shrink-0`}
          >
            <div className="h-full overflow-y-auto">
              {showPersonalizedNav && (
                <div className="p-4">
                  <PersonalizedNavigationMenu
                    orientation="vertical"
                    showCategories={!sidebarCollapsed}
                    showFrequentlyUsed={!sidebarCollapsed}
                    showRecentlyUsed={!sidebarCollapsed}
                    maxItems={sidebarCollapsed ? 6 : 12}
                    className={sidebarCollapsed ? 'space-y-2' : ''}
                  />
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full">
            {/* Page header with breadcrumbs (desktop) */}
            {showBreadcrumbs && (
              <div className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{getPageTitle()}</h1>
                    <BreadcrumbNavigation 
                      showHome={true}
                      maxItems={5}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Page content */}
            <div className="p-6">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Recently accessed overlay (mobile) */}
      {showRecentlyAccessedPanel && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
          onClick={() => setShowRecentlyAccessedPanel(false)}
        >
          <div 
            className="absolute top-16 left-4 right-4 max-h-96"
            onClick={(e) => e.stopPropagation()}
          >
            <RecentlyAccessedContent
              maxItems={10}
              showSearch={true}
              showClearAll={true}
              className="shadow-xl"
              onItemClick={() => setShowRecentlyAccessedPanel(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}