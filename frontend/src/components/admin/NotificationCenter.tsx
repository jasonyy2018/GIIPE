'use client';

import { useState, useEffect, useRef } from 'react';
import { NotificationData } from '@/services/adminWebSocketService';

interface NotificationCenterProps {
  notifications: NotificationData[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onExecuteAction: (notificationId: string, actionId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
}

export default function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onExecuteAction,
  isOpen,
  onClose,
  unreadCount
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'read' && !notification.read) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    if (priorityFilter !== 'all' && notification.priority !== priorityFilter) return false;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      'info': 'fas fa-info-circle text-blue-500',
      'warning': 'fas fa-exclamation-triangle text-yellow-500',
      'error': 'fas fa-times-circle text-red-500',
      'success': 'fas fa-check-circle text-green-500',
      'security': 'fas fa-shield-alt text-red-600'
    };
    return iconMap[type] || 'fas fa-bell text-gray-500';
  };

  const getPriorityColor = (priority: string) => {
    const colorMap: { [key: string]: string } = {
      'low': 'border-l-gray-400',
      'medium': 'border-l-blue-400',
      'high': 'border-l-yellow-400',
      'urgent': 'border-l-red-500'
    };
    return colorMap[priority] || 'border-l-gray-400';
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose}></div>
      
      <div 
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out"
      >
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={onMarkAllAsRead}
              disabled={unreadCount === 0}
              className="text-sm text-primary hover:text-primary-dark disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Mark all as read
            </button>
            <span className="text-sm text-gray-500">
              {filteredNotifications.length} of {notifications.length}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
              <option value="security">Security</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <i className="fas fa-bell-slash text-3xl mb-2"></i>
                <p>No notifications found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <i className={`${getNotificationIcon(notification.type)} text-lg`}></i>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <button
                              onClick={() => onMarkAsRead(notification.id)}
                              className="text-xs text-primary hover:text-primary-dark"
                              title="Mark as read"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteNotification(notification.id)}
                            className="text-xs text-gray-400 hover:text-red-600"
                            title="Delete notification"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          notification.priority === 'high' ? 'bg-yellow-100 text-yellow-800' :
                          notification.priority === 'medium' ? 'bg-light text-primary-dark' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {notification.priority}
                        </span>
                      </div>

                      {/* Actions */}
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {notification.actions.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => onExecuteAction(notification.id, action.id)}
                              className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                                action.action === 'escalate' || action.action === 'resolve' 
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : 'bg-light text-primary-dark hover:bg-blue-200'
                              }`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}