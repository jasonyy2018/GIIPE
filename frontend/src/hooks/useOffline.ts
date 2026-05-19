import { useState, useEffect, useCallback } from 'react';
import { offlineService, OfflineStatus, OfflineAction } from '@/services/offlineService';
import { cacheService } from '@/services/cacheService';

export interface UseOfflineOptions {
  enableAutoSync?: boolean;
  syncInterval?: number;
  showOfflineIndicator?: boolean;
}

export interface UseOfflineResult {
  isOnline: boolean;
  isOffline: boolean;
  status: OfflineStatus;
  queueAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>) => string;
  sync: () => Promise<boolean>;
  clearQueue: () => void;
  getCachedData: (key: string) => Promise<any>;
  cacheData: (key: string, data: any) => Promise<void>;
}

/**
 * Hook for managing offline functionality
 */
export function useOffline(options: UseOfflineOptions = {}): UseOfflineResult {
  const {
    enableAutoSync = true,
    syncInterval = 30000,
    showOfflineIndicator = true
  } = options;

  const [status, setStatus] = useState<OfflineStatus>(offlineService.getStatus());

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = offlineService.subscribe(setStatus);

    // Set up auto-sync if enabled
    let syncIntervalId: NodeJS.Timeout | null = null;
    if (enableAutoSync) {
      syncIntervalId = setInterval(() => {
        if (status.isOnline && status.pendingActions > 0) {
          offlineService.sync();
        }
      }, syncInterval);
    }

    return () => {
      unsubscribe();
      if (syncIntervalId) {
        clearInterval(syncIntervalId);
      }
    };
  }, [enableAutoSync, syncInterval, status.isOnline, status.pendingActions]);

  const queueAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>) => {
    return offlineService.queueAction(action);
  }, []);

  const sync = useCallback(async () => {
    return offlineService.sync();
  }, []);

  const clearQueue = useCallback(() => {
    offlineService.clearPendingActions();
  }, []);

  const getCachedData = useCallback(async (key: string) => {
    return offlineService.getCachedData(key);
  }, []);

  const cacheData = useCallback(async (key: string, data: any) => {
    return offlineService.cacheData(key, data);
  }, []);

  return {
    isOnline: status.isOnline,
    isOffline: !status.isOnline,
    status,
    queueAction,
    sync,
    clearQueue,
    getCachedData,
    cacheData
  };
}

/**
 * Hook for offline-first data fetching
 */
export function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    cacheFirst?: boolean;
    staleTime?: number;
    refetchOnReconnect?: boolean;
  } = {}
) {
  const {
    cacheFirst = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnReconnect = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const { isOnline, getCachedData, cacheData } = useOffline();

  const fetchData = useCallback(async (useCache = cacheFirst) => {
    setLoading(true);
    setError(null);

    try {
      // Try cache first if enabled
      if (useCache) {
        const cached = await getCachedData(key);
        if (cached) {
          setData(cached.data);
          setIsStale(Date.now() - cached.timestamp > staleTime);
          
          // If data is fresh enough, don't fetch from network
          if (Date.now() - cached.timestamp < staleTime) {
            setLoading(false);
            return cached.data;
          }
        }
      }

      // Fetch from network if online
      if (isOnline) {
        const freshData = await fetcher();
        setData(freshData);
        setIsStale(false);
        
        // Cache the fresh data
        await cacheData(key, {
          data: freshData,
          timestamp: Date.now()
        });
        
        setLoading(false);
        return freshData;
      } else {
        // If offline and no cache, throw error
        if (!data) {
          throw new Error('No cached data available offline');
        }
        setLoading(false);
        return data;
      }
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      
      // Return cached data if available, even if stale
      if (data) {
        return data;
      }
      throw err;
    }
  }, [key, fetcher, cacheFirst, staleTime, isOnline, getCachedData, cacheData, data]);

  const refetch = useCallback(() => {
    return fetchData(false); // Force network fetch
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline && refetchOnReconnect && (isStale || error)) {
      fetchData(false);
    }
  }, [isOnline, refetchOnReconnect, isStale, error, fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    refetch
  };
}

/**
 * Hook for offline-aware mutations
 */
export function useOfflineMutation<T, V = any>(
  mutationFn: (variables: V) => Promise<T>,
  options: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: Error, variables: V) => void;
    optimisticUpdate?: (variables: V) => T;
    rollback?: (variables: V) => void;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { isOnline, queueAction } = useOffline();

  const mutate = useCallback(async (variables: V) => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Execute mutation immediately if online
        const result = await mutationFn(variables);
        options.onSuccess?.(result, variables);
        setLoading(false);
        return result;
      } else {
        // Queue for offline execution
        const actionId = queueAction({
          type: 'mutation',
          endpoint: '', // TODO: Add endpoint
          method: 'POST',
          data: variables,
          maxRetries: 3
        });

        // Apply optimistic update if provided
        if (options.optimisticUpdate) {
          const optimisticResult = options.optimisticUpdate(variables);
          options.onSuccess?.(optimisticResult, variables);
        }

        setLoading(false);
        return actionId; // Return action ID for tracking
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error, variables);
      
      // Rollback optimistic update if provided
      if (!isOnline && options.rollback) {
        options.rollback(variables);
      }
      
      setLoading(false);
      throw error;
    }
  }, [isOnline, mutationFn, queueAction, options]);

  return {
    mutate,
    loading,
    error
  };
}

/**
 * Hook for cache management
 */
export function useCache(cacheName: string = 'default') {
  const get = useCallback(async <T>(key: string): Promise<T | null> => {
    return cacheService.get<T>(cacheName, key);
  }, [cacheName]);

  const set = useCallback(async <T>(
    key: string, 
    data: T, 
    options?: { ttl?: number; tags?: string[] }
  ) => {
    return cacheService.set(cacheName, key, data, options);
  }, [cacheName]);

  const remove = useCallback((key: string) => {
    return cacheService.delete(cacheName, key);
  }, [cacheName]);

  const clear = useCallback(() => {
    cacheService.clear(cacheName);
  }, [cacheName]);

  const invalidate = useCallback((pattern?: RegExp | string, tags?: string[]) => {
    return cacheService.invalidate(cacheName, pattern, tags);
  }, [cacheName]);

  const stats = useCallback(() => {
    return cacheService.getStats(cacheName);
  }, [cacheName]);

  return {
    get,
    set,
    remove,
    clear,
    invalidate,
    stats
  };
}