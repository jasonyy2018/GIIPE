'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/admin', icon: 'fas fa-tachometer-alt' },
    { name: 'Events', href: '/admin/events', icon: 'fas fa-calendar-alt' },
    { name: 'Bill Center', href: '/admin/orders', icon: 'fas fa-receipt' },
    { name: 'Users', href: '/admin/users', icon: 'fas fa-user-circle' },
  ];

  const settingsItems = [
    { name: 'Settings', href: '/admin/settings', icon: 'fas fa-cog' },
    { name: 'System', href: '/admin/system', icon: 'fas fa-tools' },
    { name: 'Help & Support', href: '/admin/help', icon: 'fas fa-question-circle' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className={`flex flex-col bg-primary-dark text-white w-16 md:w-64 h-full fixed shadow-lg z-30 transition-all duration-300 ${sidebarOpen ? 'w-64' : ''}`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 w-full border-b border-gray-700 px-4">
          <Link href="/" className="flex items-center flex-1">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-primary-dark font-bold text-sm">G</span>
            </div>
            <span className="hidden md:inline ml-2 font-bold text-lg">GIIP Admin</span>
          </Link>
          <Link
            href="/"
            className="hidden md:flex items-center px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-primary-light rounded-md transition-colors"
            title="Back to Home"
          >
            <i className="fas fa-home mr-1.5"></i>
            <span>Home</span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <nav className="flex flex-col py-4 px-3">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center h-12 mt-2 mb-2 mx-auto md:mx-0 shadow-lg rounded-xl hover:rounded-2xl transition-all duration-300 ease-linear cursor-pointer group ${
                  pathname === item.href
                    ? 'bg-accent text-white'
                    : 'bg-primary-dark text-white hover:bg-accent hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center w-12 h-12">
                  <i className={`${item.icon} text-xl`}></i>
                </div>
                <span className="hidden md:inline ml-4 font-medium">{item.name}</span>
                <span className="absolute w-auto p-2 m-2 min-w-max left-14 rounded-md shadow-md text-white bg-primary text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100 md:hidden">
                  {item.name}
                </span>
              </Link>
            ))}

            <hr className="bg-gray-700 border border-gray-700 rounded-full mx-2 mt-4 mb-4" />

            {settingsItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center h-12 mt-2 mb-2 mx-auto md:mx-0 shadow-lg rounded-xl hover:rounded-2xl transition-all duration-300 ease-linear cursor-pointer group ${
                  pathname === item.href
                    ? 'bg-accent text-white'
                    : 'bg-primary-dark text-white hover:bg-accent hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center w-12 h-12">
                  <i className={`${item.icon} text-xl`}></i>
                </div>
                <span className="hidden md:inline ml-4 font-medium">{item.name}</span>
                <span className="absolute w-auto p-2 m-2 min-w-max left-14 rounded-md shadow-md text-white bg-primary text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100 md:hidden">
                  {item.name}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Profile */}
        <div className="hidden md:flex items-center justify-between h-16 w-full border-t border-gray-700 px-4">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-semibold">
              {user?.firstName?.charAt(0) || 'A'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.firstName || 'Admin'} {user?.lastName || 'User'}</p>
              <p className="text-xs text-gray-400">{user?.email || 'admin@giip.info'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden ml-16 md:ml-64">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm z-20">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden text-gray-600 hover:text-primary transition-colors mr-4"
              >
                <i className="fas fa-bars text-xl"></i>
              </button>
              
              {/* Back to Home Button */}
              <Link
                href="/"
                className="hidden md:flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
                title="Back to Home"
              >
                <i className="fas fa-home mr-2"></i>
                <span>Home</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm w-64"
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button className="text-gray-600 hover:text-primary transition-colors">
                  <i className="fas fa-bell text-xl"></i>
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    3
                  </span>
                </button>
              </div>

              {/* Mobile User Menu */}
              <div className="md:hidden">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex items-center"
                >
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-semibold text-white">
                    {user?.firstName?.charAt(0) || 'A'}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile User Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">My Account</h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center font-semibold text-white text-lg">
                  {user?.firstName?.charAt(0) || 'A'}
                </div>
                <div className="ml-3">
                  <p className="font-medium">{user?.firstName || 'Admin'} {user?.lastName || 'User'}</p>
                  <p className="text-sm text-gray-500">{user?.email || 'admin@giip.info'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <Link
                  href="/admin/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className="fas fa-user mr-2"></i> Profile
                </Link>
                <Link
                  href="/admin/settings"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className="fas fa-cog mr-2"></i> Settings
                </Link>
                <Link
                  href="/admin/help"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className="fas fa-question-circle mr-2"></i> Help & Support
                </Link>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}