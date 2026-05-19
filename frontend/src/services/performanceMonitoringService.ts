/**
 * Performance Monitoring Service
 * Tracks and optimizes rendering and interaction performance
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'rendering' | 'interaction' | 'network' | 'memory' | 'custom';
  tags?: Record<string, string>;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: 'ms' | 'mb' | 'count' | 'percent';
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: PerformanceMetric[];
  violations: Array<{
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
  }>;
  recommendations: string[];
}

export interface RenderingStats {
  componentRenders: Map<string, number>;
  renderTimes: Map<string, number[]>;
  reRenderReasons: Map<string, string[]>;
  memoryUsage: number[];
  frameDrops: number;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private renderingStats: RenderingStats = {
    componentRenders: new Map(),
    renderTimes: new Map(),
    reRenderReasons: new Map(),
    memoryUsage: [],
    frameDrops: 0
  };
  private isMonitoring = false;
  private subscribers: ((metric: PerformanceMetric) => void)[] = [];

  constructor() {
    this.initializeDefaultThresholds();
    this.setupPerformanceObservers();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startCoreWebVitalsMonitoring();
    this.startMemoryMonitoring();
    this.startFrameRateMonitoring();
    this.startInteractionMonitoring();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(
    name: string,
    value: number,
    category: PerformanceMetric['category'] = 'custom',
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: performance.now(),
      category,
      tags
    };

    this.metrics.push(metric);
    this.checkThreshold(metric);
    this.notifySubscribers(metric);

    // Keep only recent metrics (last 1000)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Measure component render time
   */
  measureRender<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    
    try {
      const result = renderFn();
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Update rendering stats
      const currentRenders = this.renderingStats.componentRenders.get(componentName) || 0;
      this.renderingStats.componentRenders.set(componentName, currentRenders + 1);

      const renderTimes = this.renderingStats.renderTimes.get(componentName) || [];
      renderTimes.push(renderTime);
      this.renderingStats.renderTimes.set(componentName, renderTimes.slice(-100)); // Keep last 100

      // Record metric
      this.recordMetric(`render_time_${componentName}`, renderTime, 'rendering', {
        component: componentName
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      this.recordMetric(`render_error_${componentName}`, renderTime, 'rendering', {
        component: componentName,
        error: 'true'
      });
      
      throw error;
    }
  }

  /**
   * Track re-render reasons
   */
  trackReRender(componentName: string, reason: string): void {
    const reasons = this.renderingStats.reRenderReasons.get(componentName) || [];
    reasons.push(reason);
    this.renderingStats.reRenderReasons.set(componentName, reasons.slice(-50)); // Keep last 50

    this.recordMetric(`rerender_${componentName}`, 1, 'rendering', {
      component: componentName,
      reason
    });
  }

  /**
   * Measure interaction response time
   */
  measureInteraction(name: string, interactionFn: () => void | Promise<void>): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();
      
      try {
        await interactionFn();
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        this.recordMetric(`interaction_${name}`, responseTime, 'interaction', {
          interaction: name
        });

        resolve();
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.recordMetric(`interaction_error_${name}`, responseTime, 'interaction', {
          interaction: name,
          error: 'true'
        });
        
        reject(error);
      }
    });
  }

  /**
   * Set performance threshold
   */
  setThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.set(threshold.metric, threshold);
  }

  /**
   * Get performance report
   */
  getReport(periodMinutes: number = 60): PerformanceReport {
    const now = Date.now();
    const periodStart = now - (periodMinutes * 60 * 1000);
    
    const periodMetrics = this.metrics.filter(
      metric => metric.timestamp >= periodStart
    );

    const violations = this.findThresholdViolations(periodMetrics);
    const recommendations = this.generateRecommendations(periodMetrics, violations);

    return {
      period: {
        start: new Date(periodStart),
        end: new Date(now)
      },
      metrics: periodMetrics,
      violations,
      recommendations
    };
  }

  /**
   * Get rendering statistics
   */
  getRenderingStats(): RenderingStats {
    return { ...this.renderingStats };
  }

  /**
   * Subscribe to performance metrics
   */
  subscribe(callback: (metric: PerformanceMetric) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.renderingStats = {
      componentRenders: new Map(),
      renderTimes: new Map(),
      reRenderReasons: new Map(),
      memoryUsage: [],
      frameDrops: 0
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      renderingStats: {
        componentRenders: Array.from(this.renderingStats.componentRenders.entries()),
        renderTimes: Array.from(this.renderingStats.renderTimes.entries()),
        reRenderReasons: Array.from(this.renderingStats.reRenderReasons.entries()),
        memoryUsage: this.renderingStats.memoryUsage,
        frameDrops: this.renderingStats.frameDrops
      },
      timestamp: Date.now()
    }, null, 2);
  }

  private initializeDefaultThresholds(): void {
    const defaultThresholds: PerformanceThreshold[] = [
      { metric: 'render_time', warning: 16, critical: 33, unit: 'ms' },
      { metric: 'interaction', warning: 100, critical: 300, unit: 'ms' },
      { metric: 'memory_usage', warning: 50, critical: 80, unit: 'mb' },
      { metric: 'frame_drop', warning: 5, critical: 10, unit: 'count' },
      { metric: 'lcp', warning: 2500, critical: 4000, unit: 'ms' },
      { metric: 'fid', warning: 100, critical: 300, unit: 'ms' },
      { metric: 'cls', warning: 0.1, critical: 0.25, unit: 'count' }
    ];

    defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.metric, threshold);
    });
  }

  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) return;

    // Long Task Observer
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric('long_task', entry.duration, 'rendering', {
            name: entry.name,
            startTime: entry.startTime.toString()
          });
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    } catch (error) {
      console.warn('Long Task Observer not supported');
    }

    // Layout Shift Observer
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (entry.hadRecentInput) return; // Ignore shifts caused by user input
          
          this.recordMetric('cls', entry.value, 'rendering', {
            sources: entry.sources?.length.toString() || '0'
          });
        });
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', layoutShiftObserver);
    } catch (error) {
      console.warn('Layout Shift Observer not supported');
    }
  }

  private startCoreWebVitalsMonitoring(): void {
    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime, 'rendering');
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    } catch (error) {
      console.warn('LCP Observer not supported');
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          this.recordMetric('fid', entry.processingStart - entry.startTime, 'interaction');
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);
    } catch (error) {
      console.warn('FID Observer not supported');
    }
  }

  private startMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    const monitorMemory = () => {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      
      this.renderingStats.memoryUsage.push(usedMB);
      if (this.renderingStats.memoryUsage.length > 100) {
        this.renderingStats.memoryUsage = this.renderingStats.memoryUsage.slice(-100);
      }

      this.recordMetric('memory_usage', usedMB, 'memory');
    };

    // Monitor memory every 5 seconds
    setInterval(monitorMemory, 5000);
  }

  private startFrameRateMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    let droppedFrames = 0;

    const measureFrameRate = (currentTime: number) => {
      frameCount++;
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) { // Every second
        const fps = Math.round((frameCount * 1000) / deltaTime);
        
        if (fps < 55) { // Consider frames dropped if FPS < 55
          droppedFrames++;
          this.renderingStats.frameDrops++;
        }

        this.recordMetric('fps', fps, 'rendering');
        
        frameCount = 0;
        lastTime = currentTime;
      }

      if (this.isMonitoring) {
        requestAnimationFrame(measureFrameRate);
      }
    };

    requestAnimationFrame(measureFrameRate);
  }

  private startInteractionMonitoring(): void {
    const interactionTypes = ['click', 'keydown', 'scroll', 'touchstart'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        const startTime = performance.now();
        
        // Use requestIdleCallback to measure when the interaction is processed
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            this.recordMetric(`interaction_${type}`, responseTime, 'interaction', {
              target: (event.target as Element)?.tagName?.toLowerCase() || 'unknown'
            });
          });
        }
      }, { passive: true });
    });
  }

  private checkThreshold(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name) || 
                    this.thresholds.get(metric.name.split('_')[0]);
    
    if (!threshold) return;

    if (metric.value >= threshold.critical) {
      console.warn(`Performance critical: ${metric.name} = ${metric.value}${threshold.unit} (threshold: ${threshold.critical}${threshold.unit})`);
    } else if (metric.value >= threshold.warning) {
      console.warn(`Performance warning: ${metric.name} = ${metric.value}${threshold.unit} (threshold: ${threshold.warning}${threshold.unit})`);
    }
  }

  private findThresholdViolations(metrics: PerformanceMetric[]) {
    const violations: Array<{
      metric: string;
      value: number;
      threshold: number;
      severity: 'warning' | 'critical';
    }> = [];

    metrics.forEach(metric => {
      const threshold = this.thresholds.get(metric.name) || 
                      this.thresholds.get(metric.name.split('_')[0]);
      
      if (!threshold) return;

      if (metric.value >= threshold.critical) {
        violations.push({
          metric: metric.name,
          value: metric.value,
          threshold: threshold.critical,
          severity: 'critical'
        });
      } else if (metric.value >= threshold.warning) {
        violations.push({
          metric: metric.name,
          value: metric.value,
          threshold: threshold.warning,
          severity: 'warning'
        });
      }
    });

    return violations;
  }

  private generateRecommendations(
    metrics: PerformanceMetric[], 
    violations: Array<{ metric: string; severity: string }>
  ): string[] {
    const recommendations: string[] = [];

    // Analyze violations and generate recommendations
    violations.forEach(violation => {
      switch (violation.metric.split('_')[0]) {
        case 'render':
          recommendations.push('Consider optimizing component renders with React.memo or useMemo');
          break;
        case 'interaction':
          recommendations.push('Optimize event handlers and consider debouncing frequent interactions');
          break;
        case 'memory':
          recommendations.push('Check for memory leaks and optimize data structures');
          break;
        case 'lcp':
          recommendations.push('Optimize largest contentful paint by preloading critical resources');
          break;
        case 'cls':
          recommendations.push('Reduce cumulative layout shift by reserving space for dynamic content');
          break;
      }
    });

    // Remove duplicates
    return Array.from(new Set(recommendations));
  }

  private notifySubscribers(metric: PerformanceMetric): void {
    this.subscribers.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        console.error('Performance subscriber error:', error);
      }
    });
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();