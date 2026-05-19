'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'system' | 'event' | 'social' | 'security';
  priority: 'low' | 'normal' | 'high';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'system' | 'event' | 'social' | 'security'>('all');

  useEffect(() => {
    // Check authentication
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          router.push('/login');
          return;
        }
      }
      
      // Load notifications (mock data for now)
      const mockNotifications: Notification[] = [
        {
          id: 1,
          title: 'New event invitation',
          message: 'You\'ve been invited to the IP Strategy Conference 2024. Registration closes in 3 days.',
          type: 'event',
          priority: 'high',
          timestamp: '2024-05-20T10:30:00Z',
          read: false,
          actionUrl: '/events/1',
          actionText: 'View Event'
        },
        {
          id: 2,
          title: 'Article saved successfully',
          message: 'The article "Patent Trends in AI" has been added to your bookmarks.',
          type: 'system',
          priority: 'normal',
          timestamp: '2024-05-20T09:15:00Z',
          read: false,
          actionUrl: '/bookmarks',
          actionText: 'View Bookmarks'
        },
        {
          id: 3,
          title: 'Connection request',
          message: 'Dr. Sarah Chen wants to connect with you.',
          type: 'social',
          priority: 'normal',
          timestamp: '2024-05-19T16:45:00Z',
          read: true,
          actionUrl: '/messages',
          actionText: 'View Request'
        },
        {
          id: 4,
          title: 'Event reminder',
          message: 'Global Innovation Summit starts tomorrow at 9:00 AM.',
          type: 'event',
          priority: 'high',
          timestamp: '2024-05-19T08:00:00Z',
          read: true,
          actionUrl: '/events/2',
          actionText: 'View Details'
        },
        {
          id: 5,
          title: 'Security alert',
          message: 'New login detected from Chrome on Windows. If this wasn\'t you, please secure your account.',
          type: 'security',
          priority: 'high',
          timestamp: '2024-05-18T14:20:00Z',
          read: true,
          actionUrl: '/settings',
          actionText: 'Security Settings'
        },
        {
          id: 6,
          title: 'Profile updated',
          message: 'Your profile information has been successfully updated.',
          type: 'system',
          priority: 'low',
          timestamp: '2024-05-18T11:30:00Z',
          read: true
        },
        {
          id: 7,
          title: 'New article published',
          message: 'A new article "Future of IP in Blockchain" has been published in your area of interest.',
          type: 'system',
          priority: 'normal',
          timestamp: '2024-05-17T13:45:00Z',
          read: true,
          actionUrl: '/news/7',
          actionText: 'Read Article'
        }
      ];
      
      setNotifications(mockNotifications);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'system':
      case 'event':
      case 'social':
      case 'security':
        return notification.type === filter;
      default:
        return true;
    }
  });

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id: number) => {
    if (confirm('Are you sure you want to delete this notification?')) {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system':
        return 'fas fa-cog';
      case 'event':
        return 'fas fa-calendar-alt';
      case 'social':
        return 'fas fa-users';
      case 'security':
        return 'fas fa-shield-alt';
      default:
        return 'fas fa-bell';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system':
        return 'text-primary';
      case 'event':
        return 'text-green-600';
      case 'social':
        return 'text-purple-600';
      case 'security':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'normal':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-gray-300';
      default:
        return 'border-l-gray-300';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 text-gray-600 hover:text-primary transition-colors"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <h1 className="text-2xl font-bold text-primary-dark">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 bg-accent text-white text-sm px-2 py-1 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-primary hover:text-primary-dark font-medium"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="text-primary hover:text-primary-dark font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All', icon: 'fas fa-list' },
                { key: 'unread', label: 'Unread', icon: 'fas fa-envelope' },
                { key: 'system', label: 'System', icon: 'fas fa-cog' },
                { key: 'event', label: 'Events', icon: 'fas fa-calendar-alt' },
                { key: 'social', label: 'Social', icon: 'fas fa-users' },
                { key: 'security', label: 'Security', icon: 'fas fa-shield-alt' }
              ].map((filterOption) => (
                <button
                  key={filterOption.key}
                  onClick={() => setFilter(filterOption.key as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === filterOption.key
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <i className={`${filterOption.icon} mr-2`}></i>
                  {filterOption.label}
                  {filterOption.key === 'unread' && unreadCount > 0 && (
                    <span className="ml-1 bg-white text-primary text-xs px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          {filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg shadow-sm border-l-4 ${getPriorityColor(notification.priority)} ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`mt-1 ${getTypeColor(notification.type)}`}>
                          <i className={`${getTypeIcon(notification.type)} text-lg`}></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primary rounded-full"></span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{notification.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              {new Date(notification.timestamp).toLocaleString()}
                            </span>
                            <div className="flex items-center space-x-3">
                              {notification.actionUrl && notification.actionText && (
                                <button
                                  onClick={() => {
                                    markAsRead(notification.id);
                                    router.push(notification.actionUrl!);
                                  }}
                                  className="text-primary hover:text-primary-dark text-sm font-medium"
                                >
                                  {notification.actionText}
                                </button>
                              )}
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-gray-500 hover:text-gray-700 text-sm"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors ml-4"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <i className="fas fa-bell text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? 'All caught up! You have no unread notifications.'
                  : filter === 'all'
                    ? 'You don\'t have any notifications yet.'
                    : `No ${filter} notifications found.`
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}