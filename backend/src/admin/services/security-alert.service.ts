import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRealtimeGateway } from '../gateways/admin-realtime.gateway';
import { NotificationsService } from '../../notifications/notifications.service';

export interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  ipAddress?: string;
  userId?: string;
  metadata?: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNote?: string;
  escalated: boolean;
  escalatedAt?: Date;
  escalationLevel: number;
  responseTime?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: any;
  enabled: boolean;
  escalationRules: EscalationRule[];
  notificationChannels: string[];
}

export interface EscalationRule {
  level: number;
  timeoutMinutes: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
  recipients: string[];
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'in-app';
  name: string;
  config: any;
  enabled: boolean;
}

@Injectable()
export class SecurityAlertService {
  private readonly logger = new Logger(SecurityAlertService.name);
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private pendingEscalations: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: AdminRealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {
    this.initializeDefaultRules();
    this.initializeNotificationChannels();
  }

  async createAlert(alertData: Partial<SecurityAlert>): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      type: alertData.type || 'unknown',
      severity: alertData.severity || 'medium',
      title: alertData.title || 'Security Alert',
      description: alertData.description || '',
      source: alertData.source || 'system',
      ipAddress: alertData.ipAddress,
      userId: alertData.userId,
      metadata: alertData.metadata || {},
      acknowledged: false,
      resolved: false,
      escalated: false,
      escalationLevel: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store alert in database
    await this.storeAlert(alert);

    // Send real-time notification
    this.realtimeGateway.broadcastSystemAlert({
      id: alert.id,
      type: alert.severity === 'critical' ? 'error' : 'warning',
      message: `${alert.title}: ${alert.description}`,
      timestamp: alert.createdAt,
      resolved: false,
    });

    // Send notifications through configured channels
    await this.sendAlertNotifications(alert);

    // Schedule escalation if needed
    this.scheduleEscalation(alert);

    this.logger.log(`Security alert created: ${alert.id} - ${alert.title}`);
    return alert;
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<SecurityAlert> {
    const alert = await this.getAlert(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.acknowledged) {
      throw new Error('Alert already acknowledged');
    }

    const acknowledgedAt = new Date();
    const responseTime = Math.floor((acknowledgedAt.getTime() - alert.createdAt.getTime()) / 1000);

    const updatedAlert: SecurityAlert = {
      ...alert,
      acknowledged: true,
      acknowledgedBy,
      acknowledgedAt,
      responseTime,
      updatedAt: new Date(),
    };

    await this.updateAlert(updatedAlert);

    // Cancel escalation if scheduled
    this.cancelEscalation(alertId);

    // Broadcast acknowledgment
    this.realtimeGateway.broadcastSystemAlert({
      id: alert.id,
      type: 'info',
      message: `Alert acknowledged by ${acknowledgedBy}`,
      timestamp: acknowledgedAt,
      resolved: false,
    });

    this.logger.log(`Alert acknowledged: ${alertId} by ${acknowledgedBy} (response time: ${responseTime}s)`);
    return updatedAlert;
  }

  async resolveAlert(alertId: string, resolvedBy: string, resolutionNote?: string): Promise<SecurityAlert> {
    const alert = await this.getAlert(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.resolved) {
      throw new Error('Alert already resolved');
    }

    const resolvedAt = new Date();
    const responseTime = alert.responseTime || Math.floor((resolvedAt.getTime() - alert.createdAt.getTime()) / 1000);

    const updatedAlert: SecurityAlert = {
      ...alert,
      resolved: true,
      resolvedBy,
      resolvedAt,
      resolutionNote,
      responseTime,
      updatedAt: new Date(),
    };

    await this.updateAlert(updatedAlert);

    // Cancel escalation if scheduled
    this.cancelEscalation(alertId);

    // Broadcast resolution
    this.realtimeGateway.broadcastSystemAlert({
      id: alert.id,
      type: 'info',
      message: `Alert resolved by ${resolvedBy}`,
      timestamp: resolvedAt,
      resolved: true,
    });

    this.logger.log(`Alert resolved: ${alertId} by ${resolvedBy} (total time: ${responseTime}s)`);
    return updatedAlert;
  }

  async getAlerts(filters: {
    severity?: string;
    acknowledged?: boolean;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{ alerts: SecurityAlert[]; total: number; page: number; totalPages: number }> {
    // This would typically query the database
    // For now, returning mock data structure
    return {
      alerts: [],
      total: 0,
      page: filters.page || 1,
      totalPages: 0,
    };
  }

  async getAlert(alertId: string): Promise<SecurityAlert | null> {
    // This would typically query the database
    // For now, returning null
    return null;
  }

  async getAlertMetrics(days: number = 30): Promise<{
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    averageResponseTime: number;
    escalationRate: number;
    resolutionRate: number;
    alertsByType: Record<string, number>;
  }> {
    // This would typically query the database and calculate metrics
    return {
      totalAlerts: 0,
      alertsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      averageResponseTime: 0,
      escalationRate: 0,
      resolutionRate: 0,
      alertsByType: {},
    };
  }

  // Notification channel management
  async addNotificationChannel(channel: Omit<NotificationChannel, 'id'>): Promise<NotificationChannel> {
    const newChannel: NotificationChannel = {
      id: this.generateChannelId(),
      ...channel,
    };

    this.notificationChannels.set(newChannel.id, newChannel);
    await this.storeNotificationChannel(newChannel);

    return newChannel;
  }

  async updateNotificationChannel(channelId: string, updates: Partial<NotificationChannel>): Promise<NotificationChannel> {
    const channel = this.notificationChannels.get(channelId);
    if (!channel) {
      throw new Error('Notification channel not found');
    }

    const updatedChannel = { ...channel, ...updates };
    this.notificationChannels.set(channelId, updatedChannel);
    await this.storeNotificationChannel(updatedChannel);

    return updatedChannel;
  }

  async getNotificationChannels(): Promise<NotificationChannel[]> {
    return Array.from(this.notificationChannels.values());
  }

  // Alert rule management
  async addAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const newRule: AlertRule = {
      id: this.generateRuleId(),
      ...rule,
    };

    this.alertRules.set(newRule.id, newRule);
    await this.storeAlertRule(newRule);

    return newRule;
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error('Alert rule not found');
    }

    const updatedRule = { ...rule, ...updates };
    this.alertRules.set(ruleId, updatedRule);
    await this.storeAlertRule(updatedRule);

    return updatedRule;
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  // Escalation management
  async processEscalations(): Promise<void> {
    // This would check for alerts that need escalation
    // Implementation would query database for unacknowledged alerts past their escalation timeout
    // Note: In a real implementation, this would be called by a scheduled job
  }

  private async sendAlertNotifications(alert: SecurityAlert): Promise<void> {
    const rule = this.getAlertRuleForType(alert.type);
    if (!rule) return;

    for (const channelId of rule.notificationChannels) {
      const channel = this.notificationChannels.get(channelId);
      if (!channel || !channel.enabled) continue;

      try {
        await this.sendNotificationToChannel(alert, channel);
      } catch (error) {
        this.logger.error(`Failed to send notification to channel ${channelId}:`, error);
      }
    }
  }

  private async sendNotificationToChannel(alert: SecurityAlert, channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(alert, channel);
        break;
      case 'sms':
        await this.sendSMSNotification(alert, channel);
        break;
      case 'webhook':
        await this.sendWebhookNotification(alert, channel);
        break;
      case 'in-app':
        await this.sendInAppNotification(alert, channel);
        break;
    }
  }

  private async sendEmailNotification(alert: SecurityAlert, channel: NotificationChannel): Promise<void> {
    const subject = `Security Alert: ${alert.title}`;
    const body = this.generateEmailBody(alert);
    
    // Use the existing notifications service
    // This would need to be implemented based on your notification service
    this.logger.log(`Sending email notification for alert ${alert.id}`);
  }

  private async sendSMSNotification(alert: SecurityAlert, channel: NotificationChannel): Promise<void> {
    const message = `SECURITY ALERT: ${alert.title} - ${alert.description}`;
    // SMS implementation would go here
    this.logger.log(`Sending SMS notification for alert ${alert.id}`);
  }

  private async sendWebhookNotification(alert: SecurityAlert, channel: NotificationChannel): Promise<void> {
    // Webhook implementation would go here
    this.logger.log(`Sending webhook notification for alert ${alert.id}`);
  }

  private async sendInAppNotification(alert: SecurityAlert, channel: NotificationChannel): Promise<void> {
    // In-app notification through WebSocket
    this.realtimeGateway.broadcastSystemAlert({
      id: alert.id,
      type: alert.severity === 'critical' ? 'error' : 'warning',
      message: `${alert.title}: ${alert.description}`,
      timestamp: alert.createdAt,
      resolved: false,
    });
  }

  private scheduleEscalation(alert: SecurityAlert): void {
    const rule = this.getAlertRuleForType(alert.type);
    if (!rule || rule.escalationRules.length === 0) return;

    const firstEscalation = rule.escalationRules[0];
    const timeout = setTimeout(() => {
      this.escalateAlert(alert.id, 1);
    }, firstEscalation.timeoutMinutes * 60 * 1000);

    this.pendingEscalations.set(alert.id, timeout);
  }

  private cancelEscalation(alertId: string): void {
    const timeout = this.pendingEscalations.get(alertId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingEscalations.delete(alertId);
    }
  }

  private async escalateAlert(alertId: string, level: number): Promise<void> {
    const alert = await this.getAlert(alertId);
    if (!alert || alert.acknowledged || alert.resolved) return;

    const rule = this.getAlertRuleForType(alert.type);
    if (!rule) return;

    const escalationRule = rule.escalationRules.find(r => r.level === level);
    if (!escalationRule) return;

    const updatedAlert: SecurityAlert = {
      ...alert,
      escalated: true,
      escalatedAt: new Date(),
      escalationLevel: level,
      severity: escalationRule.severity,
      updatedAt: new Date(),
    };

    await this.updateAlert(updatedAlert);

    // Send escalation notifications
    await this.sendEscalationNotifications(updatedAlert, escalationRule);

    // Schedule next escalation if available
    const nextEscalation = rule.escalationRules.find(r => r.level === level + 1);
    if (nextEscalation) {
      const timeout = setTimeout(() => {
        this.escalateAlert(alertId, level + 1);
      }, nextEscalation.timeoutMinutes * 60 * 1000);

      this.pendingEscalations.set(alertId, timeout);
    }

    this.logger.warn(`Alert escalated: ${alertId} to level ${level}`);
  }

  private async sendEscalationNotifications(alert: SecurityAlert, escalationRule: EscalationRule): Promise<void> {
    // Send notifications to escalation recipients
    for (const channelId of escalationRule.notificationChannels) {
      const channel = this.notificationChannels.get(channelId);
      if (!channel || !channel.enabled) continue;

      try {
        await this.sendNotificationToChannel(alert, channel);
      } catch (error) {
        this.logger.error(`Failed to send escalation notification to channel ${channelId}:`, error);
      }
    }
  }

  private getAlertRuleForType(type: string): AlertRule | undefined {
    return Array.from(this.alertRules.values()).find(rule => rule.type === type && rule.enabled);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChannelId(): string {
    return `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEmailBody(alert: SecurityAlert): string {
    return `
      Security Alert: ${alert.title}
      
      Severity: ${alert.severity.toUpperCase()}
      Description: ${alert.description}
      Source: ${alert.source}
      ${alert.ipAddress ? `IP Address: ${alert.ipAddress}` : ''}
      ${alert.userId ? `User ID: ${alert.userId}` : ''}
      
      Time: ${alert.createdAt.toISOString()}
      
      Please acknowledge this alert in the admin dashboard.
    `;
  }

  private async storeAlert(alert: SecurityAlert): Promise<void> {
    // Store alert in database - implementation depends on your schema
    // For now, just logging
    this.logger.debug(`Storing alert: ${alert.id}`);
  }

  private async updateAlert(alert: SecurityAlert): Promise<void> {
    // Update alert in database - implementation depends on your schema
    // For now, just logging
    this.logger.debug(`Updating alert: ${alert.id}`);
  }

  private async storeNotificationChannel(channel: NotificationChannel): Promise<void> {
    // Store notification channel in database
    this.logger.debug(`Storing notification channel: ${channel.id}`);
  }

  private async storeAlertRule(rule: AlertRule): Promise<void> {
    // Store alert rule in database
    this.logger.debug(`Storing alert rule: ${rule.id}`);
  }

  private initializeDefaultRules(): void {
    // Initialize default alert rules
    const defaultRules: AlertRule[] = [
      {
        id: 'failed-login-attempts',
        name: 'Failed Login Attempts',
        type: 'failed_login',
        severity: 'medium',
        conditions: { threshold: 5, timeWindow: 300 },
        enabled: true,
        escalationRules: [
          {
            level: 1,
            timeoutMinutes: 15,
            severity: 'high',
            notificationChannels: ['email', 'in-app'],
            recipients: ['admin@example.com'],
          },
          {
            level: 2,
            timeoutMinutes: 30,
            severity: 'critical',
            notificationChannels: ['email', 'sms', 'in-app'],
            recipients: ['admin@example.com', 'security@example.com'],
          },
        ],
        notificationChannels: ['email', 'in-app'],
      },
      {
        id: 'suspicious-activity',
        name: 'Suspicious Activity Detected',
        type: 'suspicious_activity',
        severity: 'high',
        conditions: { riskScore: 80 },
        enabled: true,
        escalationRules: [
          {
            level: 1,
            timeoutMinutes: 10,
            severity: 'critical',
            notificationChannels: ['email', 'sms', 'in-app'],
            recipients: ['security@example.com'],
          },
        ],
        notificationChannels: ['email', 'in-app'],
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private initializeNotificationChannels(): void {
    // Initialize default notification channels
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'email-default',
        type: 'email',
        name: 'Default Email',
        config: { smtp: 'default' },
        enabled: true,
      },
      {
        id: 'in-app-default',
        type: 'in-app',
        name: 'In-App Notifications',
        config: {},
        enabled: true,
      },
    ];

    defaultChannels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });
  }
}