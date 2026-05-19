import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AdminService } from '../admin.service';
import { Request } from 'express';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(private readonly adminService: AdminService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;
    
    const method = request.method;
    const url = request.url;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    // Only log certain actions that require auditing
    if (!this.shouldAuditAction(method, url, handler)) {
      return next.handle();
    }

    const action = this.getAuditAction(method, url, handler);
    const resource = this.getResourceFromController(controller);

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Log successful auditable actions
          this.adminService.createAuditLog({
            userId: user?.id,
            action,
            resource,
            resourceId: this.extractResourceId(response, request),
            details: {
              method,
              url,
              requestBody: this.sanitizeRequestBody(request.body),
              responseStatus: 'success',
              timestamp: new Date().toISOString(),
            },
            ipAddress: request.ip || request.connection.remoteAddress,
            userAgent: request.headers['user-agent'],
          }).catch(error => {
            console.error('Failed to create audit log:', error);
          });
        },
        error: (error) => {
          // Log failed auditable actions
          this.adminService.createAuditLog({
            userId: user?.id,
            action: `${action}_FAILED`,
            resource,
            resourceId: this.extractResourceId(null, request),
            details: {
              method,
              url,
              requestBody: this.sanitizeRequestBody(request.body),
              error: error.message,
              responseStatus: 'error',
              timestamp: new Date().toISOString(),
            },
            ipAddress: request.ip || request.connection.remoteAddress,
            userAgent: request.headers['user-agent'],
          }).catch(auditError => {
            console.error('Failed to create audit log for error:', auditError);
          });
        },
      }),
    );
  }

  private shouldAuditAction(method: string, url: string, handler: string): boolean {
    // Only audit state-changing operations and sensitive actions
    if (method === 'GET' && !this.isSensitiveReadOperation(url, handler)) {
      return false;
    }

    // Skip health checks and non-sensitive endpoints
    if (url.includes('/health') || url.includes('/metrics')) {
      return false;
    }

    return true;
  }

  private isSensitiveReadOperation(url: string, handler: string): boolean {
    // Define sensitive read operations that should be audited
    const sensitivePatterns = [
      '/admin/',
      '/users/',
      '/audit-logs',
      '/system-info',
      '/settings',
    ];

    return sensitivePatterns.some(pattern => url.includes(pattern)) ||
           handler.includes('export') ||
           handler.includes('download');
  }

  private getAuditAction(method: string, url: string, handler: string): string {
    // Map HTTP methods and handlers to audit actions
    if (handler.includes('login')) return 'USER_LOGIN';
    if (handler.includes('logout')) return 'USER_LOGOUT';
    if (handler.includes('register')) return 'USER_REGISTER';
    if (handler.includes('export')) return 'DATA_EXPORT';
    if (handler.includes('import')) return 'DATA_IMPORT';
    if (handler.includes('publish')) return 'CONTENT_PUBLISH';
    if (handler.includes('approve')) return 'CONTENT_APPROVE';
    if (handler.includes('reject')) return 'CONTENT_REJECT';
    if (handler.includes('delete') || method === 'DELETE') return 'RESOURCE_DELETE';
    if (handler.includes('create') || method === 'POST') return 'RESOURCE_CREATE';
    if (handler.includes('update') || method === 'PUT' || method === 'PATCH') return 'RESOURCE_UPDATE';
    if (method === 'GET' && this.isSensitiveReadOperation(url, handler)) return 'SENSITIVE_READ';

    // Default action based on HTTP method
    const methodActionMap: Record<string, string> = {
      GET: 'READ',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };

    return methodActionMap[method]?.toUpperCase() || 'UNKNOWN_ACTION';
  }

  private getResourceFromController(controller: string): string {
    return controller.replace('Controller', '').toLowerCase();
  }

  private extractResourceId(response: any, request: Request): string | undefined {
    if (response?.id) return response.id;
    if (request.params?.id) return request.params.id;
    if (request.params?.key) return request.params.key; // For settings
    return undefined;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return undefined;

    // Remove sensitive fields from audit logs
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
    const sanitized = { ...body };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}