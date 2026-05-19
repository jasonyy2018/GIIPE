'use client';

import React from 'react';
import { DashboardWidget } from '@/types/dashboard-widgets';
import { BaseWidget } from './BaseWidget';

interface ListWidgetProps {
  widget: DashboardWidget;
  isEditing?: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widget: DashboardWidget) => void;
}

interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  status?: 'success' | 'warning' | 'error' | 'info';
  icon?: string;
  timestamp?: string;
  link?: string;
}

export function ListWidget({
  widget,
  isEditing,
  onUpdate,
  onDelete,
  onDuplicate
}: ListWidgetProps) {
  const items: ListItem[] = widget.data || [];
  const maxItems = widget.config.maxItems || 5;
  const displayItems = items.slice(0, maxItems);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'info':
        return 'text-primary bg-light';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return 'fas fa-check-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'error':
        return 'fas fa-times-circle';
      case 'info':
        return 'fas fa-info-circle';
      default:
        return 'fas fa-circle';
    }
  };

  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <BaseWidget
      widget={widget}
      isEditing={isEditing}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    >
      {displayItems.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <i className="fas fa-list text-2xl mb-2"></i>
            <p>No items to display</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item, index) => (
            <div
              key={item.id || index}
              className={`flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors ${
                item.link ? 'cursor-pointer' : ''
              }`}
              onClick={item.link ? () => window.open(item.link, '_blank') : undefined}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Icon or Status Indicator */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  item.status ? getStatusColor(item.status) : 'bg-gray-100'
                }`}>
                  <i className={`${item.icon || getStatusIcon(item.status)} text-sm`}></i>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </h4>
                    {item.value && (
                      <span className="text-sm font-semibold text-gray-700 ml-2">
                        {formatValue(item.value)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    {item.subtitle && (
                      <p className="text-xs text-gray-500 truncate">
                        {item.subtitle}
                      </p>
                    )}
                    {item.timestamp && (
                      <span className="text-xs text-gray-400 ml-2">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Link Indicator */}
                {item.link && (
                  <div className="flex-shrink-0">
                    <i className="fas fa-external-link-alt text-xs text-gray-400"></i>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Show More Indicator */}
          {items.length > maxItems && (
            <div className="text-center pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Showing {maxItems} of {items.length} items
              </span>
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  );
}