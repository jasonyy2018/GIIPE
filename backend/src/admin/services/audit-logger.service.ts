import { Injectable, Logger } from '@nestjs/common';
import { AdminService } from '../admin.service';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(private readonly adminService: AdminService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.adminService.createAuditLog(entry);
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  // Convenience methods for common audit actions
  async logUserAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
    });
  }

  async logSystemAction(
    action: string,
    resource: string,
    resourceId?: string,
    details?: any,
  ): Promise<void> {
    await this.log({
      action,
      resource,
      resourceId,
      details,
    });
  }

  async logSecurityEvent(
    action: string,
    userId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'security',
      details: {
        ...details,
        severity: 'high',
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });
  }

  async logDataAccess(
    userId: string,
    resource: string,
    resourceId?: string,
    action: string = 'DATA_ACCESS',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId,
      details: {
        type: 'data_access',
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });
  }

  async logConfigurationChange(
    userId: string,
    configKey: string,
    oldValue?: any,
    newValue?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      action: 'CONFIGURATION_CHANGE',
      resource: 'system_settings',
      resourceId: configKey,
      details: {
        configKey,
        oldValue: oldValue ? '[REDACTED]' : undefined,
        newValue: newValue ? '[REDACTED]' : undefined,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });
  }
}