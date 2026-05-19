'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useRealTimeAnalytics } from '@/hooks/useRealTimeAnalytics';
import { DateRangeSelector } from './DateRangeSelector';
import { ComparativeAnalyticsChart } from './ComparativeAnalyticsChart';

interface ComparativeDataPoint {
  date: string;
  current: number;
  previous: number;
  category?: string;
  metadata?: Record<string, any>;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: 'today' | '7d' | '30d' | '90d' | 'custom';
}

interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  category: string;
}

interface ChartData {
  date: string;
  value: number;
  previousValue?: number;
  category?: string;
}

interface DrillDownData {
  level: number;
  filters: Record<string, any>;
  data: ChartData[];
  breadcrumb: string[];
}

interface InteractiveAnalyticsDashboardProps {
  initialDateRange?: DateRange;
  enableRealTime?: boolean;
  allowDrillDown?: boolean;
}

export default function InteractiveAnalyticsDashboard({
  initialDateRange,
  enableRealTime = true,
  allowDrillDown = true
}: InteractiveAnalyticsDashboardProps) {
  // State management
  const [dateRange, setDateRange] = useState<DateRange>(
    initialDateRange || {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      preset: '30d'
    }
  );
  
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'users', 'events', 'registrations', 'engagement'
  ]);
  
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Analytics data
  const [metricsData, setMetricsData] = useState<AnalyticsMetric[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [drillDownStack, setDrillDownStack] = useState<DrillDownData[]>([]);
  const [comparativeData, setComparativeData] = useState<ComparativeDataPoint[]>([]);
  
  // Real-time analytics
  const {
    isActive: isRealTimeActive,
    connectionStatus,
    lastUpdate,
    metricsData: realTimeMetrics,
    alerts: realTimeAlerts,
    start: startRealTime,
    stop: stopRealTime,
    refresh: refreshRealTime,
    isConnected
  } = useRealTimeAnalytics({
    enabled: enableRealTime,
    metrics: selectedMetrics,
    onUpdate: (update) => {
      if (update.type === 'analytics_update') {
        // Update metrics with real-time data
        setMetricsData(prev => 
          prev.map(metric => 
            realTimeMetrics[metric.id] 
              ? { ...metric, ...realTimeMetrics[metric.id] }
              : metric
          )
        );
      }
    }
  });
  
  // Color scheme for charts
  const colors = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899'
  };

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        metrics: selectedMetrics.join(',')
      });
      
      const [metricsResponse, chartResponse, comparativeResponse] = await Promise.all([
        fetch(`/api/admin/analytics/metrics?${params}`),
        fetch(`/api/admin/analytics/chart-data?${params}`),
        fetch(`/api/admin/analytics/comparative?${params}`)
      ]);
      
      if (!metricsResponse.ok || !chartResponse.ok || !comparativeResponse.ok) {
        throw new Error('Failed to load analytics data');
      }
      
      const [metrics, chart, comparative] = await Promise.all([
        metricsResponse.json(),
        chartResponse.json(),
        comparativeResponse.json()
      ]);
      
      setMetricsData(metrics);
      setChartData(chart);
      
      // Convert comparative data to ComparativeDataPoint format
      // API may return ChartData format (value, previousValue) or ComparativeDataPoint format (current, previous)
      const convertedComparative: ComparativeDataPoint[] = Array.isArray(comparative) 
        ? comparative.map((item: any) => {
            // If it's already in ComparativeDataPoint format, use it as is
            if ('current' in item && 'previous' in item) {
              return item as ComparativeDataPoint;
            }
            // If it's in ChartData format, convert it
            if ('value' in item && 'previousValue' in item) {
              return {
                date: item.date,
                current: item.value,
                previous: item.previousValue || 0,
                category: item.category,
                metadata: item.metadata
              };
            }
            // Fallback: assume value is current and previousValue is previous
            return {
              date: item.date || '',
              current: item.value || item.current || 0,
              previous: item.previousValue || item.previous || 0,
              category: item.category,
              metadata: item.metadata
            };
          })
        : [];
      
      setComparativeData(convertedComparative);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, selectedMetrics]);

  // Initialize data loading
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Start/stop real-time updates based on enableRealTime prop
  useEffect(() => {
    if (enableRealTime && !isRealTimeActive) {
      startRealTime();
    } else if (!enableRealTime && isRealTimeActive) {
      stopRealTime();
    }
  }, [enableRealTime, isRealTimeActive, startRealTime, stopRealTime]);

  // Handle date range changes
  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setDrillDownStack([]); // Reset drill-down when changing date range
  };

  // Handle drill-down functionality
  const handleChartClick = (data: any, event: any) => {
    if (!allowDrillDown || !data) return;

    const newDrillDown: DrillDownData = {
      level: drillDownStack.length + 1,
      filters: { 
        ...getCurrentFilters(),
        date: data.date,
        category: data.category 
      },
      data: [], // Will be loaded
      breadcrumb: [...getCurrentBreadcrumb(), data.date || data.category]
    };

    setDrillDownStack(prev => [...prev, newDrillDown]);
    loadDrillDownData(newDrillDown);
  };

  // Load drill-down data
  const loadDrillDownData = async (drillDown: DrillDownData) => {
    try {
      const params = new URLSearchParams({
        ...drillDown.filters,
        level: drillDown.level.toString()
      });
      
      const response = await fetch(`/api/admin/analytics/drill-down?${params}`);
      if (!response.ok) throw new Error('Failed to load drill-down data');
      
      const data = await response.json();
      
      setDrillDownStack(prev => 
        prev.map(item => 
          item.level === drillDown.level 
            ? { ...item, data }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to load drill-down data:', err);
    }
  };

  // Navigate back in drill-down
  const handleBreadcrumbClick = (level: number) => {
    setDrillDownStack(prev => prev.slice(0, level));
  };

  // Get current filters
  const getCurrentFilters = () => {
    return drillDownStack.length > 0 
      ? drillDownStack[drillDownStack.length - 1].filters: {};
  };

  // Get current breadcrumb
  const getCurrentBreadcrumb = () => {
    return drillDownStack.length > 0 
      ? drillDownStack[drillDownStack.length - 1].breadcrumb: ['Dashboard'];
  };

  // Calculate trend indicator
  const getTrendIndicator = (metric: AnalyticsMetric) => {
    const { trend, trendPercentage } = metric;
    const color = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
    const icon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
    
    return (
      <span className={`text-sm ${color} flex items-center`}>
        <span className="mr-1">{icon}</span>
        {Math.abs(trendPercentage).toFixed(1)}%
      </span>
    );
  };

  // Render chart based on type
  const renderChart = () => {
    const currentData = drillDownStack.length > 0 
      ? drillDownStack[drillDownStack.length - 1].data: chartData;

    const chartProps = {
      data: currentData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
      onClick: handleChartClick
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={colors.primary} 
              fill={colors.primary}
              fillOpacity={0.3}
            />
            {comparativeData.length > 0 && (
              <Area 
                type="monotone" 
                dataKey="previousValue" 
                stroke={colors.secondary} 
                fill={colors.secondary}
                fillOpacity={0.2}
              />
            )}
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill={colors.primary} />
            {comparativeData.length > 0 && (
              <Bar dataKey="previousValue" fill={colors.secondary} />
            )}
          </BarChart>
        );
      
      default:
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={colors.primary} 
              strokeWidth={2}
              dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
            />
            {comparativeData.length > 0 && (
              <Line 
                type="monotone" 
                dataKey="previousValue" 
                stroke={colors.secondary} 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: colors.secondary, strokeWidth: 2, r: 4 }}
              />
            )}
          </LineChart>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Analytics</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadAnalyticsData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="interactive-analytics-dashboard space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Interactive Analytics</h2>
            <p className="text-gray-600 mt-1">
              Explore your data with drill-down capabilities and real-time updates
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Date Range Selector */}
            <DateRangeSelector
              value={dateRange}
              onChange={handleDateRangeChange}
              className="w-64"
            />
            
            {/* Real-time indicator */}
            {enableRealTime && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600 capitalize">
                  {connectionStatus}
                </span>
                {lastUpdate && (
                  <span className="text-xs text-gray-500">
                    Updated {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {drillDownStack.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <nav className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => handleBreadcrumbClick(0)}
              className="text-primary hover:text-primary-dark transition-colors"
            >
              Dashboard
            </button>
            {getCurrentBreadcrumb().slice(1).map((crumb, index) => (
              <React.Fragment key={index}>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => handleBreadcrumbClick(index + 1)}
                  className="text-primary hover:text-primary-dark transition-colors"
                >
                  {crumb}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsData.map((metric) => (
          <div key={metric.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{metric.name}</h3>
              {getTrendIndicator(metric)}
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metric.value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              vs {metric.previousValue.toLocaleString()} previous period
            </div>
          </div>
        ))}
      </div>

      {/* Chart Controls and Visualization */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Chart Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['line', 'area', 'bar'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                    chartType === type
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            
            <button
              onClick={loadAnalyticsData}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
          
          {allowDrillDown && (
            <div className="text-sm text-gray-500">
              💡 Click on chart elements to drill down for detailed insights
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparative Analytics */}
      {comparativeData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ComparativeAnalyticsChart
            data={comparativeData}
            title="Period-over-Period Comparison"
            currentPeriodLabel="Current Period"
            previousPeriodLabel="Previous Period"
            chartType={chartType}
            showTrendIndicators={true}
            showBrush={chartData.length > 20}
            onDataPointClick={handleChartClick}
            formatValue={(value) => value.toLocaleString()}
          />
        </div>
      )}

      {/* Real-time Alerts */}
      {enableRealTime && realTimeAlerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Alerts</h3>
          <div className="space-y-3">
            {realTimeAlerts.slice(0, 3).map((alert, index) => (
              <div
                key={index}
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
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
