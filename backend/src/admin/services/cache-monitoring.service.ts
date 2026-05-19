import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from '../../common/cache/cache.service';

export interface CachePerformanceReport {
  timestamp: Date;
  globalMetrics: {
    hitRate: number;
    totalRequests: number;
    averageResponseTime: number;
    cacheSize: number;
  };
  topPerformingKeys: Array<{
    key: string;
    hitRate: number;
    requests: number;
    avgResponseTime: number;
  }>;
  poorPerformingKeys: Array<{
    key: string;
    hitRate: number;
    requests: number;
    avgResponseTime: number;
  }>;
  recommendations: string[];
}

@Injectable()
export class CacheMonitoringService {
  private readonly logger = new Logger(CacheMonitoringService.name);
  private performanceHistory: CachePerformanceReport[] = [];
  private readonly maxHistorySize = 100;

  constructor(private cacheService: CacheService) {}

  /**
   * Generate comprehensive cache performance report
   */
  async generatePerformanceReport(): Promise<CachePerformanceReport> {
    const allMetrics = this.cacheService.getAllMetrics();
    const globalMetrics = this.cacheService.getMetrics()!;
    const cacheStats = await this.cacheService.getCacheStats();

    // Analyze key performance
    const keyMetrics = Array.from(allMetrics.entries())
      .filter(([key]) => key !== 'global')
      .map(([key, metrics]) => ({
        key,
        hitRate: metrics.hitRate,
        requests: metrics.totalRequests,
        avgResponseTime: metrics.averageResponseTime,
      }))
      .filter(item => item.requests > 0);

    // Sort by performance
    const topPerforming = keyMetrics
      .filter(item => item.hitRate >= 80)
      .sort((a, b) => b.hitRate - a.hitRate)
      .slice(0, 10);

    const poorPerforming = keyMetrics
      .filter(item => item.hitRate < 50 || item.avgResponseTime > 100)
      .sort((a, b) => a.hitRate - b.hitRate)
      .slice(0, 10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      globalMetrics,
      topPerforming,
      poorPerforming
    );

    const report: CachePerformanceReport = {
      timestamp: new Date(),
      globalMetrics: {
        hitRate: globalMetrics.hitRate,
        totalRequests: globalMetrics.totalRequests,
        averageResponseTime: globalMetrics.averageResponseTime,
        cacheSize: cacheStats.totalKeys,
      },
      topPerformingKeys: topPerforming,
      poorPerformingKeys: poorPerforming,
      recommendations,
    };

    // Store in history
    this.performanceHistory.push(report);
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }

    return report;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    globalMetrics: any,
    topPerforming: any[],
    poorPerforming: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Global hit rate recommendations
    if (globalMetrics.hitRate < 70) {
      recommendations.push(
        'Overall cache hit rate is below 70%. Consider increasing TTL for frequently accessed data.'
      );
    }

    // Response time recommendations
    if (globalMetrics.averageResponseTime > 50) {
      recommendations.push(
        'Average cache response time is high. Consider optimizing cache storage or reducing data size.'
      );
    }

    // Poor performing keys
    if (poorPerforming.length > 0) {
      recommendations.push(
        `${poorPerforming.length} cache keys have poor performance. Consider reviewing their usage patterns.`
      );
    }

    // Cache warming recommendations
    if (topPerforming.length > 5) {
      recommendations.push(
        'Consider implementing cache warming for high-performing keys to maintain availability.'
      );
    }

    // Memory usage recommendations
    if (globalMetrics.totalRequests > 10000) {
      recommendations.push(
        'High cache usage detected. Monitor memory consumption and consider implementing cache eviction policies.'
      );
    }

    return recommendations;
  }

  /**
   * Get cache performance trends
   */
  getPerformanceTrends(hours: number = 24): {
    hitRateTrend: number[];
    responseTimeTrend: number[];
    requestsTrend: number[];
    timestamps: Date[];
  } {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentReports = this.performanceHistory
      .filter(report => report.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      hitRateTrend: recentReports.map(r => r.globalMetrics.hitRate),
      responseTimeTrend: recentReports.map(r => r.globalMetrics.averageResponseTime),
      requestsTrend: recentReports.map(r => r.globalMetrics.totalRequests),
      timestamps: recentReports.map(r => r.timestamp),
    };
  }

  /**
   * Get cache health status
   */
  async getCacheHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: any;
  }> {
    const health = await this.cacheService.healthCheck();
    const report = await this.generatePerformanceReport();
    
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check connectivity
    if (!health.details.connectivity) {
      issues.push('Cache connectivity issues detected');
      status = 'critical';
    }

    // Check hit rate
    if (report.globalMetrics.hitRate < 50) {
      issues.push('Cache hit rate is critically low');
      status = status === 'critical' ? 'critical' : 'warning';
    } else if (report.globalMetrics.hitRate < 70) {
      issues.push('Cache hit rate could be improved');
      status = status === 'critical' ? 'critical' : 'warning';
    }

    // Check response time
    if (report.globalMetrics.averageResponseTime > 100) {
      issues.push('Cache response time is high');
      status = status === 'critical' ? 'critical' : 'warning';
    }

    // Check poor performing keys
    if (report.poorPerformingKeys.length > 5) {
      issues.push(`${report.poorPerformingKeys.length} cache keys performing poorly`);
      status = status === 'critical' ? 'critical' : 'warning';
    }

    return {
      status,
      issues,
      metrics: {
        ...report.globalMetrics,
        connectivity: health.details.connectivity,
      },
    };
  }

  /**
   * Scheduled performance monitoring
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledMonitoring(): Promise<void> {
    try {
      const report = await this.generatePerformanceReport();
      
      // Log warnings for poor performance
      if (report.globalMetrics.hitRate < 70) {
        this.logger.warn(`Cache hit rate is low: ${report.globalMetrics.hitRate.toFixed(2)}%`);
      }
      
      if (report.globalMetrics.averageResponseTime > 50) {
        this.logger.warn(`Cache response time is high: ${report.globalMetrics.averageResponseTime.toFixed(2)}ms`);
      }
      
      if (report.poorPerformingKeys.length > 0) {
        this.logger.warn(`${report.poorPerformingKeys.length} cache keys performing poorly`);
      }
      
      this.logger.debug(`Cache monitoring completed. Hit rate: ${report.globalMetrics.hitRate.toFixed(2)}%`);
    } catch (error) {
      this.logger.error('Cache monitoring failed:', error);
    }
  }

  /**
   * Get detailed cache statistics for admin dashboard
   */
  async getDetailedStats(): Promise<{
    overview: any;
    performance: CachePerformanceReport;
    trends: any;
    health: any;
  }> {
    const [overview, performance, health] = await Promise.all([
      this.cacheService.getCacheStats(),
      this.generatePerformanceReport(),
      this.getCacheHealthStatus(),
    ]);

    const trends = this.getPerformanceTrends(24);

    return {
      overview,
      performance,
      trends,
      health,
    };
  }

  /**
   * Reset performance history
   */
  resetHistory(): void {
    this.performanceHistory = [];
    this.logger.debug('Cache performance history reset');
  }

  /**
   * Export performance data
   */
  exportPerformanceData(): {
    exportedAt: Date;
    totalReports: number;
    history: CachePerformanceReport[];
  } {
    return {
      exportedAt: new Date(),
      totalReports: this.performanceHistory.length,
      history: [...this.performanceHistory],
    };
  }
}