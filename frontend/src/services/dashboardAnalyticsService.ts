'use client';

import {
  WidgetInteractionEvent,
  FeatureUsageEvent,
  UserEngagementMetrics,
  WidgetAnalytics,
  FeatureAnalytics,
  DashboardUsageReport,
  AnalyticsFilter,
  RealTimeAnalytics,
  AnalyticsInsight,
  AnalyticsConfiguration
} from '@/types/analytics';

// Dashboard usage analytics service
class DashboardAnalyticsService {
  private storageKey = 'dashboardAnalytics';
  private configKey = 'analyticsConfig';
  private realtimeSubscribers: Set<(data: RealTimeAnalytics) => void> = new Set();
  private eventQueue: (WidgetInteractionEvent | FeatureUsageEvent)[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private realtimeInterval: NodeJS.Timeout | null = null;
  private currentSessionId: string;

  constructor() {
    this.currentSessionId = this.generateSessionId();
    this.initializeService();
  }

  private initializeService(): void {
    // Start event processing
    this.startEventProcessing();
    
    // Start real-time updates
    this.startRealtimeUpdates();
    
    // Handle page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flushEvents();
        }
      });
    }
  }

  // Widget interaction tracking
  trackWidgetInteraction(
    userId: string,
    widgetId: string,
    widgetType: string,
    action: WidgetInteractionEvent['action'],
    metadata: WidgetInteractionEvent['metadata'] = {},
    duration?: number
  ): void {
    const event: WidgetInteractionEvent = {
      id: this.generateEventId(),
      userId,
      widgetId,
      widgetType,
      action,
      timestamp: new Date(),
      sessionId: this.currentSessionId,
      duration,
      metadata: {
        ...metadata,
        viewportSize: this.getViewportSize()
      }
    };

    this.queueEvent(event);
  }

  // Feature usage tracking
  trackFeatureUsage(
    userId: string,
    featureId: string,
    featureName: string,
    action: FeatureUsageEvent['action'],
    metadata: FeatureUsageEvent['metadata'] = {},
    duration?: number
  ): void {
    const event: FeatureUsageEvent = {
      id: this.generateEventId(),
      userId,
      featureId,
      featureName,
      action,
      timestamp: new Date(),
      sessionId: this.currentSessionId,
      duration,
      metadata
    };

    this.queueEvent(event);
  }

  // Get user engagement metrics
  getUserEngagementMetrics(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date
  ): UserEngagementMetrics {
    const events = this.getFilteredEvents({ userId, startDate, endDate });
    const { start, end } = this.getPeriodDates(period, startDate, endDate);

    const sessions = this.groupEventsBySessions(events);
    const widgetEvents = events.filter(e => 'widgetId' in e) as WidgetInteractionEvent[];
    const featureEvents = events.filter(e => 'featureId' in e) as FeatureUsageEvent[];

    const totalDuration = sessions.reduce((sum, session) => sum + this.calculateSessionDuration(session), 0);
    const uniqueWidgets = new Set(widgetEvents.map(e => e.widgetType)).size;
    const uniqueFeatures = new Set(featureEvents.map(e => e.featureId)).size;

    return {
      userId,
      period,
      startDate: start,
      endDate: end,
      metrics: {
        totalSessions: sessions.length,
        totalDuration,
        averageSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
        widgetInteractions: widgetEvents.length,
        featureUsage: featureEvents.length,
        contentViews: widgetEvents.filter(e => e.action === 'view').length,
        actionsPerformed: events.length,
        uniqueWidgetsUsed: uniqueWidgets,
        uniqueFeaturesUsed: uniqueFeatures,
        returnVisits: this.calculateReturnVisits(sessions),
        bounceRate: this.calculateBounceRate(sessions),
        engagementScore: this.calculateEngagementScore(events, sessions)
      }
    };
  }

  // Get widget analytics
  getWidgetAnalytics(
    widgetType: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date
  ): WidgetAnalytics {
    const events = this.getFilteredEvents({ startDate, endDate, widgetTypes: [widgetType] });
    const widgetEvents = events.filter(e => 'widgetId' in e && e.widgetType === widgetType) as WidgetInteractionEvent[];
    const { start, end } = this.getPeriodDates(period, startDate, endDate);

    const uniqueUsers = new Set(widgetEvents.map(e => e.userId)).size;
    const viewEvents = widgetEvents.filter(e => e.action === 'view');
    const totalViewDuration = viewEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    const interactionEvents = widgetEvents.filter(e => e.action !== 'view');

    return {
      widgetId: widgetType,
      widgetType,
      period,
      startDate: start,
      endDate: end,
      metrics: {
        totalViews: viewEvents.length,
        uniqueUsers,
        averageViewDuration: viewEvents.length > 0 ? totalViewDuration / viewEvents.length : 0,
        interactionRate: viewEvents.length > 0 ? interactionEvents.length / viewEvents.length : 0,
        configurationChanges: widgetEvents.filter(e => e.action === 'configure').length,
        errorRate: this.calculateWidgetErrorRate(widgetEvents),
        popularActions: this.getPopularActions(widgetEvents),
        peakUsageHours: this.getPeakUsageHours(widgetEvents),
        userRetention: this.calculateWidgetRetention(widgetType, uniqueUsers)
      }
    };
  }

  // Get feature analytics
  getFeatureAnalytics(
    featureId: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date
  ): FeatureAnalytics {
    const events = this.getFilteredEvents({ startDate, endDate, featureIds: [featureId] });
    const featureEvents = events.filter(e => 'featureId' in e && e.featureId === featureId) as FeatureUsageEvent[];
    const { start, end } = this.getPeriodDates(period, startDate, endDate);

    const uniqueUsers = new Set(featureEvents.map(e => e.userId)).size;
    const accessEvents = featureEvents.filter(e => e.action === 'access');
    const completeEvents = featureEvents.filter(e => e.action === 'complete');
    const abandonEvents = featureEvents.filter(e => e.action === 'abandon');
    const errorEvents = featureEvents.filter(e => e.action === 'error');

    return {
      featureId,
      featureName: featureEvents[0]?.featureName || featureId,
      period,
      startDate: start,
      endDate: end,
      metrics: {
        totalUsage: accessEvents.length,
        uniqueUsers,
        completionRate: accessEvents.length > 0 ? completeEvents.length / accessEvents.length : 0,
        averageCompletionTime: this.calculateAverageCompletionTime(featureEvents),
        abandonmentRate: accessEvents.length > 0 ? abandonEvents.length / accessEvents.length : 0,
        errorRate: featureEvents.length > 0 ? errorEvents.length / featureEvents.length : 0,
        popularEntryPoints: this.getPopularEntryPoints(featureEvents),
        adoptionRate: this.calculateFeatureAdoptionRate(featureId, uniqueUsers)
      }
    };
  }

  // Generate dashboard usage report
  generateUsageReport(
    period: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): DashboardUsageReport {
    const events = this.getFilteredEvents({ userId, startDate, endDate });
    const { start, end } = this.getPeriodDates(period, startDate, endDate);

    const widgetEvents = events.filter(e => 'widgetId' in e) as WidgetInteractionEvent[];
    const featureEvents = events.filter(e => 'featureId' in e) as FeatureUsageEvent[];
    const sessions = this.groupEventsBySessions(events);

    // Get unique widget types and feature IDs
    const widgetTypes = Array.from(new Set(widgetEvents.map(e => e.widgetType)));
    const featureIds = Array.from(new Set(featureEvents.map(e => e.featureId)));

    return {
      userId,
      period,
      startDate: start,
      endDate: end,
      summary: {
        totalUsers: new Set(events.map(e => e.userId)).size,
        totalSessions: sessions.length,
        averageEngagementScore: this.calculateAverageEngagementScore(events),
        mostUsedWidgets: this.getMostUsedWidgets(widgetEvents),
        mostUsedFeatures: this.getMostUsedFeatures(featureEvents),
        peakUsageHours: this.getPeakUsageHours(events),
        deviceBreakdown: this.getDeviceBreakdown(events),
        retentionRate: this.calculateRetentionRate(events)
      },
      widgetAnalytics: widgetTypes.map(type => this.getWidgetAnalytics(type, period, start, end)),
      featureAnalytics: featureIds.map(id => this.getFeatureAnalytics(id, period, start, end)),
      userEngagement: userId ? [this.getUserEngagementMetrics(userId, period, start, end)] : [],
      trends: {
        engagementTrend: this.calculateEngagementTrend(events, period),
        usageTrend: this.calculateUsageTrend(events, period),
        featureAdoptionTrend: this.calculateFeatureAdoptionTrend(events, period)
      }
    };
  }

  // Get real-time analytics
  getRealTimeAnalytics(): RealTimeAnalytics {
    const recentEvents = this.getRecentEvents(300000); // Last 5 minutes
    const activeSessions = this.getActiveSessions();

    return {
      activeUsers: new Set(recentEvents.map(e => e.userId)).size,
      activeSessions: activeSessions.length,
      currentWidgetUsage: this.getCurrentWidgetUsage(recentEvents),
      currentFeatureUsage: this.getCurrentFeatureUsage(recentEvents),
      recentEvents: recentEvents.slice(0, 50),
      systemHealth: {
        errorRate: this.calculateCurrentErrorRate(recentEvents),
        averageResponseTime: this.calculateAverageResponseTime(),
        uptime: this.calculateUptime()
      }
    };
  }

  // Generate analytics insights
  generateInsights(
    period: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date
  ): AnalyticsInsight[] {
    const report = this.generateUsageReport(period, startDate, endDate);
    const insights: AnalyticsInsight[] = [];

    // Engagement insights
    insights.push(...this.generateEngagementInsights(report));
    
    // Usage pattern insights
    insights.push(...this.generateUsageInsights(report));
    
    // Performance insights
    insights.push(...this.generatePerformanceInsights(report));
    
    // Retention insights
    insights.push(...this.generateRetentionInsights(report));

    return insights.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // Configuration management
  getConfiguration(): AnalyticsConfiguration {
    try {
      const stored = localStorage.getItem(this.configKey);
      return stored ? JSON.parse(stored) : this.getDefaultConfiguration();
    } catch (error) {
      console.error('Error loading analytics configuration:', error);
      return this.getDefaultConfiguration();
    }
  }

  updateConfiguration(config: Partial<AnalyticsConfiguration>): void {
    const current = this.getConfiguration();
    const updated = { ...current, ...config };
    
    try {
      localStorage.setItem(this.configKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving analytics configuration:', error);
    }
  }

  // Real-time subscriptions
  subscribeToRealTime(callback: (data: RealTimeAnalytics) => void): () => void {
    this.realtimeSubscribers.add(callback);
    return () => this.realtimeSubscribers.delete(callback);
  }

  // Export data
  exportAnalyticsData(
    format: 'json' | 'csv',
    filter?: AnalyticsFilter
  ): string {
    const events = this.getFilteredEvents(filter);
    
    if (format === 'csv') {
      return this.convertToCSV(events);
    }
    
    return JSON.stringify(events, null, 2);
  }

  // Private helper methods
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private getViewportSize(): { width: number; height: number } {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  private queueEvent(event: WidgetInteractionEvent | FeatureUsageEvent): void {
    const config = this.getConfiguration();
    
    if (!config.trackingEnabled) return;
    
    // Apply sampling rate
    if (Math.random() > config.samplingRate) return;
    
    // Check if event type is excluded
    const eventAction = event.action as string;
    if (config.excludedEvents.includes(eventAction)) return;
    
    this.eventQueue.push(event);
  }

  private startEventProcessing(): void {
    const config = this.getConfiguration();
    
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, config.aggregationInterval * 1000);
  }

  private startRealtimeUpdates(): void {
    this.realtimeInterval = setInterval(() => {
      if (this.realtimeSubscribers.size > 0) {
        const realtimeData = this.getRealTimeAnalytics();
        this.realtimeSubscribers.forEach(callback => callback(realtimeData));
      }
    }, 5000); // Update every 5 seconds
  }

  private flushEvents(): void {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const existing = this.getAllEvents();
      const combined = [...existing, ...eventsToFlush];
      
      // Apply data retention
      const config = this.getConfiguration();
      const cutoffDate = new Date(Date.now() - config.dataRetentionDays * 24 * 60 * 60 * 1000);
      const filtered = combined.filter(e => new Date(e.timestamp) > cutoffDate);
      
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error flushing analytics events:', error);
    }
  }

  private getAllEvents(): (WidgetInteractionEvent | FeatureUsageEvent)[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading analytics events:', error);
      return [];
    }
  }

  private getFilteredEvents(filter: AnalyticsFilter = {}): (WidgetInteractionEvent | FeatureUsageEvent)[] {
    const events = this.getAllEvents();
    
    return events.filter(event => {
      if (filter.startDate && new Date(event.timestamp) < filter.startDate) return false;
      if (filter.endDate && new Date(event.timestamp) > filter.endDate) return false;
      if (filter.userId && event.userId !== filter.userId) return false;
      
      if ('widgetType' in event) {
        if (filter.widgetTypes && !filter.widgetTypes.includes(event.widgetType)) return false;
      }
      
      if ('featureId' in event) {
        if (filter.featureIds && !filter.featureIds.includes(event.featureId)) return false;
      }
      
      return true;
    });
  }

  private getPeriodDates(
    period: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date
  ): { start: Date; end: Date } {
    const now = new Date();
    const end = endDate || now;
    
    if (startDate) {
      return { start: startDate, end };
    }
    
    const start = new Date(end);
    switch (period) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
    }
    
    return { start, end };
  }

  private groupEventsBySessions(events: (WidgetInteractionEvent | FeatureUsageEvent)[]): (WidgetInteractionEvent | FeatureUsageEvent)[][] {
    const sessionGroups: Record<string, (WidgetInteractionEvent | FeatureUsageEvent)[]> = {};
    
    events.forEach(event => {
      if (!sessionGroups[event.sessionId]) {
        sessionGroups[event.sessionId] = [];
      }
      sessionGroups[event.sessionId].push(event);
    });
    
    return Object.values(sessionGroups);
  }

  private calculateSessionDuration(session: (WidgetInteractionEvent | FeatureUsageEvent)[]): number {
    if (session.length < 2) return 0;
    
    const sorted = session.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const start = new Date(sorted[0].timestamp).getTime();
    const end = new Date(sorted[sorted.length - 1].timestamp).getTime();
    
    return (end - start) / 1000 / 60; // Duration in minutes
  }

  private calculateReturnVisits(sessions: (WidgetInteractionEvent | FeatureUsageEvent)[][]): number {
    const userSessions: Record<string, number> = {};
    
    sessions.forEach(session => {
      if (session.length > 0) {
        const userId = session[0].userId;
        userSessions[userId] = (userSessions[userId] || 0) + 1;
      }
    });
    
    return Object.values(userSessions).filter(count => count > 1).length;
  }

  private calculateBounceRate(sessions: (WidgetInteractionEvent | FeatureUsageEvent)[][]): number {
    const bouncedSessions = sessions.filter(session => {
      return session.length === 1 || this.calculateSessionDuration(session) < 1;
    });
    
    return sessions.length > 0 ? bouncedSessions.length / sessions.length : 0;
  }

  private calculateEngagementScore(
    events: (WidgetInteractionEvent | FeatureUsageEvent)[],
    sessions: (WidgetInteractionEvent | FeatureUsageEvent)[][]
  ): number {
    if (events.length === 0) return 0;
    
    const factors = {
      eventCount: Math.min(events.length / 100, 1) * 25,
      sessionDuration: Math.min(sessions.reduce((sum, s) => sum + this.calculateSessionDuration(s), 0) / 60, 1) * 25,
      diversity: Math.min(new Set(events.map(e => 'widgetType' in e ? e.widgetType : e.featureId)).size / 10, 1) * 25,
      retention: Math.min(this.calculateReturnVisits(sessions) / sessions.length, 1) * 25
    };
    
    return Object.values(factors).reduce((sum, factor) => sum + factor, 0);
  }

  private calculateWidgetErrorRate(events: WidgetInteractionEvent[]): number {
    // This would be enhanced with actual error tracking
    return 0;
  }

  private getPopularActions(events: WidgetInteractionEvent[]): { action: string; count: number }[] {
    const actionCounts: Record<string, number> = {};
    
    events.forEach(event => {
      actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
    });
    
    return Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getPeakUsageHours(events: (WidgetInteractionEvent | FeatureUsageEvent)[]): number[] {
    const hourCounts = new Array(24).fill(0);
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    });
    
    return hourCounts?.map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);
  }

  private calculateWidgetRetention(widgetType: string, uniqueUsers: number): number {
    // This would be enhanced with historical data comparison
    return 0.75; // Placeholder
  }

  private calculateAverageCompletionTime(events: FeatureUsageEvent[]): number {
    const completionEvents = events.filter(e => e.action === 'complete' && e.duration);
    if (completionEvents.length === 0) return 0;
    
    const totalTime = completionEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    return totalTime / completionEvents.length;
  }

  private getPopularEntryPoints(events: FeatureUsageEvent[]): { entryPoint: string; count: number }[] {
    const entryPoints: Record<string, number> = {};
    
    events.forEach(event => {
      const entryPoint = event.metadata.entryPoint || 'direct';
      entryPoints[entryPoint] = (entryPoints[entryPoint] || 0) + 1;
    });
    
    return Object.entries(entryPoints)
      .map(([entryPoint, count]) => ({ entryPoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateFeatureAdoptionRate(featureId: string, uniqueUsers: number): number {
    // This would be enhanced with total active users data
    return 0.6; // Placeholder
  }

  private calculateAverageEngagementScore(events: (WidgetInteractionEvent | FeatureUsageEvent)[]): number {
    const sessions = this.groupEventsBySessions(events);
    const userScores: Record<string, number> = {};
    
    sessions.forEach(session => {
      if (session.length > 0) {
        const userId = session[0].userId;
        if (!userScores[userId]) {
          userScores[userId] = this.calculateEngagementScore([session].flat(), [session]);
        }
      }
    });
    
    const scores = Object.values(userScores);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  private getMostUsedWidgets(events: WidgetInteractionEvent[]): { widgetType: string; usage: number }[] {
    const widgetCounts: Record<string, number> = {};
    
    events.forEach(event => {
      widgetCounts[event.widgetType] = (widgetCounts[event.widgetType] || 0) + 1;
    });
    
    return Object.entries(widgetCounts)
      .map(([widgetType, usage]) => ({ widgetType, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);
  }

  private getMostUsedFeatures(events: FeatureUsageEvent[]): { featureName: string; usage: number }[] {
    const featureCounts: Record<string, number> = {};
    
    events.forEach(event => {
      featureCounts[event.featureName] = (featureCounts[event.featureName] || 0) + 1;
    });
    
    return Object.entries(featureCounts)
      .map(([featureName, usage]) => ({ featureName, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);
  }

  private getDeviceBreakdown(events: (WidgetInteractionEvent | FeatureUsageEvent)[]): { device: string; percentage: number }[] {
    // This would be enhanced with actual device detection
    return [
      { device: 'Desktop', percentage: 65 },
      { device: 'Mobile', percentage: 30 },
      { device: 'Tablet', percentage: 5 }
    ];
  }

  private calculateRetentionRate(events: (WidgetInteractionEvent | FeatureUsageEvent)[]): number {
    // This would be enhanced with historical data
    return 0.72; // Placeholder
  }

  private calculateEngagementTrend(
    events: (WidgetInteractionEvent | FeatureUsageEvent)[],
    period: 'daily' | 'weekly' | 'monthly'
  ): { date: Date; score: number }[] {
    // Group events by time period and calculate engagement scores
    const groupedEvents = this.groupEventsByPeriod(events, period);
    
    return Object.entries(groupedEvents).map(([dateStr, periodEvents]) => ({
      date: new Date(dateStr),
      score: this.calculateEngagementScore(periodEvents, this.groupEventsBySessions(periodEvents))
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private calculateUsageTrend(
    events: (WidgetInteractionEvent | FeatureUsageEvent)[],
    period: 'daily' | 'weekly' | 'monthly'
  ): { date: Date; sessions: number }[] {
    const groupedEvents = this.groupEventsByPeriod(events, period);
    
    return Object.entries(groupedEvents).map(([dateStr, periodEvents]) => ({
      date: new Date(dateStr),
      sessions: this.groupEventsBySessions(periodEvents).length
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private calculateFeatureAdoptionTrend(
    events: (WidgetInteractionEvent | FeatureUsageEvent)[],
    period: 'daily' | 'weekly' | 'monthly'
  ): { date: Date; adoptionRate: number }[] {
    const groupedEvents = this.groupEventsByPeriod(events, period);
    
    return Object.entries(groupedEvents).map(([dateStr, periodEvents]) => {
      const featureEvents = periodEvents.filter(e => 'featureId' in e);
      const uniqueFeatures = new Set(featureEvents.map(e => ('featureId' in e) ? e.featureId : '')).size;
      const totalFeatures = 20; // This would be dynamic based on available features
      
      return {
        date: new Date(dateStr),
        adoptionRate: uniqueFeatures / totalFeatures
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private groupEventsByPeriod(
    events: (WidgetInteractionEvent | FeatureUsageEvent)[],
    period: 'daily' | 'weekly' | 'monthly'
  ): Record<string, (WidgetInteractionEvent | FeatureUsageEvent)[]> {
    const grouped: Record<string, (WidgetInteractionEvent | FeatureUsageEvent)[]> = {};
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      let key: string;
      
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });
    
    return grouped;
  }

  private getRecentEvents(timeWindowMs: number): (WidgetInteractionEvent | FeatureUsageEvent)[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.getAllEvents().filter(e => new Date(e.timestamp) > cutoff);
  }

  private getActiveSessions(): string[] {
    const recentEvents = this.getRecentEvents(1800000); // Last 30 minutes
    return Array.from(new Set(recentEvents.map(e => e.sessionId)));
  }

  private getCurrentWidgetUsage(events: (WidgetInteractionEvent | FeatureUsageEvent)[]): { widgetType: string; activeUsers: number }[] {
    const widgetUsers: Record<string, Set<string>> = {};
    
    events.forEach(event => {
      if ('widgetType' in event) {
        if (!widgetUsers[event.widgetType]) {
          widgetUsers[event.widgetType] = new Set();
        }
        widgetUsers[event.widgetType].add(event.userId);
      }
    });
    
    return Object.entries(widgetUsers)
      .map(([widgetType, users]) => ({ widgetType, activeUsers: users.size }))
      .sort((a, b) => b.activeUsers - a.activeUsers);
  }

  private getCurrentFeatureUsage(events: (WidgetInteractionEvent | FeatureUsageEvent)[]): { featureName: string; activeUsers: number }[] {
    const featureUsers: Record<string, Set<string>> = {};
    
    events.forEach(event => {
      if ('featureName' in event) {
        if (!featureUsers[event.featureName]) {
          featureUsers[event.featureName] = new Set();
        }
        featureUsers[event.featureName].add(event.userId);
      }
    });
    
    return Object.entries(featureUsers)
      .map(([featureName, users]) => ({ featureName, activeUsers: users.size }))
      .sort((a, b) => b.activeUsers - a.activeUsers);
  }

  private calculateCurrentErrorRate(events: (WidgetInteractionEvent | FeatureUsageEvent)[]): number {
    const errorEvents = events.filter(e => 'action' in e && e.action === 'error');
    return events.length > 0 ? errorEvents.length / events.length : 0;
  }

  private calculateAverageResponseTime(): number {
    // This would be enhanced with actual performance monitoring
    return 150; // Placeholder in milliseconds
  }

  private calculateUptime(): number {
    // This would be enhanced with actual uptime monitoring
    return 0.999; // Placeholder (99.9% uptime)
  }

  private generateEngagementInsights(report: DashboardUsageReport): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];
    
    // Low engagement alert
    if (report.summary.averageEngagementScore < 40) {
      insights.push({
        id: `engagement-low-${Date.now()}`,
        type: 'alert',
        title: 'Low User Engagement Detected',
        description: `Average engagement score is ${report.summary.averageEngagementScore.toFixed(1)}, which is below the recommended threshold of 60.`,
        severity: 'high',
        category: 'engagement',
        data: { score: report.summary.averageEngagementScore },
        actionable: true,
        recommendations: [
          'Review widget placement and visibility',
          'Analyze user feedback for usability issues',
          'Consider A/B testing different layouts'
        ],
        timestamp: new Date(),
        affectedUsers: report.summary.totalUsers,
        impact: 'negative'
      });
    }
    
    return insights;
  }

  private generateUsageInsights(report: DashboardUsageReport): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];
    
    // Underutilized widgets
    const lowUsageWidgets = report.widgetAnalytics.filter(w => w.metrics.totalViews < 10);
    if (lowUsageWidgets.length > 0) {
      insights.push({
        id: `usage-low-widgets-${Date.now()}`,
        type: 'recommendation',
        title: 'Underutilized Widgets Detected',
        description: `${lowUsageWidgets.length} widgets have very low usage rates.`,
        severity: 'medium',
        category: 'usage',
        data: { widgets: lowUsageWidgets.map(w => w.widgetType) },
        actionable: true,
        recommendations: [
          'Consider removing or redesigning low-usage widgets',
          'Improve widget discoverability',
          'Gather user feedback on widget usefulness'
        ],
        timestamp: new Date(),
        impact: 'neutral'
      });
    }
    
    return insights;
  }

  private generatePerformanceInsights(report: DashboardUsageReport): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];
    
    // High bounce rate
    const avgBounceRate = report.userEngagement.reduce((sum, u) => sum + u.metrics.bounceRate, 0) / Math.max(1, report.userEngagement.length);
    if (avgBounceRate > 0.7) {
      insights.push({
        id: `performance-bounce-${Date.now()}`,
        type: 'alert',
        title: 'High Bounce Rate Detected',
        description: `Average bounce rate is ${(avgBounceRate * 100).toFixed(1)}%, indicating users are leaving quickly.`,
        severity: 'high',
        category: 'performance',
        data: { bounceRate: avgBounceRate },
        actionable: true,
        recommendations: [
          'Optimize page load times',
          'Improve initial user experience',
          'Review onboarding flow'
        ],
        timestamp: new Date(),
        impact: 'negative'
      });
    }
    
    return insights;
  }

  private generateRetentionInsights(report: DashboardUsageReport): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];
    
    // Low retention rate
    if (report.summary.retentionRate < 0.5) {
      insights.push({
        id: `retention-low-${Date.now()}`,
        type: 'alert',
        title: 'Low User Retention Rate',
        description: `User retention rate is ${(report.summary.retentionRate * 100).toFixed(1)}%, which is below the target of 70%.`,
        severity: 'high',
        category: 'retention',
        data: { retentionRate: report.summary.retentionRate },
        actionable: true,
        recommendations: [
          'Implement user onboarding improvements',
          'Add more engaging features',
          'Send targeted re-engagement campaigns'
        ],
        timestamp: new Date(),
        affectedUsers: Math.floor(report.summary.totalUsers * (1 - report.summary.retentionRate)),
        impact: 'negative'
      });
    }
    
    return insights;
  }

  private getDefaultConfiguration(): AnalyticsConfiguration {
    return {
      trackingEnabled: true,
      realTimeUpdates: true,
      dataRetentionDays: 90,
      samplingRate: 1.0,
      excludedEvents: [],
      privacyMode: false,
      aggregationInterval: 30,
      alertThresholds: {
        errorRate: 0.05,
        engagementDrop: 0.2,
        unusualActivity: 2.0
      }
    };
  }

  private convertToCSV(events: (WidgetInteractionEvent | FeatureUsageEvent)[]): string {
    if (events.length === 0) return '';
    
    const headers = ['timestamp', 'userId', 'sessionId', 'type', 'action', 'target', 'duration'];
    const rows = events.map(event => [
      event.timestamp.toISOString(),
      event.userId,
      event.sessionId,
      'widgetType' in event ? 'widget' : 'feature',
      event.action,
      'widgetType' in event ? event.widgetType : event.featureName,
      event.duration || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.realtimeInterval) {
      clearInterval(this.realtimeInterval);
    }
    this.flushEvents();
  }
}

export const dashboardAnalyticsService = new DashboardAnalyticsService();