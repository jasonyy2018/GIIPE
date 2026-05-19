'use client';

import React from 'react';
import { DashboardWidget } from '@/types/dashboard-widgets';
import { BaseWidget } from './BaseWidget';

interface ActivityWidgetProps {
  widget: DashboardWidget;
  isEditing?: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widget: DashboardWidget) => void;
}

interface ActivityItem {
  id: string;
  type: 'user' | 'event' | 'content' | 'system' | 'security';
  action: string;
  user?: string;
  target?: string;
  timestamp: string;
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export function ActivityWidget({
  widget,
  isEditing,
  onUpdate,
  onDelete,
  onDuplicate
}: ActivityWidgetProps) {
  const activities: ActivityItem[] = widget.data || [];
  const maxItems = widget.config.maxItems || 10;
  const displayActivities = activities.slice(0, maxItems);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return 'fas fa-user';
      case 'event':
        return 'fas fa-calendar';
      case 'content':
        return 'fas fa-file-alt';
      case 'system':
        return 'fas fa-cog';
      case 'security':
        return 'fas fa-shield-alt';
      default:
        return 'fas fa-circle';
    }
  };

  const getActivityColor = (type: string, severity?: string) => {
    if (severity) {
      switch (severity) {
        case 'critical':
          return 'text-red-600 bg-red-100';
        case 'high':
          return 'text-orange-600 bg-orange-100';
        case 'medium':
          return 'text-yellow-600 bg-yellow-100';
        default:
          return 'text-primary bg-light';
      }
    }

    switch (type) {
      case 'user':
        return 'text-primary bg-light';
      case 'event':
        return 'text-green-600 bg-green-100';
      case 'content':
        return 'text-purple-600 bg-purple-100';
      case 'system':
        return 'text-gray-600 bg-gray-100';
      case 'security':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
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

  const formatAction = (activity: ActivityItem) => {
    let text = activity.action;
    if (activity.target) {
      text += ` ${activity.target}`;
    }
    return text;
  };

  return (
    <BaseWidget
      widget={widget}
      isEditing={isEditing}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    >
      {displayActivities.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <i className="fas fa-history text-2xl mb-2"></i>
            <p>No recent activity</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayActivities.map((activity, index) => {
            const colorClass = getActivityColor(activity.type, activity.severity);
            
            return (
              <div key={activity.id || index} className="flex items-start space-x-3">
                {/* Activity Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                  <i className={`${getActivityIcon(activity.type)} text-sm`}></i>
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-900">
                      {activity.user && (
                        <span className="font-medium">{activity.user}</span>
                      )}
                      {activity.user && ' '}
                      <span>{formatAction(activity)}</span>
                    </p>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                  
                  {activity.details && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {activity.details}
                    </p>
                  )}
                  
                  {activity.severity && activity.severity !== 'low' && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                      activity.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      activity.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {activity.severity.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Show More Indicator */}
          {activities.length > maxItems && (
            <div className="text-center pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Showing {maxItems} of {activities.length} activities
              </span>
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  );
}