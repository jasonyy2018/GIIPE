'use client';

import { useState, useEffect } from 'react';
import { NotificationData } from '@/services/adminWebSocketService';

interface NotificationBellProps {
  notifications: NotificationData[];
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

export default function NotificationBell({
  notifications,
  unreadCount,
  onClick,
  className = ''
}: NotificationBellProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastNotificationCount, setLastNotificationCount] = useState(unreadCount);

  // Animate when new notifications arrive
  useEffect(() => {
    if (unreadCount > lastNotificationCount) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }
    setLastNotificationCount(unreadCount);
  }, [unreadCount, lastNotificationCount]);

  // Get the most recent urgent notification for preview
  const urgentNotification = notifications?.filter(n => !n.read && n.priority === 'urgent')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={onClick}
        className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 ${
          isAnimating ? 'animate-bounce' : ''
        } ${urgentNotification ? 'text-red-600 hover:text-red-700' : ''}`}
        title={`${unreadCount} unread notifications`}
      >
        <i className={`fas fa-bell text-xl ${urgentNotification ? 'animate-pulse' : ''}`}></i>
        
        {/* Notification badge */}
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 rounded-full ${
            urgentNotification ? 'bg-red-600 animate-pulse' : 'bg-red-500'
          }`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Pulse animation for urgent notifications */}
        {urgentNotification && (
          <span className="absolute -top-1 -right-1 inline-flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          </span>
        )}
      </button>

      {/* Urgent notification preview tooltip */}
      {urgentNotification && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-red-200 p-4 z-50 transform opacity-0 scale-95 pointer-events-none hover:opacity-100 hover:scale-100 hover:pointer-events-auto transition-all duration-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <i className="fas fa-exclamation-triangle text-red-500 text-lg"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-red-900 mb-1">
                Urgent: {urgentNotification.title}
              </h4>
              <p className="text-sm text-red-700 line-clamp-2">
                {urgentNotification.message}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-red-600">
                  {new Date(urgentNotification.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-xs text-red-600 font-medium">
                  Click bell to view all
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}