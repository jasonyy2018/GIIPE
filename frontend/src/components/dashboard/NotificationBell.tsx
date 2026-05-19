'use client';

import { useState, useEffect, useRef } from 'react';
import type { Notification } from '@/types/notification';
import { notificationService } from '@/services/notificationService';
import NotificationCenter from './NotificationCenter';

interface NotificationBellProps {
  userId: string;
  className?: string;
  showBadge?: boolean;
  onNotificationClick?: (notification: Notification) => void;
}

export default function NotificationBell({
  userId,
  className = '',
  showBadge = true,
  onNotificationClick
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Load initial unread count
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const result = await notificationService.getNotifications(userId, { type: 'unread' }, 1);
        const categories = await notificationService.getNotificationCategories(userId);
        const unreadCategory = categories.find(cat => cat.id === 'unread');
        setUnreadCount(unreadCategory?.count || 0);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();
  }, [userId]);

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribe = notificationService.subscribeToNotifications(userId, (notification) => {
      setUnreadCount(prev => prev + 1);
      setHasNewNotification(true);
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
      
      // Auto-hide the "new" indicator after 3 seconds
      setTimeout(() => setHasNewNotification(false), 3000);
    });

    return unsubscribe;
  }, [userId]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Request notification permission on first interaction
  const handleBellClick = async () => {
    setIsOpen(!isOpen);
    setHasNewNotification(false);
    
    // Request notification permission if not already granted
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Handle notification center close
  const handleClose = () => {
    setIsOpen(false);
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Decrease unread count if notification was unread
    if (!notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  return (
    <div ref={bellRef} className={`relative ${className}`}>
      <button
        onClick={handleBellClick}
        className={`relative p-2 text-gray-600 hover:text-primary transition-colors ${
          hasNewNotification ? 'animate-pulse' : ''
        }`}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <i className={`fas fa-bell text-xl ${hasNewNotification ? 'text-primary' : ''}`}></i>
        
        {/* Unread badge */}
        {showBadge && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* New notification indicator */}
        {hasNewNotification && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full animate-ping"></span>
        )}
      </button>

      {/* Notification Center */}
      <NotificationCenter
        userId={userId}
        isOpen={isOpen}
        onClose={handleClose}
        onNotificationClick={handleNotificationClick}
      />
    </div>
  );
}