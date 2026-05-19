// Performance monitoring utilities for Core Web Vitals and custom metrics
import React from 'react';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface WebVitalsMetrics {
  CLS: PerformanceMetric | null;
  FID: PerformanceMetric | null;
  FCP: PerformanceMetric | null;
  LCP: PerformanceMetric | null;
  TTFB: PerformanceMetric | null;
}

export interface CustomMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  resourceLoadTime: number;
  memoryUsage?: any; // Browser memory info
  connectionType?: string;
}

// Core Web Vitals thresholds
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Get rating based on metric value and thresholds
 */
function getRating(metricName: keyof typeof THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metricName];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private metrics: WebVitalsMetrics = {
    CLS: null,
    FID: null,
    FCP: null,
    LCP: null,
    TTFB: null,
  };

  private customMetrics: Partial<CustomMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private callbacks: Array<(metrics: WebVitalsMetrics) => void> = [];

  constructor() {
    this.initializeObservers();
    this.measureCustomMetrics();
  }

  /**
   * Initialize performance observers for Core Web Vitals
   */
  private initializeObservers() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          
          this.metrics.LCP = {
            name: 'LCP',
            value: lastEntry.startTime,
            rating: getRating('LCP', lastEntry.startTime),
            timestamp: Date.now(),
          };
          
          this.notifyCallbacks();
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.metrics.FID = {
              name: 'FID',
              value: entry.processingStart - entry.startTime,
              rating: getRating('FID', entry.processingStart - entry.startTime),
              timestamp: Date.now(),
            };
          });
          
          this.notifyCallbacks();
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          this.metrics.CLS = {
            name: 'CLS',
            value: clsValue,
            rating: getRating('CLS', clsValue),
            timestamp: Date.now(),
          };
          
          this.notifyCallbacks();
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }

    // First Contentful Paint (FCP) and TTFB
    this.measureNavigationMetrics();
  }

  /**
   * Measure navigation-based metrics
   */
  private measureNavigationMetrics() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      
      if (navigationEntries.length > 0) {
        const navigation = navigationEntries[0];
        
        // Time to First Byte (TTFB)
        const ttfb = navigation.responseStart - navigation.requestStart;
        this.metrics.TTFB = {
          name: 'TTFB',
          value: ttfb,
          rating: getRating('TTFB', ttfb),
          timestamp: Date.now(),
        };
      }
    }

    // First Contentful Paint (FCP)
    if ('PerformanceObserver' in window) {
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.FCP = {
                name: 'FCP',
                value: entry.startTime,
                rating: getRating('FCP', entry.startTime),
                timestamp: Date.now(),
              };
            }
          });
          
          this.notifyCallbacks();
        });
        
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(fcpObserver);
      } catch (e) {
        console.warn('FCP observer not supported');
      }
    }
  }

  /**
   * Measure custom performance metrics
   */
  private measureCustomMetrics() {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        this.customMetrics = {
          pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstPaint: 0, // Will be updated by paint observer
          resourceLoadTime: navigation.loadEventEnd - navigation.responseEnd,
        };
      }

      // Memory usage (if available)
      if ('memory' in performance) {
        this.customMetrics.memoryUsage = (performance as any).memory;
      }

      // Connection type (if available)
      if ('connection' in navigator) {
        this.customMetrics.connectionType = (navigator as any).connection?.effectiveType;
      }
    }
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(callback: (metrics: WebVitalsMetrics) => void) {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks() {
    this.callbacks.forEach(callback => callback(this.metrics));
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebVitalsMetrics {
    return { ...this.metrics };
  }

  /**
   * Get custom metrics
   */
  getCustomMetrics(): Partial<CustomMetrics> {
    return { ...this.customMetrics };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const metrics = Object.values(this.metrics).filter(Boolean);
    if (metrics.length === 0) return 0;

    const scores = metrics.map(metric => {
      switch (metric!.rating) {
        case 'good': return 100;
        case 'needs-improvement': return 50;
        case 'poor': return 0;
        default: return 0;
      }
    });

    return Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length);
  }

  /**
   * Export metrics for reporting
   */
  exportMetrics() {
    return {
      webVitals: this.getMetrics(),
      customMetrics: this.getCustomMetrics(),
      performanceScore: this.getPerformanceScore(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  /**
   * Send metrics to analytics endpoint
   */
  async sendMetrics(endpoint: string) {
    try {
      const data = this.exportMetrics();
      
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon(endpoint, JSON.stringify(data));
      } else {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }

  /**
   * Cleanup observers
   */
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.callbacks = [];
  }
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = React.useState<WebVitalsMetrics>({
    CLS: null,
    FID: null,
    FCP: null,
    LCP: null,
    TTFB: null,
  });
  
  const [monitor] = React.useState(() => new PerformanceMonitor());

  React.useEffect(() => {
    const unsubscribe = monitor.subscribe(setMetrics);
    return unsubscribe;
  }, [monitor]);

  React.useEffect(() => {
    return () => monitor.disconnect();
  }, [monitor]);

  return {
    metrics,
    customMetrics: monitor.getCustomMetrics(),
    performanceScore: monitor.getPerformanceScore(),
    exportMetrics: () => monitor.exportMetrics(),
    sendMetrics: (endpoint: string) => monitor.sendMetrics(endpoint),
  };
}

/**
 * Performance monitoring component
 */
export function PerformanceMonitoringProvider({ 
  children, 
  analyticsEndpoint 
}: { 
  children: React.ReactNode;
  analyticsEndpoint?: string;
}) {
  const { sendMetrics } = usePerformanceMonitoring();

  React.useEffect(() => {
    if (analyticsEndpoint) {
      // Send metrics after page load
      const timer = setTimeout(() => {
        sendMetrics(analyticsEndpoint);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [analyticsEndpoint, sendMetrics]);

  return React.createElement(React.Fragment, null, children);
}