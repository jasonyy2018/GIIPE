// Frontend caching utilities

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
}

class CacheManager {
  private memoryCache = new Map<string, CacheItem<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get item from cache
   */
  get<T>(key: string, options: CacheOptions = {}): T | null {
    const storage = options.storage || 'memory';
    
    try {
      let item: CacheItem<T> | null = null;

      switch (storage) {
        case 'memory':
          item = this.memoryCache.get(key) || null;
          break;
        case 'localStorage':
          if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem(key);
            item = stored ? JSON.parse(stored) : null;
          }
          break;
        case 'sessionStorage':
          if (typeof window !== 'undefined' && window.sessionStorage) {
            const stored = sessionStorage.getItem(key);
            item = stored ? JSON.parse(stored) : null;
          }
          break;
      }

      if (!item) return null;

      // Check if item has expired
      if (Date.now() - item.timestamp > item.ttl) {
        this.delete(key, options);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const storage = options.storage || 'memory';
    const ttl = options.ttl || this.defaultTTL;

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    try {
      switch (storage) {
        case 'memory':
          this.memoryCache.set(key, item);
          break;
        case 'localStorage':
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(key, JSON.stringify(item));
          }
          break;
        case 'sessionStorage':
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem(key, JSON.stringify(item));
          }
          break;
      }
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete item from cache
   */
  delete(key: string, options: CacheOptions = {}): void {
    const storage = options.storage || 'memory';

    try {
      switch (storage) {
        case 'memory':
          this.memoryCache.delete(key);
          break;
        case 'localStorage':
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(key);
          }
          break;
        case 'sessionStorage':
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.removeItem(key);
          }
          break;
      }
    } catch (error) {
      console.warn(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  clear(storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): void {
    try {
      switch (storage) {
        case 'memory':
          this.memoryCache.clear();
          break;
        case 'localStorage':
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.clear();
          }
          break;
        case 'sessionStorage':
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.clear();
          }
          break;
      }
    } catch (error) {
      console.warn(`Cache clear error for ${storage}:`, error);
    }
  }

  /**
   * Get or set pattern
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, options);
    return data;
  }

  /**
   * Clean expired items from memory cache
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, item] of Array.from(this.memoryCache.entries())) {
      if (now - item.timestamp > item.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
    };
  }
}

// Singleton instance
export const cache = new CacheManager();

// Cache key generators
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user_profile:${id}`,
  event: (id: string) => `event:${id}`,
  eventList: (filters: string) => `events:${filters}`,
  news: (id: string) => `news:${id}`,
  newsList: (filters: string) => `news_list:${filters}`,
  comments: (targetType: string, targetId: string) => `comments:${targetType}:${targetId}`,
  analytics: (type: string, period: string) => `analytics:${type}:${period}`,
};

// TTL presets (in milliseconds)
export const cacheTTL = {
  short: 1 * 60 * 1000, // 1 minute
  medium: 5 * 60 * 1000, // 5 minutes
  long: 30 * 60 * 1000, // 30 minutes
  veryLong: 60 * 60 * 1000, // 1 hour
  daily: 24 * 60 * 60 * 1000, // 24 hours
};

// React hook for caching
export function useCache() {
  return {
    get: <T>(key: string, options?: CacheOptions) => cache.get<T>(key, options),
    set: <T>(key: string, data: T, options?: CacheOptions) => cache.set(key, data, options),
    delete: (key: string, options?: CacheOptions) => cache.delete(key, options),
    getOrSet: <T>(key: string, factory: () => Promise<T>, options?: CacheOptions) => 
      cache.getOrSet(key, factory, options),
  };
}

// Utility function for API response caching
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  cacheOptions: CacheOptions = {}
): Promise<T> {
  const cacheKey = `api:${url}:${JSON.stringify(options)}`;
  
  return cache.getOrSet(
    cacheKey,
    async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    {
      ttl: cacheTTL.medium,
      storage: 'memory',
      ...cacheOptions,
    }
  );
}

// Clean expired items periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanExpired();
  }, 60000); // Every minute
}