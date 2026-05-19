'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdminNavigation({ activeTab, onTabChange }: AdminNavigationProps) {
  const router = useRouter();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navigationTabs = [
    { id: 'overview', name: 'Overview', icon: 'fas fa-chart-line', description: 'System overview and statistics' },
    { id: 'dashboard', name: 'Custom Dashboard', icon: 'fas fa-th-large', description: 'Customizable analytics dashboard', route: '/admin/dashboard' },
    { id: 'users', name: 'Users', icon: 'fas fa-users', description: 'User management and roles' },
    { id: 'events', name: 'Events', icon: 'fas fa-calendar-alt', description: 'Event management' },
    { id: 'content', name: 'Content', icon: 'fas fa-newspaper', description: 'Content moderation' },
    { id: 'system', name: 'System', icon: 'fas fa-cog', description: 'System settings and configuration' },
    { id: 'logs', name: 'Audit Logs', icon: 'fas fa-list-alt', description: 'System audit logs', route: '/admin/audit' }
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:block bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {navigationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.route) {
                    router.push(tab.route);
                  } else if (tab.id === 'users') {
                    router.push('/admin/users');
                  } else {
                    onTabChange(tab.id);
                  }
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors group ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                title={tab.description}
              >
                <i className={`${tab.icon} mr-2`}></i>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center">
              <i className={`${navigationTabs.find(tab => tab.id === activeTab)?.icon} mr-2 text-primary`}></i>
              <span className="font-medium text-gray-900">
                {navigationTabs.find(tab => tab.id === activeTab)?.name}
              </span>
            </div>
            <i className={`fas fa-chevron-${showMobileMenu ? 'up' : 'down'} text-gray-400`}></i>
          </button>
          
          {showMobileMenu && (
            <div className="mt-3 space-y-1">
              {navigationTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.route) {
                      router.push(tab.route);
                    } else if (tab.id === 'users') {
                      router.push('/admin/users');
                    } else {
                      onTabChange(tab.id);
                    }
                    setShowMobileMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Quick Actions:</span>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-primary hover:text-primary-dark font-medium"
              >
                <i className="fas fa-th-large mr-1"></i>
                Custom Dashboard
              </button>
              <button
                onClick={() => router.push('/admin/users')}
                className="text-primary hover:text-primary-dark font-medium"
              >
                <i className="fas fa-user-plus mr-1"></i>
                Add User
              </button>
              <button
                onClick={() => router.push('/admin/events/create')}
                className="text-primary hover:text-primary-dark font-medium"
              >
                <i className="fas fa-calendar-plus mr-1"></i>
                Create Event
              </button>
              <button
                onClick={() => onTabChange('content')}
                className="text-primary hover:text-primary-dark font-medium"
              >
                <i className="fas fa-flag mr-1"></i>
                Moderate Content
              </button>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <i className="fas fa-clock"></i>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}