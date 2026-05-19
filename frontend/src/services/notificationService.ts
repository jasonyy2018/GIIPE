import { Notification, NotificationCategory, NotificationSettings, NotificationFilter, NotificationBatch } from '@/types/notification';
import { webSocketService } from './websocketService';
import { notificationQueueService } from './notificationQueueService';
import { pushNotificationService } from './pushNotificationService';

class NotificationService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  private listeners: Set<(notification: Notification) => void> = new Set();
  private updateListeners: Set<(notifications: Notification[]) => void> = new Set();
  private wsUnsubscribe: (() => void) | null = null;

  // Get notifications with filtering and pagination
  async getNotifications(
    userId: string, 
    filter: NotificationFilter = {}, 
    limit: number = 20,
    cursor?: string
  ): Promise<NotificationBatch> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(cursor && { cursor }),
        ...(filter.type && filter.type !== 'all' && { type: filter.type }),
        ...(filter.priority && { priority: filter.priority }),
        ...(filter.dateRange && {
          startDate: filter.dateRange.start.toISOString(),
          endDate: filter.dateRange.end.toISOString()
        })
      });

      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      
      // Convert timestamp strings to Date objects
      const notifications = data.notifications.map((notif: any) => ({
        ...notif,
        timestamp: new Date(notif.timestamp)
      }));

      return {
        notifications,
        hasMore: data.hasMore,
        nextCursor: data.nextCursor
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      
      // Return mock data for development
      return this.getMockNotifications(filter, limit);
    }
  }

  // Get notification categories with counts
  async getNotificationCategories(userId: string): Promise<NotificationCategory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications/categories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification categories');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notification categories:', error);
      
      // Return mock categories
      return [
        { id: 'all', name: 'All', icon: 'fas fa-list', color: 'text-gray-600', count: 15 },
        { id: 'unread', name: 'Unread', icon: 'fas fa-envelope', color: 'text-primary', count: 5 },
        { id: 'system', name: 'System', icon: 'fas fa-cog', color: 'text-primary', count: 3 },
        { id: 'event', name: 'Events', icon: 'fas fa-calendar-alt', color: 'text-green-600', count: 7 },
        { id: 'social', name: 'Social', icon: 'fas fa-users', color: 'text-purple-600', count: 4 },
        { id: 'security', name: 'Security', icon: 'fas fa-shield-alt', color: 'text-red-600', count: 1 }
      ];
    }
  }

  // Mark notification as read
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string, filter?: NotificationFilter): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filter })
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Delete notification
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  // Get notification settings
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notification-settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification settings');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      
      // Return default settings
      return {
        email: true,
        push: true,
        sms: false,
        categories: {
          system: true,
          event: true,
          social: true,
          security: true
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        frequency: 'immediate',
        scheduling: {
          enabled: false,
          workDays: [true, true, true, true, true, false, false], // Mon-Fri
          workHours: {
            start: '09:00',
            end: '17:00'
          }
        },
        digest: {
          enabled: false,
          time: '08:00',
          includeRead: false
        },
        autoArchive: {
          enabled: true,
          afterDays: 30
        }
      };
    }
  }

  // Update notification settings
  async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notification-settings`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to update notification settings');
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  // Archive notifications
  async archiveNotifications(userId: string, notificationIds: string[], reason: 'auto' | 'manual' | 'bulk' = 'manual'): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationIds, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to archive notifications');
      }
    } catch (error) {
      console.error('Error archiving notifications:', error);
    }
  }

  // Get archived notifications
  async getArchivedNotifications(userId: string, limit: number = 50, cursor?: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(cursor && { cursor })
      });

      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications/archived?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch archived notifications');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching archived notifications:', error);
      return { notifications: [], hasMore: false };
    }
  }

  // Restore archived notifications
  async restoreNotifications(userId: string, archiveIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ archiveIds })
      });

      if (!response.ok) {
        throw new Error('Failed to restore notifications');
      }
    } catch (error) {
      console.error('Error restoring notifications:', error);
    }
  }

  // Get notification digest
  async getNotificationDigest(userId: string, type: 'daily' | 'weekly', date?: Date): Promise<any> {
    try {
      const params = new URLSearchParams({
        type,
        ...(date && { date: date.toISOString() })
      });

      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications/digest?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification digest');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notification digest:', error);
      return null;
    }
  }

  // Schedule notification digest
  async scheduleDigest(userId: string, schedule: Partial<any>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications/schedule-digest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(schedule)
      });

      if (!response.ok) {
        throw new Error('Failed to schedule digest');
      }
    } catch (error) {
      console.error('Error scheduling digest:', error);
    }
  }

  // Bulk operations
  async bulkUpdateNotifications(userId: string, notificationIds: string[], updates: { read?: boolean; archived?: boolean }): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications/bulk-update`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationIds, updates })
      });

      if (!response.ok) {
        throw new Error('Failed to bulk update notifications');
      }
    } catch (error) {
      console.error('Error bulk updating notifications:', error);
    }
  }

  // Real-time notification subscription
  subscribeToNotifications(userId: string, onNotification: (notification: Notification) => void): () => void {
    this.listeners.add(onNotification);
    
    // Initialize WebSocket connection if not already connected
    if (!this.wsUnsubscribe) {
      this.initializeRealTimeConnection(userId);
    }

    return () => {
      this.listeners.delete(onNotification);
      if (this.listeners.size === 0 && this.wsUnsubscribe) {
        this.wsUnsubscribe();
        this.wsUnsubscribe = null;
        webSocketService.disconnect();
      }
    };
  }

  // Initialize push notifications
  async initializePushNotifications(userId: string): Promise<boolean> {
    try {
      const initialized = await pushNotificationService.initialize();
      if (!initialized) return false;

      const permission = await pushNotificationService.requestPermission();
      if (permission !== 'granted') return false;

      const subscription = await pushNotificationService.subscribe(userId);
      return !!subscription;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  // Send notification (for testing or manual sending)
  async sendNotification(userId: string, notification: Omit<Notification, 'id' | 'timestamp'>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Subscribe to notification updates
  subscribeToUpdates(onUpdate: (notifications: Notification[]) => void): () => void {
    this.updateListeners.add(onUpdate);
    
    return () => {
      this.updateListeners.delete(onUpdate);
    };
  }

  // Private methods
  private async initializeRealTimeConnection(userId: string): Promise<void> {
    try {
      // Connect to WebSocket
      await webSocketService.connect(userId);
      
      // Subscribe to notification messages
      this.wsUnsubscribe = webSocketService.subscribe('notification', (data) => {
        const notification: Notification = {
          ...data,
          timestamp: new Date(data.timestamp)
        };
        
        // Add to queue for batching
        notificationQueueService.enqueue(notification);
        
        // Notify listeners immediately for real-time updates
        this.listeners.forEach(listener => {
          try {
            listener(notification);
          } catch (error) {
            console.error('Error in notification listener:', error);
          }
        });
      });

      // Subscribe to batch updates
      webSocketService.subscribe('update', (data) => {
        const notifications = data.notifications.map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp)
        }));
        
        this.updateListeners.forEach(listener => {
          try {
            listener(notifications);
          } catch (error) {
            console.error('Error in update listener:', error);
          }
        });
      });

    } catch (error) {
      console.error('Error initializing real-time connection:', error);
    }
  }

  private getMockNotifications(filter: NotificationFilter, limit: number): NotificationBatch {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'New event invitation',
        message: 'You\'ve been invited to the IP Strategy Conference 2024. Registration closes in 3 days.',
        type: 'event',
        priority: 'high',
        timestamp: new Date('2024-05-20T10:30:00Z'),
        read: false,
        actionUrl: '/events/1',
        actionText: 'View Event',
        category: 'invitations'
      },
      {
        id: '2',
        title: 'Article saved successfully',
        message: 'The article "Patent Trends in AI" has been added to your bookmarks.',
        type: 'system',
        priority: 'normal',
        timestamp: new Date('2024-05-20T09:15:00Z'),
        read: false,
        actionUrl: '/bookmarks',
        actionText: 'View Bookmarks'
      },
      {
        id: '3',
        title: 'Connection request',
        message: 'Dr. Sarah Chen wants to connect with you.',
        type: 'social',
        priority: 'normal',
        timestamp: new Date('2024-05-19T16:45:00Z'),
        read: true,
        actionUrl: '/messages',
        actionText: 'View Request'
      },
      {
        id: '4',
        title: 'Event reminder',
        message: 'Global Innovation Summit starts tomorrow at 9:00 AM.',
        type: 'event',
        priority: 'high',
        timestamp: new Date('2024-05-19T08:00:00Z'),
        read: true,
        actionUrl: '/events/2',
        actionText: 'View Details'
      },
      {
        id: '5',
        title: 'Security alert',
        message: 'New login detected from Chrome on Windows. If this wasn\'t you, please secure your account.',
        type: 'security',
        priority: 'high',
        timestamp: new Date('2024-05-18T14:20:00Z'),
        read: true,
        actionUrl: '/settings',
        actionText: 'Security Settings'
      }
    ];

    // Apply filters
    let filtered = mockNotifications;
    
    if (filter.type && filter.type !== 'all') {
      if (filter.type === 'unread') {
        filtered = filtered.filter(n => !n.read);
      } else {
        filtered = filtered.filter(n => n.type === filter.type);
      }
    }
    
    if (filter.priority) {
      filtered = filtered.filter(n => n.priority === filter.priority);
    }

    return {
      notifications: filtered.slice(0, limit),
      hasMore: filtered.length > limit,
      nextCursor: filtered.length > limit ? 'next-page' : undefined
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;