'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Notification, NotificationCategory, NotificationFilter } from '@/types/notification';
import { notificationService } from '@/services/notificationService';

interface NotificationCenterProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
  maxHeight?: string;
  showCategories?: boolean;
  showSearch?: boolean;
  limit?: number;
}

export default function NotificationCenter({
  userId,
  isOpen,
  onClose,
  onNotificationClick,
  maxHeight = '500px',
  showCategories = true,
  showSearch = true,
  limit = 20
}: NotificationCenterProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load notifications
  const loadNotifications = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    
    setLoading(true);
    try {
      const cursor = reset ? undefined : nextCursor;
      const result = await notificationService.getNotifications(userId, filter, limit, cursor);
      
      if (reset) {
        setNotifications(result.notifications);
      } else {
        setNotifications(prev => [...prev, ...result.notifications]);
      }
      
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, filter, limit, nextCursor, loading]);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const result = await notificationService.getNotificationCategories(userId);
      setCategories(result);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, [userId]);

  // Load more notifications (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const result = await notificationService.getNotifications(userId, filter, limit, nextCursor);
      setNotifications(prev => [...prev, ...result.notifications]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, filter, limit, nextCursor, loadingMore, hasMore]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(userId, notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      
      // Update categories count
      loadCategories();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [userId, loadCategories]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead(userId, filter);
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      // Update categories count
      loadCategories();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [userId, filter, loadCategories]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      await notificationService.deleteNotification(userId, notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      // Update categories count
      loadCategories();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [userId, loadCategories]);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else if (notification.actionUrl) {
      router.push(notification.actionUrl);
      onClose();
    }
  }, [markAsRead, onNotificationClick, router, onClose]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilter: NotificationFilter) => {
    setFilter(newFilter);
    setNextCursor(undefined);
  }, []);

  // Filter notifications by search query
  const filteredNotifications = notifications.filter(notification =>
    !searchQuery || 
    notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load data on mount and filter change
  useEffect(() => {
    if (isOpen) {
      loadNotifications(true);
      loadCategories();
    }
  }, [isOpen, loadNotifications, loadCategories]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = notificationService.subscribeToNotifications(userId, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      loadCategories(); // Update counts
    });

    return unsubscribe;
  }, [isOpen, userId, loadCategories]);

  // Get utility functions
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return 'fas fa-cog';
      case 'event': return 'fas fa-calendar-alt';
      case 'social': return 'fas fa-users';
      case 'security': return 'fas fa-shield-alt';
      default: return 'fas fa-bell';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'text-primary';
      case 'event': return 'text-green-600';
      case 'social': return 'text-purple-600';
      case 'security': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'normal': return 'border-l-blue-500 bg-blue-50';
      case 'low': return 'border-l-gray-300 bg-gray-50';
      default: return 'border-l-gray-300 bg-gray-50';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          </div>
        )}

        {/* Categories */}
        {showCategories && (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleFilterChange({ 
                  type: category.id as any 
                })}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter.type === category.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className={`${category.icon} mr-1`}></i>
                {category.name}
                {category.count > 0 && (
                  <span className="ml-1 text-xs">({category.count})</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div 
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight }}
        onScroll={handleScroll}
      >
        {loading && notifications.length === 0 ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer border-l-4 ${getPriorityIndicator(notification.priority)} ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 ${getTypeColor(notification.type)}`}>
                    <i className={`${getTypeIcon(notification.type)} text-lg`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-medium truncate ${
                        !notification.read ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                        {!notification.read && (
                          <span className="ml-2 w-2 h-2 bg-primary rounded-full inline-block"></span>
                        )}
                      </h4>
                      {notification.priority === 'high' && (
                        <i className="fas fa-exclamation-triangle text-red-500 text-sm"></i>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(notification.timestamp).toLocaleString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        {notification.actionText && (
                          <span className="text-xs text-primary font-medium">
                            {notification.actionText}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Load more indicator */}
            {loadingMore && (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <i className="fas fa-bell text-2xl text-gray-400"></i>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No matching notifications' : 'No notifications'}
            </h4>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Try adjusting your search terms.'
                : filter.type === 'unread'
                  ? 'All caught up! You have no unread notifications.'
                  : 'You don\'t have any notifications yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <button
          onClick={() => {
            router.push('/notifications');
            onClose();
          }}
          className="w-full text-center text-sm text-primary hover:text-primary-dark font-medium"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}