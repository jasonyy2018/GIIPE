'use client';

import React from 'react';
import { DashboardWidget } from '@/types/dashboard-widgets';
import { BaseWidget } from './BaseWidget';

interface MetricWidgetProps {
  widget: DashboardWidget;
  isEditing?: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widget: DashboardWidget) => void;
}

interface MetricData {
  value: number;
  previousValue?: number;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  unit?: string;
  target?: number;
  status?: 'normal' | 'warning' | 'critical';
}

export function MetricWidget({
  widget,
  isEditing,
  onUpdate,
  onDelete,
  onDuplicate
}: MetricWidgetProps) {
  const data: MetricData = widget.data || {
    value: 0,
    previousValue: 0,
    trend: 'stable',
    trendPercentage: 0,
    unit: '',
    status: 'normal'
  };

  const getColorScheme = () => {
    const scheme = widget.config.colorScheme || 'primary';
    const colors = {
      primary: { bg: 'bg-blue-50', text: 'text-primary', border: 'border-blue-200' },
      blue: { bg: 'bg-blue-50', text: 'text-primary', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' }
    };
    return colors[scheme];
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'warning':
        return { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' };
      case 'critical':
        return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
      default:
        return getColorScheme();
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const getTrendIcon = () => {
    switch (data.trend) {
      case 'up':
        return 'fas fa-arrow-up';
      case 'down':
        return 'fas fa-arrow-down';
      default:
        return 'fas fa-minus';
    }
  };

  const getTrendColor = () => {
    switch (data.trend) {
      case 'up':
        return 'text-green-600 bg-green-100';
      case 'down':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const colorScheme = getStatusColor();

  return (
    <BaseWidget
      widget={widget}
      isEditing={isEditing}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    >
      <div className="flex items-center justify-between">
        {/* Main Metric */}
        <div className="flex-1">
          <div className="flex items-baseline space-x-2 mb-2">
            <span className={`text-3xl font-bold ${colorScheme.text}`}>
              {formatValue(data.value)}
            </span>
            {data.unit && (
              <span className="text-sm text-gray-500">{data.unit}</span>
            )}
          </div>
          
          {/* Trend Indicator */}
          {widget.config.showTrend && data.trend && data.trendPercentage !== undefined && (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}>
              <i className={`${getTrendIcon()} mr-1`}></i>
              {Math.abs(data.trendPercentage).toFixed(1)}%
            </div>
          )}
          
          {/* Previous Value Comparison */}
          {data.previousValue !== undefined && (
            <div className="text-xs text-gray-500 mt-1">
              vs {formatValue(data.previousValue)} previous period
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className={`p-3 rounded-lg ${colorScheme.bg}`}>
          <div className={`w-8 h-8 rounded-full ${colorScheme.text} flex items-center justify-center`}>
            {data.status === 'critical' && <i className="fas fa-exclamation-triangle"></i>}
            {data.status === 'warning' && <i className="fas fa-exclamation-circle"></i>}
            {data.status === 'normal' && <i className="fas fa-check-circle"></i>}
          </div>
        </div>
      </div>

      {/* Progress Bar (if target is set) */}
      {data.target && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress to Target</span>
            <span>{((data.value / data.target) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${colorScheme.text.replace('text-', 'bg-')}`}
              style={{ width: `${Math.min((data.value / data.target) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Thresholds */}
      {widget.config.thresholds && (
        <div className="mt-3 flex justify-between text-xs text-gray-500">
          {widget.config.thresholds.warning && (
            <span>Warning: {formatValue(widget.config.thresholds.warning)}</span>
          )}
          {widget.config.thresholds.critical && (
            <span>Critical: {formatValue(widget.config.thresholds.critical)}</span>
          )}
        </div>
      )}
    </BaseWidget>
  );
}