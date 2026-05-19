import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
// const xss = require('xss');

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  // Rate limiting configuration
  // Increased limits to prevent false positives for normal usage
  private readonly rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs (increased from 100)
    message: {
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later.',
      statusCode: 429,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Get path from multiple sources to ensure reliability
      // Try all possible path sources and normalize
      let path = req.path || '';
      if (!path && req.url) {
        path = req.url.split('?')[0];
      }
      if (!path && req.originalUrl) {
        path = req.originalUrl.split('?')[0];
      }
      if (!path && req.baseUrl) {
        path = req.baseUrl;
      }
      
      // Normalize path - remove trailing slashes and ensure consistent format
      path = path || '';
      const normalizedPath = path.replace(/\/+$/, '') || '/';
      const fullUrl = req.url || req.originalUrl || '';
      
      // Skip rate limiting for:
      // - Health checks
      // - Static files (uploads, static assets) - CRITICAL: Must skip all upload paths
      // - PDF downloads (events and news)
      // - Public GET requests to events API (read-only, cached) - CRITICAL FIX
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
      const isEventsAPI = req.method === 'GET' && (
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
        isEventsAPI;
      
      // Log skip decisions for debugging (only for events API and uploads to reduce noise)
      if (isEventsAPI || isUploadPath) {
        this.logger.log(`[SecurityMiddleware] ${shouldSkip ? 'Skipping' : 'Applying'} rate limit for ${req.method} ${normalizedPath} (isUploadPath: ${isUploadPath}, isStaticFile: ${isStaticFile}, isEventsAPI: ${isEventsAPI}, shouldSkip: ${shouldSkip})`);
      }
      
      // CRITICAL: Always return true for uploads and events API to prevent any rate limiting
      // This is a safety check to ensure we never accidentally rate limit these paths
      if (isUploadPath || isEventsAPI) {
        return true;
      }
      
      return shouldSkip;
    },
  });

  // Slow down configuration for additional protection
  private readonly speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 200, // allow 200 requests per 15 minutes, then... (increased from 50)
    delayMs: () => 500, // begin adding 500ms of delay per request above 50 (v2 compatible)
    maxDelayMs: 20000, // maximum delay of 20 seconds
    validate: { delayMs: false }, // Disable validation warning for v2 compatibility
    skip: (req) => {
      // Get path from multiple sources to ensure reliability (same logic as rateLimiter)
      let path = req.path || '';
      if (!path && req.url) {
        path = req.url.split('?')[0];
      }
      if (!path && req.originalUrl) {
        path = req.originalUrl.split('?')[0];
      }
      if (!path && req.baseUrl) {
        path = req.baseUrl;
      }
      
      // Normalize path
      path = path || '';
      const normalizedPath = path.replace(/\/+$/, '') || '/';
      const fullUrl = req.url || req.originalUrl || '';
      
      // Skip speed limiting for static files and public GET requests (same as rate limiter)
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
      const isEventsAPI = req.method === 'GET' && (
        normalizedPath.startsWith('/api/events') ||
        normalizedPath.startsWith('/events') ||
        fullUrl.includes('/api/events') ||
        fullUrl.includes('/events?') ||
        fullUrl.includes('/events/')
      );
      
      const shouldSkip = normalizedPath === '/api/health' ||
        normalizedPath === '/health' ||
        isUploadPath ||
        isStaticFile ||
        normalizedPath.includes('/pdfs/') ||
        normalizedPath.endsWith('/pdf') ||
        isEventsAPI;
      
      // CRITICAL: Always return true for uploads and events API to prevent any rate limiting
      if (isUploadPath || isEventsAPI) {
        return true;
      }
      
      return shouldSkip;
    },
  });

  // Auth-specific rate limiting
  private readonly authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: {
      error: 'Too Many Authentication Attempts',
      message: 'Too many authentication attempts, please try again later.',
      statusCode: 429,
    },
    skip: (req) => !req.path.includes('/auth/'),
  });

  use(req: Request, res: Response, next: NextFunction) {
    // Debug: Log when SecurityMiddleware is called for events API and uploads
    const path = req.path || req.url?.split('?')[0] || req.originalUrl?.split('?')[0] || '';
    const isEventsOrUploads = (req.method === 'GET' && (path.includes('/events') || req.url?.includes('/events'))) ||
                              path.includes('/uploads/') || path.includes('/images/');
    
    // Always log for events API and uploads to verify SecurityMiddleware is working
    if (isEventsOrUploads) {
      this.logger.log(`[SecurityMiddleware] Processing ${req.method} ${path} (isEventsOrUploads: ${isEventsOrUploads})`);
    }
    
    // Apply rate limiting
    this.rateLimiter(req, res, (err) => {
      if (err) {
        // Log rate limit errors for events API and uploads - this should never happen if skip works correctly
        if (isEventsOrUploads) {
          this.logger.error(`[SecurityMiddleware] CRITICAL: Rate limit error for ${req.method} ${path}: ${err.message} - Skip function may have failed!`);
        } else {
          this.logger.warn(`[SecurityMiddleware] Rate limit error for ${req.method} ${path}: ${err.message}`);
        }
        return next(err);
      }
      
      // Apply speed limiting
      this.speedLimiter(req, res, (err) => {
        if (err) return next(err);
        
        // Apply auth-specific rate limiting
        this.authRateLimiter(req, res, (err) => {
          if (err) return next(err);
          
          // Sanitize request body to prevent XSS
          this.sanitizeRequest(req);
          
          // Add security headers
          this.addSecurityHeaders(res);
          
          // Log suspicious activity
          this.logSuspiciousActivity(req);
          
          next();
        });
      });
    });
  }

  private sanitizeRequest(req: Request) {
    if (req.body && typeof req.body === 'object') {
      this.sanitizeObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      this.sanitizeObject(req.query);
    }
  }

  private sanitizeObject(obj: any) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'string') {
          // Temporarily disable XSS sanitization
          // obj[key] = xss(obj[key], { ... });
          // For now, just do basic string cleaning
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.sanitizeObject(obj[key]);
        }
      }
    }
  }

  private addSecurityHeaders(res: Response) {
    // Additional security headers beyond helmet
    res.setHeader('X-Request-ID', this.generateRequestId());
    res.setHeader('X-API-Version', '1.0');
    
    // Prevent information disclosure
    res.removeHeader('X-Powered-By');
    
    // Additional CSP for API responses
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'none'; object-src 'none';"
    );
  }

  private logSuspiciousActivity(req: Request) {
    const suspiciousPatterns = [
      /(<script|javascript:|vbscript:|onload=|onerror=)/i,
      /(union.*select|drop.*table|insert.*into)/i,
      /(\.\.\/|\.\.\\)/,
      /(<iframe|<object|<embed)/i,
    ];

    const requestData = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        this.logger.warn(
          `Suspicious activity detected from IP ${req.ip}: ${req.method} ${req.path}`,
          {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            suspiciousData: requestData,
          }
        );
        break;
      }
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}