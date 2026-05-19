import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EnhancedAnalyticsQueryDto,
  DrillDownQueryDto,
  AnalyticsMetric,
  ChartDataPoint,
  ComparativeDataPoint,
  DrillDownData,
  AnalyticsInsight,
  DateRangePreset,
  AnalyticsMetricType,
  AnalyticsDashboardConfig,
  CreateDashboardConfigDto,
  UpdateDashboardConfigDto
} from '../dto/enhanced-analytics.dto';

@Injectable()
export class EnhancedAnalyticsService {
  private readonly logger = new Logger(EnhancedAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get enhanced analytics metrics with trend analysis
   */
  async getEnhancedMetrics(query: EnhancedAnalyticsQueryDto): Promise<AnalyticsMetric[]> {
    const { startDate, endDate } = this.getDateRange(query);
    const previousPeriodStart = new Date(startDate);
    const previousPeriodEnd = new Date(endDate);
    const periodDiff = endDate.getTime() - startDate.getTime();
    previousPeriodStart.setTime(startDate.getTime() - periodDiff);
    previousPeriodEnd.setTime(endDate.getTime() - periodDiff);

    const metrics: AnalyticsMetric[] = [];
    const requestedMetrics = query.metrics || Object.values(AnalyticsMetricType);

    for (const metricType of requestedMetrics) {
      const metric = await this.calculateMetric(metricType, startDate, endDate, previousPeriodStart, previousPeriodEnd);
      if (metric) {
        metrics.push(metric);
      }
    }

    return metrics;
  }

  /**
   * Get chart data for interactive visualization
   */
  async getChartData(query: EnhancedAnalyticsQueryDto): Promise<ChartDataPoint[]> {
    const { startDate, endDate } = this.getDateRange(query);
    const metric = query.metrics?.[0] || AnalyticsMetricType.USERS;
    
    return this.generateTimeSeriesData(metric, startDate, endDate, query.groupBy || 'day');
  }

  /**
   * Get comparative analytics data
   */
  async getComparativeData(query: EnhancedAnalyticsQueryDto): Promise<ComparativeDataPoint[]> {
    const { startDate, endDate } = this.getDateRange(query);
    const previousPeriodStart = new Date(startDate);
    const previousPeriodEnd = new Date(endDate);
    const periodDiff = endDate.getTime() - startDate.getTime();
    previousPeriodStart.setTime(startDate.getTime() - periodDiff);
    previousPeriodEnd.setTime(endDate.getTime() - periodDiff);

    const metric = query.metrics?.[0] || AnalyticsMetricType.USERS;
    const groupBy = query.groupBy || 'day';

    const [currentData, previousData] = await Promise.all([
      this.generateTimeSeriesData(metric, startDate, endDate, groupBy),
      this.generateTimeSeriesData(metric, previousPeriodStart, previousPeriodEnd, groupBy)
    ]);

    // Combine current and previous data
    return currentData.map((current, index) => ({
      date: current.date,
      current: current.value,
      previous: previousData[index]?.value || 0,
      category: current.category,
      metadata: {
        ...current.metadata,
        previousMetadata: previousData[index]?.metadata
      }
    }));
  }

  /**
   * Get drill-down data for detailed analysis
   */
  async getDrillDownData(query: DrillDownQueryDto): Promise<DrillDownData> {
    const level = query.level || 1;
    const date = new Date(query.date);
    
    let data: ChartDataPoint[] = [];
    let breadcrumb: string[] = ['Dashboard'];
    let totalRecords = 0;

    switch (level) {
      case 1:
        // Drill down by hour for the selected date
        data = await this.getHourlyData(date, query.metric);
        breadcrumb.push(date.toLocaleDateString());
        break;
      
      case 2:
        // Drill down by specific events or categories
        data = await this.getCategoryData(date, query.category, query.metric);
        breadcrumb.push(date.toLocaleDateString(), query.category || 'Category');
        break;
      
      default:
        // Return to daily view
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        data = await this.generateTimeSeriesData(
          query.metric as AnalyticsMetricType || AnalyticsMetricType.USERS,
          startDate,
          endDate,
          'day'
        );
        breadcrumb = ['Dashboard', date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })];
    }

    totalRecords = data.length;

    return {
      level,
      filters: {
        date: query.date,
        category: query.category,
        metric: query.metric
      },
      data,
      breadcrumb,
      totalRecords
    };
  }

  /**
   * Generate analytics insights and recommendations
   */
  async generateInsights(query: EnhancedAnalyticsQueryDto): Promise<AnalyticsInsight[]> {
    const { startDate, endDate } = this.getDateRange(query);
    const insights: AnalyticsInsight[] = [];

    // Analyze trends
    const metrics = await this.getEnhancedMetrics(query);
    
    for (const metric of metrics) {
      // Detect significant changes
      if (Math.abs(metric.trendPercentage) > 20) {
        insights.push({
          id: `trend_${metric.id}_${Date.now()}`,
          type: 'trend',
          title: `Significant ${metric.trend === 'up' ? 'increase' : 'decrease'} in ${metric.name}`,
          description: `${metric.name} has ${metric.trend === 'up' ? 'increased' : 'decreased'} by ${metric.trendPercentage.toFixed(1)}% compared to the previous period.`,
          severity: Math.abs(metric.trendPercentage) > 50 ? 'high' : 'medium',
          category: metric.category,
          data: { metric, trendPercentage: metric.trendPercentage },
          actionable: true,
          recommendations: this.generateRecommendations(metric),
          timestamp: new Date(),
          affectedMetrics: [metric.id]
        });
      }

      // Detect anomalies
      if (metric.trendPercentage > 100 || metric.trendPercentage < -50) {
        insights.push({
          id: `anomaly_${metric.id}_${Date.now()}`,
          type: 'anomaly',
          title: `Unusual pattern detected in ${metric.name}`,
          description: `${metric.name} shows an unusual pattern with ${metric.trendPercentage.toFixed(1)}% change, which may require investigation.`,
          severity: 'critical',
          category: metric.category,
          data: { metric, anomalyScore: Math.abs(metric.trendPercentage) },
          actionable: true,
          recommendations: [
            'Investigate potential data quality issues',
            'Check for external factors affecting this metric',
            'Review recent system changes or campaigns'
          ],
          timestamp: new Date(),
          affectedMetrics: [metric.id]
        });
      }
    }

    return insights;
  }

  /**
   * Dashboard configuration management
   */
  async getDashboardConfigs(userId: string): Promise<AnalyticsDashboardConfig[]> {
    // TODO: Implement analytics dashboard config when Prisma model is added
    // For now, return empty array
    return [];
    
    // const configs = await this.prisma.analyticsDashboardConfig.findMany({
    //   where: { userId },
    //   orderBy: [
    //     { isDefault: 'desc' },
    //     { updatedAt: 'desc' }
    //   ]
    // });

    // return configs.map(config => ({
    //   ...config,
    //   layout: config.layout as any,
    //   filters: config.filters as any
    // }));
  }

  async createDashboardConfig(userId: string, data: CreateDashboardConfigDto): Promise<AnalyticsDashboardConfig> {
    // TODO: Implement analytics dashboard config when Prisma model is added
    throw new Error('Analytics dashboard config not yet implemented - Prisma model missing');
    
    // If this is set as default, unset other defaults
    // if (data.isDefault) {
    //   await this.prisma.analyticsDashboardConfig.updateMany({
    //     where: { userId, isDefault: true },
    //     data: { isDefault: false }
    //   });
    // }

    // const config = await this.prisma.analyticsDashboardConfig.create({
    //   data: {
    //     userId,
    //     name: data.name,
    //     isDefault: data.isDefault || false,
    //     layout: data.layout,
    //     filters: data.filters,
    //     refreshInterval: data.refreshInterval || 30000
    //   }
    // });

    // return {
    //   ...config,
    //   layout: config.layout as any,
    //   filters: config.filters as any
    // };
  }

  async updateDashboardConfig(
    configId: string, 
    userId: string, 
    data: UpdateDashboardConfigDto
  ): Promise<AnalyticsDashboardConfig> {
    // TODO: Implement analytics dashboard config when Prisma model is added
    // For now, return a default config
    throw new Error('Analytics dashboard config not yet implemented - Prisma model missing');
    
    // If this is set as default, unset other defaults
    // if (data.isDefault) {
    //   await this.prisma.analyticsDashboardConfig.updateMany({
    //     where: { userId, isDefault: true, id: { not: configId } },
    //     data: { isDefault: false }
    //   });
    // }

    // const config = await this.prisma.analyticsDashboardConfig.update({
    //   where: { id: configId, userId },
    //   data: {
    //     ...data,
    //     updatedAt: new Date()
    //   }
    // });

    // return {
    //   ...config,
    //   layout: config.layout as any,
    //   filters: config.filters as any
    // };
  }

  async deleteDashboardConfig(configId: string, userId: string): Promise<void> {
    // TODO: Implement analytics dashboard config when Prisma model is added
    throw new Error('Analytics dashboard config not yet implemented - Prisma model missing');
    
    // await this.prisma.analyticsDashboardConfig.delete({
    //   where: { id: configId, userId }
    // });
  }

  // Private helper methods

  private async calculateMetric(
    metricType: AnalyticsMetricType,
    startDate: Date,
    endDate: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<AnalyticsMetric | null> {
    let current = 0;
    let previous = 0;
    let name = '';
    let unit = '';

    switch (metricType) {
      case AnalyticsMetricType.USERS:
        [current, previous] = await Promise.all([
          this.prisma.user.count({
            where: { createdAt: { gte: startDate, lte: endDate } }
          }),
          this.prisma.user.count({
            where: { createdAt: { gte: previousStart, lte: previousEnd } }
          })
        ]);
        name = 'New Users';
        unit = 'users';
        break;

      case AnalyticsMetricType.EVENTS:
        [current, previous] = await Promise.all([
          this.prisma.event.count({
            where: { createdAt: { gte: startDate, lte: endDate } }
          }),
          this.prisma.event.count({
            where: { createdAt: { gte: previousStart, lte: previousEnd } }
          })
        ]);
        name = 'Events Created';
        unit = 'events';
        break;

      case AnalyticsMetricType.REGISTRATIONS:
        [current, previous] = await Promise.all([
          this.prisma.registration.count({
            where: { registeredAt: { gte: startDate, lte: endDate } }
          }),
          this.prisma.registration.count({
            where: { registeredAt: { gte: previousStart, lte: previousEnd } }
          })
        ]);
        name = 'Registrations';
        unit = 'registrations';
        break;

      case AnalyticsMetricType.ENGAGEMENT:
        // Calculate engagement based on audit logs
        [current, previous] = await Promise.all([
          this.prisma.auditLog.count({
            where: { createdAt: { gte: startDate, lte: endDate } }
          }),
          this.prisma.auditLog.count({
            where: { createdAt: { gte: previousStart, lte: previousEnd } }
          })
        ]);
        name = 'User Actions';
        unit = 'actions';
        break;

      default:
        return null;
    }

    const trendPercentage = previous === 0 
      ? (current > 0 ? 100 : 0)
      : ((current - previous) / previous) * 100;

    const trend: 'up' | 'down' | 'stable' = 
      Math.abs(trendPercentage) < 1 ? 'stable' :
      trendPercentage > 0 ? 'up' : 'down';

    return {
      id: metricType,
      name,
      value: current,
      previousValue: previous,
      trend,
      trendPercentage: Math.abs(trendPercentage),
      category: this.getMetricCategory(metricType),
      unit
    };
  }

  private async generateTimeSeriesData(
    metricType: AnalyticsMetricType,
    startDate: Date,
    endDate: Date,
    groupBy: string
  ): Promise<ChartDataPoint[]> {
    const data: ChartDataPoint[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const periodStart = new Date(current);
      const periodEnd = new Date(current);

      switch (groupBy) {
        case 'hour':
          periodEnd.setHours(periodEnd.getHours() + 1);
          break;
        case 'day':
          periodEnd.setDate(periodEnd.getDate() + 1);
          break;
        case 'week':
          periodEnd.setDate(periodEnd.getDate() + 7);
          break;
        case 'month':
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          break;
      }

      const value = await this.getMetricValueForPeriod(metricType, periodStart, periodEnd);
      
      data.push({
        date: periodStart.toISOString().split('T')[0],
        value,
        category: metricType,
        metadata: {
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          groupBy
        }
      });

      current.setTime(periodEnd.getTime());
    }

    return data;
  }

  private async getMetricValueForPeriod(
    metricType: AnalyticsMetricType,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    switch (metricType) {
      case AnalyticsMetricType.USERS:
        return this.prisma.user.count({
          where: { createdAt: { gte: startDate, lt: endDate } }
        });

      case AnalyticsMetricType.EVENTS:
        return this.prisma.event.count({
          where: { createdAt: { gte: startDate, lt: endDate } }
        });

      case AnalyticsMetricType.REGISTRATIONS:
        return this.prisma.registration.count({
          where: { registeredAt: { gte: startDate, lt: endDate } }
        });

      case AnalyticsMetricType.ENGAGEMENT:
        return this.prisma.auditLog.count({
          where: { createdAt: { gte: startDate, lt: endDate } }
        });

      default:
        return 0;
    }
  }

  private async getHourlyData(date: Date, metric?: string): Promise<ChartDataPoint[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    
    return this.generateTimeSeriesData(
      metric as AnalyticsMetricType || AnalyticsMetricType.USERS,
      startOfDay,
      endOfDay,
      'hour'
    );
  }

  private async getCategoryData(date: Date, category?: string, metric?: string): Promise<ChartDataPoint[]> {
    // This would be implemented based on specific category requirements
    // For now, return sample data
    return [];
  }

  private getDateRange(query: EnhancedAnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (query.preset === DateRangePreset.CUSTOM && query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      switch (query.preset) {
        case DateRangePreset.TODAY:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case DateRangePreset.LAST_7_DAYS:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case DateRangePreset.LAST_30_DAYS:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case DateRangePreset.LAST_90_DAYS:
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return { startDate, endDate };
  }

  private getMetricCategory(metricType: AnalyticsMetricType): string {
    switch (metricType) {
      case AnalyticsMetricType.USERS:
        return 'User Growth';
      case AnalyticsMetricType.EVENTS:
        return 'Content';
      case AnalyticsMetricType.REGISTRATIONS:
        return 'Engagement';
      case AnalyticsMetricType.ENGAGEMENT:
        return 'Activity';
      default:
        return 'General';
    }
  }

  private generateRecommendations(metric: AnalyticsMetric): string[] {
    const recommendations: string[] = [];

    if (metric.trend === 'down' && metric.trendPercentage > 10) {
      switch (metric.id) {
        case AnalyticsMetricType.USERS:
          recommendations.push(
            'Review user acquisition channels',
            'Analyze user feedback and pain points',
            'Consider promotional campaigns'
          );
          break;
        case AnalyticsMetricType.REGISTRATIONS:
          recommendations.push(
            'Simplify registration process',
            'Improve event promotion',
            'Check for technical issues'
          );
          break;
        case AnalyticsMetricType.ENGAGEMENT:
          recommendations.push(
            'Enhance user experience',
            'Add more interactive features',
            'Improve content quality'
          );
          break;
      }
    } else if (metric.trend === 'up' && metric.trendPercentage > 20) {
      recommendations.push(
        'Analyze what drove this positive change',
        'Scale successful strategies',
        'Monitor sustainability of growth'
      );
    }

    return recommendations;
  }
}