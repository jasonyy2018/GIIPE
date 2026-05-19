'use client';

import React from 'react';
import { DashboardWidget } from '@/types/dashboard-widgets';
import { BaseWidget } from './BaseWidget';

interface ProgressWidgetProps {
  widget: DashboardWidget;
  isEditing?: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widget: DashboardWidget) => void;
}

interface ProgressData {
  items: ProgressItem[];
  overall?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface ProgressItem {
  id: string;
  label: string;
  current: number;
  target: number;
  percentage: number;
  status?: 'on-track' | 'behind' | 'ahead' | 'completed';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  unit?: string;
}

export function ProgressWidget({
  widget,
  isEditing,
  onUpdate,
  onDelete,
  onDuplicate
}: ProgressWidgetProps) {
  const data: ProgressData = widget.data || { items: [] };

  const getProgressColor = (item: ProgressItem) => {
    if (item.color) {
      const colors = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        red: 'bg-red-500',
        purple: 'bg-purple-500'
      };
      return colors[item.color];
    }

    // Auto-determine color based on status or percentage
    if (item.status) {
      switch (item.status) {
        case 'completed':
          return 'bg-green-500';
        case 'ahead':
          return 'bg-blue-500';
        case 'on-track':
          return 'bg-green-500';
        case 'behind':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    }

    // Color based on percentage
    if (item.percentage >= 100) return 'bg-green-500';
    if (item.percentage >= 75) return 'bg-blue-500';
    if (item.percentage >= 50) return 'bg-yellow-500';
    if (item.percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'fas fa-check-circle text-green-600';
      case 'ahead':
        return 'fas fa-arrow-up text-primary';
      case 'on-track':
        return 'fas fa-check text-green-600';
      case 'behind':
        return 'fas fa-exclamation-triangle text-red-600';
      default:
        return 'fas fa-clock text-gray-600';
    }
  };

  const formatValue = (value: number, unit?: string) => {
    const formatted = value.toLocaleString();
    return unit ? `${formatted} ${unit}` : formatted;
  };

  return (
    <BaseWidget
      widget={widget}
      isEditing={isEditing}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    >
      {data.items.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <i className="fas fa-tasks text-2xl mb-2"></i>
            <p>No progress items</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall Progress */}
          {data.overall && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Overall Progress</h4>
                <span className="text-sm font-semibold text-gray-900">
                  {data.overall.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(data.overall.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{data.overall.completed} completed</span>
                <span>{data.overall.total} total</span>
              </div>
            </div>
          )}

          {/* Individual Progress Items */}
          <div className="space-y-3">
            {data.items.map((item, index) => (
              <div key={item.id || index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {item.label}
                    </span>
                    {item.status && (
                      <i className={`${getStatusIcon(item.status)} text-xs`}></i>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {formatValue(item.current, item.unit)} / {formatValue(item.target, item.unit)}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(item)}`}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {data.items.filter(item => item.percentage >= 100).length}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-primary">
                {data.items.filter(item => item.percentage >= 50 && item.percentage < 100).length}
              </div>
              <div className="text-xs text-gray-500">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {data.items.filter(item => item.percentage < 50).length}
              </div>
              <div className="text-xs text-gray-500">Behind</div>
            </div>
          </div>
        </div>
      )}
    </BaseWidget>
  );
}