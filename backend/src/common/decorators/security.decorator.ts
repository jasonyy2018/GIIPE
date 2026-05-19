import { SetMetadata } from '@nestjs/common';

// CSRF Protection
export const CSRF_EXEMPT_KEY = 'csrf_exempt';
export const CsrfExempt = () => SetMetadata(CSRF_EXEMPT_KEY, true);

// Rate Limiting
export const RATE_LIMIT_EXEMPT_KEY = 'rate_limit_exempt';
export const RateLimitExempt = () => SetMetadata(RATE_LIMIT_EXEMPT_KEY, true);

// Custom Rate Limit
export const CUSTOM_RATE_LIMIT_KEY = 'custom_rate_limit';
export const CustomRateLimit = (limit: number, windowMs: number = 60000) => 
  SetMetadata(CUSTOM_RATE_LIMIT_KEY, { limit, windowMs });

// Security Headers
export const SECURITY_HEADERS_EXEMPT_KEY = 'security_headers_exempt';
export const SecurityHeadersExempt = () => SetMetadata(SECURITY_HEADERS_EXEMPT_KEY, true);

// Input Sanitization
export const SANITIZATION_EXEMPT_KEY = 'sanitization_exempt';
export const SanitizationExempt = () => SetMetadata(SANITIZATION_EXEMPT_KEY, true);