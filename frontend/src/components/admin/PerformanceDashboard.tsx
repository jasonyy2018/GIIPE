import React, { useState, useEffect } from 'react';
import { usePerformanceMonitoring } from '../../utils/performanceMonitoring';
import { Card } from './ui/Card';
import Button from './ui/Button';

interface PerformanceMetricCardProps {
  title: string;
  value: number | null;
  rating: 'good' | 'needs-improvement' | 'poor' | null;
  unit: string;
  description: string;
}

function PerformanceMetricCard({ title, value, rating, unit, description }: PerformanceMetricCardProps) {
  const getRatingColor = (rating: string | null) => {
    switch (rating) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRatingText = (rating: string | null) => {
    switch (rating) {
      case 'good': return 'Good';
      case 'needs-improvement': return 'Needs Improvement';
      case 'poor': return 'Poor';
      default: return 'Measuring...';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRatingColor(rating)}`}>
          {getRatingText(rating)}
        </span>
      </div>
      
      <div className="mb-2">
        <span className="text-3xl font-bold text-gray-900">
          {value !== null ? Math.round(value) : '--'}
        </span>
        <span className="text-sm text-gray-500 ml-1">{unit}</span>
      </div>
      
      <p className="text-sm text-gray-600">{description}</p>
    </Card>
  );
}

interface CacheMetricsProps {
  cacheStats: any;
}

function CacheMetrics({ cacheStats }: CacheMetricsProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Performance</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-bold text-primary">
            {cacheStats?.hitRate?.toFixed(1) || '--'}%
          </div>
          <div className="text-sm text-gray-600">Hit Rate</div>
        </div>
        
        <div>
          <div className="text-2xl font-bold text-green-600">
            {cacheStats?.averageResponseTime?.toFixed(0) || '--'}ms
          </div>
          <div className="text-sm text-gray-600">Avg Response Time</div>
        </div>
        
        <div>
          <div className="text-2xl font-bold text-purple-600">
            {cacheStats?.totalRequests || '--'}
          </div>
          <div className="text-sm text-gray-600">Total Requests</div>
        </div>
        
        <div>
          <div className="text-2xl font-bold text-orange-600">
            {cacheStats?.cacheSize || '--'}
          </div>
          <div className="text-sm text-gray-600">Cache Size</div>
        </div>
      </div>
    </Card>
  );
}

interface ResourceTimingProps {
  resources: PerformanceResourceTiming[];
}

function ResourceTiming({ resources }: ResourceTimingProps) {
  const [sortBy, setSortBy] = useState<'duration' | 'size'>('duration');
  
  const sortedResources = [...resources]
    .filter(resource => resource.duration > 0)
    .sort((a, b) => {
      if (sortBy === 'duration') {
        return b.duration - a.duration;
      }
      return (b.transferSize || 0) - (a.transferSize || 0);
    })
    .slice(0, 10);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Slowest Resources</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'duration' | 'size')}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="duration">By Duration</option>
          <option value="size">By Size</option>
        </select>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedResources.map((resource, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {resource.name.split('/').pop()}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {resource.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {Math.round(resource.duration)}ms
              </div>
              {resource.transferSize && (
                <div className="text-xs text-gray-500">
                  {(resource.transferSize / 1024).toFixed(1)}KB
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PerformanceDashboard() {
  const { metrics, customMetrics, performanceScore, exportMetrics, sendMetrics } = usePerformanceMonitoring();
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [resources, setResources] = useState<PerformanceResourceTiming[]>([]);

  // Fetch cache statistics
  useEffect(() => {
    const fetchCacheStats = async () => {
      try {
        const response = await fetch('/api/admin/cache/stats');
        if (response.ok) {
          const data = await response.json();
          setCacheStats(data.performance?.globalMetrics);
        }
      } catch (error) {
        console.error('Failed to fetch cache stats:', error);
      }
    };

    fetchCacheStats();
    const interval = setInterval(fetchCacheStats, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Get resource timing data
  useEffect(() => {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      setResources(resourceEntries);
    }
  }, []);

  const handleExportMetrics = () => {
    const data = exportMetrics();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendMetrics = async () => {
    try {
      await sendMetrics('/api/admin/performance/metrics');
      alert('Metrics sent successfully!');
    } catch (error) {
      alert('Failed to send metrics');
    }
  };

  return (
    <div className="space-y-6">
      {/* Performance Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Performance Score</h2>
          <div className="flex space-x-2">
            <Button onClick={handleExportMetrics} variant="secondary" size="sm">
              Export Metrics
            </Button>
            <Button onClick={handleSendMetrics} variant="secondary" size="sm">
              Send to Analytics
            </Button>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="text-4xl font-bold text-primary mr-4">
            {performanceScore}
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  performanceScore >= 80 ? 'bg-green-500' :
                  performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${performanceScore}%` }}
              />
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Overall performance score based on Core Web Vitals
            </div>
          </div>
        </div>
      </Card>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PerformanceMetricCard
          title="Largest Contentful Paint"
          value={metrics.LCP?.value || null}
          rating={metrics.LCP?.rating || null}
          unit="ms"
          description="Time until the largest content element is rendered"
        />
        
        <PerformanceMetricCard
          title="First Input Delay"
          value={metrics.FID?.value || null}
          rating={metrics.FID?.rating || null}
          unit="ms"
          description="Time from first user interaction to browser response"
        />
        
        <PerformanceMetricCard
          title="Cumulative Layout Shift"
          value={metrics.CLS?.value || null}
          rating={metrics.CLS?.rating || null}
          unit=""
          description="Measure of visual stability during page load"
        />
        
        <PerformanceMetricCard
          title="First Contentful Paint"
          value={metrics.FCP?.value || null}
          rating={metrics.FCP?.rating || null}
          unit="ms"
          description="Time until first content element is rendered"
        />
        
        <PerformanceMetricCard
          title="Time to First Byte"
          value={metrics.TTFB?.value || null}
          rating={metrics.TTFB?.rating || null}
          unit="ms"
          description="Time from request start to first response byte"
        />
        
        <PerformanceMetricCard
          title="Page Load Time"
          value={customMetrics.pageLoadTime || null}
          rating={customMetrics.pageLoadTime ? 
            (customMetrics.pageLoadTime < 3000 ? 'good' : 
             customMetrics.pageLoadTime < 5000 ? 'needs-improvement' : 'poor') : null}
          unit="ms"
          description="Total time to fully load the page"
        />
      </div>

      {/* Cache and Resource Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CacheMetrics cacheStats={cacheStats} />
        <ResourceTiming resources={resources} />
      </div>

      {/* Memory Usage */}
      {customMetrics.memoryUsage && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Usage</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-primary">
                {(customMetrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB
              </div>
              <div className="text-sm text-gray-600">Used Heap</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-green-600">
                {(customMetrics.memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB
              </div>
              <div className="text-sm text-gray-600">Total Heap</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {((customMetrics.memoryUsage.usedJSHeapSize / customMetrics.memoryUsage.totalJSHeapSize) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Heap Usage</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}