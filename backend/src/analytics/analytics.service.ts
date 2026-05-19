import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsQueryDto,
  DateRange,
  DashboardMetrics,
  UserActivityMetrics,
  EventMetrics,
  RegistrationMetrics,
  SystemMetrics,
  UserActivityDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Track user activity for analytics
   */
  async trackUserActivity(activityData: UserActivityDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: activityData.userId,
          action: activityData.action,
          resource: activityData.resource,
          resourceId: activityData.resourceId,
          details: activityData.metadata,
        },
      });
    } catch (error) {
      this.logger.error('Failed to track user activity', error);
    }
  }

  /**
   * Get dashboard metrics with growth calculations
   */
  async getDashboardMetrics(query: AnalyticsQueryDto): Promise<DashboardMetrics> {
    const { startDate, endDate } = this.getDateRange(query);
    const previousPeriodStart = new Date(startDate);
    const previousPeriodEnd = new Date(endDate);
    const periodDiff = endDate.getTime() - startDate.getTime();
    previousPeriodStart.setTime(startDate.getTime() - periodDiff);
    previousPeriodEnd.setTime(endDate.getTime() - periodDiff);

    // Current period metrics
    const [
      totalUsers,
      activeUsers,
      totalEvents,
      publishedEvents,
      totalRegistrations,
      totalSubmissions,
      totalComments,
      pendingComments,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.user.count({
        where: {
          isActive: true,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.event.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.event.count({
        where: {
          status: 'PUBLISHED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.registration.count({
        where: { registeredAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.submission.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.comment.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.comment.count({
        where: {
          status: 'PENDING',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Previous period metrics for growth calculation
    const [
      prevTotalUsers,
      prevTotalEvents,
      prevTotalRegistrations,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd } },
      }),
      this.prisma.event.count({
        where: { createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd } },
      }),
      this.prisma.registration.count({
        where: { registeredAt: { gte: previousPeriodStart, lte: previousPeriodEnd } },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalEvents,
      publishedEvents,
      totalRegistrations,
      totalSubmissions,
      totalComments,
      pendingComments,
      userGrowth: this.calculateGrowthRate(totalUsers, prevTotalUsers),
      eventGrowth: this.calculateGrowthRate(totalEvents, prevTotalEvents),
      registrationGrowth: this.calculateGrowthRate(totalRegistrations, prevTotalRegistrations),
    };
  }

  /**
   * Get user activity metrics
   */
  async getUserActivityMetrics(query: AnalyticsQueryDto): Promise<UserActivityMetrics> {
    const { startDate, endDate } = this.getDateRange(query);

    const [totalActions, uniqueUsers, topActions, activityByDay] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.auditLog.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { userId: true },
        distinct: ['userId'],
      }).then(result => result.length),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }).then(result => 
        result.map(item => ({
          action: item.action,
          count: item._count.action,
        }))
      ),
      this.getActivityByDay(startDate, endDate),
    ]);

    return {
      totalActions,
      uniqueUsers,
      topActions,
      activityByDay,
    };
  }

  /**
   * Get event metrics
   */
  async getEventMetrics(query: AnalyticsQueryDto): Promise<EventMetrics> {
    const { startDate, endDate } = this.getDateRange(query);

    const [
      totalEvents,
      publishedEvents,
      draftEvents,
      completedEvents,
      topEvents,
      eventsByMonth,
    ] = await Promise.all([
      this.prisma.event.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.event.count({
        where: {
          status: 'PUBLISHED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.event.count({
        where: {
          status: 'DRAFT',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.event.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.getTopEventsByRegistrations(startDate, endDate),
      this.getEventsByMonth(startDate, endDate),
    ]);

    const averageRegistrations = await this.getAverageRegistrationsPerEvent(startDate, endDate);

    return {
      totalEvents,
      publishedEvents,
      draftEvents,
      completedEvents,
      averageRegistrations,
      topEvents,
      eventsByMonth,
    };
  }

  /**
   * Get registration metrics
   */
  async getRegistrationMetrics(query: AnalyticsQueryDto): Promise<RegistrationMetrics> {
    const { startDate, endDate } = this.getDateRange(query);

    const [
      totalRegistrations,
      confirmedRegistrations,
      pendingRegistrations,
      cancelledRegistrations,
      registrationsByEvent,
      registrationsByMonth,
    ] = await Promise.all([
      this.prisma.registration.count({
        where: { registeredAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.registration.count({
        where: {
          status: 'CONFIRMED',
          registeredAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.registration.count({
        where: {
          status: 'PENDING',
          registeredAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.registration.count({
        where: {
          status: 'CANCELLED',
          registeredAt: { gte: startDate, lte: endDate },
        },
      }),
      this.getRegistrationsByEvent(startDate, endDate),
      this.getRegistrationsByMonth(startDate, endDate),
    ]);

    return {
      totalRegistrations,
      confirmedRegistrations,
      pendingRegistrations,
      cancelledRegistrations,
      registrationsByEvent,
      registrationsByMonth,
    };
  }

  /**
   * Get system metrics (basic implementation)
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    // Basic system metrics - in a real implementation, you'd integrate with monitoring tools
    const [totalFiles, totalUsers, totalEvents] = await Promise.all([
      this.prisma.submission.count({ where: { filePath: { not: null } } }),
      this.prisma.user.count(),
      this.prisma.event.count(),
    ]);

    return {
      databaseSize: 0, // Would need database-specific queries
      totalFiles,
      storageUsed: 0, // Would need file system integration
      averageResponseTime: 0, // Would need monitoring integration
      errorRate: 0, // Would need error tracking integration
      uptime: process.uptime(),
    };
  }

  /**
   * Export analytics data for reporting
   */
  async exportAnalyticsData(query: AnalyticsQueryDto): Promise<any> {
    const [
      dashboardMetrics,
      userActivityMetrics,
      eventMetrics,
      registrationMetrics,
    ] = await Promise.all([
      this.getDashboardMetrics(query),
      this.getUserActivityMetrics(query),
      this.getEventMetrics(query),
      this.getRegistrationMetrics(query),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      period: query,
      dashboard: dashboardMetrics,
      userActivity: userActivityMetrics,
      events: eventMetrics,
      registrations: registrationMetrics,
    };
  }

  // Private helper methods

  private getDateRange(query: AnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (query.dateRange === DateRange.CUSTOM && query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      switch (query.dateRange) {
        case DateRange.LAST_7_DAYS:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case DateRange.LAST_30_DAYS:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case DateRange.LAST_90_DAYS:
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case DateRange.LAST_YEAR:
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return { startDate, endDate };
  }

  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private async getActivityByDay(startDate: Date, endDate: Date) {
    const result = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return result.map(item => ({
      date: item.date,
      count: Number(item.count),
    }));
  }

  private async getTopEventsByRegistrations(startDate: Date, endDate: Date) {
    const result = await this.prisma.event.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: {
        id: true,
        title: true,
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: {
        registrations: { _count: 'desc' },
      },
      take: 10,
    });

    return result.map(event => ({
      id: event.id,
      title: event.title,
      registrationCount: event._count.registrations,
    }));
  }

  private async getEventsByMonth(startDate: Date, endDate: Date) {
    const result = await this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM events
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `;

    return result.map(item => ({
      month: item.month,
      count: Number(item.count),
    }));
  }

  private async getAverageRegistrationsPerEvent(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ avg: number }>>`
      SELECT AVG(registration_count) as avg
      FROM (
        SELECT COUNT(r.id) as registration_count
        FROM events e
        LEFT JOIN registrations r ON e.id = r.event_id
        WHERE e.created_at >= ${startDate} AND e.created_at <= ${endDate}
        GROUP BY e.id
      ) as event_registrations
    `;

    return Math.round(result[0]?.avg || 0);
  }

  private async getRegistrationsByEvent(startDate: Date, endDate: Date) {
    const result = await this.prisma.registration.groupBy({
      by: ['eventId'],
      where: { registeredAt: { gte: startDate, lte: endDate } },
      _count: { eventId: true },
      orderBy: { _count: { eventId: 'desc' } },
      take: 10,
    });

    const eventIds = result.map(item => item.eventId);
    const events = await this.prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, title: true },
    });

    const eventMap = new Map(events.map(event => [event.id, event.title]));

    return result.map(item => ({
      eventId: item.eventId,
      eventTitle: eventMap.get(item.eventId) || 'Unknown Event',
      count: item._count.eventId,
    }));
  }

  private async getRegistrationsByMonth(startDate: Date, endDate: Date) {
    const result = await this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT TO_CHAR(registered_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM registrations
      WHERE registered_at >= ${startDate} AND registered_at <= ${endDate}
      GROUP BY TO_CHAR(registered_at, 'YYYY-MM')
      ORDER BY month ASC
    `;

    return result.map(item => ({
      month: item.month,
      count: Number(item.count),
    }));
  }
}