'use client';

import { ReactNode } from 'react';

export interface WidgetProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onSettings?: () => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export default function DashboardWidget({
  id,
  title,
  children,
  className = '',
  loading = false,
  error,
  onRefresh,
  onSettings,
  collapsible = false,
  defaultCollapsed = false
}: WidgetProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
            </button>
          )}
          {onSettings && (
            <button
              onClick={onSettings}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Settings"
            >
              <i className="fas fa-cog"></i>
            </button>
          )}
          {collapsible && (
            <button
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Collapse"
            >
              <i className="fas fa-chevron-up"></i>
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4">
        {error ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">
              <i className="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        ) : loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}