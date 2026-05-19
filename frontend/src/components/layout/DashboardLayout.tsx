'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  active?: boolean;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  navigationItems: NavigationItem[];
  userRole?: 'admin' | 'user';
}

export default function DashboardLayout({ 
  children, 
  title, 
  navigationItems,
  userRole = 'user'
}: DashboardLayoutProps) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New notification', message: 'You have a new message', time: '2 hours ago', read: false },
    { id: 2, title: 'System update', message: 'System maintenance completed', time: '1 day ago', read: false },
    { id: 3, title: 'Event reminder', message: 'Meeting tomorrow at 10 AM', time: '2 days ago', read: true }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Use authUser directly
  const user = authUser ? {
    name: authUser.username || 'User',
    email: authUser.email || 'user@example.com',
    avatar: '/images/features/innovation.jpg'
  } : {
    name: 'User',
    email: 'user@example.com',
    avatar: '/images/features/innovation.jpg'
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
      router.push('/login');
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    document.body.style.overflow = '';
  };

  const openMobileMenu = () => {
    setMobileMenuOpen(true);
    document.body.style.overflow = 'hidden';
  };

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNotifications && !(event.target as Element).closest('.notifications-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className={`flex flex-col bg-primary-dark text-white ${sidebarCollapsed ? 'w-16' : 'w-16 md:w-64'} h-full fixed shadow-lg z-30 transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 w-full border-b border-gray-700 px-4">
          <Link href="/" className="flex items-center flex-1">
            <div className="h-8 w-8 bg-white rounded flex items-center justify-center">
              <span className="text-primary font-bold text-sm">G</span>
            </div>
            {!sidebarCollapsed && (
              <span className="hidden md:inline ml-2 font-bold text-lg">
                {userRole === 'admin' ? 'Admin Panel' : 'My GIIP'}
              </span>
            )}
          </Link>
          {!sidebarCollapsed && (
            <Link
              href="/"
              className="hidden md:flex items-center px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-primary-light rounded-md transition-colors"
              title="Back to Home"
            >
              <i className="fas fa-home mr-1.5"></i>
              <span>Home</span>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {navigationItems.map((item) => (
            <Link 
              key={item.id}
              href={item.href} 
              className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                item.active 
                  ? 'bg-primary hover:bg-primary-light' 
                  : 'text-gray-300 hover:bg-primary-light hover:text-white'
              }`}
            >
              <i className={`${item.icon} w-5 h-5 mr-3`}></i>
              {!sidebarCollapsed && <span className="hidden md:inline">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Settings */}
        <div className="px-2 py-4 border-t border-gray-700">
          <a href="#" className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-light hover:text-white transition-colors">
            <i className="fas fa-cog w-5 h-5 mr-3"></i>
            {!sidebarCollapsed && <span className="hidden md:inline">Settings</span>}
          </a>
          <a href="#" className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-primary-light hover:text-white transition-colors">
            <i className="fas fa-question-circle w-5 h-5 mr-3"></i>
            {!sidebarCollapsed && <span className="hidden md:inline">Help & Support</span>}
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'ml-16' : 'ml-16 md:ml-64'} transition-all duration-300`}>
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="hidden md:block text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors"
                aria-label="Toggle sidebar"
              >
                <i className="fas fa-bars text-lg"></i>
              </button>
              
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              
              {/* Back to Home Button */}
              <Link
                href="/"
                className="hidden md:flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
                title="Back to Home"
              >
                <i className="fas fa-home mr-2"></i>
                <span>Home</span>
              </Link>
              
              <div className="flex-1 max-w-lg ml-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={userRole === 'admin' ? 'Search users, events...' : 'Search events, news...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative notifications-dropdown">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
                  aria-label="View notifications"
                >
                  <i className="fas fa-bell text-lg"></i>
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div key={notification.id} className={`px-4 py-3 hover:bg-gray-50 ${!notification.read ? 'bg-light' : ''}`}>
                          <div className="flex items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-sm text-gray-500">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                            </div>
                            {!notification.read && (
                              <div className="ml-2 flex-shrink-0">
                                <div className="h-2 w-2 bg-primary rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-200">
                      <a href="#" className="text-sm text-primary hover:text-primary-dark">View all notifications</a>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile User Menu */}
              <div className="md:hidden">
                <button onClick={openMobileMenu} className="flex items-center">
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </button>
              </div>

              {/* Desktop User Menu */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
                  aria-label="Logout"
                >
                  <i className="fas fa-sign-out-alt text-lg"></i>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile User Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">My Account</h3>
                <button
                  onClick={closeMobileMenu}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-4">
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <nav className="space-y-2">
                <Link
                  href="/dashboard/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-user mr-2"></i> Profile
                </Link>
                <Link
                  href="/settings"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-cog mr-2"></i> Settings
                </Link>
                <Link
                  href="/help"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-question-circle mr-2"></i> Help & Support
                </Link>
                <button
                  onClick={() => {
                    closeMobileMenu();
                    handleLogout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i> Sign Out
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}