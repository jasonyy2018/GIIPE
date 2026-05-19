/**
 * Cache Management Service
 * Provides intelligent cache invalidation strategies and cache management
 */

export interface CacheConfig {
  name: string;
  maxSize: number; // in bytes
  maxAge: number; // in milliseconds
  strategy: 'LRU' | 'LFU' | 'FIFO' | 'TTL';
  compression?: boolean;
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  ttl?: number;
  tags?: string[];
}

export interface CacheStats {
  name: string;
  entries: number;
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}

export interface InvalidationRule {
  id: string;
  pattern: RegExp | string;
  condition: (entry: CacheEntry) => boolean;
  action: 'delete' | 'refresh' | 'mark-stale';
}

class CacheService {
  private caches = new Map<string, Map<string, CacheEntry>>();
  private configs = new Map<string, CacheConfig>();
  private stats = new Map<string, CacheStats>();
  private invalidationRules: InvalidationRule[] = [];
  private compressionEnabled = false;

  constructor() {
    this.initializeDefaultCaches();
    this.startCleanupInterval();
    this.setupStorageListener();
  }

  /**
   * Create or configure a cache
   */
  createCache(config: CacheConfig): void {
    this.configs.set(config.name, config);
    this.caches.set(config.name, new Map());
    this.stats.set(config.name, {
      name: config.name,
      entries: 0,
      size: 0,
      maxSize: config.maxSize,
      hitRate: 0,
      missRate: 0,
      evictions: 0
    });

    if (config.compression) {
      this.compressionEnabled = true;
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(cacheName: string, key: string): Promise<T | null> {
    const cache = this.caches.get(cacheName);
    const config = this.configs.get(cacheName);
    
    if (!cache || !config) {
      return null;
    }

    const entry = cache.get(key);
    if (!entry) {
      this.updateStats(cacheName, 'miss');
      return null;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      cache.delete(key);
      this.updateStats(cacheName, 'miss');
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.updateStats(cacheName, 'hit');
    
    // Decompress if needed
    const data = config.compression ? await this.decompress(entry.data) : entry.data;
    return data;
  }

  /**
   * Set data in cache
   */
  async set<T>(
    cacheName: string, 
    key: string, 
    data: T, 
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<void> {
    const cache = this.caches.get(cacheName);
    const config = this.configs.get(cacheName);
    
    if (!cache || !config) {
      throw new Error(`Cache ${cacheName} not found`);
    }

    // Compress if enabled
    const processedData = config.compression ? await this.compress(data) : data;
    const size = this.estimateSize(processedData);

    // Check if we need to evict entries
    await this.ensureSpace(cacheName, size);

    const entry: CacheEntry = {
      key,
      data: processedData,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      ttl: options.ttl,
      tags: options.tags
    };

    cache.set(key, entry);
    this.updateCacheSize(cacheName, size);
  }

  /**
   * Delete from cache
   */
  delete(cacheName: string, key: string): boolean {
    const cache = this.caches.get(cacheName);
    if (!cache) return false;

    const entry = cache.get(key);
    if (entry) {
      cache.delete(key);
      this.updateCacheSize(cacheName, -entry.size);
      return true;
    }
    return false;
  }

  /**
   * Clear entire cache
   */
  clear(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (cache) {
      cache.clear();
      const stats = this.stats.get(cacheName);
      if (stats) {
        stats.entries = 0;
        stats.size = 0;
      }
    }
  }

  /**
   * Invalidate cache entries by pattern or tags
   */
  invalidate(cacheName: string, pattern?: RegExp | string, tags?: string[]): number {
    const cache = this.caches.get(cacheName);
    if (!cache) return 0;

    let invalidated = 0;
    const toDelete: string[] = [];

    for (const [key, entry] of Array.from(cache.entries())) {
      let shouldInvalidate = false;

      // Check pattern match
      if (pattern) {
        if (pattern instanceof RegExp) {
          shouldInvalidate = pattern.test(key);
        } else {
          shouldInvalidate = key.includes(pattern);
        }
      }

      // Check tag match
      if (tags && entry.tags) {
        shouldInvalidate = shouldInvalidate || tags.some(tag => entry.tags!.includes(tag));
      }

      if (shouldInvalidate) {
        toDelete.push(key);
      }
    }

    // Delete matched entries
    toDelete.forEach(key => {
      this.delete(cacheName, key);
      invalidated++;
    });

    return invalidated;
  }

  /**
   * Add invalidation rule
   */
  addInvalidationRule(rule: InvalidationRule): void {
    this.invalidationRules.push(rule);
  }

  /**
   * Remove invalidation rule
   */
  removeInvalidationRule(ruleId: string): boolean {
    const index = this.invalidationRules.findIndex(rule => rule.id === ruleId);
    if (index > -1) {
      this.invalidationRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get cache statistics
   */
  getStats(cacheName?: string): CacheStats | CacheStats[] {
    if (cacheName) {
      return this.stats.get(cacheName) || this.createEmptyStats(cacheName);
    }
    return Array.from(this.stats.values());
  }

  /**
   * Refresh cache entry
   */
  async refresh<T>(
    cacheName: string, 
    key: string, 
    fetcher: () => Promise<T>
  ): Promise<T> {
    try {
      const data = await fetcher();
      await this.set(cacheName, key, data);
      return data;
    } catch (error) {
      // Return stale data if available
      const stale = await this.get<T>(cacheName, key);
      if (stale !== null) {
        return stale;
      }
      throw error;
    }
  }

  /**
   * Preload cache entries
   */
  async preload<T>(
    cacheName: string, 
    entries: Array<{ key: string; fetcher: () => Promise<T> }>
  ): Promise<void> {
    const promises = entries.map(async ({ key, fetcher }) => {
      try {
        const data = await fetcher();
        await this.set(cacheName, key, data);
      } catch (error) {
        console.warn(`Failed to preload cache entry ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Export cache data
   */
  export(cacheName: string): Record<string, any> {
    const cache = this.caches.get(cacheName);
    if (!cache) return {};

    const exported: Record<string, any> = {};
    for (const [key, entry] of Array.from(cache.entries())) {
      if (!this.isExpired(entry)) {
        exported[key] = {
          data: entry.data,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          tags: entry.tags
        };
      }
    }
    return exported;
  }

  /**
   * Import cache data
   */
  async import(cacheName: string, data: Record<string, any>): Promise<void> {
    for (const [key, entry] of Object.entries(data)) {
      await this.set(cacheName, key, entry.data, {
        ttl: entry.ttl,
        tags: entry.tags
      });
    }
  }

  private initializeDefaultCaches(): void {
    // Dashboard data cache
    this.createCache({
      name: 'dashboard-data',
      maxSize: 10 * 1024 * 1024, // 10MB
      maxAge: 5 * 60 * 1000, // 5 minutes
      strategy: 'LRU',
      compression: true
    });

    // User interface cache
    this.createCache({
      name: 'ui-state',
      maxSize: 5 * 1024 * 1024, // 5MB
      maxAge: 30 * 60 * 1000, // 30 minutes
      strategy: 'LRU'
    });

    // API response cache
    this.createCache({
      name: 'api-responses',
      maxSize: 20 * 1024 * 1024, // 20MB
      maxAge: 10 * 60 * 1000, // 10 minutes
      strategy: 'LRU',
      compression: true
    });

    // Static assets cache
    this.createCache({
      name: 'static-assets',
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      strategy: 'LFU'
    });
  }

  private async ensureSpace(cacheName: string, requiredSize: number): Promise<void> {
    const cache = this.caches.get(cacheName);
    const config = this.configs.get(cacheName);
    const stats = this.stats.get(cacheName);
    
    if (!cache || !config || !stats) return;

    // Check if we have enough space
    if (stats.size + requiredSize <= config.maxSize) {
      return;
    }

    // Evict entries based on strategy
    const entries = Array.from(cache.entries()).map(([cacheKey, entry]) => {
      const { key: _, ...entryWithoutKey } = entry as any;
      return { key: cacheKey, ...entryWithoutKey };
    });
    const toEvict = this.selectEvictionCandidates(entries, config.strategy, requiredSize);

    for (const key of toEvict) {
      const entry = cache.get(key);
      if (entry) {
        cache.delete(key);
        this.updateCacheSize(cacheName, -entry.size);
        stats.evictions++;
      }
    }
  }

  private selectEvictionCandidates(
    entries: Array<CacheEntry & { key: string }>, 
    strategy: string, 
    requiredSize: number
  ): string[] {
    let sorted: Array<CacheEntry & { key: string }>;
    
    switch (strategy) {
      case 'LRU': // Least Recently Used
        sorted = entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
        break;
      
      case 'LFU': // Least Frequently Used
        sorted = entries.sort((a, b) => a.accessCount - b.accessCount);
        break;
      
      case 'FIFO': // First In, First Out
        sorted = entries.sort((a, b) => a.timestamp - b.timestamp);
        break;
      
      case 'TTL': // Time To Live
        sorted = entries.sort((a, b) => {
          const aExpiry = a.timestamp + (a.ttl || Infinity);
          const bExpiry = b.timestamp + (b.ttl || Infinity);
          return aExpiry - bExpiry;
        });
        break;
      
      default:
        sorted = entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
    }

    const toEvict: string[] = [];
    let freedSize = 0;

    for (const entry of sorted) {
      toEvict.push(entry.key);
      freedSize += entry.size;
      
      if (freedSize >= requiredSize) {
        break;
      }
    }

    return toEvict;
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private estimateSize(data: any): number {
    if (typeof data === 'string') {
      return data.length * 2; // UTF-16
    }
    return JSON.stringify(data).length * 2;
  }

  private async compress(data: any): Promise<any> {
    if (!this.compressionEnabled) return data;
    
    try {
      // Simple compression using JSON stringify + compression
      const jsonString = JSON.stringify(data);
      // In a real implementation, you might use a compression library
      return { compressed: true, data: jsonString };
    } catch {
      return data;
    }
  }

  private async decompress(data: any): Promise<any> {
    if (!data || !data.compressed) return data;
    
    try {
      return JSON.parse(data.data);
    } catch {
      return data;
    }
  }

  private updateStats(cacheName: string, type: 'hit' | 'miss'): void {
    const stats = this.stats.get(cacheName);
    if (!stats) return;

    if (type === 'hit') {
      stats.hitRate = (stats.hitRate * 0.9) + (1 * 0.1); // Exponential moving average
    } else {
      stats.missRate = (stats.missRate * 0.9) + (1 * 0.1);
    }
  }

  private updateCacheSize(cacheName: string, sizeChange: number): void {
    const stats = this.stats.get(cacheName);
    if (stats) {
      stats.size += sizeChange;
      stats.entries = this.caches.get(cacheName)?.size || 0;
    }
  }

  private createEmptyStats(cacheName: string): CacheStats {
    return {
      name: cacheName,
      entries: 0,
      size: 0,
      maxSize: 0,
      hitRate: 0,
      missRate: 0,
      evictions: 0
    };
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Run cleanup every minute
  }

  private cleanup(): void {
    for (const [cacheName, cache] of Array.from(this.caches.entries())) {
      const toDelete: string[] = [];
      
      for (const [key, entry] of Array.from(cache.entries())) {
        if (this.isExpired(entry)) {
          toDelete.push(key);
        }
      }

      toDelete.forEach(key => this.delete(cacheName, key));
    }

    // Apply invalidation rules
    this.applyInvalidationRules();
  }

  private applyInvalidationRules(): void {
    for (const rule of this.invalidationRules) {
      for (const [cacheName, cache] of Array.from(this.caches.entries())) {
        const toProcess: string[] = [];
        
        for (const [key, entry] of Array.from(cache.entries())) {
          let matches = false;
          
          if (rule.pattern instanceof RegExp) {
            matches = rule.pattern.test(key);
          } else {
            matches = key.includes(rule.pattern);
          }
          
          if (matches && rule.condition(entry)) {
            toProcess.push(key);
          }
        }

        for (const key of toProcess) {
          switch (rule.action) {
            case 'delete':
              this.delete(cacheName, key);
              break;
            case 'mark-stale':
              const entry = cache.get(key);
              if (entry) {
                entry.ttl = 0; // Mark as immediately expired
              }
              break;
            // 'refresh' would require a fetcher function
          }
        }
      }
    }
  }

  private setupStorageListener(): void {
    // Listen for storage events to sync cache across tabs
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('cache-invalidate-')) {
        const cacheName = event.key.replace('cache-invalidate-', '');
        const pattern = event.newValue;
        
        if (pattern) {
          this.invalidate(cacheName, pattern);
        }
      }
    });
  }
}

export const cacheService = new CacheService();