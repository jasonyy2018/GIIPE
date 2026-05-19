'use client';

import {
  RealTimePerformanceData,
  ErrorEvent,
  UserExperienceMetrics,
  PerformanceAlert,
  PerformanceDashboardConfig,
  PerformanceTrend,
  SystemResourceUsage,
  PerformanceInsight,
  PerformanceComparison
} from '@/types/performanceMonitoring';

// Real-time performance monitoring service
class RealTimePerformanceService {
  private config: PerformanceDashboardConfig;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private performanceData: RealTimePerformanceData[] = [];
  private errorEvents: ErrorEvent[] = [];
  private userExperienceMetrics: UserExperienceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private subscribers: Set<(data: RealTimePerformanceData) => void> = new Set();
  private alertSubscribers: Set<(alert: PerformanceAlert) => void> = new Set();
  private sessionId: string;

  constructor() {
    this.config = this.getDefaultConfig();
    this.sessionId = this.generateSessionId();
    this.initializeErrorTracking();
    this.initializeUserExperienceTracking();
  }

  // Start real-time monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectRealTimeMetrics();
    }, this.config.refreshInterval);

    console.log('Real-time performance monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Real-time performance monitoring stopped');
  }

  // Get current performance data
  getCurrentPerformanceData(): RealTimePerformanceData | null {
    return this.performanceData.length > 0 
      ? this.performanceData[this.performanceData.length - 1] 
      : null;
  }

  // Get performance history
  getPerformanceHistory(hours: number = 1): RealTimePerformanceData[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.performanceData.filter(data => data.timestamp >= cutoff);
  }

  // Get error events
  getErrorEvents(hours: number = 24): ErrorEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.errorEvents.filter(error => error.timestamp >= cutoff);
  }

  // Get user experience metrics
  getUserExperienceMetrics(userId?: string, hours: number = 24): UserExperienceMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    let metrics = this.userExperienceMetrics.filter(metric => metric.timestamp >= cutoff);
    
    if (userId) {
      metrics = metrics.filter(metric => metric.userId === userId);
    }
    
    return metrics;
  }

  // Get active alerts
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.autoResolved && !alert.resolvedAt);
  }

  // Get all alerts
  getAllAlerts(hours: number = 24): PerformanceAlert[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp >= cutoff);
  }

  // Track custom error
  trackError(
    type: ErrorEvent['type'],
    message: string,
    metadata: Partial<ErrorEvent['metadata']> = {},
    userId?: string
  ): void {
    const error: ErrorEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type,
      message,
      userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      metadata: {
        severity: 'medium',
        ...metadata
      }
    };

    this.errorEvents.push(error);
    this.checkErrorRateThreshold();
    this.trimErrorEvents();
  }

  // Record user experience metrics
  recordUserExperience(userId: string, metrics: Partial<UserExperienceMetrics['metrics']>): void {
    const deviceInfo = this.getDeviceInfo();
    const userActions = this.getUserActions();
    const satisfactionScore = this.calculateSatisfactionScore(metrics);

    const uxMetrics: UserExperienceMetrics = {
      userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      metrics: {
        pageLoadTime: 0,
        timeToInteractive: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0,
        totalBlockingTime: 0,
        interactionToNextPaint: 0,
        ...metrics
      },
      deviceInfo,
      userActions,
      satisfactionScore
    };

    this.userExperienceMetrics.push(uxMetrics);
    this.trimUserExperienceMetrics();
  }

  // Generate performance trends
  generatePerformanceTrends(
    metric: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): PerformanceTrend {
    const data = this.getHistoricalData(metric, period);
    const trend = this.calculateTrend(data);
    const changePercentage = this.calculateChangePercentage(data);
    const prediction = this.generatePrediction(data);

    return {
      metric,
      period,
      dataPoints: data,
      trend,
      changePercentage,
      prediction
    };
  }

  // Get system resource usage
  getSystemResourceUsage(): SystemResourceUsage {
    const memoryInfo = this.getMemoryInfo();
    const networkInfo = this.getNetworkInfo();

    return {
      timestamp: new Date(),
      cpu: {
        usage: this.getCPUUsage(),
        cores: navigator.hardwareConcurrency || 1
      },
      memory: {
        used: memoryInfo.used,
        total: memoryInfo.total,
        percentage: (memoryInfo.used / memoryInfo.total) * 100,
        heapUsed: memoryInfo.heapUsed,
        heapTotal: memoryInfo.heapTotal
      },
      network: {
        latency: networkInfo.latency,
        bandwidth: networkInfo.bandwidth,
        packetsLost: 0,
        connectionType: networkInfo.connectionType
      },
      storage: {
        used: this.getStorageUsage(),
        available: this.getAvailableStorage(),
        cacheSize: this.getCacheSize()
      }
    };
  }

  // Generate performance insights
  generatePerformanceInsights(): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];
    const currentData = this.getCurrentPerformanceData();
    const history = this.getPerformanceHistory(24);

    if (!currentData || history.length === 0) return insights;

    // Memory usage insight
    if (currentData.metrics.memoryUsage > this.config.alertThresholds.memoryUsage.warning) {
      insights.push({
        id: this.generateId(),
        type: 'warning',
        title: 'High Memory Usage Detected',
        description: `Memory usage is at ${currentData.metrics.memoryUsage.toFixed(1)}MB, which exceeds the warning threshold.`,
        impact: currentData.metrics.memoryUsage > this.config.alertThresholds.memoryUsage.critical ? 'high' : 'medium',
        category: 'memory',
        data: { memoryUsage: currentData.metrics.memoryUsage },
        actionable: true,
        actions: [
          {
            title: 'Clear Browser Cache',
            description: 'Clear browser cache to free up memory',
            difficulty: 'easy',
            estimatedImpact: 'Medium reduction in memory usage'
          },
          {
            title: 'Optimize Component Renders',
            description: 'Review and optimize component rendering patterns',
            difficulty: 'medium',
            estimatedImpact: 'Significant memory usage reduction'
          }
        ],
        timestamp: new Date()
      });
    }

    // FPS insight
    if (currentData.metrics.fps < this.config.alertThresholds.fps.warning) {
      insights.push({
        id: this.generateId(),
        type: 'optimization',
        title: 'Low Frame Rate Detected',
        description: `Current FPS is ${currentData.metrics.fps}, which may impact user experience.`,
        impact: 'high',
        category: 'rendering',
        data: { fps: currentData.metrics.fps },
        actionable: true,
        actions: [
          {
            title: 'Reduce Animation Complexity',
            description: 'Simplify or optimize animations to improve frame rate',
            difficulty: 'medium',
            estimatedImpact: 'Improved frame rate and smoother interactions'
          }
        ],
        timestamp: new Date()
      });
    }

    // Error rate insight
    if (currentData.errorRate > this.config.alertThresholds.errorRate.warning) {
      insights.push({
        id: this.generateId(),
        type: 'warning',
        title: 'Elevated Error Rate',
        description: `Error rate is ${(currentData.errorRate * 100).toFixed(1)}%, which is above normal levels.`,
        impact: 'high',
        category: 'interaction',
        data: { errorRate: currentData.errorRate },
        actionable: true,
        timestamp: new Date()
      });
    }

    return insights;
  }

  // Compare performance periods
  comparePerformance(
    baselinePeriod: { start: Date; end: Date },
    currentPeriod: { start: Date; end: Date }
  ): PerformanceComparison {
    const baselineData = this.performanceData.filter(
      d => d.timestamp >= baselinePeriod.start && d.timestamp <= baselinePeriod.end
    );
    const currentData = this.performanceData.filter(
      d => d.timestamp >= currentPeriod.start && d.timestamp <= currentPeriod.end
    );

    const baselineMetrics = this.aggregateMetrics(baselineData);
    const currentMetrics = this.aggregateMetrics(currentData);

    const changes = Object.keys(baselineMetrics).map(metric => {
      const baselineValue = baselineMetrics[metric];
      const currentValue = currentMetrics[metric];
      const change = currentValue - baselineValue;
      const changePercentage = baselineValue !== 0 ? (change / baselineValue) * 100 : 0;

      return {
        metric,
        change,
        changePercentage,
        trend: (change > 0 ? 'improved' : change < 0 ? 'degraded' : 'unchanged') as 'improved' | 'degraded' | 'unchanged',
        significance: (Math.abs(changePercentage) > 20 ? 'major' : Math.abs(changePercentage) > 5 ? 'minor' : 'negligible') as 'major' | 'minor' | 'negligible'
      };
    });

    const overallScore = this.calculateOverallScore(changes);
    const recommendation = this.generateComparisonRecommendation(changes);

    return {
      baseline: {
        period: `${baselinePeriod.start.toISOString()} - ${baselinePeriod.end.toISOString()}`,
        metrics: baselineMetrics
      },
      current: {
        period: `${currentPeriod.start.toISOString()} - ${currentPeriod.end.toISOString()}`,
        metrics: currentMetrics
      },
      changes,
      overallScore,
      recommendation
    };
  }

  // Subscribe to real-time updates
  subscribe(callback: (data: RealTimePerformanceData) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Subscribe to alerts
  subscribeToAlerts(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertSubscribers.add(callback);
    return () => this.alertSubscribers.delete(callback);
  }

  // Update configuration
  updateConfig(newConfig: Partial<PerformanceDashboardConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  // Get configuration
  getConfig(): PerformanceDashboardConfig {
    return { ...this.config };
  }

  // Export performance data
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      performanceData: this.performanceData,
      errorEvents: this.errorEvents,
      userExperienceMetrics: this.userExperienceMetrics,
      alerts: this.alerts,
      config: this.config,
      exportTimestamp: new Date().toISOString()
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  // Private methods
  private collectRealTimeMetrics(): void {
    const metrics = {
      fps: this.getCurrentFPS(),
      memoryUsage: this.getCurrentMemoryUsage(),
      cpuUsage: this.getCPUUsage(),
      networkLatency: this.getNetworkLatency(),
      renderTime: this.getAverageRenderTime(),
      interactionDelay: this.getAverageInteractionDelay()
    };

    const errorRate = this.calculateCurrentErrorRate();
    const systemHealth = this.calculateSystemHealth(metrics, errorRate);

    const data: RealTimePerformanceData = {
      timestamp: new Date(),
      metrics,
      activeUsers: this.getActiveUsersCount(),
      errorRate,
      systemHealth
    };

    this.performanceData.push(data);
    this.checkPerformanceThresholds(data);
    this.trimPerformanceData();
    this.notifySubscribers(data);
  }

  private initializeErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError('javascript', event.message, {
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('javascript', event.reason?.message || 'Unhandled promise rejection', {
        severity: 'high',
        context: {
          reason: event.reason
        }
      });
    });

    // Network error tracking
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.trackError('network', `HTTP ${response.status}: ${response.statusText}`, {
            severity: response.status >= 500 ? 'high' : 'medium',
            context: {
              url: args[0]?.toString(),
              status: response.status,
              statusText: response.statusText
            }
          });
        }
        return response;
      } catch (error) {
        this.trackError('network', (error as Error).message, {
          severity: 'high',
          context: {
            url: args[0]?.toString(),
            error: error
          }
        });
        throw error;
      }
    };
  }

  private initializeUserExperienceTracking(): void {
    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordUserExperience('current-user', {
          largestContentfulPaint: lastEntry.startTime
        });
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // FID
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          this.recordUserExperience('current-user', {
            firstInputDelay: entry.processingStart - entry.startTime
          });
        });
      }).observe({ entryTypes: ['first-input'] });

      // CLS
      new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordUserExperience('current-user', {
          cumulativeLayoutShift: clsValue
        });
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }

  private getCurrentFPS(): number {
    // This would be enhanced with actual FPS measurement
    return Math.floor(Math.random() * 20) + 40; // Simulated 40-60 FPS
  }

  private getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return Math.random() * 100; // Fallback simulation
  }

  private getCPUUsage(): number {
    // This would be enhanced with actual CPU measurement
    return Math.random() * 100;
  }

  private getNetworkLatency(): number {
    // This would be enhanced with actual network measurement
    return Math.floor(Math.random() * 100) + 50;
  }

  private getAverageRenderTime(): number {
    // This would be enhanced with actual render time measurement
    return Math.random() * 20;
  }

  private getAverageInteractionDelay(): number {
    // This would be enhanced with actual interaction delay measurement
    return Math.random() * 100;
  }

  private calculateCurrentErrorRate(): number {
    const recentErrors = this.getErrorEvents(1); // Last hour
    const totalEvents = Math.max(1, recentErrors.length + 100); // Assume some baseline events
    return recentErrors.length / totalEvents;
  }

  private calculateSystemHealth(
    metrics: RealTimePerformanceData['metrics'],
    errorRate: number
  ): RealTimePerformanceData['systemHealth'] {
    const scores = [
      metrics.fps >= 55 ? 1 : metrics.fps >= 30 ? 0.7 : 0.3,
      metrics.memoryUsage < 50 ? 1 : metrics.memoryUsage < 100 ? 0.7 : 0.3,
      errorRate < 0.01 ? 1 : errorRate < 0.05 ? 0.7 : 0.3,
      metrics.renderTime < 16 ? 1 : metrics.renderTime < 33 ? 0.7 : 0.3
    ];

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (averageScore >= 0.9) return 'excellent';
    if (averageScore >= 0.7) return 'good';
    if (averageScore >= 0.5) return 'warning';
    return 'critical';
  }

  private getActiveUsersCount(): number {
    // This would be enhanced with actual user tracking
    return Math.floor(Math.random() * 50) + 10;
  }

  private checkPerformanceThresholds(data: RealTimePerformanceData): void {
    const { metrics, errorRate } = data;
    const thresholds = this.config.alertThresholds;

    // Check FPS
    if (metrics.fps < thresholds.fps.critical) {
      this.createAlert('threshold_exceeded', 'critical', 'Critical FPS Drop', 
        `FPS dropped to ${metrics.fps}, below critical threshold of ${thresholds.fps.critical}`,
        'fps', metrics.fps, thresholds.fps.critical);
    } else if (metrics.fps < thresholds.fps.warning) {
      this.createAlert('threshold_exceeded', 'medium', 'Low FPS Warning',
        `FPS is ${metrics.fps}, below warning threshold of ${thresholds.fps.warning}`,
        'fps', metrics.fps, thresholds.fps.warning);
    }

    // Check memory usage
    if (metrics.memoryUsage > thresholds.memoryUsage.critical) {
      this.createAlert('threshold_exceeded', 'critical', 'Critical Memory Usage',
        `Memory usage is ${metrics.memoryUsage.toFixed(1)}MB, above critical threshold`,
        'memoryUsage', metrics.memoryUsage, thresholds.memoryUsage.critical);
    }

    // Check error rate
    if (errorRate > thresholds.errorRate.critical) {
      this.createAlert('error_spike', 'critical', 'Critical Error Rate',
        `Error rate is ${(errorRate * 100).toFixed(1)}%, above critical threshold`,
        'errorRate', errorRate, thresholds.errorRate.critical);
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    title: string,
    description: string,
    metric: string,
    currentValue: number,
    thresholdValue: number
  ): void {
    const alert: PerformanceAlert = {
      id: this.generateId(),
      timestamp: new Date(),
      type,
      severity,
      title,
      description,
      affectedMetric: metric,
      currentValue,
      thresholdValue,
      recommendedActions: this.getRecommendedActions(metric, severity),
      autoResolved: false
    };

    this.alerts.push(alert);
    this.notifyAlertSubscribers(alert);
  }

  private getRecommendedActions(metric: string, severity: string): string[] {
    const actions: Record<string, string[]> = {
      fps: [
        'Reduce animation complexity',
        'Optimize rendering performance',
        'Check for memory leaks'
      ],
      memoryUsage: [
        'Clear browser cache',
        'Optimize component lifecycle',
        'Review memory-intensive operations'
      ],
      errorRate: [
        'Check recent code changes',
        'Review error logs',
        'Implement additional error handling'
      ]
    };

    return actions[metric] || ['Monitor the situation', 'Contact support if issues persist'];
  }

  private checkErrorRateThreshold(): void {
    const errorRate = this.calculateCurrentErrorRate();
    if (errorRate > this.config.alertThresholds.errorRate.warning) {
      this.createAlert('error_spike', 'medium', 'Elevated Error Rate',
        `Error rate increased to ${(errorRate * 100).toFixed(1)}%`,
        'errorRate', errorRate, this.config.alertThresholds.errorRate.warning);
    }
  }

  private getDeviceInfo(): UserExperienceMetrics['deviceInfo'] {
    const ua = navigator.userAgent;
    return {
      type: /Mobile|Android|iPhone|iPad/.test(ua) ? 'mobile' : 'desktop',
      os: this.getOS(ua),
      browser: this.getBrowser(ua),
      screenResolution: `${screen.width}x${screen.height}`,
      connectionType: this.getConnectionType(),
      memorySize: (navigator as any).deviceMemory
    };
  }

  private getUserActions(): UserExperienceMetrics['userActions'] {
    // This would be enhanced with actual user action tracking
    return {
      clicks: Math.floor(Math.random() * 50),
      scrolls: Math.floor(Math.random() * 100),
      keystrokes: Math.floor(Math.random() * 200),
      formSubmissions: Math.floor(Math.random() * 5),
      navigationEvents: Math.floor(Math.random() * 10)
    };
  }

  private calculateSatisfactionScore(metrics: Partial<UserExperienceMetrics['metrics']>): number {
    // Calculate satisfaction based on performance metrics
    let score = 100;
    
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
      score -= 20;
    }
    if (metrics.firstInputDelay && metrics.firstInputDelay > 100) {
      score -= 15;
    }
    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }

  private getMemoryInfo(): { used: number; total: number; heapUsed?: number; heapTotal?: number } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / 1024 / 1024,
        total: memory.totalJSHeapSize / 1024 / 1024,
        heapUsed: memory.usedJSHeapSize / 1024 / 1024,
        heapTotal: memory.totalJSHeapSize / 1024 / 1024
      };
    }
    return { used: 50, total: 100 };
  }

  private getNetworkInfo(): { latency: number; bandwidth: number; connectionType: string } {
    const connection = (navigator as any).connection;
    return {
      latency: Math.random() * 100 + 50,
      bandwidth: connection?.downlink || 10,
      connectionType: connection?.effectiveType || 'unknown'
    };
  }

  private getStorageUsage(): number {
    // This would be enhanced with actual storage measurement
    return Math.random() * 100;
  }

  private getAvailableStorage(): number {
    // This would be enhanced with actual storage measurement
    return 1000 - this.getStorageUsage();
  }

  private getCacheSize(): number {
    // This would be enhanced with actual cache measurement
    return Math.random() * 50;
  }

  private getHistoricalData(metric: string, period: string): { timestamp: Date; value: number }[] {
    // This would be enhanced with actual historical data retrieval
    const data: { timestamp: Date; value: number }[] = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      data.push({
        timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
        value: Math.random() * 100
      });
    }
    
    return data.reverse();
  }

  private calculateTrend(data: { timestamp: Date; value: number }[]): 'improving' | 'degrading' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const change = (last - first) / first;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'degrading';
    return 'stable';
  }

  private calculateChangePercentage(data: { timestamp: Date; value: number }[]): number {
    if (data.length < 2) return 0;
    
    const first = data[0].value;
    const last = data[data.length - 1].value;
    
    return ((last - first) / first) * 100;
  }

  private generatePrediction(data: { timestamp: Date; value: number }[]): { timestamp: Date; value: number }[] {
    // Simple linear prediction - would be enhanced with more sophisticated algorithms
    if (data.length < 2) return [];
    
    const trend = this.calculateChangePercentage(data) / 100;
    const lastValue = data[data.length - 1].value;
    const lastTime = data[data.length - 1].timestamp.getTime();
    
    const predictions: { timestamp: Date; value: number }[] = [];
    for (let i = 1; i <= 6; i++) {
      predictions.push({
        timestamp: new Date(lastTime + i * 60 * 60 * 1000),
        value: lastValue * (1 + trend * i)
      });
    }
    
    return predictions;
  }

  private aggregateMetrics(data: RealTimePerformanceData[]): Record<string, number> {
    if (data.length === 0) return {};
    
    const sums = data.reduce((acc, item) => {
      Object.entries(item.metrics).forEach(([key, value]) => {
        acc[key] = (acc[key] || 0) + value;
      });
      return acc;
    }, {} as Record<string, number>);
    
    Object.keys(sums).forEach(key => {
      sums[key] = sums[key] / data.length;
    });
    
    return sums;
  }

  private calculateOverallScore(changes: any[]): number {
    const scores = changes.map(change => {
      if (change.trend === 'improved') return 1;
      if (change.trend === 'degraded') return -1;
      return 0;
    });
    
    if (scores.length === 0) return 50;
    return (scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length) * 50 + 50;
  }

  private generateComparisonRecommendation(changes: any[]): string {
    const majorImprovements = changes.filter(c => c.trend === 'improved' && c.significance === 'major');
    const majorDegradations = changes.filter(c => c.trend === 'degraded' && c.significance === 'major');
    
    if (majorDegradations.length > 0) {
      return `Performance has degraded in ${majorDegradations.length} key areas. Focus on optimizing ${majorDegradations[0].metric}.`;
    }
    
    if (majorImprovements.length > 0) {
      return `Performance has improved in ${majorImprovements.length} areas. Continue current optimization efforts.`;
    }
    
    return 'Performance is stable. Monitor for any emerging trends.';
  }

  private getOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private getBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || 'unknown';
  }

  private trimPerformanceData(): void {
    const maxEntries = Math.floor(this.config.dataRetentionHours * 60 / (this.config.refreshInterval / 1000 / 60));
    if (this.performanceData.length > maxEntries) {
      this.performanceData = this.performanceData.slice(-maxEntries);
    }
  }

  private trimErrorEvents(): void {
    const cutoff = new Date(Date.now() - this.config.dataRetentionHours * 60 * 60 * 1000);
    this.errorEvents = this.errorEvents.filter(error => error.timestamp >= cutoff);
  }

  private trimUserExperienceMetrics(): void {
    const cutoff = new Date(Date.now() - this.config.dataRetentionHours * 60 * 60 * 1000);
    this.userExperienceMetrics = this.userExperienceMetrics.filter(metric => metric.timestamp >= cutoff);
  }

  private notifySubscribers(data: RealTimePerformanceData): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Performance subscriber error:', error);
      }
    });
  }

  private notifyAlertSubscribers(alert: PerformanceAlert): void {
    this.alertSubscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert subscriber error:', error);
      }
    });
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - would be enhanced for complex data structures
    return JSON.stringify(data);
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private getDefaultConfig(): PerformanceDashboardConfig {
    return {
      refreshInterval: 5000, // 5 seconds
      alertThresholds: {
        fps: { warning: 45, critical: 30 },
        memoryUsage: { warning: 100, critical: 200 },
        errorRate: { warning: 0.02, critical: 0.05 },
        responseTime: { warning: 200, critical: 500 },
        renderTime: { warning: 16, critical: 33 }
      },
      enabledMetrics: ['fps', 'memoryUsage', 'errorRate', 'responseTime', 'renderTime'],
      enableRealTimeAlerts: true,
      enableErrorTracking: true,
      enableUserExperienceTracking: true,
      dataRetentionHours: 24
    };
  }
}

export const realTimePerformanceService = new RealTimePerformanceService();