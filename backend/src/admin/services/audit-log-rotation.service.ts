import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdminService } from '../admin.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuditLogRotationService {
  private readonly logger = new Logger(AuditLogRotationService.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  // Run daily at 2 AM to clean up old audit logs
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async rotateAuditLogs() {
    try {
      const retentionDays = this.configService.get<number>('AUDIT_LOG_RETENTION_DAYS', 90);
      
      this.logger.log(`Starting audit log rotation (retention: ${retentionDays} days)`);
      
      const deletedCount = await this.adminService.deleteOldAuditLogs(retentionDays);
      
      this.logger.log(`Audit log rotation completed. Deleted ${deletedCount} old logs.`);
      
      // Log the rotation action itself
      await this.adminService.createAuditLog({
        action: 'AUDIT_LOG_ROTATION',
        resource: 'system',
        details: {
          retentionDays,
          deletedCount,
          timestamp: new Date().toISOString(),
        },
      });
      
    } catch (error) {
      this.logger.error('Failed to rotate audit logs:', error);
      
      // Log the failure
      try {
        await this.adminService.createAuditLog({
          action: 'AUDIT_LOG_ROTATION_FAILED',
          resource: 'system',
          details: {
            error: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (logError) {
        this.logger.error('Failed to log audit rotation failure:', logError);
      }
    }
  }

  // Manual rotation method that can be called by admins
  async manualRotation(retentionDays?: number): Promise<{ deletedCount: number; message: string }> {
    try {
      const days = retentionDays || this.configService.get<number>('AUDIT_LOG_RETENTION_DAYS', 90);
      
      this.logger.log(`Manual audit log rotation requested (retention: ${days} days)`);
      
      const deletedCount = await this.adminService.deleteOldAuditLogs(days);
      
      // Log the manual rotation action
      await this.adminService.createAuditLog({
        action: 'MANUAL_AUDIT_LOG_ROTATION',
        resource: 'system',
        details: {
          retentionDays: days,
          deletedCount,
          timestamp: new Date().toISOString(),
        },
      });
      
      const message = `Manual audit log rotation completed. Deleted ${deletedCount} old logs.`;
      this.logger.log(message);
      
      return { deletedCount, message };
      
    } catch (error) {
      this.logger.error('Manual audit log rotation failed:', error);
      
      // Log the failure
      try {
        await this.adminService.createAuditLog({
          action: 'MANUAL_AUDIT_LOG_ROTATION_FAILED',
          resource: 'system',
          details: {
            error: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (logError) {
        this.logger.error('Failed to log manual audit rotation failure:', logError);
      }
      
      throw error;
    }
  }

  // Get audit log statistics
  async getAuditLogStats(): Promise<{
    totalLogs: number;
    oldestLog: Date | null;
    newestLog: Date | null;
    logsByAction: Record<string, number>;
    logsByResource: Record<string, number>;
  }> {
    try {
      // This would be implemented with proper aggregation queries
      // For now, returning a placeholder structure
      return {
        totalLogs: 0,
        oldestLog: null,
        newestLog: null,
        logsByAction: {},
        logsByResource: {},
      };
    } catch (error) {
      this.logger.error('Failed to get audit log statistics:', error);
      throw error;
    }
  }
}