'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notification } from '@/types/notification';
import { notificationService } from '@/services/notificationService';
import NotificationToast from './NotificationToast';

interface NotificationContextType {
  showToast: (notification: Notification) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string;
  maxToasts?: number;
  defaultDuration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface ToastNotification extends Notification {
  toastId: string;
}

export default function NotificationProvider({
  children,
  userId,
  maxToasts = 5,
  defaultDuration = 5000,
  position = 'top-right'
}: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = notificationService.subscribeToNotifications(userId, (notification) => {
      showToast(notification);
    });

    return unsubscribe;
  }, [userId]);

  const showToast = (notification: Notification) => {
    const toastId = `toast-${Date.now()}-${Math.random()}`;
    const toastNotification: ToastNotification = {
      ...notification,
      toastId
    };

    setToasts(prev => {
      const newToasts = [toastNotification, ...prev];
      
      // Limit number of toasts
      if (newToasts.length > maxToasts) {
        return newToasts.slice(0, maxToasts);
      }
      
      return newToasts;
    });
  };

  const hideToast = (toastId: string) => {
    setToasts(prev => prev.filter(toast => toast.toastId !== toastId));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  const handleToastAction = (notification: ToastNotification) => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const contextValue: NotificationContextType = {
    showToast,
    hideToast,
    clearAllToasts
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Render toasts */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {toasts.map((toast, index) => (
          <div
            key={toast.toastId}
            className="pointer-events-auto"
            style={{
              zIndex: 1000 + index,
              ...(position.includes('top') 
                ? { top: `${20 + index * 80}px` }
                : { bottom: `${20 + index * 80}px` }
              ),
              ...(position.includes('right')
                ? { right: '20px' }
                : { left: '20px' }
              )
            }}
          >
            <NotificationToast
              notification={toast}
              onClose={() => hideToast(toast.toastId)}
              onAction={() => handleToastAction(toast)}
              duration={defaultDuration}
              position={position}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

// Hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}