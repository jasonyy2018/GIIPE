'use client';

import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '@/lib/analytics-api';
import {
  DashboardMetrics,
  UserActivityMetrics,
  EventMetrics,
  RegistrationMetrics,
  SystemMetrics,
  AnalyticsQuery,
} from '@/types/analytics';

enum DateRange {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom'
}

interface UseAnalyticsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAnalytics(
  initialQuery: AnalyticsQuery = { dateRange: DateRange.LAST_30_DAYS },
  options: UseAnalyticsOptions = {}
) {
  const { autoRefresh = false, refreshInterval = 30000 } = options;

  const [query, setQuery] = useState<AnalyticsQuery>(initialQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [userActivityMetrics, setUserActivityMetrics] = useState<UserActivityMetrics | null>(null);
  const [eventMetrics, setEventMetrics] = useState<EventMetrics | null>(null);
  const [registrationMetrics, setRegistrationMetrics] = useState<RegistrationMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);

  const fetchAnalyticsData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const [dashboard, userActivity, events, registrations, system] = await Promise.all([
        analyticsAPI.getDashboardMetrics(query),
        analyticsAPI.getUserActivityMetrics(query),
        analyticsAPI.getEventMetrics(query),
        analyticsAPI.getRegistrationMetrics(query),
        analyticsAPI.getSystemMetrics(),
      ]);

      setDashboardMetrics(dashboard);
      setUserActivityMetrics(userActivity);
      setEventMetrics(events);
      setRegistrationMetrics(registrations);
      setSystemMetrics(system);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(errorMessage);
      console.error('Analytics fetch error:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [query]);

  const updateQuery = useCallback((newQuery: Partial<AnalyticsQuery>) => {
    setQuery(prev => ({ ...prev, ...newQuery }));
  }, []);

  const exportData = useCallback(async () => {
    try {
      return await analyticsAPI.exportAnalyticsData(query);
    } catch (err) {
      console.error('Export error:', err);
      throw err;
    }
  }, [query]);

  const trackActivity = useCallback(async (activityData: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, any>;
  }) => {
    try {
      await analyticsAPI.trackActivity(activityData);
    } catch (err) {
      console.error('Activity tracking error:', err);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAnalyticsData(true); // Silent refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAnalyticsData]);

  return {
    // Data
    dashboardMetrics,
    userActivityMetrics,
    eventMetrics,
    registrationMetrics,
    systemMetrics,
    
    // State
    loading,
    error,
    query,
    
    // Actions
    updateQuery,
    refresh: () => fetchAnalyticsData(),
    exportData,
    trackActivity,
  };
}