/**
 * Intelligent Data Loading Service
 * Implements progressive data loading, predictive prefetching, and efficient synchronization
 */

export interface DataLoadingOptions {
  priority: 'critical' | 'high' | 'normal' | 'low';
  cache?: boolean;
  prefetch?: boolean;
  timeout?: number;
  retries?: number;
}

export interface LoadingState {
  isLoading: boolean;
  progress: number;
  error?: Error;
  lastUpdated?: Date;
}

export interface DataRequest<T = any> {
  id: string;
  endpoint: string;
  params?: Record<string, any>;
  options: DataLoadingOptions;
  transform?: (data: any) => T;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: Date;
  ttl: number;
  hits: number;
  size: number;
}

export interface PrefetchRule {
  id: string;
  condition: (userBehavior: UserBehavior) => boolean;
  requests: DataRequest[];
  priority: number;
}

export interface UserBehavior {
  currentPage: string;
  timeOnPage: number;
  scrollPosition: number;
  clickPattern: string[];
  lastActions: string[];
  preferences: Record<string, any>;
}

class DataLoadingService {
  private cache = new Map<string, CacheEntry>();
  private loadingStates = new Map<string, LoadingState>();
  private requestQueue: DataRequest[] = [];
  private prefetchRules: PrefetchRule[] = [];
  private userBehavior: UserBehavior | null = null;
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private currentCacheSize = 0;
  private abortControllers = new Map<string, AbortController>();

  constructor() {
    this.initializePrefetchRules();
    this.startBackgroundProcessing();
  }

  /**
   * Load data with progressive loading strategy
   */
  async loadData<T>(request: DataRequest<T>): Promise<T> {
    const { id, endpoint, params, options, transform } = request;
    
    // Check cache first
    if (options.cache !== false) {
      const cached = this.getCachedData<T>(id);
      if (cached) {
        return cached;
      }
    }

    // Set loading state
    this.setLoadingState(id, { isLoading: true, progress: 0 });

    try {
      // Create abort controller for request cancellation
      const controller = new AbortController();
      this.abortControllers.set(id, controller);

      // Determine loading strategy based on priority
      const data = await this.executeRequest<T>(request, controller.signal);
      
      // Transform data if needed
      const result = transform ? transform(data) : data;

      // Cache the result
      if (options.cache !== false) {
        this.setCachedData(id, result);
      }

      // Update loading state
      this.setLoadingState(id, { 
        isLoading: false, 
        progress: 100, 
        lastUpdated: new Date() 
      });

      // Cleanup abort controller
      this.abortControllers.delete(id);

      return result;
    } catch (error) {
      this.setLoadingState(id, { 
        isLoading: false, 
        progress: 0, 
        error: error as Error 
      });
      
      this.abortControllers.delete(id);
      throw error;
    }
  }

  /**
   * Load multiple data requests with intelligent batching
   */
  async loadBatch<T>(requests: DataRequest<T>[]): Promise<T[]> {
    // Group requests by priority
    const priorityGroups = this.groupByPriority(requests);
    const results: T[] = [];

    // Load critical and high priority first
    for (const priority of ['critical', 'high', 'normal', 'low']) {
      const group = priorityGroups[priority as keyof typeof priorityGroups];
      if (group && group.length > 0) {
        const batchResults = await Promise.allSettled(
          group.map(request => this.loadData(request))
        );
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results[requests.indexOf(group[index])] = result.value;
          }
        });
      }
    }

    return results;
  }

  /**
   * Prefetch data based on user behavior patterns
   */
  async prefetchData(userBehavior: UserBehavior): Promise<void> {
    this.userBehavior = userBehavior;

    // Find applicable prefetch rules
    const applicableRules = this.prefetchRules.filter(rule => 
      rule.condition(userBehavior)
    );

    // Sort by priority
    applicableRules.sort((a, b) => b.priority - a.priority);

    // Execute prefetch requests
    for (const rule of applicableRules) {
      for (const request of rule.requests) {
        // Only prefetch if not already cached
        if (!this.getCachedData(request.id)) {
          this.requestQueue.push({
            ...request,
            options: { ...request.options, priority: 'low' }
          });
        }
      }
    }
  }

  /**
   * Get loading state for a request
   */
  getLoadingState(id: string): LoadingState | null {
    return this.loadingStates.get(id) || null;
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(id);
    }
    
    this.setLoadingState(id, { isLoading: false, progress: 0 });
  }

  /**
   * Clear cache entries
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          const entry = this.cache.get(key);
          if (entry) {
            this.currentCacheSize -= entry.size;
          }
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.currentCacheSize = 0;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      size: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      hitRate: this.calculateHitRate()
    };
  }

  private async executeRequest<T>(
    request: DataRequest<T>, 
    signal: AbortSignal
  ): Promise<T> {
    const { endpoint, params, options } = request;
    
    const url = new URL(endpoint, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Extract only RequestInit-compatible properties from options
    const { priority, cache, prefetch, timeout, retries, ...restOptions } = options;
    
    // Build fetch options with only RequestInit-compatible properties
    const fetchInit: RequestInit = {
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(restOptions as any).headers
      },
      method: (restOptions as any).method,
      body: (restOptions as any).body,
      mode: (restOptions as any).mode,
      credentials: (restOptions as any).credentials,
      redirect: (restOptions as any).redirect,
      referrer: (restOptions as any).referrer,
      referrerPolicy: (restOptions as any).referrerPolicy,
      integrity: (restOptions as any).integrity,
      keepalive: (restOptions as any).keepalive
    };
    
    const response = await fetch(url.toString(), fetchInit);

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private groupByPriority(requests: DataRequest[]) {
    return requests.reduce((groups, request) => {
      const priority = request.options.priority;
      if (!groups[priority]) {
        groups[priority] = [];
      }
      groups[priority].push(request);
      return groups;
    }, {} as Record<string, DataRequest[]>);
  }

  private getCachedData<T>(id: string): T | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    // Check if cache entry is still valid
    const now = Date.now();
    const age = now - entry.timestamp.getTime();
    
    if (age > entry.ttl) {
      this.cache.delete(id);
      this.currentCacheSize -= entry.size;
      return null;
    }

    // Update hit count
    entry.hits++;
    return entry.data;
  }

  private setCachedData<T>(id: string, data: T, ttl = 5 * 60 * 1000): void {
    const size = this.estimateSize(data);
    
    // Check if we need to evict entries
    if (this.currentCacheSize + size > this.maxCacheSize) {
      this.evictLeastUsed(size);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl,
      hits: 0,
      size
    };

    this.cache.set(id, entry);
    this.currentCacheSize += size;
  }

  private evictLeastUsed(requiredSize: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by hit rate (hits per age)
    entries.sort(([, a], [, b]) => {
      const ageA = Date.now() - a.timestamp.getTime();
      const ageB = Date.now() - b.timestamp.getTime();
      const rateA = a.hits / (ageA || 1);
      const rateB = b.hits / (ageB || 1);
      return rateA - rateB;
    });

    let freedSize = 0;
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      this.currentCacheSize -= entry.size;
      freedSize += entry.size;
      
      if (freedSize >= requiredSize) {
        break;
      }
    }
  }

  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate
  }

  private calculateHitRate(): number {
    if (this.cache.size === 0) return 0;
    
    const totalHits = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.hits, 0);
    
    return totalHits / this.cache.size;
  }

  private setLoadingState(id: string, state: LoadingState): void {
    this.loadingStates.set(id, state);
  }

  private initializePrefetchRules(): void {
    this.prefetchRules = [
      {
        id: 'dashboard-widgets',
        condition: (behavior) => behavior.currentPage === '/dashboard',
        requests: [
          {
            id: 'upcoming-events',
            endpoint: '/api/events/upcoming',
            options: { priority: 'high', cache: true }
          },
          {
            id: 'recent-activity',
            endpoint: '', // TODO: Add endpoint
            options: { priority: 'normal', cache: true }
          }
        ],
        priority: 10
      },
      {
        id: 'user-scrolling-down',
        condition: (behavior) => behavior.scrollPosition > 0.5,
        requests: [
          {
            id: 'more-content',
            endpoint: '', // TODO: Add endpoint
            options: { priority: 'low', cache: true }
          }
        ],
        priority: 5
      }
    ];
  }

  private startBackgroundProcessing(): void {
    setInterval(() => {
      this.processRequestQueue();
      this.cleanupExpiredCache();
    }, 1000);
  }

  private processRequestQueue(): void {
    if (this.requestQueue.length === 0) return;

    // Process up to 3 low-priority requests per cycle
    const requests = this.requestQueue.splice(0, 3);
    
    requests.forEach(request => {
      this.loadData(request).catch(error => {
        console.warn(`Background prefetch failed for ${request.id}:`, error);
      });
    });
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      const age = now - entry.timestamp.getTime();
      if (age > entry.ttl) {
        this.cache.delete(key);
        this.currentCacheSize -= entry.size;
      }
    }
  }
}

export const dataLoadingService = new DataLoadingService();