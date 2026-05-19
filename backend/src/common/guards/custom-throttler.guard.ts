import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Get path from multiple sources to ensure reliability
    let path = request.path || '';
    if (!path && request.url) {
      path = request.url.split('?')[0];
    }
    if (!path && request.originalUrl) {
      path = request.originalUrl.split('?')[0];
    }
    if (!path && request.baseUrl) {
      path = request.baseUrl;
    }
    
    // Normalize path
    path = path || '';
    const normalizedPath = path.replace(/\/+$/, '') || '/';
    const fullUrl = request.url || request.originalUrl || '';
    const method = request.method;

    // Skip throttling for:
    // - Health checks
    // - Static files (uploads, static assets) - CRITICAL: Must skip all upload paths
    // - PDF downloads (events and news)
    // - Public GET requests to events API (read-only, cached) - CRITICAL FIX
    // - WebSocket connections
    // - Image and document files (common extensions)
    
    // Check multiple path variations to ensure we catch all cases
    const isUploadPath = 
      normalizedPath.startsWith('/api/uploads') ||
      normalizedPath.startsWith('/uploads') ||
      fullUrl.includes('/uploads/') ||
      fullUrl.includes('/images/') ||
      normalizedPath.includes('/uploads/') ||
      normalizedPath.includes('/images/');
    
    const isStaticFile = 
      normalizedPath.startsWith('/api/static') ||
      /\.(jpg|jpeg|png|gif|svg|webp|ico|pdf|doc|docx|txt|css|js|woff|woff2|ttf|eot)$/i.test(normalizedPath);
    
    // CRITICAL: Check for events API - must match both with and without /api prefix
    // Also check fullUrl to catch query parameters
    const isEventsAPI = method === 'GET' && (
      normalizedPath.startsWith('/api/events') ||
      normalizedPath.startsWith('/events') ||
      fullUrl.includes('/api/events') ||
      fullUrl.includes('/events?') ||
      fullUrl.includes('/events/')
    );
    
    const shouldSkip = 
      normalizedPath === '/api/health' ||
      normalizedPath === '/health' ||
      isUploadPath ||
      isStaticFile ||
      normalizedPath.includes('/pdfs/') ||
      normalizedPath.endsWith('/pdf') ||
      isEventsAPI ||
      request.headers.upgrade === 'websocket';

    if (shouldSkip) {
      this.logger.debug(`Skipping throttling for ${method} ${normalizedPath} (isUploadPath: ${isUploadPath}, isStaticFile: ${isStaticFile}, isEventsAPI: ${isEventsAPI})`);
    }

    // CRITICAL: Always return true for uploads and events API to prevent any rate limiting
    // This is a safety check to ensure we never accidentally rate limit these paths
    if (isUploadPath || isEventsAPI) {
      return true;
    }

    return shouldSkip;
  }
}

