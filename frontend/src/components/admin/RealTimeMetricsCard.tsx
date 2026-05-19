'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MetricData {
  timestamp: string;
  value: number;
}

interface RealTimeMetricsCardProps {
  title: string;
  value: number;
  unit?: string;
  icon: string;
  color: 'primary' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  realTimeData?: any;
  showChart?: boolean;
  threshold?: {
    warning: number;
    critical: number;
  };
}

const colorClasses = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20',
    chart: '#3B82F6'
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-primary',
    border: 'border-blue-200',
    chart: '#2563EB'
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
    chart: '#16A34A'
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    border: 'border-yellow-200',
    chart: '#CA8A04'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    chart: '#DC2626'
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    chart: '#9333EA'
  }
};

export default function RealTimeMetricsCard({
  title,
  value,
  unit = '',
  icon,
  color,
  trend,
  realTimeData,
  showChart = false,
  threshold
}: RealTimeMetricsCardProps) {
  const [chartData, setChartData] = useState<MetricData[]>([]);
  const [isBlinking, setIsBlinking] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);

  const colorClass = colorClasses[color];

  // Update chart data when real-time data changes
  useEffect(() => {
    if (realTimeData) {
      const newDataPoint = {
        timestamp: new Date().toLocaleTimeString(),
        value: realTimeData.value || value
      };

      setChartData(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only last 20 data points
        return updated.slice(-20);
      });

      // Trigger blink animation if value changed significantly
      if (Math.abs(realTimeData.value - previousValue) > previousValue * 0.1) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 1000);
      }
      setPreviousValue(realTimeData.value);
    }
  }, [realTimeData, value, previousValue]);

  // Determine alert level based on thresholds
  const getAlertLevel = () => {
    if (!threshold) return 'normal';
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'normal';
  };

  const alertLevel = getAlertLevel();
  const alertColors = {
    normal: colorClass,
    warning: colorClasses.yellow,
    critical: colorClasses.red
  };

  const currentColorClass = alertColors[alertLevel];

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toFixed(0);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${currentColorClass.border} p-6 transition-all duration-300 ${
      isBlinking ? 'ring-2 ring-blue-400 ring-opacity-75' : ''
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${currentColorClass.bg}`}>
            <i className={`${icon} ${currentColorClass.text} text-xl`}></i>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className={`text-2xl font-bold ${currentColorClass.text} transition-all duration-300`}>
                {formatValue(value)}
                {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
              </p>
              {trend && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  trend.isPositive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <i className={`fas fa-arrow-${trend.isPositive ? 'up' : 'down'} mr-1`}></i>
                  {Math.abs(trend.value)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Real-time indicator */}
        <div className="flex flex-col items-end space-y-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              realTimeData ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            }`}></div>
            <span className="text-xs text-gray-500">
              {realTimeData ? 'Live' : 'Static'}
            </span>
          </div>
          
          {alertLevel !== 'normal' && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              alertLevel === 'critical' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {alertLevel === 'critical' ? 'Critical' : 'Warning'}
            </div>
          )}
        </div>
      </div>

      {/* Mini chart */}
      {showChart && chartData.length > 1 && (
        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={currentColorClass.chart} 
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
              <XAxis dataKey="timestamp" hide />
              <YAxis hide />
              <Tooltip 
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value: number) => [`${formatValue(value)}${unit}`, title]}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Threshold indicators */}
      {threshold && (
        <div className="mt-3 flex justify-between text-xs text-gray-500">
          <span>Warning: {formatValue(threshold.warning)}{unit}</span>
          <span>Critical: {formatValue(threshold.critical)}{unit}</span>
        </div>
      )}
    </div>
  );
}