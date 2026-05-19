// Performance monitoring utilities for the frontend

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;

    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.fetchStart);
              this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
              this.recordMetric('first_paint', navEntry.loadEventEnd - navEntry.fetchStart);
            }
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation timing observer not supported:', error);
      }

      // Observe largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('largest_contentful_paint', entry.startTime, {
              element: (entry as any).element?.tagName,
            });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // Observe cumulative layout shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          if (clsValue > 0) {
            this.recordMetric('cumulative_layout_shift', clsValue);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }

      // Observe first input delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('first_input_delay', (entry as any).processingStart - entry.startTime);
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }
    }
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log significant performance issues
    this.checkPerformanceThresholds(metric);
  }

  private checkPerformanceThresholds(metric: PerformanceMetric) {
    const thresholds = {
      page_load_time: 3000, // 3 seconds
      largest_contentful_paint: 2500, // 2.5 seconds
      first_input_delay: 100, // 100ms
      cumulative_layout_shift: 0.1, // 0.1 CLS score
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(`Performance threshold exceeded for ${metric.name}: ${metric.value}ms (threshold: ${threshold}ms)`);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  clearMetrics() {
    this.metrics = [];
  }

  // Measure custom operations
  measureOperation<T>(name: string, operation: () => T): T;
  measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T>;
  measureOperation<T>(name: string, operation: () => T | Promise<T>): T | Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = operation();
      
      if (result instanceof Promise) {
        return result.then(
          (value) => {
            this.recordMetric(name, performance.now() - startTime);
            return value;
          },
          (error) => {
            this.recordMetric(name, performance.now() - startTime, { error: true });
            throw error;
          }
        );
      } else {
        this.recordMetric(name, performance.now() - startTime);
        return result;
      }
    } catch (error) {
      this.recordMetric(name, performance.now() - startTime, { error: true });
      throw error;
    }
  }

  // Get Web Vitals summary
  getWebVitals() {
    const lcp = this.getMetricsByName('largest_contentful_paint').slice(-1)[0];
    const fid = this.getMetricsByName('first_input_delay').slice(-1)[0];
    const cls = this.getMetricsByName('cumulative_layout_shift').slice(-1)[0];

    return {
      lcp: lcp?.value || null,
      fid: fid?.value || null,
      cls: cls?.value || null,
      timestamp: Date.now(),
    };
  }

  // Send metrics to analytics endpoint
  async sendMetrics() {
    if (this.metrics.length === 0) return;

    try {
      const response = await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: this.metrics,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now(),
        }),
      });

      if (response.ok) {
        this.clearMetrics();
      }
    } catch (error) {
      console.warn('Failed to send performance metrics:', error);
    }
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Utility functions
export const performanceMonitor = PerformanceMonitor.getInstance();

export function measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
  return performanceMonitor.measureOperation(name, operation);
}

export function measureSync<T>(name: string, operation: () => T): T {
  return performanceMonitor.measureOperation(name, operation);
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    recordMetric: (name: string, value: number, metadata?: Record<string, any>) => 
      performanceMonitor.recordMetric(name, value, metadata),
    measureAsync,
    measureSync,
    getMetrics: () => performanceMonitor.getMetrics(),
    getWebVitals: () => performanceMonitor.getWebVitals(),
  };
}

// Initialize performance monitoring on client side
if (typeof window !== 'undefined') {
  // Send metrics periodically
  setInterval(() => {
    performanceMonitor.sendMetrics();
  }, 30000); // Every 30 seconds

  // Send metrics before page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.sendMetrics();
  });
}