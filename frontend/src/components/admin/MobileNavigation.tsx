'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  badge?: number;
}

interface MobileNavigationProps {
  navigationItems: NavigationItem[];
  settingsItems: NavigationItem[];
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onLogout: () => void;
}

export default function MobileNavigation({
  navigationItems,
  settingsItems,
  isOpen,
  onClose,
  user,
  onLogout
}: MobileNavigationProps) {
  const pathname = usePathname();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Handle swipe to close
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    
    if (isLeftSwipe) {
      onClose();
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Menu */}
      <div 
        className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-primary-dark text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-primary-dark font-bold text-sm">G</span>
            </div>
            <span className="ml-2 font-bold text-lg">GIIP Admin</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            aria-label="Close navigation menu"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex flex-col h-full overflow-y-auto">
          {/* User Profile Section */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center font-semibold text-lg">
                {user?.firstName?.charAt(0) || 'A'}
              </div>
              <div className="ml-3">
                <p className="font-medium text-lg">{user?.firstName || 'Admin'} {user?.lastName || 'User'}</p>
                <p className="text-sm text-gray-300">{user?.email || 'admin@giip.info'}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role || 'Administrator'}</p>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-4 py-6">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Main Menu
              </h3>
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-accent text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8">
                    <i className={`${item.icon} text-lg`}></i>
                  </div>
                  <span className="ml-4 font-medium">{item.name}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Settings Section */}
            <div className="mt-8 space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Settings
              </h3>
              {settingsItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-accent text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8">
                    <i className={`${item.icon} text-lg`}></i>
                  </div>
                  <span className="ml-4 font-medium">{item.name}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full flex items-center px-4 py-3 text-red-300 hover:text-red-200 hover:bg-red-900 hover:bg-opacity-20 rounded-xl transition-all duration-200"
            >
              <i className="fas fa-sign-out-alt text-lg"></i>
              <span className="ml-4 font-medium">Logout</span>
            </button>
          </div>
        </div>

        {/* Swipe indicator */}
        <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-white bg-opacity-20 rounded-r-lg p-1">
          <i className="fas fa-chevron-left text-white text-xs"></i>
        </div>
      </div>
    </>
  );
}