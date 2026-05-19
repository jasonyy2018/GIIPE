import { Injectable, Logger } from '@nestjs/common';
import { performance } from 'perf_hooks';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  totalRequests: number;
  averageResponseTime: number;
  slowestRequests: PerformanceMetric[];
  fastestRequests: PerformanceMetric[];
  errorRate: number;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics
  private readonly slowQueryThreshold = 1000; // 1 second

  /**
   * Start performance measurement
   */
  startMeasurement(name: string): () => PerformanceMetric {
    const startTime = performance.now();
    const startTimestamp = new Date();

    return (metadata?: Record<string, any>): PerformanceMetric => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        name,
        duration,
        timestamp: startTimestamp,
        metadata,
      };

      this.recordMetric(metric);
      return metric;
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the last N metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (metric.duration > this.slowQueryThreshold) {
      this.logger.warn(
        `Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`,
        metric.metadata
      );
    }

    // Log very fast operations for debugging
    if (metric.duration < 1) {
      this.logger.debug(
        `Fast operation: ${metric.name} took ${metric.duration.toFixed(2)}ms`
      );
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(timeWindow?: number): PerformanceReport {
    const now = new Date();
    const windowStart = timeWindow 
      ? new Date(now.getTime() - timeWindow * 60 * 1000)
      : new Date(0);

    const relevantMetrics = this.metrics.filter(
      metric => metric.timestamp >= windowStart
    );

    if (relevantMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowestRequests: [],
        fastestRequests: [],
        errorRate: 0,
      };
    }

    const totalDuration = relevantMetrics.reduce(
      (sum, metric) => sum + metric.duration, 
      0
    );

    const sortedByDuration = [...relevantMetrics].sort(
      (a, b) => b.duration - a.duration
    );

    return {
      totalRequests: relevantMetrics.length,
      averageResponseTime: totalDuration / relevantMetrics.length,
      slowestRequests: sortedByDuration.slice(0, 10),
      fastestRequests: sortedByDuration.slice(-10).reverse(),
      errorRate: 0, // Would need error tracking
    };
  }

  /**
   * Get metrics by operation name
   */
  getMetricsByName(name: string, limit: number = 100): PerformanceMetric[] {
    return this.metrics
      .filter(metric => metric.name === name)
      .slice(-limit);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.logger.log('Performance metrics cleared');
  }

  /**
   * Get system performance statistics
   */
  getSystemStats(): Record<string, any> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }

  /**
   * Monitor async operation
   */
  async monitor<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const endMeasurement = this.startMeasurement(name);

    try {
      const result = await operation();
      endMeasurement();
      return result;
    } catch (error) {
      endMeasurement();
      throw error;
    }
  }

  /**
   * Monitor sync operation
   */
  monitorSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    const endMeasurement = this.startMeasurement(name);

    try {
      const result = operation();
      endMeasurement();
      return result;
    } catch (error) {
      endMeasurement();
      throw error;
    }
  }
}