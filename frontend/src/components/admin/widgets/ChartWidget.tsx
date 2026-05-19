'use client';

import React from 'react';
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
import { DashboardWidget } from '@/types/dashboard-widgets';
import { BaseWidget } from './BaseWidget';

interface ChartWidgetProps {
  widget: DashboardWidget;
  isEditing?: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widget: DashboardWidget) => void;
}

interface ChartData {
  name: string;
  value: number;
  category?: string;
  date?: string;
  [key: string]: any;
}

export function ChartWidget({
  widget,
  isEditing,
  onUpdate,
  onDelete,
  onDuplicate
}: ChartWidgetProps) {
  const data: ChartData[] = widget.data || [];
  const chartType = widget.config.chartType || 'line';
  
  const colors = {
    primary: '#3B82F6',
    blue: '#2563EB',
    green: '#16A34A',
    yellow: '#CA8A04',
    red: '#DC2626',
    purple: '#9333EA'
  };

  const primaryColor = colors[widget.config.colorScheme || 'primary'];
  const pieColors = [primaryColor, '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={primaryColor}
              fill={primaryColor}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="value" fill={primaryColor} radius={[2, 2, 0, 0]} />
          </BarChart>
        );

      case 'pie':
      case 'donut':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={chartType === 'donut' ? 40 : 0}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={primaryColor}
              strokeWidth={2}
              dot={{ fill: primaryColor, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: primaryColor, strokeWidth: 2 }}
            />
          </LineChart>
        );
    }
  };

  const getDataSummary = () => {
    if (data.length === 0) return null;
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const average = total / data.length;
    const max = Math.max(...data.map(item => item.value));
    const min = Math.min(...data.map(item => item.value));

    return { total, average, max, min };
  };

  const summary = getDataSummary();

  return (
    <BaseWidget
      widget={widget}
      isEditing={isEditing}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    >
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <i className="fas fa-chart-line text-3xl mb-2"></i>
            <p>No data available</p>
          </div>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>

          {/* Data Summary */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {summary.total.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {Math.round(summary.average).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Average</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {summary.max.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Max</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {summary.min.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Min</div>
              </div>
            </div>
          )}
        </>
      )}
    </BaseWidget>
  );
}