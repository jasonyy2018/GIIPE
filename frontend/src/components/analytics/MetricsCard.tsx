'use client';

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: number | string;
  growth?: number;
  icon?: ReactNode;
  format?: 'number' | 'percentage' | 'currency' | 'time';
  className?: string;
}

export function MetricsCard({
  title,
  value,
  growth,
  icon,
  format = 'number',
  className = '',
}: MetricsCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'percentage':
        return `${val}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      case 'time':
        return `${Math.floor(val / 3600)}h ${Math.floor((val % 3600) / 60)}m`;
      default:
        return val.toLocaleString();
    }
  };

  const getGrowthIcon = () => {
    if (growth === undefined || growth === 0) return <Minus className="w-4 h-4" />;
    return growth > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getGrowthColor = () => {
    if (growth === undefined || growth === 0) return 'text-gray-500';
    return growth > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{formatValue(value)}</p>
          {growth !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${getGrowthColor()}`}>
              {getGrowthIcon()}
              <span className="ml-1">
                {growth === 0 ? 'No change' : `${Math.abs(growth)}% ${growth > 0 ? 'increase' : 'decrease'}`}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-primary">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}