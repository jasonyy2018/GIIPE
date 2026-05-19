'use client';

import React from 'react';
import { DashboardWidget } from '@/types/dashboard-widgets';
import { BaseWidget } from './BaseWidget';

interface StatusWidgetProps {
  widget: DashboardWidget;
  isEditing?: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widget: DashboardWidget) => void;
}

interface StatusData {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  services: ServiceStatus[];
  uptime?: number;
  lastCheck?: string;
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  responseTime?: number;
  lastCheck?: string;
  message?: string;
}

export function StatusWidget({
  widget,
  isEditing,
  onUpdate,
  onDelete,
  onDuplicate
}: StatusWidgetProps) {
  const data: StatusData = widget.data || {
    overall: 'unknown',
    services: []
  };

  const getOverallStatusColor = () => {
    switch (data.overall) {
      case 'healthy':
        return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500' };
      case 'warning':
        return { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', dot: 'bg-yellow-500' };
      case 'critical':
        return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-500' };
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return { text: 'text-green-600', dot: 'bg-green-500' };
      case 'degraded':
        return { text: 'text-yellow-600', dot: 'bg-yellow-500' };
      case 'offline':
        return { text: 'text-red-600', dot: 'bg-red-500' };
      case 'maintenance':
        return { text: 'text-primary', dot: 'bg-blue-500' };
      default:
        return { text: 'text-gray-600', dot: 'bg-gray-500' };
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatResponseTime = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const overallColors = getOverallStatusColor();

  return (
    <BaseWidget
      widget={widget}
      isEditing={isEditing}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    >
      {/* Overall Status */}
      <div className={`p-4 rounded-lg border ${overallColors.border} ${overallColors.bg} mb-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${overallColors.dot} animate-pulse`}></div>
            <div>
              <h3 className={`font-medium ${overallColors.text} capitalize`}>
                System {data.overall}
              </h3>
              {data.uptime && (
                <p className="text-sm text-gray-600">
                  Uptime: {formatUptime(data.uptime)}
                </p>
              )}
            </div>
          </div>
          
          {data.lastCheck && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Last Check</p>
              <p className="text-xs text-gray-600">
                {new Date(data.lastCheck).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Service Status List */}
      {data.services.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Services</h4>
          {data.services.map((service, index) => {
            const serviceColors = getServiceStatusColor(service.status);
            
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${serviceColors.dot}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className={`text-xs capitalize ${serviceColors.text}`}>
                      {service.status}
                      {service.responseTime && ` • ${formatResponseTime(service.responseTime)}`}
                    </p>
                    {service.message && (
                      <p className="text-xs text-gray-500 mt-1">{service.message}</p>
                    )}
                  </div>
                </div>
                
                {service.lastCheck && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(service.lastCheck).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No Services Message */}
      {data.services.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-server text-2xl mb-2"></i>
          <p>No services configured</p>
        </div>
      )}
    </BaseWidget>
  );
}
