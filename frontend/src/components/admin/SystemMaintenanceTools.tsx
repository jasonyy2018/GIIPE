'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface CacheStats {
  totalKeys: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
  evictedKeys: number;
  expiredKeys: number;
  keysByType: {
    string: number;
    hash: number;
    list: number;
    set: number;
    zset: number;
  };
  lastUpdated: string;
}

interface DatabaseStats {
  databaseSize: { size: string };
  connectionStats: {
    total_connections: number;
    active_connections: number;
    idle_connections: number;
  };
  tableStats: any[];
  slowQueries: any[];
  lastUpdated: string;
  error?: string;
  message?: string;
}

interface ResourceUsage {
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    usage: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  uptime: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  loadAverage: number[];
  lastUpdated: string;
}

interface ResourceAlert {
  type: string;
  threshold: number;
  enabled: boolean;
}

interface LogRetentionPolicy {
  days: number;
  lastCleanup?: string;
}

export default function SystemMaintenanceTools() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage | null>(null);
  const [resourceAlerts, setResourceAlerts] = useState<ResourceAlert[]>([]);
  const [logRetention, setLogRetention] = useState<LogRetentionPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [cachePattern, setCachePattern] = useState('');
  const [newRetentionDays, setNewRetentionDays] = useState(30);
  const [activeTab, setActiveTab] = useState('cache');

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    loadAllData();
    
    // Set up auto-refresh for real-time data
    const interval = setInterval(() => {
      loadResourceUsage();
      loadCacheStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const downloadBackup = async (options?: { includeUploads?: boolean; includeLogs?: boolean }) => {
    const includeUploads = options?.includeUploads !== false; // default true
    const includeLogs = options?.includeLogs === true; // default false
    const url = `/api/admin/maintenance/backup/export?includeUploads=${includeUploads ? '1' : '0'}&includeLogs=${includeLogs ? '1' : '0'}`;

    try {
      setExportingBackup(true);
      toast.loading('Generating backup… this may take a while for large uploads', { id: 'backup' });

      const token = localStorage.getItem('authToken');
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Backup export failed (${response.status})`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const match = contentDisposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || `giip-site-backup-${Date.now()}.tar.gz`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      toast.success('Backup download started', { id: 'backup' });
    } catch (e: any) {
      console.error('Backup export failed', e);
      toast.error(e?.message || 'Backup export failed', { id: 'backup' });
    } finally {
      setExportingBackup(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCacheStats(),
        loadDatabaseStats(),
        loadResourceUsage(),
        loadResourceAlerts(),
        loadLogRetention(),
      ]);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      toast.error('Failed to load maintenance data');
    } finally {
      setLoading(false);
    }
  };

  const loadCacheStats = async () => {
    try {
      const response = await fetch('/api/admin/maintenance/cache', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCacheStats(data);
      }
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/maintenance/database', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setDatabaseStats(data);
      }
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  const loadResourceUsage = async () => {
    try {
      const response = await fetch('/api/admin/maintenance/resources', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setResourceUsage(data);
      }
    } catch (error) {
      console.error('Error loading resource usage:', error);
    }
  };

  const loadResourceAlerts = async () => {
    try {
      const response = await fetch('/api/admin/maintenance/alerts', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setResourceAlerts(data);
      }
    } catch (error) {
      console.error('Error loading resource alerts:', error);
    }
  };

  const loadLogRetention = async () => {
    try {
      const response = await fetch('/api/admin/maintenance/logs/retention', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setLogRetention(data);
      }
    } catch (error) {
      console.error('Error loading log retention policy:', error);
    }
  };

  const clearCache = async (pattern?: string) => {
    setLoading(true);
    try {
      const url = pattern ? `/api/admin/maintenance/cache?pattern=${encodeURIComponent(pattern)}` : '/api/admin/maintenance/cache';
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`Cache cleared successfully. ${result.cleared} keys removed.`);
        await loadCacheStats();
        setCachePattern('');
      } else {
        throw new Error('Failed to clear cache');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const optimizeDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/maintenance/database', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success('Database optimization completed successfully');
        await loadDatabaseStats();
      } else {
        throw new Error('Failed to optimize database');
      }
    } catch (error) {
      console.error('Error optimizing database:', error);
      toast.error('Failed to optimize database');
    } finally {
      setLoading(false);
    }
  };

  const updateResourceAlert = async (type: string, threshold: number, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/maintenance/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ type, threshold, enabled }),
      });
      
      if (response.ok) {
        toast.success('Resource alert updated successfully');
        await loadResourceAlerts();
      } else {
        throw new Error('Failed to update resource alert');
      }
    } catch (error) {
      console.error('Error updating resource alert:', error);
      toast.error('Failed to update resource alert');
    }
  };

  const updateLogRetention = async () => {
    try {
      const response = await fetch('/api/admin/maintenance/logs/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ days: newRetentionDays }),
      });
      
      if (response.ok) {
        toast.success('Log retention policy updated successfully');
        await loadLogRetention();
      } else {
        throw new Error('Failed to update log retention policy');
      }
    } catch (error) {
      console.error('Error updating log retention:', error);
      toast.error('Failed to update log retention policy');
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusColor = (value: number, threshold: number) => {
    if (value >= threshold * 0.9) return 'text-red-600';
    if (value >= threshold * 0.7) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Maintenance Tools</h1>
          <p className="text-gray-600">
            Monitor and maintain system performance, cache, database, and resources
          </p>
        </div>
        <button 
          onClick={loadAllData} 
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
        >
          <span className={`${loading ? 'animate-spin' : ''}`}>🔄</span>
          Refresh All
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'cache', label: 'Cache Management', icon: '💾' },
            { id: 'database', label: 'Database Tools', icon: '🗄️' },
            { id: 'resources', label: 'Resource Monitoring', icon: '📊' },
            { id: 'logs', label: 'Log Management', icon: '📝' },
            { id: 'backup', label: 'Backup Export', icon: '📦' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Backup Export Tab */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <h2 className="text-xl font-semibold">Full Site Backup Export</h2>
          </div>
          <p className="text-gray-600">
            Download an archive containing the PostgreSQL database dump and (optionally) uploaded files and logs.
            This operation is read-only and does not modify site data.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => downloadBackup({ includeUploads: true, includeLogs: false })}
              disabled={exportingBackup}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
            >
              {exportingBackup ? 'Preparing…' : 'Export DB + Uploads'}
            </button>
            <button
              type="button"
              onClick={() => downloadBackup({ includeUploads: true, includeLogs: true })}
              disabled={exportingBackup}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {exportingBackup ? 'Preparing…' : 'Export DB + Uploads + Logs'}
            </button>
            <button
              type="button"
              onClick={() => downloadBackup({ includeUploads: false, includeLogs: false })}
              disabled={exportingBackup}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {exportingBackup ? 'Preparing…' : 'Export DB Only'}
            </button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>- Only one export runs at a time to protect server resources.</p>
            <p>- For large upload folders, generation can take several minutes before download starts.</p>
          </div>
        </div>
      )}

      {/* Cache Management Tab */}
      {activeTab === 'cache' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">💾</span>
            <h2 className="text-xl font-semibold">Cache Statistics</h2>
          </div>
          <p className="text-gray-600">Monitor cache performance and manage cached data</p>

          {cacheStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Keys</div>
                <div className="text-2xl font-bold">{cacheStats.totalKeys.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Memory Usage</div>
                <div className="text-2xl font-bold">{cacheStats.memoryUsage} MB</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Hit Rate</div>
                <div className="text-2xl font-bold text-green-600">{cacheStats.hitRate.toFixed(1)}%</div>
              </div>
            </div>
          )}

          {cacheStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold">{cacheStats.keysByType.string}</div>
                <div className="text-sm text-gray-600">Strings</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{cacheStats.keysByType.hash}</div>
                <div className="text-sm text-gray-600">Hashes</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{cacheStats.keysByType.list}</div>
                <div className="text-sm text-gray-600">Lists</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{cacheStats.keysByType.set}</div>
                <div className="text-sm text-gray-600">Sets</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{cacheStats.keysByType.zset}</div>
                <div className="text-sm text-gray-600">Sorted Sets</div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Cache key pattern (optional)"
                value={cachePattern}
                onChange={(e) => setCachePattern(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button 
                onClick={() => clearCache(cachePattern || undefined)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                🗑️ Clear Cache
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Leave pattern empty to clear all cache, or specify a pattern like "user:*" to clear specific keys
            </p>
          </div>
        </div>
      )}

      {/* Database Tools Tab */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗄️</span>
            <h2 className="text-xl font-semibold">Database Statistics & Optimization</h2>
          </div>
          <p className="text-gray-600">Monitor database performance and run optimization tasks</p>

          {databaseStats && !databaseStats.error && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Database Size</div>
                <div className="text-2xl font-bold">{databaseStats.databaseSize.size}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Connections</div>
                <div className="text-2xl font-bold">{databaseStats.connectionStats.total_connections}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Active Connections</div>
                <div className="text-2xl font-bold text-green-600">
                  {databaseStats.connectionStats.active_connections}
                </div>
              </div>
            </div>
          )}

          {databaseStats?.error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="text-yellow-800">
                  {databaseStats.message || 'Failed to retrieve database statistics'}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Database Optimization</h3>
              <p className="text-sm text-gray-600">
                Run ANALYZE and VACUUM to optimize database performance
              </p>
            </div>
            <button 
              onClick={optimizeDatabase} 
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              ⚙️ Optimize Database
            </button>
          </div>

          {databaseStats?.slowQueries && databaseStats.slowQueries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Slow Queries</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {databaseStats.slowQueries.map((query: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-1 bg-light text-primary-dark text-xs rounded">
                        {query.mean_time?.toFixed(2)}ms avg
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        {query.calls} calls
                      </span>
                    </div>
                    <code className="text-sm break-all">
                      {query.query?.substring(0, 100)}...
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resource Monitoring Tab */}
      {activeTab === 'resources' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-xl font-semibold">System Resource Usage</h2>
          </div>
          <p className="text-gray-600">Monitor system resources and configure alert thresholds</p>

          {resourceUsage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>🧠</span>
                    <span className="font-medium">Memory Usage</span>
                  </div>
                  <span className="text-sm font-medium">
                    {resourceUsage.memory.usage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${resourceUsage.memory.usage}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Heap Used:</span>
                    <span className="ml-2 font-medium">{resourceUsage.memory.heapUsed} MB</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Heap Total:</span>
                    <span className="ml-2 font-medium">{resourceUsage.memory.heapTotal} MB</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span>💻</span>
                  <span className="font-medium">System Information</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uptime:</span>
                    <span className="font-medium">{formatUptime(resourceUsage.uptime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Node Version:</span>
                    <span className="font-medium">{resourceUsage.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform:</span>
                    <span className="font-medium">{resourceUsage.platform} ({resourceUsage.arch})</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resource Alerts</h3>
            <div className="space-y-4">
              {['memory', 'cpu', 'disk'].map((type) => {
                const alert = resourceAlerts.find(a => a.type === type) || { 
                  type, 
                  threshold: type === 'memory' ? 80 : type === 'cpu' ? 90 : 85, 
                  enabled: false 
                };
                
                return (
                  <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium capitalize">{type} Alert</div>
                      <p className="text-sm text-gray-600">
                        Alert when {type} usage exceeds threshold
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={alert.threshold}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newThreshold = parseInt(e.target.value);
                            updateResourceAlert(type, newThreshold, alert.enabled);
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                          min="1"
                          max="100"
                        />
                        <span className="text-sm">%</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alert.enabled}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            updateResourceAlert(type, alert.threshold, e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Log Management Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <h2 className="text-xl font-semibold">Log Management</h2>
          </div>
          <p className="text-gray-600">Configure log retention policies and cleanup settings</p>

          {logRetention && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="font-medium">Current Retention Policy</div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold">{logRetention.days} days</div>
                  <p className="text-sm text-gray-600">
                    Logs older than this will be automatically cleaned up
                  </p>
                  {logRetention.lastCleanup && (
                    <p className="text-sm text-gray-600 mt-2">
                      Last cleanup: {new Date(logRetention.lastCleanup).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="font-medium">Update Retention Policy</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newRetentionDays}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRetentionDays(parseInt(e.target.value))}
                    min="1"
                    max="365"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm">days</span>
                  <button 
                    onClick={updateLogRetention}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
                  >
                    ⚙️ Update
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Recommended: 30-90 days for most applications
                </p>
              </div>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-800">
                Log cleanup runs automatically based on your retention policy. 
                System logs and audit logs are managed separately to ensure compliance and debugging capabilities.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
