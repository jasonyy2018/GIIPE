'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardWidget } from '@/types/dashboard-widgets';

interface UseWidgetDataOptions {
  widget: DashboardWidget;
  enabled?: boolean;
}

interface WidgetDataState {
  data: any;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

export function useWidgetData({ widget, enabled = true }: UseWidgetDataOptions) {
  const [state, setState] = useState<WidgetDataState>({
    data: widget.data,
    loading: false,
    error: null,
    lastFetch: null
  });

  const fetchData = useCallback(async () => {
    if (!enabled || !widget.config.dataSource) {
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        dataSource: widget.config.dataSource!,
        widgetType: widget.type
      });

      const response = await fetch(`/api/admin/dashboard/widget-data?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        data: result.data,
        loading: false,
        lastFetch: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data'
      }));
    }
  }, [widget.config.dataSource, widget.type, enabled]);

  // Initial fetch
  useEffect(() => {
    if (enabled && widget.config.dataSource) {
      fetchData();
    }
  }, [fetchData, enabled, widget.config.dataSource]);

  // Auto-refresh based on widget refresh interval
  useEffect(() => {
    if (!enabled || !widget.refreshInterval || widget.refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(fetchData, widget.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, widget.refreshInterval, enabled]);

  return {
    ...state,
    refetch: fetchData
  };
}