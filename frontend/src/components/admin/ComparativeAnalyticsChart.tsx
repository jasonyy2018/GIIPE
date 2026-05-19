'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';

interface ComparativeDataPoint {
  date: string;
  current: number;
  previous: number;
  category?: string;
  metadata?: Record<string, any>;
}

interface TrendIndicator {
  value: number;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
  significance: 'high' | 'medium' | 'low';
}

interface ComparativeAnalyticsChartProps {
  data: ComparativeDataPoint[];
  title: string;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  chartType?: 'line' | 'area' | 'bar';
  showTrendIndicators?: boolean;
  showBrush?: boolean;
  height?: number;
  onDataPointClick?: (data: ComparativeDataPoint, event: any) => void;
  formatValue?: (value: number) => string;
  className?: string;
}

export function ComparativeAnalyticsChart({
  data,
  title,
  currentPeriodLabel,
  previousPeriodLabel,
  chartType = 'line',
  showTrendIndicators = true,
  showBrush = false,
  height = 400,
  onDataPointClick,
  formatValue = (value) => value.toLocaleString(),
  className = ''
}: ComparativeAnalyticsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<'current' | 'previous' | 'both'>('both');
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);
  const [brushEnabled, setBrushEnabled] = useState(showBrush);

  // Calculate trend indicators
  const trendIndicators = useMemo(() => {
    if (!data.length) return null;

    const currentTotal = data.reduce((sum, point) => sum + point.current, 0);
    const previousTotal = data.reduce((sum, point) => sum + point.previous, 0);
    
    const percentageChange = previousTotal === 0 
      ? (currentTotal > 0 ? 100 : 0)
      : ((currentTotal - previousTotal) / previousTotal) * 100;
    
    const trend: 'up' | 'down' | 'stable' = 
      Math.abs(percentageChange) < 1 ? 'stable' :
      percentageChange > 0 ? 'up' : 'down';
    
    const significance: 'high' | 'medium' | 'low' = 
      Math.abs(percentageChange) > 20 ? 'high' :
      Math.abs(percentageChange) > 5 ? 'medium' : 'low';

    return {
      current: {
        value: currentTotal,
        trend,
        percentage: Math.abs(percentageChange),
        significance
      },
      average: {
        current: currentTotal / data.length,
        previous: previousTotal / data.length,
        trend,
        percentage: Math.abs(percentageChange),
        significance
      }
    };
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const currentValue = payload.find((p: any) => p.dataKey === 'current')?.value || 0;
    const previousValue = payload.find((p: any) => p.dataKey === 'previous')?.value || 0;
    const change = currentValue - previousValue;
    const changePercent = previousValue === 0 ? 0 : (change / previousValue) * 100;

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-primary text-sm">{currentPeriodLabel}:</span>
            <span className="font-medium">{formatValue(currentValue)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">{previousPeriodLabel}:</span>
            <span className="font-medium">{formatValue(previousValue)}</span>
          </div>
          
          <div className="border-t border-gray-200 pt-1 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Change:</span>
              <span className={`font-medium text-sm ${
                change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {change > 0 ? '+' : ''}{formatValue(change)} ({changePercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Handle chart click
  const handleChartClick = (data: any, event: any) => {
    if (onDataPointClick && data) {
      const originalData = data.payload;
      onDataPointClick(originalData, event);
    }
  };

  // Filter data based on brush selection
  const filteredData = useMemo(() => {
    if (!brushDomain) return data;
    const [start, end] = brushDomain;
    return data.slice(start, end + 1);
  }, [data, brushDomain]);

  // Render trend indicator
  const renderTrendIndicator = (indicator: TrendIndicator, label: string) => {
    const { trend, percentage, significance } = indicator;
    
    const trendColor = 
      trend === 'up' ? 'text-green-600' :
      trend === 'down' ? 'text-red-600' : 'text-gray-600';
    
    const significanceColor = 
      significance === 'high' ? 'bg-red-100 text-red-800' :
      significance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
      'bg-gray-100 text-gray-800';
    
    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">{label}:</span>
        <span className={`text-sm font-medium ${trendColor}`}>
          {trendIcon} {percentage.toFixed(1)}%
        </span>
        <span className={`px-2 py-1 text-xs rounded-full ${significanceColor}`}>
          {significance}
        </span>
      </div>
    );
  };

  // Render chart based on type
  const renderChart = () => {
    const chartData = brushEnabled ? data : filteredData;
    const chartProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
      onClick: handleChartClick
    };

    const currentLineProps = {
      type: 'monotone' as const,
      dataKey: 'current',
      stroke: '#3B82F6',
      strokeWidth: 2,
      dot: { fill: '#3B82F6', strokeWidth: 2, r: 4 },
      name: currentPeriodLabel
    };

    const previousLineProps = {
      type: 'monotone' as const,
      dataKey: 'previous',
      stroke: '#10B981',
      strokeWidth: 2,
      strokeDasharray: '5 5',
      dot: { fill: '#10B981', strokeWidth: 2, r: 4 },
      name: previousPeriodLabel
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={formatValue} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {(selectedMetric === 'current' || selectedMetric === 'both') && (
              <Area
                {...currentLineProps}
                fill="#3B82F6"
                fillOpacity={0.3}
              />
            )}
            {(selectedMetric === 'previous' || selectedMetric === 'both') && (
              <Area
                {...previousLineProps}
                fill="#10B981"
                fillOpacity={0.2}
              />
            )}
            {brushEnabled && (
              <Brush
                dataKey="date"
                height={30}
                stroke="#8884d8"
                onChange={(domain: any) => setBrushDomain(domain ? [domain.startIndex, domain.endIndex] : null)}
              />
            )}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={formatValue} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {(selectedMetric === 'current' || selectedMetric === 'both') && (
              <Bar dataKey="current" fill="#3B82F6" name={currentPeriodLabel} />
            )}
            {(selectedMetric === 'previous' || selectedMetric === 'both') && (
              <Bar dataKey="previous" fill="#10B981" name={previousPeriodLabel} />
            )}
            {brushEnabled && (
              <Brush
                dataKey="date"
                height={30}
                stroke="#8884d8"
                onChange={(domain: any) => setBrushDomain(domain ? [domain.startIndex, domain.endIndex] : null)}
              />
            )}
          </BarChart>
        );

      default:
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={formatValue} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {(selectedMetric === 'current' || selectedMetric === 'both') && (
              <Line {...currentLineProps} />
            )}
            {(selectedMetric === 'previous' || selectedMetric === 'both') && (
              <Line {...previousLineProps} />
            )}
            {brushEnabled && (
              <Brush
                dataKey="date"
                height={30}
                stroke="#8884d8"
                onChange={(domain: any) => setBrushDomain(domain ? [domain.startIndex, domain.endIndex] : null)}
              />
            )}
          </LineChart>
        );
    }
  };

  return (
    <div className={`comparative-analytics-chart ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {showTrendIndicators && trendIndicators && (
            <div className="mt-2 space-y-1">
              {renderTrendIndicator(trendIndicators.current, 'Overall Change')}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          {/* Metric Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { id: 'both', label: 'Both' },
              { id: 'current', label: 'Current' },
              { id: 'previous', label: 'Previous' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedMetric(option.id as any)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedMetric === option.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Brush Toggle */}
          {data.length > 10 && (
            <button
              onClick={() => setBrushEnabled(!brushEnabled)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                brushEnabled
                  ? 'bg-light text-primary-dark'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              {brushEnabled ? 'Hide' : 'Show'} Zoom
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      {showTrendIndicators && trendIndicators && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Period Totals</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{currentPeriodLabel}:</span>
                <span className="font-medium">{formatValue(trendIndicators.current.value)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{previousPeriodLabel}:</span>
                <span className="font-medium">
                  {formatValue(data.reduce((sum, point) => sum + point.previous, 0))}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Daily Averages</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{currentPeriodLabel}:</span>
                <span className="font-medium">{formatValue(trendIndicators.average.current)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{previousPeriodLabel}:</span>
                <span className="font-medium">{formatValue(trendIndicators.average.previous)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
