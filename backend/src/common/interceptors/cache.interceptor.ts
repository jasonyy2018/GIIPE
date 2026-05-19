import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache/cache.service';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';
export const CACHE_EXEMPT_METADATA = 'cache_exempt';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    // Skip caching for non-GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check if caching is exempt for this route
    const isExempt = this.reflector.get<boolean>(
      CACHE_EXEMPT_METADATA,
      handler,
    );
    if (isExempt) {
      return next.handle();
    }

    // Generate cache key
    const customKey = this.reflector.get<string>(CACHE_KEY_METADATA, handler);
    const cacheKey = customKey || this.generateCacheKey(
      className,
      methodName,
      request.params,
      request.query,
      request.user?.id,
    );

    // Get TTL
    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, handler) || 
                this.cacheService.ttl.medium;

    try {
      // Try to get from cache
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult !== null) {
        this.logger.debug(`Cache hit for ${className}.${methodName}`);
        return of(cachedResult);
      }

      // Execute the method and cache the result
      return next.handle().pipe(
        tap(async (result) => {
          if (result !== null && result !== undefined) {
            await this.cacheService.set(cacheKey, result, { ttl });
            this.logger.debug(`Cached result for ${className}.${methodName}`);
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Cache error for ${className}.${methodName}:`, error);
      return next.handle();
    }
  }

  private generateCacheKey(
    className: string,
    methodName: string,
    params: any,
    query: any,
    userId?: string,
  ): string {
    const keyParts = [className.toLowerCase(), methodName];
    
    // Add params
    if (params && Object.keys(params).length > 0) {
      keyParts.push(JSON.stringify(params));
    }
    
    // Add query parameters (sorted for consistency)
    if (query && Object.keys(query).length > 0) {
      const sortedQuery = Object.keys(query)
        .sort()
        .reduce((result, key) => {
          result[key] = query[key];
          return result;
        }, {} as any);
      keyParts.push(JSON.stringify(sortedQuery));
    }
    
    // Add user context for user-specific data
    if (userId) {
      keyParts.push(`user:${userId}`);
    }
    
    return keyParts.join(':');
  }
}

// Decorators for cache configuration
import { SetMetadata } from '@nestjs/common';

export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);

export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);

export const CacheExempt = () => SetMetadata(CACHE_EXEMPT_METADATA, true);