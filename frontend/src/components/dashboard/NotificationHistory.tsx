'use client';

import { useState, useEffect, useCallback } from 'react';
import { Notification, NotificationFilter } from '@/types/notification';
import { notificationService } from '@/services/notificationService';

interface NotificationHistoryProps {
  userId: string;
  limit?: number;
  showFilters?: boolean;
  showSearch?: boolean;
  onNotificationClick?: (notification: Notification) => void;
}

export default function NotificationHistory({
  userId,
  limit = 50,
  showFilters = true,
  showSearch = true,
  onNotificationClick
}: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const filterWithDates = {
        ...filter,
        ...(dateRange.start && dateRange.end && {
          dateRange: {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end)
          }
        })
      };

      const result = await notificationService.getNotifications(userId, filterWithDates, limit);
      setNotifications(result.notifications);
    } catch (error) {
      console.error('Error loading notification history:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, filter, dateRange, limit]);

  // Load notifications on mount and filter change
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Filter notifications by search query
  const filteredNotifications = notifications.filter(notification =>
    !searchQuery || 
    notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle notification selection
  const handleNotificationSelect = (notificationId: string, selected: boolean) => {
    const newSelection = new Set(selectedNotifications);
    if (selected) {
      newSelection.add(notificationId);
    } else {
      newSelection.delete(notificationId);
    }
    setSelectedNotifications(newSelection);
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    } else {
      setSelectedNotifications(new Set());
    }
  };

  // Handle bulk mark as read
  const handleBulkMarkAsRead = async () => {
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedNotifications).map(id =>
        notificationService.markAsRead(userId, id)
      );
      await Promise.all(promises);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          selectedNotifications.has(notif.id) ? { ...notif, read: true } : notif
        )
      );
      
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedNotifications.size} notifications?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedNotifications).map(id =>
        notificationService.deleteNotification(userId, id)
      );
      await Promise.all(promises);
      
      // Update local state
      setNotifications(prev =>
        prev.filter(notif => !selectedNotifications.has(notif.id))
      );
      
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Error deleting notifications:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Handle bulk archive
  const handleBulkArchive = async () => {
    setBulkActionLoading(true);
    try {
      await notificationService.archiveNotifications(userId, Array.from(selectedNotifications), 'bulk');
      
      // Update local state
      setNotifications(prev =>
        prev.filter(notif => !selectedNotifications.has(notif.id))
      );
      
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Error archiving notifications:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Handle individual notification click
  const handleNotificationClick = (notification: Notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

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
      case 'high': return 'border-l-red-500';
      case 'normal': return 'border-l-blue-500';
      case 'low': return 'border-l-gray-300';
      default: return 'border-l-gray-300';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString();
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const allSelected = filteredNotifications.length > 0 && selectedNotifications.size === filteredNotifications.length;
  const someSelected = selectedNotifications.size > 0 && selectedNotifications.size < filteredNotifications.length;

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Notification History</h3>
          <button
            onClick={loadNotifications}
            disabled={loading}
            className="text-primary hover:text-primary-dark font-medium text-sm"
          >
            <i className={`fas fa-sync-alt mr-1 ${loading ? 'animate-spin' : ''}`}></i>
            Refresh
          </button>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative mb-4">
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

        {/* Filters */}
        {showFilters && (
          <div className="space-y-4">
            {/* Type and Priority Filters */}
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
                  onClick={() => setFilter({ ...filter, type: filterOption.key as any })}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filter.type === filterOption.key
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <i className={`${filterOption.icon} mr-1`}></i>
                  {filterOption.label}
                </button>
              ))}
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              {(dateRange.start || dateRange.end) && (
                <button
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="mt-6 text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear dates
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedNotifications.size > 0 && (
          <div className="mt-4 flex items-center justify-between bg-blue-50 rounded-lg p-3">
            <span className="text-sm text-primary-dark">
              {selectedNotifications.size} notification{selectedNotifications.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkMarkAsRead}
                disabled={bulkActionLoading}
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                Mark as read
              </button>
              <button
                onClick={handleBulkArchive}
                disabled={bulkActionLoading}
                className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
              >
                Archive
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading notification history...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <>
            {/* Select All Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select all ({filteredNotifications.length})
                </span>
              </label>
            </div>

            {/* Notifications */}
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 border-l-4 ${getPriorityIndicator(notification.priority)} ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={(e) => handleNotificationSelect(notification.id, e.target.checked)}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <div className={`mt-1 ${getTypeColor(notification.type)}`}>
                      <i className={`${getTypeIcon(notification.type)} text-lg`}></i>
                    </div>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-medium truncate ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                          {!notification.read && (
                            <span className="ml-2 w-2 h-2 bg-primary rounded-full inline-block"></span>
                          )}
                          {notification.priority === 'high' && (
                            <i className="fas fa-exclamation-triangle text-red-500 text-sm ml-2"></i>
                          )}
                        </h4>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDate(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      {notification.actionText && (
                        <span className="text-xs text-primary font-medium">
                          {notification.actionText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <i className="fas fa-bell text-2xl text-gray-400"></i>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || filter.type !== 'all' || dateRange.start || dateRange.end
                ? 'No matching notifications'
                : 'No notification history'
              }
            </h4>
            <p className="text-gray-500">
              {searchQuery || filter.type !== 'all' || dateRange.start || dateRange.end
                ? 'Try adjusting your search or filters.'
                : 'Your notification history will appear here.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}