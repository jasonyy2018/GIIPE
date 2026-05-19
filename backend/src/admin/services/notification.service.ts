import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRealtimeGateway } from '../gateways/admin-realtime.gateway';

export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'security';
  category: 'system' | 'user' | 'content' | 'security' | 'analytics' | 'maintenance';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  read: boolean;
  userId?: string; // If null, it's a system-wide notification
  metadata?: Record<string, any>;
  actions?: NotificationAction[];
  expiresAt?: Date;
  persistent?: boolean; // Whether notification should persist after read
}

export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  style?: 'primary' | 'secondary' | 'danger';
  url?: string;
}

export interface NotificationPreferences {
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
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

export interface NotificationFilters {
  type?: string[];
  category?: string[];
  priority?: string[];
  read?: boolean;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private notifications: Map<string, AdminNotification> = new Map();
  private userPreferences: Map<string, NotificationPreferences> = new Map();

  constructor(
    private prismaService: PrismaService,
    private adminGateway: AdminRealtimeGateway,
  ) {
    this.initializeDefaultPreferences();
  }

  // Create and send notification
  async createNotification(notification: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>): Promise<AdminNotification> {
    const newNotification: AdminNotification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false,
    };

    // Store notification
    this.notifications.set(newNotification.id, newNotification);

    // Check if notification should be delivered based on preferences
    if (await this.shouldDeliverNotification(newNotification)) {
      // Send real-time notification
      this.adminGateway.broadcastNotification(newNotification);
      
      this.logger.log(`Notification created and sent: ${newNotification.id} - ${newNotification.title}`);
    }

    // Clean up expired notifications
    this.cleanupExpiredNotifications();

    return newNotification;
  }

  // Get notifications with filtering
  async getNotifications(filters: NotificationFilters = {}): Promise<{
    notifications: AdminNotification[];
    total: number;
    unreadCount: number;
  }> {
    let filteredNotifications = Array.from(this.notifications.values());

    // Apply filters
    if (filters.type?.length) {
      filteredNotifications = filteredNotifications.filter(n => filters.type!.includes(n.type));
    }

    if (filters.category?.length) {
      filteredNotifications = filteredNotifications.filter(n => filters.category!.includes(n.category));
    }

    if (filters.priority?.length) {
      filteredNotifications = filteredNotifications.filter(n => filters.priority!.includes(n.priority));
    }

    if (filters.read !== undefined) {
      filteredNotifications = filteredNotifications.filter(n => n.read === filters.read);
    }

    if (filters.userId) {
      filteredNotifications = filteredNotifications.filter(n => 
        n.userId === filters.userId || n.userId === null // Include system-wide notifications
      );
    }

    if (filters.dateFrom) {
      filteredNotifications = filteredNotifications.filter(n => n.timestamp >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filteredNotifications = filteredNotifications.filter(n => n.timestamp <= filters.dateTo!);
    }

    // Sort by timestamp (newest first)
    filteredNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredNotifications.length;
    const unreadCount = filteredNotifications.filter(n => !n.read).length;

    // Apply pagination
    if (filters.offset) {
      filteredNotifications = filteredNotifications.slice(filters.offset);
    }
    if (filters.limit) {
      filteredNotifications = filteredNotifications.slice(0, filters.limit);
    }

    return {
      notifications: filteredNotifications,
      total,
      unreadCount,
    };
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId?: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return false;
    }

    // Check if user has permission to mark this notification as read
    if (notification.userId && notification.userId !== userId) {
      return false;
    }

    notification.read = true;
    this.notifications.set(notificationId, notification);

    // Broadcast update
    this.adminGateway.broadcastToRoom('notifications', 'notification-updated', {
      id: notificationId,
      read: true,
    });

    return true;
  }

  // Mark multiple notifications as read
  async markMultipleAsRead(notificationIds: string[], userId?: string): Promise<number> {
    let markedCount = 0;

    for (const id of notificationIds) {
      if (await this.markAsRead(id, userId)) {
        markedCount++;
      }
    }

    return markedCount;
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId?: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return false;
    }

    // Check if user has permission to delete this notification
    if (notification.userId && notification.userId !== userId) {
      return false;
    }

    this.notifications.delete(notificationId);

    // Broadcast deletion
    this.adminGateway.broadcastToRoom('notifications', 'notification-deleted', {
      id: notificationId,
    });

    return true;
  }

  // Get user preferences
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    return this.userPreferences.get(userId) || this.getDefaultPreferences(userId);
  }

  // Update user preferences
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const currentPreferences = await this.getUserPreferences(userId);
    const updatedPreferences = { ...currentPreferences, ...preferences };
    
    this.userPreferences.set(userId, updatedPreferences);
    
    this.logger.log(`Updated notification preferences for user: ${userId}`);
    
    return updatedPreferences;
  }

  // Execute notification action
  async executeNotificationAction(notificationId: string, actionId: string, userId?: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return false;
    }

    const action = notification.actions?.find(a => a.id === actionId);
    if (!action) {
      return false;
    }

    try {
      // Execute the action based on its type
      await this.handleNotificationAction(notification, action, userId);
      
      // Mark notification as read after action execution
      await this.markAsRead(notificationId, userId);
      
      this.logger.log(`Executed notification action: ${actionId} for notification: ${notificationId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to execute notification action: ${actionId}`, error);
      return false;
    }
  }

  // Cleanup expired notifications
  private cleanupExpiredNotifications(): void {
    const now = new Date();
    const expiredIds: string[] = [];

    this.notifications.forEach((notification, id) => {
      if (notification.expiresAt && notification.expiresAt < now) {
        expiredIds.push(id);
      }
    });

    expiredIds.forEach(id => {
      this.notifications.delete(id);
      this.adminGateway.broadcastToRoom('notifications', 'notification-deleted', { id });
    });

    if (expiredIds.length > 0) {
      this.logger.log(`Cleaned up ${expiredIds.length} expired notifications`);
    }
  }

  // Check if notification should be delivered based on user preferences
  private async shouldDeliverNotification(notification: AdminNotification): Promise<boolean> {
    // System-wide notifications are always delivered
    if (!notification.userId) {
      return true;
    }

    const preferences = await this.getUserPreferences(notification.userId);

    // Check category preferences
    if (!preferences.categories[notification.category]) {
      return false;
    }

    // Check priority preferences
    if (!preferences.priorities[notification.priority]) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours?.enabled && this.isInQuietHours(preferences.quietHours)) {
      // Only deliver urgent notifications during quiet hours
      return notification.priority === 'urgent';
    }

    return true;
  }

  private isInQuietHours(quietHours: { start: string; end: string }): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= quietHours.start && currentTime <= quietHours.end;
  }

  private async handleNotificationAction(
    notification: AdminNotification,
    action: NotificationAction,
    userId?: string
  ): Promise<void> {
    switch (action.action) {
      case 'acknowledge':
        // Mark as acknowledged
        break;
      case 'dismiss':
        await this.deleteNotification(notification.id, userId);
        break;
      case 'escalate':
        // Create escalated notification
        await this.createNotification({
          ...notification,
          priority: 'urgent',
          title: `ESCALATED: ${notification.title}`,
          metadata: { ...notification.metadata, escalated: true, originalId: notification.id },
        });
        break;
      case 'resolve':
        // Mark as resolved and delete
        await this.deleteNotification(notification.id, userId);
        break;
      default:
        this.logger.warn(`Unknown notification action: ${action.action}`);
    }
  }

  private initializeDefaultPreferences(): void {
    // Initialize with some default system preferences
    // In a real implementation, these would be loaded from the database
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      categories: {
        system: true,
        user: true,
        content: true,
        security: true,
        analytics: false,
        maintenance: true,
      },
      priorities: {
        low: false,
        medium: true,
        high: true,
        urgent: true,
      },
      deliveryMethods: {
        inApp: true,
        email: false,
        push: false,
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    };
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convenience methods for creating specific types of notifications
  async createSystemNotification(title: string, message: string, priority: AdminNotification['priority'] = 'medium'): Promise<AdminNotification> {
    return this.createNotification({
      type: 'info',
      category: 'system',
      title,
      message,
      priority,
    });
  }

  async createSecurityNotification(title: string, message: string, metadata?: Record<string, any>): Promise<AdminNotification> {
    return this.createNotification({
      type: 'warning',
      category: 'security',
      title,
      message,
      priority: 'high',
      metadata,
      actions: [
        { id: 'acknowledge', label: 'Acknowledge', action: 'acknowledge', style: 'primary' },
        { id: 'escalate', label: 'Escalate', action: 'escalate', style: 'danger' },
      ],
    });
  }

  async createUserNotification(userId: string, title: string, message: string, priority: AdminNotification['priority'] = 'medium'): Promise<AdminNotification> {
    return this.createNotification({
      type: 'info',
      category: 'user',
      title,
      message,
      priority,
      userId,
    });
  }
}