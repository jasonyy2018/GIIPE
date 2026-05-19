'use client';

import React, { 
  memo, 
  useMemo, 
  useCallback, 
  useRef, 
  useEffect, 
  useState,
  ReactNode,
  ComponentType
} from 'react';
import { useRenderPerformance, useOptimizedMemo } from '@/hooks/usePerformanceOptimization';

interface OptimizedRendererProps {
  children: ReactNode;
  componentName: string;
  enableProfiling?: boolean;
  renderThreshold?: number;
  memoizeChildren?: boolean;
}

/**
 * Optimized Renderer with performance monitoring and efficient re-rendering
 */
const OptimizedRenderer = memo<OptimizedRendererProps>(({
  children,
  componentName,
  enableProfiling = false,
  renderThreshold = 16, // 16ms for 60fps
  memoizeChildren = true
}) => {
  const { measureRender, trackReRender } = useRenderPerformance(componentName);
  const [renderWarnings, setRenderWarnings] = useState<string[]>([]);
  const lastRenderTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  // Memoize children if enabled
  const memoizedChildren = useOptimizedMemo(
    () => children,
    [children],
    memoizeChildren ? componentName : undefined
  );

  const actualChildren = memoizeChildren ? memoizedChildren : children;

  // Track render performance
  useEffect(() => {
    if (!enableProfiling) return;

    const renderTime = performance.now();
    const timeSinceLastRender = renderTime - lastRenderTime.current;
    
    renderCount.current++;
    
    if (timeSinceLastRender > 0 && timeSinceLastRender < renderThreshold) {
      const warning = `Fast re-render detected: ${timeSinceLastRender.toFixed(2)}ms (threshold: ${renderThreshold}ms)`;
      setRenderWarnings(prev => [...prev.slice(-4), warning]);
      trackReRender(`fast_rerender_${timeSinceLastRender.toFixed(0)}ms`);
    }
    
    lastRenderTime.current = renderTime;
  });

  if (enableProfiling) {
    return measureRender(() => (
      <div data-component={componentName} data-render-count={renderCount.current}>
        {actualChildren}
        {renderWarnings.length > 0 && (
          <div className="performance-warnings" style={{ 
            position: 'absolute', 
            top: 0, 
            right: 0, 
            background: 'rgba(255, 165, 0, 0.8)', 
            color: 'white', 
            padding: '4px 8px', 
            fontSize: '12px',
            zIndex: 9999
          }}>
            ⚠️ {renderWarnings.length} warnings
          </div>
        )}
      </div>
    ));
  }

  return <>{actualChildren}</>;
});

OptimizedRenderer.displayName = 'OptimizedRenderer';

/**
 * Higher-order component for automatic performance optimization
 */
export function withPerformanceOptimization<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: {
    componentName?: string;
    enableProfiling?: boolean;
    memoProps?: boolean;
    memoComponent?: boolean;
  } = {}
) {
  const {
    componentName = WrappedComponent.displayName || WrappedComponent.name || 'Unknown',
    enableProfiling = false,
    memoProps = true,
    memoComponent = true
  } = options;

  const OptimizedComponent = (props: P) => {
    const { measureRender } = useRenderPerformance(componentName);
    
    // Memoize props if enabled
    const memoizedProps = useOptimizedMemo(
      () => props,
      Object.values(props as any),
      memoProps ? componentName : undefined
    );

    const actualProps = memoProps ? memoizedProps : props;

    if (enableProfiling) {
      return measureRender(() => <WrappedComponent {...actualProps} />);
    }

    return <WrappedComponent {...actualProps} />;
  };

  OptimizedComponent.displayName = `withPerformanceOptimization(${componentName})`;

  return memoComponent ? memo(OptimizedComponent) : OptimizedComponent;
}

/**
 * Batch renderer for multiple items with performance optimization
 */
interface BatchRendererProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  batchSize?: number;
  renderDelay?: number;
  componentName: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export function BatchRenderer<T>({
  items,
  renderItem,
  batchSize = 10,
  renderDelay = 0,
  componentName,
  getItemKey
}: BatchRendererProps<T>) {
  const [renderedCount, setRenderedCount] = useState(batchSize);
  const { measureRender } = useRenderPerformance(componentName);
  
  // Gradually render more items
  useEffect(() => {
    if (renderedCount >= items.length) return;

    const timer = setTimeout(() => {
      setRenderedCount(prev => Math.min(prev + batchSize, items.length));
    }, renderDelay);

    return () => clearTimeout(timer);
  }, [renderedCount, items.length, batchSize, renderDelay]);

  const visibleItems = items.slice(0, renderedCount);

  return measureRender(() => (
    <div data-component={componentName} data-batch-size={batchSize}>
      {visibleItems.map((item, index) => {
        const key = getItemKey ? getItemKey(item, index) : index;
        return (
          <React.Fragment key={key}>
            {renderItem(item, index)}
          </React.Fragment>
        );
      })}
      {renderedCount < items.length && (
        <div className="batch-loading">
          Loading more items... ({renderedCount}/{items.length})
        </div>
      )}
    </div>
  ));
}

/**
 * Conditional renderer with performance optimization
 */
interface ConditionalRendererProps {
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  componentName: string;
  lazy?: boolean;
}

export const ConditionalRenderer = memo<ConditionalRendererProps>(({
  condition,
  children,
  fallback = null,
  componentName,
  lazy = false
}) => {
  const { measureRender, trackReRender } = useRenderPerformance(componentName);
  const [hasRendered, setHasRendered] = useState(!lazy);
  
  useEffect(() => {
    if (condition && !hasRendered) {
      setHasRendered(true);
      trackReRender('lazy_activation');
    }
  }, [condition, hasRendered, trackReRender]);

  const shouldRender = lazy ? (condition && hasRendered) : condition;

  return measureRender(() => (
    <>
      {shouldRender ? children : fallback}
    </>
  ));
});

ConditionalRenderer.displayName = 'ConditionalRenderer';

/**
 * Async renderer with performance optimization
 */
interface AsyncRendererProps<T> {
  asyncData: Promise<T> | T;
  renderData: (data: T) => ReactNode;
  renderLoading?: () => ReactNode;
  renderError?: (error: Error) => ReactNode;
  componentName: string;
}

export function AsyncRenderer<T>({
  asyncData,
  renderData,
  renderLoading = () => <div>Loading...</div>,
  renderError = (error) => <div>Error: {error.message}</div>,
  componentName
}: AsyncRendererProps<T>) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: true,
    error: null
  });

  const { measureRender } = useRenderPerformance(componentName);

  useEffect(() => {
    const loadData = async () => {
      try {
        setState({ data: null, loading: true, error: null });
        
        const result = await Promise.resolve(asyncData);
        setState({ data: result, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    loadData();
  }, [asyncData]);

  return measureRender(() => {
    if (state.loading) return <>{renderLoading()}</>;
    if (state.error) return <>{renderError(state.error)}</>;
    if (state.data) return <>{renderData(state.data)}</>;
    return null;
  });
}

/**
 * Performance-aware list renderer
 */
interface PerformantListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  componentName: string;
  chunkSize?: number;
  enableVirtualization?: boolean;
  itemHeight?: number;
  containerHeight?: number;
}

export function PerformantList<T>({
  items,
  renderItem,
  keyExtractor,
  componentName,
  chunkSize = 50,
  enableVirtualization = false,
  itemHeight = 50,
  containerHeight = 400
}: PerformantListProps<T>) {
  const { measureRender } = useRenderPerformance(componentName);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: chunkSize });
  const containerRef = useRef<HTMLDivElement>(null);

  // Simple virtualization logic
  const handleScroll = useCallback(() => {
    if (!enableVirtualization || !containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 5, items.length); // 5 item buffer

    setVisibleRange({ start: Math.max(0, start - 5), end });
  }, [enableVirtualization, itemHeight, containerHeight, items.length]);

  const visibleItems = enableVirtualization 
    ? items.slice(visibleRange.start, visibleRange.end)
    : items.slice(0, visibleRange.end);

  return measureRender(() => (
    <div
      ref={containerRef}
      data-component={componentName}
      style={enableVirtualization ? { 
        height: containerHeight, 
        overflow: 'auto' 
      } : undefined}
      onScroll={enableVirtualization ? handleScroll : undefined}
    >
      {enableVirtualization && (
        <div style={{ height: items.length * itemHeight, position: 'relative' }}>
          <div style={{ 
            transform: `translateY(${visibleRange.start * itemHeight}px)` 
          }}>
            {visibleItems.map((item, index) => {
              const actualIndex = enableVirtualization ? visibleRange.start + index : index;
              return (
                <div key={keyExtractor(item, actualIndex)} style={{ height: itemHeight }}>
                  {renderItem(item, actualIndex)}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {!enableVirtualization && visibleItems.map((item, index) => (
        <React.Fragment key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
      
      {!enableVirtualization && visibleRange.end < items.length && (
        <button
          onClick={() => setVisibleRange(prev => ({ 
            ...prev, 
            end: Math.min(prev.end + chunkSize, items.length) 
          }))}
          className="load-more-btn"
        >
          Load More ({items.length - visibleRange.end} remaining)
        </button>
      )}
    </div>
  ));
}

export default OptimizedRenderer;