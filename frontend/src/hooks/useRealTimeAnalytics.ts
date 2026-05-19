'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  category: string;
}

interface RealTimeAnalyticsUpdate {
  type: 'analytics_update' | 'metric_alert' | 'system_status';
  timestamp: Date;
  data: any;
}

interface UseRealTimeAnalyticsOptions {
  enabled?: boolean;
  updateInterval?: number;
  metrics?: string[];
  onUpdate?: (update: RealTimeAnalyticsUpdate) => void;
  onError?: (error: Error) => void;
}

export function useRealTimeAnalytics({
  enabled = true,
  updateInterval = 30000,
  metrics = [],
  onUpdate,
  onError
}: UseRealTimeAnalyticsOptions = {}) {
  const [isActive, setIsActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [metricsData, setMetricsData] = useState<Record<string, AnalyticsMetric>>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  
  const { isConnected, subscribe, unsubscribe, send } = useWebSocket(
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    { namespace: '/admin', autoConnect: true }
  );
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle WebSocket connection status
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
      if (enabled) {
        startRealTimeUpdates();
      }
    } else {
      setConnectionStatus('disconnected');
      stopRealTimeUpdates();
    }
  }, [isConnected, enabled]);

  // Start real-time analytics updates
  const startRealTimeUpdates = useCallback(() => {
    if (!isConnected || isActive) return;

    setIsActive(true);
    setConnectionStatus('connected');

    // Subscribe to analytics updates
    const handleAnalyticsUpdate = (data: any) => {
      try {
        const update: RealTimeAnalyticsUpdate = {
          type: data.type || 'analytics_update',
          timestamp: new Date(data.timestamp || Date.now()),
          data: data.data || data
        };

        setLastUpdate(update.timestamp);

        // Update metrics data
        if (update.type === 'analytics_update' && update.data.metrics) {
          setMetricsData(prev => ({
            ...prev,
            ...update.data.metrics
          }));
        }

        // Handle alerts
        if (update.type === 'metric_alert' && update.data.alert) {
          setAlerts(prev => [update.data.alert, ...prev.slice(0, 9)]);
        }

        // Call external update handler
        if (onUpdate) {
          onUpdate(update);
        }
      } catch (error) {
        console.error('Error processing analytics update:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error('Unknown error'));
        }
      }
    };

    // Subscribe to different types of updates
    subscribe('analytics_metrics', handleAnalyticsUpdate);
    subscribe('analytics_alerts', handleAnalyticsUpdate);
    subscribe('system_status', handleAnalyticsUpdate);

    // Send subscription request with metrics filter
    send('subscribe_analytics', {
      type: 'subscribe_analytics',
      metrics: metrics.length > 0 ? metrics : undefined,
      updateInterval
    });

    // Set up periodic updates as fallback
    updateIntervalRef.current = setInterval(() => {
      if (isConnected) {
        send('request_analytics_update', {
          type: 'request_analytics_update',
          metrics: metrics.length > 0 ? metrics : undefined
        });
      }
    }, updateInterval);

  }, [isConnected, isActive, metrics, updateInterval, subscribe, send, onUpdate, onError]);

  // Stop real-time analytics updates
  const stopRealTimeUpdates = useCallback(() => {
    if (!isActive) return;

    setIsActive(false);
    setConnectionStatus('disconnected');

    // Unsubscribe from updates
    unsubscribe('analytics_metrics');
    unsubscribe('analytics_alerts');
    unsubscribe('system_status');

    // Send unsubscribe request
    if (isConnected) {
      send('unsubscribe_analytics', {
        type: 'unsubscribe_analytics'
      });
    }

    // Clear intervals
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [isActive, isConnected, unsubscribe, send]);

  // Manual refresh
  const refreshMetrics = useCallback(() => {
    if (!isConnected) return;

    send('request_analytics_update', {
      type: 'request_analytics_update',
      metrics: metrics.length > 0 ? metrics : undefined,
      force: true
    });
  }, [isConnected, metrics, send]);

  // Update metrics filter
  const updateMetricsFilter = useCallback((newMetrics: string[]) => {
    if (!isConnected || !isActive) return;

    send('update_metrics_filter', {
      type: 'update_metrics_filter',
      metrics: newMetrics
    });
  }, [isConnected, isActive, send]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Get metric by ID
  const getMetric = useCallback((metricId: string): AnalyticsMetric | null => {
    return metricsData[metricId] || null;
  }, [metricsData]);

  // Get all metrics as array
  const getAllMetrics = useCallback((): AnalyticsMetric[] => {
    return Object.values(metricsData);
  }, [metricsData]);

  // Check if metric has recent update
  const isMetricRecent = useCallback((metricId: string, maxAgeMs: number = 60000): boolean => {
    if (!lastUpdate) return false;
    return Date.now() - lastUpdate.getTime() < maxAgeMs;
  }, [lastUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealTimeUpdates();
    };
  }, [stopRealTimeUpdates]);

  return {
    // State
    isActive,
    connectionStatus,
    lastUpdate,
    metricsData,
    alerts,
    
    // Actions
    start: startRealTimeUpdates,
    stop: stopRealTimeUpdates,
    refresh: refreshMetrics,
    updateMetricsFilter,
    clearAlerts,
    
    // Getters
    getMetric,
    getAllMetrics,
    isMetricRecent,
    
    // Computed
    isConnected: connectionStatus === 'connected',
    hasRecentData: lastUpdate && Date.now() - lastUpdate.getTime() < 120000,
    alertCount: alerts.length
  };
}