import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  tags?: string[]; // Cache tags for invalidation
  priority?: 'low' | 'medium' | 'high'; // Cache priority for eviction
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  averageResponseTime: number;
  lastUpdated: Date;
}

export interface CacheWarmupConfig {
  key: string;
  factory: () => Promise<any>;
  ttl: number;
  priority: 'low' | 'medium' | 'high';
  schedule?: string; // Cron expression for automatic warming
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly metrics: Map<string, CacheMetrics> = new Map();
  private readonly warmupConfigs: Map<string, CacheWarmupConfig> = new Map();
  private readonly taggedKeys: Map<string, Set<string>> = new Map();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.initializeMetrics();
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): void {
    this.metrics.set('global', {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      lastUpdated: new Date(),
    });
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(key: string, isHit: boolean, responseTime: number): void {
    const globalMetrics = this.metrics.get('global')!;
    const keyMetrics = this.metrics.get(key) || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      lastUpdated: new Date(),
    };

    // Update global metrics
    globalMetrics.totalRequests++;
    if (isHit) {
      globalMetrics.hits++;
    } else {
      globalMetrics.misses++;
    }
    globalMetrics.hitRate = (globalMetrics.hits / globalMetrics.totalRequests) * 100;
    globalMetrics.averageResponseTime = 
      (globalMetrics.averageResponseTime * (globalMetrics.totalRequests - 1) + responseTime) / 
      globalMetrics.totalRequests;
    globalMetrics.lastUpdated = new Date();

    // Update key-specific metrics
    keyMetrics.totalRequests++;
    if (isHit) {
      keyMetrics.hits++;
    } else {
      keyMetrics.misses++;
    }
    keyMetrics.hitRate = (keyMetrics.hits / keyMetrics.totalRequests) * 100;
    keyMetrics.averageResponseTime = 
      (keyMetrics.averageResponseTime * (keyMetrics.totalRequests - 1) + responseTime) / 
      keyMetrics.totalRequests;
    keyMetrics.lastUpdated = new Date();

    this.metrics.set('global', globalMetrics);
    this.metrics.set(key, keyMetrics);
  }

  /**
   * Get value from cache with performance tracking
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const value = await this.cacheManager.get<T>(key);
      const responseTime = Date.now() - startTime;
      
      if (value) {
        this.logger.debug(`Cache hit for key: ${key} (${responseTime}ms)`);
        this.updateMetrics(key, true, responseTime);
      } else {
        this.logger.debug(`Cache miss for key: ${key} (${responseTime}ms)`);
        this.updateMetrics(key, false, responseTime);
      }
      return value || null;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Cache get error for key ${key}:`, error);
      this.updateMetrics(key, false, responseTime);
      return null;
    }
  }

  /**
   * Set value in cache with tagging support
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl || 300; // Default 5 minutes
      await this.cacheManager.set(key, value, ttl * 1000);
      
      // Handle cache tags for invalidation
      if (options?.tags) {
        for (const tag of options.tags) {
          if (!this.taggedKeys.has(tag)) {
            this.taggedKeys.set(tag, new Set());
          }
          this.taggedKeys.get(tag)!.add(key);
        }
      }
      
      this.logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s, Tags: ${options?.tags?.join(', ') || 'none'}`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete cache keys matching a pattern (works with Redis)
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // Try to access Redis store directly if available
      const store = (this.cacheManager as any).store;
      if (store && typeof store.keys === 'function') {
        // Redis store supports pattern matching
        const keys = await store.keys(pattern);
        if (keys && keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.del(key)));
          this.logger.debug(`Deleted ${keys.length} cache keys matching pattern: ${pattern}`);
        }
      } else {
        // Fallback: try to delete the pattern as-is (might work for some stores)
        await this.del(pattern);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete cache pattern ${pattern}:`, error);
      // Fallback: try to delete the pattern as-is
      try {
        await this.del(pattern);
      } catch (fallbackError) {
        this.logger.error(`Fallback cache delete also failed for pattern ${pattern}:`, fallbackError);
      }
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      // Note: cache-manager v5+ doesn't have reset method
      // This is a placeholder - in production you'd implement pattern-based deletion
      this.logger.debug('Cache reset requested (not implemented in current cache-manager version)');
    } catch (error) {
      this.logger.error('Cache reset error:', error);
    }
  }

  /**
   * Get or set pattern - if key exists return it, otherwise compute and cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Cache keys for different entities
   */
  keys = {
    user: (id: string) => this.generateKey('user', id),
    userProfile: (id: string) => this.generateKey('user_profile', id),
    event: (id: string) => this.generateKey('event', id),
    eventList: (filters: string) => this.generateKey('events', filters),
    news: (id: string) => this.generateKey('news', id),
    newsList: (filters: string) => this.generateKey('news_list', filters),
    registration: (userId: string, eventId: string) => 
      this.generateKey('registration', userId, eventId),
    userRegistrations: (userId: string) => 
      this.generateKey('user_registrations', userId),
    eventRegistrations: (eventId: string) => 
      this.generateKey('event_registrations', eventId),
    submission: (id: string) => this.generateKey('submission', id),
    userSubmissions: (userId: string) => 
      this.generateKey('user_submissions', userId),
    comments: (targetType: string, targetId: string) => 
      this.generateKey('comments', targetType, targetId),
    analytics: (type: string, period: string) => 
      this.generateKey('analytics', type, period),
    sensitiveWords: () => this.generateKey('sensitive_words'),
    systemSettings: () => this.generateKey('system_settings'),
  };

  /**
   * Cache TTL configurations (in seconds)
   */
  ttl = {
    short: 60, // 1 minute
    medium: 300, // 5 minutes
    long: 1800, // 30 minutes
    veryLong: 3600, // 1 hour
    daily: 86400, // 24 hours
  };

  /**
   * Invalidate related caches when data changes
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const keys = [
        this.keys.user(userId),
        this.keys.userProfile(userId),
        this.keys.userRegistrations(userId),
        this.keys.userSubmissions(userId),
      ];
      
      await Promise.all(keys.map(key => this.del(key)));
      this.logger.debug(`Invalidated user cache for user: ${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate user cache for user: ${userId}`, error);
      // Don't throw - cache invalidation failure shouldn't break the main operation
    }
  }

  async invalidateEventCache(eventId: string): Promise<void> {
    try {
      const keys = [
        this.keys.event(eventId),
        this.keys.eventRegistrations(eventId),
      ];
      
      // Delete specific keys
      await Promise.all(keys.map(key => this.del(key)));
      
      // Delete all event list caches using pattern matching
      await this.delPattern('eventscontroller:findAll:*');
      await this.delPattern('eventscontroller:findOne:*');
      
      this.logger.debug(`Invalidated event cache for event: ${eventId}`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate event cache for event: ${eventId}`, error);
      // Don't throw - cache invalidation failure shouldn't break the main operation
    }
  }

  async invalidateNewsCache(newsId?: string): Promise<void> {
    try {
      const keys = ['news_list:*']; // Invalidate all news lists
      if (newsId) {
        keys.push(this.keys.news(newsId));
      }
      
      await Promise.all(keys.map(key => this.del(key)));
      this.logger.debug(`Invalidated news cache${newsId ? ` for news: ${newsId}` : ''}`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate news cache${newsId ? ` for news: ${newsId}` : ''}`, error);
      // Don't throw - cache invalidation failure shouldn't break the main operation
    }
  }

  async invalidateCommentsCache(targetType: string, targetId: string): Promise<void> {
    try {
      const key = this.keys.comments(targetType, targetId);
      await this.del(key);
      this.logger.debug(`Invalidated comments cache for ${targetType}:${targetId}`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate comments cache for ${targetType}:${targetId}`, error);
      // Don't throw - cache invalidation failure shouldn't break the main operation
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTag(tag: string): Promise<void> {
    const keys = this.taggedKeys.get(tag);
    if (keys) {
      await Promise.all(Array.from(keys).map(key => this.del(key)));
      this.taggedKeys.delete(tag);
      this.logger.debug(`Invalidated ${keys.size} cache entries with tag: ${tag}`);
    }
  }

  /**
   * Invalidate multiple tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    await Promise.all(tags.map(tag => this.invalidateByTag(tag)));
  }

  /**
   * Get cache metrics
   */
  getMetrics(key?: string): CacheMetrics | null {
    return this.metrics.get(key || 'global') || null;
  }

  /**
   * Get all cache metrics
   */
  getAllMetrics(): Map<string, CacheMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Reset metrics
   */
  resetMetrics(key?: string): void {
    if (key) {
      this.metrics.delete(key);
    } else {
      this.metrics.clear();
      this.initializeMetrics();
    }
  }

  /**
   * Register cache warmup configuration
   */
  registerWarmup(config: CacheWarmupConfig): void {
    this.warmupConfigs.set(config.key, config);
    this.logger.debug(`Registered cache warmup for key: ${config.key}`);
  }

  /**
   * Warm up specific cache key
   */
  async warmup(key: string): Promise<void> {
    const config = this.warmupConfigs.get(key);
    if (!config) {
      this.logger.warn(`No warmup config found for key: ${key}`);
      return;
    }

    try {
      const startTime = Date.now();
      const value = await config.factory();
      await this.set(config.key, value, { ttl: config.ttl, priority: config.priority });
      const duration = Date.now() - startTime;
      this.logger.debug(`Cache warmed up for key: ${key} (${duration}ms)`);
    } catch (error) {
      this.logger.error(`Cache warmup failed for key ${key}:`, error);
    }
  }

  /**
   * Warm up all registered caches
   */
  async warmupAll(): Promise<void> {
    const keys = Array.from(this.warmupConfigs.keys());
    this.logger.debug(`Warming up ${keys.length} cache entries`);
    
    // Prioritize high priority caches
    const sortedKeys = keys.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = this.warmupConfigs.get(a)!.priority;
      const bPriority = this.warmupConfigs.get(b)!.priority;
      return priorityOrder[bPriority] - priorityOrder[aPriority];
    });

    await Promise.all(sortedKeys.map(key => this.warmup(key)));
  }

  /**
   * Scheduled cache warmup for high-priority items
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledWarmup(): Promise<void> {
    const highPriorityKeys = Array.from(this.warmupConfigs.entries())
      .filter(([_, config]) => config.priority === 'high')
      .map(([key, _]) => key);

    if (highPriorityKeys.length > 0) {
      this.logger.debug(`Scheduled warmup for ${highPriorityKeys.length} high-priority cache entries`);
      await Promise.all(highPriorityKeys.map(key => this.warmup(key)));
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    totalTags: number;
    warmupConfigs: number;
    metrics: CacheMetrics;
  }> {
    const totalTags = this.taggedKeys.size;
    const totalTaggedKeys = Array.from(this.taggedKeys.values())
      .reduce((sum, keys) => sum + keys.size, 0);
    
    return {
      totalKeys: totalTaggedKeys,
      totalTags,
      warmupConfigs: this.warmupConfigs.size,
      metrics: this.getMetrics()!,
    };
  }

  /**
   * Intelligent cache preloading based on usage patterns
   */
  async intelligentPreload(): Promise<void> {
    const metrics = this.getAllMetrics();
    const highUsageKeys = Array.from(metrics.entries())
      .filter(([key, metric]) => 
        key !== 'global' && 
        metric.totalRequests > 10 && 
        metric.hitRate > 80
      )
      .sort((a, b) => b[1].totalRequests - a[1].totalRequests)
      .slice(0, 10) // Top 10 most used keys
      .map(([key, _]) => key);

    for (const key of highUsageKeys) {
      const config = this.warmupConfigs.get(key);
      if (config) {
        await this.warmup(key);
      }
    }

    this.logger.debug(`Preloaded ${highUsageKeys.length} high-usage cache entries`);
  }

  /**
   * Cache health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      connectivity: boolean;
      hitRate: number;
      averageResponseTime: number;
      errorRate: number;
    };
  }> {
    try {
      const testKey = 'health_check_' + Date.now();
      const testValue = { timestamp: Date.now() };
      
      const startTime = Date.now();
      await this.set(testKey, testValue, { ttl: 10 });
      const setValue = await this.get(testKey);
      await this.del(testKey);
      const responseTime = Date.now() - startTime;
      
      const metrics = this.getMetrics()!;
      const connectivity = setValue !== null;
      const hitRate = metrics.hitRate;
      const avgResponseTime = metrics.averageResponseTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!connectivity || hitRate < 50 || avgResponseTime > 1000) {
        status = 'unhealthy';
      } else if (hitRate < 70 || avgResponseTime > 500) {
        status = 'degraded';
      }
      
      return {
        status,
        details: {
          connectivity,
          hitRate,
          averageResponseTime: avgResponseTime,
          errorRate: 0, // Would need to track errors separately
        },
      };
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          connectivity: false,
          hitRate: 0,
          averageResponseTime: 0,
          errorRate: 100,
        },
      };
    }
  }
}