import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface RequestWithSession extends Request {
  session?: {
    csrfToken?: string;
    [key: string]: any;
  };
}
import * as crypto from 'crypto';

export const CSRF_EXEMPT_KEY = 'csrf_exempt';

// Decorator to exempt routes from CSRF protection
export const CsrfExempt = () => SetMetadata(CSRF_EXEMPT_KEY, true);

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly tokenSecret = process.env.CSRF_SECRET || 'default-csrf-secret';

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    
    // Skip CSRF protection for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // Check if route is exempt from CSRF protection
    const isExempt = this.reflector.getAllAndOverride<boolean>(CSRF_EXEMPT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isExempt) {
      this.logger.debug(`CSRF exempt for ${request.method} ${request.path}`);
      return true;
    }

    // Skip for API endpoints with valid JWT (API clients)
    if (request.path.startsWith('/api/') && request.headers.authorization) {
      return true;
    }

    const token = this.extractToken(request);
    const sessionToken = request.session?.csrfToken;

    if (!token || !sessionToken) {
      this.logger.warn(`CSRF token missing for ${request.method} ${request.path}`);
      throw new ForbiddenException('CSRF token missing');
    }

    if (!this.validateToken(token, sessionToken)) {
      this.logger.warn(`Invalid CSRF token for ${request.method} ${request.path}`);
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }

  private extractToken(request: RequestWithSession): string | null {
    // Check header first
    let token = request.headers['x-csrf-token'] as string;
    
    // Check body
    if (!token && request.body && request.body._csrf) {
      token = request.body._csrf;
    }
    
    // Check query
    if (!token && request.query._csrf) {
      token = request.query._csrf as string;
    }

    return token || null;
  }

  private validateToken(token: string, sessionToken: string): boolean {
    try {
      // Simple token validation - in production, use more sophisticated approach
      const expectedToken = crypto
        .createHmac('sha256', this.tokenSecret)
        .update(sessionToken)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(token, 'hex'),
        Buffer.from(expectedToken, 'hex')
      );
    } catch (error) {
      this.logger.error('CSRF token validation error:', error);
      return false;
    }
  }

  static generateToken(sessionId: string, secret: string = process.env.CSRF_SECRET || 'default-csrf-secret'): string {
    return crypto
      .createHmac('sha256', secret)
      .update(sessionId)
      .digest('hex');
  }
}