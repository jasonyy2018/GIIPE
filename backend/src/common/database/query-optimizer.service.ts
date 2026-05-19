import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create optimized pagination query
   */
  createPaginationQuery(options: QueryOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    return {
      skip,
      take: limit,
      orderBy: options.sortBy ? {
        [options.sortBy]: options.sortOrder || 'desc'
      } : undefined,
      include: options.include,
      select: options.select,
    };
  }

  /**
   * Execute paginated query with count
   */
  async executePaginatedQuery<T>(
    model: any,
    where: any,
    options: QueryOptions
  ): Promise<PaginationResult<T>> {
    const query = this.createPaginationQuery(options);
    const page = options.page || 1;
    const limit = options.limit || 10;

    // Execute count and data queries in parallel
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        ...query,
      }),
      model.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Create optimized include for related data
   */
  createOptimizedInclude(relations: string[]): Record<string, any> {
    const include: Record<string, any> = {};

    for (const relation of relations) {
      const parts = relation.split('.');
      let current = include;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = true;
        } else {
          if (!current[part]) {
            current[part] = { include: {} };
          }
          current = current[part].include;
        }
      }
    }

    return include;
  }

  /**
   * Create optimized select for specific fields
   */
  createOptimizedSelect(fields: string[]): Record<string, boolean> {
    const select: Record<string, boolean> = {};
    
    for (const field of fields) {
      select[field] = true;
    }
    
    return select;
  }

  /**
   * Log slow queries for monitoring
   */
  async logSlowQuery(queryName: string, duration: number, threshold: number = 1000) {
    if (duration > threshold) {
      this.logger.warn(
        `Slow query detected: ${queryName} took ${duration}ms (threshold: ${threshold}ms)`
      );
    }
  }

  /**
   * Execute query with performance monitoring
   */
  async executeWithMonitoring<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    threshold?: number
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      await this.logSlowQuery(queryName, duration, threshold);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Query failed: ${queryName} after ${duration}ms`,
        error
      );
      throw error;
    }
  }

  /**
   * Common query patterns for optimization
   */
  patterns = {
    // User with minimal profile data
    userMinimal: {
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    },

    // Event with basic information
    eventBasic: {
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        status: true,
        maxAttendees: true,
        createdAt: true,
      }
    },

    // Event with registration count
    eventWithCount: {
      include: {
        registrations: {
          select: { id: true }
        },
        _count: {
          select: { registrations: true }
        }
      }
    },

    // News with author
    newsWithAuthor: {
      include: {
        author: {
          select: {
            id: true,
            username: true,
          }
        }
      }
    },

    // Comments with user
    commentsWithUser: {
      include: {
        user: {
          select: {
            id: true,
            username: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    },
  };
}