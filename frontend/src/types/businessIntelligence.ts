// Business intelligence types for dashboard analytics
export interface DashboardUsageInsight {
  id: string;
  type: 'usage_pattern' | 'user_behavior' | 'feature_adoption' | 'performance_impact' | 'business_metric';
  title: string;
  description: string;
  category: 'engagement' | 'retention' | 'adoption' | 'performance' | 'revenue' | 'satisfaction';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  impact: {
    scope: 'individual' | 'segment' | 'global';
    magnitude: 'minor' | 'moderate' | 'significant' | 'major';
    timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  };
  data: {
    metrics: Record<string, number>;
    trends: { period: string; value: number }[];
    comparisons: { baseline: number; current: number; change: number }[];
    segments: { name: string; value: number; percentage: number }[];
  };
  recommendations: {
    action: string;
    rationale: string;
    expectedOutcome: string;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  }[];
  timestamp: Date;
  expiresAt?: Date;
}

export interface UserBehaviorPattern {
  id: string;
  name: string;
  description: string;
  type: 'navigation' | 'interaction' | 'temporal' | 'feature_usage' | 'content_consumption';
  frequency: number;
  confidence: number;
  userSegment: {
    criteria: Record<string, any>;
    size: number;
    characteristics: string[];
  };
  pattern: {
    sequence: string[];
    duration: number;
    frequency: number;
    variations: string[];
  };
  businessImpact: {
    metric: string;
    correlation: number;
    causation: 'likely' | 'possible' | 'unlikely';
    value: number;
  };
  discoveredAt: Date;
  lastSeen: Date;
  status: 'active' | 'declining' | 'emerging' | 'stable';
}

export interface PredictiveAnalytics {
  id: string;
  type: 'churn_prediction' | 'engagement_forecast' | 'feature_adoption' | 'performance_trend' | 'usage_growth';
  target: string;
  timeHorizon: number; // days
  confidence: number;
  methodology: 'linear_regression' | 'time_series' | 'machine_learning' | 'statistical_model';
  predictions: {
    date: Date;
    value: number;
    confidence_interval: { lower: number; upper: number };
    factors: { name: string; influence: number }[];
  }[];
  accuracy: {
    historical: number;
    recent: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  assumptions: string[];
  limitations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessMetric {
  id: string;
  name: string;
  category: 'engagement' | 'retention' | 'acquisition' | 'monetization' | 'satisfaction' | 'performance';
  description: string;
  formula: string;
  unit: string;
  target: {
    value: number;
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    direction: 'increase' | 'decrease' | 'maintain';
  };
  current: {
    value: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
    changePercent: number;
  };
  historical: {
    period: string;
    value: number;
  }[];
  benchmarks: {
    internal: number;
    industry: number;
    competitor: number;
  };
  alerts: {
    threshold: number;
    condition: 'above' | 'below';
    severity: 'info' | 'warning' | 'critical';
  }[];
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    demographic?: Record<string, any>;
    behavioral?: Record<string, any>;
    engagement?: Record<string, any>;
    temporal?: Record<string, any>;
  };
  size: number;
  growth: {
    rate: number;
    trend: 'growing' | 'shrinking' | 'stable';
  };
  characteristics: {
    avgEngagementScore: number;
    avgSessionDuration: number;
    retentionRate: number;
    churnRisk: number;
    lifetimeValue: number;
  };
  behaviors: {
    topFeatures: string[];
    commonPaths: string[];
    peakUsageHours: number[];
    devicePreferences: string[];
  };
  businessValue: {
    revenue: number;
    cost: number;
    profitability: number;
    strategicImportance: 'low' | 'medium' | 'high' | 'critical';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardROI {
  period: { start: Date; end: Date };
  investment: {
    development: number;
    maintenance: number;
    infrastructure: number;
    total: number;
  };
  returns: {
    userProductivity: number;
    errorReduction: number;
    supportCostSavings: number;
    userSatisfaction: number;
    total: number;
  };
  roi: {
    percentage: number;
    paybackPeriod: number; // months
    netPresentValue: number;
    breakEvenPoint: Date;
  };
  metrics: {
    userAdoption: number;
    featureUtilization: number;
    errorReduction: number;
    performanceImprovement: number;
    satisfactionScore: number;
  };
}

export interface CompetitiveAnalysis {
  id: string;
  competitor: string;
  features: {
    name: string;
    ourImplementation: 'better' | 'similar' | 'worse' | 'missing';
    importance: 'low' | 'medium' | 'high' | 'critical';
    userDemand: number;
    implementationEffort: 'low' | 'medium' | 'high';
  }[];
  performance: {
    metric: string;
    ourValue: number;
    competitorValue: number;
    advantage: 'significant' | 'moderate' | 'slight' | 'disadvantage';
  }[];
  opportunities: {
    area: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    priority: number;
  }[];
  threats: {
    area: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    likelihood: 'low' | 'medium' | 'high';
    mitigation: string[];
  }[];
  lastUpdated: Date;
}

export interface BusinessIntelligenceReport {
  id: string;
  title: string;
  type: 'executive_summary' | 'detailed_analysis' | 'trend_report' | 'performance_review' | 'strategic_insights';
  period: { start: Date; end: Date };
  sections: {
    title: string;
    content: string;
    visualizations: {
      type: 'chart' | 'table' | 'metric' | 'heatmap' | 'funnel';
      data: any;
      config: any;
    }[];
    insights: DashboardUsageInsight[];
  }[];
  keyFindings: string[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    rationale: string;
    impact: string;
    timeline: string;
    owner: string;
  }[];
  metrics: BusinessMetric[];
  appendices: {
    title: string;
    content: any;
  }[];
  generatedAt: Date;
  generatedBy: string;
  distribution: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: {
    operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'between' | 'outside';
    value: number | number[];
    duration?: number; // minutes
  };
  severity: 'info' | 'warning' | 'critical';
  channels: ('email' | 'slack' | 'webhook' | 'dashboard')[];
  recipients: string[];
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
  createdAt: Date;
  updatedAt: Date;
}