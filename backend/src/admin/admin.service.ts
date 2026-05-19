import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSystemSettingDto, UpdateSystemSettingDto, SystemInfoDto } from './dto/system-settings.dto';
import { CreateAuditLogDto, AuditLogFiltersDto, AuditLogExportDto, AuditLogAnalyticsDto } from './dto/audit-logs.dto';
import { CreateNotificationDto, GetNotificationsDto, UpdateNotificationPreferencesDto } from './dto/notification.dto';
import { NotificationService, AdminNotification, NotificationPreferences } from './services/notification.service';
import { AdminCacheService } from './services/admin-cache.service';
import { CacheMonitoringService } from './services/cache-monitoring.service';
import { SystemSetting, AuditLog } from '@prisma/client';
import type { Response } from 'express';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DashboardMetrics {
  systemHealth: {
    database: string;
    redis: string;
    services: string;
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    userGrowthRate: number;
  };
  eventMetrics: {
    totalEvents: number;
    publishedEvents: number;
    draftEvents: number;
    totalRegistrations: number;
  };
  contentMetrics: {
    pendingComments: number;
    flaggedContent: number;
    moderationQueue: number;
  };
  systemAlerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    user: string;
    timestamp: Date;
  }>;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private adminCacheService: AdminCacheService,
    private cacheMonitoringService: CacheMonitoringService,
  ) {}

  // System Settings Management
  async getAllSettings(): Promise<SystemSetting[]> {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async getSetting(key: string): Promise<SystemSetting> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    return setting;
  }

  async createSetting(data: CreateSystemSettingDto): Promise<SystemSetting> {
    try {
      return await this.prisma.systemSetting.create({
        data,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error(`Setting with key '${data.key}' already exists`);
      }
      throw error;
    }
  }

  async updateSetting(key: string, data: UpdateSystemSettingDto): Promise<SystemSetting> {
    const existingSetting = await this.getSetting(key);
    
    return this.prisma.systemSetting.update({
      where: { key },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async deleteSetting(key: string): Promise<void> {
    await this.getSetting(key); // Check if exists
    
    await this.prisma.systemSetting.delete({
      where: { key },
    });
  }

  // Settings Backup and Restore
  async createSettingsBackup(description: string): Promise<any> {
    const settings = await this.getAllSettings();
    
    // In a real implementation, you might store this in a separate table or file system
    // For now, we'll return a mock backup object
    const backup = {
      id: `backup_${Date.now()}`,
      timestamp: new Date().toISOString(),
      description,
      settings,
    };

    // TODO: Store backup in database or file system
    this.logger.log(`Created settings backup: ${backup.id}`);
    
    return backup;
  }

  async getSettingsBackups(): Promise<any[]> {
    // TODO: Retrieve backups from database or file system
    // For now, return empty array
    return [];
  }

  async restoreSettingsBackup(backupId: string): Promise<void> {
    // TODO: Implement backup restoration
    // This would involve:
    // 1. Retrieve backup by ID
    // 2. Clear current settings (with confirmation)
    // 3. Restore settings from backup
    this.logger.log(`Restore settings backup requested: ${backupId}`);
    throw new Error('Backup restoration not yet implemented');
  }

  // Settings Testing and Validation
  async testSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Implement setting-specific validation based on key patterns
      if (key.toLowerCase().includes('email') || key.toLowerCase().includes('smtp')) {
        return this.testEmailSetting(key, value);
      } else if (key.toLowerCase().includes('storage') || key.toLowerCase().includes('upload')) {
        return this.testStorageSetting(key, value);
      } else if (key.toLowerCase().includes('api') || key.toLowerCase().includes('url')) {
        return this.testApiSetting(key, value);
      } else if (key.toLowerCase().includes('database') || key.toLowerCase().includes('db')) {
        return this.testDatabaseSetting(key, value);
      }

      // Default validation - just check if value is not empty
      return { success: value.trim().length > 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async testEmailSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    // Basic email configuration validation
    if (key.toLowerCase().includes('host')) {
      // Test if host is reachable (simplified)
      return { success: value.length > 0 && !value.includes(' ') };
    } else if (key.toLowerCase().includes('port')) {
      const port = parseInt(value);
      return { success: port > 0 && port <= 65535 };
    } else if (key.toLowerCase().includes('user') || key.toLowerCase().includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return { success: emailRegex.test(value) };
    }
    return { success: true };
  }

  private async testStorageSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    // Basic storage configuration validation
    if (key.toLowerCase().includes('path')) {
      // Check if path format is valid
      const isValidPath = value.length > 0 && (value.startsWith('/') || !!value.match(/^[A-Za-z]:/));
      return { success: isValidPath };
    } else if (key.toLowerCase().includes('size') || key.toLowerCase().includes('limit')) {
      const size = parseInt(value);
      return { success: size > 0 };
    }
    return { success: true };
  }

  private async testApiSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    // Basic API configuration validation
    if (key.toLowerCase().includes('url')) {
      try {
        new URL(value);
        return { success: true };
      } catch {
        return { success: false, error: 'Invalid URL format' };
      }
    } else if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
      return { success: value.length >= 8 }; // Minimum key length
    } else if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('limit')) {
      const rate = parseInt(value);
      return { success: rate > 0 };
    }
    return { success: true };
  }

  private async testDatabaseSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    // Basic database configuration validation
    if (key.toLowerCase().includes('url')) {
      return { success: value.startsWith('postgresql://') || value.startsWith('mysql://') };
    } else if (key.toLowerCase().includes('host')) {
      return { success: value.length > 0 && !value.includes(' ') };
    } else if (key.toLowerCase().includes('port')) {
      const port = parseInt(value);
      return { success: port > 0 && port <= 65535 };
    }
    return { success: true };
  }

  // Enhanced Dashboard Metrics with Caching
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Use cached metrics from AdminCacheService
    return this.adminCacheService.getDashboardMetrics();
  }

  // System Information
  async getSystemInfo(): Promise<SystemInfoDto> {
    const packageJson = require('../../package.json');
    
    // Get database status
    let databaseStatus = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      databaseStatus = 'disconnected';
      this.logger.error('Database connection check failed:', error);
    }

    // Get Redis status (if available)
    let redisStatus = 'not configured';
    // TODO: Add Redis connection check when Redis is implemented

    // Get system statistics
    const [totalUsers, totalEvents, totalRegistrations] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.event.count(),
      this.prisma.registration.count(),
    ]);

    return {
      version: packageJson.version || '1.0.0',
      nodeVersion: process.version,
      databaseStatus,
      redisStatus,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      totalUsers,
      totalEvents,
      totalRegistrations,
    };
  }

  // Audit Logging
  async createAuditLog(data: CreateAuditLogDto): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data,
    });
  }

  async getAuditLogs(filters: AuditLogFiltersDto) {
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate, 
      search,
      ipAddress,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeUser = true,
      ...whereFilters 
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Apply filters
    if (whereFilters.userId) {
      where.userId = whereFilters.userId;
    }
    if (whereFilters.action) {
      where.action = { contains: whereFilters.action, mode: 'insensitive' };
    }
    if (whereFilters.resource) {
      where.resource = { contains: whereFilters.resource, mode: 'insensitive' };
    }
    if (whereFilters.resourceId) {
      where.resourceId = whereFilters.resourceId;
    }
    if (ipAddress) {
      where.ipAddress = { contains: ipAddress, mode: 'insensitive' };
    }

    // Advanced search across multiple fields
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { resourceId: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { userAgent: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Build order by
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: includeUser ? {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        } : undefined,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAuditLogsByUser(userId: string, limit: number = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getAuditLogsByResource(resource: string, resourceId?: string, limit: number = 50) {
    const where: any = { resource };
    if (resourceId) {
      where.resourceId = resourceId;
    }

    return this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getAuditLogSummary(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalLogs,
      actionCounts,
      resourceCounts,
      userCounts,
    ] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['resource'],
        where: { createdAt: { gte: startDate } },
        _count: { resource: true },
        orderBy: { _count: { resource: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { 
          createdAt: { gte: startDate },
          userId: { not: null },
        },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      period: `Last ${days} days`,
      totalLogs,
      topActions: actionCounts.map(item => ({
        action: item.action,
        count: item._count.action,
      })),
      topResources: resourceCounts.map(item => ({
        resource: item.resource,
        count: item._count.resource,
      })),
      topUsers: userCounts.map(item => ({
        userId: item.userId,
        count: item._count.userId,
      })),
    };
  }

  async deleteOldAuditLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Deleted ${result.count} audit logs older than ${daysToKeep} days`);
    return result.count;
  }

  // System Maintenance Tools
  async getCacheStats(): Promise<any> {
    // Mock cache statistics - in real implementation, this would connect to Redis
    return {
      totalKeys: Math.floor(Math.random() * 1000) + 100,
      memoryUsage: Math.floor(Math.random() * 100) + 50, // MB
      hitRate: Math.random() * 100,
      missRate: Math.random() * 20,
      evictedKeys: Math.floor(Math.random() * 50),
      expiredKeys: Math.floor(Math.random() * 30),
      keysByType: {
        string: Math.floor(Math.random() * 400) + 50,
        hash: Math.floor(Math.random() * 200) + 20,
        list: Math.floor(Math.random() * 100) + 10,
        set: Math.floor(Math.random() * 50) + 5,
        zset: Math.floor(Math.random() * 30) + 3,
      },
      lastUpdated: new Date(),
    };
  }

  async clearCache(pattern?: string): Promise<{ cleared: number; pattern?: string }> {
    // Mock cache clearing - in real implementation, this would connect to Redis
    const clearedCount = pattern ? Math.floor(Math.random() * 50) + 1 : Math.floor(Math.random() * 200) + 50;
    
    this.logger.log(`Cache clearing requested${pattern ? ` with pattern: ${pattern}` : ' (all keys)'}`);
    
    return {
      cleared: clearedCount,
      pattern,
    };
  }

  async streamSiteBackup(
    res: Response,
    opts: { includeUploads: boolean; includeLogs: boolean; requestedBy?: string }
  ) {
    const tmpRoot = '/app/.tmp';
    const workDir = path.join(tmpRoot, 'site-backup-work');
    const lockPath = path.join(tmpRoot, 'site-backup.lock');

    // Simple single-flight lock to avoid concurrent heavy backups
    let lockFd: number | null = null;
    try {
      lockFd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(lockFd, `pid=${process.pid}\nrequestedBy=${opts.requestedBy || ''}\nstartedAt=${new Date().toISOString()}\n`);
    } catch {
      throw new BadRequestException('A backup export is already running. Please try again in a few minutes.');
    }

    const cleanup = () => {
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
      try { if (lockFd != null) fs.closeSync(lockFd); } catch {}
      try { fs.rmSync(lockPath, { force: true }); } catch {}
    };

    try {
      fs.mkdirSync(workDir, { recursive: true });

      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new BadRequestException('DATABASE_URL is not configured; cannot export database backup.');
      }

      // 1) Create DB dump (custom format) using pg_dump
      const dumpPath = path.join(workDir, 'db.dump');
      const u = new URL(databaseUrl);
      const pgEnv = {
        ...process.env,
        PGHOST: u.hostname,
        PGPORT: u.port || '5432',
        PGUSER: decodeURIComponent(u.username || ''),
        PGPASSWORD: decodeURIComponent(u.password || ''),
        PGDATABASE: u.pathname.replace(/^\//, ''),
      };

      await new Promise<void>((resolve, reject) => {
        const pg = spawn('pg_dump', ['-Fc', '--no-owner', '--no-acl', '-f', dumpPath], {
          env: pgEnv,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stderr = '';
        pg.stderr.on('data', (d) => (stderr += d.toString()));
        pg.on('error', reject);
        pg.on('close', (code) => {
          if (code === 0) return resolve();
          reject(new Error(`pg_dump failed (code=${code}): ${stderr}`));
        });
      });

      // 2) Write manifest
      const manifest = {
        version: 1,
        createdAt: new Date().toISOString(),
        node: process.version,
        platform: `${os.platform()}-${os.arch()}`,
        includeUploads: opts.includeUploads,
        includeLogs: opts.includeLogs,
      };
      fs.writeFileSync(path.join(workDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // 3) Stream tar.gz to response
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `giip-site-backup-${stamp}.tar.gz`;
      res.status(200);
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const tarArgs: string[] = ['-czf', '-', '-C', workDir, 'db.dump', 'manifest.json'];
      if (opts.includeUploads) {
        tarArgs.push('-C', '/app', 'uploads');
      }
      if (opts.includeLogs) {
        tarArgs.push('-C', '/app', 'logs');
      }

      const tar = spawn('tar', tarArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      tar.stdout.pipe(res);

      let tarErr = '';
      tar.stderr.on('data', (d) => (tarErr += d.toString()));

      // If client disconnects, stop tar
      res.on('close', () => {
        try { tar.kill('SIGTERM'); } catch {}
      });

      await new Promise<void>((resolve, reject) => {
        tar.on('error', reject);
        tar.on('close', (code) => {
          if (code === 0) return resolve();
          reject(new Error(`tar failed (code=${code}): ${tarErr}`));
        });
      });
    } catch (e: any) {
      this.logger.error('Site backup export failed', e);
      // If we haven't started streaming, send JSON error. If streaming already started, just end.
      if (!res.headersSent) {
        res.status(500).json({ message: e?.message || 'Failed to export site backup' });
      } else {
        try { res.end(); } catch {}
      }
    } finally {
      cleanup();
    }
  }

  async getDatabaseStats(): Promise<any> {
    try {
      // Get database size and table statistics
      const tableStats = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        LIMIT 20
      `;

      const databaseSize = await this.prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;

      const connectionStats = await this.prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
      `;

      const slowQueries = await this.prisma.$queryRaw`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT 10
      `;

      return {
        databaseSize: databaseSize[0],
        connectionStats: connectionStats[0],
        tableStats,
        slowQueries,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get database statistics:', error);
      return {
        error: 'Failed to retrieve database statistics',
        message: 'pg_stat_statements extension may not be enabled',
        lastUpdated: new Date(),
      };
    }
  }

  async optimizeDatabase(): Promise<{ message: string; operations: string[] }> {
    const operations = [];
    
    try {
      // Analyze tables for better query planning
      await this.prisma.$executeRaw`ANALYZE`;
      operations.push('ANALYZE - Updated table statistics');

      // Vacuum to reclaim space (non-blocking)
      await this.prisma.$executeRaw`VACUUM (ANALYZE)`;
      operations.push('VACUUM ANALYZE - Reclaimed space and updated statistics');

      this.logger.log('Database optimization completed successfully');
      
      return {
        message: 'Database optimization completed successfully',
        operations,
      };
    } catch (error) {
      this.logger.error('Database optimization failed:', error);
      throw new Error(`Database optimization failed: ${error.message}`);
    }
  }

  async getSystemResourceUsage(): Promise<any> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        usage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100), // %
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
      lastUpdated: new Date(),
    };
  }

  async setResourceAlert(type: string, threshold: number, enabled: boolean): Promise<void> {
    // Store alert configuration in database
    const alertKey = `alert_${type}_threshold`;
    const enabledKey = `alert_${type}_enabled`;
    
    await this.prisma.systemSetting.upsert({
      where: { key: alertKey },
      update: { value: threshold.toString() },
      create: {
        key: alertKey,
        value: threshold.toString(),
        description: `${type} alert threshold`,
      },
    });

    await this.prisma.systemSetting.upsert({
      where: { key: enabledKey },
      update: { value: enabled.toString() },
      create: {
        key: enabledKey,
        value: enabled.toString(),
        description: `${type} alert enabled`,
      },
    });

    this.logger.log(`Resource alert configured: ${type} threshold=${threshold} enabled=${enabled}`);
  }

  async getResourceAlerts(): Promise<any[]> {
    const alertSettings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: 'alert_',
        },
      },
    });

    const alerts: Record<string, any> = {};
    alertSettings.forEach(setting => {
      const [, type, property] = setting.key.split('_');
      if (!alerts[type]) alerts[type] = {};
      alerts[type][property] = property === 'threshold' ? parseFloat(setting.value) : setting.value === 'true';
    });

    return Object.entries(alerts).map(([type, config]) => ({
      type,
      ...(config as object),
    }));
  }

  // Log Management
  async getSystemLogs(level?: string, limit: number = 100) {
    // This is a placeholder for system log retrieval
    // In a real implementation, you might read from log files or a logging service
    return {
      message: 'System logs retrieval not implemented yet',
      note: 'This would typically read from log files or a centralized logging service',
      level,
      limit,
    };
  }

  async clearSystemLogs(): Promise<void> {
    // This is a placeholder for system log clearing
    // In a real implementation, you might clear log files or rotate them
    this.logger.log('System logs clearing requested (not implemented)');
  }

  async configureLogRetention(days: number): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key: 'log_retention_days' },
      update: { value: days.toString() },
      create: {
        key: 'log_retention_days',
        value: days.toString(),
        description: 'Number of days to retain system logs',
      },
    });

    this.logger.log(`Log retention configured: ${days} days`);
  }

  async getLogRetentionPolicy(): Promise<{ days: number; lastCleanup?: Date }> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'log_retention_days' },
    });

    const lastCleanupSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'last_log_cleanup' },
    });

    return {
      days: setting ? parseInt(setting.value) : 30,
      lastCleanup: lastCleanupSetting ? new Date(lastCleanupSetting.value) : undefined,
    };
  }

  // Enhanced Audit Log Methods
  async exportAuditLogs(exportDto: AuditLogExportDto): Promise<Buffer> {
    const { format, fields, filters } = exportDto;
    
    // Get audit logs with filters
    const auditData = await this.getAuditLogs(filters || {});
    const logs = auditData.data;

    // Default fields if not specified
    const defaultFields = ['id', 'action', 'resource', 'resourceId', 'userId', 'ipAddress', 'createdAt'];
    const exportFields = fields || defaultFields;

    if (format === 'json') {
      const filteredLogs = logs.map(log => {
        const filtered: any = {};
        exportFields.forEach(field => {
          if (field === 'user' && log.user) {
            filtered.user = log.user;
          } else if (log[field] !== undefined) {
            filtered[field] = log[field];
          }
        });
        return filtered;
      });
      return Buffer.from(JSON.stringify(filteredLogs, null, 2));
    }

    if (format === 'csv') {
      const csvHeader = exportFields.join(',');
      const csvRows = logs.map(log => {
        return exportFields.map(field => {
          if (field === 'user' && log.user) {
            return `"${log.user.username || log.user.email}"`;
          }
          const value = log[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      });
      return Buffer.from([csvHeader, ...csvRows].join('\n'));
    }

    // For Excel format, we'll return CSV for now (can be enhanced with xlsx library)
    if (format === 'excel') {
      const csvHeader = exportFields.join(',');
      const csvRows = logs.map(log => {
        return exportFields.map(field => {
          if (field === 'user' && log.user) {
            return `"${log.user.username || log.user.email}"`;
          }
          const value = log[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      });
      return Buffer.from([csvHeader, ...csvRows].join('\n'));
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  async getAuditLogAnalytics(analyticsDto: AuditLogAnalyticsDto) {
    const { startDate, endDate, groupBy = 'action', interval = 'day' } = analyticsDto;
    
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get action distribution
    const actionStats = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where: startDate || endDate ? { createdAt: dateFilter } : {},
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
    });

    // Get resource distribution
    const resourceStats = await this.prisma.auditLog.groupBy({
      by: ['resource'],
      where: startDate || endDate ? { createdAt: dateFilter } : {},
      _count: { resource: true },
      orderBy: { _count: { resource: 'desc' } },
    });

    // Get user activity (top users)
    const userStats = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: { 
        userId: { not: null },
        ...(startDate || endDate ? { createdAt: dateFilter } : {})
      },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    });

    // Get time-based analytics
    let timeStats = [];
    if (interval === 'day') {
      timeStats = await this.prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM audit_log 
        WHERE ${startDate ? `created_at >= ${startDate}` : '1=1'}
          AND ${endDate ? `created_at <= ${endDate}` : '1=1'}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;
    }

    // Detect patterns and anomalies
    const totalLogs = actionStats.reduce((sum, stat) => sum + stat._count.action, 0);
    const avgLogsPerAction = totalLogs / actionStats.length;
    
    const anomalies = actionStats
      .filter(stat => stat._count.action > avgLogsPerAction * 3) // Actions with 3x more than average
      .map(stat => ({
        type: 'high_frequency_action',
        action: stat.action,
        count: stat._count.action,
        threshold: avgLogsPerAction * 3,
        severity: stat._count.action > avgLogsPerAction * 5 ? 'high' : 'medium'
      }));

    return {
      summary: {
        totalLogs,
        uniqueActions: actionStats.length,
        uniqueResources: resourceStats.length,
        activeUsers: userStats.length,
        period: { startDate, endDate }
      },
      actionDistribution: actionStats.map(stat => ({
        action: stat.action,
        count: stat._count.action,
        percentage: (stat._count.action / totalLogs * 100).toFixed(2)
      })),
      resourceDistribution: resourceStats.map(stat => ({
        resource: stat.resource,
        count: stat._count.resource,
        percentage: (stat._count.resource / totalLogs * 100).toFixed(2)
      })),
      topUsers: userStats.map(stat => ({
        userId: stat.userId,
        count: stat._count.userId
      })),
      timeSeriesData: timeStats,
      anomalies,
      patterns: {
        mostActiveAction: actionStats[0]?.action,
        mostTargetedResource: resourceStats[0]?.resource,
        averageLogsPerDay: totalLogs / 30 // Assuming 30-day period
      }
    };
  }

  async getAuditLogTimeline(resourceId?: string, userId?: string) {
    const where: any = {};
    if (resourceId) where.resourceId = resourceId;
    if (userId) where.userId = userId;

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100, // Limit for performance
    });

    // Group logs by relationships
    const timeline = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      user: log.user,
      details: log.details,
      ipAddress: log.ipAddress,
    }));

    // Find related events (same resource or user within time windows)
    const relationships = [];
    for (let i = 0; i < timeline.length - 1; i++) {
      const current = timeline[i];
      const next = timeline[i + 1];
      
      const timeDiff = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();
      const isRelated = (
        current.resourceId === next.resourceId ||
        current.user?.id === next.user?.id
      ) && timeDiff < 300000; // 5 minutes

      if (isRelated) {
        relationships.push({
          from: current.id,
          to: next.id,
          type: current.resourceId === next.resourceId ? 'resource' : 'user',
          timeDiff: timeDiff / 1000 // seconds
        });
      }
    }

    return {
      timeline,
      relationships,
      summary: {
        totalEvents: timeline.length,
        timeSpan: timeline.length > 0 ? {
          start: timeline[0].timestamp,
          end: timeline[timeline.length - 1].timestamp
        } : null,
        uniqueUsers: [...new Set(timeline.map(t => t.user?.id).filter(Boolean))].length,
        uniqueResources: [...new Set(timeline.map(t => t.resourceId).filter(Boolean))].length
      }
    };
  }

  // Notification Management Methods
  async createNotification(createNotificationDto: CreateNotificationDto): Promise<AdminNotification> {
    return this.notificationService.createNotification({
      ...createNotificationDto,
      expiresAt: createNotificationDto.expiresAt ? new Date(createNotificationDto.expiresAt) : undefined,
    });
  }

  async getNotifications(filters: GetNotificationsDto, userId: string) {
    const notificationFilters = {
      ...filters,
      userId: filters.userId || userId,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };

    return this.notificationService.getNotifications(notificationFilters);
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<{ success: boolean }> {
    const success = await this.notificationService.markAsRead(notificationId, userId);
    return { success };
  }

  async markNotificationsAsRead(notificationIds: string[], userId: string): Promise<{ markedCount: number }> {
    const markedCount = await this.notificationService.markMultipleAsRead(notificationIds, userId);
    return { markedCount };
  }

  async deleteNotification(notificationId: string, userId: string): Promise<{ success: boolean }> {
    const success = await this.notificationService.deleteNotification(notificationId, userId);
    return { success };
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    return this.notificationService.getUserPreferences(userId);
  }

  async updateNotificationPreferences(
    userId: string, 
    preferences: UpdateNotificationPreferencesDto
  ): Promise<NotificationPreferences> {
    return this.notificationService.updateUserPreferences(userId, preferences as Partial<NotificationPreferences>);
  }

  async executeNotificationAction(
    notificationId: string, 
    actionId: string, 
    userId: string
  ): Promise<{ success: boolean }> {
    const success = await this.notificationService.executeNotificationAction(notificationId, actionId, userId);
    return { success };
  }

  async getNotificationStats(userId: string) {
    const { notifications, total, unreadCount } = await this.notificationService.getNotifications({
      userId,
      limit: 1000, // Get all notifications for stats
    });

    const stats = {
      total,
      unread: unreadCount,
      read: total - unreadCount,
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      recentActivity: notifications.slice(0, 10), // Last 10 notifications
    };

    // Calculate statistics
    notifications.forEach(notification => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      stats.byCategory[notification.category] = (stats.byCategory[notification.category] || 0) + 1;
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
    });

    return stats;
  }

  // Cache Management and Monitoring
  async getCachePerformanceReport() {
    return this.cacheMonitoringService.generatePerformanceReport();
  }

  async getCacheHealthStatus() {
    return this.cacheMonitoringService.getCacheHealthStatus();
  }

  async getCacheDetailedStats() {
    return this.cacheMonitoringService.getDetailedStats();
  }

  async getCachePerformanceTrends(hours: number = 24) {
    return this.cacheMonitoringService.getPerformanceTrends(hours);
  }

  async warmupCache() {
    await this.adminCacheService.warmupAll();
    return { message: 'Cache warmup initiated successfully' };
  }

  async invalidateAdminCaches() {
    await this.adminCacheService.invalidateAllAdminCaches();
    return { message: 'Admin caches invalidated successfully' };
  }

  async invalidateUserCaches() {
    await this.adminCacheService.invalidateUserCaches();
    return { message: 'User caches invalidated successfully' };
  }

  async invalidateEventCaches() {
    await this.adminCacheService.invalidateEventCaches();
    return { message: 'Event caches invalidated successfully' };
  }

  async getCacheMetrics() {
    return this.adminCacheService.getAllMetrics();
  }

  async resetCacheMetrics() {
    this.adminCacheService.resetMetrics();
    return { message: 'Cache metrics reset successfully' };
  }

  // ========== Payment Order Ledger ==========

  async getOrders(filters: {
    eventId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { eventId, status, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          event: { select: { id: true, title: true } },
          user: { select: { id: true, username: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map(order => ({
        ...order,
        amountYuan: (order.amount / 100).toFixed(2),
        feeCents: order.feeCents ?? 0,
        feeYuan: ((order.feeCents ?? 0) / 100).toFixed(2),
        totalYuan: ((order.amount + (order.feeCents ?? 0)) / 100).toFixed(2),
        eventTitle: order.event?.title || '-',
        payerName: order.user?.username || order.user?.email || 'Guest',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderStats(filters: { eventId?: string; startDate?: string; endDate?: string }) {
    const where: any = {};
    if (filters.eventId) where.eventId = filters.eventId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [totalOrders, successOrders, pendingOrders, failedOrders, totalRevenue] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'SUCCESS' } }),
      this.prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.order.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.order.aggregate({ where: { ...where, status: 'SUCCESS' }, _sum: { amount: true } }),
    ]);

    return {
      totalOrders,
      successOrders,
      pendingOrders,
      failedOrders,
      totalRevenueCents: totalRevenue._sum.amount || 0,
      totalRevenueYuan: ((totalRevenue._sum.amount || 0) / 100).toFixed(2),
    };
  }

  async exportOrdersExcel(filters: { eventId?: string; status?: string; startDate?: string; endDate?: string }): Promise<Buffer> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GIIP Admin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('支付流水凭证');

    // Define columns
    sheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '订单编号', key: 'orderId', width: 28 },
      { header: '平台订单号', key: 'platformOrderNo', width: 28 },
      { header: '收费项目', key: 'eventTitle', width: 38 },
      { header: '付款人', key: 'payerName', width: 18 },
      { header: '金额（元）', key: 'amount', width: 12 },
      { header: '手续费（元）', key: 'feeYuan', width: 12 },
      { header: '应付金额（元）', key: 'totalYuan', width: 14 },
      { header: '支付状态', key: 'status', width: 12 },
      { header: '支付方式', key: 'payType', width: 12 },
      { header: '支付时间', key: 'payTime', width: 22 },
      { header: '创建时间', key: 'createdAt', width: 22 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };

    // Build query
    const where: any = {};
    if (filters.eventId) where.eventId = filters.eventId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        event: { select: { title: true } },
        user: { select: { username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusMap: Record<string, string> = { SUCCESS: '成功', PENDING: '待支付', FAILED: '失败' };
    const payTypeMap: Record<string, string> = { '01': '支付宝', '02': '微信支付', '03': '银行卡' };

    const feeYuan = (c: number | null) => ((c ?? 0) / 100).toFixed(2);
    const totalYuan = (amount: number, fee: number | null) => ((amount + (fee ?? 0)) / 100).toFixed(2);
    orders.forEach((order, idx) => {
      sheet.addRow({
        index: idx + 1,
        orderId: order.id,
        platformOrderNo: order.platformOrderNo || '-',
        eventTitle: order.event?.title || '-',
        payerName: order.user?.username || order.user?.email || 'Guest',
        amount: (order.amount / 100).toFixed(2),
        feeYuan: feeYuan(order.feeCents),
        totalYuan: totalYuan(order.amount, order.feeCents),
        status: statusMap[order.status] || order.status,
        payType: order.payType ? (payTypeMap[order.payType] || order.payType) : '-',
        payTime: order.payTime ? order.payTime.toISOString().replace('T', ' ').substring(0, 19) : '-',
        createdAt: order.createdAt.toISOString().replace('T', ' ').substring(0, 19),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}