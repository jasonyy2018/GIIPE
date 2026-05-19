'use client';

import { useState, useEffect } from 'react';
import { userStatsService, UserAnalytics } from '../../services/userStatsService';
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
  ResponsiveContainer 
} from 'recharts';
import { format as formatDate, subDays, subWeeks, subMonths } from 'date-fns';
import { Calendar, Download, Filter, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface PersonalAnalyticsProps {
  userId: string;
  period?: 'daily' | 'weekly' | 'monthly';
  compact?: boolean;
}

interface ChartData {
  date: string;
  pageViews: number;
  eventRegistrations: number;
  contentSaves: number;
  networkConnections: number;
  timeSpent: number;
  engagement: number;
}

interface FilterOptions {
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
  chartType: 'line' | 'area' | 'bar';
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const METRIC_OPTIONS = [
  { key: 'pageViews', label: 'Page Views', color: '#3B82F6' },
  { key: 'eventRegistrations', label: 'Event Registrations', color: '#10B981' },
  { key: 'contentSaves', label: 'Content Saves', color: '#F59E0B' },
  { key: 'networkConnections', label: 'Network Connections', color: '#EF4444' },
  { key: 'timeSpent', label: 'Time Spent (hours)', color: '#8B5CF6' },
  { key: 'engagement', label: 'Engagement Score', color: '#06B6D4' }
];

export default function PersonalAnalytics({ 
  userId, 
  period = 'monthly', 
  compact = false 
}: PersonalAnalyticsProps) {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: subDays(new Date(), 30),
      end: new Date()
    },
    metrics: ['pageViews', 'eventRegistrations', 'engagement'],
    chartType: 'line'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'detailed'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [userId, selectedPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (analytics) {
      generateChartData();
    }
  }, [analytics, filters.dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const userAnalytics = await userStatsService.getUserAnalytics(userId, selectedPeriod);
      setAnalytics(userAnalytics);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = () => {
    if (!analytics) return;

    // Generate sample data for the chart based on the date range
    const data: ChartData[] = [];
    const { start, end } = filters.dateRange;
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      
      // Generate realistic sample data with some variation
      const baseMultiplier = 0.7 + (Math.sin(i * 0.1) * 0.3);
      
      data.push({
        date: formatDate(date, 'MMM dd'),
        pageViews: Math.floor((analytics.metrics.pageViews / daysDiff) * baseMultiplier * (0.8 + Math.random() * 0.4)),
        eventRegistrations: Math.floor((analytics.metrics.eventRegistrations / daysDiff) * baseMultiplier * (0.5 + Math.random() * 1.0)),
        contentSaves: Math.floor((analytics.metrics.contentSaves / daysDiff) * baseMultiplier * (0.6 + Math.random() * 0.8)),
        networkConnections: Math.floor((analytics.metrics.networkConnections / daysDiff) * baseMultiplier * (0.3 + Math.random() * 1.4)),
        timeSpent: Math.floor((analytics.metrics.timeSpent / daysDiff) * baseMultiplier * (0.7 + Math.random() * 0.6) / 60), // Convert to hours
        engagement: Math.floor(analytics.trends.engagement.current * baseMultiplier * (0.85 + Math.random() * 0.3))
      });
    }
    
    setChartData(data);
  };

  const handleRefresh = () => {
    userStatsService.clearCache();
    loadAnalytics();
  };

  const handleExportData = (format: 'csv' | 'json') => {
    if (!analytics || !chartData.length) return;

    const exportData = {
      analytics: analytics,
      chartData: chartData,
      filters: filters,
      exportedAt: new Date().toISOString()
    };

    if (format === 'csv') {
      // Convert chart data to CSV
      const headers = ['Date', ...METRIC_OPTIONS.filter(m => filters.metrics.includes(m.key)).map(m => m.label)];
      const csvContent = [
        headers.join(','),
        ...chartData.map(row => [
          row.date,
          ...filters.metrics.map(metric => row[metric as keyof ChartData])
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Export as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${formatDate(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDateRangeChange = (range: 'week' | 'month' | '3months' | 'custom') => {
    const end = new Date();
    let start: Date;

    switch (range) {
      case 'week':
        start = subWeeks(end, 1);
        break;
      case 'month':
        start = subMonths(end, 1);
        break;
      case '3months':
        start = subMonths(end, 3);
        break;
      default:
        return; // Custom range handled separately
    }

    setFilters(prev => ({
      ...prev,
      dateRange: { start, end }
    }));
  };

  const handleMetricToggle = (metricKey: string) => {
    setFilters(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricKey)
        ? prev.metrics.filter(m => m !== metricKey)
        : [...prev.metrics, metricKey]
    }));
  };

  const renderChart = () => {
    if (!chartData.length) return null;

    const ChartComponent = filters.chartType === 'line' ? LineChart : 
                          filters.chartType === 'area' ? AreaChart : BarChart;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {filters.metrics.map((metric, index) => {
            const metricConfig = METRIC_OPTIONS.find(m => m.key === metric);
            if (!metricConfig) return null;

            if (filters.chartType === 'line') {
              return (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={metricConfig.color}
                  strokeWidth={2}
                  name={metricConfig.label}
                />
              );
            } else if (filters.chartType === 'area') {
              return (
                <Area
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stackId="1"
                  stroke={metricConfig.color}
                  fill={metricConfig.color}
                  fillOpacity={0.6}
                  name={metricConfig.label}
                />
              );
            } else {
              return (
                <Bar
                  key={metric}
                  dataKey={metric}
                  fill={metricConfig.color}
                  name={metricConfig.label}
                />
              );
            }
          })}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = () => {
    if (!analytics) return null;

    const pieData = [
      { name: 'Page Views', value: analytics.metrics.pageViews, color: '#3B82F6' },
      { name: 'Event Registrations', value: analytics.metrics.eventRegistrations * 10, color: '#10B981' },
      { name: 'Content Saves', value: analytics.metrics.contentSaves * 5, color: '#F59E0B' },
      { name: 'Network Connections', value: analytics.metrics.networkConnections * 3, color: '#EF4444' }
    ];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTrendIcon = (changePercent: number) => {
    if (changePercent > 0) return 'fas fa-arrow-up text-green-500';
    if (changePercent < 0) return 'fas fa-arrow-down text-red-500';
    return 'fas fa-minus text-gray-500';
  };

  const getTrendColor = (changePercent: number) => {
    if (changePercent > 0) return 'text-green-600';
    if (changePercent < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">
          <i className="fas fa-chart-line text-2xl"></i>
        </div>
        <p className="text-gray-600 mb-4">{error || 'No analytics available'}</p>
        <button
          onClick={handleRefresh}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Analytics Summary</h4>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{analytics.trends.engagement.current}</div>
            <div className="text-sm text-gray-600">Engagement</div>
            <div className={`text-xs ${getTrendColor(analytics.trends.engagement.changePercent)}`}>
              <i className={getTrendIcon(analytics.trends.engagement.changePercent)}></i>
              {Math.abs(analytics.trends.engagement.changePercent)}%
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{analytics.metrics.pageViews}</div>
            <div className="text-sm text-gray-600">Page Views</div>
            <div className="text-xs text-gray-500">{selectedPeriod}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-semibold text-gray-900">Personal Analytics</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeView === 'overview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('detailed')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeView === 'detailed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
              showFilters
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button
            onClick={handleRefresh}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            title="Refresh"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="space-y-2">
                <button
                  onClick={() => handleDateRangeChange('week')}
                  className="w-full text-left px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Last 7 days
                </button>
                <button
                  onClick={() => handleDateRangeChange('month')}
                  className="w-full text-left px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Last 30 days
                </button>
                <button
                  onClick={() => handleDateRangeChange('3months')}
                  className="w-full text-left px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Last 3 months
                </button>
              </div>
            </div>

            {/* Metrics Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Metrics</label>
              <div className="space-y-2">
                {METRIC_OPTIONS.map((metric) => (
                  <label key={metric.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.metrics.includes(metric.key)}
                      onChange={() => handleMetricToggle(metric.key)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">{metric.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Chart Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="chartType"
                    value="line"
                    checked={filters.chartType === 'line'}
                    onChange={(e) => setFilters(prev => ({ ...prev, chartType: e.target.value as any }))}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Line Chart</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="chartType"
                    value="area"
                    checked={filters.chartType === 'area'}
                    onChange={(e) => setFilters(prev => ({ ...prev, chartType: e.target.value as any }))}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Area Chart</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="chartType"
                    value="bar"
                    checked={filters.chartType === 'bar'}
                    onChange={(e) => setFilters(prev => ({ ...prev, chartType: e.target.value as any }))}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Bar Chart</span>
                </label>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-gray-700">Export Data</h5>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleExportData('csv')}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => handleExportData('json')}
                  className="flex items-center space-x-2 px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'overview' ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Page Views</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.metrics.pageViews}</p>
                </div>
                <div className="w-12 h-12 bg-light rounded-full flex items-center justify-center">
                  <i className="fas fa-eye text-primary"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Time Spent</p>
                  <p className="text-2xl font-bold text-gray-900">{formatTime(analytics.metrics.timeSpent)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-clock text-green-600"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Registrations</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.metrics.eventRegistrations}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-calendar-plus text-purple-600"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Connections</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.metrics.networkConnections}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-users text-orange-600"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Trends */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Trends</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="mb-2">
                  <span className="text-2xl font-bold text-gray-900">{analytics.trends.engagement.current}</span>
                  <span className="text-sm text-gray-500 ml-1">/ 100</span>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">Engagement Score</p>
                <div className={`flex items-center justify-center text-sm ${getTrendColor(analytics.trends.engagement.changePercent)}`}>
                  <i className={`${getTrendIcon(analytics.trends.engagement.changePercent)} mr-1`}></i>
                  {Math.abs(analytics.trends.engagement.changePercent)}% from last {selectedPeriod}
                </div>
              </div>

              <div className="text-center">
                <div className="mb-2">
                  <span className="text-2xl font-bold text-gray-900">{analytics.trends.activity.current}</span>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">Activity Level</p>
                <div className={`flex items-center justify-center text-sm ${getTrendColor(analytics.trends.activity.changePercent)}`}>
                  <i className={`${getTrendIcon(analytics.trends.activity.changePercent)} mr-1`}></i>
                  {Math.abs(analytics.trends.activity.changePercent)}% from last {selectedPeriod}
                </div>
              </div>

              <div className="text-center">
                <div className="mb-2">
                  <span className="text-2xl font-bold text-gray-900">{analytics.trends.growth.current}</span>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">Network Growth</p>
                <div className={`flex items-center justify-center text-sm ${getTrendColor(analytics.trends.growth.changePercent)}`}>
                  <i className={`${getTrendIcon(analytics.trends.growth.changePercent)} mr-1`}></i>
                  {Math.abs(analytics.trends.growth.changePercent)}% from last {selectedPeriod}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Detailed Analytics View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Activity Trends</h4>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600 capitalize">{filters.chartType} Chart</span>
                </div>
              </div>
              {renderChart()}
            </div>

            {/* Distribution Chart */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Activity Distribution</h4>
                <PieChartIcon className="w-5 h-5 text-gray-400" />
              </div>
              {renderPieChart()}
            </div>

            {/* Detailed Metrics */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Metrics</h4>
              <div className="space-y-4">
                {METRIC_OPTIONS.map((metric) => {
                  const value = analytics.metrics[metric.key as keyof typeof analytics.metrics];
                  return (
                    <div key={metric.key} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: metric.color }}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">
          <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
          Insights & Recommendations
        </h4>
        <div className="space-y-3">
          {analytics.trends.engagement.changePercent > 10 && (
            <div className="flex items-start space-x-2">
              <i className="fas fa-check-circle text-green-500 mt-1"></i>
              <p className="text-sm text-gray-700">
                Great job! Your engagement has increased by {analytics.trends.engagement.changePercent}% this {selectedPeriod}.
              </p>
            </div>
          )}
          
          {analytics.metrics.eventRegistrations < 2 && (
            <div className="flex items-start space-x-2">
              <i className="fas fa-info-circle text-blue-500 mt-1"></i>
              <p className="text-sm text-gray-700">
                Consider registering for more events to expand your network and knowledge.
              </p>
            </div>
          )}
          
          {analytics.trends.growth.changePercent < 5 && (
            <div className="flex items-start space-x-2">
              <i className="fas fa-users text-purple-500 mt-1"></i>
              <p className="text-sm text-gray-700">
                Try connecting with more professionals in your field to grow your network.
              </p>
            </div>
          )}

          {analytics.metrics.timeSpent > 300 && (
            <div className="flex items-start space-x-2">
              <i className="fas fa-star text-yellow-500 mt-1"></i>
              <p className="text-sm text-gray-700">
                You&apos;re highly engaged! Consider sharing your insights with the community.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}