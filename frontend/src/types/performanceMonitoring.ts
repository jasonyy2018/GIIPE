// Enhanced performance monitoring types
export interface RealTimePerformanceData {
  timestamp: Date;
  metrics: {
    fps: number;
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
    renderTime: number;
    interactionDelay: number;
  };
  activeUsers: number;
  errorRate: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface ErrorEvent {
  id: string;
  timestamp: Date;
  type: 'javascript' | 'network' | 'render' | 'interaction' | 'resource';
  message: string;
  stack?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  userId?: string;
  sessionId: string;
  userAgent: string;
  metadata: {
    component?: string;
    action?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
    breadcrumbs?: string[];
  };
}

export interface UserExperienceMetrics {
  userId: string;
  sessionId: string;
  timestamp: Date;
  metrics: {
    pageLoadTime: number;
    timeToInteractive: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
    totalBlockingTime: number;
    interactionToNextPaint: number;
  };
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    screenResolution: string;
    connectionType: string;
    memorySize?: number;
  };
  userActions: {
    clicks: number;
    scrolls: number;
    keystrokes: number;
    formSubmissions: number;
    navigationEvents: number;
  };
  satisfactionScore: number; // 0-100 based on performance metrics
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  type: 'threshold_exceeded' | 'error_spike' | 'performance_degradation' | 'system_overload';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedMetric: string;
  currentValue: number;
  thresholdValue: number;
  affectedUsers?: number;
  recommendedActions: string[];
  autoResolved: boolean;
  resolvedAt?: Date;
}

export interface PerformanceDashboardConfig {
  refreshInterval: number; // milliseconds
  alertThresholds: {
    fps: { warning: number; critical: number };
    memoryUsage: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
    responseTime: { warning: number; critical: number };
    renderTime: { warning: number; critical: number };
  };
  enabledMetrics: string[];
  enableRealTimeAlerts: boolean;
  enableErrorTracking: boolean;
  enableUserExperienceTracking: boolean;
  dataRetentionHours: number;
}

export interface PerformanceTrend {
  metric: string;
  period: 'hour' | 'day' | 'week' | 'month';
  dataPoints: { timestamp: Date; value: number }[];
  trend: 'improving' | 'degrading' | 'stable';
  changePercentage: number;
  prediction?: { timestamp: Date; value: number }[];
}

export interface SystemResourceUsage {
  timestamp: Date;
  cpu: {
    usage: number; // percentage
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number; // MB
    total: number; // MB
    percentage: number;
    heapUsed?: number;
    heapTotal?: number;
  };
  network: {
    latency: number; // ms
    bandwidth: number; // Mbps
    packetsLost: number;
    connectionType: string;
  };
  storage: {
    used: number; // MB
    available: number; // MB
    cacheSize: number; // MB
  };
}

export interface PerformanceInsight {
  id: string;
  type: 'optimization' | 'warning' | 'recommendation' | 'achievement';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: 'rendering' | 'interaction' | 'loading' | 'memory' | 'network';
  data: Record<string, any>;
  actionable: boolean;
  actions?: {
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedImpact: string;
  }[];
  timestamp: Date;
}

export interface PerformanceComparison {
  baseline: {
    period: string;
    metrics: Record<string, number>;
  };
  current: {
    period: string;
    metrics: Record<string, number>;
  };
  changes: {
    metric: string;
    change: number;
    changePercentage: number;
    trend: 'improved' | 'degraded' | 'unchanged';
    significance: 'major' | 'minor' | 'negligible';
  }[];
  overallScore: number;
  recommendation: string;
}