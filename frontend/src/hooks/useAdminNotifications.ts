import { useState, useEffect, useCallback } from 'react';
import { adminWebSocketService, NotificationData } from '@/services/adminWebSocketService';

interface NotificationPreferences {
  userId: string;
  categories: {
    system: boolean;
    user: boolean;
    content: boolean;
    security: boolean;
    analytics: boolean;
    maintenance: boolean;
  };
  priorities: {
    low: boolean;
    medium: boolean;
    high: boolean;
    urgent: boolean;
  };
  deliveryMethods: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  recentActivity: NotificationData[];
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get auth token
  const getAuthToken = useCallback(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  }, []);

  // Connect to WebSocket and subscribe to notifications
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const connectAndSubscribe = async () => {
      try {
        await adminWebSocketService.connect(token);
        await adminWebSocketService.subscribe('notifications');
        setIsConnected(true);
        setError(null);
      } catch (error) {
        console.error('Failed to connect to notification service:', error);
        setError('Failed to connect to notification service');
        setIsConnected(false);
      }
    };

    connectAndSubscribe();

    return () => {
      adminWebSocketService.disconnect();
      setIsConnected(false);
    };
  }, [getAuthToken]);

  // Set up real-time notification listeners
  useEffect(() => {
    const unsubscribeNotification = adminWebSocketService.on('notification', (notification: NotificationData) => {
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification for urgent notifications
      if (notification.priority === 'urgent' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id,
          });
        }
      }
    });

    const unsubscribeUpdate = adminWebSocketService.on('notification-updated', (update: any) => {
      setNotifications(prev => 
        prev.map(n => n.id === update.id ? { ...n, ...update } : n)
      );
    });

    const unsubscribeDelete = adminWebSocketService.on('notification-deleted', (data: { id: string }) => {
      setNotifications(prev => prev.filter(n => n.id !== data.id));
    });

    return () => {
      unsubscribeNotification();
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, []);

  // Load initial notifications and preferences
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Load notifications
        const notificationsResponse = await fetch('/api/admin/notifications', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (notificationsResponse.ok) {
          const notificationsData = await notificationsResponse.json();
          setNotifications(notificationsData.notifications || []);
        }

        // Load preferences
        const preferencesResponse = await fetch('/api/admin/notifications/preferences', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json();
          setPreferences(preferencesData);
        }

        // Load stats
        const statsResponse = await fetch('/api/admin/notifications/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

      } catch (error) {
        console.error('Failed to load notification data:', error);
        setError('Failed to load notifications');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [getAuthToken]);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        return true;
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
    return false;
  }, [getAuthToken]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return false;

    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return true;

    try {
      const response = await fetch('/api/admin/notifications/read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: unreadIds }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
        return true;
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
    return false;
  }, [notifications, getAuthToken]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        return true;
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
    return false;
  }, [getAuthToken]);

  // Execute notification action
  const executeAction = useCallback(async (notificationId: string, actionId: string) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}/actions/${actionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // The notification will be updated via WebSocket
        return true;
      }
    } catch (error) {
      console.error('Failed to execute notification action:', error);
    }
    return false;
  }, [getAuthToken]);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/admin/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });

      if (response.ok) {
        const updatedPreferences = await response.json();
        setPreferences(updatedPreferences);
        return true;
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
    return false;
  }, [getAuthToken]);

  // Create notification (for testing or admin use)
  const createNotification = useCallback(async (notification: {
    type: 'info' | 'warning' | 'error' | 'success' | 'security';
    category: 'system' | 'user' | 'content' | 'security' | 'analytics' | 'maintenance';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    userId?: string;
    metadata?: Record<string, any>;
  }) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
    return false;
  }, [getAuthToken]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    preferences,
    stats,
    unreadCount,
    isConnected,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    executeAction,
    updatePreferences,
    createNotification,
  };
}