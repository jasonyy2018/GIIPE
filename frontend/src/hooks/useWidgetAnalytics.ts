'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { dashboardAnalyticsService } from '@/services/dashboardAnalyticsService';
import { WidgetInteractionEvent } from '@/types/analytics';

interface UseWidgetAnalyticsProps {
  widgetId: string;
  widgetType: string;
  userId: string;
  enabled?: boolean;
}

interface WidgetAnalyticsHook {
  trackView: (duration?: number) => void;
  trackClick: (target?: string, metadata?: Record<string, any>) => void;
  trackResize: (newSize: { width: number; height: number }) => void;
  trackMove: (newPosition: { x: number; y: number }) => void;
  trackConfigure: (settings: Record<string, any>) => void;
  trackRefresh: () => void;
  trackExpand: (expanded: boolean) => void;
  trackError: (error: string) => void;
  startViewTracking: () => void;
  stopViewTracking: () => void;
}

export function useWidgetAnalytics({
  widgetId,
  widgetType,
  userId,
  enabled = true
}: UseWidgetAnalyticsProps): WidgetAnalyticsHook {
  const viewStartTime = useRef<number | null>(null);
  const isTracking = useRef(false);

  // Track widget view with duration
  const trackView = useCallback((duration?: number) => {
    if (!enabled) return;
    
    dashboardAnalyticsService.trackWidgetInteraction(
      userId,
      widgetId,
      widgetType,
      'view',
      {
        viewStarted: new Date().toISOString()
      },
      duration
    );
  }, [enabled, userId, widgetId, widgetType]);

  // Track widget click
  const trackClick = useCallback((target?: string, metadata: Record<string, any> = {}) => {
    if (!enabled) return;
    
    dashboardAnalyticsService.trackWidgetInteraction(
      userId,
      widgetId,
      widgetType,
      'click',
      {
        clickTarget: target,
        ...metadata
      }
    );
  }, [enabled, userId, widgetId, widgetType]);

  // Track widget resize
  const trackResize = useCallback((newSize: { width: number; height: number }) => {
    if (!enabled) return;
    
    dashboardAnalyticsService.trackWidgetInteraction(
      userId,
      widgetId,
      widgetType,
      'resize',
      {
        size: newSize,
        resizeTimestamp: Date.now()
      }
    );
  }, [enabled, userId, widgetId, widgetType]);

  // Track widget move
  const trackMove = useCallback((newPosition: { x: number; y: number }) => {
    if (!enabled) return;
    
    dashboardAnalyticsService.trackWidgetInteraction(
      userId,
      widgetId,
      widgetType,
      'move',
      {
        position: newPosition,
        moveTimestamp: Date.now()
      }
    );
  }, [enabled, userId, widgetId, widgetType]);

  // Track widget configuration changes
  const trackConfigure = useCallback((settings: Record<string, any>) => {
    if (!enabled) return;
    
    dashboardAnalyticsService.trackWidgetInteraction(
      userId,
      widgetId,
      widgetType,
      'configure',
      {
        newSettings: settings,
        configureTimestamp: Date.now()
      }
    );
  }, [enabled, userId, widgetId, widgetType]);

  // Track widget refresh
  const trackRefresh = useCallback(() => {
    if (!enabled) return;
    
    dashboardAnalyticsService.trackWidgetInteraction(
      userId,
      widgetId,
      widgetType,
      'refresh',
      {
        refreshTimestamp: Date.now()
      }
    );
  }, [enabled, userId, widgetId, widgetType]);

  // Track widget expand/collapse
  const trackExpand = useCallback((expanded: boolean) => {
    if (!enabled) return;
    
    dashboardAnalyticsService.trackWidgetInteraction(
      userId,
      widgetId,
      widgetType,
      'expand',
      {
        expanded,
        expandTimestamp: Date.now()
      }
    );
  }, [enabled, userId, widgetId, widgetType]);

  // Track widget errors
  const trackError = useCallback((error: string) => {
    if (!enabled) return;
    
    dashboardAnalyticsService.trackWidgetInteraction(
      userId,
      widgetId,
      widgetType,
      'click', // Using click as base action type since error isn't in the enum
      {
        error,
        errorTimestamp: Date.now(),
        isError: true
      }
    );
  }, [enabled, userId, widgetId, widgetType]);

  // Start tracking view duration
  const startViewTracking = useCallback(() => {
    if (!enabled || isTracking.current) return;
    
    viewStartTime.current = Date.now();
    isTracking.current = true;
    trackView();
  }, [enabled, trackView]);

  // Stop tracking view duration and record the duration
  const stopViewTracking = useCallback(() => {
    if (!enabled || !isTracking.current || viewStartTime.current === null) return;
    
    const duration = (Date.now() - viewStartTime.current) / 1000; // Duration in seconds
    trackView(duration);
    
    viewStartTime.current = null;
    isTracking.current = false;
  }, [enabled, trackView]);

  // Auto-start view tracking when component mounts
  useEffect(() => {
    if (enabled) {
      startViewTracking();
    }
    
    return () => {
      if (enabled) {
        stopViewTracking();
      }
    };
  }, [enabled, startViewTracking, stopViewTracking]);

  // Handle visibility changes
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopViewTracking();
      } else {
        startViewTracking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, startViewTracking, stopViewTracking]);

  return {
    trackView,
    trackClick,
    trackResize,
    trackMove,
    trackConfigure,
    trackRefresh,
    trackExpand,
    trackError,
    startViewTracking,
    stopViewTracking
  };
}

// Higher-order component for automatic widget analytics
export function withWidgetAnalytics<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  widgetType: string
) {
  return function AnalyticsWrappedWidget(props: P & { widgetId: string; userId: string }) {
    const { widgetId, userId, ...otherProps } = props;
    
    const analytics = useWidgetAnalytics({
      widgetId,
      widgetType,
      userId
    });

    // Add analytics methods to props
    const enhancedProps = {
      ...otherProps,
      analytics
    } as P;

    return React.createElement(WrappedComponent, enhancedProps);
  };
}