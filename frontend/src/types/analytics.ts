// Dashboard usage analytics types
export interface WidgetInteractionEvent {
  id: string;
  userId: string;
  widgetId: string;
  widgetType: string;
  action: 'view' | 'click' | 'resize' | 'move' | 'configure' | 'refresh' | 'close' | 'expand';
  timestamp: Date;
  sessionId: string;
  duration?: number;
  metadata: {
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    previousState?: any;
    newState?: any;
    clickTarget?: string;
    viewportSize?: { width: number; height: number };
    viewStarted?: string;
    resizeTimestamp?: number;
    moveTimestamp?: number;
    configureTimestamp?: number;
    refreshTimestamp?: number;
    expandTimestamp?: number;
    expanded?: boolean;
    newSettings?: Record<string, any>;
    error?: string;
    errorTimestamp?: number;
    isError?: boolean;
    [key: string]: any;
  };
}

export interface FeatureUsageEvent {
  id: string;
  userId: string;
  featureId: string;
  featureName: string;
  action: 'access' | 'complete' | 'abandon' | 'error';
  timestamp: Date;
  sessionId: string;
  duration?: number;
  metadata: {
    entryPoint?: string;
    exitPoint?: string;
    errorType?: string;
    completionRate?: number;
    stepsCompleted?: number;
    totalSteps?: number;
    accessTimestamp?: number;
    completionTimestamp?: number;
    abandonTimestamp?: number;
    errorTimestamp?: number;
    stepTimestamp?: number;
    abandonReason?: string;
    progress?: number;
    errorContext?: Record<string, any>;
    stepName?: string;
    stepNumber?: number;
    isStepTracking?: boolean;
    sessionStart?: boolean;
    sessionId?: string;
    sessionEnd?: boolean;
    [key: string]: any;
  };
}

export interface UserEngagementMetrics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  metrics: {
    totalSessions: number;
    totalDuration: number; // in minutes
    averageSessionDuration: number;
    widgetInteractions: number;
    featureUsage: number;
    contentViews: number;
    actionsPerformed: number;
    uniqueWidgetsUsed: number;
    uniqueFeaturesUsed: number;
    returnVisits: number;
    bounceRate: number;
    engagementScore: number; // 0-100
  };
}

export interface WidgetAnalytics {
  widgetId: string;
  widgetType: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  metrics: {
    totalViews: number;
    uniqueUsers: number;
    averageViewDuration: number;
    interactionRate: number;
    configurationChanges: number;
    errorRate: number;
    popularActions: { action: string; count: number }[];
    peakUsageHours: number[];
    userRetention: number; // percentage of users who return to use this widget
  };
}

export interface FeatureAnalytics {
  featureId: string;
  featureName: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  metrics: {
    totalUsage: number;
    uniqueUsers: number;
    completionRate: number;
    averageCompletionTime: number;
    abandonmentRate: number;
    errorRate: number;
    popularEntryPoints: { entryPoint: string; count: number }[];
    userSatisfactionScore?: number;
    adoptionRate: number; // percentage of active users who use this feature
  };
}

export interface DashboardUsageReport {
  userId?: string; // If undefined, it's an aggregate report
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  summary: {
    totalUsers: number;
    totalSessions: number;
    averageEngagementScore: number;
    mostUsedWidgets: { widgetType: string; usage: number }[];
    mostUsedFeatures: { featureName: string; usage: number }[];
    peakUsageHours: number[];
    deviceBreakdown: { device: string; percentage: number }[];
    retentionRate: number;
  };
  widgetAnalytics: WidgetAnalytics[];
  featureAnalytics: FeatureAnalytics[];
  userEngagement: UserEngagementMetrics[];
  trends: {
    engagementTrend: { date: Date; score: number }[];
    usageTrend: { date: Date; sessions: number }[];
    featureAdoptionTrend: { date: Date; adoptionRate: number }[];
  };
}

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  widgetTypes?: string[];
  featureIds?: string[];
  deviceTypes?: string[];
  sessionDurationMin?: number;
  sessionDurationMax?: number;
  engagementScoreMin?: number;
  engagementScoreMax?: number;
}

export interface RealTimeAnalytics {
  activeUsers: number;
  activeSessions: number;
  currentWidgetUsage: { widgetType: string; activeUsers: number }[];
  currentFeatureUsage: { featureName: string; activeUsers: number }[];
  recentEvents: (WidgetInteractionEvent | FeatureUsageEvent)[];
  systemHealth: {
    errorRate: number;
    averageResponseTime: number;
    uptime: number;
  };
}

export interface AnalyticsInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'engagement' | 'performance' | 'usage' | 'retention' | 'error';
  data: any;
  actionable: boolean;
  recommendations?: string[];
  timestamp: Date;
  affectedUsers?: number;
  impact?: 'positive' | 'negative' | 'neutral';
}

export interface AnalyticsConfiguration {
  trackingEnabled: boolean;
  realTimeUpdates: boolean;
  dataRetentionDays: number;
  samplingRate: number; // 0-1, for performance optimization
  excludedEvents: string[];
  privacyMode: boolean;
  aggregationInterval: number; // minutes
  alertThresholds: {
    errorRate: number;
    engagementDrop: number;
    unusualActivity: number;
  };
}

export interface AnalyticsQuery {
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  eventId?: string;
  [key: string]: any;
}

// Analytics metrics types
export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalEvents: number;
  totalRegistrations: number;
  engagementRate: number;
  [key: string]: any;
}

export interface UserActivityMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  pageViews: number;
  uniqueVisitors: number;
  [key: string]: any;
}

export interface EventMetrics {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  totalRegistrations: number;
  averageAttendance: number;
  [key: string]: any;
}

export interface RegistrationMetrics {
  totalRegistrations: number;
  confirmedRegistrations: number;
  pendingRegistrations: number;
  cancelledRegistrations: number;
  [key: string]: any;
}

export interface SystemMetrics {
  uptime: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  [key: string]: any;
}