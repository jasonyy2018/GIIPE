'use client';

interface AdminStatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color?: 'primary' | 'green' | 'blue' | 'yellow' | 'red' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  onClick?: () => void;
}

export default function AdminStatsCard({ 
  title, 
  value, 
  icon, 
  color = 'primary', 
  trend, 
  subtitle,
  onClick 
}: AdminStatsCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    green: 'text-green-600 bg-green-100',
    blue: 'text-primary bg-light', // Changed from blue to primary theme
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
    purple: 'text-purple-600 bg-purple-100'
  };

  const trendColorClasses = {
    positive: 'text-green-600 bg-green-100',
    negative: 'text-red-600 bg-red-100'
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm p-6 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <i className={`${icon} text-xl`}></i>
          </div>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                trendColorClasses[trend.isPositive ? 'positive' : 'negative']
              }`}>
                <i className={`fas fa-arrow-${trend.isPositive ? 'up' : 'down'} mr-1`}></i>
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}