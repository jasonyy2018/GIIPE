'use client';

import { useEffect } from 'react';

/**
 * Global error handler to suppress browser extension errors
 * This component catches and filters out errors from browser extensions
 * that are injected into the page but are not part of our application.
 */
export default function GlobalErrorHandler() {
  useEffect(() => {
    // Patterns to filter out (browser extensions and non-critical errors)
    const nonCriticalPatterns = [
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'layer.js',
      'layui.all.js',
      'clipboard.min.js',
      'redi',
      'Cannot read properties of undefined',
      'Cannot use import statement outside a module',
      'ERR_FAILED',
      'chrome-extension://invalid',
      'web_accessible_resources',
      'Denying load of chrome-extension',
      '[redi]: You are loading scripts',
      'contentScript.bundle.js',
      'i18next',
      'Refused to apply style',
      'MIME type',
      'text/html',
      'stylesheet MIME type',
      '/css/modules/',
      'laydate',
      '用户凭据不合法',
      '用户凭据',
      'api/wr/user/conf',

      // Next.js dev/HMR noise
      'unique "key" prop',
      'cannot contain a nested <html>',
      'module factory is not available',
      'lucide-react/dist/esm/icons/download.js',
      'lucide-react',
    ];

    // Check if an error message should be filtered
    const shouldFilter = (message: string, source?: string): boolean => {
      const messageStr = String(message || '').toLowerCase();
      const sourceStr = String(source || '').toLowerCase();
      
      return nonCriticalPatterns.some(pattern => 
        messageStr.includes(pattern.toLowerCase()) || 
        sourceStr.includes(pattern.toLowerCase())
      );
    };

    // Override console.warn to filter browser extension warnings
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      if (!shouldFilter(message)) {
        originalWarn.apply(console, args);
      }
    };

    // Override console.error to filter browser extension errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (!shouldFilter(message)) {
        originalError.apply(console, args);
      }
    };

    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      const message = event.message || '';
      const filename = event.filename || '';

      // Filter out browser extension errors
      if (shouldFilter(message, filename) || 
          (error?.stack && shouldFilter(error.stack))) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      // Log other errors normally
      return true;
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonString = String(reason || '');

      // Filter out browser extension related rejections
      if (shouldFilter(reasonString)) {
        event.preventDefault();
        return;
      }
    };

    // Add event listeners
    window.addEventListener('error', handleError, true); // Use capture phase
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      // Restore original console methods
      console.warn = originalWarn;
      console.error = originalError;
      
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

