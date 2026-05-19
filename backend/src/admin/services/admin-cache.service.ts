import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminCacheService {
  private readonly logger = new Logger(AdminCacheService.name);

  constructor(
    private cacheService: CacheService,
    private prisma: PrismaService,
  ) {
    this.registerWarmupConfigs();
  }

  // Public methods to expose cache service functionality
  warmupAll(): Promise<void> {
    return this.cacheService.warmupAll();
  }

  getAllMetrics() {
    return this.cacheService.getAllMetrics();
  }

  resetMetrics(): void {
    this.cacheService.resetMetrics();
  }

  /**
   * Register cache warmup configurations for admin data
   */
  private registerWarmupConfigs(): void {
    // Dashboard metrics warmup
    this.cacheService.registerWarmup({
      key: 'admin:dashboard:metrics',
      factory: () => this.generateDashboardMetrics(),
      ttl: this.cacheService.ttl.short,
      priority: 'high',
    });

    // User statistics warmup
    this.cacheService.registerWarmup({
      key: 'admin:users:stats',
      factory: () => this.generateUserStats(),
      ttl: this.cacheService.ttl.medium,
      priority: 'high',
    });

    // Event statistics warmup
    this.cacheService.registerWarmup({
      key: 'admin:events:stats',
      factory: () => this.generateEventStats(),
      ttl: this.cacheService.ttl.medium,
      priority: 'medium',
    });

    // System health warmup
    this.cacheService.registerWarmup({
      key: 'admin:system:health',
      factory: () => this.generateSystemHealth(),
      ttl: this.cacheService.ttl.short,
      priority: 'high',
    });

    // Analytics data warmup
    this.cacheService.registerWarmup({
      key: 'admin:analytics:overview',
      factory: () => this.generateAnalyticsOverview(),
      ttl: this.cacheService.ttl.medium,
      priority: 'medium',
    });
  }

  /**
   * Cache keys for admin interface
   */
  keys = {
    dashboardMetrics: () => 'admin:dashboard:metrics',
    userStats: () => 'admin:users:stats',
    eventStats: () => 'admin:events:stats',
    systemHealth: () => 'admin:system:health',
    analyticsOverview: () => 'admin:analytics:overview',
    userList: (filters: string) => `admin:users:list:${filters}`,
    eventList: (filters: string) => `admin:events:list:${filters}`,
    moderationQueue: (filters: string) => `admin:moderation:queue:${filters}`,
    auditLogs: (filters: string) => `admin:audit:logs:${filters}`,
    securityAlerts: () => 'admin:security:alerts',
    systemSettings: () => 'admin:system:settings',
    sensitiveWords: () => 'admin:sensitive:words',
  };

  /**
   * Get or generate dashboard metrics
   */
  async getDashboardMetrics(): Promise<any> {
    return this.cacheService.getOrSet(
      this.keys.dashboardMetrics(),
      () => this.generateDashboardMetrics(),
      { 
        ttl: this.cacheService.ttl.short,
        tags: ['admin', 'dashboard', 'metrics']
      }
    );
  }

  /**
   * Get or generate user statistics
   */
  async getUserStats(): Promise<any> {
    return this.cacheService.getOrSet(
      this.keys.userStats(),
      () => this.generateUserStats(),
      { 
        ttl: this.cacheService.ttl.medium,
        tags: ['admin', 'users', 'stats']
      }
    );
  }

  /**
   * Get or generate event statistics
   */
  async getEventStats(): Promise<any> {
    return this.cacheService.getOrSet(
      this.keys.eventStats(),
      () => this.generateEventStats(),
      { 
        ttl: this.cacheService.ttl.medium,
        tags: ['admin', 'events', 'stats']
      }
    );
  }

  /**
   * Get or generate system health data
   */
  async getSystemHealth(): Promise<any> {
    return this.cacheService.getOrSet(
      this.keys.systemHealth(),
      () => this.generateSystemHealth(),
      { 
        ttl: this.cacheService.ttl.short,
        tags: ['admin', 'system', 'health']
      }
    );
  }

  /**
   * Get cached user list with filters
   */
  async getUserList(filters: any): Promise<any> {
    const filterKey = JSON.stringify(filters);
    return this.cacheService.getOrSet(
      this.keys.userList(filterKey),
      () => this.generateUserList(filters),
      { 
        ttl: this.cacheService.ttl.short,
        tags: ['admin', 'users', 'list']
      }
    );
  }

  /**
   * Get cached moderation queue
   */
  async getModerationQueue(filters: any): Promise<any> {
    const filterKey = JSON.stringify(filters);
    return this.cacheService.getOrSet(
      this.keys.moderationQueue(filterKey),
      () => this.generateModerationQueue(filters),
      { 
        ttl: this.cacheService.ttl.short,
        tags: ['admin', 'moderation', 'queue']
      }
    );
  }

  /**
   * Invalidate admin caches when data changes
   */
  async invalidateUserCaches(): Promise<void> {
    await this.cacheService.invalidateByTags(['users', 'stats']);
    this.logger.debug('Invalidated user-related admin caches');
  }

  async invalidateEventCaches(): Promise<void> {
    await this.cacheService.invalidateByTags(['events', 'stats']);
    this.logger.debug('Invalidated event-related admin caches');
  }

  async invalidateDashboardCaches(): Promise<void> {
    await this.cacheService.invalidateByTags(['dashboard', 'metrics']);
    this.logger.debug('Invalidated dashboard admin caches');
  }

  async invalidateModerationCaches(): Promise<void> {
    await this.cacheService.invalidateByTags(['moderation']);
    this.logger.debug('Invalidated moderation admin caches');
  }

  async invalidateAllAdminCaches(): Promise<void> {
    await this.cacheService.invalidateByTags(['admin']);
    this.logger.debug('Invalidated all admin caches');
  }

  /**
   * Generate dashboard metrics data
   */
  private async generateDashboardMetrics(): Promise<any> {
    const [
      totalUsers,
      activeUsers,
      totalEvents,
      upcomingEvents,
      totalRegistrations,
      pendingRegistrations,
    ] = await Promise.all([
      this.prisma.user.count(),
      // Note: lastLoginAt field doesn't exist in User model, using createdAt as alternative
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      this.prisma.event.count(),
      this.prisma.event.count({
        where: {
          startDate: {
            gte: new Date(),
          },
          status: 'PUBLISHED',
        },
      }),
      this.prisma.registration.count(),
      this.prisma.registration.count({
        where: {
          status: 'PENDING',
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalEvents,
      upcomingEvents,
      totalRegistrations,
      pendingRegistrations,
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate user statistics
   */
  private async generateUserStats(): Promise<any> {
    const [
      usersByRole,
      usersByStatus,
      recentRegistrations,
    ] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.user.groupBy({
        by: ['isActive'],
        _count: true,
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    return {
      usersByRole,
      usersByStatus,
      recentRegistrations,
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate event statistics
   */
  private async generateEventStats(): Promise<any> {
    const [
      eventsByStatus,
      averageRegistrations,
      totalEvents,
    ] = await Promise.all([
      this.prisma.event.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.registration.groupBy({
        by: ['eventId'],
        _count: true,
      }),
      this.prisma.event.count(),
    ]);

    const avgRegistrations = averageRegistrations.length > 0 
      ? averageRegistrations.reduce((sum, item) => sum + item._count, 0) / averageRegistrations.length
      : 0;

    return {
      eventsByStatus,
      totalEvents,
      averageRegistrations: Math.round(avgRegistrations),
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate system health data
   */
  private async generateSystemHealth(): Promise<any> {
    try {
      // Test database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Get cache health
      const cacheHealth = await this.cacheService.healthCheck();
      
      return {
        database: {
          status: 'healthy',
          responseTime: 0, // Would need to measure actual response time
        },
        cache: cacheHealth,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('System health check failed:', error);
      return {
        database: {
          status: 'unhealthy',
          error: error.message,
        },
        cache: { status: 'unknown' },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Generate analytics overview
   */
  private async generateAnalyticsOverview(): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [
      userGrowth,
      eventGrowth,
      registrationGrowth,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      this.prisma.event.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      this.prisma.registration.count({
        where: {
          registeredAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
    ]);

    return {
      userGrowth,
      eventGrowth,
      registrationGrowth,
      period: '30 days',
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate user list with filters
   */
  private async generateUserList(filters: any): Promise<any> {
    const where: any = {};
    
    if (filters.role) {
      where.role = filters.role;
    }
    
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: filters.limit || 50,
        skip: filters.offset || 0,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          // Note: lastLoginAt field doesn't exist in User model
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      filters,
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate moderation queue
   */
  private async generateModerationQueue(filters: any): Promise<any> {
    // This would depend on your moderation system implementation
    // For now, returning a placeholder structure
    return {
      pendingComments: [],
      flaggedContent: [],
      total: 0,
      filters,
      lastUpdated: new Date(),
    };
  }
}