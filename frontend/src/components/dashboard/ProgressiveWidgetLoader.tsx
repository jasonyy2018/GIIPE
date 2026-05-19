'use client';

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { useDataLoading, usePredictivePrefetch } from '@/hooks/useDataLoading';
import { DataRequest } from '@/services/dataLoadingService';

interface ProgressiveWidgetLoaderProps<T> {
  widgetId: string;
  dataRequest: DataRequest<T>;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  loadOnVisible?: boolean;
  prefetchOnHover?: boolean;
  children: (data: T | null, loading: boolean, error: Error | null) => ReactNode;
  fallback?: ReactNode;
  errorFallback?: (error: Error, retry: () => void) => ReactNode;
  skeleton?: ReactNode;
}

/**
 * Progressive Widget Loader with intelligent loading strategies
 */
export default function ProgressiveWidgetLoader<T>({
  widgetId,
  dataRequest,
  priority = 'normal',
  loadOnVisible = true,
  prefetchOnHover = true,
  children,
  fallback,
  errorFallback,
  skeleton
}: ProgressiveWidgetLoaderProps<T>) {
  const [isVisible, setIsVisible] = useState(!loadOnVisible);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Set up predictive prefetching
  usePredictivePrefetch();

  // Enhanced data request with priority
  const enhancedRequest: DataRequest<T> = {
    ...dataRequest,
    options: {
      ...dataRequest.options,
      priority,
      cache: true
    }
  };

  // Load data with intelligent caching
  const { data, loading, error, refetch, progress } = useDataLoading(
    enhancedRequest,
    {
      enabled: isVisible,
      refetchOnWindowFocus: true,
      staleTime: priority === 'critical' ? 1 * 60 * 1000 : 5 * 60 * 1000, // 1min for critical, 5min for others
      onError: (err) => {
        console.error(`Widget ${widgetId} loading error:`, err);
      }
    }
  );

  // Intersection Observer for visibility detection
  useEffect(() => {
    if (!loadOnVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only load once when visible
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before visible
        threshold: 0.1
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [loadOnVisible]);

  // Prefetch on hover
  useEffect(() => {
    if (prefetchOnHover && isHovered && !data && !loading) {
      setIsVisible(true);
    }
  }, [prefetchOnHover, isHovered, data, loading]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Render loading skeleton
  const renderSkeleton = () => {
    if (skeleton) return skeleton;
    
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  };

  // Render error state
  const renderError = () => {
    if (errorFallback) {
      return errorFallback(error!, refetch);
    }

    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2 text-red-700 mb-2">
          <i className="fas fa-exclamation-triangle"></i>
          <span className="font-medium">Failed to load widget</span>
        </div>
        <p className="text-red-600 text-sm mb-3">{error?.message}</p>
        <button
          onClick={refetch}
          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  };

  // Render loading progress for critical widgets
  const renderProgress = () => {
    if (priority !== 'critical' || progress === 0) return null;

    return (
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Loading...</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="progressive-widget-loader"
      data-widget-id={widgetId}
      data-priority={priority}
    >
      {/* Loading Progress */}
      {loading && renderProgress()}

      {/* Content */}
      {error ? (
        renderError()
      ) : loading && !data ? (
        renderSkeleton()
      ) : !isVisible ? (
        fallback || renderSkeleton()
      ) : (
        children(data, loading, error)
      )}
    </div>
  );
}

/**
 * Higher-order component for wrapping widgets with progressive loading
 */
export function withProgressiveLoading<T, P extends object>(
  WrappedComponent: React.ComponentType<P>,
  dataRequestFactory: (props: P) => DataRequest<T>,
  options: {
    priority?: 'critical' | 'high' | 'normal' | 'low';
    loadOnVisible?: boolean;
    prefetchOnHover?: boolean;
  } = {}
) {
  return function ProgressiveWidget(props: P & { widgetId: string }) {
    const { widgetId, ...componentProps } = props;
    const dataRequest = dataRequestFactory(componentProps as P);

    return (
      <ProgressiveWidgetLoader
        widgetId={widgetId}
        dataRequest={dataRequest}
        priority={options.priority}
        loadOnVisible={options.loadOnVisible}
        prefetchOnHover={options.prefetchOnHover}
      >
        {(data, loading, error) => (
          <WrappedComponent
            {...(componentProps as P)}
            data={data}
            loading={loading}
            error={error}
          />
        )}
      </ProgressiveWidgetLoader>
    );
  };
}

/**
 * Batch loader for multiple widgets
 */
interface BatchWidgetLoaderProps {
  widgets: Array<{
    id: string;
    dataRequest: DataRequest<any>;
    component: ReactNode;
    priority?: 'critical' | 'high' | 'normal' | 'low';
  }>;
  loadingStrategy?: 'parallel' | 'sequential' | 'priority-based';
  onAllLoaded?: () => void;
}

export function BatchWidgetLoader({
  widgets,
  loadingStrategy = 'priority-based',
  onAllLoaded
}: BatchWidgetLoaderProps) {
  const [loadedWidgets, setLoadedWidgets] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loadedWidgets.size === widgets.length && onAllLoaded) {
      onAllLoaded();
    }
  }, [loadedWidgets.size, widgets.length, onAllLoaded]);

  const handleWidgetLoaded = (widgetId: string) => {
    setLoadedWidgets(prev => new Set([...Array.from(prev), widgetId]));
  };

  // Sort widgets by priority for priority-based loading
  const sortedWidgets = loadingStrategy === 'priority-based'
    ? [...widgets].sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
      })
    : widgets;

  return (
    <div className="batch-widget-loader">
      {sortedWidgets.map((widget, index) => (
        <ProgressiveWidgetLoader
          key={widget.id}
          widgetId={widget.id}
          dataRequest={widget.dataRequest}
          priority={widget.priority}
          loadOnVisible={loadingStrategy === 'sequential' ? index === 0 || loadedWidgets.has(sortedWidgets[index - 1]?.id) : true}
        >
          {(data, loading, error) => {
            if (data && !loading && !loadedWidgets.has(widget.id)) {
              handleWidgetLoaded(widget.id);
            }
            return widget.component;
          }}
        </ProgressiveWidgetLoader>
      ))}
    </div>
  );
}