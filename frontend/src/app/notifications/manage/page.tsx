'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Notification } from '@/types/notification';
import dynamic from 'next/dynamic';

// Dynamic imports to prevent SSR issues
const NotificationSettings = dynamic(() => import('@/components/dashboard/NotificationSettings'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
});

const NotificationHistory = dynamic(() => import('@/components/dashboard/NotificationHistory'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
});

const ArchivedNotifications = dynamic(() => import('@/components/dashboard/ArchivedNotifications'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
});

export default function NotificationManagePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('settings');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Get user ID from auth context or localStorage
    const storedUserId = localStorage.getItem('userId') || 'user-1';
    setUserId(storedUserId);

    // Get tab from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['settings', 'history', 'archived'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/notifications/manage?tab=${tab}`, { scroll: false });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const tabs = [
    {
      id: 'settings',
      name: 'Notification Settings',
      icon: 'fas fa-cog',
      description: 'Manage your notification preferences'
    },
    {
      id: 'history',
      name: 'Notification History',
      icon: 'fas fa-history',
      description: 'View and manage your notification history'
    },
    {
      id: 'archived',
      name: 'Archived Notifications',
      icon: 'fas fa-archive',
      description: 'View and restore archived notifications'
    }
  ];

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notification Management</h1>
                <p className="text-gray-600 mt-1">
                  Manage your notification preferences and view your notification history
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`${tab.icon} mr-2 ${
                  activeTab === tab.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'
                }`}></i>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleTabChange('settings')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <i className="fas fa-cog mr-2"></i>
                  Notification Settings
                </button>
                <button
                  onClick={() => handleTabChange('history')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'history'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <i className="fas fa-history mr-2"></i>
                  View History
                </button>
                <button
                  onClick={() => handleTabChange('archived')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'archived'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <i className="fas fa-archive mr-2"></i>
                  Archived
                </button>
              </div>

              {/* Help Section */}
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  <i className="fas fa-info-circle mr-1"></i>
                  Need Help?
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Learn more about managing your notifications and privacy settings.
                </p>
                <a
                  href="/help/notifications"
                  className="text-sm text-primary hover:text-primary-dark font-medium"
                >
                  View Help Guide �?
                </a>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'settings' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Notification Preferences</h2>
                  <p className="text-gray-600">
                    Customize how and when you receive notifications to stay informed without being overwhelmed.
                  </p>
                </div>
                <NotificationSettings 
                  userId={userId} 
                  showAdvanced={true}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Notification History</h2>
                  <p className="text-gray-600">
                    View, search, and manage your past notifications. You can filter by type, date, or search for specific content.
                  </p>
                </div>
                <NotificationHistory 
                  userId={userId}
                  limit={100}
                  showFilters={true}
                  showSearch={true}
                  onNotificationClick={handleNotificationClick}
                />
              </div>
            )}

            {activeTab === 'archived' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Archived Notifications</h2>
                  <p className="text-gray-600">
                    View and restore notifications that have been archived. Archived notifications are automatically removed from your main notification list but can be restored at any time.
                  </p>
                </div>
                <ArchivedNotifications 
                  userId={userId}
                  limit={100}
                  onNotificationRestore={(archiveId) => {
                    console.log('Notification restored:', archiveId);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}