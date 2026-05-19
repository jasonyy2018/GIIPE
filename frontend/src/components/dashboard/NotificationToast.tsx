'use client';

import { useState, useEffect } from 'react';
import { Notification } from '@/types/notification';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onAction?: () => void;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export default function NotificationToast({
  notification,
  onClose,
  onAction,
  duration = 5000,
  position = 'top-right'
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-close after duration
    const closeTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    handleClose();
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getTypeIcon = () => {
    switch (notification.type) {
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

  const getTypeColor = () => {
    switch (notification.type) {
      case 'system':
        return 'text-primary bg-light';
      case 'event':
        return 'text-green-600 bg-green-100';
      case 'social':
        return 'text-purple-600 bg-purple-100';
      case 'security':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityBorder = () => {
    switch (notification.priority) {
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

  return (
    <div
      className={`fixed z-50 ${getPositionClasses()} transition-all duration-300 ease-in-out ${
        isVisible && !isLeaving
          ? 'transform translate-x-0 opacity-100'
          : position.includes('right')
            ? 'transform translate-x-full opacity-0'
            : 'transform -translate-x-full opacity-0'
      }`}
    >
      <div className={`bg-white rounded-lg shadow-lg border-l-4 ${getPriorityBorder()} max-w-sm w-full`}>
        <div className="p-4">
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getTypeColor()}`}>
              <i className={`${getTypeIcon()} text-sm`}></i>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    {notification.title}
                    {notification.priority === 'high' && (
                      <i className="fas fa-exclamation-triangle text-red-500 text-xs ml-2"></i>
                    )}
                  </h4>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
                
                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>

              {/* Actions */}
              {notification.actionText && (
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={handleAction}
                    className="text-sm text-primary hover:text-primary-dark font-medium"
                  >
                    {notification.actionText}
                  </button>
                  <span className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-primary transition-all ease-linear"
            style={{
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}