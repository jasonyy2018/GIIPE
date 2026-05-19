'use client';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color?: 'primary' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  subtitle?: string;
  onClick?: () => void;
  loading?: boolean;
}

export default function StatsCard({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  subtitle,
  onClick,
  loading = false
}: StatsCardProps) {
  const colorClasses = {
    primary: 'bg-primary text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    red: 'bg-red-500 text-white',
    purple: 'bg-purple-500 text-white'
  };

  const lightColorClasses = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-50 text-primary',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm p-6 border border-gray-200 transition-all duration-300 hover:shadow-lg ${
        onClick ? 'cursor-pointer hover:-translate-y-1' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
          
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`inline-flex items-center text-sm font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <i className={`fas fa-arrow-${trend.isPositive ? 'up' : 'down'} mr-1`}></i>
                {Math.abs(trend.value)}%
              </span>
              {trend.period && (
                <span className="text-gray-500 text-sm ml-2">{trend.period}</span>
              )}
            </div>
          )}
          
          {subtitle && (
            <p className="text-gray-600 text-sm mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${lightColorClasses[color]}`}>
          <i className={`${icon} text-xl`}></i>
        </div>
      </div>
    </div>
  );
}