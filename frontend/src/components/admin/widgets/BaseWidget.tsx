'use client';

import React, { useState, useEffect } from 'react';
import { DashboardWidget, WidgetAction } from '@/types/dashboard-widgets';
import { useWidgetData } from '@/hooks/useWidgetData';

interface BaseWidgetProps {
  widget: DashboardWidget;
  isEditing?: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widget: DashboardWidget) => void;
  children: React.ReactNode;
  actions?: WidgetAction[];
}

export function BaseWidget({
  widget,
  isEditing = false,
  onUpdate,
  onDelete,
  onDuplicate,
  children,
  actions = []
}: BaseWidgetProps) {
  const [showActions, setShowActions] = useState(false);
  
  // Use widget data hook for automatic data fetching
  const { data, loading, error, lastFetch, refetch } = useWidgetData({
    widget,
    enabled: !isEditing && !!widget.config.dataSource
  });

  // Update widget data when new data is fetched
  useEffect(() => {
    if (data && onUpdate) {
      const updatedWidget = { ...widget, data, updatedAt: new Date() };
      onUpdate(updatedWidget);
    }
  }, [data, widget, onUpdate]);

  const handleRefresh = async () => {
    if (loading) return;
    await refetch();
  };

  const handleAction = (action: WidgetAction) => {
    if (action.requiresConfirmation) {
      const confirmed = window.confirm(
        action.confirmMessage || `Are you sure you want to ${action.label.toLowerCase()}?`
      );
      if (!confirmed) return;
    }
    action.action(widget);
  };

  const defaultActions: WidgetAction[] = [
    {
      id: 'refresh',
      label: 'Refresh',
      icon: 'fas fa-sync-alt',
      action: () => handleRefresh()
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: 'fas fa-copy',
      action: (w) => onDuplicate?.(w)
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'fas fa-trash',
      action: (w) => onDelete?.(w.id),
      requiresConfirmation: true,
      confirmMessage: 'Are you sure you want to delete this widget?'
    }
  ];

  const allActions = [...actions, ...defaultActions];

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200 ${
        isEditing ? 'ring-2 ring-blue-400 ring-opacity-50' : 'hover:shadow-md'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Widget Header */}
      {widget.config.showHeader !== false && (
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-900">
              {widget.config.customTitle || widget.title}
            </h3>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
            {error && (
              <div className="text-red-500" title={error}>
                <i className="fas fa-exclamation-triangle text-xs"></i>
              </div>
            )}
          </div>
          
          {/* Widget Actions */}
          <div className={`flex items-center space-x-1 transition-opacity duration-200 ${
            showActions || isEditing ? 'opacity-100' : 'opacity-0'
          }`}>
            {allActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={action.label}
              >
                <i className={`${action.icon} text-xs`}></i>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Widget Content */}
      <div className="p-4">
        {children}
      </div>

      {/* Widget Footer */}
      {widget.config.showFooter && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Refresh: {widget.refreshInterval > 0 ? `${widget.refreshInterval}s` : 'Manual'}
            </span>
            {lastFetch && (
              <span>
                Updated: {lastFetch.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Editing Overlay */}
      {isEditing && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg flex items-center justify-center">
          <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-blue-200">
            <span className="text-xs font-medium text-primary">Editing</span>
          </div>
        </div>
      )}
    </div>
  );
}