'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  Activity, 
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  createdAt: string;
}

interface AuditLogFilters {
  search?: string;
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface AuditLogAnalytics {
  summary: {
    totalLogs: number;
    uniqueActions: number;
    uniqueResources: number;
    activeUsers: number;
    period: { startDate?: string; endDate?: string };
  };
  actionDistribution: Array<{
    action: string;
    count: number;
    percentage: string;
  }>;
  resourceDistribution: Array<{
    resource: string;
    count: number;
    percentage: string;
  }>;
  topUsers: Array<{
    userId: string;
    count: number;
  }>;
  anomalies: Array<{
    type: string;
    action: string;
    count: number;
    threshold: number;
    severity: 'high' | 'medium' | 'low';
  }>;
  patterns: {
    mostActiveAction?: string;
    mostTargetedResource?: string;
    averageLogsPerDay: number;
  };
}

export default function AuditLogInterface() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<AuditLogAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/audit-logs?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.data || []);
      setPagination(data.pagination || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`/api/admin/audit-logs/analytics?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    if (showAnalytics) {
      fetchAnalytics();
    }
  }, [showAnalytics, fetchAnalytics]);

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to first page when changing filters
    }));
  };

  const handleExport = async () => {
    try {
      const exportData = {
        format: exportFormat,
        filters: filters,
        fields: ['id', 'action', 'resource', 'resourceId', 'user', 'ipAddress', 'createdAt']
      };

      const response = await fetch('/api/admin/audit-logs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export audit logs');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-primary bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log Interface</h1>
          <p className="text-gray-600">Advanced audit log viewer with search, filtering, and analytics</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              showAnalytics 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
          <button
            onClick={fetchAuditLogs}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Audit Log Analytics</h2>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-primary">{analytics.summary.totalLogs}</div>
              <div className="text-sm text-primary-dark">Total Logs</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analytics.summary.uniqueActions}</div>
              <div className="text-sm text-green-800">Unique Actions</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analytics.summary.uniqueResources}</div>
              <div className="text-sm text-purple-800">Resources</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{analytics.summary.activeUsers}</div>
              <div className="text-sm text-orange-800">Active Users</div>
            </div>
          </div>

          {/* Anomalies */}
          {analytics.anomalies.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-3 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
                Detected Anomalies
              </h3>
              <div className="space-y-2">
                {analytics.anomalies.map((anomaly, index) => (
                  <div key={index} className={`p-3 rounded-lg ${getSeverityColor(anomaly.severity)}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{anomaly.action}</span>
                      <span className="text-sm">
                        {anomaly.count} occurrences (threshold: {Math.round(anomaly.threshold)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Actions and Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-semibold mb-3">Top Actions</h3>
              <div className="space-y-2">
                {analytics.actionDistribution.slice(0, 5).map((action, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{action.action}</span>
                    <span className="text-sm text-gray-600">{action.count} ({action.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-md font-semibold mb-3">Top Resources</h3>
              <div className="space-y-2">
                {analytics.resourceDistribution.slice(0, 5).map((resource, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{resource.resource}</span>
                    <span className="text-sm text-gray-600">{resource.count} ({resource.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div 
          className="p-4 border-b cursor-pointer flex justify-between items-center"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Advanced Filters</span>
          </div>
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
        
        {showFilters && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search across all fields..."
                    value={filters.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <input
                  type="text"
                  placeholder="Filter by action..."
                  value={filters.action || ''}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                <input
                  type="text"
                  placeholder="Filter by resource..."
                  value={filters.resource || ''}
                  onChange={(e) => handleFilterChange('resource', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                <input
                  type="text"
                  placeholder="Filter by user ID..."
                  value={filters.userId || ''}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                <input
                  type="text"
                  placeholder="Filter by IP address..."
                  value={filters.ipAddress || ''}
                  onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resource ID</label>
                <input
                  type="text"
                  placeholder="Filter by resource ID..."
                  value={filters.resourceId || ''}
                  onChange={(e) => handleFilterChange('resourceId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Export Options:</span>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'excel')}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Logs</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Audit Logs</h2>
            <div className="text-sm text-gray-600">
              Showing {logs.length} of {pagination.total} logs
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No audit logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-light text-primary-dark">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{log.resource}</div>
                        {log.resourceId && (
                          <div className="text-gray-500 text-xs">ID: {log.resourceId}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.user ? (
                        <div>
                          <div className="font-medium">{log.user.username}</div>
                          <div className="text-gray-500 text-xs">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-primary hover:text-primary-dark flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <button
                onClick={() => handleFilterChange('page', Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Audit Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID</label>
                    <div className="text-sm text-gray-900">{selectedLog.id}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <div className="text-sm text-gray-900">{formatDate(selectedLog.createdAt)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <div className="text-sm text-gray-900">{selectedLog.action}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resource</label>
                    <div className="text-sm text-gray-900">{selectedLog.resource}</div>
                  </div>
                </div>
                
                {selectedLog.resourceId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resource ID</label>
                    <div className="text-sm text-gray-900">{selectedLog.resourceId}</div>
                  </div>
                )}
                
                {selectedLog.user && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <div className="text-sm text-gray-900">
                      {selectedLog.user.username} ({selectedLog.user.email}) - {selectedLog.user.role}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <div className="text-sm text-gray-900">{selectedLog.ipAddress || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User Agent</label>
                    <div className="text-sm text-gray-900 truncate" title={selectedLog.userAgent}>
                      {selectedLog.userAgent || 'N/A'}
                    </div>
                  </div>
                </div>
                
                {selectedLog.details && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Details</label>
                    <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}