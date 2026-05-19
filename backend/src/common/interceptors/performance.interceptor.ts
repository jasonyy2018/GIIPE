import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceService } from '../performance/performance.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private readonly performanceService: PerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    const operationName = `${className}.${methodName}`;
    const endMeasurement = this.performanceService.startMeasurement(operationName);

    const metadata = {
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      userId: request.user?.id,
    };

    return next.handle().pipe(
      tap({
        next: (result) => {
          const metric = endMeasurement();

          // Log performance for monitoring
          if (metric.duration > 1000) {
            this.logger.warn(
              `Slow request: ${request.method} ${request.url} took ${metric.duration.toFixed(2)}ms`
            );
          }
        },
        error: (error) => {
          endMeasurement();

          this.logger.error(
            `Request failed: ${request.method} ${request.url}`,
            error.stack
          );
        },
      })
    );
  }

  private getResultSize(result: any): number {
    try {
      if (result === null || result === undefined) {
        return 0;
      }
      
      if (typeof result === 'string') {
        return result.length;
      }
      
      if (Array.isArray(result)) {
        return result.length;
      }
      
      if (typeof result === 'object') {
        return JSON.stringify(result).length;
      }
      
      return 0;
    } catch {
      return 0;
    }
  }
}