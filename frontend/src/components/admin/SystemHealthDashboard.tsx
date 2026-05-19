'use client';

import { useState, useEffect } from 'react';
import RealTimeMetricsCard from './RealTimeMetricsCard';

interface SystemHealth {
  database: string;
  redis: string;
  services: string;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface SystemHealthDashboardProps {
  systemHealth: SystemHealth;
  realTimeMetrics?: any;
  className?: string;
}

export default function SystemHealthDashboard({ 
  systemHealth, 
  realTimeMetrics,
  className = '' 
}: SystemHealthDashboardProps) {
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getServiceStatus = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return { color: 'green', icon: 'fas fa-check-circle' };
      case 'disconnected':
      case 'unhealthy':
        return { color: 'red', icon: 'fas fa-times-circle' };
      case 'warning':
        return { color: 'yellow', icon: 'fas fa-exclamation-triangle' };
      default:
        return { color: 'gray', icon: 'fas fa-question-circle' };
    }
  };

  const getOverallHealthStatus = () => {
    if (systemHealth.database !== 'connected') return 'critical';
    if (systemHealth.memoryUsage > 90 || systemHealth.cpuUsage > 90) return 'critical';
    if (systemHealth.memoryUsage > 75 || systemHealth.cpuUsage > 75) return 'warning';
    return 'healthy';
  };

  const overallStatus = getOverallHealthStatus();
  const statusColors = {
    healthy: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200'
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall System Status */}
      <div className={`rounded-lg border p-4 ${statusColors[overallStatus]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <i className={`fas fa-server text-xl`}></i>
            <div>
              <h3 className="font-medium">System Status</h3>
              <p className="text-sm opacity-75">
                Overall system health: {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Auto-refresh toggle */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Auto-refresh:</label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoRefresh ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Refresh interval selector */}
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1 bg-white"
              >
                <option value={1}>1s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Database Status */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              systemHealth.database === 'connected' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <i className={`${getServiceStatus(systemHealth.database).icon} ${
                systemHealth.database === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}></i>
            </div>
            <div>
              <p className="font-medium text-gray-900">Database</p>
              <p className={`text-sm ${
                systemHealth.database === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                {systemHealth.database.charAt(0).toUpperCase() + systemHealth.database.slice(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Redis Status */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              systemHealth.redis === 'connected' ? 'bg-green-50' : 'bg-yellow-50'
            }`}>
              <i className={`${getServiceStatus(systemHealth.redis).icon} ${
                systemHealth.redis === 'connected' ? 'text-green-600' : 'text-yellow-600'
              }`}></i>
            </div>
            <div>
              <p className="font-medium text-gray-900">Redis Cache</p>
              <p className={`text-sm ${
                systemHealth.redis === 'connected' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {systemHealth.redis.charAt(0).toUpperCase() + systemHealth.redis.slice(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              systemHealth.services === 'healthy' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <i className={`${getServiceStatus(systemHealth.services).icon} ${
                systemHealth.services === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}></i>
            </div>
            <div>
              <p className="font-medium text-gray-900">Services</p>
              <p className={`text-sm ${
                systemHealth.services === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {systemHealth.services.charAt(0).toUpperCase() + systemHealth.services.slice(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RealTimeMetricsCard
          title="Memory Usage"
          value={systemHealth.memoryUsage}
          unit="%"
          icon="fas fa-memory"
          color={systemHealth.memoryUsage > 75 ? 'red' : systemHealth.memoryUsage > 50 ? 'yellow' : 'green'}
          realTimeData={realTimeMetrics?.memoryUsage ? { value: realTimeMetrics.memoryUsage } : undefined}
          showChart={true}
          threshold={{ warning: 75, critical: 90 }}
        />

        <RealTimeMetricsCard
          title="CPU Usage"
          value={systemHealth.cpuUsage}
          unit="%"
          icon="fas fa-microchip"
          color={systemHealth.cpuUsage > 75 ? 'red' : systemHealth.cpuUsage > 50 ? 'yellow' : 'green'}
          realTimeData={realTimeMetrics?.cpuUsage ? { value: realTimeMetrics.cpuUsage } : undefined}
          showChart={true}
          threshold={{ warning: 75, critical: 90 }}
        />

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-blue-50">
              <i className="fas fa-clock text-primary text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">System Uptime</p>
              <p className="text-2xl font-bold text-primary">
                {formatUptime(systemHealth.uptime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Since last restart
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Connection Status */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              realTimeMetrics ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm font-medium text-gray-700">
              Real-time Updates: {realTimeMetrics ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {realTimeMetrics && (
            <div className="text-xs text-gray-500">
              Last update: {new Date(realTimeMetrics.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}