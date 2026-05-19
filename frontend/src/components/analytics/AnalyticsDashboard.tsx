'use client';

import React, { useState, useEffect } from 'react';
import { dashboardAnalyticsService } from '@/services/dashboardAnalyticsService';
import { realTimePerformanceService } from '@/services/realTimePerformanceService';
import { errorTrackingService } from '@/services/errorTrackingService';
import { businessIntelligenceService } from '@/services/businessIntelligenceService';
import { userEngagementService } from '@/services/userEngagementService';
import {
  RealTimePerformanceData,
  PerformanceAlert,
  ErrorEvent
} from '@/types/performanceMonitoring';
import {
  DashboardUsageReport,
  UserEngagementMetrics
} from '@/types/analytics';
import {
  DashboardUsageInsight,
  BusinessMetric,
  UserSegment
} from '@/types/businessIntelligence';

interface AnalyticsDashboardProps {
  userId: string;
  userRole: 'admin' | 'manager' | 'analyst';
}

export default function AnalyticsDashboard({ userId, userRole }: AnalyticsDashboardProps) {
  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'errors' | 'insights' | 'segments'>('overview');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  
  // Analytics data state
  const [usageReport, setUsageReport] = useState<DashboardUsageReport | null>(null);
  const [performanceData, setPerformanceData] = useState<RealTimePerformanceData | null>(null);
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([]);
  const [errorEvents, setErrorEvents] = useState<ErrorEvent[]>([]);
  const [businessInsights, setBusinessInsights] = useState<DashboardUsageInsight[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetric[]>([]);
  const [userSegments, setUserSegments] = useState<UserSegment[]>([]);
  const [engagementMetrics, setEngagementMetrics] = useState<UserEngagementMetrics | null>(null);

  // Initialize analytics services and load data
  useEffect(() => {
    const initializeAnalytics = async () => {
      setIsLoading(true);
      
      try {
        // Start real-time monitoring
        realTimePerformanceService.startMonitoring();
        
        // Load initial data
        await loadAnalyticsData();
        
        // Set up real-time subscriptions
        const performanceUnsubscribe = realTimePerformanceService.subscribe(setPerformanceData);
        const alertUnsubscribe = realTimePerformanceService.subscribeToAlerts((alert) => {
          setPerformanceAlerts(prev => [alert, ...prev.slice(0, 9)]);
        });
        const errorUnsubscribe = errorTrackingService.subscribeToErrors((error) => {
          setErrorEvents(prev => [error, ...prev.slice(0, 49)]);
        });
        const insightUnsubscribe = businessIntelligenceService.subscribeToInsights((insight) => {
          setBusinessInsights(prev => [insight, ...prev.slice(0, 19)]);
        });
        
        // Cleanup subscriptions on unmount
        return () => {
          performanceUnsubscribe();
          alertUnsubscribe();
          errorUnsubscribe();
          insightUnsubscribe();
          realTimePerformanceService.stopMonitoring();
        };
      } catch (error) {
        console.error('Failed to initialize analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAnalytics();
  }, []);

  // Load analytics data based on time range
  const loadAnalyticsData = async () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    try {
      // Load usage report
      const report = dashboardAnalyticsService.generateUsageReport('daily', startDate, endDate);
      setUsageReport(report);

      // Load performance data
      const currentPerformance = realTimePerformanceService.getCurrentPerformanceData();
      setPerformanceData(currentPerformance);

      // Load alerts
      const alerts = realTimePerformanceService.getActiveAlerts();
      setPerformanceAlerts(alerts);

      // Load error events
      const errors = realTimePerformanceService.getErrorEvents(24);
      setErrorEvents(errors);

      // Load business insights
      const insights = businessIntelligenceService.generateDashboardUsageInsights(
        { start: startDate, end: endDate },
        userRole
      );
      setBusinessInsights(insights);

      // Load business metrics
      const metrics = businessIntelligenceService.getBusinessMetrics();
      setBusinessMetrics(metrics);

      // Load user segments
      const segments = businessIntelligenceService.getUserSegments();
      setUserSegments(segments);

      // Load engagement metrics
      const engagement = userEngagementService.calculateEngagementScore(userId, 'weekly');
      // Convert engagement score to metrics format for display
      const engagementMetricsData: UserEngagementMetrics = {
        userId,
        period: 'weekly',
        startDate,
        endDate,
        metrics: {
          totalSessions: 0,
          totalDuration: 0,
          averageSessionDuration: 0,
          widgetInteractions: 0,
          featureUsage: 0,
          contentViews: 0,
          actionsPerformed: 0,
          uniqueWidgetsUsed: 0,
          uniqueFeaturesUsed: 0,
          returnVisits: 0,
          bounceRate: 0,
          engagementScore: engagement.overall
        }
      };
      setEngagementMetrics(engagementMetricsData);

    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  };

  // Reload data when time range changes
  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive insights into dashboard usage and performance</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        {/* Time Range Selector */}
        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          {(['1h', '24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range === '1h' ? 'Last Hour' : 
               range === '24h' ? 'Last 24h' : 
               range === '7d' ? 'Last 7 days' : 
               'Last 30 days'}
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <button
          onClick={loadAnalyticsData}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'performance', label: 'Performance' },
            { id: 'errors', label: 'Errors' },
            { id: 'insights', label: 'Insights' },
            { id: 'segments', label: 'User Segments' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <OverviewTab
            usageReport={usageReport}
            performanceData={performanceData}
            engagementMetrics={engagementMetrics}
            businessMetrics={businessMetrics}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceTab
            performanceData={performanceData}
            alerts={performanceAlerts}
            timeRange={timeRange}
          />
        )}

        {activeTab === 'errors' && (
          <ErrorsTab
            errorEvents={errorEvents}
            timeRange={timeRange}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsTab
            insights={businessInsights}
            userRole={userRole}
          />
        )}

        {activeTab === 'segments' && (
          <SegmentsTab
            segments={userSegments}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  usageReport,
  performanceData,
  engagementMetrics,
  businessMetrics
}: {
  usageReport: DashboardUsageReport | null;
  performanceData: RealTimePerformanceData | null;
  engagementMetrics: UserEngagementMetrics | null;
  businessMetrics: BusinessMetric[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Key Metrics Cards */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Summary</h3>
        {usageReport ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Users</span>
              <span className="font-medium">{usageReport.summary.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Sessions</span>
              <span className="font-medium">{usageReport.summary.totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Engagement</span>
              <span className="font-medium">{usageReport.summary.averageEngagementScore.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Retention Rate</span>
              <span className="font-medium">{(usageReport.summary.retentionRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Loading usage data...</div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
        {performanceData ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">FPS</span>
              <span className={`font-medium ${performanceData.metrics.fps < 30 ? 'text-red-600' : 'text-green-600'}`}>
                {performanceData.metrics.fps}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Memory Usage</span>
              <span className="font-medium">{performanceData.metrics.memoryUsage.toFixed(1)} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Error Rate</span>
              <span className={`font-medium ${performanceData.errorRate > 0.02 ? 'text-red-600' : 'text-green-600'}`}>
                {(performanceData.errorRate * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">System Health</span>
              <span className={`font-medium capitalize ${
                performanceData.systemHealth === 'excellent' ? 'text-green-600' :
                performanceData.systemHealth === 'good' ? 'text-primary' :
                performanceData.systemHealth === 'warning' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {performanceData.systemHealth}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Loading performance data...</div>
        )}
      </div>

      {/* Engagement Score */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Engagement</h3>
        {engagementMetrics ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Overall Score</span>
              <span className="font-medium text-2xl">{engagementMetrics.metrics.engagementScore.toFixed(1)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${engagementMetrics.metrics.engagementScore}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500">
              {engagementMetrics.metrics.engagementScore >= 80 ? 'Excellent' :
               engagementMetrics.metrics.engagementScore >= 60 ? 'Good' :
               engagementMetrics.metrics.engagementScore >= 40 ? 'Average' : 'Needs Improvement'}
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Loading engagement data...</div>
        )}
      </div>

      {/* Business Metrics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2 xl:col-span-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businessMetrics.slice(0, 6).map((metric) => (
            <div key={metric.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">{metric.name}</h4>
                <span className={`text-sm ${
                  metric.current.trend === 'up' ? 'text-green-600' :
                  metric.current.trend === 'down' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {metric.current.trend === 'up' ? '' : metric.current.trend === 'down' ? '' : ''}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metric.current.value} {metric.unit}
              </div>
              <div className="text-sm text-gray-600">
                {metric.current.changePercent > 0 ? '+' : ''}{metric.current.changePercent.toFixed(1)}% from last period
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Performance Tab Component
function PerformanceTab({
  performanceData,
  alerts,
  timeRange
}: {
  performanceData: RealTimePerformanceData | null;
  alerts: PerformanceAlert[];
  timeRange: string;
}) {
  return (
    <div className="space-y-6">
      {/* Real-time Performance */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Performance</h3>
        {performanceData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{performanceData.metrics.fps}</div>
              <div className="text-sm text-gray-600">FPS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{performanceData.metrics.memoryUsage.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Memory (MB)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{performanceData.metrics.networkLatency}</div>
              <div className="text-sm text-gray-600">Latency (ms)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{performanceData.activeUsers}</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No performance data available</div>
        )}
      </div>

      {/* Performance Alerts */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Alerts</h3>
        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                  alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-primary bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {alert.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">No active alerts</div>
        )}
      </div>
    </div>
  );
}

// Errors Tab Component
function ErrorsTab({
  errorEvents,
  timeRange
}: {
  errorEvents: ErrorEvent[];
  timeRange: string;
}) {
  return (
    <div className="space-y-6">
      {/* Error Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{errorEvents.length}</div>
            <div className="text-sm text-gray-600">Total Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {errorEvents.filter(e => e.metadata.severity === 'critical').length}
            </div>
            <div className="text-sm text-gray-600">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {errorEvents.filter(e => e.metadata.severity === 'high').length}
            </div>
            <div className="text-sm text-gray-600">High</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {errorEvents.filter(e => e.metadata.severity === 'medium').length}
            </div>
            <div className="text-sm text-gray-600">Medium</div>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors</h3>
        {errorEvents.length > 0 ? (
          <div className="space-y-3">
            {errorEvents.slice(0, 10).map((error) => (
              <div
                key={error.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      error.metadata.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      error.metadata.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      error.metadata.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {error.metadata.severity}
                    </span>
                    <span className="text-sm text-gray-600">{error.type}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {error.timestamp.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{error.message}</p>
                {error.url && (
                  <p className="text-xs text-gray-600 mt-1">URL: {error.url}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">No errors recorded</div>
        )}
      </div>
    </div>
  );
}

// Insights Tab Component
function InsightsTab({
  insights,
  userRole
}: {
  insights: DashboardUsageInsight[];
  userRole: string;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Insights</h3>
        {insights.length > 0 ? (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    insight.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    insight.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {insight.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                {insight.recommendations.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Recommendations:</h5>
                    <ul className="space-y-1">
                      {insight.recommendations.slice(0, 2).map((rec, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          � {rec.action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">No insights available</div>
        )}
      </div>
    </div>
  );
}

// Segments Tab Component
function SegmentsTab({
  segments
}: {
  segments: UserSegment[];
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Segments</h3>
        {segments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <h4 className="font-medium text-gray-900 mb-2">{segment.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{segment.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium">{segment.size} users</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Engagement:</span>
                    <span className="font-medium">{segment.characteristics.avgEngagementScore}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Retention:</span>
                    <span className="font-medium">{(segment.characteristics.retentionRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Growth:</span>
                    <span className={`font-medium ${
                      segment.growth.trend === 'growing' ? 'text-green-600' :
                      segment.growth.trend === 'shrinking' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {segment.growth.trend} ({(segment.growth.rate * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">No user segments defined</div>
        )}
      </div>
    </div>
  );
}
