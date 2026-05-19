import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { performanceMonitoringService } from '@/services/performanceMonitoringService';

/**
 * Hook for measuring component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);

  useEffect(() => {
    renderCountRef.current++;
    const renderTime = performance.now();
    
    if (lastRenderTimeRef.current > 0) {
      const timeSinceLastRender = renderTime - lastRenderTimeRef.current;
      performanceMonitoringService.recordMetric(
        `render_interval_${componentName}`,
        timeSinceLastRender,
        'rendering',
        { component: componentName }
      );
    }
    
    lastRenderTimeRef.current = renderTime;
  });

  const measureRender = useCallback(<T>(renderFn: () => T): T => {
    return performanceMonitoringService.measureRender(componentName, renderFn);
  }, [componentName]);

  const trackReRender = useCallback((reason: string) => {
    performanceMonitoringService.trackReRender(componentName, reason);
  }, [componentName]);

  return {
    renderCount: renderCountRef.current,
    measureRender,
    trackReRender
  };
}

/**
 * Hook for optimized re-rendering with dependency tracking
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  componentName?: string
): T {
  const previousDeps = useRef<React.DependencyList>(undefined);
  const previousValue = useRef<T>(undefined);
  const computeCount = useRef(0);

  return useMemo(() => {
    computeCount.current++;
    
    // Track why memo was recomputed
    if (componentName && previousDeps.current) {
      const changedDeps = deps.map((dep, index) => 
        dep !== previousDeps.current![index] ? index : -1
      ).filter(index => index !== -1);
      
      if (changedDeps.length > 0) {
        performanceMonitoringService.trackReRender(
          componentName,
          `memo_recompute_deps_${changedDeps.join(',')}`
        );
      }
    }
    
    previousDeps.current = deps;
    const value = factory();
    previousValue.current = value;
    
    return value;
  }, deps);
}

/**
 * Hook for debounced values with performance tracking
 */
export function useOptimizedDebounce<T>(
  value: T,
  delay: number,
  componentName?: string
): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const updateCount = useRef(0);

  useEffect(() => {
    updateCount.current++;
    
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      
      if (componentName) {
        performanceMonitoringService.recordMetric(
          `debounce_update_${componentName}`,
          delay,
          'interaction',
          { 
            component: componentName,
            updateCount: updateCount.current.toString()
          }
        );
      }
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, componentName]);

  return debouncedValue;
}

/**
 * Hook for throttled callbacks with performance tracking
 */
export function useOptimizedThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  componentName?: string
): T {
  const lastCall = useRef(0);
  const callCount = useRef(0);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    callCount.current++;
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      
      if (componentName) {
        performanceMonitoringService.recordMetric(
          `throttle_execute_${componentName}`,
          now - lastCall.current,
          'interaction',
          { 
            component: componentName,
            callCount: callCount.current.toString()
          }
        );
      }
      
      return callback(...args);
    }
  }, [callback, delay, componentName]) as T;
}

/**
 * Hook for intersection observer with performance optimization
 */
export function useOptimizedIntersectionObserver(
  options: IntersectionObserverInit = {},
  componentName?: string
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setElement = useCallback((element: Element | null) => {
    if (elementRef.current && observerRef.current) {
      observerRef.current.unobserve(elementRef.current);
    }

    elementRef.current = element;

    if (element) {
      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver((entries) => {
          const [entry] = entries;
          setEntry(entry);
          setIsIntersecting(entry.isIntersecting);
          
          if (componentName) {
            performanceMonitoringService.recordMetric(
              `intersection_${componentName}`,
              entry.intersectionRatio,
              'rendering',
              { 
                component: componentName,
                isIntersecting: entry.isIntersecting.toString()
              }
            );
          }
        }, options);
      }
      
      observerRef.current.observe(element);
    }
  }, [options, componentName]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { isIntersecting, entry, setElement };
}

/**
 * Hook for optimized event listeners
 */
export function useOptimizedEventListener<T extends keyof WindowEventMap>(
  eventType: T,
  handler: (event: WindowEventMap[T]) => void,
  options: AddEventListenerOptions = {},
  componentName?: string
) {
  const handlerRef = useRef(handler);
  const callCount = useRef(0);

  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventHandler = (event: WindowEventMap[T]) => {
      callCount.current++;
      
      if (componentName) {
        performanceMonitoringService.measureInteraction(
          `event_${eventType}_${componentName}`,
          () => handlerRef.current(event)
        );
      } else {
        handlerRef.current(event);
      }
    };

    window.addEventListener(eventType, eventHandler, options);

    return () => {
      window.removeEventListener(eventType, eventHandler, options);
    };
  }, [eventType, options, componentName]);

  return callCount.current;
}

/**
 * Hook for lazy loading with performance tracking
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  trigger: boolean = true,
  componentName?: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!trigger || loadedRef.current) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      
      const startTime = performance.now();
      
      try {
        const result = await loader();
        setData(result);
        loadedRef.current = true;
        
        const loadTime = performance.now() - startTime;
        
        if (componentName) {
          performanceMonitoringService.recordMetric(
            `lazy_load_${componentName}`,
            loadTime,
            'network',
            { component: componentName }
          );
        }
      } catch (err) {
        setError(err as Error);
        
        const loadTime = performance.now() - startTime;
        
        if (componentName) {
          performanceMonitoringService.recordMetric(
            `lazy_load_error_${componentName}`,
            loadTime,
            'network',
            { 
              component: componentName,
              error: 'true'
            }
          );
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [trigger, loader, componentName]);

  return { data, loading, error, loaded: loadedRef.current };
}

/**
 * Hook for performance monitoring dashboard
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    const unsubscribe = performanceMonitoringService.subscribe((metric) => {
      setMetrics(prev => [...prev.slice(-99), metric]); // Keep last 100 metrics
    });

    return unsubscribe;
  }, []);

  const startMonitoring = useCallback(() => {
    performanceMonitoringService.startMonitoring();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    performanceMonitoringService.stopMonitoring();
    setIsMonitoring(false);
  }, []);

  const getReport = useCallback((periodMinutes: number = 60) => {
    return performanceMonitoringService.getReport(periodMinutes);
  }, []);

  const getRenderingStats = useCallback(() => {
    return performanceMonitoringService.getRenderingStats();
  }, []);

  const clearMetrics = useCallback(() => {
    performanceMonitoringService.clearMetrics();
    setMetrics([]);
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getReport,
    getRenderingStats,
    clearMetrics
  };
}

/**
 * Hook for component size optimization
 */
export function useComponentSize(componentName?: string) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const elementRef = useRef<HTMLElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const setElement = useCallback((element: HTMLElement | null) => {
    if (elementRef.current && resizeObserverRef.current) {
      resizeObserverRef.current.unobserve(elementRef.current);
    }

    elementRef.current = element;

    if (element) {
      if (!resizeObserverRef.current) {
        resizeObserverRef.current = new ResizeObserver((entries) => {
          const [entry] = entries;
          const { width, height } = entry.contentRect;
          
          setSize({ width, height });
          
          if (componentName) {
            performanceMonitoringService.recordMetric(
              `component_size_${componentName}`,
              width * height,
              'rendering',
              { 
                component: componentName,
                width: width.toString(),
                height: height.toString()
              }
            );
          }
        });
      }
      
      resizeObserverRef.current.observe(element);
    }
  }, [componentName]);

  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  return { size, setElement };
}