'use client';

import { useState, useRef, useEffect } from 'react';
import { useBreakpoint } from './ResponsiveContainer';

interface ResponsiveHeaderProps {
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onMobileMenuToggle?: () => void;
  showMobileMenuButton?: boolean;
  notifications?: React.ReactNode;
  user?: any;
  connectionStatus?: {
    isConnected: boolean;
    label?: string;
  };
}

export default function ResponsiveHeader({
  title,
  breadcrumbs,
  actions,
  searchPlaceholder = "Search...",
  onSearch,
  onMobileMenuToggle,
  showMobileMenuButton = false,
  notifications,
  user,
  connectionStatus
}: ResponsiveHeaderProps) {
  const { isMobile, isTablet } = useBreakpoint();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  // Focus search input when mobile search is shown
  useEffect(() => {
    if (showMobileSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showMobileSearch]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile search on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMobileSearch(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-20">
      {/* Main Header */}
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          {showMobileMenuButton && (isMobile || isTablet) && (
            <button
              onClick={onMobileMenuToggle}
              className="p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
              aria-label="Open navigation menu"
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
          )}

          {/* Title and Breadcrumbs */}
          <div className="min-w-0 flex-1">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && (
                      <i className="fas fa-chevron-right text-gray-400 text-xs mx-2"></i>
                    )}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="text-gray-600 hover:text-primary transition-colors truncate"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="text-gray-900 font-medium truncate">
                        {crumb.label}
                      </span>
                    )}
                  </div>
                ))}
              </nav>
            ) : title ? (
              <h1 className="text-xl font-semibold text-gray-900 truncate">
                {title}
              </h1>
            ) : null}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3 lg:space-x-4">
          {/* Desktop Search */}
          {onSearch && !isMobile && !isTablet && (
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 w-64 xl:w-80 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 focus:border-primary text-sm transition-all duration-200"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </form>
          )}

          {/* Mobile Search Button */}
          {onSearch && (isMobile || isTablet) && (
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
              aria-label="Search"
            >
              <i className="fas fa-search text-lg"></i>
            </button>
          )}

          {/* Connection Status */}
          {connectionStatus && (
            <div className="hidden sm:flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-gray-500 hidden lg:inline">
                {connectionStatus.label || (connectionStatus.isConnected ? 'Connected' : 'Disconnected')}
              </span>
            </div>
          )}

          {/* Notifications */}
          {notifications}

          {/* Actions */}
          {actions && (
            <div className="hidden sm:flex items-center space-x-2">
              {actions}
            </div>
          )}

          {/* User Menu */}
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-semibold text-white">
                  {user?.firstName?.charAt(0) || 'A'}
                </div>
                {!isMobile && (
                  <span className="text-sm font-medium text-gray-700 hidden lg:inline">
                    {user?.firstName || 'Admin'}
                  </span>
                )}
                <i className="fas fa-chevron-down text-xs text-gray-400 hidden lg:inline"></i>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName || 'Admin'} {user?.lastName || 'User'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user?.email || 'admin@giip.info'}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {user?.role || 'Administrator'}
                    </p>
                  </div>
                  
                  <div className="py-2">
                    <a
                      href="/admin/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <i className="fas fa-user-circle mr-3 text-gray-400"></i>
                      Profile Settings
                    </a>
                    <a
                      href="/admin/preferences"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <i className="fas fa-cog mr-3 text-gray-400"></i>
                      Preferences
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showMobileSearch && (isMobile || isTablet) && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <form onSubmit={handleSearch} className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 focus:border-primary text-sm"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </form>
        </div>
      )}

      {/* Mobile Actions */}
      {actions && (isMobile || isTablet) && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 sm:hidden">
          <div className="flex items-center justify-center space-x-4">
            {actions}
          </div>
        </div>
      )}
    </header>
  );
}