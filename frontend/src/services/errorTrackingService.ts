'use client';

import { ErrorEvent, PerformanceAlert } from '@/types/performanceMonitoring';

// Error tracking and alerting service
export interface ErrorPattern {
  id: string;
  pattern: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  firstSeen: Date;
  lastSeen: Date;
  affectedUsers: string[];
  stackTrace?: string;
  context: Record<string, any>;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorRate: number;
  topErrors: { message: string; count: number; percentage: number }[];
  errorsByType: { type: string; count: number; percentage: number }[];
  errorsByBrowser: { browser: string; count: number; percentage: number }[];
  errorsByPage: { page: string; count: number; percentage: number }[];
  errorTrends: { timestamp: Date; count: number }[];
  criticalErrors: ErrorEvent[];
  resolvedErrors: number;
  newErrors: number;
}

export interface ErrorResolution {
  errorId: string;
  resolvedAt: Date;
  resolvedBy: string;
  resolution: string;
  preventionMeasures: string[];
  verified: boolean;
}

export interface ErrorNotification {
  id: string;
  errorId: string;
  type: 'email' | 'slack' | 'webhook' | 'dashboard';
  recipient: string;
  sentAt: Date;
  delivered: boolean;
  acknowledged: boolean;
}

class ErrorTrackingService {
  private errors: ErrorEvent[] = [];
  private patterns: ErrorPattern[] = [];
  private resolutions: ErrorResolution[] = [];
  private notifications: ErrorNotification[] = [];
  private alertSubscribers: Set<(alert: PerformanceAlert) => void> = new Set();
  private errorSubscribers: Set<(error: ErrorEvent) => void> = new Set();
  private isTracking = true;
  private config = {
    maxErrors: 1000,
    patternDetectionThreshold: 3,
    criticalErrorThreshold: 5, // errors per minute
    alertCooldown: 300000, // 5 minutes
    enableAutoResolution: true,
    enablePatternDetection: true
  };
  private lastAlertTime: Map<string, number> = new Map();

  constructor() {
    this.initializeErrorTracking();
  }

  // Track a new error
  trackError(error: Omit<ErrorEvent, 'id' | 'timestamp'>): string {
    if (!this.isTracking) return '';

    const errorEvent: ErrorEvent = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      ...error
    };

    this.errors.push(errorEvent);
    this.trimErrors();
    
    // Analyze error patterns
    if (this.config.enablePatternDetection) {
      this.detectErrorPatterns(errorEvent);
    }
    
    // Check for critical error conditions
    this.checkCriticalErrorConditions();
    
    // Notify subscribers
    this.notifyErrorSubscribers(errorEvent);
    
    // Auto-categorize error severity if not provided
    if (!errorEvent.metadata.severity) {
      errorEvent.metadata.severity = this.categorizeErrorSeverity(errorEvent);
    }

    return errorEvent.id;
  }

  // Get error analytics
  getErrorAnalytics(timeRange: { start: Date; end: Date }): ErrorAnalytics {
    const filteredErrors = this.errors.filter(
      error => error.timestamp >= timeRange.start && error.timestamp <= timeRange.end
    );

    const totalErrors = filteredErrors.length;
    const timeSpanHours = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60);
    const errorRate = totalErrors / Math.max(timeSpanHours, 1);

    // Top errors by message
    const errorCounts = filteredErrors.reduce((acc, error) => {
      acc[error.message] = (acc[error.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topErrors = Object.entries(errorCounts)
      .map(([message, count]) => ({
        message,
        count,
        percentage: (count / totalErrors) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Errors by type
    const errorsByType = this.groupErrorsByField(filteredErrors, 'type');
    
    // Errors by browser
    const errorsByBrowser = this.groupErrorsByUserAgent(filteredErrors);
    
    // Errors by page
    const errorsByPage = this.groupErrorsByField(filteredErrors, 'url').map(item => ({
      page: item.type,
      count: item.count,
      percentage: item.percentage
    }));
    
    // Error trends (hourly)
    const errorTrends = this.calculateErrorTrends(filteredErrors, timeRange);
    
    // Critical errors
    const criticalErrors = filteredErrors.filter(
      error => error.metadata.severity === 'critical'
    );

    // New vs resolved errors
    const existingPatterns = this.patterns.map(p => p.pattern);
    const newErrors = filteredErrors.filter(
      error => !existingPatterns.includes(this.generateErrorPattern(error))
    ).length;
    
    const resolvedErrors = this.resolutions.filter(
      res => res.resolvedAt >= timeRange.start && res.resolvedAt <= timeRange.end
    ).length;

    return {
      totalErrors,
      errorRate,
      topErrors,
      errorsByType,
      errorsByBrowser,
      errorsByPage,
      errorTrends,
      criticalErrors,
      resolvedErrors,
      newErrors
    };
  }

  // Get error patterns
  getErrorPatterns(): ErrorPattern[] {
    return [...this.patterns].sort((a, b) => b.frequency - a.frequency);
  }

  // Get specific error details
  getError(errorId: string): ErrorEvent | null {
    return this.errors.find(error => error.id === errorId) || null;
  }

  // Get errors by pattern
  getErrorsByPattern(patternId: string): ErrorEvent[] {
    const pattern = this.patterns.find(p => p.id === patternId);
    if (!pattern) return [];

    return this.errors.filter(error => 
      this.generateErrorPattern(error) === pattern.pattern
    );
  }

  // Resolve an error pattern
  resolveErrorPattern(
    patternId: string,
    resolvedBy: string,
    resolution: string,
    preventionMeasures: string[] = []
  ): void {
    const pattern = this.patterns.find(p => p.id === patternId);
    if (!pattern) return;

    const errorResolution: ErrorResolution = {
      errorId: patternId,
      resolvedAt: new Date(),
      resolvedBy,
      resolution,
      preventionMeasures,
      verified: false
    };

    this.resolutions.push(errorResolution);
    
    // Mark pattern as resolved (remove from active patterns)
    this.patterns = this.patterns.filter(p => p.id !== patternId);
  }

  // Mark error resolution as verified
  verifyResolution(resolutionId: string): void {
    const resolution = this.resolutions.find(r => r.errorId === resolutionId);
    if (resolution) {
      resolution.verified = true;
    }
  }

  // Get error resolutions
  getErrorResolutions(): ErrorResolution[] {
    return [...this.resolutions].sort((a, b) => b.resolvedAt.getTime() - a.resolvedAt.getTime());
  }

  // Search errors
  searchErrors(query: {
    message?: string;
    type?: ErrorEvent['type'];
    severity?: ErrorEvent['metadata']['severity'];
    userId?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): ErrorEvent[] {
    let results = [...this.errors];

    if (query.message) {
      results = results.filter(error => 
        error.message.toLowerCase().includes(query.message!.toLowerCase())
      );
    }

    if (query.type) {
      results = results.filter(error => error.type === query.type);
    }

    if (query.severity) {
      results = results.filter(error => error.metadata.severity === query.severity);
    }

    if (query.userId) {
      results = results.filter(error => error.userId === query.userId);
    }

    if (query.timeRange) {
      results = results.filter(error => 
        error.timestamp >= query.timeRange!.start && 
        error.timestamp <= query.timeRange!.end
      );
    }

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  // Generate error report
  generateErrorReport(timeRange: { start: Date; end: Date }): {
    summary: string;
    analytics: ErrorAnalytics;
    recommendations: string[];
    criticalIssues: string[];
  } {
    const analytics = this.getErrorAnalytics(timeRange);
    
    const summary = this.generateErrorSummary(analytics);
    const recommendations = this.generateErrorRecommendations(analytics);
    const criticalIssues = this.identifyCriticalIssues(analytics);

    return {
      summary,
      analytics,
      recommendations,
      criticalIssues
    };
  }

  // Subscribe to error events
  subscribeToErrors(callback: (error: ErrorEvent) => void): () => void {
    this.errorSubscribers.add(callback);
    return () => this.errorSubscribers.delete(callback);
  }

  // Subscribe to alerts
  subscribeToAlerts(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertSubscribers.add(callback);
    return () => this.alertSubscribers.delete(callback);
  }

  // Configure error tracking
  configure(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
  }

  // Enable/disable error tracking
  setTracking(enabled: boolean): void {
    this.isTracking = enabled;
  }

  // Export error data
  exportErrors(format: 'json' | 'csv' = 'json'): string {
    const data = {
      errors: this.errors,
      patterns: this.patterns,
      resolutions: this.resolutions,
      config: this.config,
      exportTimestamp: new Date().toISOString()
    };

    if (format === 'csv') {
      return this.convertErrorsToCSV(this.errors);
    }

    return JSON.stringify(data, null, 2);
  }

  // Clear error data
  clearErrors(): void {
    this.errors = [];
    this.patterns = [];
    this.resolutions = [];
    this.notifications = [];
  }

  // Private methods
  private initializeErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        metadata: {
          severity: 'high',
          context: {
            source: event.filename,
            line: event.lineno,
            column: event.colno
          }
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'javascript',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        metadata: {
          severity: 'high',
          context: {
            reason: event.reason,
            promise: 'unhandled_rejection'
          }
        }
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement;
        this.trackError({
          type: 'resource',
          message: `Failed to load resource: ${target.tagName}`,
          url: (target as any).src || (target as any).href,
          sessionId: this.getSessionId(),
          userAgent: navigator.userAgent,
          metadata: {
            severity: 'medium',
            context: {
              tagName: target.tagName,
              resourceType: target.tagName.toLowerCase()
            }
          }
        });
      }
    }, true);
  }

  private detectErrorPatterns(error: ErrorEvent): void {
    const pattern = this.generateErrorPattern(error);
    let existingPattern = this.patterns.find(p => p.pattern === pattern);

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastSeen = error.timestamp;
      if (error.userId && !existingPattern.affectedUsers.includes(error.userId)) {
        existingPattern.affectedUsers.push(error.userId);
      }
    } else {
      existingPattern = {
        id: this.generatePatternId(),
        pattern,
        frequency: 1,
        severity: error.metadata.severity || 'medium',
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        affectedUsers: error.userId ? [error.userId] : [],
        stackTrace: error.stack,
        context: error.metadata.context || {}
      };
      this.patterns.push(existingPattern);
    }

    // Check if pattern frequency exceeds threshold
    if (existingPattern.frequency >= this.config.patternDetectionThreshold) {
      this.createPatternAlert(existingPattern);
    }
  }

  private generateErrorPattern(error: ErrorEvent): string {
    // Create a pattern based on error message and type
    const normalizedMessage = error.message?.replace(/\d+/g, 'N') // Replace numbers with N?.replace(/['"]/g, '') // Remove quotes?.replace(/\s+/g, ' ') // Normalize whitespace?.trim();
    
    return `${error.type}:${normalizedMessage}`;
  }

  private checkCriticalErrorConditions(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentErrors = this.errors.filter(
      error => error.timestamp.getTime() > oneMinuteAgo
    );

    if (recentErrors.length >= this.config.criticalErrorThreshold) {
      this.createCriticalErrorAlert(recentErrors.length);
    }

    // Check for critical error types
    const criticalErrors = recentErrors.filter(
      error => error.metadata.severity === 'critical'
    );

    if (criticalErrors.length > 0) {
      criticalErrors.forEach(error => {
        this.createCriticalErrorAlert(1, error);
      });
    }
  }

  private createPatternAlert(pattern: ErrorPattern): void {
    const alertKey = `pattern-${pattern.id}`;
    const lastAlert = this.lastAlertTime.get(alertKey) || 0;
    const now = Date.now();

    if (now - lastAlert < this.config.alertCooldown) {
      return; // Still in cooldown period
    }

    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      type: 'error_spike',
      severity: pattern.severity === 'critical' ? 'critical' : 'medium',
      title: 'Error Pattern Detected',
      description: `Error pattern "${pattern.pattern}" has occurred ${pattern.frequency} times, affecting ${pattern.affectedUsers.length} users.`,
      affectedMetric: 'error_pattern',
      currentValue: pattern.frequency,
      thresholdValue: this.config.patternDetectionThreshold,
      affectedUsers: pattern.affectedUsers.length,
      recommendedActions: [
        'Investigate the root cause of this error pattern',
        'Review recent code changes that might have introduced this issue',
        'Consider implementing additional error handling for this scenario'
      ],
      autoResolved: false
    };

    this.notifyAlertSubscribers(alert);
    this.lastAlertTime.set(alertKey, now);
  }

  private createCriticalErrorAlert(errorCount: number, error?: ErrorEvent): void {
    const alertKey = error ? `critical-${error.id}` : 'critical-spike';
    const lastAlert = this.lastAlertTime.get(alertKey) || 0;
    const now = Date.now();

    if (now - lastAlert < this.config.alertCooldown) {
      return;
    }

    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      type: 'error_spike',
      severity: 'critical',
      title: error ? 'Critical Error Detected' : 'Critical Error Spike',
      description: error 
        ? `Critical error: ${error.message}`
        : `${errorCount} errors occurred in the last minute, exceeding the critical threshold.`,
      affectedMetric: 'error_rate',
      currentValue: errorCount,
      thresholdValue: this.config.criticalErrorThreshold,
      recommendedActions: [
        'Immediate investigation required',
        'Check system health and recent deployments',
        'Consider rolling back recent changes if necessary'
      ],
      autoResolved: false
    };

    this.notifyAlertSubscribers(alert);
    this.lastAlertTime.set(alertKey, now);
  }

  private categorizeErrorSeverity(error: ErrorEvent): ErrorEvent['metadata']['severity'] {
    // Auto-categorize based on error characteristics
    if (error.type === 'javascript' && error.message.includes('Cannot read property')) {
      return 'high';
    }
    
    if (error.type === 'network' && error.message.includes('500')) {
      return 'critical';
    }
    
    if (error.type === 'resource') {
      return 'medium';
    }
    
    return 'low';
  }

  private groupErrorsByField(
    errors: ErrorEvent[], 
    field: keyof ErrorEvent
  ): { type: string; count: number; percentage: number }[] {
    const counts = errors.reduce((acc, error) => {
      const value = String(error[field] || 'unknown');
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = errors.length;
    return Object.entries(counts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  private groupErrorsByUserAgent(errors: ErrorEvent[]): { browser: string; count: number; percentage: number }[] {
    const browserCounts = errors.reduce((acc, error) => {
      const browser = this.extractBrowser(error.userAgent);
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = errors.length;
    return Object.entries(browserCounts)
      .map(([browser, count]) => ({
        browser,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateErrorTrends(
    errors: ErrorEvent[], 
    timeRange: { start: Date; end: Date }
  ): { timestamp: Date; count: number }[] {
    const hourlyBuckets: Record<string, number> = {};
    const startHour = new Date(timeRange.start);
    startHour.setMinutes(0, 0, 0);
    
    const endHour = new Date(timeRange.end);
    endHour.setMinutes(59, 59, 999);

    // Initialize buckets
    for (let hour = new Date(startHour); hour <= endHour; hour.setHours(hour.getHours() + 1)) {
      const key = hour.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      hourlyBuckets[key] = 0;
    }

    // Count errors by hour
    errors.forEach(error => {
      const hourKey = error.timestamp.toISOString().substring(0, 13);
      if (hourlyBuckets.hasOwnProperty(hourKey)) {
        hourlyBuckets[hourKey]++;
      }
    });

    return Object.entries(hourlyBuckets)
      .map(([timestamp, count]) => ({
        timestamp: new Date(timestamp + ':00:00.000Z'),
        count
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private generateErrorSummary(analytics: ErrorAnalytics): string {
    const { totalErrors, errorRate, topErrors, criticalErrors } = analytics;
    
    let summary = `Recorded ${totalErrors} errors with an average rate of ${errorRate.toFixed(2)} errors per hour.`;
    
    if (criticalErrors.length > 0) {
      summary += ` ${criticalErrors.length} critical errors require immediate attention.`;
    }
    
    if (topErrors.length > 0) {
      summary += ` The most common error is "${topErrors[0].message}" (${topErrors[0].count} occurrences).`;
    }
    
    return summary;
  }

  private generateErrorRecommendations(analytics: ErrorAnalytics): string[] {
    const recommendations: string[] = [];
    
    if (analytics.errorRate > 10) {
      recommendations.push('Error rate is high - investigate recent deployments and system changes');
    }
    
    if (analytics.criticalErrors.length > 0) {
      recommendations.push('Address critical errors immediately to prevent user impact');
    }
    
    if (analytics.topErrors.length > 0 && analytics.topErrors[0].percentage > 50) {
      recommendations.push(`Focus on resolving "${analytics.topErrors[0].message}" as it represents over 50% of all errors`);
    }
    
    if (analytics.newErrors > analytics.resolvedErrors) {
      recommendations.push('New error rate exceeds resolution rate - increase error resolution efforts');
    }
    
    return recommendations;
  }

  private identifyCriticalIssues(analytics: ErrorAnalytics): string[] {
    const issues: string[] = [];
    
    analytics.criticalErrors.forEach(error => {
      issues.push(`Critical: ${error.message} (${error.type})`);
    });
    
    if (analytics.errorRate > 20) {
      issues.push('Extremely high error rate detected');
    }
    
    return issues;
  }

  private extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private convertErrorsToCSV(errors: ErrorEvent[]): string {
    const headers = ['timestamp', 'type', 'message', 'severity', 'userId', 'url', 'userAgent'];
    const rows = errors.map(error => [
      error.timestamp.toISOString(),
      error.type,
      error.message.replace(/,/g, ';'), // Escape commas
      error.metadata.severity,
      error.userId || '',
      error.url || '',
      error.userAgent.replace(/,/g, ';')
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private trimErrors(): void {
    if (this.errors.length > this.config.maxErrors) {
      this.errors = this.errors.slice(-this.config.maxErrors);
    }
  }

  private notifyErrorSubscribers(error: ErrorEvent): void {
    this.errorSubscribers.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error subscriber notification failed:', err);
      }
    });
  }

  private notifyAlertSubscribers(alert: PerformanceAlert): void {
    this.alertSubscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (err) {
        console.error('Alert subscriber notification failed:', err);
      }
    });
  }

  private getSessionId(): string {
    // This would be enhanced with actual session management
    return `session-${Date.now()}`;
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generatePatternId(): string {
    return `pattern-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const errorTrackingService = new ErrorTrackingService();