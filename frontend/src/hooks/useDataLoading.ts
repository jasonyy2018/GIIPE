import { useState, useEffect, useCallback, useRef } from 'react';
import { dataLoadingService, DataRequest, LoadingState } from '@/services/dataLoadingService';

export interface UseDataLoadingOptions<T> {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseDataLoadingResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  progress: number;
  refetch: () => Promise<void>;
  cancel: () => void;
  lastUpdated: Date | null;
}

/**
 * Hook for intelligent data loading with caching and prefetching
 */
export function useDataLoading<T>(
  request: DataRequest<T>,
  options: UseDataLoadingOptions<T> = {}
): UseDataLoadingResult<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchInterval,
    staleTime = 5 * 60 * 1000, // 5 minutes
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const loadingStateRef = useRef<LoadingState>({ isLoading: false, progress: 0 });
  const [, forceUpdate] = useState({});
  
  const intervalRef = useRef<NodeJS.Timeout>(undefined);
  const mountedRef = useRef(true);

  // Force re-render when loading state changes
  const updateLoadingState = useCallback(() => {
    const newState = dataLoadingService.getLoadingState(request.id);
    if (newState) {
      loadingStateRef.current = newState;
      forceUpdate({});
    }
  }, [request.id]);

  const fetchData = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    try {
      setError(null);
      
      const result = await dataLoadingService.loadData(request);
      
      if (mountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
        onSuccess?.(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    }
  }, [request, enabled, onSuccess, onError]);

  const refetch = useCallback(async () => {
    // Clear cache for this request to force fresh data
    dataLoadingService.clearCache(request.id);
    await fetchData();
  }, [request.id, fetchData]);

  const cancel = useCallback(() => {
    dataLoadingService.cancelRequest(request.id);
  }, [request.id]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);

  // Set up loading state monitoring
  useEffect(() => {
    const interval = setInterval(updateLoadingState, 100);
    return () => clearInterval(interval);
  }, [updateLoadingState]);

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, fetchData]);

  // Handle window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (data && lastUpdated) {
        const age = Date.now() - lastUpdated.getTime();
        if (age > staleTime) {
          fetchData();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, data, lastUpdated, staleTime, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      cancel();
    };
  }, [cancel]);

  return {
    data,
    loading: loadingStateRef.current.isLoading,
    error,
    progress: loadingStateRef.current.progress,
    refetch,
    cancel,
    lastUpdated
  };
}

/**
 * Hook for loading multiple data sources with intelligent batching
 */
export function useBatchDataLoading<T>(
  requests: DataRequest<T>[],
  options: UseDataLoadingOptions<T[]> = {}
): UseDataLoadingResult<T[]> {
  const {
    enabled = true,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || requests.length === 0) return;

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const results = await dataLoadingService.loadBatch(requests);
      
      setData(results);
      setLastUpdated(new Date());
      setProgress(100);
      onSuccess?.(results);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [requests, enabled, onSuccess, onError]);

  const refetch = useCallback(async () => {
    // Clear cache for all requests
    requests.forEach(request => {
      dataLoadingService.clearCache(request.id);
    });
    await fetchData();
  }, [requests, fetchData]);

  const cancel = useCallback(() => {
    requests.forEach(request => {
      dataLoadingService.cancelRequest(request.id);
    });
    setLoading(false);
  }, [requests]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);

  return {
    data,
    loading,
    error,
    progress,
    refetch,
    cancel,
    lastUpdated
  };
}

/**
 * Hook for predictive prefetching based on user behavior
 */
export function usePredictivePrefetch() {
  const [userBehavior, setUserBehavior] = useState({
    currentPage: '',
    timeOnPage: 0,
    scrollPosition: 0,
    clickPattern: [] as string[],
    lastActions: [] as string[],
    preferences: {}
  });

  const startTimeRef = useRef<number>(Date.now());
  const scrollTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  // Track page changes
  useEffect(() => {
    const currentPage = window.location.pathname;
    setUserBehavior(prev => ({ ...prev, currentPage }));
    startTimeRef.current = Date.now();
  }, []);

  // Track time on page
  useEffect(() => {
    const interval = setInterval(() => {
      const timeOnPage = Date.now() - startTimeRef.current;
      setUserBehavior(prev => ({ ...prev, timeOnPage }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setUserBehavior(prev => ({ ...prev, scrollPosition }));
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Track click patterns
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const selector = target.tagName.toLowerCase() + 
        (target.className ? '.' + target.className.split(' ').join('.') : '');
      
      setUserBehavior(prev => ({
        ...prev,
        clickPattern: [...prev.clickPattern.slice(-9), selector],
        lastActions: [...prev.lastActions.slice(-4), `click:${selector}`]
      }));
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Trigger prefetching when behavior changes
  useEffect(() => {
    dataLoadingService.prefetchData(userBehavior);
  }, [userBehavior]);

  return {
    userBehavior,
    updatePreferences: (preferences: Record<string, any>) => {
      setUserBehavior(prev => ({ ...prev, preferences }));
    }
  };
}