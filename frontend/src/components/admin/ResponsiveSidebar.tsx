'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBreakpoint } from './ResponsiveContainer';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavigationItem[];
}

interface ResponsiveSidebarProps {
  navigationItems: NavigationItem[];
  settingsItems: NavigationItem[];
  user?: any;
  onLogout: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ResponsiveSidebar({
  navigationItems,
  settingsItems,
  user,
  onLogout,
  isCollapsed = false,
  onToggleCollapse
}: ResponsiveSidebarProps) {
  const pathname = usePathname();
  const { isMobile, isTablet } = useBreakpoint();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Auto-collapse on mobile/tablet
  const shouldCollapse = isMobile || isTablet || isCollapsed;

  const toggleExpanded = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const isActive = pathname === item.href;
    const isExpanded = expandedItems.has(item.name);
    const hasChildren = item.children && item.children.length > 0;
    const isHovered = hoveredItem === item.name;

    return (
      <div key={item.name} className="relative">
        <div
          className={`flex items-center h-12 mx-2 rounded-xl transition-all duration-200 cursor-pointer group ${
            isActive
              ? 'bg-accent text-white shadow-lg'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          } ${level > 0 ? 'ml-6' : ''}`}
          onMouseEnter={() => setHoveredItem(item.name)}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.name);
            }
          }}
        >
          {hasChildren ? (
            <button className="flex items-center w-full px-3">
              <div className="flex items-center justify-center w-8 h-8">
                <i className={`${item.icon} text-lg`}></i>
              </div>
              {!shouldCollapse && (
                <>
                  <span className="ml-3 font-medium flex-1 text-left">{item.name}</span>
                  <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-sm transition-transform duration-200`}></i>
                </>
              )}
            </button>
          ) : (
            <Link href={item.href} className="flex items-center w-full px-3">
              <div className="flex items-center justify-center w-8 h-8">
                <i className={`${item.icon} text-lg`}></i>
              </div>
              {!shouldCollapse && (
                <>
                  <span className="ml-3 font-medium flex-1">{item.name}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          )}

          {/* Tooltip for collapsed state */}
          {shouldCollapse && (
            <div className={`absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50 transition-all duration-200 ${
              isHovered ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}>
              {item.name}
              {item.badge && item.badge > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45"></div>
            </div>
          )}
        </div>

        {/* Submenu */}
        {hasChildren && isExpanded && !shouldCollapse && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-primary-dark text-white h-full shadow-lg transition-all duration-300 ${
      shouldCollapse ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-center h-16 border-b border-gray-700 px-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-primary-dark font-bold text-sm">G</span>
          </div>
          {!shouldCollapse && (
            <span className="ml-2 font-bold text-lg">GIIP Admin</span>
          )}
        </div>
        
        {/* Collapse toggle for desktop */}
        {!isMobile && !isTablet && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="ml-auto p-2 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`fas fa-chevron-${isCollapsed ? 'right' : 'left'} text-sm`}></i>
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <nav className="flex flex-col py-4">
          {/* Main Navigation */}
          <div className="space-y-1">
            {!shouldCollapse && (
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Main Menu
              </h3>
            )}
            {navigationItems.map((item) => renderNavigationItem(item))}
          </div>

          {/* Divider */}
          <hr className="bg-gray-700 border border-gray-700 rounded-full mx-4 my-4" />

          {/* Settings */}
          <div className="space-y-1">
            {!shouldCollapse && (
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Settings
              </h3>
            )}
            {settingsItems.map((item) => renderNavigationItem(item))}
          </div>
        </nav>
      </div>

      {/* User Profile */}
      <div className={`border-t border-gray-700 p-4 ${shouldCollapse ? 'px-2' : ''}`}>
        {shouldCollapse ? (
          <div className="flex justify-center">
            <div 
              className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-semibold cursor-pointer hover:bg-opacity-80 transition-colors"
              title={`${user?.firstName || 'Admin'} ${user?.lastName || 'User'}`}
            >
              {user?.firstName?.charAt(0) || 'A'}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-semibold">
                {user?.firstName?.charAt(0) || 'A'}
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName || 'Admin'} {user?.lastName || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.email || 'admin@giip.info'}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt text-sm"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}