import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AnalyticsService } from '../analytics.service';
import { Request } from 'express';

@Injectable()
export class ActivityTrackingInterceptor implements NestInterceptor {
  constructor(private readonly analyticsService: AnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;
    
    // Only track authenticated requests
    if (!user?.id) {
      return next.handle();
    }

    const method = request.method;
    const url = request.url;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    // Determine action based on HTTP method and endpoint
    const action = this.getActionFromRequest(method, url, handler);
    const resource = this.getResourceFromController(controller);

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Track successful actions
          this.analyticsService.trackUserActivity({
            userId: user.id,
            action,
            resource,
            resourceId: this.extractResourceId(response, request),
            metadata: {
              method,
              url,
              controller,
              handler,
              timestamp: new Date().toISOString(),
              userAgent: request.headers['user-agent'],
              ip: request.ip,
            },
          }).catch(error => {
            // Silently handle tracking errors to not affect main request
            console.error('Failed to track activity:', error);
          });
        },
        error: (error) => {
          // Track failed actions
          this.analyticsService.trackUserActivity({
            userId: user.id,
            action: `${action}_FAILED`,
            resource,
            metadata: {
              method,
              url,
              controller,
              handler,
              error: error.message,
              timestamp: new Date().toISOString(),
              userAgent: request.headers['user-agent'],
              ip: request.ip,
            },
          }).catch(trackingError => {
            console.error('Failed to track failed activity:', trackingError);
          });
        },
      }),
    );
  }

  private getActionFromRequest(method: string, url: string, handler: string): string {
    // Map HTTP methods to actions
    const methodActionMap: Record<string, string> = {
      GET: 'VIEW',
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    const baseAction = methodActionMap[method] || 'ACTION';

    // Add specific context based on handler name
    if (handler.includes('login')) return 'LOGIN';
    if (handler.includes('logout')) return 'LOGOUT';
    if (handler.includes('register')) return 'REGISTER';
    if (handler.includes('export')) return 'EXPORT';
    if (handler.includes('import')) return 'IMPORT';
    if (handler.includes('publish')) return 'PUBLISH';
    if (handler.includes('approve')) return 'APPROVE';
    if (handler.includes('reject')) return 'REJECT';

    return baseAction;
  }

  private getResourceFromController(controller: string): string {
    // Extract resource name from controller name
    return controller.replace('Controller', '').toLowerCase();
  }

  private extractResourceId(response: any, request: Request): string | undefined {
    // Try to extract resource ID from response or request params
    if (response?.id) return response.id;
    if (request.params?.id) return request.params.id;
    return undefined;
  }
}